"use client";

import { flushSync } from "react-dom";
import { useRef, useState } from "react";
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
  isCountryAlreadyConfigured,
  type CountryOption,
} from "@/lib/country-options";
import {
  addProductToCountry,
  removeProductFromCountry,
  type InventoryCatalogProduct,
} from "@/lib/pricing-catalog";
import type { PricingCountryConfig } from "@/lib/pricing/types";
import {
  assessCountryRemovalRisk,
  countryAddDuplicateMessage,
  countryAddErrorMessage,
  countryAddSuccessMessage,
  countryRemovalConfirmCopy,
  countryRemoveBlockedMessage,
  countryRemoveErrorMessage,
  countryRemoveSuccessMessage,
} from "@/lib/pricing/country-interaction";
import {
  createBlankPromotion,
  isPromotionRuleValid,
  normalizeComboRule,
  primaryCatalogKey,
  type PricingPromotionConfig,
} from "@/lib/pricing-promotions";
import type { useNotify } from "@/hooks/use-notify";
import type { PricingFlushPendingSave } from "@/hooks/use-pricing-backend";

export type CountryRemovalConfirmState = {
  countryName: string;
  title: string;
  message: string;
  confirmLabel: string;
};

type CountryRemovalSnapshot = {
  country: PricingCountryConfig;
  promotions: PricingPromotionConfig[];
  distributorPrices: Record<string, Record<string, PricingCountryConfig["boxes"]>>;
  selectedCountry: string | null;
};

