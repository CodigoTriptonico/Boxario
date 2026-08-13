import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { readConductorTaskActionsSource } from "@/test-utils/conductor-logistics-action-sources";

const source = readConductorTaskActionsSource();
const failMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/169_fail_conductor_task_atomic.sql"),
  "utf8",
);

describe("conductor offline server idempotency", () => {
  it("keeps empty task notes compatible with the non-null database column", async () => {
    assert.match(source, /notes:\s*input\.note,/);
    assert.doesNotMatch(source, /notes:\s*input\.note\s*\|\|\s*null/);
  });

  it("accepts a repeated client operation only for the same task, driver and result", async () => {
    assert.match(failMigration, /client_operation_id = p_client_operation_id/);
    assert.match(failMigration, /existing_attempt\.task_id = p_task_id/);
    assert.match(failMigration, /existing_attempt\.driver_id = effective_driver/);
    assert.match(failMigration, /effective_driver := caller_id/);
    assert.match(failMigration, /existing_attempt\.result = 'failed'/);
    assert.match(failMigration, /ATTEMPT_CONFLICT/);
  });

  it("replays an assigned task using its original schedule day after midnight", async () => {
    assert.match(source, /scheduledAtScopeDate\(taskRow\.scheduled_at\) \|\| conductorScopeDate\(\)/);
    assert.match(source, /loadConductorData\(driverId, taskScopeDate\)/);
    assert.match(source, /loadTruckInventoryView\(\s*input\.session,\s*input\.driverId,\s*input\.task\.routeId,\s*input\.taskScopeDate,/);
  });
});
