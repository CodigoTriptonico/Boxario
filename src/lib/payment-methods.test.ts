import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_PAYMENT_METHOD,
  isPaymentMethod,
  PAYMENT_METHOD_OPTIONS,
  paymentMethodLabel,
  normalizePaymentMethodSettings,
} from "@/lib/payment-methods";

describe("payment methods", () => {
  it("covers common counter payment methods", () => {
    const methods = PAYMENT_METHOD_OPTIONS.map((option) => option.value);

    assert.deepEqual(methods, [
      "cash",
      "card",
      "check",
      "zelle",
      "venmo",
      "paypal",
      "cash_app",
      "bank_transfer",
      "deposit",
      "other",
    ]);
  });

  it("validates and labels methods", () => {
    assert.equal(DEFAULT_PAYMENT_METHOD, "cash");
    assert.equal(isPaymentMethod("zelle"), true);
    assert.equal(isPaymentMethod("crypto"), false);
    assert.equal(paymentMethodLabel("card"), "Tarjeta");
  });

  it("normalizes office and driver payment policies", () => {
    assert.deepEqual(
      normalizePaymentMethodSettings({
        acceptedPaymentMethods: ["cash", "zelle"],
        driverPaymentMethods: ["zelle", "card"],
        defaultPaymentMethod: "card",
        referenceRequiredMethods: ["zelle", "check"],
      }),
      {
        acceptedPaymentMethods: ["cash", "zelle"],
        driverPaymentMethods: ["zelle"],
        defaultPaymentMethod: "cash",
        referenceRequiredMethods: ["zelle"],
      },
    );
  });
});
