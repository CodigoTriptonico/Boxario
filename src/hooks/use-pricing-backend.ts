"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadPricingConfigAction,
  savePricingConfigAction,
} from "@/app/actions/pricing";
import { compareCountriesByCatalogOrder } from "@/lib/country-options";
import { dispatchOnboardingProgressChanged } from "@/lib/onboarding/refresh";
import { defaultInvoiceBillingConfig } from "@/lib/invoice-billing";
import type { PricingPromotionConfig } from "@/lib/pricing-promotions";
import type { InventoryCatalogProduct } from "@/lib/pricing-catalog";
import type {
  PricingConfigPayload,
  PricingCountryConfig,
  PricingDistributorConfig,
  PricingDistributorPrices,
  PricingRouteConfig,
} from "@/lib/pricing/types";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { normalizeScheduleSuggestionConfig } from "@/lib/sale/schedule-suggestions";
import { SerializedTaskQueue } from "@/lib/pricing/serialized-task-queue";
import { DEFAULT_PAYMENT_METHOD_SETTINGS } from "@/lib/payment-methods";

const emptyRouteConfig: PricingRouteConfig = {
  ...DEFAULT_PAYMENT_METHOD_SETTINGS,
  deliveryDays: [],
  pickupDays: [],
  deliveryRanges: [],
  pickupRanges: [],
  pendingAllowed: true,
  routeLeadTime: "",
  linkedRouteSchedules: false,
  emptyBoxDeliveryFee: defaultInvoiceBillingConfig.emptyBoxDeliveryFee,
  fullBoxPickupFee: defaultInvoiceBillingConfig.fullBoxPickupFee,
  minimumDeposit: defaultInvoiceBillingConfig.minimumDeposit,
  pickupIncludedDays: defaultInvoiceBillingConfig.pickupIncludedDays || 30,
  latePickupFee: defaultInvoiceBillingConfig.latePickupFee || "$0",
  logisticsFeeMode: defaultInvoiceBillingConfig.logisticsFeeMode,
  scheduleSuggestions: normalizeScheduleSuggestionConfig(undefined),
};

function snapshotPayload(payload: {
  countries: PricingCountryConfig[];
  promotions: PricingPromotionConfig[];
  distributors: PricingDistributorConfig[];
  distributorPrices: PricingDistributorPrices;
  routeConfig: PricingRouteConfig;
}) {
  return JSON.stringify(payload);
}

function emptySaveableState() {
  return {
    countries: [] as PricingCountryConfig[],
    promotions: [] as PricingPromotionConfig[],
    distributors: [] as PricingDistributorConfig[],
    distributorPrices: {} as PricingDistributorPrices,
    routeConfig: emptyRouteConfig,
  };
}

function pricingStateFromPayload(payload: PricingConfigPayload) {
  const sortedCountries = [...payload.countries].sort(compareCountriesByCatalogOrder);

  return {
    countries: sortedCountries,
    promotions: payload.promotions,
    distributors: payload.distributors,
    distributorPrices: payload.distributorPrices,
    routeConfig: payload.routeConfig,
    catalogProducts: payload.catalogProducts,
  };
}

