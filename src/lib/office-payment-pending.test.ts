import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  OFFICE_PAYMENT_PENDING_STORAGE_KEY,
  OFFICE_PAYMENT_PENDING_TTL_MS,
  beginOfficePaymentIntention,
  clearPendingOfficePaymentIntention,
  loadPendingOfficePaymentIntention,
  resolveOfficePaymentIntentionOnOpen,
} from "@/lib/office-payment-pending";

class MemoryStorage {
  private data = new Map<string, string>();
  getItem(key: string) {
    return this.data.has(key) ? this.data.get(key)! : null;
  }
  setItem(key: string, value: string) {
    this.data.set(key, String(value));
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  clear() {
    this.data.clear();
  }
}

describe("office-payment-pending intention store", () => {
  const original = globalThis.localStorage;
  let memory: MemoryStorage;

  beforeEach(() => {
    memory = new MemoryStorage();
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: memory,
    });
  });

  afterEach(() => {
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      value: original,
    });
  });

  it("survives close/reopen for the same shipment after an ambiguous send", () => {
    const pending = beginOfficePaymentIntention({
      shipmentId: "ship-1",
      clientPaymentId: "pay-intention-001",
      amount: 10,
      method: "cash",
      now: 1_000,
    });

    // Simulate dialog close that must NOT clear ambiguous intentions.
    const restored = resolveOfficePaymentIntentionOnOpen({
      shipmentId: "ship-1",
      mintId: () => "pay-should-not-be-used",
      now: 1_500,
    });

    assert.equal(restored.restored, true);
    assert.equal(restored.clientPaymentId, pending.clientPaymentId);
    assert.equal(restored.pending?.amount, 10);
    assert.equal(restored.pending?.method, "cash");
  });

  it("mints a new intention when opening before any send", () => {
    const opened = resolveOfficePaymentIntentionOnOpen({
      shipmentId: "ship-1",
      mintId: () => "pay-fresh-0001",
      now: 1_000,
    });
    assert.equal(opened.restored, false);
    assert.equal(opened.clientPaymentId, "pay-fresh-0001");
  });

  it("clears storage after success/replay so a second abono gets a new key", () => {
    beginOfficePaymentIntention({
      shipmentId: "ship-1",
      clientPaymentId: "pay-intention-001",
      amount: 10,
      method: "cash",
      now: 1_000,
    });
    clearPendingOfficePaymentIntention("ship-1");

    const opened = resolveOfficePaymentIntentionOnOpen({
      shipmentId: "ship-1",
      mintId: () => "pay-second-0002",
      now: 2_000,
    });
    assert.equal(opened.restored, false);
    assert.equal(opened.clientPaymentId, "pay-second-0002");
  });

  it("does not reuse an intention belonging to another shipment", () => {
    beginOfficePaymentIntention({
      shipmentId: "ship-a",
      clientPaymentId: "pay-intention-aaa",
      amount: 5,
      method: "card",
      now: 1_000,
    });
    const opened = resolveOfficePaymentIntentionOnOpen({
      shipmentId: "ship-b",
      mintId: () => "pay-for-ship-b",
      now: 1_100,
    });
    assert.equal(opened.restored, false);
    assert.equal(opened.clientPaymentId, "pay-for-ship-b");
    assert.equal(
      loadPendingOfficePaymentIntention("ship-a", 1_100)?.clientPaymentId,
      "pay-intention-aaa",
    );
  });

  it("drops expired or invalid intentions", () => {
    beginOfficePaymentIntention({
      shipmentId: "ship-1",
      clientPaymentId: "pay-intention-old",
      amount: 10,
      method: "cash",
      now: 1_000,
    });
    const expired = resolveOfficePaymentIntentionOnOpen({
      shipmentId: "ship-1",
      mintId: () => "pay-new-after-ttl",
      now: 1_000 + OFFICE_PAYMENT_PENDING_TTL_MS + 1,
    });
    assert.equal(expired.restored, false);
    assert.equal(expired.clientPaymentId, "pay-new-after-ttl");
    assert.equal(loadPendingOfficePaymentIntention("ship-1", 1_000 + OFFICE_PAYMENT_PENDING_TTL_MS + 1), null);

    memory.setItem(
      OFFICE_PAYMENT_PENDING_STORAGE_KEY,
      JSON.stringify({
        "ship-2": {
          shipmentId: "ship-2",
          clientPaymentId: "short",
          amount: 1,
          method: "cash",
          createdAt: Date.now(),
        },
      }),
    );
    assert.equal(loadPendingOfficePaymentIntention("ship-2"), null);
  });

  it("keeps the same key across tabs via shared localStorage", () => {
    beginOfficePaymentIntention({
      shipmentId: "ship-1",
      clientPaymentId: "pay-shared-tab",
      amount: 12,
      method: "cash",
      now: 5_000,
    });
    // Second "tab" reading the same storage backend.
    const otherTab = resolveOfficePaymentIntentionOnOpen({
      shipmentId: "ship-1",
      mintId: () => "pay-other-tab",
      now: 5_100,
    });
    assert.equal(otherTab.clientPaymentId, "pay-shared-tab");
  });
});
