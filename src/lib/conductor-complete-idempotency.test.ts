import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONDUCTOR_COMPLETE_INCOMPLETE_ERROR,
  buildConductorCompleteShipmentPatch,
  executeConductorCompletedClose,
  executeConductorCompletedCloseWithSideEffects,
  resolveConductorCompleteOutcome,
  resolvePersistedLogisticsPlanAfterComplete,
} from "@/lib/conductor-complete-idempotency";

/**
 * Simulates RPC semantics after migrations 167+168:
 * - attempt + task completed → replayed (no plan write)
 * - attempt + task incomplete → clear orphan, then complete
 * - collect updates billing in SQL; client logistics_plan in patch is ignored
 */
function createRpcSimulator(state: {
  taskStatus: string;
  attempts: Set<string>;
  failNextRpc?: boolean;
  paidCollections?: number;
  plan: Record<string, unknown>;
}) {
  return async (clientOperationId: string, shipmentPatch: Record<string, unknown>) => {
    assert.equal(
      "logistics_plan" in shipmentPatch,
      false,
      "L-H3: orchestration must not send logistics_plan in shipment patch",
    );

    if (state.failNextRpc) {
      state.failNextRpc = false;
      return { error: { message: "RPC_FAILED" }, data: null };
    }

    if (state.attempts.has(clientOperationId) && state.taskStatus === "completed") {
      return {
        error: null,
        data: { replayed: true, taskId: "task-1", attemptId: "attempt-1" },
      };
    }

    if (state.attempts.has(clientOperationId) && state.taskStatus !== "completed") {
      state.attempts.delete(clientOperationId);
    }

    const beforeBilling =
      state.plan.billing && typeof state.plan.billing === "object"
        ? (state.plan.billing as Record<string, unknown>)
        : {};

    state.plan = resolvePersistedLogisticsPlanAfterComplete({
      planBeforeRpc: state.plan,
      sqlBillingAfterCollect: {
        payNow: "$25.00",
        balanceDue: "$75.00",
        depositStatus: "paid",
        sqlMarker: "from-collect-rpc",
      },
      clientPreviewPlan: {
        ...state.plan,
        billing: { ...beforeBilling, payNow: "$0.00", stalePreview: true },
        operationalOnly: "should-not-win-via-replace",
      },
      allowClientLogisticsPlanReplace: false,
      lastDriverCollection: {
        expectedAmount: 25,
        receivedAmount: 25,
        outcome: "collected",
      },
    });

    if (shipmentPatch.empty_box_delivered_at) {
      // milestone keys are applied; plan untouched by patch
    }

    state.taskStatus = "completed";
    state.attempts.add(clientOperationId);
    state.paidCollections = (state.paidCollections || 0) + 1;
    return {
      error: null,
      data: { replayed: false, taskId: "task-1", attemptId: "attempt-new" },
    };
  };
}

describe("resolveConductorCompleteOutcome", () => {
  it("requires persisted completed status even when rpc says replayed", () => {
    assert.equal(
      resolveConductorCompleteOutcome({
        rpcResult: { replayed: true },
        persistedTaskStatus: "assigned",
      }),
      "incomplete_after_rpc",
    );
  });

  it("accepts fresh completion and legitimate replay", () => {
    assert.equal(
      resolveConductorCompleteOutcome({
        rpcResult: { replayed: false },
        persistedTaskStatus: "completed",
      }),
      "completed",
    );
    assert.equal(
      resolveConductorCompleteOutcome({
        rpcResult: { replayed: true },
        persistedTaskStatus: "completed",
      }),
      "replayed",
    );
  });
});

