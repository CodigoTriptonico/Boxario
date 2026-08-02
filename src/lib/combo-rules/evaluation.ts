import { formatMoneyValue, parseMoneyValue } from "@/lib/logistics-fees";
import {
  ANY_PRODUCT,
  normalizeKey,
  safeCount,
  safePercent,
  type ComboBuyLine,
  type ComboCartLine,
  type ComboGetLine,
  type ComboRule,
  type PricingPromotionConfig,
  type PromotionQuote,
} from "@/lib/combo-rules/contracts";
import {
  describeComboRuleShort,
  isBundlePromotionEligible,
} from "@/lib/combo-rules/format";

export function promotionMatchesCartCatalog(
  promotion: PricingPromotionConfig,
  catalogKeys: string[],
) {
  const normalized = new Set(catalogKeys.map(normalizeKey).filter(Boolean));

  if (!normalized.size) {
    return false;
  }

  const referenced = new Set<string>();

  for (const line of [...promotion.rule.buy, ...promotion.rule.get]) {
    if (!line.catalogKey || line.catalogKey === ANY_PRODUCT) {
      return true;
    }

    referenced.add(normalizeKey(line.catalogKey));
  }

  for (const key of normalized) {
    if (referenced.has(key)) {
      return true;
    }
  }

  return referenced.size === 0;
}

function cloneQtyMap(cart: ComboCartLine[]) {
  const map = new Map<string, number>();

  for (const line of cart) {
    const key = normalizeKey(line.catalogKey);

    if (!key || line.quantity <= 0) {
      continue;
    }

    map.set(key, (map.get(key) || 0) + line.quantity);
  }

  return map;
}

function unitPriceForKey(cart: ComboCartLine[], catalogKey: string) {
  const key = normalizeKey(catalogKey);
  const line = cart.find((entry) => normalizeKey(entry.catalogKey) === key);

  return line ? parseMoneyValue(line.unitPrice) : 0;
}

function totalQty(map: Map<string, number>) {
  let total = 0;

  for (const qty of map.values()) {
    total += qty;
  }

  return total;
}

function satisfiesBuy(map: Map<string, number>, buy: ComboBuyLine[]) {
  const requiredByKey = new Map<string, number>();

  for (const line of buy) {
    if (!line.catalogKey || line.quantity <= 0) {
      return false;
    }

    const key = line.catalogKey === ANY_PRODUCT ? ANY_PRODUCT : normalizeKey(line.catalogKey);
    requiredByKey.set(key, (requiredByKey.get(key) || 0) + line.quantity);
  }

  for (const [key, quantity] of requiredByKey.entries()) {
    if (key === ANY_PRODUCT) {
      if (totalQty(map) < quantity) {
        return false;
      }

      continue;
    }

    if ((map.get(key) || 0) < quantity) {
      return false;
    }
  }

  return buy.length > 0;
}

function consumeFromMap(map: Map<string, number>, catalogKey: string, quantity: number) {
  let remaining = quantity;

  if (catalogKey === ANY_PRODUCT) {
    const keys = [...map.keys()].sort(
      (left, right) => (map.get(right) || 0) - (map.get(left) || 0),
    );

    for (const key of keys) {
      if (remaining <= 0) {
        break;
      }

      const available = map.get(key) || 0;
      const used = Math.min(available, remaining);
      const next = available - used;

      if (next > 0) {
        map.set(key, next);
      } else {
        map.delete(key);
      }

      remaining -= used;
    }

    return;
  }

  const key = normalizeKey(catalogKey);
  const available = map.get(key) || 0;
  const next = Math.max(available - quantity, 0);

  if (next > 0) {
    map.set(key, next);
  } else {
    map.delete(key);
  }
}

function consumeBuy(map: Map<string, number>, buy: ComboBuyLine[]) {
  for (const line of buy) {
    consumeFromMap(map, line.catalogKey, line.quantity);
  }
}

function availableUnits(remaining: Map<string, number>, catalogKey: string) {
  if (catalogKey === ANY_PRODUCT) {
    return totalQty(remaining);
  }

  return remaining.get(normalizeKey(catalogKey)) || 0;
}

function unitPriceForAnyFromRemaining(
  remaining: Map<string, number>,
  cart: ComboCartLine[],
) {
  for (const [key, qty] of remaining.entries()) {
    if (qty <= 0) {
      continue;
    }

    const price = unitPriceForKey(cart, key);

    if (price > 0) {
      return price;
    }
  }

  return 0;
}

function normalTotalForLine(input: {
  line: ComboBuyLine;
  cart: ComboCartLine[];
  remaining: Map<string, number>;
}) {
  const { line, cart, remaining } = input;
  const units = availableUnits(remaining, line.catalogKey);
  const appliedUnits = Math.min(safeCount(line.quantity, 1), units);

  if (appliedUnits <= 0) {
    return 0;
  }

  const unitPrice =
    line.catalogKey === ANY_PRODUCT
      ? unitPriceForAnyFromRemaining(remaining, cart)
      : unitPriceForKey(cart, line.catalogKey);

  return unitPrice * appliedUnits;
}

