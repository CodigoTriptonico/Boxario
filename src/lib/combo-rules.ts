import {
  ANY_PRODUCT,
  normalizeKey,
  safeCount,
  safePercent,
  type ComboBuyLine,
  type ComboGetLine,
  type ComboRule,
  type ComboRuleMode,
  type PricingPromotionConfig,
} from "@/lib/combo-rules/contracts";
import { isBundlePromotionEligible } from "@/lib/combo-rules/format";

export { ANY_PRODUCT } from "@/lib/combo-rules/contracts";
export type {
  ComboBenefitKind,
  ComboBuyLine,
  ComboCartLine,
  ComboGetLine,
  ComboRule,
  PricingPromotionConfig,
  PromotionQuote,
} from "@/lib/combo-rules/contracts";
export {
  choosePromotionQuote,
  evaluateComboDiscount,
  isPromotionRuleValid,
  promotionMatchesCartCatalog,
  quoteCombosForCart,
  quotePromotionsForBox,
} from "@/lib/combo-rules/evaluation";
export {
  describeComboRule,
  describeComboRuleShort,
  isBundlePromotionEligible,
} from "@/lib/combo-rules/format";

type LegacyPromotionRow = {
  catalog_key: string;
  promotion_type: string;
  bundle_quantity: number | null;
  bundle_price: string | null;
  paid_quantity: number | null;
  discounted_quantity: number | null;
  discount_percent: number | string | null;
};

