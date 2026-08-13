import {
  formatMoneyValue,
  parseMoneyValue,
  type LogisticsFeeConfig,
} from "@/lib/logistics-fees";
import {
  choosePromotionQuote,
  quoteCombosForCart,
  quotePromotionsForBox,
  type ComboCartLine,
  type PricingPromotionConfig,
  type PromotionQuote,
} from "@/lib/pricing-promotions";
import { minimumDepositForBoxCount } from "@/lib/sale-deposit-charge";
import type { PaymentMethodSettings } from "@/lib/payment-methods";

type LogisticsFeeMode = "per_trip" | "per_box";

export type InvoiceBillingConfig = LogisticsFeeConfig & Partial<PaymentMethodSettings> & {
  minimumDeposit: string;
  logisticsFeeMode: LogisticsFeeMode;
  pickupIncludedDays?: number;
  latePickupFee?: string;
};

export type LogisticsAdditionalCharge = {
  enabled: boolean;
  amount: string;
  reason: string;
};

export type LogisticsAdditionalCharges = {
  emptyBoxDelivery: LogisticsAdditionalCharge;
  fullBoxPickup: LogisticsAdditionalCharge;
};

export const disabledLogisticsAdditionalCharge = (): LogisticsAdditionalCharge => ({
  enabled: false,
  amount: "$0",
  reason: "",
});

export function logisticsAdditionalChargeRequiresReason(
  charge: LogisticsAdditionalCharge,
  _suggestion?: string,
) {
  void _suggestion;
  return charge.enabled;
}

export function logisticsAdditionalChargeIsValid(
  charge: LogisticsAdditionalCharge,
  _suggestion?: string,
) {
  void _suggestion;
  if (!charge.enabled) {
    return true;
  }
  const amount = parseMoneyValue(charge.amount);
  const reason = charge.reason.trim();
  return Number.isFinite(amount) && amount > 0 && reason.length > 0;
}

export type InvoiceBillingCartLine = ComboCartLine & {
  label: string;
  unitCost?: string;
  carrier?: string;
  time?: string;
};

export const DEFAULT_MINIMUM_DEPOSIT = "$20";

export const defaultInvoiceBillingConfig: InvoiceBillingConfig = {
  emptyBoxDeliveryFee: "$0",
  fullBoxPickupFee: "$0",
  minimumDeposit: DEFAULT_MINIMUM_DEPOSIT,
  logisticsFeeMode: "per_trip",
  pickupIncludedDays: 30,
  latePickupFee: "$0",
};

export type InvoiceBillingSnapshot = {
  boxCount: number;
  boxUnitPrice: string;
  cartLines: InvoiceBillingCartLine[];
  boxSubtotalBeforeDiscount: string;
  boxSubtotal: string;
  promotionDiscount: string;
  promotion: PromotionQuote | null;
  promotionCandidates: PromotionQuote[];
  promotionSelectionRequired: boolean;
  logisticsFeeMode: LogisticsFeeMode;
  emptyBoxDelivery: string;
  fullBoxPickup: string;
  latePickupFee: string;
  pickupIncludedDays: number;
  latePickupFeeConfigured: string;
  logisticsSubtotal: string;
  quotedTotal: string;
  minimumDeposit: string;
  depositRequired: string;
  depositStatus: "pending" | "paid";
  payNow: string;
  balanceDue: string;
  lastDriverCollection?: {
    expectedAmount: number;
    receivedAmount: number;
    outcome: "collected" | "not_collected";
    collectedAt: string;
    totalBefore: number;
    totalAfter: number;
  };
};

