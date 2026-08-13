import { formatMoneyValue, parseMoneyValue } from "@/lib/logistics-fees";

export type LogisticsChargeLeg = "emptyBoxDelivery" | "fullBoxPickup";

export type CustomerLogisticsChargeSnapshot = {
  amount: string;
  reason: string;
};

export type CustomerLogisticsChargeLegHistory = {
  lastCharge: CustomerLogisticsChargeSnapshot | null;
  reasonTags: string[];
};

export type CustomerLogisticsChargeHistory = {
  emptyBoxDelivery: CustomerLogisticsChargeLegHistory;
  fullBoxPickup: CustomerLogisticsChargeLegHistory;
};

export const emptyCustomerLogisticsChargeHistory = (): CustomerLogisticsChargeHistory => ({
  emptyBoxDelivery: { lastCharge: null, reasonTags: [] },
  fullBoxPickup: { lastCharge: null, reasonTags: [] },
});

export function normalizeLogisticsChargeReason(reason: string) {
  return reason.trim().replace(/\s+/g, " ").slice(0, 500);
}

function logisticsChargeReasonKey(reason: string) {
  return normalizeLogisticsChargeReason(reason).toLocaleLowerCase("es");
}

export function mergeLogisticsChargeReasonTags(existing: string[], incoming: string) {
  const normalized = normalizeLogisticsChargeReason(incoming);
  if (!normalized) {
    return existing;
  }

  const incomingKey = logisticsChargeReasonKey(normalized);
  if (existing.some((tag) => logisticsChargeReasonKey(tag) === incomingKey)) {
    return existing;
  }

  return [normalized, ...existing];
}

export function isLogisticsChargeReasonTagSelected(tag: string, selectedReason: string) {
  if (!selectedReason.trim()) {
    return false;
  }

  return logisticsChargeReasonKey(tag) === logisticsChargeReasonKey(selectedReason);
}

function readEnabledCharge(raw: unknown): CustomerLogisticsChargeSnapshot | null {
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const charge = raw as Record<string, unknown>;
  if (charge.enabled !== true) {
    return null;
  }

  const amountValue = parseMoneyValue(String(charge.amount || ""));
  if (!Number.isFinite(amountValue) || amountValue <= 0) {
    return null;
  }

  const reason = normalizeLogisticsChargeReason(String(charge.reason || ""));
  if (!reason) {
    return null;
  }

  return {
    amount: formatMoneyValue(amountValue),
    reason,
  };
}

export function collectCustomerLogisticsChargeHistoryFromPlans(
  plans: unknown[],
): CustomerLogisticsChargeHistory {
  const history = emptyCustomerLogisticsChargeHistory();
  const seenReasons = {
    emptyBoxDelivery: new Set<string>(),
    fullBoxPickup: new Set<string>(),
  };

  for (const plan of plans) {
    if (!plan || typeof plan !== "object") {
      continue;
    }

    const adjustments =
      (plan as { feeAdjustments?: unknown }).feeAdjustments &&
      typeof (plan as { feeAdjustments?: unknown }).feeAdjustments === "object"
        ? ((plan as { feeAdjustments: Record<string, unknown> }).feeAdjustments)
        : null;

    if (!adjustments) {
      continue;
    }

    for (const leg of ["emptyBoxDelivery", "fullBoxPickup"] as const) {
      const snapshot = readEnabledCharge(adjustments[leg]);
      if (!snapshot) {
        continue;
      }

      if (!history[leg].lastCharge) {
        history[leg].lastCharge = snapshot;
      }

      const key = logisticsChargeReasonKey(snapshot.reason);
      if (seenReasons[leg].has(key)) {
        continue;
      }

      seenReasons[leg].add(key);
      history[leg].reasonTags.push(snapshot.reason);
    }
  }

  return history;
}
