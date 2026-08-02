"use client";

import { Box, ChevronRight, Clock, Globe2, Plus, Search, X } from "lucide-react";
import type { LogisticsAxisSettings } from "@/app/actions/axis-settings";
import { countryOptionKey } from "@/components/config/config-pricing-helpers";
import type { CostosPanel } from "@/components/config/config-url";
import { LogisticsSettingsPanel } from "@/components/settings/logistics-settings-panel";
import { AppTabs, type AppTabDefinition } from "@/components/app-tabs";
import { CountryFlag } from "@/components/country-flag";
import { InlineSearchCombobox } from "@/components/inline-search-picker";
import { flowToolbarCreateButtonClass } from "@/components/flow-form-styles";
import { iconWellEmerald, Panel } from "@/components/ui-blocks";
import { CONFIG_SECTION_LABELS } from "@/lib/config-section-labels";
import { resolveCountryCode, type CountryOption } from "@/lib/country-options";
import { ONBOARDING_TARGETS } from "@/lib/onboarding/coach-targets";
import type { PricingCountryConfig } from "@/lib/pricing/types";
import type { Dispatch, HTMLAttributes, SetStateAction } from "react";

type CountryPricesLandingPanelProps = {
  showSidebarNav: boolean;
  nestedPanelShell: { className?: string; contentClassName?: string };
  costosPanel: CostosPanel;
  costosPanelTabs: AppTabDefinition<CostosPanel>[];
  onOpenCostosPanel: (panel: CostosPanel) => void;
  initialLogisticsSettings?: LogisticsAxisSettings;
  countries: PricingCountryConfig[];
  sortedCountries: PricingCountryConfig[];
  showCountryPicker: boolean;
  setShowCountryPicker: (open: boolean) => void;
  countryQuery: string;
  setCountryQuery: (query: string) => void;
  countryOptions: CountryOption[];
  filteredCountryOptions: CountryOption[];
  countryPickerSearchOptions: Array<{ value: string; label: string; keywords?: string }>;
  pendingCountryToAdd: CountryOption | null;
  setPendingCountryToAdd: Dispatch<SetStateAction<CountryOption | null>>;
  onOpenConfiguredCountry: (name: string) => void;
  onAddCountry: (country: CountryOption) => void;
  onCloseCountryPicker: () => void;
  onSelectCountry: (name: string) => void;
  countryContextMenuProps: (countryName: string) => HTMLAttributes<HTMLElement>;
};

