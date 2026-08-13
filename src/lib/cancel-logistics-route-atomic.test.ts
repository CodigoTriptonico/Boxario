import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("cancel logistics route uses atomic RPC", () => {
  const migration = readFileSync(
    join(root, "supabase/migrations/173_cancel_logistics_route_atomic.sql"),
    "utf8",
  );
  const actions = readFileSync(
    join(root, "src/app/actions/logistics-route-management-actions.ts"),
    "utf8",
  );

  assert.match(migration, /cancel_logistics_route_atomic/);
  assert.match(migration, /ROUTE_NOT_CANCELLABLE/);
  assert.match(migration, /release_reason = 'route_cancelled'/);
  assert.match(migration, /record_activity_history/);
  assert.match(actions, /cancel_logistics_route_atomic/);
  assert.doesNotMatch(actions, /release_reason:\s*"route_cancelled"/);
});