export function computeInvoiceBilling(input: {
  boxCount?: number;
  boxUnitPrice: string;
  emptyBoxDriver: boolean;
  fullBoxDriver: boolean;
  fees: InvoiceBillingConfig;
  payNow?: number;
  catalogKey?: string;
  cartLines?: InvoiceBillingCartLine[];
  promotions?: PricingPromotionConfig[];
  selectedPromotionId?: string;
  additionalCharges?: Partial<LogisticsAdditionalCharges>;
}): InvoiceBillingSnapshot {
  const fallbackCartLine: InvoiceBillingCartLine = {
    label: "Caja",
    catalogKey: input.catalogKey?.trim() || "",
    quantity: Math.max(input.boxCount ?? 1, 1),
    unitPrice: input.boxUnitPrice,
  };
  const cartLines = (input.cartLines?.length ? input.cartLines : [fallbackCartLine])
    .map((line) => ({
      ...line,
      quantity: Math.max(Math.floor(line.quantity) || 1, 1),
      unitPrice: line.unitPrice || "$0",
    }));
  const boxCount = cartLines.reduce((sum, line) => sum + line.quantity, 0) || 1;
  const boxUnitAmount = parseMoneyValue(cartLines[0]?.unitPrice || input.boxUnitPrice);
  const boxSubtotalBeforeDiscount = cartLines.reduce(
    (sum, line) => sum + parseMoneyValue(line.unitPrice) * line.quantity,
    0,
  );
  const promotionCandidates = input.cartLines?.length
    ? quoteCombosForCart({
        cart: cartLines,
        promotions: input.promotions,
      })
    : quotePromotionsForBox({
        boxCount,
        boxUnitPrice: input.boxUnitPrice,
        catalogKey: input.catalogKey,
        promotions: input.promotions,
      });
  const promotion = choosePromotionQuote({
    candidates: promotionCandidates,
    selectedPromotionId: input.selectedPromotionId,
  });
  const promotionDiscount = promotion ? parseMoneyValue(promotion.discountTotal) : 0;
  const boxSubtotal = Math.max(boxSubtotalBeforeDiscount - promotionDiscount, 0);
  const mode = input.fees.logisticsFeeMode;
  const emptyBoxCharge = input.additionalCharges?.emptyBoxDelivery;
  const fullBoxCharge = input.additionalCharges?.fullBoxPickup;
  const emptyBoxDelivery =
    input.emptyBoxDriver && emptyBoxCharge?.enabled
      ? Math.max(parseMoneyValue(emptyBoxCharge.amount), 0)
      : 0;
  const fullBoxPickup =
    input.fullBoxDriver && fullBoxCharge?.enabled
      ? Math.max(parseMoneyValue(fullBoxCharge.amount), 0)
      : 0;
  const logisticsSubtotal = emptyBoxDelivery + fullBoxPickup;
  const quotedTotal = boxSubtotal + logisticsSubtotal;

  const minimumDeposit = minimumDepositForBoxCount({
    minimumDeposit: input.fees.minimumDeposit,
    boxCount,
    quotedTotal,
  });
  const payNow =
    input.payNow === undefined
      ? Math.min(minimumDeposit, quotedTotal)
      : Math.min(Math.max(input.payNow, 0), quotedTotal);
  const balanceDue = Math.max(quotedTotal - payNow, 0);

  return {
    boxCount,
    boxUnitPrice: formatMoneyValue(boxUnitAmount),
    cartLines,
    boxSubtotalBeforeDiscount: formatMoneyValue(boxSubtotalBeforeDiscount),
    boxSubtotal: formatMoneyValue(boxSubtotal),
    promotionDiscount: formatMoneyValue(promotionDiscount),
    promotion,
    promotionCandidates,
    promotionSelectionRequired: promotionCandidates.length > 1 && !promotion,
    logisticsFeeMode: mode,
    emptyBoxDelivery: formatMoneyValue(emptyBoxDelivery),
    fullBoxPickup: formatMoneyValue(fullBoxPickup),
    latePickupFee: "$0",
    pickupIncludedDays: Math.max(Math.floor(input.fees.pickupIncludedDays || 30), 1),
    latePickupFeeConfigured: formatMoneyValue(
      Math.max(parseMoneyValue(input.fees.latePickupFee || "$0"), 0),
    ),
    logisticsSubtotal: formatMoneyValue(logisticsSubtotal),
    quotedTotal: formatMoneyValue(quotedTotal),
    minimumDeposit: formatMoneyValue(minimumDeposit),
    depositRequired: formatMoneyValue(payNow),
    depositStatus: "pending",
    payNow: formatMoneyValue(payNow),
    balanceDue: formatMoneyValue(balanceDue),
  };
}

export function resolvePayNowFromDraft(draft: string, touched: boolean): number | undefined {
  if (!touched && !draft.trim()) {
    return undefined;
  }

  if (!draft.trim()) {
    return 0;
  }

  return parseMoneyValue(draft);
}

export function billingWithRecordedPayment(
  billing: InvoiceBillingSnapshot,
  paidValue: string,
): InvoiceBillingSnapshot {
  const quotedTotal = parseMoneyValue(billing.quotedTotal);
  const paid = Math.min(Math.max(parseMoneyValue(paidValue), 0), quotedTotal);

  return {
    ...billing,
    depositStatus: depositStatusForPayment(billing.depositRequired, paidValue),
    payNow: formatMoneyValue(paid),
    balanceDue: formatMoneyValue(Math.max(quotedTotal - paid, 0)),
  };
}

export function depositStatusForPayment(
  depositRequiredValue: string | number,
  paidValue: string | number,
) {
  const depositRequired = parseMoneyValue(String(depositRequiredValue));
  const paid = parseMoneyValue(String(paidValue));

  return paid >= depositRequired ? "paid" as const : "pending" as const;
}

export function invoicePaymentKindForCurrentDeposit(input: {
  depositRequired: string | number;
  alreadyPaid: string | number;
}) {
  return depositStatusForPayment(input.depositRequired, input.alreadyPaid) === "pending"
    ? "deposit" as const
    : "balance" as const;
}

