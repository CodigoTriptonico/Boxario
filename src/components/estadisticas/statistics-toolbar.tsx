"use client";

import {
  Download,
  Filter,
  Printer,
  RefreshCw,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { DateInput } from "@/components/date-input";
import { inputClass, secondaryButtonClass } from "@/components/ui-blocks";
import { useHydrated } from "@/hooks/use-hydrated";
import type { StatisticsFilterOption, StatisticsFilters } from "@/lib/statistics/types";
import {
  PERIOD_PRESETS,
  periodDescription,
  resolveStatisticsPeriod,
  type StatisticsPeriodPreset,
  type StatisticsUrlState,
} from "./statistics-period";
import { formatStatisticDateRange, formatStatisticDateTime } from "./statistics-format";

type FilterOptions = {
  agencies: StatisticsFilterOption[];
  countries: StatisticsFilterOption[];
  sellers: StatisticsFilterOption[];
  routes: StatisticsFilterOption[];
  drivers: StatisticsFilterOption[];
  shipmentStatuses: StatisticsFilterOption[];
  operationTypes: StatisticsFilterOption[];
  products: StatisticsFilterOption[];
};

type FilterDefinition = {
  key: keyof StatisticsFilters;
  label: string;
  options: StatisticsFilterOption[];
};

function StatisticsFiltersDrawer({
  open,
  onClose,
  filters,
  options,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  filters: StatisticsFilters;
  options: FilterOptions;
  onChange: (filters: StatisticsFilters) => void;
}) {
  const hydrated = useHydrated();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const definitions = useMemo<FilterDefinition[]>(
    () => ([
      { key: "agencyId", label: "Agencia", options: options.agencies },
      { key: "country", label: "País de destino", options: options.countries },
      { key: "sellerId", label: "Vendedor", options: options.sellers },
      { key: "routeId", label: "Ruta", options: options.routes },
      { key: "driverId", label: "Conductor", options: options.drivers },
      { key: "shipmentStatus", label: "Estado del envío", options: options.shipmentStatuses },
      { key: "operationType", label: "Tipo de operación", options: options.operationTypes },
      { key: "productKey", label: "Producto o caja", options: options.products },
    ] satisfies FilterDefinition[]).filter((item) => item.options.length > 0),
    [options],
  );

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), select:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose, open]);

  if (!open || !hydrated) return null;

  return createPortal(
    <div className="fixed inset-0 z-[260] flex justify-end bg-black/70" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="statistics-filter-title"
        className="flex h-full w-full max-w-md flex-col border-l border-black bg-surface-panel shadow-[-18px_0_48px_rgba(0,0,0,0.42)]"
      >
        <div className="flex min-h-16 items-center gap-3 border-b border-black px-4">
          <SlidersHorizontal className="h-5 w-5 text-emerald-300" aria-hidden />
          <h2 id="statistics-filter-title" className="min-w-0 flex-1 text-lg font-black text-slate-50">Filtros del dashboard</h2>
          <button ref={closeRef} type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-lg border border-black bg-surface-inset text-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300" aria-label="Cerrar filtros">
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {definitions.length ? (
            <div className="grid gap-4">
              {definitions.map((definition) => (
                <label key={definition.key} className="grid gap-1.5 text-xs font-black uppercase tracking-wide text-slate-400">
                  {definition.label}
                  <select
                    className={`${inputClass} w-full normal-case`}
                    value={filters[definition.key] ?? ""}
                    onChange={(event) => onChange({ ...filters, [definition.key]: event.target.value || undefined })}
                  >
                    <option value="">Todos</option>
                    {definition.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                  </select>
                </label>
              ))}
            </div>
          ) : (
            <p className="rounded-lg border border-dashed border-slate-700 p-6 text-sm font-bold text-slate-400">No hay filtros adicionales disponibles para tu alcance.</p>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2 border-t border-black p-4">
          <button type="button" className={secondaryButtonClass} onClick={() => onChange({})} disabled={!Object.values(filters).some(Boolean)}>Limpiar</button>
          <button type="button" className="inline-flex h-11 items-center justify-center rounded-lg bg-emerald-400 px-3 text-sm font-black text-slate-950" onClick={onClose}>Ver resultados</button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function StatisticsToolbar({
  navigation,
  state,
  generatedAt,
  filterOptions,
  busy,
  onChange,
  onRefresh,
  onExport,
  onPrint,
}: {
  navigation: ReactNode;
  state: StatisticsUrlState;
  generatedAt: string;
  filterOptions: FilterOptions;
  busy: boolean;
  onChange: (state: StatisticsUrlState) => void;
  onRefresh: () => void;
  onExport: () => void;
  onPrint: () => void;
}) {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);
  const activeFilters = Object.entries(state.filters ?? {}).filter(([, value]) => Boolean(value));

  const findLabel = (key: keyof StatisticsFilters, value: string) => {
    const map: Record<keyof StatisticsFilters, StatisticsFilterOption[]> = {
      agencyId: filterOptions.agencies,
      country: filterOptions.countries,
      sellerId: filterOptions.sellers,
      routeId: filterOptions.routes,
      driverId: filterOptions.drivers,
      shipmentStatus: filterOptions.shipmentStatuses,
      operationType: filterOptions.operationTypes,
      productKey: filterOptions.products,
    };
    return map[key].find((option) => option.value === value)?.label ?? value;
  };

  const closeFilters = () => {
    setFiltersOpen(false);
    window.requestAnimationFrame(() => filterTriggerRef.current?.focus());
  };

  const changePreset = (preset: StatisticsPeriodPreset) => {
    const period = resolveStatisticsPeriod(preset, undefined, { from: state.from, to: state.to });
    onChange({ ...state, ...period, preset });
  };

  const updateCustomDate = (key: "from" | "to", value: string) => {
    const period = resolveStatisticsPeriod("custom", undefined, { ...state, [key]: value });
    onChange({ ...state, ...period, preset: "custom" });
  };

  return (
    <>
      <section className="border-b border-black/70" aria-label="Controles de estadísticas">
        <div className="flex flex-col gap-3 px-3 py-3 sm:px-5 2xl:flex-row 2xl:items-center">
          <div className="flex min-w-0 flex-col gap-2.5 sm:flex-row sm:items-center 2xl:flex-1">
            <div className="shrink-0">{navigation}</div>
            <div className="hidden h-9 w-px shrink-0 bg-black/70 sm:block" aria-hidden />
            <div className="min-w-0 border-t border-black/60 pt-2 sm:border-0 sm:pt-0">
              <p className="break-words text-xs font-black text-slate-300 sm:truncate">{periodDescription(state)}</p>
              <p className="mt-0.5 break-words text-[11px] font-bold text-slate-500 sm:truncate">Actualizado {formatStatisticDateTime(generatedAt)} · comparación: {formatStatisticDateRange(state.compareFrom, state.compareTo)}</p>
            </div>
          </div>

          <div className="grid min-w-0 grid-cols-2 gap-2 sm:grid-cols-[minmax(11rem,1fr)_repeat(4,auto)] 2xl:shrink-0">
            <label className="col-span-2 sm:col-span-1">
              <span className="sr-only">Periodo</span>
              <select aria-label="Periodo" className={`${inputClass} w-full min-w-0 normal-case`} value={state.preset} onChange={(event) => changePreset(event.target.value as StatisticsPeriodPreset)}>
                {PERIOD_PRESETS.map((preset) => <option key={preset.value} value={preset.value}>{preset.label}</option>)}
              </select>
            </label>
            <button ref={filterTriggerRef} type="button" className={secondaryButtonClass} onClick={() => setFiltersOpen(true)} aria-haspopup="dialog" aria-expanded={filtersOpen}>
              <Filter className="h-4 w-4" aria-hidden /> Filtros{activeFilters.length ? ` (${activeFilters.length})` : ""}
            </button>
            <button type="button" className={secondaryButtonClass} onClick={onRefresh} disabled={busy} aria-label={busy ? "Actualizando estadísticas" : "Actualizar estadísticas"}>
              <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin motion-reduce:animate-none" : ""}`} aria-hidden />
              <span className="sm:hidden">Recargar</span><span className="hidden sm:inline">Actualizar</span>
            </button>
            <button type="button" className={secondaryButtonClass} onClick={onExport}><Download className="h-4 w-4" aria-hidden /> CSV</button>
            <button type="button" className={secondaryButtonClass} onClick={onPrint}><Printer className="h-4 w-4" aria-hidden /> Imprimir</button>
          </div>
        </div>

        {state.preset === "custom" ? (
          <div className="grid grid-cols-2 gap-2 border-t border-black/60 px-3 py-3 sm:flex sm:items-end sm:px-5">
            <DateInput compact={false} value={state.from} onChange={(value) => updateCustomDate("from", value)} ariaLabel="Inicio del rango estadístico" className="w-full sm:w-44" />
            <DateInput compact={false} value={state.to} onChange={(value) => updateCustomDate("to", value)} ariaLabel="Fin del rango estadístico" className="w-full sm:w-44" />
            <p className="col-span-2 text-xs font-bold text-slate-500">Máximo 366 días. Las fechas se interpretan en la zona operativa indicada por el informe.</p>
          </div>
        ) : null}

        {activeFilters.length ? (
          <div className="flex flex-wrap gap-2 border-t border-black/60 px-3 py-3 sm:px-5" aria-label="Filtros activos">
            {activeFilters.map(([rawKey, rawValue]) => {
              const key = rawKey as keyof StatisticsFilters;
              const value = String(rawValue);
              return (
                <button key={key} type="button" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-emerald-800 bg-emerald-400/10 px-3 text-xs font-black text-emerald-200" onClick={() => onChange({ ...state, filters: { ...state.filters, [key]: undefined } })} aria-label={`Quitar filtro ${findLabel(key, value)}`}>
                  {findLabel(key, value)} <X className="h-3.5 w-3.5" aria-hidden />
                </button>
              );
            })}
          </div>
        ) : null}
      </section>

      <StatisticsFiltersDrawer open={filtersOpen} onClose={closeFilters} filters={state.filters ?? {}} options={filterOptions} onChange={(filters) => onChange({ ...state, filters })} />
    </>
  );
}
