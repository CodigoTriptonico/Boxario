import {
  ANY_PRODUCT,
  normalizeKey,
  safePercent,
  type ComboBuyLine,
  type ComboGetLine,
  type ComboRule,
} from "@/lib/combo-rules/contracts";

function productLabel(catalogKey: string, labels?: Record<string, string>) {
  if (catalogKey === ANY_PRODUCT) {
    return "cualquier producto";
  }

  return labels?.[catalogKey] || catalogKey;
}

function describeBuyLine(line: ComboBuyLine, labels?: Record<string, string>) {
  return `${line.quantity}× ${productLabel(line.catalogKey, labels)}`;
}

function repeatSuffix(repeat: boolean) {
  return repeat ? " · varias veces" : " · una vez por venta";
}

function buyIncludesProduct(buy: ComboBuyLine[], catalogKey: string) {
  const key = normalizeKey(catalogKey);

  return buy.some((line) => normalizeKey(line.catalogKey) === key);
}

function uniqueBuyProductCount(buy: ComboBuyLine[]) {
  return new Set(buy.map((line) => normalizeKey(line.catalogKey))).size;
}

export function isBundlePromotionEligible(rule: Pick<ComboRule, "buy">) {
  return uniqueBuyProductCount(rule.buy) >= 2;
}

function describeRewardBenefit(
  line: ComboGetLine,
  buy: ComboBuyLine[],
  labels?: Record<string, string>,
) {
  const qty = line.quantity;
  const label = productLabel(line.catalogKey, labels);
  const sameProduct = buyIncludesProduct(buy, line.catalogKey);
  const singleBuyProduct = uniqueBuyProductCount(buy) === 1;
  const nextUnit = line.target === "next_unit";
  const nextScope = nextUnit ? " (siguiente unidad)" : "";

  if (line.kind === "set_total") {
    return `${qty}× ${label} por ${line.amount || "$0"}${nextScope}`;
  }

  if (line.kind === "fixed_unit_price") {
    if (sameProduct && qty === 1 && !nextUnit && singleBuyProduct) {
      return `precio ${line.amount || "$0"} en 1 unidad`;
    }

    return `${qty}× ${label} a ${line.amount || "$0"}${nextScope}`;
  }

  const percent = safePercent(Number(line.percent));

  if (percent >= 100) {
    if (sameProduct && singleBuyProduct) {
      return qty === 1 ? "1 gratis" : `${qty} gratis`;
    }

    if (sameProduct) {
      return qty === 1 ? `1× ${label} gratis` : `${qty}× ${label} gratis`;
    }

    return `regalo ${qty}× ${label}${nextScope}`;
  }

  if (sameProduct && qty === 1 && !nextUnit) {
    if (singleBuyProduct) {
      return `${percent}% en 1 unidad`;
    }

    return `${percent}% en 1× ${label}`;
  }

  return `${percent}% en ${qty}× ${label}${nextScope}`;
}

export function describeComboRule(rule: ComboRule, labels?: Record<string, string>) {
  const buyLines = rule.buy.filter((line) => line.catalogKey && line.quantity > 0);

  if (rule.mode === "bundle_price") {
    if (!buyLines.length) {
      return "Regla incompleta";
    }

    const buy = buyLines.map((line) => describeBuyLine(line, labels));

    return `${buy.join(" + ")} por ${rule.bundlePrice || "$0"}${repeatSuffix(rule.repeat)}`;
  }

  const getLines = rule.get.filter((line) => line.catalogKey && line.quantity > 0);

  if (!buyLines.length || !getLines.length) {
    return "Regla incompleta";
  }

  const buy = buyLines.map((line) => describeBuyLine(line, labels)).join(" + ");
  const benefits = getLines
    .map((line) => describeRewardBenefit(line, buyLines, labels))
    .join(" · ");

  return `Compra ${buy} → ${benefits}${repeatSuffix(rule.repeat)}`;
}

export function describeComboRuleShort(rule: ComboRule, labels?: Record<string, string>) {
  const text = describeComboRule(rule, labels);

  return text.length > 72 ? `${text.slice(0, 69)}…` : text;
}
