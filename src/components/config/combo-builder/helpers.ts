import {
  ANY_PRODUCT,
  createComboLineId,
  isBundlePromotionEligible,
  type ComboBuyLine,
  type ComboGetLine,
  type ComboRule,
} from "@/lib/combo-rules";
import { formatMoneyValue, parseMoneyValue } from "@/lib/logistics-fees";
import type {
  ComboBuilderProduct,
  DiscountStyle,
  RuleIntent,
} from "@/components/config/combo-builder/types";

export function productPickerOptions(
  products: ComboBuilderProduct[],
  usedKeys: string[],
  currentKey: string,
  { includeAny = true }: { includeAny?: boolean } = {},
) {
  const used = new Set(
    usedKeys
      .map((key) => key.trim())
      .filter((key) => key && key !== currentKey.trim()),
  );

  const options = includeAny
    ? [
        {
          value: ANY_PRODUCT,
          label: "Cualquier producto",
          searchText: "cualquier tamaño",
          disabled: used.has(ANY_PRODUCT),
        },
      ]
    : [];

  return [
    ...options,
    ...products.map((product) => ({
      value: product.catalogKey,
      label: product.label,
      searchText: product.price,
      disabled: used.has(product.catalogKey),
    })),
  ];
}

export function productPrice(products: ComboBuilderProduct[], catalogKey: string) {
  return products.find((product) => product.catalogKey === catalogKey)?.price || "$0";
}

export function discountStyleFromLine(line: ComboGetLine | undefined): DiscountStyle {
  if (!line) {
    return "percent";
  }

  if (line.kind === "set_total") {
    return "set_total";
  }

  if (line.kind === "fixed_unit_price") {
    return "unit_price";
  }

  return "percent";
}

function sumBuyLines(buy: ComboBuyLine[], products: ComboBuilderProduct[]) {
  return buy
    .filter((line) => line.catalogKey.trim())
    .reduce(
      (sum, line) =>
        sum + parseMoneyValue(productPrice(products, line.catalogKey)) * line.quantity,
      0,
    );
}

export function inferIntent(rule: ComboRule): RuleIntent | null {
  if (!rule.buy.some((line) => line.catalogKey.trim())) {
    return null;
  }

  if (rule.mode === "bundle_price") {
    return isBundlePromotionEligible(rule) ? "bundle_price" : null;
  }

  if (!rule.get.length) {
    return null;
  }

  const line = rule.get[0];

  if (line.kind === "percent_off" && (line.percent ?? 0) >= 100) {
    return "free_gift";
  }

  return "discount";
}

export function buildDiscountRule(
  buy: ComboBuyLine[],
  catalogKey: string,
  style: DiscountStyle = "percent",
): ComboRule {
  const getLine: ComboGetLine = {
    id: createComboLineId(),
    catalogKey,
    quantity: 1,
    kind: "percent_off",
    percent: 20,
    target: "same_purchase",
  };

  if (style === "unit_price") {
    getLine.kind = "fixed_unit_price";
    getLine.amount = "";
    delete getLine.percent;
  } else if (style === "set_total") {
    getLine.kind = "set_total";
    getLine.amount = "";
    delete getLine.percent;
  }

  return {
    mode: "reward",
    buy,
    get: [getLine],
    repeat: true,
  };
}

export function buildFreeGiftRule(buy: ComboBuyLine[], giftKey: string): ComboRule {
  return {
    mode: "reward",
    buy,
    get: [
      {
        id: createComboLineId(),
        catalogKey: giftKey,
        quantity: 1,
        kind: "percent_off",
        percent: 100,
        target: "same_purchase",
      },
    ],
    repeat: true,
  };
}

export function uniqueBuyProducts(
  buy: ComboBuyLine[],
  productLabels: Record<string, string>,
) {
  const seen = new Set<string>();

  return buy
    .filter((line) => line.catalogKey.trim())
    .flatMap((line) => {
      if (seen.has(line.catalogKey)) {
        return [];
      }

      seen.add(line.catalogKey);

      return [
        {
          catalogKey: line.catalogKey,
          label: productLabels[line.catalogKey] || line.catalogKey,
        },
      ];
    });
}

