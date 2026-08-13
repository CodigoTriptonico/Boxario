import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("conductor truck load/return uses atomic warehouse+event RPC", () => {
  const migration = readFileSync(
    join(root, "supabase/migrations/174_conductor_truck_warehouse_move_atomic.sql"),
    "utf8",
  );
  const actions = readFileSync(
    join(root, "src/app/actions/conductor-truck-actions.ts"),
    "utf8",
  );
  const shared = readFileSync(
    join(root, "src/app/actions/conductor-tasks-shared.ts"),
    "utf8",
  );

  assert.match(migration, /conductor_truck_inventory_move_atomic/);
  assert.match(migration, /return_warehouse/);
  assert.match(migration, /transfer_vehicle/);
  assert.match(migration, /record_inventory_movement_atomic/);
  assert.match(migration, /logistics_truck_inventory_events/);
  assert.match(shared, /conductorTruckInventoryMoveAtomic/);
  assert.match(actions, /conductorTruckInventoryMoveAtomic/);
  assert.doesNotMatch(actions, /recordConductorWarehouseMovement/);
});
