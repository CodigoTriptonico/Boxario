import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readConductorTaskActionsSource } from "@/test-utils/conductor-logistics-action-sources";

const source = readConductorTaskActionsSource();

describe("conductor offline server idempotency", () => {
  it("keeps empty task notes compatible with the non-null database column", async () => {
    assert.match(source, /notes:\s*input\.note,/);
    assert.doesNotMatch(source, /notes:\s*input\.note\s*\|\|\s*null/);
  });

  it("accepts a repeated client operation only for the same task, driver and result", async () => {
    assert.match(source, /error\.code === "23505" && input\.clientOperationId/);
    assert.match(source, /existingAttempt\?\.task_id === input\.task\.id/);
    assert.match(source, /existingAttempt\.driver_id === input\.driverId/);
    assert.match(source, /existingAttempt\.result === input\.result/);
  });

  it("replays an assigned task using its original schedule day after midnight", async () => {
    assert.match(source, /scheduledAtScopeDate\(taskRow\.scheduled_at\) \|\| conductorScopeDate\(\)/);
    assert.match(source, /loadConductorData\(driverId, taskScopeDate\)/);
    assert.match(source, /loadTruckInventoryView\(\s*input\.session,\s*input\.driverId,\s*input\.task\.routeId,\s*input\.taskScopeDate,/);
  });
});