function discountForGetLine(input: {
  line: ComboGetLine;
  cart: ComboCartLine[];
  remaining: Map<string, number>;
}) {
  const { line, cart, remaining } = input;
  const limit = safeCount(line.quantity, 1);
  const units = availableUnits(remaining, line.catalogKey);

  if (units <= 0) {
    return { discount: 0, appliedUnits: 0 };
  }

  const appliedUnits = Math.min(limit, units);
  const unitPrice =
    line.catalogKey === ANY_PRODUCT
      ? unitPriceForAnyFromRemaining(remaining, cart)
      : unitPriceForKey(cart, line.catalogKey);

  if (unitPrice <= 0) {
    return { discount: 0, appliedUnits: 0 };
  }

  if (line.kind === "set_total") {
    const bundleTotal = parseMoneyValue(line.amount || "$0");
    const normal = unitPrice * appliedUnits;

    return {
      discount: Math.max(normal - bundleTotal, 0),
      appliedUnits,
    };
  }

  if (line.kind === "fixed_unit_price") {
    const target = parseMoneyValue(line.amount || "$0");

    return {
      discount: Math.max((unitPrice - target) * appliedUnits, 0),
      appliedUnits,
    };
  }

  const percent = safePercent(Number(line.percent));

  return {
    discount: unitPrice * appliedUnits * (percent / 100),
    appliedUnits,
  };
}

function applyGetBenefits(input: {
  cart: ComboCartLine[];
  remaining: Map<string, number>;
  get: ComboGetLine[];
}) {
  let discount = 0;

  for (const line of input.get) {
    const result = discountForGetLine({
      line,
      cart: input.cart,
      remaining: input.remaining,
    });

    discount += result.discount;

    if (result.appliedUnits > 0) {
      consumeFromMap(input.remaining, line.catalogKey, result.appliedUnits);
    }
  }

  return discount;
}

function evaluateBundleDiscount(input: {
  cart: ComboCartLine[];
  rule: ComboRule;
}) {
  const working = cloneQtyMap(input.cart);
  const bundlePrice = parseMoneyValue(input.rule.bundlePrice || "$0");
  let discount = 0;
  let guard = 0;

  while (satisfiesBuy(working, input.rule.buy)) {
    const normal = input.rule.buy.reduce(
      (sum, line) =>
        sum +
        normalTotalForLine({
          line,
          cart: input.cart,
          remaining: working,
        }),
      0,
    );

    discount += Math.max(normal - bundlePrice, 0);

    for (const line of input.rule.buy) {
      consumeFromMap(working, line.catalogKey, line.quantity);
    }

    guard += 1;

    if (!input.rule.repeat || guard > 99) {
      break;
    }
  }

  return discount;
}

export function evaluateComboDiscount(input: {
  cart: ComboCartLine[];
  rule: ComboRule;
}) {
  if (input.rule.mode === "bundle_price") {
    return evaluateBundleDiscount(input);
  }

  const working = cloneQtyMap(input.cart);
  let discount = 0;
  let guard = 0;

  while (satisfiesBuy(working, input.rule.buy)) {
    consumeBuy(working, input.rule.buy);
    discount += applyGetBenefits({
      cart: input.cart,
      remaining: working,
      get: input.rule.get,
    });
    guard += 1;

    if (!input.rule.repeat || guard > 99) {
      break;
    }
  }

  return discount;
}

export function quoteCombosForCart(input: {
  cart: ComboCartLine[];
  promotions?: PricingPromotionConfig[];
}) {
  const subtotal = input.cart.reduce(
    (sum, line) => sum + parseMoneyValue(line.unitPrice) * Math.max(line.quantity, 0),
    0,
  );

  if (subtotal <= 0) {
    return [] as PromotionQuote[];
  }

  const catalogKeys = input.cart.map((line) => line.catalogKey);

  return (input.promotions || [])
    .filter((promotion) => promotion.active)
    .filter((promotion) => promotionMatchesCartCatalog(promotion, catalogKeys))
    .map((promotion) => {
      const discount = evaluateComboDiscount({
        cart: input.cart,
        rule: promotion.rule,
      });

      if (discount <= 0) {
        return null;
      }

      return {
        promotionId: promotion.id,
        name: promotion.name,
        description: describeComboRuleShort(promotion.rule),
        subtotalBeforeDiscount: formatMoneyValue(subtotal),
        subtotalAfterDiscount: formatMoneyValue(Math.max(subtotal - discount, 0)),
        discountTotal: formatMoneyValue(discount),
      } satisfies PromotionQuote;
    })
    .filter((quote): quote is PromotionQuote => Boolean(quote))
    .sort(
      (left, right) =>
        parseMoneyValue(right.discountTotal) - parseMoneyValue(left.discountTotal),
    );
}

export function quotePromotionsForBox(input: {
  boxCount: number;
  boxUnitPrice: string;
  catalogKey?: string;
  promotions?: PricingPromotionConfig[];
}) {
  const boxCount = safeCount(input.boxCount, 1);
  const catalogKey = input.catalogKey?.trim() || "";

  if (!catalogKey) {
    return [] as PromotionQuote[];
  }

  return quoteCombosForCart({
    cart: [{ catalogKey, quantity: boxCount, unitPrice: input.boxUnitPrice }],
    promotions: input.promotions,
  });
}

export function choosePromotionQuote(input: {
  candidates: PromotionQuote[];
  selectedPromotionId?: string;
}) {
  if (input.candidates.length === 1) {
    return input.candidates[0] || null;
  }

  if (!input.selectedPromotionId) {
    return null;
  }

  return (
    input.candidates.find((quote) => quote.promotionId === input.selectedPromotionId) || null
  );
}

function isGetLineValid(line: ComboGetLine) {
  if (!line.catalogKey.trim() || line.quantity <= 0) {
    return false;
  }

  if (line.kind === "percent_off") {
    return safePercent(Number(line.percent)) > 0;
  }

  return parseMoneyValue(line.amount || "$0") > 0;
}

export function isPromotionRuleValid(rule: ComboRule) {
  const buyValid = rule.buy.some(
    (line) => line.catalogKey.trim() && line.quantity > 0,
  );

  if (rule.mode === "bundle_price") {
    return (
      buyValid &&
      isBundlePromotionEligible(rule) &&
      parseMoneyValue(rule.bundlePrice || "$0") > 0
    );
  }

  return buyValid && rule.get.some(isGetLineValid);
}