export function invoiceAccountingStateForPayment(
  billing: Pick<InvoiceBillingSnapshot, "quotedTotal">,
  paidValue: string,
) {
  const paidInFull = parseMoneyValue(paidValue) >= parseMoneyValue(billing.quotedTotal);
  return {
    invoiceStatus: paidInFull ? "paid" as const : "open" as const,
    accountingStatus: paidInFull ? "exportable" as const : "not_exportable" as const,
  };
}

export function readBillingFromPlan(value: unknown): InvoiceBillingSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const billing = (value as Record<string, unknown>).billing;
  if (!billing || typeof billing !== "object" || Array.isArray(billing)) {
    return null;
  }

  const row = billing as Record<string, unknown>;
  const quotedTotal = String(row.quotedTotal || "");
  const payNow = String(row.payNow || "");
  const balanceDue = String(row.balanceDue || "");
  const minimumDeposit = String(row.minimumDeposit || "$0");
  const depositRequired = String(
    row.depositRequired || (parseMoneyValue(minimumDeposit) > 0 ? minimumDeposit : payNow),
  );
  const depositStatus =
    row.depositStatus === "pending" || row.depositStatus === "paid"
      ? row.depositStatus
      : depositStatusForPayment(depositRequired, payNow);
  const driverCollection =
    row.lastDriverCollection &&
    typeof row.lastDriverCollection === "object" &&
    !Array.isArray(row.lastDriverCollection)
      ? (row.lastDriverCollection as Record<string, unknown>)
      : null;
  const lastDriverCollection =
    driverCollection &&
    (driverCollection.outcome === "collected" || driverCollection.outcome === "not_collected")
      ? {
          expectedAmount: Number(driverCollection.expectedAmount) || 0,
          receivedAmount: Number(driverCollection.receivedAmount) || 0,
          outcome: driverCollection.outcome as "collected" | "not_collected",
          collectedAt: String(driverCollection.collectedAt || ""),
          totalBefore: Number(driverCollection.totalBefore) || 0,
          totalAfter: Number(driverCollection.totalAfter) || 0,
        }
      : undefined;

  if (!quotedTotal || !payNow) {
    return null;
  }

  return {
    boxCount: Number(row.boxCount) || 1,
    boxUnitPrice: String(row.boxUnitPrice || "$0"),
    cartLines: Array.isArray(row.cartLines)
      ? (row.cartLines as InvoiceBillingCartLine[])
      : [
          {
            label: "Caja",
            catalogKey: "",
            quantity: Number(row.boxCount) || 1,
            unitPrice: String(row.boxUnitPrice || "$0"),
          },
        ],
    boxSubtotalBeforeDiscount: String(row.boxSubtotalBeforeDiscount || row.boxSubtotal || "$0"),
    boxSubtotal: String(row.boxSubtotal || "$0"),
    promotionDiscount: String(row.promotionDiscount || "$0"),
    promotion: (row.promotion as PromotionQuote | null) || null,
    promotionCandidates: Array.isArray(row.promotionCandidates)
      ? (row.promotionCandidates as PromotionQuote[])
      : [],
    promotionSelectionRequired: Boolean(row.promotionSelectionRequired),
    logisticsFeeMode: row.logisticsFeeMode === "per_box" ? "per_box" : "per_trip",
    emptyBoxDelivery: String(row.emptyBoxDelivery || "$0"),
    fullBoxPickup: String(row.fullBoxPickup || "$0"),
    latePickupFee: String(row.latePickupFee || "$0"),
    pickupIncludedDays: Math.max(Number(row.pickupIncludedDays) || 0, 0),
    latePickupFeeConfigured: String(row.latePickupFeeConfigured || "$0"),
    logisticsSubtotal: String(row.logisticsSubtotal || "$0"),
    quotedTotal,
    minimumDeposit,
    depositRequired,
    depositStatus,
    payNow,
    balanceDue: balanceDue || formatMoneyValue(parseMoneyValue(quotedTotal) - parseMoneyValue(payNow)),
    lastDriverCollection,
  };
}

export function saleFinishActionLabel(
  billing: Pick<InvoiceBillingSnapshot, "balanceDue"> | null,
  options?: { creating?: boolean; phase?: "setup" | "confirm" },
) {
  const hasBalanceDue = billing ? parseMoneyValue(billing.balanceDue) > 0 : true;
  const phase = options?.phase ?? "confirm";

  if (options?.creating) {
    return hasBalanceDue ? "Creando invoice..." : "Cerrando venta...";
  }

  if (phase === "setup") {
    return hasBalanceDue ? "Configurar pago" : "Confirmar cierre";
  }

  return hasBalanceDue ? "Crear invoice" : "Cerrar venta";
}
