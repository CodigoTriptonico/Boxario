"use client";

import { useEffect, useLayoutEffect } from "react";
import type { CountryPriceTab, PromotionEditorState } from "@/components/config/config-pricing-helpers";
import {
  COUNTRY_OPTIONS,
  compareCountriesByCatalogOrder,
  findCountryByNormalizedName,
} from "@/lib/country-options";
import type { PricingCountryConfig } from "@/lib/pricing/types";
import type { useNotify } from "@/hooks/use-notify";
import type { CountryContextMenu, CountryProductContextMenu } from "@/components/config/config-pricing-helpers";

type ConfigCountryPricingEffectsParams = {
  section: string;
  countryFromUrl: string | null;
  notify: ReturnType<typeof useNotify>;
  pricingLoaded: boolean;
  pricingError: string | null;
  countries: PricingCountryConfig[];
  setCountries: React.Dispatch<React.SetStateAction<PricingCountryConfig[]>>;
  flushPendingSave: () => void | Promise<void>;
  activeCountry: string | null;
  selectedCountry: string | null;
  setSelectedCountry: React.Dispatch<React.SetStateAction<string | null>>;
  setCountryQuery: React.Dispatch<React.SetStateAction<string>>;
  setShowCountryPicker: React.Dispatch<React.SetStateAction<boolean>>;
  setCountryProductQuery: React.Dispatch<React.SetStateAction<string>>;
  setCountryContextMenu: React.Dispatch<React.SetStateAction<CountryContextMenu | null>>;
  setCountryProductContextMenu: React.Dispatch<React.SetStateAction<CountryProductContextMenu | null>>;
  setPromotionEditor: React.Dispatch<React.SetStateAction<PromotionEditorState | null>>;
  setCountryPriceTab: React.Dispatch<React.SetStateAction<CountryPriceTab>>;
  countryPriceTab: CountryPriceTab;
  countryProductPickerOpen: boolean;
  setCountryProductPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  countryProductAddRef: React.RefObject<HTMLDivElement | null>;
  countryContextMenu: CountryContextMenu | null;
  countryProductContextMenu: CountryProductContextMenu | null;
  appliedCountryFromUrlRef: React.MutableRefObject<string | null>;
};