export function CountryPricesLandingPanel({
  showSidebarNav,
  nestedPanelShell,
  costosPanel,
  costosPanelTabs,
  onOpenCostosPanel,
  initialLogisticsSettings,
  countries,
  sortedCountries,
  showCountryPicker,
  setShowCountryPicker,
  countryQuery,
  setCountryQuery,
  countryOptions,
  filteredCountryOptions,
  countryPickerSearchOptions,
  pendingCountryToAdd,
  setPendingCountryToAdd,
  onOpenConfiguredCountry,
  onAddCountry,
  onCloseCountryPicker,
  onSelectCountry,
  countryContextMenuProps,
}: CountryPricesLandingPanelProps) {
  return (
  <Panel
    title={CONFIG_SECTION_LABELS.prices.title}
    hideHeader={showSidebarNav}
    className={
      costosPanel === "paises" && (showCountryPicker || countries.length === 0)
        ? `${nestedPanelShell.className ?? ""} flex min-h-[calc(100dvh-8.5rem)] flex-col`.trim()
        : nestedPanelShell.className
    }
    contentClassName={
      costosPanel === "paises" && (showCountryPicker || countries.length === 0)
        ? "flex min-h-0 flex-1 flex-col p-0"
        : nestedPanelShell.contentClassName
    }
  >
    {costosPanelTabs.length > 1 ? (
      <AppTabs
        className={
          costosPanel === "paises" && (showCountryPicker || countries.length === 0)
            ? "mb-0 shrink-0 px-3 pt-3 sm:px-4"
            : "mb-4"
        }
        tabs={costosPanelTabs}
        value={costosPanel}
        onChange={onOpenCostosPanel}
        ariaLabel="Secciones de costos"
      />
    ) : null}

    {costosPanel === "operativos" ? (
      initialLogisticsSettings ? (
        <LogisticsSettingsPanel initialSettings={initialLogisticsSettings} />
      ) : (
        <p className="rounded-lg border border-amber-700 bg-amber-950/40 px-3 py-2 text-sm font-bold text-amber-200">
          No se pudieron cargar los cargos operativos. Revisa la conexión e inténtalo de nuevo.
        </p>
      )
    ) : (
    <div
      className={`flex min-h-0 flex-1 flex-col ${
        countries.length > 0 && !showCountryPicker ? "gap-4" : "gap-0"
      }`}
    >
      {countries.length > 0 && !showCountryPicker ? (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowCountryPicker(true)}
            className={flowToolbarCreateButtonClass}
            data-onboarding-target={ONBOARDING_TARGETS.CONFIG_ADD_COUNTRY}
          >
            <Plus className="h-4 w-4" />
            Agregar país
          </button>
        </div>
      ) : null}

      {showCountryPicker || countries.length === 0 ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-black bg-[#1a221f] shadow-[0_8px_24px_rgba(0,0,0,0.22)]">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-black/80 bg-[#1c2622] px-3 py-2.5 sm:px-4">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className={`h-9 w-9 shrink-0 ${iconWellEmerald}`}>
                <Globe2 className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-black uppercase tracking-wide text-[#f8fafc]">
                  Elegir país
                </p>
                <p className="text-xs font-bold text-slate-400">
                  {filteredCountryOptions.length
                    ? `${filteredCountryOptions.length} disponibles`
                    : "Sin coincidencias"}
                </p>
              </div>
            </div>
            {countries.length > 0 ? (
              <button
                type="button"
                onClick={onCloseCountryPicker}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black bg-surface-inset text-slate-300 transition hover:bg-surface-card hover:text-[#f8fafc]"
                aria-label="Cerrar"
                title="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 sm:p-4">
            {sortedCountries.length > 0 ? (
              <div className="shrink-0">
                <p className="mb-2 text-xs font-black uppercase text-slate-400">
                  Configurados
                </p>
                <div className="grid auto-rows-min grid-cols-2 items-start gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {sortedCountries.map((country) => (
                    <button
                      key={country.name}
                      type="button"
                      onClick={() => onOpenConfiguredCountry(country.name)}
                      {...countryContextMenuProps(country.name)}
                      className="flex h-full min-h-[6.5rem] w-full cursor-context-menu flex-col items-center justify-center gap-2 rounded-xl border border-emerald-600 bg-emerald-950/25 px-3 py-4 text-center transition hover:bg-emerald-950/40"
                    >
                      <CountryFlag code={resolveCountryCode(country)} size="md" />
                      <span className="line-clamp-2 min-w-0 text-sm font-black leading-snug text-[#f8fafc]">
                        {country.name}
                      </span>
                      <span className="text-[10px] font-black uppercase tracking-wide text-emerald-300">
                        Configurado
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="shrink-0">
              <InlineSearchCombobox
                value={countryQuery}
                onChange={setCountryQuery}
                options={countryPickerSearchOptions}
                placeholder="Buscar por nombre…"
                emptyLabel="Sin países"
                ariaLabel="Buscar país"
                leadingIcon={<Search className="h-4 w-4" aria-hidden />}
                className="w-full"
                minWidthClass="w-full min-w-0"
                onSelectOption={(option) => {
                  const country = countryOptions.find(
                    (entry) => (entry.code || entry.name) === option.value,
                  );

                  if (country) {
                    setPendingCountryToAdd(country);
                    setCountryQuery("");
                  }
                }}
              />
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto pr-0.5">
              {filteredCountryOptions.length > 0 ? (
                <p className="text-xs font-black uppercase text-slate-400">Agregar país</p>
              ) : null}
              {filteredCountryOptions.length > 0 ? (
                <div
                  className="grid auto-rows-min grid-cols-2 items-start gap-3 sm:grid-cols-3 lg:grid-cols-4"
                  data-onboarding-target={ONBOARDING_TARGETS.CONFIG_COUNTRY_PICKER}
                >
                  {filteredCountryOptions.map((country) => {
                    const isPending =
                      pendingCountryToAdd !== null &&
                      countryOptionKey(pendingCountryToAdd) === countryOptionKey(country);

                    return (
                      <div
                        key={country.code || country.name}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          setPendingCountryToAdd((current) =>
                            current &&
                            countryOptionKey(current) === countryOptionKey(country)
                              ? null
                              : country,
                          )
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setPendingCountryToAdd((current) =>
                              current &&
                              countryOptionKey(current) === countryOptionKey(country)
                                ? null
                                : country,
                            );
                          }
                        }}
                        className={`flex h-full min-h-[6.5rem] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border px-3 py-4 text-center transition ${
                          isPending
                            ? "border-emerald-500 bg-emerald-950/30 ring-1 ring-emerald-500/35"
                            : "border-black bg-[#3a4842] hover:bg-[#425048]"
                        }`}
                      >
                        <CountryFlag code={resolveCountryCode(country)} size="md" />
                        <span className="line-clamp-2 min-w-0 text-sm font-black leading-snug text-[#f8fafc]">
                          {country.name}
                        </span>
                        {isPending ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              onAddCountry(country);
                            }}
                            className="mt-0.5 inline-flex h-8 items-center justify-center rounded-lg border border-emerald-600 bg-emerald-400 px-4 text-xs font-black text-slate-950 transition hover:bg-emerald-300"
                          >
                            Agregar
                          </button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="flex min-h-[5rem] items-center justify-center rounded-xl border border-dashed border-white/12 bg-surface-inset/40 px-4 text-center text-sm font-bold text-slate-400">
                  {countryQuery.trim()
                    ? "No hay países con ese nombre"
                    : "Ya agregaste todos los países disponibles"}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {!showCountryPicker && countries.length > 0 ? (
      <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {sortedCountries.map((country) => (
          <button
            key={country.name}
            onClick={() => onSelectCountry(country.name)}
            {...countryContextMenuProps(country.name)}
            className="group relative min-h-40 cursor-context-menu overflow-hidden rounded-xl border border-black bg-surface-card p-5 text-left shadow-[0_6px_20px_rgba(0,0,0,0.18)] transition hover:border-emerald-700/35 hover:bg-surface-card-hover"
          >
            <div className="relative flex h-full items-center justify-between gap-5">
              <div className="flex min-w-0 items-center gap-4">
                <CountryFlag code={resolveCountryCode(country)} size="lg" />
                <span className="min-w-0">
                  <span className="block truncate text-3xl font-black leading-tight">
                    {country.name}
                  </span>
                  <span className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex h-9 items-center gap-2 rounded-full border border-black bg-surface-panel px-3 text-sm font-black text-slate-300">
                      <Box className="h-4 w-4 text-slate-400" />
                      {country.boxes.length}{" "}
                      {country.boxes.length === 1 ? "producto" : "productos"}
                    </span>
                    {country.deliveryTime ? (
                      <span className="inline-flex h-9 items-center gap-2 rounded-full border border-emerald-600 bg-emerald-400 px-3 text-sm font-black text-slate-950">
                        <Clock className="h-4 w-4" />
                        {country.deliveryTime}
                      </span>
                    ) : (
                      <span className="inline-flex h-9 items-center gap-2 rounded-full border border-black bg-surface-panel px-3 text-sm font-black text-slate-400">
                        <Clock className="h-4 w-4" />
                        Sin definir
                      </span>
                    )}
                  </span>
                </span>
              </div>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-black bg-surface-panel text-slate-300 transition group-hover:border-black group-hover:bg-emerald-400 group-hover:text-slate-950">
                <ChevronRight className="h-6 w-6" />
              </span>
            </div>
          </button>
        ))}
      </div>
      ) : null}
    </div>
    )}
  </Panel>
  );
}
