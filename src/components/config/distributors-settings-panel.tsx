"use client";

import { Box, ChevronRight, DollarSign, Plus, Truck } from "lucide-react";
import { CountryFlag } from "@/components/country-flag";
import { emptyDistributor, parseMoney } from "@/components/config/config-pricing-helpers";
import { CONFIG_SECTION_LABELS } from "@/lib/config-section-labels";
import { resolveCountryCode } from "@/lib/country-options";
import { moneyInputDisplayValue } from "@/lib/logistics-fees";
import type { PricingCountryConfig, PricingDistributorConfig } from "@/lib/pricing/types";
import { inputClass, Panel, primaryButtonClass } from "@/components/ui-blocks";

type DistributorDraft = typeof emptyDistributor;

type DistributorsSettingsPanelProps = {
  showSidebarNav: boolean;
  nestedPanelShell: { className?: string; contentClassName?: string };
  selectedDistributor: string | null;
  selectedDistributorCountry: string | null;
  selectedDistributorData?: PricingDistributorConfig;
  selectedDistributorCountryData?: PricingCountryConfig;
  selectedDistributorBoxes: Array<{ size: string; price: string }>;
  sortedCountries: PricingCountryConfig[];
  distributors: PricingDistributorConfig[];
  showDistributorForm: boolean;
  setShowDistributorForm: React.Dispatch<React.SetStateAction<boolean>>;
  newDistributor: DistributorDraft;
  setNewDistributor: React.Dispatch<React.SetStateAction<DistributorDraft>>;
  onAddDistributor: () => void;
  onToggleDistributor: (name: string) => void;
  onSelectDistributor: (name: string) => void;
  onSelectDistributorCountry: (name: string) => void;
  onUpdateDistributorPrice: (size: string, price: string) => void;
};

