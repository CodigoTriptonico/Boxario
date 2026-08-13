"use client";

import { useMemo, useRef, useState } from "react";
import { Package2, Tags, Clock } from "lucide-react";
import {
  normalizeConfigText,
  productKeyFromBox,
  type CountryPriceTab,
  type CountryContextMenu,
  type CountryProductContextMenu,
  type PromotionEditorState,
} from "@/components/config/config-pricing-helpers";
import type { ComboBuilderProduct } from "@/components/config/combo-builder";
import type { AppTabDefinition } from "@/components/app-tabs";
import {
  COUNTRY_OPTIONS,
  compareCountriesByCatalogOrder,
  configPricesCountryHref,
  findCountryByNormalizedName,
  isCountryAlreadyConfigured,
  type CountryOption,
} from "@/lib/country-options";
import { inventarioHrefWithReturn } from "@/lib/inventario-return";
import { countryCatalogPickerOptions } from "@/components/country-picker-options";
import {
  catalogCategoryOrder,
  groupCountryCatalogBoxes,
  type InventoryCatalogProduct,
} from "@/lib/pricing-catalog";
import type { PricingCountryConfig } from "@/lib/pricing/types";
import type { PricingPromotionConfig } from "@/lib/pricing-promotions";
import { parseMoneyValue } from "@/lib/logistics-fees";
import type { PricingFlushPendingSave } from "@/hooks/use-pricing-backend";
import type { useNotify } from "@/hooks/use-notify";
import { useConfigCountryPricingActions } from "@/components/config/use-config-country-pricing-actions";
import { useConfigCountryPricingEffects } from "@/components/config/use-config-country-pricing-effects";

type PricingBackend = {
  countries: PricingCountryConfig[];
  setCountries: React.Dispatch<React.SetStateAction<PricingCountryConfig[]>>;
  promotions: PricingPromotionConfig[];
  setPromotions: React.Dispatch<React.SetStateAction<PricingPromotionConfig[]>>;
  catalogProducts: InventoryCatalogProduct[];
  distributorPrices: Record<string, Record<string, PricingCountryConfig["boxes"]>>;
  setDistributorPrices: React.Dispatch<
    React.SetStateAction<Record<string, Record<string, PricingCountryConfig["boxes"]>>>
  >;
  flushPendingSave: PricingFlushPendingSave;
  pricingLoaded: boolean;
  pricingError: string | null;
};

type UseConfigCountryPricingParams = {
  section: string;
  countryFromUrl: string | null;
  notify: ReturnType<typeof useNotify>;
  pricing: PricingBackend;
  onSelectedCountryRemoved?: (countryName: string) => void;
};

