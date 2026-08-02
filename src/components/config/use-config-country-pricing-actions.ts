"use client";

import { flushSync } from "react-dom";
import type { MouseEvent, PointerEvent as ReactPointerEvent } from "react";
import {
  localPromotionId,
  type CountryContextMenu,
  type CountryProductContextMenu,
  type CountryPriceTab,
  type PromotionEditorState,
} from "@/components/config/config-pricing-helpers";
import {
  compareCountriesByCatalogOrder,
  type CountryOption,
} from "@/lib/country-options";
import {
  addProductToCountry,
  removeProductFromCountry,
  type InventoryCatalogProduct,
} from "@/lib/pricing-catalog";
import type { PricingCountryConfig } from "@/lib/pricing/types";
import {
  createBlankPromotion,
  isPromotionRuleValid,
  normalizeComboRule,
  primaryCatalogKey,
  type PricingPromotionConfig,
} from "@/lib/pricing-promotions";
import type { useNotify } from "@/hooks/use-notify";

type ConfigCountryPricingActionsParams = {
  notify: ReturnType<typeof useNotify>;
  setCountries: React.Dispatch<React.SetStateAction<PricingCountryConfig[]>>;
  setPromotions: React.Dispatch<React.SetStateAction<PricingPromotionConfig[]>>;
  setDistributorPrices: React.Dispatch<
    React.SetStateAction<Record<string, Record<string, PricingCountryConfig["boxes"]>>>
  >;
  flushPendingSave: () => void | Promise<void>;
  selectedCountry: string | null;
  setSelectedCountry: React.Dispatch<React.SetStateAction<string | null>>;
  setCountryQuery: React.Dispatch<React.SetStateAction<string>>;
  setPendingCountryToAdd: React.Dispatch<React.SetStateAction<CountryOption | null>>;
  setShowCountryPicker: React.Dispatch<React.SetStateAction<boolean>>;
  setCountryContextMenu: React.Dispatch<React.SetStateAction<CountryContextMenu | null>>;
  setCountryProductContextMenu: React.Dispatch<React.SetStateAction<CountryProductContextMenu | null>>;
  setCountryProductPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setCountryPriceTab: React.Dispatch<React.SetStateAction<CountryPriceTab>>;
  setPromotionEditor: React.Dispatch<React.SetStateAction<PromotionEditorState | null>>;
  activeCountry: string | null;
  catalogProductsByKey: Map<string, InventoryCatalogProduct>;
  selectedCountryPromotions: PricingPromotionConfig[];
  promotionEditor: PromotionEditorState | null;
  promotions: PricingPromotionConfig[];
  onSelectedCountryRemoved?: (countryName: string) => void;
};