export function createComboLineId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `combo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function dedupeComboLineIds<T extends { id: string }>(lines: T[]): T[] {
  const seen = new Set<string>();

  return lines.map((line) => {
    const currentId = line.id.trim();

    if (currentId && !seen.has(currentId)) {
      seen.add(currentId);
      return line;
    }

    const nextId = createComboLineId();
    seen.add(nextId);
    return { ...line, id: nextId };
  });
}

export function ensureComboRuleLineIds(rule: ComboRule): ComboRule {
  return {
    ...rule,
    buy: dedupeComboLineIds(rule.buy),
    get: dedupeComboLineIds(rule.get),
  };
}

function createBlankComboRule(): ComboRule {
  return {
    mode: "reward",
    buy: [],
    get: [],
    repeat: true,
  };
}

export function createBlankPromotion(input: {
  id: string;
  countryName: string;
  sortOrder?: number;
}): PricingPromotionConfig {
  const rule = createBlankComboRule();

  return {
    id: input.id,
    countryName: input.countryName,
    name: "",
    active: true,
    rule,
    catalogKey: "",
    sortOrder: input.sortOrder ?? 0,
  };
}

export function normalizeComboRule(value: unknown): ComboRule {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return createBlankComboRule();
  }

  const row = value as Record<string, unknown>;
  const buy = Array.isArray(row.buy)
    ? row.buy
        .map((line) => {
          if (!line || typeof line !== "object" || Array.isArray(line)) {
            return null;
          }

          const entry = line as Record<string, unknown>;

          return {
            id: String(entry.id || createComboLineId()),
            catalogKey: String(entry.catalogKey || ""),
            quantity: safeCount(Number(entry.quantity), 1),
          } satisfies ComboBuyLine;
        })
        .filter((line): line is ComboBuyLine => Boolean(line))
    : [];

  const get: ComboGetLine[] = Array.isArray(row.get)
    ? row.get
        .map((line): ComboGetLine | null => {
          if (!line || typeof line !== "object" || Array.isArray(line)) {
            return null;
          }

          const entry = line as Record<string, unknown>;
          const kind =
            entry.kind === "fixed_unit_price" || entry.kind === "set_total"
              ? entry.kind
              : "percent_off";

          return {
            id: String(entry.id || createComboLineId()),
            catalogKey: String(entry.catalogKey || ""),
            quantity: safeCount(Number(entry.quantity), 1),
            kind,
            percent: safePercent(Number(entry.percent)),
            amount: typeof entry.amount === "string" ? entry.amount : "",
            target: entry.target === "next_unit" ? "next_unit" : "same_purchase",
          } satisfies ComboGetLine;
        })
        .filter((line): line is ComboGetLine => Boolean(line))
    : [];

  const normalizedBuy = buy;
  const normalizedGet = get;
  const explicitMode: ComboRuleMode | null =
    row.mode === "bundle_price" || row.mode === "reward" ? row.mode : null;
  const legacyBundleLine: ComboGetLine | undefined =
    explicitMode === null
      ? normalizedGet.find((line) => line.kind === "set_total")
      : undefined;

  if (explicitMode === "bundle_price" || legacyBundleLine) {
    const bundleLines =
      legacyBundleLine && normalizedBuy.length === 1 && normalizedGet.length === 1
        ? normalizedBuy[0]?.catalogKey === legacyBundleLine.catalogKey &&
          normalizedBuy[0]?.quantity === legacyBundleLine.quantity
          ? normalizedBuy
          : [
              ...normalizedBuy,
              {
                id: legacyBundleLine.id,
                catalogKey: legacyBundleLine.catalogKey,
                quantity: legacyBundleLine.quantity,
              },
            ]
        : normalizedBuy;

    return ensureComboRuleLineIds({
      mode: "bundle_price",
      buy: bundleLines,
      get: explicitMode === "bundle_price" ? normalizedGet : [],
      bundlePrice:
        typeof row.bundlePrice === "string"
          ? row.bundlePrice
          : legacyBundleLine?.amount || "$0",
      repeat: row.repeat !== false,
    });
  }

  return ensureComboRuleLineIds({
    mode: "reward",
    buy: normalizedBuy,
    get: normalizedGet,
    repeat: row.repeat !== false,
  });
}

export function legacyPromotionToRule(row: LegacyPromotionRow): ComboRule {
  const catalogKey = row.catalog_key.trim();

  if (row.promotion_type === "bundle_price") {
    const quantity = safeCount(Number(row.bundle_quantity), 2);

    return {
      mode: "bundle_price",
      buy: [{ id: createComboLineId(), catalogKey, quantity }],
      get: [],
      bundlePrice: row.bundle_price || "$0",
      repeat: true,
    };
  }

  const paidQuantity = safeCount(Number(row.paid_quantity), 2);
  const discountedQuantity = safeCount(Number(row.discounted_quantity), 1);
  const discountPercent = safePercent(Number(row.discount_percent));

  return {
    mode: "reward",
    buy: [{ id: createComboLineId(), catalogKey, quantity: paidQuantity }],
    get: [
      {
        id: createComboLineId(),
        catalogKey,
        quantity: discountedQuantity,
        kind: "percent_off",
        percent: discountPercent,
        target: "next_unit",
      },
    ],
    repeat: true,
  };
}

export function promotionFromDbRow(input: {
  id: string;
  countryName: string;
  name: string;
  active: boolean;
  catalog_key: string;
  sort_order?: number;
  rule_json?: unknown;
  legacy?: LegacyPromotionRow;
}): PricingPromotionConfig {
  const rule = input.rule_json
    ? normalizeComboRule(input.rule_json)
    : input.legacy
      ? legacyPromotionToRule(input.legacy)
      : createBlankComboRule();

  return {
    id: input.id,
    countryName: input.countryName,
    name: input.name,
    active: input.active,
    rule,
    catalogKey: primaryCatalogKey(rule) || input.catalog_key.trim(),
    sortOrder: input.sort_order ?? 0,
  };
}

export function primaryCatalogKey(rule: ComboRule) {
  const specific = rule.buy.find((line) => line.catalogKey && line.catalogKey !== ANY_PRODUCT);

  if (specific) {
    return specific.catalogKey;
  }

  const rewardSpecific = rule.get.find(
    (line) => line.catalogKey && line.catalogKey !== ANY_PRODUCT,
  );

  return rewardSpecific?.catalogKey || "";
}

export function coerceSingleProductBundleRule(rule: ComboRule): ComboRule {
  if (rule.mode !== "bundle_price" || isBundlePromotionEligible(rule)) {
    return rule;
  }

  const buy = rule.buy.filter((line) => line.catalogKey.trim() && line.quantity > 0);
  const catalogKey = buy[0]?.catalogKey.trim() ?? "";

  if (!catalogKey) {
    return {
      mode: "reward",
      buy: rule.buy,
      get: [],
      repeat: rule.repeat,
      bundlePrice: undefined,
    };
  }

  const quantity =
    buy.find((line) => normalizeKey(line.catalogKey) === normalizeKey(catalogKey))?.quantity ??
    1;

  return {
    mode: "reward",
    buy: rule.buy,
    repeat: rule.repeat,
    bundlePrice: undefined,
    get: [
      {
        id: createComboLineId(),
        catalogKey,
        quantity,
        kind: "set_total",
        amount: rule.bundlePrice || "",
        target: "same_purchase",
      },
    ],
  };
}
