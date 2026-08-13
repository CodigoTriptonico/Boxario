import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickupServiceWindow } from "@/lib/pickup-service-window";

describe("pickupServiceWindow", () => {
  const logisticsPlan = {
    pickupPolicy: { includedDays: 30, latePickupFee: "$18" },
  };

  it("keeps pickup included through the exact deadline", () => {
    const status = pickupServiceWindow({
      logisticsPlan,
      emptyBoxDeliveredAt: "2026-01-01T12:00:00.000Z",
      now: new Date("2026-01-31T12:00:00.000Z"),
    });

    assert.equal(status?.expired, false);
    assert.equal(status?.chargeApplies, false);
  });

  it("marks a pickup requested after the deadline as chargeable", () => {
    const status = pickupServiceWindow({
      logisticsPlan,
      emptyBoxDeliveredAt: "2026-01-01T12:00:00.000Z",
      now: new Date("2026-01-31T12:00:01.000Z"),
    });

    assert.equal(status?.expired, true);
    assert.equal(status?.chargeApplies, true);
    assert.equal(status?.latePickupFee, "$18");
  });

  it("does not announce a charge when the configured amount is zero", () => {
    const status = pickupServiceWindow({
      logisticsPlan: { pickupPolicy: { includedDays: 30, latePickupFee: "$0" } },
      emptyBoxDeliveredAt: "2026-01-01T12:00:00.000Z",
      now: new Date("2026-02-01T12:00:00.000Z"),
    });

    assert.equal(status?.expired, true);
    assert.equal(status?.chargeApplies, false);
  });
});
