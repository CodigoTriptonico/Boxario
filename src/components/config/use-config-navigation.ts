"use client";

import { Globe2, Truck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef } from "react";
import type { CostosPanel } from "@/components/config/config-url";
import type { ConfigSection } from "@/components/config/config-sections";
import type { AppTabDefinition } from "@/components/app-tabs";
import { useSetShellConfig } from "@/components/app-frame";
import { useContextNav } from "@/hooks/use-context-nav";
import { CONFIG_SECTION_LABELS } from "@/lib/config-section-labels";

type UseConfigNavigationParams = {
  section: ConfigSection;
  canManageOperatingCosts: boolean;
  activeCountry: string | null;
  countryFromUrl: string | null;
  selectedCountry: string | null;
  setSelectedCountry: (value: string | null) => void;
  appliedCountryFromUrlRef: React.MutableRefObject<string | null>;
  selectedDistributor: string | null;
  setSelectedDistributor: (value: string | null) => void;
  selectedDistributorCountry: string | null;
  setSelectedDistributorCountry: (value: string | null) => void;
  selectedDistributorData?: { name: string };
};

export function useConfigNavigation({
  section,
  canManageOperatingCosts,
  activeCountry,
  countryFromUrl,
  setSelectedCountry,
  appliedCountryFromUrlRef,
  selectedDistributor,
  setSelectedDistributor,
  selectedDistributorCountry,
  setSelectedDistributorCountry,
  selectedDistributorData,
}: UseConfigNavigationParams) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setShellConfig = useSetShellConfig();
  const cleanedFromRef = useRef(false);

  const openConfigSection = useCallback(
    (nextSection: ConfigSection) => {
      if (nextSection === "menu") {
        router.replace("/configuracion", { scroll: false });
        return;
      }

      router.replace(`/configuracion?view=${nextSection}`, { scroll: false });
    },
    [router],
  );

  const openCostosPanel = useCallback(
    (panel: CostosPanel) => {
      if (panel === "operativos") {
        router.replace("/configuracion?view=prices&panel=operativos", { scroll: false });
        return;
      }

      router.replace("/configuracion?view=prices", { scroll: false });
    },
    [router],
  );

  const costosPanelTabs = useMemo<AppTabDefinition<CostosPanel>[]>(() => {
    const tabs: AppTabDefinition<CostosPanel>[] = [
      { id: "paises", label: "Países", icon: Globe2 },
    ];
    if (canManageOperatingCosts) {
      tabs.push({ id: "operativos", label: "Operativos", icon: Truck });
    }
    return tabs;
  }, [canManageOperatingCosts]);

  useEffect(() => {
    const view = searchParams.get("view");
    const open = searchParams.get("open");

    if (view !== "inventory" && open !== "inventory") {
      return;
    }

    const inventorySub = searchParams.get("inventory");

    router.replace(
      inventorySub === "warehouses" ? "/inventario?bodegas=1" : "/inventario",
    );
  }, [router, searchParams]);

  useEffect(() => {
    if (cleanedFromRef.current) {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    if (params.get("from") !== "inventario") {
      return;
    }

    cleanedFromRef.current = true;

    params.delete("from");
    const query = params.toString();
    router.replace(query ? `/configuracion?${query}` : "/configuracion", { scroll: false });
  }, [router]);

  useEffect(() => {
    if (section === "timeclock") {
      setShellConfig({ surfaceContextId: "timeclock.admin" });
      return () => setShellConfig({ surfaceContextId: undefined });
    }
  }, [section, setShellConfig]);

  const goBack = useCallback(() => {
    if (selectedDistributorCountry) {
      setSelectedDistributorCountry(null);
      return;
    }

    if (selectedDistributor) {
      setSelectedDistributor(null);
      return;
    }

    if (activeCountry) {
      if (countryFromUrl?.trim()) {
        router.replace("/configuracion?view=prices", { scroll: false });
        appliedCountryFromUrlRef.current = null;
      }
      setSelectedCountry(null);
      return;
    }

    openConfigSection("menu");
  }, [
    activeCountry,
    appliedCountryFromUrlRef,
    countryFromUrl,
    openConfigSection,
    router,
    selectedDistributor,
    selectedDistributorCountry,
    setSelectedCountry,
    setSelectedDistributor,
    setSelectedDistributorCountry,
  ]);

  const configNavTitle = useMemo(() => {
    if (section === "menu") {
      return undefined;
    }

    if (section === "organization") {
      return CONFIG_SECTION_LABELS.organization.title;
    }

    if (section === "prices") {
      if (activeCountry) {
        return activeCountry;
      }

      return CONFIG_SECTION_LABELS.prices.title;
    }

    if (section === "distributors") {
      if (selectedDistributor && selectedDistributorCountry) {
        return `${selectedDistributor} · ${selectedDistributorCountry}`;
      }

      if (selectedDistributor) {
        return `Precios de ${selectedDistributorData?.name || selectedDistributor}`;
      }

      return CONFIG_SECTION_LABELS.distributors.title;
    }

    if (section === "appearance") {
      return CONFIG_SECTION_LABELS.appearance.title;
    }

    if (section === "timeclock") {
      return CONFIG_SECTION_LABELS.timeclock.title;
    }

    return "Configuración";
  }, [
    activeCountry,
    section,
    selectedDistributor,
    selectedDistributorCountry,
    selectedDistributorData?.name,
  ]);

  useContextNav({
    title: configNavTitle ?? "Configuración",
    onBack: goBack,
    enabled: Boolean(configNavTitle),
  });

  const showSidebarNav = section !== "menu";
  const nestedPanelShell = showSidebarNav
    ? { className: "border-0 bg-transparent shadow-none", contentClassName: "p-0" }
    : {};

  return {
    openConfigSection,
    openCostosPanel,
    costosPanelTabs,
    goBack,
    configNavTitle,
    showSidebarNav,
    nestedPanelShell,
  };
}