type ConfigCountryPricingActionsParams = {
  notify: ReturnType<typeof useNotify>;
  countries: PricingCountryConfig[];
  setCountries: React.Dispatch<React.SetStateAction<PricingCountryConfig[]>>;
  setPromotions: React.Dispatch<React.SetStateAction<PricingPromotionConfig[]>>;
  distributorPrices: Record<string, Record<string, PricingCountryConfig["boxes"]>>;
  setDistributorPrices: React.Dispatch<
    React.SetStateAction<Record<string, Record<string, PricingCountryConfig["boxes"]>>>
  >;
  flushPendingSave: PricingFlushPendingSave;
  selectedCountry: string | null;
  setSelectedCountry: React.Dispatch<React.SetStateAction<string | null>>;
  setCountryQuery: React.Dispatch<React.SetStateAction<string>>;
  setPendingCountryToAdd: React.Dispatch<React.SetStateAction<CountryOption | null>>;
  setShowCountryPicker: React.Dispatch<React.SetStateAction<boolean>>;
  setCountryContextMenu: React.Dispatch<React.SetStateAction<CountryContextMenu | null>>;
  setCountryProductContextMenu: React.Dispatch<
    React.SetStateAction<CountryProductContextMenu | null>
  >;
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

function stripCountryFromDistributorPrices(
  current: Record<string, Record<string, PricingCountryConfig["boxes"]>>,
  countryName: string,
) {
  const next: typeof current = {};

  for (const [distributor, pricesByCountry] of Object.entries(current)) {
    next[distributor] = Object.fromEntries(
      Object.entries(pricesByCountry).filter(([country]) => country !== countryName),
    );
  }

  return next;
}

export function useConfigCountryPricingActions(params: ConfigCountryPricingActionsParams) {
  const {
    notify,
    countries,
    setCountries,
    setPromotions,
    distributorPrices,
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

  const [countryMutationBusy, setCountryMutationBusy] = useState<string | null>(null);
  const [countryRemovalConfirm, setCountryRemovalConfirm] =
    useState<CountryRemovalConfirmState | null>(null);
  const [countryRemovalConfirming, setCountryRemovalConfirming] = useState(false);
  const mutationLockRef = useRef(false);

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

  function captureRemovalSnapshot(countryName: string): CountryRemovalSnapshot | null {
    const country = countries.find((entry) => entry.name === countryName);

    if (!country) {
      return null;
    }

    return {
      country: structuredClone(country),
      promotions: promotions
        .filter((promotion) => promotion.countryName === countryName)
        .map((promotion) => structuredClone(promotion)),
      distributorPrices: structuredClone(distributorPrices),
      selectedCountry,
    };
  }

  function restoreRemovalSnapshot(snapshot: CountryRemovalSnapshot) {
    flushSync(() => {
      setCountries((current) => {
        if (current.some((entry) => entry.name === snapshot.country.name)) {
          return current;
        }

        return [...current, snapshot.country].sort(compareCountriesByCatalogOrder);
      });
      setPromotions((current) => {
        const without = current.filter(
          (promotion) => promotion.countryName !== snapshot.country.name,
        );
        return [...without, ...snapshot.promotions];
      });
      setDistributorPrices(snapshot.distributorPrices);
    });

    if (snapshot.selectedCountry === snapshot.country.name) {
      setSelectedCountry(snapshot.country.name);
    }
  }

  async function persistCountryRemoval(
    countryName: string,
    snapshot: CountryRemovalSnapshot,
    options: { offerUndo: boolean },
  ) {
    const nextCountries = countries.filter((country) => country.name !== countryName);
    const nextPromotions = promotions.filter(
      (promotion) => promotion.countryName !== countryName,
    );
    const nextDistributorPrices = stripCountryFromDistributorPrices(
      distributorPrices,
      countryName,
    );

    flushSync(() => {
      setCountries(nextCountries);
      setPromotions(nextPromotions);
      setDistributorPrices(nextDistributorPrices);
    });

    if (selectedCountry === countryName) {
      setSelectedCountry(null);
    }

    onSelectedCountryRemoved?.(countryName);
    setCountryContextMenu(null);

    const result = await flushPendingSave({
      countries: nextCountries,
      promotions: nextPromotions,
      distributorPrices: nextDistributorPrices,
    });

    if (!result.ok) {
      restoreRemovalSnapshot(snapshot);
      const blocked =
        /destinatarios vinculados|configuraciones relacionadas|PRICING_COUNTRY_IN_USE/i.test(
          result.error,
        );
      notify.error(
        blocked
          ? countryRemoveBlockedMessage(countryName)
          : result.error || countryRemoveErrorMessage(countryName),
      );
      return false;
    }

    if (options.offerUndo) {
      notify.success(countryRemoveSuccessMessage(countryName), {
        undo: {
          label: "Deshacer",
          onUndo: async () => {
            const restoredCountries = [...nextCountries, snapshot.country].sort(
              compareCountriesByCatalogOrder,
            );
            const restoredPromotions = [...nextPromotions, ...snapshot.promotions];
            restoreRemovalSnapshot(snapshot);
            const undoResult = await flushPendingSave({
              countries: restoredCountries,
              promotions: restoredPromotions,
              distributorPrices: snapshot.distributorPrices,
            });

            if (!undoResult.ok) {
              flushSync(() => {
                setCountries(nextCountries);
                setPromotions(nextPromotions);
                setDistributorPrices(nextDistributorPrices);
              });
              if (snapshot.selectedCountry === snapshot.country.name) {
                setSelectedCountry(null);
              }
              onSelectedCountryRemoved?.(countryName);
              notify.error(
                undoResult.error ||
                  `No se pudo restaurar ${countryName}. Inténtalo nuevamente.`,
              );
              return;
            }

            notify.success(`${countryName} se restauró correctamente.`);
          },
        },
      });
    } else {
      notify.success(countryRemoveSuccessMessage(countryName));
    }

    return true;
  }

  function requestRemoveCountry(countryName: string) {
    if (mutationLockRef.current || countryMutationBusy) {
      return;
    }

    const snapshot = captureRemovalSnapshot(countryName);

    if (!snapshot) {
      setCountryContextMenu(null);
      return;
    }

    const assessment = assessCountryRemovalRisk(
      snapshot.country,
      promotions,
      distributorPrices,
    );
    setCountryContextMenu(null);

    if (assessment.risk === "moderate") {
      const copy = countryRemovalConfirmCopy(countryName, assessment);
      setCountryRemovalConfirm({
        countryName,
        title: copy.title,
        message: copy.message,
        confirmLabel: copy.confirmLabel,
      });
      return;
    }

    void (async () => {
      mutationLockRef.current = true;
      setCountryMutationBusy(`remove:${countryName}`);

      try {
        await persistCountryRemoval(countryName, snapshot, { offerUndo: true });
      } finally {
        mutationLockRef.current = false;
        setCountryMutationBusy(null);
      }
    })();
  }

  function cancelCountryRemoval() {
    if (countryRemovalConfirming) {
      return;
    }

    setCountryRemovalConfirm(null);
  }

  async function confirmCountryRemoval() {
    if (!countryRemovalConfirm || mutationLockRef.current) {
      return;
    }

    const countryName = countryRemovalConfirm.countryName;
    const snapshot = captureRemovalSnapshot(countryName);

    if (!snapshot) {
      setCountryRemovalConfirm(null);
      return;
    }

    mutationLockRef.current = true;
    setCountryRemovalConfirming(true);
    setCountryMutationBusy(`remove:${countryName}`);

    try {
      const ok = await persistCountryRemoval(countryName, snapshot, {
        offerUndo: false,
      });

      if (ok) {
        setCountryRemovalConfirm(null);
      }
    } finally {
      mutationLockRef.current = false;
      setCountryRemovalConfirming(false);
      setCountryMutationBusy(null);
    }
  }

  async function addCountry(country: CountryOption) {
    if (mutationLockRef.current || countryMutationBusy) {
      return;
    }

    if (isCountryAlreadyConfigured(country, countries)) {
      notify.info(countryAddDuplicateMessage(country.name));
      setPendingCountryToAdd(null);
      return;
    }

    mutationLockRef.current = true;
    setCountryMutationBusy(`add:${country.code || country.name}`);

    const previousCountries = countries;
    const nextCountries = [
      ...countries,
      {
        code: country.code,
        name: country.name,
        deliveryTime: "",
        boxes: [],
      },
    ].sort(compareCountriesByCatalogOrder);

    flushSync(() => {
      setCountries(nextCountries);
    });
    setCountryQuery("");
    setPendingCountryToAdd(null);
    setShowCountryPicker(false);
    setSelectedCountry(country.name);

    try {
      const result = await flushPendingSave({ countries: nextCountries });

      if (!result.ok) {
        flushSync(() => {
          setCountries(previousCountries);
        });
        setSelectedCountry(null);
        setShowCountryPicker(true);
        setPendingCountryToAdd(country);
        notify.error(result.error || countryAddErrorMessage(country.name));
        return;
      }

      notify.success(countryAddSuccessMessage(country.name));
    } finally {
      mutationLockRef.current = false;
      setCountryMutationBusy(null);
    }
  }

  function closeCountryPicker() {
    if (countryMutationBusy?.startsWith("add:")) {
      return;
    }

    setCountryQuery("");
    setPendingCountryToAdd(null);
    setShowCountryPicker(false);
  }

  function openConfiguredCountry(countryName: string) {
    setCountryQuery("");
    setShowCountryPicker(false);
    setSelectedCountry(countryName);
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

    if (!countryName || mutationLockRef.current) {
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
    removeCountry: requestRemoveCountry,
    countryRemovalConfirm,
    countryRemovalConfirming,
    cancelCountryRemoval,
    confirmCountryRemoval,
    countryMutationBusy,
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
