import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { readVentaClientSource } from "@/test-utils/venta-source";

const root = process.cwd();
const saleSource = readVentaClientSource();
const checkoutSource = readFileSync(
  join(root, "src/components/sale/sale-quick-checkout-modal.tsx"),
  "utf8",
);

describe("compact quick sale workflow", () => {
  it("shows only sender, box and final steps", () => {
    assert.match(saleSource, /quickSaleSteps/);
    assert.match(saleSource, /quickSaleActive \? quickSaleSteps : saleSteps/);
    assert.match(saleSource, /setActiveStep\("box"\)/);
    assert.match(saleSource, /setActiveStep\("finish"\)/);
    assert.match(saleSource, /proceedQuickSaleFromSelectedBox/);
    assert.match(saleSource, /quickSaleActive && !quickCheckoutCompleted/);
    assert.match(saleSource, /cancelQuickSale\(\)/);
    assert.doesNotMatch(saleSource, /SaleQuickEmptyBoxModal/);
    assert.doesNotMatch(saleSource, /openRoutePlanner\("quickEmptyBox"\)/);
  });

  it("uses office pickup and keeps the existing final checkout", () => {
    assert.match(saleSource, /emptyBoxMode: EMPTY_BOX_OFFICE_MODE/);
    assert.match(saleSource, /deliverySummary: "Cliente recoge caja vacía en oficina"/);
    assert.match(saleSource, /cartLines: saleCartToBillingLines/);
    assert.match(saleSource, /boxLines: selectedBoxLines\.map/);
    assert.match(saleSource, /saleCartToBillingLines\(quickSaleDraft\.boxLines\)/);
    assert.match(checkoutSource, /QuickEmptyBoxDraft/);
    assert.match(checkoutSource, /SaleFinishDocToolbar/);
    assert.match(checkoutSource, /finishDocTab/);
    assert.match(checkoutSource, /SaleBoxLabel/);
    assert.match(checkoutSource, /printableBoxInvoiceCodes/);
    assert.match(checkoutSource, /serviceSituation="empty_box_handed_off"/);
    assert.match(saleSource, /confirmQuickEmptyBoxCharge/);
  });

  it("preserves the quick-sale context when returning from final to box", () => {
    assert.match(saleSource, /setQuickSaleDraft\(draft\)/);
    assert.match(saleSource, /setQuickSaleSender\(draft\.sender\)/);
    assert.match(saleSource, /setQuickSaleCountry\(draft\.country\)/);
  });

  it("cancels back to the complete flow without losing the sender", () => {
    assert.match(saleSource, /function cancelQuickSale/);
    assert.match(saleSource, /setQuickSaleSender\(null\)/);
    assert.match(saleSource, /setQuickSaleCountry\(null\)/);
    assert.match(saleSource, /setActiveStep\(sender \? "recipient" : "client"\)/);
    assert.match(saleSource, /setSelectedRecipient\(null\)/);
    assert.match(saleSource, /setSelectedBoxLines\(\[\]\)/);
  });
});
