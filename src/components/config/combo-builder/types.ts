import type { ComboRule } from "@/lib/combo-rules";

export type ComboBuilderProduct = {
  catalogKey: string;
  label: string;
  price: string;
};

export type ComboBuilderProps = {
  rule: ComboRule;
  onChange: (rule: ComboRule) => void;
  products: ComboBuilderProduct[];
};

export type RuleIntent = "discount" | "free_gift" | "bundle_price";
export type DiscountStyle = "percent" | "unit_price" | "set_total";
