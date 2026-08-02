"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { AppearanceSettingsPanel } from "@/components/config/appearance-settings-panel";
import { ConfigCountryContextMenus } from "@/components/config/config-country-context-menus";
import { ConfigNavCard, ConfigNavGroup } from "@/components/config/config-nav";
import { configSectionById } from "@/components/config/config-sections";
import { parseConfigUrl } from "@/components/config/config-url";
import { CountryPricesDetailPanel } from "@/components/config/country-prices-detail-panel";
import { CountryPricesLandingPanel } from "@/components/config/country-prices-landing-panel";
import { DistributorsSettingsPanel } from "@/components/config/distributors-settings-panel";
import { OrganizationManagementPanel } from "@/components/config/organization-management-panel";
import { useConfigCountryPricing } from "@/components/config/use-config-country-pricing";
import { useConfigDistributors } from "@/components/config/use-config-distributors";
import { useConfigNavigation } from "@/components/config/use-config-navigation";
import type { LogisticsAxisSettings } from "@/app/actions/axis-settings";
import { PageLoading } from "@/components/page-loading";
import { useNotify } from "@/hooks/use-notify";
import { usePricingBackend } from "@/hooks/use-pricing-backend";
import { Panel } from "@/components/ui-blocks";
import { CONFIG_MENU_GROUPS } from "@/lib/config-menu-groups";
import { CONFIG_SECTION_LABELS } from "@/lib/config-section-labels";
import { ONBOARDING_TARGETS } from "@/lib/onboarding/coach-targets";
import type { PricingConfigPayload } from "@/lib/pricing/types";
import type { TimeClockDashboardSnapshot } from "@/lib/time-clock-data";

const TimeClockAdminClient = dynamic(
  () =>
    import("@/components/time-clock/time-clock-admin-client").then((mod) => mod.TimeClockAdminClient),
  { loading: () => <PageLoading inline /> },
);

