import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  collectCustomerLogisticsChargeHistoryFromPlans,
  emptyCustomerLogisticsChargeHistory,
  isLogisticsChargeReasonTagSelected,
  mergeLogisticsChargeReasonTags,
  normalizeLogisticsChargeReason,
} from "./logistics-charge-history";

describe("logistics charge history", () => {
  it("normalizes and merges reason tags without duplicates", () => {
    assert.equal(normalizeLogisticsChargeReason("  Acceso  especial  "), "Acceso especial");
    assert.deepEqual(
      mergeLogisticsChargeReasonTags(["Acceso especial"], "acceso especial"),
      ["Acceso especial"],
    );
    assert.deepEqual(
      mergeLogisticsChargeReasonTags(["Acceso especial"], "Zona remota"),
      ["Zona remota", "Acceso especial"],
    );
    assert.equal(isLogisticsChargeReasonTagSelected("Acceso especial", "acceso especial"), true);
  });

  it("builds last charge and reason tags per leg from newest plans first", () => {
    const history = collectCustomerLogisticsChargeHistoryFromPlans([
      {
        feeAdjustments: {
          emptyBoxDelivery: { enabled: true, amount: "$100", reason: "Acceso especial" },
          fullBoxPickup: { enabled: false, amount: "$0", reason: "" },
        },
      },
      {
        feeAdjustments: {
          emptyBoxDelivery: { enabled: true, amount: "$80", reason: "Zona remota" },
          fullBoxPickup: { enabled: true, amount: "$40", reason: "Escaleras" },
        },
      },
    ]);

    assert.deepEqual(history.emptyBoxDelivery.lastCharge, {
      amount: "$100",
      reason: "Acceso especial",
    });
    assert.deepEqual(history.emptyBoxDelivery.reasonTags, ["Acceso especial", "Zona remota"]);
    assert.deepEqual(history.fullBoxPickup.lastCharge, {
      amount: "$40",
      reason: "Escaleras",
    });
    assert.deepEqual(history.fullBoxPickup.reasonTags, ["Escaleras"]);
  });

  it("ignores disabled or incomplete charges", () => {
    assert.deepEqual(
      collectCustomerLogisticsChargeHistoryFromPlans([
        {
          feeAdjustments: {
            emptyBoxDelivery: { enabled: true, amount: "$50", reason: "" },
            fullBoxPickup: { enabled: true, amount: "$0", reason: "Nada" },
          },
        },
      ]),
      emptyCustomerLogisticsChargeHistory(),
    );
  });
});