export function usePricingBackend(initialData?: PricingConfigPayload) {
  const enabled = isSupabaseConfigured();
  const initialState = initialData ? pricingStateFromPayload(initialData) : null;
  const [countries, setCountries] = useState<PricingCountryConfig[]>(
    initialState?.countries ?? [],
  );
  const [promotions, setPromotions] = useState<PricingPromotionConfig[]>(
    initialState?.promotions ?? [],
  );
  const [catalogProducts, setCatalogProducts] = useState<InventoryCatalogProduct[]>(
    initialState?.catalogProducts ?? [],
  );
  const [distributors, setDistributors] = useState<PricingDistributorConfig[]>(
    initialState?.distributors ?? [],
  );
  const [distributorPrices, setDistributorPrices] = useState<PricingDistributorPrices>(
    initialState?.distributorPrices ?? {},
  );
  const [routeConfig, setRouteConfig] = useState<PricingRouteConfig>(
    initialState?.routeConfig ?? emptyRouteConfig,
  );
  const [loaded, setLoaded] = useState(!enabled || Boolean(initialData));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const lastSavedSnapshotRef = useRef(
    snapshotPayload(
      initialState ?? {
        countries: [],
        promotions: [],
        distributors: [],
        distributorPrices: {},
        routeConfig: emptyRouteConfig,
      },
    ),
  );
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueueRef = useRef(new SerializedTaskQueue());
  const pendingSaveCountRef = useRef(0);
  const loadedRef = useRef(loaded);
  const saveableRef = useRef(emptySaveableState());

  useEffect(() => {
    loadedRef.current = loaded;
    saveableRef.current = {
      countries,
      promotions,
      distributors,
      distributorPrices,
      routeConfig,
    };
  }, [countries, distributors, distributorPrices, loaded, promotions, routeConfig]);

  const loadRemote = useCallback(async () => {
    if (!enabled) {
      setLoaded(true);
      return;
    }

    setError("");
    const snapshotBeforeLoad = snapshotPayload(saveableRef.current);
    const result = await loadPricingConfigAction();

    if (!result.ok) {
      setError(result.error);
      setLoaded(true);
      return;
    }

    const sortedCountries = [...result.data.countries].sort(compareCountriesByCatalogOrder);
    const saveable = {
      countries: sortedCountries,
      promotions: result.data.promotions,
      distributors: result.data.distributors,
      distributorPrices: result.data.distributorPrices,
      routeConfig: result.data.routeConfig,
    };

    setCatalogProducts(result.data.catalogProducts);

    const localChangedDuringLoad =
      snapshotPayload(saveableRef.current) !== snapshotBeforeLoad;
    const pendingLocalChanges =
      loadedRef.current &&
      snapshotPayload(saveableRef.current) !== lastSavedSnapshotRef.current;

    if (pendingLocalChanges || localChangedDuringLoad) {
      setLoaded(true);
      return;
    }

    lastSavedSnapshotRef.current = snapshotPayload(saveable);
    setCountries(sortedCountries);
    setPromotions(result.data.promotions);
    setDistributors(result.data.distributors);
    setDistributorPrices(result.data.distributorPrices);
    setRouteConfig(result.data.routeConfig);
    setLoaded(true);
  }, [
    enabled,
    setCatalogProducts,
    setCountries,
    setDistributorPrices,
    setDistributors,
    setError,
    setLoaded,
    setPromotions,
    setRouteConfig,
  ]);

  useEffect(() => {
    if (!enabled || initialData) {
      return;
    }

    queueMicrotask(() => {
      void loadRemote();
    });
  }, [enabled, initialData, loadRemote]);

  const persist = useCallback(
    async (saveable: {
      countries: PricingCountryConfig[];
      promotions: PricingPromotionConfig[];
      distributors: PricingDistributorConfig[];
      distributorPrices: PricingDistributorPrices;
      routeConfig: PricingRouteConfig;
    }): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!enabled) {
        lastSavedSnapshotRef.current = snapshotPayload(saveable);
        return { ok: true };
      }

      const result = await savePricingConfigAction({
        ...saveable,
        catalogProducts,
      });

      if (!result.ok) {
        setError(result.error);
        return { ok: false, error: result.error };
      }

      setError("");
      lastSavedSnapshotRef.current = snapshotPayload(saveable);
      dispatchOnboardingProgressChanged();
      return { ok: true };
    },
    [catalogProducts, enabled, setError],
  );

  const queuePersist = useCallback(
    (saveable: Parameters<typeof persist>[0]) => {
      pendingSaveCountRef.current += 1;
      setSaving(true);

      return saveQueueRef.current.enqueue(async () => {
          try {
            if (snapshotPayload(saveable) === lastSavedSnapshotRef.current) {
              return { ok: true } as const;
            }

            return await persist(saveable);
          } catch {
            const message = "No se pudo guardar la configuración. Inténtalo nuevamente.";
            setError(message);
            return { ok: false, error: message } as const;
          } finally {
            pendingSaveCountRef.current = Math.max(0, pendingSaveCountRef.current - 1);
            if (pendingSaveCountRef.current === 0) {
              setSaving(false);
            }
          }
      });
    },
    [persist, setError, setSaving],
  );
  const persistRef = useRef(queuePersist);

  useEffect(() => {
    persistRef.current = queuePersist;
  }, [queuePersist]);

  type PricingSaveable = {
    countries: PricingCountryConfig[];
    promotions: PricingPromotionConfig[];
    distributors: PricingDistributorConfig[];
    distributorPrices: PricingDistributorPrices;
    routeConfig: PricingRouteConfig;
  };

  const flushPendingSaveNow = useCallback(
    async (
      override?: Partial<PricingSaveable>,
    ): Promise<{ ok: true } | { ok: false; error: string }> => {
      if (!loaded && enabled) {
        return { ok: false, error: "La configuración aún se está cargando." };
      }

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      const saveable: PricingSaveable = {
        ...saveableRef.current,
        ...override,
      };
      saveableRef.current = saveable;

      const currentSnapshot = snapshotPayload(saveable);

      if (currentSnapshot === lastSavedSnapshotRef.current) {
        return { ok: true };
      }

      return persistRef.current(saveable);
    },
    [enabled, loaded],
  );

  useEffect(() => {
    if (!enabled) {
      return;
    }

    function flushOnPageHide() {
      flushPendingSaveNow();
    }

    window.addEventListener("pagehide", flushOnPageHide);

    return () => {
      window.removeEventListener("pagehide", flushOnPageHide);
    };
  }, [enabled, flushPendingSaveNow]);

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      if (!enabled || !loadedRef.current) {
        return;
      }

      const saveable = saveableRef.current;

      if (snapshotPayload(saveable) === lastSavedSnapshotRef.current) {
        return;
      }

      void persistRef.current(saveable);
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled || !loaded) {
      return;
    }

    const saveable = {
      countries,
      promotions,
      distributors,
      distributorPrices,
      routeConfig,
    };
    const currentSnapshot = snapshotPayload(saveable);

    if (currentSnapshot === lastSavedSnapshotRef.current) {
      return;
    }

    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = setTimeout(() => {
      void queuePersist(saveable);
    }, 900);

    return () => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [
    countries,
    promotions,
    distributors,
    distributorPrices,
    routeConfig,
    enabled,
    loaded,
    queuePersist,
  ]);

  const flushPendingSave = useCallback(
    async (override?: Partial<PricingSaveable>) => flushPendingSaveNow(override),
    [flushPendingSaveNow],
  );

  return {
    enabled,
    loaded,
    saving,
    error,
    countries,
    setCountries,
    promotions,
    setPromotions,
    catalogProducts,
    setCatalogProducts,
    distributors,
    setDistributors,
    distributorPrices,
    setDistributorPrices,
    routeConfig,
    setRouteConfig,
    reload: loadRemote,
    flushPendingSave,
  };
}

type PricingFlushResult = { ok: true } | { ok: false; error: string };
export type PricingFlushPendingSave = (
  override?: Partial<{
    countries: PricingCountryConfig[];
    promotions: PricingPromotionConfig[];
    distributors: PricingDistributorConfig[];
    distributorPrices: PricingDistributorPrices;
    routeConfig: PricingRouteConfig;
  }>,
) => Promise<PricingFlushResult>;