export function useConfigCountryPricingEffects(params: ConfigCountryPricingEffectsParams) {
  const {
    section,
    countryFromUrl,
    notify,
    pricingLoaded,
    pricingError,
    countries,
    setCountries,
    flushPendingSave,
    activeCountry,
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
  } = params;

  useEffect(() => {
    appliedCountryFromUrlRef.current = null;
  }, [countryFromUrl, appliedCountryFromUrlRef]);

  useLayoutEffect(() => {
    if (section !== "prices" || !countryFromUrl?.trim() || !pricingLoaded) {
      return;
    }

    const requestedCountry = countryFromUrl.trim();
    if (appliedCountryFromUrlRef.current === requestedCountry) {
      return;
    }

    const configured = findCountryByNormalizedName(requestedCountry, countries);
    if (configured) {
      appliedCountryFromUrlRef.current = requestedCountry;
      queueMicrotask(() => {
        setSelectedCountry(configured.name);
        setShowCountryPicker(false);
      });
      return;
    }

    const option = findCountryByNormalizedName(requestedCountry, COUNTRY_OPTIONS);
    if (option) {
      appliedCountryFromUrlRef.current = requestedCountry;
      queueMicrotask(() => {
        setCountries((current) => {
          const existing = findCountryByNormalizedName(requestedCountry, current);
          if (existing) {
            return current;
          }

          return [
            ...current,
            {
              code: option.code,
              name: option.name,
              deliveryTime: "",
              boxes: [],
            },
          ].sort(compareCountriesByCatalogOrder);
        });
        setSelectedCountry(option.name);
        setShowCountryPicker(false);
        void flushPendingSave();
      });
      return;
    }

    appliedCountryFromUrlRef.current = requestedCountry;
    queueMicrotask(() => {
      setCountryQuery(requestedCountry);
      setShowCountryPicker(true);
    });
  }, [
    section,
    countryFromUrl,
    countries,
    pricingLoaded,
    setCountries,
    flushPendingSave,
    appliedCountryFromUrlRef,
    setSelectedCountry,
    setShowCountryPicker,
    setCountryQuery,
  ]);

  useEffect(() => {
    if (!pricingError) {
      return;
    }

    notify.error(pricingError);
  }, [notify, pricingError]);

  useEffect(() => {
    if (
      section === "prices" &&
      !activeCountry &&
      countries.length === 0 &&
      !countryFromUrl?.trim()
    ) {
      queueMicrotask(() => setShowCountryPicker(true));
    }
  }, [section, activeCountry, countries.length, countryFromUrl, setShowCountryPicker]);

  useEffect(() => {
    if (section === "prices") {
      return;
    }

    queueMicrotask(() => {
      setSelectedCountry(null);
      setCountryQuery("");
      setShowCountryPicker(false);
      setCountryProductQuery("");
      setCountryContextMenu(null);
      setPromotionEditor(null);
      setCountryPriceTab("items");
    });
  }, [
    section,
    setSelectedCountry,
    setCountryQuery,
    setShowCountryPicker,
    setCountryProductQuery,
    setCountryContextMenu,
    setPromotionEditor,
    setCountryPriceTab,
  ]);

  useEffect(() => {
    queueMicrotask(() => {
      setCountryPriceTab("items");
      setCountryProductQuery("");
      setCountryProductPickerOpen(false);
      setPromotionEditor(null);
    });
  }, [
    activeCountry,
    setCountryPriceTab,
    setCountryProductQuery,
    setCountryProductPickerOpen,
    setPromotionEditor,
  ]);

  useEffect(() => {
    if (section !== "prices" || countryPriceTab === "items") {
      return;
    }

    queueMicrotask(() => setCountryProductPickerOpen(false));
  }, [section, countryPriceTab, setCountryProductPickerOpen]);

  useEffect(() => {
    if (!countryProductPickerOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (countryProductAddRef.current?.contains(target)) {
        return;
      }

      if (target instanceof Element && target.closest("[data-inline-search-picker-panel]")) {
        return;
      }

      setCountryProductPickerOpen(false);
      setCountryProductQuery("");
    }

    window.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [
    countryProductPickerOpen,
    countryProductAddRef,
    setCountryProductPickerOpen,
    setCountryProductQuery,
  ]);

  useEffect(() => {
    if (countryPriceTab !== "promotions") {
      queueMicrotask(() => {
        setPromotionEditor(null);
        void flushPendingSave();
      });
    }
  }, [countryPriceTab, flushPendingSave, setPromotionEditor]);

  useEffect(() => {
    if (section !== "prices" || countryPriceTab !== "items" || !activeCountry) {
      return;
    }

    void flushPendingSave();
  }, [section, countryPriceTab, activeCountry, flushPendingSave]);

  useEffect(() => {
    if (!countryContextMenu && !countryProductContextMenu) {
      return;
    }

    const closeMenusOnPointerDown = (event: Event) => {
      if (event instanceof PointerEvent && event.button === 2) {
        return;
      }

      const target = event.target;

      if (target instanceof Element && target.closest("[data-country-context-menu]")) {
        return;
      }

      if (target instanceof Element && target.closest("[data-country-product-context-menu]")) {
        return;
      }

      setCountryContextMenu(null);
      setCountryProductContextMenu(null);
    };

    const closeMenusOnScroll = () => {
      setCountryContextMenu(null);
      setCountryProductContextMenu(null);
    };

    window.addEventListener("pointerdown", closeMenusOnPointerDown);
    window.addEventListener("scroll", closeMenusOnScroll, true);

    return () => {
      window.removeEventListener("pointerdown", closeMenusOnPointerDown);
      window.removeEventListener("scroll", closeMenusOnScroll, true);
    };
  }, [
    countryContextMenu,
    countryProductContextMenu,
    setCountryContextMenu,
    setCountryProductContextMenu,
  ]);
}
