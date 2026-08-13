import { parseMoneyValue } from "@/lib/logistics-fees";

type PickupPolicy = {
  includedDays: number;
  latePickupFee: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export function readPickupPolicy(planValue: unknown): PickupPolicy | null {
  const plan = asRecord(planValue);
  const policy = asRecord(plan.pickupPolicy);
  const includedDays = Math.floor(Number(policy.includedDays));
  const latePickupFee = String(policy.latePickupFee || "$0");

  if (!Number.isFinite(includedDays) || includedDays < 1) {
    return null;
  }

  return { includedDays, latePickupFee };
}

export function pickupServiceWindow(input: {
  logisticsPlan: unknown;
  emptyBoxDeliveredAt: string | null | undefined;
  now?: Date;
}) {
  const policy = readPickupPolicy(input.logisticsPlan);
  const deliveredAt = input.emptyBoxDeliveredAt
    ? new Date(input.emptyBoxDeliveredAt)
    : null;

  if (!policy || !deliveredAt || Number.isNaN(deliveredAt.getTime())) {
    return null;
  }

  const includedUntil = new Date(
    deliveredAt.getTime() + policy.includedDays * 24 * 60 * 60 * 1000,
  );
  const now = input.now || new Date();

  return {
    ...policy,
    includedUntil,
    expired: now.getTime() > includedUntil.getTime(),
    chargeApplies: now.getTime() > includedUntil.getTime()
      && parseMoneyValue(policy.latePickupFee) > 0,
  };
}
