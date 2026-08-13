/**
 * L-H5: cierre atómico de resultado failed del conductor.
 * Autoridad: task.status = cancelled + attempt.result = failed en la misma transacción SQL.
 */

export type ConductorFailAtomicPayload = {
  replayed?: boolean;
  taskId?: string;
  attemptId?: string;
  status?: string;
} | null;

export type ConductorFailOutcome =
  | "failed"
  | "replayed"
  | "incomplete_after_rpc";

/** Dominio: visita fallida persiste como status cancelled (máquina de estados). */
const CONDUCTOR_FAILED_TASK_STATUS = "cancelled" as const;

export function resolveConductorFailOutcome(input: {
  rpcResult: ConductorFailAtomicPayload;
  persistedTaskStatus: string | null | undefined;
}): ConductorFailOutcome {
  const failed = input.persistedTaskStatus === CONDUCTOR_FAILED_TASK_STATUS;
  if (!failed) {
    return "incomplete_after_rpc";
  }
  return input.rpcResult?.replayed ? "replayed" : "failed";
}

export const CONDUCTOR_FAIL_INCOMPLETE_ERROR =
  "No se pudo registrar el fallo de la tarea. Reintenta la operacion.";

/**
 * Orquestación ejecutable del fail atómico (L-H5).
 * Efectos post-commit solo tras status=cancelled.
 */
export async function executeConductorFailedCloseWithSideEffects(deps: {
  clientOperationId: string;
  prepareEvidence: () => Promise<string>;
  callFailRpc: (
    clientOperationId: string,
    evidenceUrl: string,
  ) => Promise<{
    error: { message: string } | null;
    data: ConductorFailAtomicPayload;
  }>;
  loadPersistedTaskStatus: () => Promise<string | null>;
  applyPostCommitEffects: (evidenceUrl: string) => Promise<void>;
  /** Legacy buggy ordering for regression tests. */
  recordAttemptBeforeRpc?: boolean;
  applySideEffectsBeforeRpc?: boolean;
  sideEffectLog?: string[];
}): Promise<
  | { ok: true; replayed: boolean; effects: string[] }
  | { ok: false; error: string; replayed: false; effects: string[] }
> {
  const log = deps.sideEffectLog || [];
  const evidenceUrl = await deps.prepareEvidence();
  log.push("evidence_prepared");

  if (deps.recordAttemptBeforeRpc) {
    log.push("attempt_before_rpc");
  }

  if (deps.applySideEffectsBeforeRpc) {
    await deps.applyPostCommitEffects(evidenceUrl);
    log.push("side_effects_before_rpc");
  }

  const { data, error } = await deps.callFailRpc(deps.clientOperationId, evidenceUrl);
  if (error) {
    return { ok: false, error: error.message, replayed: false, effects: [...log] };
  }

  const status = await deps.loadPersistedTaskStatus();
  const outcome = resolveConductorFailOutcome({
    rpcResult: data,
    persistedTaskStatus: status,
  });

  if (outcome === "incomplete_after_rpc") {
    return {
      ok: false,
      error: CONDUCTOR_FAIL_INCOMPLETE_ERROR,
      replayed: false,
      effects: [...log],
    };
  }

  if (!deps.applySideEffectsBeforeRpc) {
    await deps.applyPostCommitEffects(evidenceUrl);
    log.push("side_effects_after_rpc");
  }

  return { ok: true, replayed: outcome === "replayed", effects: [...log] };
}