export function useConfigCountryPricing({
  section,
  countryFromUrl,
  notify,
  pricing,
  onSelectedCountryRemoved,
}: UseConfigCountryPricingParams) {
  const {
    countries,
    setCountries,
    promotions,
    setPromotions,
    catalogProducts,
    distributorPrices,
    setDistributorPrices,
    flushPendingSave,
    pricingLoaded,
    pricingError,
  } = pricing;

  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [countryQuery, setCountryQuery] = useState("");
  const [pendingCountryToAdd, setPendingCountryToAdd] = useState<CountryOption | null>(null);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [countryContextMenu, setCountryContextMenu] = useState<CountryContextMenu | null>(null);
  const [countryProductContextMenu, setCountryProductContextMenu] =
    useState<CountryProductContextMenu | null>(null);
  const [countryProductQuery, setCountryProductQuery] = useState("");
  const [countryProductPickerOpen, setCountryProductPickerOpen] = useState(false);
  const countryProductAddRef = useRef<HTMLDivElement>(null);
  const appliedCountryFromUrlRef = useRef<string | null>(null);
  const [promotionEditor, setPromotionEditor] = useState<PromotionEditorState | null>(null);
  const [countryPriceTab, setCountryPriceTab] = useState<CountryPriceTab>("items");

  const countryOptions = COUNTRY_OPTIONS;
  const sortedCountries = useMemo(
    () => [...countries].sort(compareCountriesByCatalogOrder),
    [countries],
  );

  const impliedCountryFromUrl = useMemo(() => {
    if (!countryFromUrl?.trim() || !pricingLoaded) {
      return null;
    }

    const requestedCountry = countryFromUrl.trim();
    const configured = findCountryByNormalizedName(requestedCountry, countries);
    if (configured) {
      return configured.name;
    }

    const option = findCountryByNormalizedName(requestedCountry, COUNTRY_OPTIONS);
    return option?.name ?? null;
  }, [countryFromUrl, countries, pricingLoaded]);

  const activeCountry = selectedCountry ?? impliedCountryFromUrl;

  const inventarioReturnHref = useMemo(() => {
    const returnTo = activeCountry
      ? configPricesCountryHref(activeCountry)
      : "/configuracion?view=prices";

    return inventarioHrefWithReturn(returnTo);
  }, [activeCountry]);

  const pendingCountryFromUrl = Boolean(
    section === "prices" && countryFromUrl?.trim() && !pricingLoaded,
  );

  const selectedCountryData = useMemo(
    () => countries.find((country) => country.name === activeCountry),
    [countries, activeCountry],
  );

  const assignedCountryCatalogKeys = useMemo(
    () =>
      new Set(
        (selectedCountryData?.boxes || [])
          .map((box) => box.catalogKey || box.size)
          .filter(Boolean),
      ),
    [selectedCountryData],
  );

  const hasAddableCatalogProducts = useMemo(
    () =>
      catalogProducts.some((product) => !assignedCountryCatalogKeys.has(product.catalogKey)),
    [catalogProducts, assignedCountryCatalogKeys],
  );

  const catalogProductsByKey = useMemo(
    () => new Map(catalogProducts.map((product) => [product.catalogKey, product])),
    [catalogProducts],
  );

  const catalogCategoryNames = useMemo(
    () => catalogCategoryOrder(catalogProducts),
    [catalogProducts],
  );

  const countryBoxesByCategory = useMemo(
    () =>
      groupCountryCatalogBoxes(
        selectedCountryData?.boxes || [],
        catalogProductsByKey,
        catalogCategoryNames,
      ),
    [catalogCategoryNames, catalogProductsByKey, selectedCountryData?.boxes],
  );

  const firstAssignedBoxKey = useMemo(() => {
    const firstBox = countryBoxesByCategory[0]?.boxes[0]?.box;

    if (!firstBox) {
      return null;
    }

    return firstBox.catalogKey || firstBox.size;
  }, [countryBoxesByCategory]);

  const selectedCountryPromotions = useMemo(
    () =>
      promotions
        .filter((promotion) => promotion.countryName === activeCountry)
        .sort((left, right) => left.sortOrder - right.sortOrder),
    [promotions, activeCountry],
  );

  const countryPriceTabs = useMemo<AppTabDefinition<CountryPriceTab>[]>(
    () => [
      { id: "items", label: "Items", icon: Package2 },
      {
        id: "promotions",
        label: "Promociones",
        icon: Tags,
        badge: selectedCountryPromotions.length || undefined,
      },
      { id: "delivery", label: "Entrega", icon: Clock },
    ],
    [selectedCountryPromotions.length],
  );

  const comboBuilderProducts = useMemo<ComboBuilderProduct[]>(() => {
    const all = (selectedCountryData?.boxes || []).map((box) => ({
      catalogKey: productKeyFromBox(box),
      label: box.size,
      price: box.price,
    }));

    const keepKeys = new Set<string>();

    if (promotionEditor) {
      for (const line of promotionEditor.draft.rule.buy) {
        if (line.catalogKey.trim()) {
          keepKeys.add(line.catalogKey.trim());
        }
      }

      for (const line of promotionEditor.draft.rule.get) {
        if (line.catalogKey.trim()) {
          keepKeys.add(line.catalogKey.trim());
        }
      }
    }

    return all.filter(
      (product) =>
        parseMoneyValue(product.price) > 0 || keepKeys.has(product.catalogKey),
    );
  }, [selectedCountryData, promotionEditor]);

  const filteredCountryOptions = useMemo(() => {
    const query = normalizeConfigText(countryQuery.trim());

    return countryOptions
      .filter((country) => !isCountryAlreadyConfigured(country, countries))
      .filter((country) => normalizeConfigText(country.name).includes(query));
  }, [countries, countryOptions, countryQuery]);

  const countryPickerSearchOptions = useMemo(() => {
    return countryCatalogPickerOptions(
      countryOptions.filter((country) => !isCountryAlreadyConfigured(country, countries)),
    );
  }, [countries, countryOptions]);

  useConfigCountryPricingEffects({
    section,
    countryFromUrl,
    notify,
    pricingLoaded,
    pricingError,
    countries,
    setCountries,
    flushPendingSave,
    activeCountry,
    selectedCountry,
    setSelectedCountry,
    setCountryQuery,
    setShowCountryPicker,
    setCountryProductQuery,
    setCountryContextMenu,
    setCountryProductContextMenu,
    setPromotionEditor,
    setCountryPriceTab,
    countryPriceTab,
    countryProductPickerOpen,
    setCountryProductPickerOpen,
    countryProductAddRef,
    countryContextMenu,
    countryProductContextMenu,
    appliedCountryFromUrlRef,
  });

  const actions = useConfigCountryPricingActions({
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
  });

  return {
    selectedCountry,
    setSelectedCountry,
    activeCountry,
    countryQuery,
    setCountryQuery,
    pendingCountryToAdd,
    setPendingCountryToAdd,
    showCountryPicker,
    setShowCountryPicker,
    countryContextMenu,
    countryProductContextMenu,
    countryProductQuery,
    setCountryProductQuery,
    countryProductPickerOpen,
    setCountryProductPickerOpen,
    countryProductAddRef,
    promotionEditor,
    setPromotionEditor,
    countryPriceTab,
    setCountryPriceTab,
    countryOptions,
    sortedCountries,
    inventarioReturnHref,
    pendingCountryFromUrl,
    selectedCountryData,
    assignedCountryCatalogKeys,
    hasAddableCatalogProducts,
    catalogProductsByKey,
    catalogCategoryNames,
    countryBoxesByCategory,
    firstAssignedBoxKey,
    selectedCountryPromotions,
    countryPriceTabs,
    comboBuilderProducts,
    filteredCountryOptions,
    countryPickerSearchOptions,
    appliedCountryFromUrlRef,
    ...actions,
  };
}
