import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
  isPaymentIdempotencyConflict,
  mapCollectPaymentError,
  parseCollectPaymentRpcResult,
  PAYMENT_IDEMPOTENCY_CONFLICT,
  validateClientPaymentId,
} from "@/lib/office-payment-idempotency";
import {
  resolveShipmentCollectAmount,
  shipmentCollectCopy,
  shipmentCollectSuccessMessage,
} from "@/lib/shipment-collect";
import { readShipmentActionsSource } from "@/test-utils/shipment-actions-source";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("resolveShipmentCollectAmount", () => {
  it("defaults to the full balance when amount is omitted", () => {
    const result = resolveShipmentCollectAmount(undefined, 15);

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.amount, 15);
      assert.equal(result.isFullPayment, true);
    }
  });

  it("accepts a partial amount below the balance", () => {
    const result = resolveShipmentCollectAmount("$10", 15);

    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.amount, 10);
      assert.equal(result.isFullPayment, false);
    }
  });

  it("rejects amounts above the pending balance", () => {
    const result = resolveShipmentCollectAmount("$20", 15);

    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.match(result.error, /superar/);
    }
  });
});

describe("shipmentCollectCopy", () => {
  it("offers full payment and abono on the first step", () => {
    const copy = shipmentCollectCopy(15, "choose");

    assert.equal(copy.title, "¿Cómo quieres cobrar?");
    assert.equal(copy.fullOptionLabel, "Pago completo");
    assert.equal(copy.partialOptionLabel, "Abono");
  });

  it("labels partial collection with the current payment terminology", () => {
    const copy = shipmentCollectCopy(15, "partial");

    assert.equal(copy.title, "Registrar pago");
    assert.equal(copy.confirmLabel, "Registrar pago");
  });
});

describe("shipmentCollectSuccessMessage", () => {
  it("distinguishes full payment from partial abono", () => {
    assert.equal(shipmentCollectSuccessMessage("INV-000002", 15, true), "Invoice INV-000002 cobrado");
    assert.equal(
      shipmentCollectSuccessMessage("INV-000002", 10, false),
      "Abono de $10 registrado en INV-000002",
    );
  });
});

describe("office payment idempotency contract", () => {
  it("validates clientPaymentId length without minting a new id", () => {
    assert.equal(validateClientPaymentId("").ok, false);
    assert.equal(validateClientPaymentId("short").ok, false);
    const ok = validateClientPaymentId("pay-intention-001");
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.equal(ok.value, "pay-intention-001");
    }
  });

  it("maps conflict and parses replayed rpc results", () => {
    assert.equal(
      mapCollectPaymentError("PAYMENT_IDEMPOTENCY_CONFLICT"),
      PAYMENT_IDEMPOTENCY_CONFLICT,
    );
    assert.equal(isPaymentIdempotencyConflict(PAYMENT_IDEMPOTENCY_CONFLICT), true);

    const replayed = parseCollectPaymentRpcResult({
      replayed: true,
      paymentId: "11111111-1111-1111-1111-111111111111",
      shipmentId: "22222222-2222-2222-2222-222222222222",
      paid: 10,
      invoiceStatus: "open",
      clientPaymentId: "pay-intention-001",
    });
    assert.equal(replayed?.replayed, true);
    assert.equal(replayed?.paid, 10);
  });

  it("wires clientPaymentId from UI through action to RPC without server UUID mint", () => {
    const commercialSource = readFileSync(
      join(root, "src/app/actions/shipments-commercial.ts"),
      "utf8",
    );
    const billingHook = readFileSync(
      join(root, "src/components/envios/use-envios-billing.ts"),
      "utf8",
    );
    const saleDrawer = readFileSync(
      join(root, "src/components/sale/sale-customer-history-drawer.tsx"),
      "utf8",
    );
    const migration170 = readFileSync(
      join(root, "supabase/migrations/170_office_payment_idempotency.sql"),
      "utf8",
    );
    const migration175 = readFileSync(
      join(root, "supabase/migrations/175_office_payment_idempotency_result.sql"),
      "utf8",
    );

    assert.match(commercialSource, /payment_client_operation_id:\s*clientPaymentId/);
    assert.match(commercialSource, /validateClientPaymentId/);
    assert.match(commercialSource, /rpcResult\.replayed/);
    assert.doesNotMatch(
      commercialSource,
      /clientPaymentId\s*=\s*(?:globalThis\.)?crypto\.randomUUID|randomUUID\(/,
    );
    // Must not mint a payment key inside the Server Action.
    assert.doesNotMatch(
      commercialSource.slice(commercialSource.indexOf("finalizeShipmentInvoiceAction")),
      /randomUUID\(/,
    );

    assert.match(billingHook, /clientPaymentIdRef/);
    assert.match(billingHook, /busyRef\.current/);
    assert.match(billingHook, /isPaymentIdempotencyConflict/);
    assert.match(billingHook, /beginOfficePaymentIntention/);
    assert.match(billingHook, /resolveOfficePaymentIntentionOnOpen/);
    assert.match(billingHook, /clearPendingOfficePaymentIntention/);
    assert.match(billingHook, /Keep ambiguous pending intentions in storage/);
    assert.match(saleDrawer, /beginOfficePaymentIntention/);
    assert.match(saleDrawer, /resolveOfficePaymentIntentionOnOpen/);

    assert.match(migration170, /client_payment_id/);
    assert.match(migration170, /idx_shipment_payments_org_client_payment_id/);
    assert.match(migration175, /returns jsonb/);
    assert.match(migration175, /PAYMENT_IDEMPOTENCY_CONFLICT/);
    assert.match(migration175, /Insert payment first/);
    assert.match(migration175, /'replayed', true/);
    const migration178 = readFileSync(
      join(root, "supabase/migrations/178_office_payment_org_scoped_key.sql"),
      "utf8",
    );
    assert.match(migration178, /drop index if exists public\.idx_shipment_payments_client_payment_id_global/);
    assert.match(migration178, /unique per organization/);
    assert.match(
      readFileSync(join(root, "supabase/migrations/176_office_payment_idempotency_kind_replay.sql"), "utf8"),
      /kind excluded as derived|Intention identity is org/,
    );
  });

  it("uses one database function for shipment update and payment insert", () => {
    const actionsSource = readShipmentActionsSource();
    const migrationSource = readFileSync(
      join(root, "supabase/migrations/043_atomic_invoice_collection.sql"),
      "utf8",
    );

    assert.match(actionsSource, /collect_shipment_invoice_payment/);
    assert.match(migrationSource, /update public\.shipments[\s\S]*insert into public\.shipment_payments/);
  });
});
