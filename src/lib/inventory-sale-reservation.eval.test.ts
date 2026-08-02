import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { readShipmentActionsSource } from "@/test-utils/shipment-actions-source";

const root = process.cwd();
const shipmentsSource = readShipmentActionsSource(root);
const migrationSource = readFileSync(
  join(root, "supabase/migrations/102_inventory_sale_reservations.sql"),
  "utf8",
);
const atomicSaleMigration = readFileSync(
  join(root, "supabase/migrations/132_atomic_sales_tracking_and_authoritative_writes.sql"),
  "utf8",
);

describe("inventory sale reservation eval", () => {
  it("reserves empty-box stock when a sale is created", () => {
    assert.match(shipmentsSource, /atomicSaleInventoryCommand/);
    assert.match(shipmentsSource, /shouldReserveEmptyBoxStockOnSale/);
    assert.match(shipmentsSource, /create_shipment_sale_atomic/);
    assert.match(atomicSaleMigration, /insert into public\.inventory_sale_reservations/i);
  });

  it("fulfills reservations instead of only direct salidas on handoff", () => {
    const atomicTaskMigration = readFileSync(
      join(root, "supabase/migrations/165_update_logistics_task_atomic.sql"),
      "utf8",
    );
    assert.match(atomicTaskMigration, /fulfill_inventory_sale_stock/);
    assert.match(atomicTaskMigration, /apply_logistics_empty_box_salida/);
    assert.match(atomicTaskMigration, /deduct_empty_box_stock_for_task_lines/);
  });

  it("keeps sale and reservation writes in the same atomic command", () => {
    assert.doesNotMatch(shipmentsSource, /createShipmentActionLegacy/);
    assert.match(atomicSaleMigration, /insert into public\.shipments/i);
    assert.match(atomicSaleMigration, /insert into public\.inventory_sale_reservations/i);
  });

  it("defines atomic reserve, fulfill and release RPCs", () => {
    assert.match(migrationSource, /reserve_inventory_sale_stock/);
    assert.match(migrationSource, /fulfill_inventory_sale_stock/);
    assert.match(migrationSource, /release_inventory_sale_stock/);
    assert.match(migrationSource, /inventory_sale_reservations/);
  });
});
