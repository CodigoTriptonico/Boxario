import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DbShipment, DbShipmentPayment, DbLogisticsRoute, DbInventoryMovement, DbWarehouse } from "@/lib/db";

describe("generated database types", () => {
  it("exposes high-risk table row aliases for gradual migration", () => {
    const shipmentKeys: Array<keyof DbShipment> = ["id", "organization_id", "code", "status"];
    const paymentKeys: Array<keyof DbShipmentPayment> = ["id", "shipment_id", "amount"];
    const routeKeys: Array<keyof DbLogisticsRoute> = ["id", "route_date", "assigned_to", "status"];
    const movementKeys: Array<keyof DbInventoryMovement> = ["id", "item_id", "qty", "type"];
    const warehouseKeys: Array<keyof DbWarehouse> = ["id", "name", "organization_id"];

    assert.equal(shipmentKeys.length, 4);
    assert.equal(paymentKeys.length, 3);
    assert.equal(routeKeys.length, 4);
    assert.equal(movementKeys.length, 4);
    assert.equal(warehouseKeys.length, 3);
  });
});
