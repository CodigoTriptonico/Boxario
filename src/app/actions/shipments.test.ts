import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { readShipmentActionsSource } from "@/test-utils/shipment-actions-source";

const root = process.cwd();
const shipmentsSource = readShipmentActionsSource(root);
const atomicSaleMigration = readFileSync(
  join(
    root,
    "supabase",
    "migrations",
    "132_atomic_sales_tracking_and_authoritative_writes.sql",
  ),
  "utf8",
);

describe("listShipmentsAction org scoping", () => {
  it("always filters by organization_id and applies pagination range", () => {
    assert.match(shipmentsSource, /\.eq\("organization_id", session\.organizationId\)/);
    assert.match(shipmentsSource, /\.range\(offset, offset \+ limit - 1\)/);
  });

  it("creates a sale through the single atomic database command", () => {
    assert.match(shipmentsSource, /create_shipment_sale_atomic/);
    assert.doesNotMatch(shipmentsSource, /createShipmentActionLegacy/);
    assert.match(atomicSaleMigration, /insert into public\.shipments/i);
    assert.match(atomicSaleMigration, /insert into public\.shipment_payments/i);
    assert.match(atomicSaleMigration, /insert into public\.shipment_packages/i);
    assert.match(atomicSaleMigration, /insert into public\.inventory_sale_reservations/i);
  });
});