export function DistributorsSettingsPanel({
  showSidebarNav,
  nestedPanelShell,
  selectedDistributor,
  selectedDistributorCountry,
  selectedDistributorData,
  selectedDistributorCountryData,
  selectedDistributorBoxes,
  sortedCountries,
  distributors,
  showDistributorForm,
  setShowDistributorForm,
  newDistributor,
  setNewDistributor,
  onAddDistributor,
  onToggleDistributor,
  onSelectDistributor,
  onSelectDistributorCountry,
  onUpdateDistributorPrice,
}: DistributorsSettingsPanelProps) {
  if (!selectedDistributor) {
    return (
      <Panel
        title={CONFIG_SECTION_LABELS.distributors.title}
        hideHeader={showSidebarNav}
        {...nestedPanelShell}
      >
        <div className="mb-5 grid gap-3">
          <button
            onClick={() => setShowDistributorForm((current) => !current)}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-400 px-5 text-sm font-black text-slate-950 sm:w-fit"
          >
            <Plus className="h-6 w-6" />
            Crear distribuidor
          </button>

          {showDistributorForm ? (
            <div className="rounded-xl border border-black bg-surface-card p-4">
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  ["Nombre", "name", "Ej: MGS"],
                  ["Contacto", "contact", "Ej: Operaciones"],
                  ["Teléfono", "phone", "Ej: (305) 000-0000"],
                ].map(([label, key, placeholder]) => (
                  <label key={key} className="grid gap-2">
                    <span className="text-sm font-black uppercase text-slate-400 text-slate-400">
                      {label}
                    </span>
                    <input
                      className={inputClass}
                      placeholder={placeholder}
                      value={newDistributor[key as keyof DistributorDraft]}
                      onChange={(event) =>
                        setNewDistributor((current) => ({
                          ...current,
                          [key]: event.target.value,
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={onAddDistributor} className={primaryButtonClass}>
                  Guardar
                </button>
                <button
                  onClick={() => {
                    setNewDistributor(emptyDistributor);
                    setShowDistributorForm(false);
                  }}
                  className="h-11 rounded-lg border border-black px-5 font-black border-black"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {distributors.map((distributor) => (
            <div
              key={distributor.name}
              onClick={() => onSelectDistributor(distributor.name)}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  onSelectDistributor(distributor.name);
                }
              }}
              className="relative overflow-hidden rounded-lg border border-black bg-surface-card p-5 shadow-[0_14px_34px_rgba(0,0,0,0.34)] transition hover:bg-surface-card-hover"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-emerald-600 bg-emerald-400 text-slate-950">
                  <Truck className="h-8 w-8" />
                </span>
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggleDistributor(distributor.name);
                  }}
                  className={`h-9 rounded-full px-4 text-sm font-black ${
                    distributor.active
                      ? "border border-emerald-600 bg-emerald-400 text-slate-950"
                      : "bg-surface-inset text-slate-300"
                  }`}
                >
                  {distributor.active ? "Activo" : "Inactivo"}
                </button>
              </div>
              <p className="mt-5 text-3xl font-black leading-tight">{distributor.name}</p>
              <p className="mt-2 text-base font-bold text-slate-300">
                {distributor.contact} · {distributor.phone}
              </p>
              <div className="mt-5 inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-600 bg-emerald-400 text-slate-950 px-4 text-sm font-black">
                Configurar precios
                <ChevronRight className="h-4 w-4" />
              </div>
            </div>
          ))}
        </div>
      </Panel>
    );
  }

  if (!selectedDistributorCountry) {
    return (
      <Panel
        hideHeader={showSidebarNav}
        {...nestedPanelShell}
        title={
          <span className="flex flex-wrap items-center gap-3">
            <Truck className="h-7 w-7 text-slate-400" />
            <span>Editando precios de {selectedDistributorData?.name}</span>
          </span>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {sortedCountries.map((country) => (
            <button
              key={country.name}
              onClick={() => onSelectDistributorCountry(country.name)}
              className="group relative min-h-36 overflow-hidden rounded-lg border border-black bg-surface-card p-5 text-left shadow-[0_14px_34px_rgba(0,0,0,0.34)] transition hover:bg-surface-card-hover"
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
                      <span className="inline-flex h-9 items-center gap-2 rounded-full border border-emerald-600 bg-emerald-400 text-slate-950 px-3 text-sm font-black">
                        Editar precios
                      </span>
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
      </Panel>
    );
  }

  return (
    <Panel
      hideHeader={showSidebarNav}
      {...nestedPanelShell}
      title={
        <span className="flex flex-wrap items-center gap-3">
          <Truck className="h-7 w-7 text-slate-400" />
          <span>
            {selectedDistributor} · {selectedDistributorCountry}
          </span>
        </span>
      }
    >
      <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-4">
        {selectedDistributorBoxes.map((box) => {
          const publicPrice =
            selectedDistributorCountryData?.boxes.find(
              (publicBox) => publicBox.size === box.size,
            )?.price || box.price;
          const profit = parseMoney(publicPrice) - parseMoney(box.price);

          return (
            <div
              key={box.size}
              className="relative overflow-hidden rounded-lg border border-black bg-surface-card p-5 shadow-[0_14px_34px_rgba(0,0,0,0.34)]"
            >
              <div className="mb-5 flex items-center gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-emerald-600 bg-emerald-400 text-slate-950 text-slate-400">
                  <Box className="h-8 w-8" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-black uppercase text-slate-400 text-slate-400">
                    Producto
                  </span>
                  <span className="block whitespace-nowrap text-2xl font-black leading-tight text-slate-300">
                    {box.size}
                  </span>
                </span>
              </div>

              <div className="grid gap-3">
                <div className="flex h-14 items-center justify-between gap-4 rounded-xl border border-black bg-surface-panel px-4">
                  <span className="text-sm font-black uppercase text-slate-400 text-slate-400">
                    Público general
                  </span>
                  <span className="flex h-10 w-28 items-center justify-center gap-1 text-[#f8fafc]">
                    <DollarSign className="h-5 w-5 shrink-0" />
                    <span className="text-2xl font-black leading-10">
                      {publicPrice.replace("$", "")}
                    </span>
                  </span>
                </div>

                <label className="flex h-14 items-center justify-between gap-4 rounded-xl border border-emerald-600 bg-emerald-400 px-4 text-slate-950">
                  <span className="text-sm font-black uppercase text-slate-400 text-slate-400">
                    Precio distribuidor
                  </span>
                  <span className="flex h-10 w-28 items-center justify-center gap-1 text-slate-400">
                    <DollarSign className="h-5 w-5 shrink-0" />
                    <input
                      className="h-10 w-20 rounded-none border-0 bg-transparent px-0 text-center text-2xl font-black leading-10 text-[#f8fafc] outline-none focus:ring-0"
                      style={{ background: "transparent" }}
                      value={moneyInputDisplayValue(box.price)}
                      onChange={(event) => onUpdateDistributorPrice(box.size, event.target.value)}
                    />
                  </span>
                </label>

                <div className="flex h-14 items-center justify-between gap-4 rounded-xl border border-black bg-surface-panel px-4">
                  <span className="text-sm font-black uppercase text-slate-400 text-slate-400">
                    Ganancia
                  </span>
                  <span className="flex h-10 w-28 items-center justify-center gap-1 text-slate-400">
                    <DollarSign className="h-5 w-5 shrink-0" />
                    <span className="text-2xl font-black leading-10 text-[#f8fafc]">
                      {profit}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
