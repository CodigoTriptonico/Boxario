import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { readVentaClientSource, readVentaPartsSource } from "@/test-utils/venta-source";

const root = process.cwd();
const invoiceSource = readVentaPartsSource();
const saleSource = readVentaClientSource();
const quickCheckoutSource = readFileSync(
  join(root, "src/components/sale/sale-quick-checkout-modal.tsx"),
  "utf8",
);

describe("sale invoice service contract", () => {
  it("uses the explicit logistics operation instead of parsing the combined summary", () => {
    assert.match(invoiceSource, /serviceOperation: LogisticsTaskType/);
    assert.match(invoiceSource, /saleInvoiceServiceLabel\(serviceOperation[\s\S]{0,120}serviceSituation/);
    assert.doesNotMatch(invoiceSource, /function invoiceServiceLabel/);
    assert.doesNotMatch(invoiceSource, /hasPickup|hasDelivery/);
  });

  it("keeps every current empty-box sale invoice classified as delivery", () => {
    assert.match(saleSource, /serviceOperation: "deliver_empty_box"/);
    assert.match(saleSource, /serviceOperation=\{createdInvoice\.serviceOperation\}/);
    assert.match(saleSource, /serviceOperation="deliver_empty_box"/);
    assert.match(quickCheckoutSource, /serviceOperation="deliver_empty_box"/);
  });

  it("does not repeat the quick empty-box status in the invoice header", () => {
    assert.match(invoiceSource, /serviceSituation === "empty_box_handed_off" \? null/);
    assert.match(invoiceSource, /const situationNote = saleInvoiceSituationNote\(\s*serviceSituation/);
  });
});