describe("buildConductorCompleteShipmentPatch (L-H3)", () => {
  it("case 4: only allowlisted operational keys; strips logistics_plan", () => {
    const patch = buildConductorCompleteShipmentPatch({
      milestonePatch: {
        empty_box_delivered_at: "2026-08-02T12:00:00.000Z",
        logistics_plan: { billing: { payNow: "$0" } },
        ignored: true,
      },
      statusPatch: { status: "En ruta", logistics_plan: { stale: true } },
    });
    assert.deepEqual(patch, {
      empty_box_delivered_at: "2026-08-02T12:00:00.000Z",
      status: "En ruta",
    });
    assert.equal("logistics_plan" in patch, false);
    assert.equal("billing" in patch, false);
  });
});

describe("resolvePersistedLogisticsPlanAfterComplete (L-H3)", () => {
  it("case 2: stale preview must not win (bug vs fix)", () => {
    const planBefore = {
      routeHint: "keep-me",
      feeAdjustments: { delivery: { enabled: true, amount: "$5" } },
      billing: {
        quotedTotal: "$100.00",
        payNow: "$0.00",
        balanceDue: "$100.00",
        depositStatus: "pending",
      },
    };
    const sqlBilling = {
      payNow: "$40.00",
      balanceDue: "$60.00",
      depositStatus: "paid",
      sqlAuthority: true,
    };
    const stalePreview = {
      routeHint: "preview-wrong",
      billing: { quotedTotal: "$100.00", payNow: "$0.00", stalePreview: true },
    };

    const buggy = resolvePersistedLogisticsPlanAfterComplete({
      planBeforeRpc: planBefore,
      sqlBillingAfterCollect: sqlBilling,
      clientPreviewPlan: stalePreview,
      allowClientLogisticsPlanReplace: true,
    });
    assert.equal((buggy.billing as { stalePreview?: boolean }).stalePreview, true);
    assert.equal((buggy.billing as { sqlAuthority?: boolean }).sqlAuthority, undefined);

    const fixed = resolvePersistedLogisticsPlanAfterComplete({
      planBeforeRpc: planBefore,
      sqlBillingAfterCollect: sqlBilling,
      clientPreviewPlan: stalePreview,
      allowClientLogisticsPlanReplace: false,
      lastDriverCollection: { outcome: "collected", receivedAmount: 40 },
    });
    assert.equal((fixed.billing as { sqlAuthority?: boolean }).sqlAuthority, true);
    assert.equal((fixed.billing as { payNow?: string }).payNow, "$40.00");
    assert.equal(fixed.routeHint, "keep-me");
    assert.deepEqual(fixed.feeAdjustments, planBefore.feeAdjustments);
    assert.deepEqual((fixed.billing as { lastDriverCollection?: unknown }).lastDriverCollection, {
      outcome: "collected",
      receivedAmount: 40,
    });
  });
});

