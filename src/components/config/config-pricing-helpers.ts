import type { PricingPromotionConfig } from "@/lib/pricing-promotions";
import type { CountryOption } from "@/lib/country-options";

export const emptyDistributor = {
  name: "",
  contact: "",
  phone: "",
};

export type CountryPriceTab = "items" | "promotions" | "delivery";

export type CountryContextMenu = {
  name: string;
  x: number;
  y: number;
};

export type CountryProductContextMenu = {
  catalogKey: string;
  label: string;
  x: number;
  y: number;
};

export type PromotionEditorState = {
  mode: "new" | "edit";
  draft: PricingPromotionConfig;
};

export function countryOptionKey(country: Pick<CountryOption, "code" | "name">) {
  return country.code || country.name;
}

export const normalizeConfigText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export function parseMoney(value: string) {
  return Number(value.replace(/[^\d.-]/g, "")) || 0;
}

export function productKeyFromBox(box: { size: string; catalogKey?: string }) {
  return box.catalogKey || box.size;
}

export function localPromotionId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `local-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}
