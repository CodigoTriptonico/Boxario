/**
 * L-H1 / L-H3: cierre atómico de tarea de conductor.
 * - L-H1: la autoridad de éxito es el estado persistido de la tarea.
 * - L-H3: un preview TS previo al RPC nunca reemplaza logistics_plan / billing.
 */

export type ConductorCompleteAtomicPayload = {
  replayed?: boolean;
  taskId?: string;
  attemptId?: string;
} | null;

export type ConductorCompleteOutcome =
  | "completed"
  | "replayed"
  | "incomplete_after_rpc";

export function resolveConductorCompleteOutcome(input: {
  rpcResult: ConductorCompleteAtomicPayload;
  persistedTaskStatus: string | null | undefined;
}): ConductorCompleteOutcome {
  const completed = input.persistedTaskStatus === "completed";
  if (!completed) {
    return "incomplete_after_rpc";
  }
  return input.rpcResult?.replayed ? "replayed" : "completed";
}

export const CONDUCTOR_COMPLETE_INCOMPLETE_ERROR =
  "No se pudo completar la tarea. Reintenta la operacion.";

/** Keys the complete RPC may accept from p_shipment_patch (never logistics_plan). */
export const CONDUCTOR_COMPLETE_SHIPMENT_PATCH_ALLOWLIST = [
  "empty_box_delivered_at",
  "full_box_collected_at",
  "status",
] as const;

/**
 * Builds the shipment patch for complete_conductor_task_atomic.
 * Explicitly strips logistics_plan so a pre-RPC preview cannot overwrite SQL billing.
 */
export function buildConductorCompleteShipmentPatch(input: {
  milestonePatch?: Record<string, unknown> | null;
  statusPatch?: Record<string, unknown> | null;
}): Record<string, unknown> {
  const merged: Record<string, unknown> = {
    ...(input.milestonePatch || {}),
    ...(input.statusPatch || {}),
  };
  delete merged.logistics_plan;

  const patch: Record<string, unknown> = {};
  for (const key of CONDUCTOR_COMPLETE_SHIPMENT_PATCH_ALLOWLIST) {
    if (key in merged && merged[key] !== undefined) {
      patch[key] = merged[key];
    }
  }
  return patch;
}

/**
 * Simulates the post-collect plan write path for tests.
 * Fixed behavior: never replace the whole plan with a client preview.
 */
export function resolvePersistedLogisticsPlanAfterComplete(input: {
  planBeforeRpc: Record<string, unknown>;
  sqlBillingAfterCollect: Record<string, unknown> | null;
  clientPreviewPlan: Record<string, unknown> | null;
  /** Legacy buggy path: allow full client replace after SQL. */
  allowClientLogisticsPlanReplace?: boolean;
  lastDriverCollection?: Record<string, unknown> | null;
}): Record<string, unknown> {
  const beforeBilling =
    input.planBeforeRpc.billing && typeof input.planBeforeRpc.billing === "object"
      ? (input.planBeforeRpc.billing as Record<string, unknown>)
      : {};

  let plan: Record<string, unknown> = {
    ...input.planBeforeRpc,
    billing: {
      ...beforeBilling,
      ...(input.sqlBillingAfterCollect || {}),
    },
  };

  if (input.allowClientLogisticsPlanReplace && input.clientPreviewPlan) {
    return { ...input.clientPreviewPlan };
  }

  if (input.lastDriverCollection) {
    const billing =
      plan.billing && typeof plan.billing === "object"
        ? (plan.billing as Record<string, unknown>)
        : {};
    plan = {
      ...plan,
      billing: {
        ...billing,
        lastDriverCollection: input.lastDriverCollection,
      },
    };
  }

  return plan;
}

/**
 * Orquestación ejecutable del cierre completed (L-H1 + L-H3).
 * No escribe logistics_plan después del RPC; relee el plan persistido.
 */
