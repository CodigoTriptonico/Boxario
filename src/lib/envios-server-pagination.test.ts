import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { filterAndPaginateEnviosShipments } from "@/lib/envios-server-pagination";
import type { ShipmentRow } from "@/lib/shipment-types";

function shipment(id: string, country: string): ShipmentRow {
  return {
    id, code: id, customerId: null, recipientId: null, recipientSnapshot: null,
    customer_name: id, country, carrier: "", paid: 0, profit: 0,
    status: "Pendiente entrega caja vacía", assigned_to: null, createdBy: null,
    salesOwnerId: null, salesOwnerName: "", sale_kind: "full", invoice_status: "open",
    invoice_priority: false, accounting_status: "not_exportable", created_at: "2026-08-19",
    finalized_at: null, empty_box_delivered_at: null, full_box_collected_at: null,
    office_received_at: null, departed_at: null, shipped_at: null, delivered_at: null,
    delivery_notes: "", logistics_plan: {}, logisticsTasks: [], payments: [],
  };
}

describe("envíos server pagination", () => {
  it("filters the whole universe before taking a page", () => {
    const result = filterAndPaginateEnviosShipments({
      rows: [shipment("first", "México"), shipment("match-1", "Chile"), shipment("match-2", "Chile")],
      mode: "tracking", country: "Chile", offset: 0, limit: 1,
    });
    assert.equal(result.total, 2);
    assert.equal(result.items[0]?.id, "match-1");
    assert.equal(result.hasMore, true);
  });
});
