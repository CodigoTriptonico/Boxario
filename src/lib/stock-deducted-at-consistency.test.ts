import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("complete and start no longer invent stock_deducted_at", () => {
  const migration = readFileSync(
    join(root, "supabase/migrations/172_stock_deducted_at_consistency.sql"),
    "utf8",
  );
  const support = readFileSync(
    join(root, "src/app/actions/conductor-task-result-support.ts"),
    "utf8",
  );

  assert.match(migration, /stock_deducted_at = stock_deducted_at/);
  assert.match(migration, /stock_deducted_at = task\.stock_deducted_at/);
  assert.doesNotMatch(
    migration,
    /when task_row\.task_type = 'deliver_empty_box' then coalesce\(stock_deducted_at/,
  );
  assert.doesNotMatch(migration, /stock_deducted_at = coalesce\(task\.stock_deducted_at, now_ts\)/);
  assert.doesNotMatch(support, /taskPatch\.stock_deducted_at\s*=\s*now/);
});
