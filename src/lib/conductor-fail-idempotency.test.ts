import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONDUCTOR_FAIL_INCOMPLETE_ERROR,
  executeConductorFailedCloseWithSideEffects,
  resolveConductorFailOutcome,
} from "@/lib/conductor-fail-idempotency";

describe("conductor fail idempotency (L-H5)", () => {
  it("requires persisted cancelled status even when rpc says replayed", () => {
    assert.equal(
      resolveConductorFailOutcome({
        rpcResult: { replayed: true },
        persistedTaskStatus: "assigned",
      }),
      "incomplete_after_rpc",
    );
    assert.equal(
      resolveConductorFailOutcome({
        rpcResult: { replayed: false },
        persistedTaskStatus: "cancelled",
      }),
      "failed",
    );
    assert.equal(
      resolveConductorFailOutcome({
        rpcResult: { replayed: true },
        persistedTaskStatus: "cancelled",
      }),
      "replayed",
    );
    assert.equal(
      resolveConductorFailOutcome({
        rpcResult: { replayed: false },
        persistedTaskStatus: "completed",
      }),
      "incomplete_after_rpc",
    );
  });

  it("failed success changes state after RPC and runs post-commit only then", async () => {
    let status: string | null = "assigned";
    const result = await executeConductorFailedCloseWithSideEffects({
      clientOperationId: "op-1",
      prepareEvidence: async () => "evidence://a",
      callFailRpc: async () => {
        status = "cancelled";
        return { data: { replayed: false, taskId: "t1", attemptId: "a1" }, error: null };
      },
      loadPersistedTaskStatus: async () => status,
      applyPostCommitEffects: async () => undefined,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.replayed, false);
      assert.deepEqual(result.effects, ["evidence_prepared", "side_effects_after_rpc"]);
    }
  });

  it("identical replay returns success without treating incomplete as ok", async () => {
    const result = await executeConductorFailedCloseWithSideEffects({
      clientOperationId: "op-1",
      prepareEvidence: async () => "evidence://a",
      callFailRpc: async () => ({
        data: { replayed: true, taskId: "t1", attemptId: "a1" },
        error: null,
      }),
      loadPersistedTaskStatus: async () => "cancelled",
      applyPostCommitEffects: async () => undefined,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.replayed, true);
      assert.ok(result.effects.includes("side_effects_after_rpc"));
    }
  });

  it("does not run post-commit when task did not end cancelled", async () => {
    const result = await executeConductorFailedCloseWithSideEffects({
      clientOperationId: "op-1",
      prepareEvidence: async () => "evidence://a",
      callFailRpc: async () => ({
        data: { replayed: false },
        error: null,
      }),
      loadPersistedTaskStatus: async () => "assigned",
      applyPostCommitEffects: async () => {
        throw new Error("should not run");
      },
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error, CONDUCTOR_FAIL_INCOMPLETE_ERROR);
      assert.deepEqual(result.effects, ["evidence_prepared"]);
    }
  });

  it("RPC failure rolls back orchestration without post-commit", async () => {
    const result = await executeConductorFailedCloseWithSideEffects({
      clientOperationId: "op-1",
      prepareEvidence: async () => "evidence://a",
      callFailRpc: async () => ({
        data: null,
        error: { message: "ATTEMPT_CONFLICT" },
      }),
      loadPersistedTaskStatus: async () => "assigned",
      applyPostCommitEffects: async () => {
        throw new Error("should not run");
      },
    });
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error, "ATTEMPT_CONFLICT");
      assert.ok(!result.effects.includes("side_effects_after_rpc"));
    }
  });

  it("legacy attempt-before-rpc ordering is detectable for regression", async () => {
    const result = await executeConductorFailedCloseWithSideEffects({
      clientOperationId: "op-1",
      prepareEvidence: async () => "evidence://a",
      recordAttemptBeforeRpc: true,
      callFailRpc: async () => {
        return { data: { replayed: false }, error: null };
      },
      loadPersistedTaskStatus: async () => "cancelled",
      applyPostCommitEffects: async () => undefined,
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.ok(result.effects.includes("attempt_before_rpc"));
      assert.ok(result.effects.indexOf("attempt_before_rpc") < result.effects.indexOf("side_effects_after_rpc"));
    }
  });
});