describe("executeConductorCompletedClose (L-H1 + L-H3 flow)", () => {
  it("case 1: normal completion keeps SQL billing and operational fields", async () => {
    const state = {
      taskStatus: "assigned",
      attempts: new Set<string>(),
      paidCollections: 0,
      plan: {
        routeHint: "north",
        feeAdjustments: { x: 1 },
        billing: { quotedTotal: "$100.00", payNow: "$0.00", balanceDue: "$100.00" },
      },
    };
    const result = await executeConductorCompletedClose({
      clientOperationId: "op-1",
      callCompleteRpc: createRpcSimulator(state),
      loadPersistedTaskStatus: async () => state.taskStatus,
      buildShipmentPatch: () => ({
        empty_box_delivered_at: "2026-08-02T12:00:00.000Z",
        logistics_plan: { billing: { payNow: "$0.00", stale: true } },
      }),
      loadPersistedLogisticsPlan: async () => state.plan,
    });

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.replayed, false);
      assert.equal((result.logisticsPlan?.billing as { sqlMarker?: string }).sqlMarker, "from-collect-rpc");
      assert.equal(result.logisticsPlan?.routeHint, "north");
      assert.deepEqual(result.logisticsPlan?.feeAdjustments, { x: 1 });
    }
    assert.equal(state.paidCollections, 1);
  });

  it("case 2+3: preview without billing cannot replace SQL + operational keys survive", async () => {
    const state = {
      taskStatus: "assigned",
      attempts: new Set<string>(),
      paidCollections: 0,
      plan: {
        notes: "ops",
        carrierLane: "A",
        billing: { quotedTotal: "$50.00", payNow: "$0.00" },
      },
    };
    const result = await executeConductorCompletedClose({
      clientOperationId: "op-2",
      callCompleteRpc: createRpcSimulator(state),
      loadPersistedTaskStatus: async () => state.taskStatus,
      loadPersistedLogisticsPlan: async () => state.plan,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal((result.logisticsPlan?.billing as { payNow?: string }).payNow, "$25.00");
      assert.equal(result.logisticsPlan?.notes, "ops");
      assert.equal(result.logisticsPlan?.carrierLane, "A");
    }
  });

  it("L-H1 case 2 / L-H3 case 6: RPC failure leaves plan unchanged and skips post writes", async () => {
    const plan = {
      billing: { quotedTotal: "$10.00", payNow: "$0.00" },
      keep: true,
    };
    const state = {
      taskStatus: "assigned",
      attempts: new Set<string>(),
      failNextRpc: true,
      paidCollections: 0,
      plan: { ...plan, billing: { ...plan.billing } },
    };
    const result = await executeConductorCompletedClose({
      clientOperationId: "op-fail",
      callCompleteRpc: createRpcSimulator(state),
      loadPersistedTaskStatus: async () => state.taskStatus,
      loadPersistedLogisticsPlan: async () => state.plan,
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.replayed, false);
      assert.match(result.error, /RPC_FAILED/);
      assert.deepEqual(result.logisticsPlan?.billing, { quotedTotal: "$10.00", payNow: "$0.00" });
    }
    assert.equal(state.taskStatus, "assigned");
    assert.equal(state.paidCollections, 0);
  });

  it("L-H1 case 3: retry after failure completes", async () => {
    const state = {
      taskStatus: "assigned",
      attempts: new Set<string>(),
      failNextRpc: true,
      paidCollections: 0,
      plan: { billing: { quotedTotal: "$10.00" } },
    };
    const callCompleteRpc = createRpcSimulator(state);
    const first = await executeConductorCompletedClose({
      clientOperationId: "op-3",
      callCompleteRpc,
      loadPersistedTaskStatus: async () => state.taskStatus,
      loadPersistedLogisticsPlan: async () => state.plan,
    });
    assert.equal(first.ok, false);
    const second = await executeConductorCompletedClose({
      clientOperationId: "op-3",
      callCompleteRpc,
      loadPersistedTaskStatus: async () => state.taskStatus,
      loadPersistedLogisticsPlan: async () => state.plan,
    });
    assert.equal(second.ok, true);
    assert.equal(state.paidCollections, 1);
  });

  it("case 5: legitimate replay does not rewrite logistics_plan / billing", async () => {
    const state = {
      taskStatus: "assigned",
      attempts: new Set<string>(),
      paidCollections: 0,
      plan: {
        billing: { quotedTotal: "$100.00", payNow: "$0.00" },
        routeHint: "stable",
      },
    };
    const callCompleteRpc = createRpcSimulator(state);
    const first = await executeConductorCompletedClose({
      clientOperationId: "op-4",
      callCompleteRpc,
      loadPersistedTaskStatus: async () => state.taskStatus,
      loadPersistedLogisticsPlan: async () => state.plan,
    });
    assert.equal(first.ok, true);
    const billingAfterFirst = { ...(state.plan.billing as object) };

    const second = await executeConductorCompletedClose({
      clientOperationId: "op-4",
      callCompleteRpc,
      loadPersistedTaskStatus: async () => state.taskStatus,
      loadPersistedLogisticsPlan: async () => state.plan,
    });
    assert.equal(second.ok, true);
    if (second.ok) {
      assert.equal(second.replayed, true);
      assert.deepEqual(second.logisticsPlan?.billing, billingAfterFirst);
      assert.equal(second.logisticsPlan?.routeHint, "stable");
    }
    assert.equal(state.paidCollections, 1);
  });

  it("L-H1 case 5: orphan attempt with incomplete task cannot succeed on attempt alone", async () => {
    const blocked = await executeConductorCompletedClose({
      clientOperationId: "op-5",
      callCompleteRpc: async () => ({
        error: null,
        data: { replayed: true, attemptId: "stale" },
      }),
      loadPersistedTaskStatus: async () => "assigned",
      loadPersistedLogisticsPlan: async () => ({ billing: { payNow: "$0" } }),
    });
    assert.equal(blocked.ok, false);
    if (!blocked.ok) {
      assert.equal(blocked.error, CONDUCTOR_COMPLETE_INCOMPLETE_ERROR);
      assert.equal(blocked.replayed, false);
    }
  });

  it("case 7: offline-shaped retry uses same close path and keeps SQL billing", async () => {
    const state = {
      taskStatus: "assigned",
      attempts: new Set<string>(),
      paidCollections: 0,
      plan: {
        offlinePayloadPreview: true,
        billing: { quotedTotal: "$80.00", payNow: "$0.00" },
      },
    };
    const result = await executeConductorCompletedClose({
      clientOperationId: "offline-op",
      callCompleteRpc: createRpcSimulator(state),
      loadPersistedTaskStatus: async () => state.taskStatus,
      buildShipmentPatch: () => ({
        // Queue may have stored a stale plan; orchestration must strip it.
        logistics_plan: {
          billing: { payNow: "$0.00", fromOfflineQueue: true },
        },
      }),
      loadPersistedLogisticsPlan: async () => state.plan,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal((result.logisticsPlan?.billing as { fromOfflineQueue?: boolean }).fromOfflineQueue, undefined);
      assert.equal((result.logisticsPlan?.billing as { sqlMarker?: string }).sqlMarker, "from-collect-rpc");
      assert.equal(result.logisticsPlan?.offlinePayloadPreview, true);
    }
  });
});

