export const ANY_PRODUCT = "*";

export type ComboRuleMode = "reward" | "bundle_price";
export type ComboBenefitKind = "percent_off" | "fixed_unit_price" | "set_total";

export type ComboBuyLine = {
  id: string;
  catalogKey: string;
  quantity: number;
};

export type ComboGetLine = {
  id: string;
  catalogKey: string;
  quantity: number;
  kind: ComboBenefitKind;
  percent?: number;
  amount?: string;
  target: "same_purchase" | "next_unit";
};

export type ComboRule = {
  mode: ComboRuleMode;
  buy: ComboBuyLine[];
  get: ComboGetLine[];
  bundlePrice?: string;
  repeat: boolean;
};

export type PricingPromotionConfig = {
  id: string;
  countryName: string;
  name: string;
  active: boolean;
  rule: ComboRule;
  catalogKey: string;
  sortOrder: number;
};

export type ComboCartLine = {
  catalogKey: string;
  quantity: number;
  unitPrice: string;
};

export type PromotionQuote = {
  promotionId: string;
  name: string;
  description: string;
  subtotalBeforeDiscount: string;
  subtotalAfterDiscount: string;
  discountTotal: string;
};

export function safeCount(value: number, fallback = 1) {
  return Math.max(Number.isFinite(value) ? Math.floor(value) : fallback, 1);
}

export function safePercent(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(Math.max(value, 0), 100);
}

export function normalizeKey(value: string) {
  return value.trim().toLowerCase();
}