export function ConfiguracionClient({
  initialPricing,
  timeClockInitialSnapshot,
  canManageTimeClock = false,
  agencyModuleEnabled = false,
  initialLogisticsSettings,
  canManageOperatingCosts = false,
}: {
  initialPricing?: PricingConfigPayload;
  timeClockInitialSnapshot?: TimeClockDashboardSnapshot;
  canManageTimeClock?: boolean;
  agencyModuleEnabled?: boolean;
  initialLogisticsSettings?: LogisticsAxisSettings;
  canManageOperatingCosts?: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const notify = useNotify();
  const parsedConfigUrl = useMemo(() => parseConfigUrl(searchParams), [searchParams]);
  const section = parsedConfigUrl.section;
  const costosPanel =
    parsedConfigUrl.costosPanel === "operativos" && canManageOperatingCosts
      ? "operativos"
      : "paises";
  const countryFromUrl = searchParams.get("country");

  const {
    enabled: pricingBackendEnabled,
    countries,
    setCountries,
    promotions,
    setPromotions,
    catalogProducts,
    distributors,
    setDistributors,
    distributorPrices,
    setDistributorPrices,
    flushPendingSave,
    loaded: pricingLoaded,
    error: pricingError,
  } = usePricingBackend(initialPricing);

  const distributorsState = useConfigDistributors({
    section,
    countries,
    distributors,
    setDistributors,
    distributorPrices,
    setDistributorPrices,
  });

  const countryPricing = useConfigCountryPricing({
    section,
    countryFromUrl,
    notify,
    pricing: {
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
    },
    onSelectedCountryRemoved: distributorsState.clearDistributorCountrySelection,
  });

  const navigation = useConfigNavigation({
    section,
    canManageOperatingCosts,
    activeCountry: countryPricing.activeCountry,
    countryFromUrl,
    selectedCountry: countryPricing.selectedCountry,
    setSelectedCountry: countryPricing.setSelectedCountry,
    appliedCountryFromUrlRef: countryPricing.appliedCountryFromUrlRef,
    selectedDistributor: distributorsState.selectedDistributor,
    setSelectedDistributor: distributorsState.setSelectedDistributor,
    selectedDistributorCountry: distributorsState.selectedDistributorCountry,
    setSelectedDistributorCountry: distributorsState.setSelectedDistributorCountry,
    selectedDistributorData: distributorsState.selectedDistributorData,
  });

  const { showSidebarNav, nestedPanelShell } = navigation;

  return (
    <>
      {!pricingBackendEnabled && section === "prices" ? (
        <p className="mb-4 rounded-lg border border-amber-700 bg-amber-950/40 px-3 py-2 text-sm font-bold text-amber-200">
          Supabase no está configurado. Los países y precios no se guardan al recargar.
        </p>
      ) : null}

      {section === "menu" ? (
        <div className="flex flex-col gap-5">
          {CONFIG_MENU_GROUPS.map((group) => (
            <ConfigNavGroup key={group.id} title={group.title} description={group.description}>
              {group.sectionIds.map((sectionId) => {
                const item = configSectionById.get(sectionId);
                if (!item) {
                  return null;
                }

                return (
                  <ConfigNavCard
                    key={item.id}
                    href={`/configuracion?view=${item.id}`}
                    title={item.title}
                    text={item.text}
                    icon={item.icon}
                    onboardingTarget={
                      item.id === "prices"
                        ? ONBOARDING_TARGETS.CONFIG_PRICES_CARD
                        : undefined
                    }
                  />
                );
              })}
            </ConfigNavGroup>
          ))}
        </div>
      ) : null}

      {section === "organization" ? (
        <Panel title={CONFIG_SECTION_LABELS.organization.title} hideHeader={showSidebarNav} {...nestedPanelShell}>
          <OrganizationManagementPanel initialTab={parsedConfigUrl.managementTab} />
        </Panel>
      ) : null}

      {section === "prices" && !countryPricing.activeCountry && !countryPricing.pendingCountryFromUrl ? (
        <CountryPricesLandingPanel
          showSidebarNav={showSidebarNav}
          nestedPanelShell={nestedPanelShell}
          costosPanel={costosPanel}
          costosPanelTabs={navigation.costosPanelTabs}
          onOpenCostosPanel={navigation.openCostosPanel}
          initialLogisticsSettings={initialLogisticsSettings}
          countries={countries}
          sortedCountries={countryPricing.sortedCountries}
          showCountryPicker={countryPricing.showCountryPicker}
          setShowCountryPicker={countryPricing.setShowCountryPicker}
          countryQuery={countryPricing.countryQuery}
          setCountryQuery={countryPricing.setCountryQuery}
          countryOptions={countryPricing.countryOptions}
          filteredCountryOptions={countryPricing.filteredCountryOptions}
          countryPickerSearchOptions={countryPricing.countryPickerSearchOptions}
          pendingCountryToAdd={countryPricing.pendingCountryToAdd}
          setPendingCountryToAdd={countryPricing.setPendingCountryToAdd}
          onOpenConfiguredCountry={countryPricing.openConfiguredCountry}
          onAddCountry={countryPricing.addCountry}
          onCloseCountryPicker={countryPricing.closeCountryPicker}
          onSelectCountry={countryPricing.setSelectedCountry}
          countryContextMenuProps={countryPricing.countryContextMenuProps}
        />
      ) : null}

      {section === "prices" && countryPricing.activeCountry ? (
        <CountryPricesDetailPanel
          showSidebarNav={showSidebarNav}
          nestedPanelShell={nestedPanelShell}
          activeCountry={countryPricing.activeCountry}
          selectedCountryData={countryPricing.selectedCountryData}
          countryPriceTabs={countryPricing.countryPriceTabs}
          countryPriceTab={countryPricing.countryPriceTab}
          setCountryPriceTab={countryPricing.setCountryPriceTab}
          agencyModuleEnabled={agencyModuleEnabled}
          catalogProducts={catalogProducts}
          catalogProductsByKey={countryPricing.catalogProductsByKey}
          catalogCategoryNames={countryPricing.catalogCategoryNames}
          countryBoxesByCategory={countryPricing.countryBoxesByCategory}
          assignedCountryCatalogKeys={countryPricing.assignedCountryCatalogKeys}
          hasAddableCatalogProducts={countryPricing.hasAddableCatalogProducts}
          countryProductAddRef={countryPricing.countryProductAddRef}
          countryProductPickerOpen={countryPricing.countryProductPickerOpen}
          setCountryProductPickerOpen={countryPricing.setCountryProductPickerOpen}
          countryProductQuery={countryPricing.countryProductQuery}
          setCountryProductQuery={countryPricing.setCountryProductQuery}
          inventarioReturnHref={countryPricing.inventarioReturnHref}
          firstAssignedBoxKey={countryPricing.firstAssignedBoxKey}
          selectedCountryPromotions={countryPricing.selectedCountryPromotions}
          comboBuilderProducts={countryPricing.comboBuilderProducts}
          promotionEditor={countryPricing.promotionEditor}
          setPromotionEditor={countryPricing.setPromotionEditor}
          onUpdateCountryTime={countryPricing.updateCountryTime}
          onAddCountryProduct={countryPricing.addCountryProduct}
          onUpdateCountryBoxPrice={countryPricing.updateCountryBoxPrice}
          onUpdateCountryBoxCost={countryPricing.updateCountryBoxCost}
          countryProductContextMenuProps={countryPricing.countryProductContextMenuProps}
          onOpenNewPromotion={countryPricing.openNewPromotion}
          onPatchPromotionDraft={countryPricing.patchPromotionDraft}
          onSavePromotionDraft={countryPricing.savePromotionDraft}
          onReorderCountryPromotions={countryPricing.reorderCountryPromotions}
          onOpenEditPromotion={countryPricing.openEditPromotion}
          onTogglePromotionActive={countryPricing.togglePromotionActive}
          onRemovePromotion={countryPricing.removePromotion}
          onGoInventario={() => router.push(countryPricing.inventarioReturnHref)}
        />
      ) : null}

      {section === "distributors" ? (
        <DistributorsSettingsPanel
          showSidebarNav={showSidebarNav}
          nestedPanelShell={nestedPanelShell}
          selectedDistributor={distributorsState.selectedDistributor}
          selectedDistributorCountry={distributorsState.selectedDistributorCountry}
          selectedDistributorData={distributorsState.selectedDistributorData}
          selectedDistributorCountryData={distributorsState.selectedDistributorCountryData}
          selectedDistributorBoxes={distributorsState.selectedDistributorBoxes}
          sortedCountries={countryPricing.sortedCountries}
          distributors={distributors}
          showDistributorForm={distributorsState.showDistributorForm}
          setShowDistributorForm={distributorsState.setShowDistributorForm}
          newDistributor={distributorsState.newDistributor}
          setNewDistributor={distributorsState.setNewDistributor}
          onAddDistributor={distributorsState.addDistributor}
          onToggleDistributor={distributorsState.toggleDistributor}
          onSelectDistributor={distributorsState.setSelectedDistributor}
          onSelectDistributorCountry={distributorsState.setSelectedDistributorCountry}
          onUpdateDistributorPrice={distributorsState.updateDistributorPrice}
        />
      ) : null}

      {section === "appearance" ? (
        <Panel title={CONFIG_SECTION_LABELS.appearance.title} hideHeader={showSidebarNav} {...nestedPanelShell}>
          <AppearanceSettingsPanel />
        </Panel>
      ) : null}

      {section === "timeclock" ? (
        <TimeClockAdminClient
          initialSnapshot={timeClockInitialSnapshot}
          canManage={canManageTimeClock}
        />
      ) : null}

      <ConfigCountryContextMenus
        countryContextMenu={countryPricing.countryContextMenu}
        countryProductContextMenu={countryPricing.countryProductContextMenu}
        onRemoveCountry={countryPricing.removeCountry}
        onRemoveCountryProduct={countryPricing.removeCountryProduct}
      />
    </>
  );
}
