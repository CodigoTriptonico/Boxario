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
  return {
    amount: billing.logisticsSubtotal,
    adjusted: false,
  };
}
