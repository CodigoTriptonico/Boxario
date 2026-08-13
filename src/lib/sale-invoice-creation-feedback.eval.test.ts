import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { readShipmentActionsSource } from "@/test-utils/shipment-actions-source";
import { readVentaClientSource } from "@/test-utils/venta-source";

const root = process.cwd();
const ventaSource = readVentaClientSource();
const dialogSource = readFileSync(
  join(root, "src/components/sale/sale-invoice-confirm-dialog.tsx"),
  "utf8",
);
const shipmentsSource = readShipmentActionsSource(root);
const quickCheckoutSource = readFileSync(
  join(root, "src/components/sale/sale-quick-checkout-modal.tsx"),
  "utf8",
);

describe("invoice creation feedback eval", () => {
  it("makes a failed create attempt observable to a counter operator", () => {
    assert.match(
      ventaSource,
      /setStockMessage\("Configura Supabase en \.env\.local para crear invoices abiertos\."\)/,
    );
    assert.match(ventaSource, /setStockMessage\(invoiceResult\.error\)/);
    assert.match(ventaSource, /setStockMessage\(shipmentResult\.error\)/);
    assert.match(dialogSource, /errorMessage\?: string/);
    assert.match(dialogSource, /errorMessage \? \(/);
  });

  it("blocks invoice creation when stock cannot be reserved", () => {
    assert.doesNotMatch(shipmentsSource, /mode: "skip"/);
    assert.doesNotMatch(shipmentsSource, /source: "inventory_pending"/);
    assert.doesNotMatch(shipmentsSource, /shipment\.inventory_pending/);
    assert.match(shipmentsSource, /validateAvailability: false/);
    assert.match(shipmentsSource, /SALE_COMMAND_INVENTORY_INSUFFICIENT/);
    assert.doesNotMatch(ventaSource, /shipmentResult\.data\.stockWarning/);
    assert.match(quickCheckoutSource, /stockMessage && !completed/);
  });
});