export function syncSingleProductDiscount(
  rule: ComboRule,
  productLabels: Record<string, string>,
): ComboRule {
  const unique = uniqueBuyProducts(rule.buy, productLabels);

  if (unique.length !== 1 || !rule.get.length) {
    return rule;
  }

  const primaryGet = rule.get[0];
  const isFreeGift =
    primaryGet.kind === "percent_off" && (primaryGet.percent ?? 0) >= 100;

  if (isFreeGift) {
    return rule;
  }

  const catalogKey = unique[0].catalogKey;

  if (primaryGet.catalogKey === catalogKey) {
    return rule;
  }

  return {
    ...rule,
    get: rule.get.map((line, index) =>
      index === 0 ? { ...line, catalogKey } : line,
    ),
  };
}

export function buildBundleRule(
  buy: ComboBuyLine[],
  products: ComboBuilderProduct[],
): ComboRule {
  return {
    mode: "bundle_price",
    buy,
    get: [],
    bundlePrice: formatMoneyValue(sumBuyLines(buy, products)),
    repeat: true,
  };
}

function isDiscountGetLine(line: ComboGetLine | undefined) {
  if (!line) {
    return false;
  }

  return !(line.kind === "percent_off" && (line.percent ?? 0) >= 100);
}

export function pruneDiscountTargetForBuy(
  rule: ComboRule,
  labels: Record<string, string>,
  targetMode: "buy" | "other",
): ComboRule {
  if (rule.mode === "bundle_price" || !rule.get.length) {
    return rule;
  }

  const primaryGet = rule.get[0];

  if (!isDiscountGetLine(primaryGet)) {
    return rule;
  }

  const uniqueBuy = uniqueBuyProducts(rule.buy, labels);

  if (uniqueBuy.length <= 1 || targetMode === "other") {
    return rule;
  }

  const buyKeys = new Set(uniqueBuy.map((product) => product.catalogKey));

  if (primaryGet.catalogKey && !buyKeys.has(primaryGet.catalogKey)) {
    return {
      ...rule,
      get: rule.get.map((line, index) =>
        index === 0 ? { ...line, catalogKey: "" } : line,
      ),
    };
  }

  return rule;
}

export function buildDiscountHelperText(input: {
  target: "same_purchase" | "next_unit";
  discountStyle: DiscountStyle;
  fixedPriceNeedsUnitTotalChoice: boolean;
  buyConditionQty: number;
  rewardQty: number;
  singleBuyDiscount: boolean;
}) {
  const parts: string[] = [];

  if (input.target === "next_unit") {
    if (input.singleBuyDiscount && input.buyConditionQty > 0) {
      const condition =
        input.buyConditionQty === 1
          ? "1 unidad que cumple la condición"
          : `${input.buyConditionQty} unidades que cumplen la condición`;
      const reward =
        input.rewardQty === 1
          ? "la siguiente unidad"
          : `las siguientes ${input.rewardQty} unidades`;
      const minimum = input.buyConditionQty + input.rewardQty;

      parts.push(
        `Compra ${condition}; el descuento aplica a ${reward}, no a esas. Mínimo ${minimum} unidades en el carrito.`,
      );
    } else {
      parts.push(
        "El descuento aplica a la unidad bonificada siguiente, no a las que cumplen la condición de compra.",
      );
    }
  }

  if (input.discountStyle !== "percent" && input.fixedPriceNeedsUnitTotalChoice) {
    if (input.discountStyle === "unit_price") {
      parts.push("Precio c/u: cada unidad bonificada se cobra a ese monto.");
    } else {
      parts.push(
        input.target === "next_unit"
          ? "Precio total: el monto es solo por las unidades bonificadas, sin las de condición."
          : "Precio total: el monto cubre todas las unidades con descuento en esta compra.",
      );
    }
  }

  return parts.length ? parts.join(" ") : null;
}