describe("executeConductorCompletedCloseWithSideEffects (L-H2)", () => {
  function createSideEffectState() {
    return {
      taskStatus: "assigned" as string,
      attempts: new Set<string>(),
      truckQty: 2,
      evidenceBound: false,
      historyCompleted: 0,
      failNextRpc: false,
      plan: { billing: { quotedTotal: "$20.00", payNow: "$0.00" } },
    };
  }

  it("case 1: normal close applies truck/evidence/history once after RPC", async () => {
    const state = createSideEffectState();
    const log: string[] = [];
    const result = await executeConductorCompletedCloseWithSideEffects({
      clientOperationId: "lh2-1",
      sideEffectLog: log,
      prepareEvidence: async () => "evidence://prepared",
      validateTruck: async () => {
        assert.equal(state.truckQty, 2);
      },
      callCompleteRpc: createRpcSimulator(state),
      loadPersistedTaskStatus: async () => state.taskStatus,
      applyPostCommitEffects: async () => {
        state.truckQty -= 1;
        state.evidenceBound = true;
        state.historyCompleted += 1;
      },
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.deepEqual(result.effects, [
        "evidence_prepared",
        "truck_validated",
        "side_effects_after_rpc",
      ]);
    }
    assert.equal(state.truckQty, 1);
    assert.equal(state.evidenceBound, true);
    assert.equal(state.historyCompleted, 1);
  });

  it("case 2: RPC failure leaves truck/evidence unbound (bug vs fix)", async () => {
    const buggy = createSideEffectState();
    const buggyResult = await executeConductorCompletedCloseWithSideEffects({
      clientOperationId: "lh2-bug",
      applySideEffectsBeforeRpc: true,
      prepareEvidence: async () => "evidence://prepared",
      validateTruck: async () => undefined,
      callCompleteRpc: async () => ({ error: { message: "RPC_FAILED" }, data: null }),
      loadPersistedTaskStatus: async () => buggy.taskStatus,
      applyPostCommitEffects: async () => {
        buggy.truckQty -= 1;
        buggy.evidenceBound = true;
        buggy.historyCompleted += 1;
      },
    });
    assert.equal(buggyResult.ok, false);
    assert.equal(buggy.truckQty, 1);
    assert.equal(buggy.evidenceBound, true);

    const fixed = createSideEffectState();
    const fixedResult = await executeConductorCompletedCloseWithSideEffects({
      clientOperationId: "lh2-fix",
      prepareEvidence: async () => "evidence://prepared",
      validateTruck: async () => undefined,
      callCompleteRpc: async () => ({ error: { message: "RPC_FAILED" }, data: null }),
      loadPersistedTaskStatus: async () => fixed.taskStatus,
      applyPostCommitEffects: async () => {
        fixed.truckQty -= 1;
        fixed.evidenceBound = true;
        fixed.historyCompleted += 1;
      },
    });
    assert.equal(fixedResult.ok, false);
    if (!fixedResult.ok) {
      assert.equal(fixedResult.effects.includes("side_effects_after_rpc"), false);
      assert.equal(fixedResult.effects.includes("side_effects_before_rpc"), false);
    }
    assert.equal(fixed.truckQty, 2);
    assert.equal(fixed.evidenceBound, false);
    assert.equal(fixed.historyCompleted, 0);
  });

  it("case 3+6+7: replay does not duplicate truck/evidence/history", async () => {
    const state = createSideEffectState();
    const callCompleteRpc = createRpcSimulator(state);
    const applyPostCommitEffects = async () => {
      if (!state.evidenceBound) {
        state.evidenceBound = true;
        state.historyCompleted += 1;
        state.truckQty -= 1;
      }
    };
    const first = await executeConductorCompletedCloseWithSideEffects({
      clientOperationId: "lh2-replay",
      prepareEvidence: async () => "evidence://prepared",
      validateTruck: async () => undefined,
      callCompleteRpc,
      loadPersistedTaskStatus: async () => state.taskStatus,
      applyPostCommitEffects,
    });
    assert.equal(first.ok, true);
    const second = await executeConductorCompletedCloseWithSideEffects({
      clientOperationId: "lh2-replay",
      prepareEvidence: async () => "evidence://prepared",
      validateTruck: async () => undefined,
      callCompleteRpc,
      loadPersistedTaskStatus: async () => state.taskStatus,
      applyPostCommitEffects,
    });
    assert.equal(second.ok, true);
    if (second.ok) assert.equal(second.replayed, true);
    assert.equal(state.truckQty, 1);
    assert.equal(state.historyCompleted, 1);
    assert.equal(state.evidenceBound, true);
  });

  it("case 4: post-commit failure then retry reconciles without double truck move", async () => {
    const state = createSideEffectState();
    const callCompleteRpc = createRpcSimulator(state);
    let failPostCommitOnce = true;
    const applyPostCommitEffects = async () => {
      if (failPostCommitOnce) {
        failPostCommitOnce = false;
        throw new Error("POST_COMMIT_FAILED");
      }
      if (!state.evidenceBound) {
        state.evidenceBound = true;
        state.truckQty -= 1;
        state.historyCompleted += 1;
      }
    };

    await assert.rejects(
      () =>
        executeConductorCompletedCloseWithSideEffects({
          clientOperationId: "lh2-post",
          prepareEvidence: async () => "evidence://prepared",
          validateTruck: async () => undefined,
          callCompleteRpc,
          loadPersistedTaskStatus: async () => state.taskStatus,
          applyPostCommitEffects,
        }),
      /POST_COMMIT_FAILED/,
    );
    assert.equal(state.taskStatus, "completed");
    assert.equal(state.truckQty, 2);

    const retry = await executeConductorCompletedCloseWithSideEffects({
      clientOperationId: "lh2-post",
      prepareEvidence: async () => "evidence://prepared",
      validateTruck: async () => undefined,
      callCompleteRpc,
      loadPersistedTaskStatus: async () => state.taskStatus,
      applyPostCommitEffects,
    });
    assert.equal(retry.ok, true);
    assert.equal(state.truckQty, 1);
    assert.equal(state.historyCompleted, 1);
  });

  it("case 5: prepared evidence survives RPC failure without binding", async () => {
    const prepared: string[] = [];
    const bound: string[] = [];
    const result = await executeConductorCompletedCloseWithSideEffects({
      clientOperationId: "lh2-ev",
      prepareEvidence: async () => {
        prepared.push("blob");
        return "evidence://op";
      },
      validateTruck: async () => undefined,
      callCompleteRpc: async () => ({ error: { message: "RPC_FAILED" }, data: null }),
      loadPersistedTaskStatus: async () => "assigned",
      applyPostCommitEffects: async (url) => {
        bound.push(url);
      },
    });
    assert.equal(result.ok, false);
    assert.deepEqual(prepared, ["blob"]);
    assert.deepEqual(bound, []);
  });

  it("case 8: concurrent closes — only one authoritative completion path mutates once", async () => {
    const state = createSideEffectState();
    let inFlight = false;
    const callCompleteRpc = async (op: string, patch: Record<string, unknown>) => {
      if (inFlight) {
        // second waiter sees completed after first finishes
        while (state.taskStatus !== "completed") {
          await new Promise((r) => setTimeout(r, 1));
        }
        return createRpcSimulator(state)(op, patch);
      }
      inFlight = true;
      await new Promise((r) => setTimeout(r, 5));
      const result = await createRpcSimulator(state)(op, patch);
      inFlight = false;
      return result;
    };
    const applyPostCommitEffects = async () => {
      if (!state.evidenceBound) {
        state.evidenceBound = true;
        state.truckQty -= 1;
        state.historyCompleted += 1;
      }
    };
    const [a, b] = await Promise.all([
      executeConductorCompletedCloseWithSideEffects({
        clientOperationId: "lh2-c1",
        prepareEvidence: async () => "e",
        validateTruck: async () => undefined,
        callCompleteRpc,
        loadPersistedTaskStatus: async () => state.taskStatus,
        applyPostCommitEffects,
      }),
      executeConductorCompletedCloseWithSideEffects({
        clientOperationId: "lh2-c2",
        prepareEvidence: async () => "e",
        validateTruck: async () => undefined,
        callCompleteRpc,
        loadPersistedTaskStatus: async () => state.taskStatus,
        applyPostCommitEffects,
      }),
    ]);
    assert.equal(a.ok && b.ok, true);
    assert.equal(state.truckQty, 1);
    assert.equal(state.historyCompleted, 1);
  });

  it("case 9: offline-shaped failure then success applies effects once", async () => {
    const state = createSideEffectState();
    state.failNextRpc = true;
    const callCompleteRpc = createRpcSimulator(state);
    const applyPostCommitEffects = async () => {
      if (!state.evidenceBound) {
        state.evidenceBound = true;
        state.truckQty -= 1;
        state.historyCompleted += 1;
      }
    };
    const first = await executeConductorCompletedCloseWithSideEffects({
      clientOperationId: "lh2-off",
      prepareEvidence: async () => "e",
      validateTruck: async () => undefined,
      callCompleteRpc,
      loadPersistedTaskStatus: async () => state.taskStatus,
      applyPostCommitEffects,
    });
    assert.equal(first.ok, false);
    assert.equal(state.truckQty, 2);
    const second = await executeConductorCompletedCloseWithSideEffects({
      clientOperationId: "lh2-off",
      prepareEvidence: async () => "e",
      validateTruck: async () => undefined,
      callCompleteRpc,
      loadPersistedTaskStatus: async () => state.taskStatus,
      applyPostCommitEffects,
    });
    assert.equal(second.ok, true);
    assert.equal(state.truckQty, 1);
    assert.equal(state.historyCompleted, 1);
  });
});
