"use client";

import { useEffect, useMemo, useState } from "react";
import {
  coerceSingleProductBundleRule,
  createComboLineId,
  ensureComboRuleLineIds,
  isBundlePromotionEligible,
  type ComboBuyLine,
  type ComboGetLine,
  type ComboRule,
} from "@/lib/combo-rules";
import { parseMoneyValue } from "@/lib/logistics-fees";
import {
  buildBundleRule,
  buildDiscountHelperText,
  buildDiscountRule,
  buildFreeGiftRule,
  discountStyleFromLine,
  inferIntent,
  productPrice,
  pruneDiscountTargetForBuy,
  syncSingleProductDiscount,
  uniqueBuyProducts,
} from "@/components/config/combo-builder/helpers";
import type {
  ComboBuilderProps,
  DiscountStyle,
  RuleIntent,
} from "@/components/config/combo-builder/types";

export function useComboBuilder({ rule, onChange, products }: ComboBuilderProps) {
  const labels = useMemo(
    () => Object.fromEntries(products.map((product) => [product.catalogKey, product.label])),
    [products],
  );

  const inferredIntent = useMemo(() => inferIntent(rule), [rule]);
  const [pickedIntent, setPickedIntent] = useState<RuleIntent | null>(null);
  const [discountTargetMode, setDiscountTargetMode] = useState<"buy" | "other">("buy");
  const bundleEligible = isBundlePromotionEligible(rule);
  const intent = useMemo(() => {
    const candidate = pickedIntent ?? inferredIntent;

    if (candidate === "bundle_price" && !bundleEligible) {
      return inferredIntent && inferredIntent !== "bundle_price" ? inferredIntent : "discount";
    }

    return candidate;
  }, [pickedIntent, inferredIntent, bundleEligible]);
  const primaryGetLine = rule.get[0];

  const buyProducts = useMemo(
    () => uniqueBuyProducts(rule.buy, labels),
    [rule.buy, labels],
  );
  const singleBuyDiscount = buyProducts.length === 1;
  const singleBuyLineQty = useMemo(() => {
    if (!singleBuyDiscount) {
      return 0;
    }

    const catalogKey = buyProducts[0].catalogKey;

    return rule.buy
      .filter((line) => line.catalogKey === catalogKey)
      .reduce((sum, line) => sum + line.quantity, 0);
  }, [singleBuyDiscount, buyProducts, rule.buy]);
  const fixedPriceNeedsUnitTotalChoice = !singleBuyDiscount || singleBuyLineQty > 1;
  const discountStyleOptions = useMemo(() => {
    const options: { value: DiscountStyle; label: string }[] = [
      { value: "percent", label: "%" },
    ];

    if (fixedPriceNeedsUnitTotalChoice) {
      options.push(
        { value: "unit_price", label: "Precio c/u" },
        { value: "set_total", label: "Precio total" },
      );
    } else {
      options.push({ value: "set_total", label: "Precio" });
    }

    return options;
  }, [fixedPriceNeedsUnitTotalChoice]);
  const buyConditionQty = useMemo(
    () =>
      rule.buy
        .filter((line) => line.catalogKey.trim())
        .reduce((sum, line) => sum + line.quantity, 0),
    [rule.buy],
  );
  const buyFromDiscountOptions = useMemo(
    () =>
      buyProducts.map((product) => ({
        value: product.catalogKey,
        label: product.label,
        searchText: "compra",
      })),
    [buyProducts],
  );
  const catalogDiscountOptions = useMemo(() => {
    const buyKeys = new Set(buyProducts.map((product) => product.catalogKey));

    return products
      .filter((product) => !buyKeys.has(product.catalogKey))
      .map((product) => ({
        value: product.catalogKey,
        label: product.label,
        searchText: product.price,
      }));
  }, [buyProducts, products]);

  const isBundle = rule.mode === "bundle_price";
  const hasBuyLines = rule.buy.length > 0;
  const hasBuyProducts = rule.buy.some((line) => line.catalogKey.trim());
  const discountStyle = discountStyleFromLine(primaryGetLine);
  const discountHelperText = useMemo(() => {
    if (intent !== "discount" || !primaryGetLine) {
      return null;
    }

    return buildDiscountHelperText({
      target: primaryGetLine.target,
      discountStyle,
      fixedPriceNeedsUnitTotalChoice,
      buyConditionQty,
      rewardQty: Math.max(primaryGetLine.quantity, 1),
      singleBuyDiscount,
    });
  }, [
    intent,
    primaryGetLine,
    discountStyle,
    fixedPriceNeedsUnitTotalChoice,
    buyConditionQty,
    singleBuyDiscount,
  ]);

  const bundleBreakdown = useMemo(() => {
    if (!isBundle) {
      return null;
    }

    const lines = rule.buy
      .filter((line) => line.catalogKey.trim())
      .map((line) => {
        const unitPrice = parseMoneyValue(productPrice(products, line.catalogKey));

        return {
          id: line.id,
          label: labels[line.catalogKey] || line.catalogKey,
          quantity: line.quantity,
          unitPrice,
          subtotal: unitPrice * line.quantity,
        };
      });

    const normalTotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
    const promoTotal = parseMoneyValue(rule.bundlePrice || "$0");
    const savings = Math.max(normalTotal - promoTotal, 0);

    return { lines, normalTotal, promoTotal, savings };
  }, [isBundle, rule.buy, rule.bundlePrice, products, labels]);

  const discountBreakdown = useMemo(() => {
    if (intent !== "discount" || !primaryGetLine?.catalogKey.trim()) {
      return null;
    }

    const rewardQty = Math.max(primaryGetLine.quantity, 1);
    const rewardUnitPrice = parseMoneyValue(productPrice(products, primaryGetLine.catalogKey));
    const rewardLabel = labels[primaryGetLine.catalogKey] || primaryGetLine.catalogKey;
    const rewardNormal = rewardUnitPrice * rewardQty;
    const isNextUnit = primaryGetLine.target === "next_unit";

    let rewardPromo = rewardNormal;

    if (discountStyle === "percent") {
      const percent = Math.min(Math.max(primaryGetLine.percent ?? 0, 0), 100);
      rewardPromo = rewardNormal * (1 - percent / 100);
    } else if (discountStyle === "unit_price") {
      rewardPromo = parseMoneyValue(primaryGetLine.amount || "$0") * rewardQty;
    } else {
      rewardPromo = parseMoneyValue(primaryGetLine.amount || "$0");
    }

    const rewardSavings = Math.max(rewardNormal - rewardPromo, 0);
    const rewardSavingsPercent =
      rewardNormal > 0 ? Math.round((rewardSavings / rewardNormal) * 100) : 0;

    if (isNextUnit) {
      const buyRows = rule.buy
        .filter((line) => line.catalogKey.trim())
        .map((line) => {
          const unitPrice = parseMoneyValue(productPrice(products, line.catalogKey));

          return {
            id: line.id,
            label: labels[line.catalogKey] || line.catalogKey,
            quantity: line.quantity,
            unitPrice,
            subtotal: unitPrice * line.quantity,
          };
        });

      const buyTotal = buyRows.reduce((sum, row) => sum + row.subtotal, 0);

      return {
        kind: "next_unit" as const,
        buyRows,
        buyTotal,
        rewardQty,
        rewardLabel,
        rewardUnitPrice,
        rewardNormal,
        rewardPromo,
        normalTotal: buyTotal + rewardNormal,
        promoTotal: buyTotal + rewardPromo,
        savings: rewardSavings,
        savingsPercent: rewardSavingsPercent,
      };
    }

    return {
      kind: "same_purchase" as const,
      label: rewardLabel,
      qty: rewardQty,
      unitPrice: rewardUnitPrice,
      normalTotal: rewardNormal,
      promoTotal: rewardPromo,
      savings: rewardSavings,
      savingsPercent: rewardSavingsPercent,
    };
  }, [intent, primaryGetLine, discountStyle, products, labels, rule.buy]);

  useEffect(() => {
    if (rule.mode !== "bundle_price" || isBundlePromotionEligible(rule)) {
      return;
    }

    const coerced = coerceSingleProductBundleRule(rule);
    queueMicrotask(() => {
      setPickedIntent("discount");
      onChange(ensureComboRuleLineIds(syncSingleProductDiscount(coerced, labels)));
    });
  }, [rule, labels, onChange]);

  function commit(nextRule: ComboRule) {
    let coerced = coerceSingleProductBundleRule(nextRule);
    coerced = pruneDiscountTargetForBuy(coerced, labels, discountTargetMode);

    if (nextRule.mode === "bundle_price" && coerced.mode !== "bundle_price") {
      setPickedIntent("discount");
    }

    onChange(ensureComboRuleLineIds(syncSingleProductDiscount(coerced, labels)));
  }

  function resetIntent() {
    setPickedIntent(null);
  }

  function selectIntent(nextIntent: RuleIntent) {
    setPickedIntent(nextIntent);
    const buy = rule.buy.filter((line) => line.catalogKey.trim());

    if (nextIntent === "discount") {
      const unique = uniqueBuyProducts(buy, labels);
      const catalogKey = unique.length === 1 ? unique[0].catalogKey : "";
      setDiscountTargetMode("buy");
      commit(buildDiscountRule(buy, catalogKey));
      return;
    }

    if (nextIntent === "free_gift") {
      commit(buildFreeGiftRule(buy, ""));
      return;
    }

    if (!isBundlePromotionEligible({ buy })) {
      return;
    }

    commit(buildBundleRule(buy, products));
  }

  function addFirstBuyLine() {
    resetIntent();
    commit({
      ...rule,
      mode: "reward",
      buy: [{ id: createComboLineId(), catalogKey: "", quantity: 1 }],
      get: [],
      bundlePrice: undefined,
    });
  }

  function updateBuyLine(lineId: string, patch: Partial<ComboBuyLine>) {
    commit({
      ...rule,
      buy: rule.buy.map((line) => (line.id === lineId ? { ...line, ...patch } : line)),
    });
  }

  function addBuyLine() {
    commit({
      ...rule,
      buy: [
        ...rule.buy,
        {
          id: createComboLineId(),
          catalogKey: "",
          quantity: 1,
        },
      ],
    });
  }

  function removeBuyLine(lineId: string) {
    const buy = rule.buy.filter((line) => line.id !== lineId);

    if (!buy.length) {
      resetIntent();
      commit({ ...rule, buy: [], get: [], mode: "reward", bundlePrice: undefined });
      return;
    }

    commit({ ...rule, buy });
  }

  function updateGetLine(lineId: string, patch: Partial<ComboGetLine>) {
    commit({
      ...rule,
      get: rule.get.map((line) => (line.id === lineId ? { ...line, ...patch } : line)),
    });
  }

  function setDiscountStyle(style: DiscountStyle) {
    if (!primaryGetLine) {
      return;
    }

    if (style === "percent") {
      updateGetLine(primaryGetLine.id, {
        kind: "percent_off",
        percent: primaryGetLine.percent && primaryGetLine.percent < 100 ? primaryGetLine.percent : 20,
        amount: "",
      });
      return;
    }

    if (style === "unit_price") {
      updateGetLine(primaryGetLine.id, {
        kind: "fixed_unit_price",
        amount: primaryGetLine.amount || "",
        percent: undefined,
      });
      return;
    }

    updateGetLine(primaryGetLine.id, {
      kind: "set_total",
      amount: primaryGetLine.amount || "",
      percent: undefined,
    });
  }

  function setGiftFromBuy(catalogKey: string) {
    if (!primaryGetLine) {
      return;
    }

    updateGetLine(primaryGetLine.id, {
      catalogKey,
      kind: "percent_off",
      percent: 100,
      amount: "",
      target: "same_purchase",
    });
  }

  function addExtraGiftLine() {
    commit({
      ...rule,
      get: [
        ...rule.get,
        {
          id: createComboLineId(),
          catalogKey: "",
          quantity: 1,
          kind: "percent_off",
          percent: 100,
          target: "same_purchase",
        },
      ],
    });
  }

  function removeGetLine(lineId: string) {
    const get = rule.get.filter((line) => line.id !== lineId);

    if (!get.length) {
      resetIntent();
      commit({ ...rule, get: [], mode: "reward" });
      return;
    }

    commit({ ...rule, get });
  }

  return {
    labels,
    intent,
    primaryGetLine,
    buyProducts,
    singleBuyDiscount,
    fixedPriceNeedsUnitTotalChoice,
    discountStyleOptions,
    buyFromDiscountOptions,
    catalogDiscountOptions,
    discountTargetMode,
    setDiscountTargetMode,
    discountStyle,
    discountHelperText,
    bundleBreakdown,
    discountBreakdown,
    hasBuyLines,
    hasBuyProducts,
    bundleEligible,
    buyGiftShortcuts: buyProducts,
    commit,
    selectIntent,
    addFirstBuyLine,
    updateBuyLine,
    addBuyLine,
    removeBuyLine,
    updateGetLine,
    setDiscountStyle,
    setGiftFromBuy,
    addExtraGiftLine,
    removeGetLine,
  };
}