export function useConfigCountryPricingActions(params: ConfigCountryPricingActionsParams) {
  const {
    notify,
    setCountries,
    setPromotions,
    setDistributorPrices,
    flushPendingSave,
    selectedCountry,
    setSelectedCountry,
    setCountryQuery,
    setPendingCountryToAdd,
    setShowCountryPicker,
    setCountryContextMenu,
    setCountryProductContextMenu,
    setCountryProductPickerOpen,
    setCountryPriceTab,
    setPromotionEditor,
    activeCountry,
    catalogProductsByKey,
    selectedCountryPromotions,
    promotionEditor,
    promotions,
    onSelectedCountryRemoved,
  } = params;

  function openCountryContextMenu(
    event: MouseEvent<HTMLElement> | ReactPointerEvent<HTMLElement>,
    countryName: string,
  ) {
    event.preventDefault();
    event.stopPropagation();
    setCountryContextMenu({
      name: countryName,
      x: event.clientX,
      y: event.clientY,
    });
  }

  function countryContextMenuProps(countryName: string) {
    return {
      onContextMenu: (event: MouseEvent<HTMLElement>) =>
        openCountryContextMenu(event, countryName),
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
        if (event.button !== 2) {
          return;
        }

        openCountryContextMenu(event, countryName);
      },
    };
  }

  function openCountryProductContextMenu(
    event: MouseEvent<HTMLElement> | ReactPointerEvent<HTMLElement>,
    catalogKey: string,
    label: string,
  ) {
    event.preventDefault();
    event.stopPropagation();
    setCountryProductContextMenu({
      catalogKey,
      label,
      x: event.clientX,
      y: event.clientY,
    });
  }

  function countryProductContextMenuProps(catalogKey: string, label: string) {
    return {
      onContextMenu: (event: MouseEvent<HTMLElement>) =>
        openCountryProductContextMenu(event, catalogKey, label),
      onPointerDown: (event: ReactPointerEvent<HTMLElement>) => {
        if (event.button !== 2) {
          return;
        }

        openCountryProductContextMenu(event, catalogKey, label);
      },
    };
  }

  function removeCountry(countryName: string) {
    flushSync(() => {
      setCountries((current) => current.filter((country) => country.name !== countryName));
      setPromotions((current) =>
        current.filter((promotion) => promotion.countryName !== countryName),
      );
      setDistributorPrices((current) => {
        const next: typeof current = {};

        for (const [distributor, pricesByCountry] of Object.entries(current)) {
          next[distributor] = Object.fromEntries(
            Object.entries(pricesByCountry).filter(([country]) => country !== countryName),
          );
        }

        return next;
      });
    });

    if (selectedCountry === countryName) {
      setSelectedCountry(null);
    }

    onSelectedCountryRemoved?.(countryName);
    setCountryContextMenu(null);
    void flushPendingSave();
    notify.success(`${countryName} quitado`);
  }

  function openConfiguredCountry(countryName: string) {
    setCountryQuery("");
    setShowCountryPicker(false);
    setSelectedCountry(countryName);
  }

  function addCountry(country: CountryOption) {
    flushSync(() => {
      setCountries((current) =>
        [
          ...current,
          {
            code: country.code,
            name: country.name,
            deliveryTime: "",
            boxes: [],
          },
        ].sort(compareCountriesByCatalogOrder),
      );
    });
    setCountryQuery("");
    setPendingCountryToAdd(null);
    setShowCountryPicker(false);
    setSelectedCountry(country.name);
    void flushPendingSave();
    notify.success(`${country.name} agregado`);
  }

  function closeCountryPicker() {
    setCountryQuery("");
    setPendingCountryToAdd(null);
    setShowCountryPicker(false);
  }

  function updateCountryTime(time: string) {
    if (!selectedCountry) {
      return;
    }

    setCountries((current) =>
      current.map((country) =>
        country.name === selectedCountry ? { ...country, deliveryTime: time } : country,
      ),
    );
  }

  function updateCountryBoxPrice(catalogKey: string, rawPrice: string) {
    if (!selectedCountry) {
      return;
    }

    const digits = rawPrice.replace(/[^\d.]/g, "");
    const price = digits ? `$${digits}` : "$0";

    setCountries((current) =>
      current.map((country) =>
        country.name === selectedCountry
          ? {
              ...country,
              boxes: country.boxes.map((box) =>
                (box.catalogKey || box.size) === catalogKey ? { ...box, price } : box,
              ),
            }
          : country,
      ),
    );
  }

  function updateCountryBoxCost(catalogKey: string, rawCost: string) {
    if (!selectedCountry) {
      return;
    }

    const digits = rawCost.replace(/[^\d.]/g, "");
    const cost = digits ? `$${digits}` : "$0";

    setCountries((current) =>
      current.map((country) =>
        country.name === selectedCountry
          ? {
              ...country,
              boxes: country.boxes.map((box) =>
                (box.catalogKey || box.size) === catalogKey ? { ...box, cost } : box,
              ),
            }
          : country,
      ),
    );
  }

  function addCountryProduct(product: InventoryCatalogProduct) {
    const countryName = selectedCountry ?? activeCountry;

    if (!countryName) {
      return;
    }

    flushSync(() => {
      setCountries((current) => addProductToCountry(current, countryName, product));
    });
    void flushPendingSave();
    setCountryProductPickerOpen(true);
    notify.success(`${product.label} agregado a ${countryName}`);
  }

  function removeCountryProduct(catalogKey: string) {
    const countryName = selectedCountry ?? activeCountry;

    if (!countryName) {
      return;
    }

    const label = catalogProductsByKey.get(catalogKey)?.label ?? catalogKey;

    setCountries((current) =>
      removeProductFromCountry(current, countryName, catalogKey),
    );
    setPromotions((current) =>
      current.filter((promotion) => {
        if (promotion.countryName !== countryName) {
          return true;
        }

        return ![...promotion.rule.buy, ...promotion.rule.get].some(
          (line) => line.catalogKey === catalogKey,
        );
      }),
    );
    setCountryProductContextMenu(null);
    void flushPendingSave();
    notify.success(`${label} quitado de ${countryName}`);
  }

  function openNewPromotion() {
    if (!activeCountry) {
      return;
    }

    setCountryPriceTab("promotions");
    setPromotionEditor({
      mode: "new",
      draft: createBlankPromotion({
        id: localPromotionId(),
        countryName: activeCountry,
        sortOrder:
          selectedCountryPromotions.reduce(
            (max, promotion) => Math.max(max, promotion.sortOrder),
            -1,
          ) + 1,
      }),
    });
  }

  function openEditPromotion(promotion: PricingPromotionConfig) {
    setCountryPriceTab("promotions");
    setPromotionEditor({
      mode: "edit",
      draft: {
        ...promotion,
        rule: normalizeComboRule(promotion.rule),
      },
    });
  }

  function patchPromotionDraft(patch: Partial<PricingPromotionConfig>) {
    setPromotionEditor((current) =>
      current
        ? {
            ...current,
            draft: {
              ...current.draft,
              ...patch,
              catalogKey: patch.rule
                ? primaryCatalogKey(patch.rule)
                : current.draft.catalogKey,
            },
          }
        : current,
    );
  }

  function savePromotionDraft() {
    if (!promotionEditor || !isPromotionRuleValid(promotionEditor.draft.rule)) {
      return;
    }

    const draft = {
      ...promotionEditor.draft,
      name: promotionEditor.draft.name.trim() || "Combo",
      countryName: activeCountry || promotionEditor.draft.countryName,
      catalogKey: primaryCatalogKey(promotionEditor.draft.rule),
      active: promotionEditor.mode === "new" ? true : promotionEditor.draft.active,
    };

    setPromotions((current) => {
      if (promotionEditor.mode === "edit") {
        return current.map((promotion) =>
          promotion.id === draft.id ? draft : promotion,
        );
      }

      return [...current, draft];
    });
    setPromotionEditor(null);
  }

  function togglePromotionActive(promotionId: string) {
    setPromotions((current) =>
      current.map((promotion) =>
        promotion.id === promotionId
          ? { ...promotion, active: !promotion.active }
          : promotion,
      ),
    );
  }

  function reorderCountryPromotions(orderedIds: string[]) {
    if (!activeCountry) {
      return;
    }

    const orderById = new Map(orderedIds.map((id, index) => [id, index]));

    setPromotions((current) =>
      current.map((promotion) => {
        if (promotion.countryName !== activeCountry) {
          return promotion;
        }

        const nextOrder = orderById.get(promotion.id);

        if (nextOrder === undefined) {
          return promotion;
        }

        return { ...promotion, sortOrder: nextOrder };
      }),
    );
  }

  function removePromotion(promotionId: string) {
    const promotion = promotions.find((entry) => entry.id === promotionId);

    if (
      !window.confirm(
        `¿Eliminar la promoción "${promotion?.name.trim() || "sin nombre"}"?`,
      )
    ) {
      return;
    }

    setPromotions((current) =>
      current.filter((entry) => entry.id !== promotionId),
    );

    if (promotionEditor?.draft.id === promotionId) {
      setPromotionEditor(null);
    }
  }

  return {
    countryContextMenuProps,
    countryProductContextMenuProps,
    removeCountry,
    openConfiguredCountry,
    addCountry,
    closeCountryPicker,
    updateCountryTime,
    updateCountryBoxPrice,
    updateCountryBoxCost,
    addCountryProduct,
    removeCountryProduct,
    openNewPromotion,
    openEditPromotion,
    patchPromotionDraft,
    savePromotionDraft,
    togglePromotionActive,
    reorderCountryPromotions,
    removePromotion,
  };
}
