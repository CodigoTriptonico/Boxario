import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("new shipments persist one child invoice per physical box without splitting the sale", async () => {
  const source = await readFile(new URL("../app/actions/shipments.ts", import.meta.url), "utf8");

  assert.match(source, /invoiceBoxCode\(shipment\.code, index\)/);
  assert.match(source, /shipment_id: shipment\.id/);
  assert.match(source, /invoice_code: invoiceBoxCode/);
});

test("the completed sale prints one compact label per physical box", async () => {
  const [saleSource, invoiceSource, globalStyles] = await Promise.all([
    readFile(new URL("../components/venta-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/sale/venta-parts.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(saleSource, /printableBoxInvoiceCodes\(invoiceNumber, boxCount\)/);
  assert.match(saleSource, /<SaleBoxLabel/);
  assert.match(invoiceSource, /Etiqueta de caja/);
  assert.match(invoiceSource, /Datos para Excel/);
  assert.match(invoiceSource, /customerInvoiceBoxChargeLines/);
  assert.match(invoiceSource, /Array\.from\(\{ length: Math\.max\(1, Math\.floor\(line\.quantity\)/);
  assert.match(invoiceSource, /invoiceBoxCode\(invoiceNumber, boxPosition\)/);
  assert.match(invoiceSource, /value=\{invoiceNumber\}/);
  assert.match(invoiceSource, /value=\{recipientQrValue\}/);
  assert.match(saleSource, /<SaleFinishDocToolbar/);
  assert.match(saleSource, /finishDocTab/);
  assert.match(saleSource, /<Share2/);
  assert.match(saleSource, /sale-print-single/);
  assert.match(invoiceSource, /País/);
  assert.match(invoiceSource, /mono/);
  assert.match(globalStyles, /html\.sale-print-single #sale-print-documents/);
  assert.match(globalStyles, /\.sale-document-print-selected/);
  assert.match(
    globalStyles,
    /sale-document-print-selected:not\(:has\(~ \.sale-document-print-selected\)\)/,
  );
});

test("field and warehouse screens use the individual box invoice, not only the sale number", async () => {
  const [taskSource, conductorSource, warehouseSource] = await Promise.all([
    readFile(new URL("./conductor-tasks.ts", import.meta.url), "utf8"),
    readFile(new URL("../components/conductor/conductor-tareas-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/warehouse/warehouse-intake-client.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(taskSource, /boxInvoiceCodes: invoiceBoxCodes\(shipment\.code, boxCount\)/);
  assert.match(conductorSource, /dialog\?\.task\.boxInvoiceCodes/);
  assert.match(warehouseSource, /Factura \{pkg\.invoiceCode\}/);
});

test("invoice and label parties can be corrected from finish with master + shipment sync and audit", async () => {
  const [saleSource, invoiceSource, shipmentsSource] = await Promise.all([
    readFile(new URL("../components/venta-client.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/sale/venta-parts.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/actions/shipments.ts", import.meta.url), "utf8"),
  ]);

  assert.match(invoiceSource, /senderSaleContextProps/);
  assert.match(invoiceSource, /recipientSaleContextProps/);
  assert.match(invoiceSource, /contextProps=\{senderSaleContextProps\(sender\)\}/);
  assert.match(invoiceSource, /contextProps=\{recipientSaleContextProps\(recipient\)\}/);
  assert.match(invoiceSource, /\{\.\.\.senderSaleContextProps\(sender\)\}/);
  assert.match(invoiceSource, /\{\.\.\.recipientSaleContextProps\(recipient\)\}/);
  assert.match(invoiceSource, /recipientShipmentSnapshot/);

  assert.match(saleSource, /shipmentId: string/);
  assert.match(saleSource, /shipmentId: shipmentResult\.data\.id/);
  assert.match(saleSource, /editingFromFinish/);
  assert.match(saleSource, /documentEditKind/);
  assert.match(saleSource, /SaleDocumentPartyEditDialog/);
  assert.match(saleSource, /syncShipmentPartyAction/);
  assert.match(saleSource, /syncCreatedInvoiceParty/);
  assert.match(saleSource, /fromFinish/);
  assert.match(saleSource, /setDocumentEditKind\("sender"\)/);
  assert.match(saleSource, /setDocumentEditKind\("recipient"\)/);

  assert.match(shipmentsSource, /export async function syncShipmentPartyAction/);
  assert.match(shipmentsSource, /shipment\.party_corrected/);
  assert.match(shipmentsSource, /recipient_snapshot/);
  assert.match(shipmentsSource, /before:/);
  assert.match(shipmentsSource, /after:/);
});
