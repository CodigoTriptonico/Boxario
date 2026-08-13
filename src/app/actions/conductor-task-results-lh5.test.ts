import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();
const resultsSource = readFileSync(join(root, "src/app/actions/conductor-task-results.ts"), "utf8");
const failSupportSource = readFileSync(join(root, "src/app/actions/conductor-task-fail-support.ts"), "utf8");
const migration169 = readFileSync(
  join(root, "supabase/migrations/169_fail_conductor_task_atomic.sql"),
  "utf8",
);
const routeSource = readFileSync(join(root, "src/app/api/conductor/task-results/route.ts"), "utf8");
const queueSource = readFileSync(join(root, "src/lib/conductor-offline/queue.ts"), "utf8");

describe("L-H5 conductor fail wiring", () => {
  it("does not record a failed attempt before calling failTask / RPC", () => {
    assert.match(resultsSource, /L-H5 frontier: prepare → atomic fail RPC/);
    assert.match(resultsSource, /Do NOT call recordTaskAttempt before the RPC/);
    const failCall = resultsSource.indexOf("await failTask(");
    assert.ok(failCall > 0);
    const failedSection = resultsSource.slice(
      resultsSource.indexOf("if (result === \"failed\")"),
      resultsSource.indexOf("} else {"),
    );
    assert.doesNotMatch(failedSection, /recordTaskAttempt\(/);
    assert.doesNotMatch(failedSection, /recordInvoiceIncident\(/);
    assert.match(failedSection, /applyConductorFailedPostCommitEffects/);
  });

  it("failTask calls fail_conductor_task_atomic then verifies cancelled status", () => {
    assert.match(failSupportSource, /rpc\("fail_conductor_task_atomic"/);
    assert.match(failSupportSource, /resolveConductorFailOutcome/);
    assert.match(failSupportSource, /incomplete_after_rpc/);
    const rpcIndex = failSupportSource.indexOf('rpc("fail_conductor_task_atomic"');
    const statusCheckIndex = failSupportSource.indexOf('select("status")', rpcIndex);
    const outcomeIndex = failSupportSource.indexOf("resolveConductorFailOutcome({", rpcIndex);
    assert.ok(rpcIndex > 0);
    assert.ok(statusCheckIndex > rpcIndex);
    assert.ok(outcomeIndex > statusCheckIndex);
  });

  it("SQL fail RPC is atomic and conflicts on incompatible attempt payload", () => {
    assert.match(migration169, /create or replace function public\.fail_conductor_task_atomic/);
    assert.match(migration169, /for update/);
    assert.match(migration169, /ATTEMPT_CONFLICT/);
    assert.match(migration169, /status = 'cancelled'/);
    assert.match(migration169, /outcome = 'failed'/);
    assert.match(migration169, /insert into public\.shipment_logistics_task_attempts/);
    assert.match(migration169, /revoke all on function public\.fail_conductor_task_atomic/);
    assert.doesNotMatch(migration169, /grant execute[\s\S]*to public/);
  });

  it("post-commit failed effects run only after authoritative cancelled status", () => {
    const frontier = resultsSource.slice(resultsSource.indexOf("L-H5 frontier:"));
    const failIndex = frontier.indexOf("await failTask(");
    const postIndex = frontier.indexOf("await applyConductorFailedPostCommitEffects");
    assert.ok(failIndex >= 0 && postIndex > failIndex);
    assert.match(failSupportSource, /L-H5: post-commit effects after authoritative cancelled status/);
  });
});

describe("L-H4 conductor offline error contract wiring", () => {
  it("API route uses classifyConductorTaskResultError and never defaults business errors to 503", () => {
    assert.match(routeSource, /classifyConductorTaskResultError/);
    assert.doesNotMatch(routeSource, /return 503/);
    assert.doesNotMatch(routeSource, /status >= 500 \|\| RETRYABLE_ERRORS/);
    assert.match(routeSource, /retryable: result\.retryable/);
    assert.match(routeSource, /status: result\.status/);
  });

  it("offline queue decides retries from explicit retryable flag", () => {
    assert.match(queueSource, /resolveConductorOfflineRetryable/);
    assert.doesNotMatch(
      queueSource,
      /payload\?\.retryable === true \|\| isRetryableConductorSyncStatus/,
    );
  });
});

describe("L-H1/L-H2 completed regressions still wired", () => {
  it("keeps completed attempt-after-RPC and post-commit ordering", () => {
    assert.match(
      resultsSource,
      /L-H1: do NOT insert shipment_logistics_task_attempts before the RPC[\s\S]*await completeTask\(/,
    );
    assert.match(resultsSource, /L-H2 frontier: validate → prepare → atomic close/);
    const frontier = resultsSource.slice(resultsSource.indexOf("L-H2 frontier:"));
    const validateIndex = frontier.indexOf("await validateConductorCompletedTruckEffects");
    const completeIndex = frontier.indexOf("await completeTask(");
    const postIndex = frontier.indexOf("await applyConductorCompletedPostCommitEffects");
    assert.ok(validateIndex >= 0 && completeIndex > validateIndex && postIndex > completeIndex);
  });
});
