import type { PricingPromotionConfig } from "@/lib/pricing-promotions";
import type { ScheduleSuggestionConfig } from "@/lib/sale/schedule-suggestions";
import type { PaymentMethodSettings } from "@/lib/payment-methods";

export type InventoryCatalogProduct = {
  catalogKey: string;
  label: string;
  path: string;
  category: string;
  kind: string;
  subcategory?: string;
};

export type PricingBoxConfig = {
  size: string;
  price: string;
  cost?: string;
  catalogKey?: string;
};

export type PricingCountryConfig = {
  code: string;
  name: string;
  deliveryTime: string;
  boxes: PricingBoxConfig[];
};

export type PricingDistributorConfig = {
  name: string;
  contact: string;
  phone: string;
  active: boolean;
};

export type PricingDistributorPrices = Record<string, Record<string, PricingBoxConfig[]>>;

export type PricingRouteConfig = PaymentMethodSettings & {
  deliveryDays: string[];
  pickupDays: string[];
  deliveryRanges: string[];
  pickupRanges: string[];
  pendingAllowed: boolean;
  routeLeadTime: string;
  linkedRouteSchedules: boolean;
  emptyBoxDeliveryFee: string;
  fullBoxPickupFee: string;
  minimumDeposit: string;
  pickupIncludedDays: number;
  latePickupFee: string;
  logisticsFeeMode: "per_trip" | "per_box";
  scheduleSuggestions: ScheduleSuggestionConfig;
};

export type PricingConfigPayload = {
  countries: PricingCountryConfig[];
  promotions: PricingPromotionConfig[];
  distributors: PricingDistributorConfig[];
  distributorPrices: PricingDistributorPrices;
  routeConfig: PricingRouteConfig;
  catalogProducts: InventoryCatalogProduct[];
};