export async function executeConductorCompletedClose(deps: {
  clientOperationId: string;
  callCompleteRpc: (
    clientOperationId: string,
    shipmentPatch: Record<string, unknown>,
  ) => Promise<{
    error: { message: string } | null;
    data: ConductorCompleteAtomicPayload;
  }>;
  loadPersistedTaskStatus: () => Promise<string | null>;
  buildShipmentPatch?: () => Record<string, unknown>;
  loadPersistedLogisticsPlan?: () => Promise<Record<string, unknown> | null>;
}): Promise<
  | {
      ok: true;
      replayed: boolean;
      logisticsPlan: Record<string, unknown> | null;
    }
  | {
      ok: false;
      error: string;
      replayed: false;
      logisticsPlan: Record<string, unknown> | null;
    }
> {
  const shipmentPatch = buildConductorCompleteShipmentPatch({
    milestonePatch: deps.buildShipmentPatch ? deps.buildShipmentPatch() : {},
    statusPatch: {},
  });

  const planBefore = deps.loadPersistedLogisticsPlan
    ? await deps.loadPersistedLogisticsPlan()
    : null;

  const { data, error } = await deps.callCompleteRpc(
    deps.clientOperationId,
    shipmentPatch,
  );
  if (error) {
    return {
      ok: false,
      error: error.message,
      replayed: false,
      logisticsPlan: planBefore,
    };
  }

  const status = await deps.loadPersistedTaskStatus();
  const outcome = resolveConductorCompleteOutcome({
    rpcResult: data,
    persistedTaskStatus: status,
  });

  if (outcome === "incomplete_after_rpc") {
    return {
      ok: false,
      error: CONDUCTOR_COMPLETE_INCOMPLETE_ERROR,
      replayed: false,
      logisticsPlan: deps.loadPersistedLogisticsPlan
        ? await deps.loadPersistedLogisticsPlan()
        : planBefore,
    };
  }

  // L-H3: never write a pre-RPC logistics_plan snapshot after the atomic close
  // (including legitimate replay). Authority is the persisted plan.
  return {
    ok: true,
    replayed: outcome === "replayed",
    logisticsPlan: deps.loadPersistedLogisticsPlan
      ? await deps.loadPersistedLogisticsPlan()
      : planBefore,
  };
}

/**
 * L-H2: full completed orchestration with post-commit side effects.
 * Definitive truck/evidence/history mutations run only after status=completed.
 */
export async function executeConductorCompletedCloseWithSideEffects(deps: {
  clientOperationId: string;
  prepareEvidence: () => Promise<string>;
  validateTruck: () => Promise<void>;
  callCompleteRpc: (
    clientOperationId: string,
    shipmentPatch: Record<string, unknown>,
  ) => Promise<{
    error: { message: string } | null;
    data: ConductorCompleteAtomicPayload;
  }>;
  loadPersistedTaskStatus: () => Promise<string | null>;
  applyPostCommitEffects: (evidenceUrl: string) => Promise<void>;
  /** Legacy buggy ordering for regression tests. */
  applySideEffectsBeforeRpc?: boolean;
  sideEffectLog?: string[];
}): Promise<
  | { ok: true; replayed: boolean; effects: string[] }
  | { ok: false; error: string; replayed: false; effects: string[] }
> {
  const log = deps.sideEffectLog || [];
  const evidenceUrl = await deps.prepareEvidence();
  log.push("evidence_prepared");

  await deps.validateTruck();
  log.push("truck_validated");

  if (deps.applySideEffectsBeforeRpc) {
    await deps.applyPostCommitEffects(evidenceUrl);
    log.push("side_effects_before_rpc");
  }

  const close = await executeConductorCompletedClose({
    clientOperationId: deps.clientOperationId,
    callCompleteRpc: deps.callCompleteRpc,
    loadPersistedTaskStatus: deps.loadPersistedTaskStatus,
  });

  if (!close.ok) {
    return { ok: false, error: close.error, replayed: false, effects: [...log] };
  }

  if (!deps.applySideEffectsBeforeRpc) {
    await deps.applyPostCommitEffects(evidenceUrl);
    log.push("side_effects_after_rpc");
  }

  return { ok: true, replayed: close.replayed, effects: [...log] };
}
