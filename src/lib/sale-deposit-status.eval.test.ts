import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { readShipmentActionsSource } from "@/test-utils/shipment-actions-source";
import { readVentaPartsSource } from "@/test-utils/venta-source";

const root = process.cwd();
const fieldSource = readFileSync(
  join(root, "src/components/sale/sale-payment-method-field.tsx"),
  "utf8",
);
const paymentSource = readFileSync(join(root, "src/lib/sale-payment-choice.ts"), "utf8");
const billingSource = readFileSync(join(root, "src/lib/invoice-billing.ts"), "utf8");
const shipmentActionSource = readShipmentActionsSource(root);
const invoiceSource = readVentaPartsSource();

describe("sale deposit status UI", () => {
  it("defaults to paid and records no money when the seller unchecks it", () => {
    assert.match(fieldSource, /Depósito pagado/);
    assert.match(fieldSource, /checked=\{paid\}/);
    assert.match(fieldSource, /Desmárcalo para dejarlo pendiente/);
    assert.match(fieldSource, /Estado: pendiente/);
    assert.doesNotMatch(fieldSource, /Conductor cobra|Cobrar ahora/);
    assert.doesNotMatch(fieldSource, /pendingPaymentSource/);
    assert.match(paymentSource, /choice === "pending"/);
    assert.match(paymentSource, /paid: "\$0"/);
    assert.match(paymentSource, /paymentMethod: undefined/);
  });

  it("persists required amount and status separately from money received", () => {
    assert.match(billingSource, /depositRequired: string/);
    assert.match(billingSource, /depositStatus: "pending" \| "paid"/);
    assert.match(billingSource, /depositStatusForPayment/);
    assert.match(shipmentActionSource, /payment_kind: paymentKind/);
    assert.match(shipmentActionSource, /invoicePaymentKindForCurrentDeposit/);
    assert.match(invoiceSource, /billing\.quotedTotal/);
    assert.match(invoiceSource, /billing\.payNow/);
    assert.match(invoiceSource, /billing\.balanceDue/);
    assert.match(invoiceSource, /−\{billing\.payNow\}/);
    assert.match(invoiceSource, /Sin abono inicial/);
    assert.match(invoiceSource, /onInitialPaymentWaivedChange/);
    assert.match(invoiceSource, /El depósito no se cobra ahora; el total queda pendiente/);
    assert.match(invoiceSource, /showInitialPaymentRow/);
    assert.match(invoiceSource, /showQuotedTotalRow/);
    assert.match(invoiceSource, /showBalanceDueRow/);
    assert.match(invoiceSource, /hideSoleChargeAmount/);
    assert.match(invoiceSource, /chargeLines\.length !== 1/);
    assert.match(invoiceSource, />Debe<\/p>/);
    assert.doesNotMatch(invoiceSource, />Total pendiente<\/p>/);
    assert.match(invoiceSource, /items-baseline justify-end gap-0\.5 whitespace-nowrap/);
    assert.match(invoiceSource, /Math\.max\(payNowInputValue\.length, 1\).*ch/);
    assert.doesNotMatch(invoiceSource, /billing\?\.depositRequired/);
    const quotedTotalGate = invoiceSource.indexOf("showQuotedTotalRow");
    const totalIndex = invoiceSource.indexOf(">Total</p>");
    const paymentIndex = invoiceSource.indexOf(">Abono</p>");
    const balanceIndex = invoiceSource.indexOf(">Saldo pendiente</p>");
    const debeIndex = invoiceSource.indexOf(">Debe</p>");
    assert.ok(quotedTotalGate > -1 && totalIndex > quotedTotalGate);
    assert.ok(totalIndex > -1);
    assert.ok(totalIndex < paymentIndex && paymentIndex < balanceIndex);
    assert.ok(debeIndex > balanceIndex);
  });
});
