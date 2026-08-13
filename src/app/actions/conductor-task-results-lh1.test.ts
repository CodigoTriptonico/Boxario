import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();
const resultsSource = readFileSync(join(root, "src/app/actions/conductor-task-results.ts"), "utf8");
const supportSource = readFileSync(join(root, "src/app/actions/conductor-task-result-support.ts"), "utf8");
const migration167 = readFileSync(
  join(root, "supabase/migrations/167_conductor_complete_attempt_idempotency.sql"),
  "utf8",
);
const migration168 = readFileSync(
  join(root, "supabase/migrations/168_conductor_complete_preserve_sql_billing.sql"),
  "utf8",
);
const offlineQueue = readFileSync(join(root, "src/lib/conductor-offline/queue.ts"), "utf8");

describe("L-H1 conductor complete wiring", () => {
  it("does not record a completed attempt before calling completeTask / RPC", () => {
    assert.match(
      resultsSource,
      /L-H1: do NOT insert shipment_logistics_task_attempts before the RPC[\s\S]*await completeTask\(/,
    );
    const completeCall = resultsSource.indexOf("await completeTask(");
    const between = resultsSource.slice(Math.max(0, completeCall - 400), completeCall);
    assert.doesNotMatch(between, /recordTaskAttempt/);
    assert.doesNotMatch(resultsSource, /await recordTaskAttempt\(/);
  });

  it("verifies persisted task status after the atomic RPC before success side-effects", () => {
    assert.match(supportSource, /resolveConductorCompleteOutcome/);
    assert.match(supportSource, /incomplete_after_rpc/);
    assert.match(supportSource, /select\("status"\)/);
    const rpcIndex = supportSource.indexOf('rpc("complete_conductor_task_atomic"');
    const statusCheckIndex = supportSource.indexOf('select("status")', rpcIndex);
    const outcomeIndex = supportSource.indexOf("resolveConductorCompleteOutcome({", rpcIndex);
    assert.ok(rpcIndex > 0);
    assert.ok(statusCheckIndex > rpcIndex);
    assert.ok(outcomeIndex > statusCheckIndex);
  });

  it("SQL replay requires terminal task status and clears orphan attempts", () => {
    assert.match(migration167, /attempt_task_status/);
    assert.match(migration167, /result_value = 'completed' and attempt_task_status = 'completed'/);
    assert.match(migration167, /delete from public\.shipment_logistics_task_attempts/);
  });

  it("offline sync only marks synced when the server payload is ok", () => {
    assert.match(offlineQueue, /if \(response\.ok && payload\?\.ok\)/);
    assert.match(offlineQueue, /status: "synced"/);
  });
});

describe("L-H3 logistics_plan authority wiring", () => {
  it("TypeScript completeTask builds shipment patch without logistics_plan preview", () => {
    assert.match(supportSource, /buildConductorCompleteShipmentPatch/);
    assert.match(supportSource, /L-H3: never send a pre-RPC logistics_plan snapshot/);
    assert.doesNotMatch(supportSource, /logistics_plan: noCollectionPlan/);
    assert.doesNotMatch(supportSource, /logistics_plan: paymentPlan/);
    assert.doesNotMatch(
      supportSource,
      /\.\.\.\(noCollectionPlan \? \{ logistics_plan:/,
    );
    assert.doesNotMatch(
      supportSource,
      /\.\.\.\(paymentPlan \? \{ logistics_plan:/,
    );
  });

  it("SQL ignores client logistics_plan replace and merges lastDriverCollection", () => {
    assert.match(migration168, /L-H3: never accept a full logistics_plan replace/);
    assert.match(migration168, /lastDriverCollection/);
    assert.doesNotMatch(
      migration168,
      /logistics_plan = case\s+when p_shipment_patch \? 'logistics_plan'/,
    );
  });
});

describe("L-H2 post-commit side effects wiring", () => {
  it("completed path validates truck then closes atomically before definitive effects", () => {
    assert.match(resultsSource, /L-H2 frontier: validate → prepare → atomic close/);
    const frontier = resultsSource.slice(resultsSource.indexOf("L-H2 frontier:"));
    const validateIndex = frontier.indexOf("await validateConductorCompletedTruckEffects");
    const completeIndex = frontier.indexOf("await completeTask(");
    const postIndex = frontier.indexOf("await applyConductorCompletedPostCommitEffects");
    assert.ok(validateIndex >= 0 && completeIndex > validateIndex && postIndex > completeIndex);
  });

  it("does not bind invoice evidence or truck events before completeTask on completed path", () => {
    const completedSection = resultsSource.slice(
      resultsSource.indexOf("L-H2 frontier:"),
      resultsSource.indexOf("revalidatePath(\"/conductor/tareas\")"),
    );
    assert.doesNotMatch(completedSection, /recordInvoiceEvidence\(/);
    assert.doesNotMatch(completedSection, /insertTruckEvent\(/);
    assert.doesNotMatch(completedSection, /insertFullBoxCollectionEvent\(/);
    assert.match(supportSource, /L-H2: definitive truck movements/);
    assert.match(supportSource, /L-H2: post-commit effects after authoritative completed status/);
    assert.match(supportSource, /ensureConductorCompletedHistory/);
    const completeTaskBody = supportSource.slice(
      supportSource.indexOf("export async function completeTask"),
      supportSource.indexOf("export async function validateConductorCompletedTruckEffects"),
    );
    assert.doesNotMatch(completeTaskBody, /recordActivityHistory/);
    assert.doesNotMatch(completeTaskBody, /shipment\.logistics_task_updated/);
  });
});
