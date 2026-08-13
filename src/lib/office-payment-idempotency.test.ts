import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isDefinitiveOfficePaymentClientError,
  isPaymentIdempotencyConflict,
  mapCollectPaymentError,
  parseCollectPaymentRpcResult,
  PAYMENT_IDEMPOTENCY_CONFLICT,
  paymentIdempotencyConflictUserMessage,
  validateClientPaymentId,
} from "@/lib/office-payment-idempotency";

describe("office-payment-idempotency", () => {
  it("accepts stable client keys and rejects empty or short values", () => {
    assert.equal(validateClientPaymentId("").ok, false);
    assert.equal(validateClientPaymentId("1234567").ok, false);
    const ok = validateClientPaymentId("abcd1234");
    assert.equal(ok.ok, true);
    if (ok.ok) {
      assert.equal(ok.value, "abcd1234");
    }
  });

  it("maps domain conflict codes without turning them into success", () => {
    assert.equal(
      mapCollectPaymentError("PAYMENT_IDEMPOTENCY_CONFLICT"),
      PAYMENT_IDEMPOTENCY_CONFLICT,
    );
    assert.equal(isPaymentIdempotencyConflict(PAYMENT_IDEMPOTENCY_CONFLICT), true);
    assert.match(paymentIdempotencyConflictUserMessage(), /otros datos/i);
  });

  it("classifies definitive vs ambiguous client errors for key retention", () => {
    assert.equal(isDefinitiveOfficePaymentClientError(PAYMENT_IDEMPOTENCY_CONFLICT), true);
    assert.equal(isDefinitiveOfficePaymentClientError("El monto debe ser mayor a cero"), true);
    assert.equal(isDefinitiveOfficePaymentClientError("No hay pendiente en este invoice"), true);
    assert.equal(isDefinitiveOfficePaymentClientError("Failed to fetch"), false);
    assert.equal(isDefinitiveOfficePaymentClientError("No se pudo completar la operacion"), false);
    assert.equal(isDefinitiveOfficePaymentClientError("network timeout"), false);
  });

  it("parses replayed RPC payloads", () => {
    const parsed = parseCollectPaymentRpcResult({
      replayed: true,
      paymentId: "11111111-1111-1111-1111-111111111111",
      shipmentId: "22222222-2222-2222-2222-222222222222",
      paid: "25.00",
      invoiceStatus: "open",
      clientPaymentId: "abcd1234",
    });
    assert.equal(parsed?.replayed, true);
    assert.equal(parsed?.paid, 25);
    assert.equal(parsed?.clientPaymentId, "abcd1234");
  });
});
