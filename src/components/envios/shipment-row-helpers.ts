import { formatMoneyValue, parseMoneyValue } from "@/lib/logistics-fees";
import { readBillingFromPlan } from "@/lib/invoice-billing";
import type { ShipmentRow } from "@/lib/shipment-types";

export function driverCollectionLabel(row: ShipmentRow) {
  const collection = readBillingFromPlan(row.logistics_plan)?.lastDriverCollection;

  if (!collection) {
    return "";
  }

  if (collection.outcome === "not_collected") {
    return `Conductor no recibió dinero · esperado ${formatMoneyValue(collection.expectedAmount)}`;
  }

  return `Conductor recibió ${formatMoneyValue(collection.receivedAmount)} · esperado ${formatMoneyValue(collection.expectedAmount)}`;
}

export function shipmentLogisticsCharge(row: ShipmentRow) {
  const billing = readBillingFromPlan(row.logistics_plan);
  if (!billing || parseMoneyValue(billing.logisticsSubtotal) <= 0) {
    return null;
  }
  const plan = row.logistics_plan && typeof row.logistics_plan === "object"
    ? row.logistics_plan as Record<string, unknown>
    : {};
  const adjustments =
    plan.feeAdjustments && typeof plan.feeAdjustments === "object"
      ? plan.feeAdjustments as Record<string, unknown>
      : {};
  const adjusted = Object.values(adjustments).some((value) => {
    if (!value || typeof value !== "object") return false;
    const charge = value as Record<string, unknown>;
    return charge.enabled === true &&
      parseMoneyValue(String(charge.amount || "$0")) !==
        parseMoneyValue(String(charge.suggestion || "$0"));
  });
  return {
    amount: billing.logisticsSubtotal,
    adjusted,
  };
}
