"use client";

import Link from "next/link";
import {
  CalendarDays,
  ClipboardList,
  Route,
  Search,
  SlidersHorizontal,
  Truck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { DateInput } from "@/components/date-input";
import { LogisticsSectionNav } from "@/components/logistica/logistics-section-nav";
import { LogisticsWeekdayFilterSelect } from "@/components/logistica/logistics-weekday-filter-select";
import { InlineSearchCombobox, InlineSearchPicker } from "@/components/inline-search-picker";
import { panelToolbarClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui-blocks";
import { getLogisticsWeekdayIndex } from "@/lib/logistics-route-week";
import type { LogisticsCalendarDayTone } from "@/lib/logistics-calendar-day-tones";
import type { LogisticsRouteRow } from "@/lib/logistics-routing";
import type { LogisticsInvoiceItem } from "@/components/logistica/types";

export type LogisticsToolbarProps = {
  agencyModuleEnabled: boolean;
  operationScope: "domicilios" | "agencias";
  setOperationScope: (scope: "domicilios" | "agencias") => void;
  showRouteHistory: boolean;
  setShowRouteHistory: (value: boolean) => void;
  query: string;
  setQuery: (value: string) => void;
  taskSearchOptions: Array<{ value: string; label: string; searchText?: string }>;
  invoiceItems: LogisticsInvoiceItem[];
  weekdayFilter: number | null;
  weekdayFilterOptions: Array<{ value: number; label: string }>;
  weekdayTones: Readonly<Partial<Record<number, LogisticsCalendarDayTone>>>;
  selectWeekdayFilter: (next: number | null) => void;
  routeTemplateFilter: string;
  setRouteTemplateFilter: (value: string) => void;
  filterRoutePickerOptions: Array<{ value: string; label: string; searchText?: string }>;
  dateFilter: string;
  setDateFilter: (value: string) => void;
  filterAnchorDate: string;
  calendarDayTones: Readonly<Record<string, LogisticsCalendarDayTone>>;
  availableFilterWeekdays: number[];
  defaultWeekdayFilter: number | null;
  typeFilter: string;
  setTypeFilter: (value: string) => void;
  toolbarRoute: LogisticsRouteRow | null;
  canManageRoutes: boolean;
  requestToolbarRouteDriverChange: (nextAssignedTo: string | null) => void;
  routeDriverPickerOptions: Array<{ value: string; label: string; searchText?: string }>;
  busyId: string | null;
  selectedTasksCount: number;
  setRouteAssignmentOpen: (value: boolean) => void;
  filtersOpen: boolean;
  setFiltersOpen: (value: boolean | ((current: boolean) => boolean)) => void;
  hasFilters: boolean;
  driverFilter: string;
  setDriverFilter: (value: string) => void;
  filterDriverPickerOptions: Array<{ value: string; label: string; searchText?: string }>;
  zoneFilter: string;
  setZoneFilter: (value: string) => void;
  zoneOptions: Array<[string, string]>;
  failedFilter: boolean;
  setFailedFilter: (value: boolean | ((current: boolean) => boolean)) => void;
  failedTasksCount: number;
};

export function LogisticsToolbar({
  agencyModuleEnabled,
  operationScope,
  setOperationScope,
  showRouteHistory,
  setShowRouteHistory,
  query,
  setQuery,
  taskSearchOptions,
  invoiceItems,
  weekdayFilter,
  weekdayFilterOptions,
  weekdayTones,
  selectWeekdayFilter,
  routeTemplateFilter,
  setRouteTemplateFilter,
  filterRoutePickerOptions,
  dateFilter,
  setDateFilter,
  filterAnchorDate,
  calendarDayTones,
  availableFilterWeekdays,
  defaultWeekdayFilter,
  typeFilter,
  setTypeFilter,
  toolbarRoute,
  canManageRoutes,
  requestToolbarRouteDriverChange,
  routeDriverPickerOptions,
  busyId,
  selectedTasksCount,
  setRouteAssignmentOpen,
  filtersOpen,
  setFiltersOpen,
  hasFilters,
  driverFilter,
  setDriverFilter,
  filterDriverPickerOptions,
  zoneFilter,
  setZoneFilter,
  zoneOptions,
  failedFilter,
  setFailedFilter,
  failedTasksCount,
}: LogisticsToolbarProps) {
  return (
    <div className={`${panelToolbarClass} pb-2 lg:pb-3`}>
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        {agencyModuleEnabled ? (
          <div className="order-1 !hidden h-9 shrink-0 rounded-lg border border-black bg-surface-inset p-0.5 text-xs font-black lg:order-none lg:!flex">
            <button
              type="button"
              className={`rounded-md px-2.5 ${operationScope === "domicilios" ? "bg-emerald-400 text-slate-950" : "text-slate-300"}`}
              onClick={() => setOperationScope("domicilios")}
            >
              Domicilios
            </button>
            {agencyModuleEnabled ? (
              <button
                type="button"
                className={`rounded-md px-2.5 ${operationScope === "agencias" ? "bg-emerald-400 text-slate-950" : "text-slate-300"}`}
                onClick={() => setOperationScope("agencias")}
              >
                Agencias
              </button>
            ) : null}
          </div>
        ) : null}
        {operationScope === "domicilios" ? (
          <div className="order-1 !hidden h-9 shrink-0 rounded-lg border border-black bg-surface-inset p-0.5 text-xs font-black lg:order-none lg:!flex">
            <button
              type="button"
              className={`rounded-md px-2.5 ${!showRouteHistory ? "bg-emerald-400 text-slate-950" : "text-slate-300"}`}
              onClick={() => setShowRouteHistory(false)}
            >
              Activas
            </button>
            <button
              type="button"
              className={`rounded-md px-2.5 ${showRouteHistory ? "bg-emerald-400 text-slate-950" : "text-slate-300"}`}
              onClick={() => setShowRouteHistory(true)}
            >
              Historial
            </button>
          </div>
        ) : null}
        {operationScope === "domicilios" ? (
          <>
            <InlineSearchCombobox
              value={query}
              onChange={setQuery}
              options={taskSearchOptions}
              placeholder="Buscar invoice, cliente, ruta"
              emptyLabel="Sin tareas"
              ariaLabel="Buscar tareas de logistica"
              leadingIcon={<Search className="h-4 w-4" aria-hidden />}
              className="order-2 min-w-0 flex-[1_1_calc(100%-3.5rem)] lg:order-none lg:min-w-[14rem] lg:flex-[1_1_24rem]"
              minWidthClass="w-full min-w-0"
              onSelectOption={(option) => {
                const item = invoiceItems.find((entry) => entry.shipment.id === option.value);
                if (item) {
                  setQuery(item.shipment.code);
                }
              }}
            />

            <div className="order-3 !hidden w-full min-w-0 grid-cols-2 items-center gap-1 lg:order-none lg:!flex lg:w-auto lg:shrink-0">
              {weekdayFilter != null ? (
                <>
                  <LogisticsWeekdayFilterSelect
                    value={weekdayFilter}
                    options={weekdayFilterOptions}
                    tones={weekdayTones}
                    onChange={selectWeekdayFilter}
                    ariaLabel="Filtrar por día"
                    className="min-w-0 lg:min-w-[10.5rem]"
                  />
                  <InlineSearchPicker
                    className="min-w-0 lg:w-[11rem] lg:shrink-0"
                    minWidthClass="w-full min-w-0"
                    value={routeTemplateFilter}
                    onChange={setRouteTemplateFilter}
                    options={filterRoutePickerOptions}
                    placeholder="Todas las rutas"
                    searchPlaceholder="Buscar ruta…"
                    emptyLabel="Sin rutas ese día"
                    ariaLabel="Filtrar por ruta del día"
                    leadingIcon={<Route className="h-4 w-4 text-emerald-300" aria-hidden />}
                  />
                  <DateInput
                    className="!hidden w-[11.5rem] shrink-0 border-emerald-500 bg-emerald-950/50 lg:!flex"
                    value={dateFilter || filterAnchorDate}
                    allowedWeekdays={weekdayFilter == null ? availableFilterWeekdays : [weekdayFilter]}
                    dayTones={calendarDayTones}
                    showToneLegend
                    ariaLabel="Filtrar por fecha"
                    onChange={(nextDate) => {
                      setDateFilter(nextDate);
                      if (nextDate) {
                        selectWeekdayFilter(getLogisticsWeekdayIndex(nextDate));
                      }
                    }}
                  />
                  <button
                    type="button"
                    className={`${secondaryButtonClass} !hidden h-9 w-9 shrink-0 p-0 lg:!inline-flex`}
                    aria-label="Quitar filtro de día"
                    title="Ver todos los días"
                    onClick={() => selectWeekdayFilter(null)}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  className={`${primaryButtonClass} col-span-2 !h-9 w-full shrink-0 gap-1.5 px-2.5 text-xs font-black lg:w-auto`}
                  aria-label="Mostrando tareas de todos los días"
                  title="Mostrando todos los días"
                  onClick={() => selectWeekdayFilter(defaultWeekdayFilter)}
                >
                  <CalendarDays className="h-4 w-4" />
                  Todos los días
                </button>
              )}
            </div>

            <select
              className={`hidden box-border h-9 min-w-[12rem] shrink-0 rounded-lg border px-2.5 pr-8 text-sm font-black leading-none outline-none lg:block ${
                typeFilter
                  ? "border-emerald-500 bg-emerald-950/50 text-emerald-100"
                  : "border-black bg-surface-inset text-[#f8fafc]"
              }`}
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value)}
              aria-label="Filtrar tareas por acción"
            >
              <option value="">Todas las tareas</option>
              <option value="deliver_empty_box">Dejar cajas</option>
              <option value="pickup_full_box">Recoger cajas</option>
            </select>

            {routeTemplateFilter && toolbarRoute && canManageRoutes ? (
              <div
                className="order-4 flex h-9 min-w-0 flex-1 items-stretch overflow-hidden rounded-lg border border-emerald-500 bg-emerald-950/55 shadow-[inset_0_0_0_1px_rgba(16,185,129,0.15)] lg:order-none lg:flex-none"
                title={`Asigna un conductor a todas las guías de ${toolbarRoute.name}`}
              >
                <span className="inline-flex items-center gap-1 border-r border-emerald-500/60 bg-emerald-500/15 px-2.5 text-[10px] font-black uppercase tracking-wide text-emerald-200">
                  <Truck className="h-3.5 w-3.5 shrink-0" aria-hidden />
                  Asignar
                </span>
                <InlineSearchPicker
                  className="min-w-0 flex-1 lg:w-[11.5rem] lg:shrink-0"
                  minWidthClass="w-full min-w-0"
                  shellClassName="box-border inline-flex h-full w-full min-w-0 items-center gap-1.5 rounded-none border-0 bg-transparent px-2"
                  value={toolbarRoute.assignedTo || ""}
                  onChange={(nextValue) => requestToolbarRouteDriverChange(nextValue || null)}
                  options={routeDriverPickerOptions}
                  placeholder="Conductor…"
                  searchPlaceholder="Buscar chofer…"
                  emptyLabel="Sin conductores"
                  ariaLabel={`Asignar conductor a toda la ruta ${toolbarRoute.name}`}
                  disabled={toolbarRoute.status !== "draft" || busyId === `driver:${toolbarRoute.id}`}
                  formatSelectedLabel={(option) => option?.label || "Sin conductor"}
                />
              </div>
            ) : null}

            {selectedTasksCount ? (
              <button
                type="button"
                className={`${primaryButtonClass} order-4 !h-9 shrink-0 px-3 text-xs lg:order-none`}
                onClick={() => setRouteAssignmentOpen(true)}
              >
                <Route className="h-4 w-4" />
                Asignar {selectedTasksCount} a ruta
              </button>
            ) : null}

            <div className="relative order-2 shrink-0 lg:order-none">
              <button
                type="button"
                className={`${filtersOpen || hasFilters ? primaryButtonClass : secondaryButtonClass} !h-9 shrink-0 px-2.5 text-xs`}
                aria-expanded={filtersOpen}
                aria-label="Abrir filtros adicionales"
                onClick={() => setFiltersOpen((current) => !current)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                <span className="hidden sm:inline">Filtros</span>
              </button>

              {filtersOpen ? (
                <div className="absolute right-0 top-full z-[120] mt-2 grid w-[min(22rem,calc(100vw-2.5rem))] grid-cols-2 gap-2 rounded-xl border border-black bg-surface-card p-2 shadow-[0_16px_36px_rgba(0,0,0,0.45)] lg:left-0 lg:right-auto lg:flex lg:w-max lg:max-w-[calc(100vw-2rem)] lg:flex-wrap lg:items-center">
                  <div className="col-span-2 grid gap-1 grid-cols-4 lg:!hidden" aria-label="Secciones de logística">
                    <Link href="/logistica" className={`${primaryButtonClass} !h-11 min-w-0 flex-col gap-0.5 px-1 text-[10px]`}>
                      <ClipboardList className="h-3.5 w-3.5" aria-hidden />
                      Tareas
                    </Link>
                    <Link href="/logistica/conductores" className={`${secondaryButtonClass} !h-11 min-w-0 flex-col gap-0.5 px-1 text-[10px]`}>
                      <Users className="h-3.5 w-3.5" aria-hidden />
                      Choferes
                    </Link>
                    <Link href="/logistica/vehiculos" className={`${secondaryButtonClass} !h-11 min-w-0 flex-col gap-0.5 px-1 text-[10px]`}>
                      <Truck className="h-3.5 w-3.5" aria-hidden />
                      Flota
                    </Link>
                    <Link href="/logistica?view=rutas" className={`${secondaryButtonClass} !h-11 min-w-0 flex-col gap-0.5 px-1 text-[10px]`}>
                      <Route className="h-3.5 w-3.5" aria-hidden />
                      Rutas
                    </Link>
                  </div>

                  {agencyModuleEnabled ? (
                    <div className="col-span-2 grid h-9 grid-cols-2 rounded-lg border border-black bg-surface-inset p-0.5 text-xs font-black lg:!hidden">
                      <button type="button" className={`rounded-md px-2.5 ${operationScope === "domicilios" ? "bg-emerald-400 text-slate-950" : "text-slate-300"}`} onClick={() => setOperationScope("domicilios")}>Domicilios</button>
                      <button type="button" className="rounded-md px-2.5 text-slate-300" onClick={() => setOperationScope("agencias")}>Agencias</button>
                    </div>
                  ) : null}

                  <div className="col-span-2 grid h-9 grid-cols-2 rounded-lg border border-black bg-surface-inset p-0.5 text-xs font-black lg:!hidden">
                    <button
                      type="button"
                      className={`rounded-md px-2.5 ${!showRouteHistory ? "bg-emerald-400 text-slate-950" : "text-slate-300"}`}
                      onClick={() => setShowRouteHistory(false)}
                    >
                      Activas
                    </button>
                    <button
                      type="button"
                      className={`rounded-md px-2.5 ${showRouteHistory ? "bg-emerald-400 text-slate-950" : "text-slate-300"}`}
                      onClick={() => setShowRouteHistory(true)}
                    >
                      Historial
                    </button>
                  </div>

                  {weekdayFilter != null ? (
                    <>
                      <LogisticsWeekdayFilterSelect
                        value={weekdayFilter}
                        options={weekdayFilterOptions}
                        tones={weekdayTones}
                        onChange={selectWeekdayFilter}
                        ariaLabel="Filtrar por día"
                        className="min-w-0 lg:!hidden"
                      />
                      <InlineSearchPicker
                        className="min-w-0 lg:!hidden"
                        minWidthClass="w-full min-w-0"
                        value={routeTemplateFilter}
                        onChange={setRouteTemplateFilter}
                        options={filterRoutePickerOptions}
                        placeholder="Todas las rutas"
                        searchPlaceholder="Buscar ruta…"
                        emptyLabel="Sin rutas ese día"
                        ariaLabel="Filtrar por ruta del día"
                        leadingIcon={<Route className="h-4 w-4 text-emerald-300" aria-hidden />}
                      />
                    </>
                  ) : (
                    <button
                      type="button"
                      className={`${primaryButtonClass} col-span-2 !h-9 w-full gap-1.5 px-2.5 text-xs font-black lg:!hidden`}
                      onClick={() => selectWeekdayFilter(defaultWeekdayFilter)}
                    >
                      <CalendarDays className="h-4 w-4" />
                      Todos los días
                    </button>
                  )}

                  <select
                    className={`h-9 min-w-0 rounded-lg border px-2.5 pr-8 text-sm font-black leading-none outline-none lg:!hidden ${
                      typeFilter
                        ? "border-emerald-500 bg-emerald-950/50 text-emerald-100"
                        : "border-black bg-surface-inset text-[#f8fafc]"
                    }`}
                    value={typeFilter}
                    onChange={(event) => setTypeFilter(event.target.value)}
                    aria-label="Filtrar tareas por acción"
                  >
                    <option value="">Todas las tareas</option>
                    <option value="deliver_empty_box">Dejar cajas</option>
                    <option value="pickup_full_box">Recoger cajas</option>
                  </select>

                  {weekdayFilter != null ? (
                    <DateInput
                      className="min-w-0 border-emerald-500 bg-emerald-950/50 lg:!hidden"
                      value={dateFilter || filterAnchorDate}
                      allowedWeekdays={[weekdayFilter]}
                      dayTones={calendarDayTones}
                      showToneLegend
                      ariaLabel="Filtrar por fecha"
                      onChange={(nextDate) => {
                        setDateFilter(nextDate);
                        if (nextDate) {
                          selectWeekdayFilter(getLogisticsWeekdayIndex(nextDate));
                        }
                      }}
                    />
                  ) : null}
                  <InlineSearchPicker
                    className="min-w-0 lg:w-[9rem] lg:shrink-0"
                    minWidthClass="w-full min-w-0"
                    value={driverFilter}
                    onChange={setDriverFilter}
                    options={filterDriverPickerOptions}
                    placeholder="Todo chofer"
                    searchPlaceholder="Buscar chofer…"
                    emptyLabel="Sin conductores"
                    ariaLabel="Filtrar por chofer"
                    leadingIcon={<Truck className="h-4 w-4 text-emerald-300" aria-hidden />}
                  />

                  <select
                    className="h-9 min-w-0 rounded-lg border border-black bg-surface-inset px-2.5 text-sm font-black text-[#f8fafc] outline-none lg:w-[8rem] lg:shrink-0"
                    value={zoneFilter}
                    onChange={(event) => setZoneFilter(event.target.value)}
                    aria-label="Filtrar por zona"
                  >
                    <option value="">Toda zona</option>
                    {zoneOptions.map(([zoneKey, label]) => (
                      <option key={zoneKey} value={zoneKey}>
                        {label}
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    className={`${failedFilter ? primaryButtonClass : secondaryButtonClass} h-9 min-w-0 px-2.5 text-xs`}
                    onClick={() => setFailedFilter((current) => !current)}
                  >
                    Fallidas
                    {failedTasksCount ? (
                      <span className="rounded-full border border-black bg-surface-inset px-1.5 py-0.5 text-[10px] font-black">
                        {failedTasksCount}
                      </span>
                    ) : null}
                  </button>

                  <button
                    type="button"
                    className={`${secondaryButtonClass} h-9 min-w-0 px-2.5 disabled:opacity-50`}
                    disabled={!hasFilters}
                    onClick={() => {
                      setQuery("");
                      selectWeekdayFilter(defaultWeekdayFilter);
                      setTypeFilter("");
                      setDriverFilter("");
                      setZoneFilter("");
                      setFailedFilter(false);
                    }}
                  >
                    <XCircle className="h-4 w-4" />
                    Limpiar
                  </button>
                </div>
              ) : null}
            </div>

            <LogisticsSectionNav
              active="tasks"
              className="order-1 !hidden lg:order-none lg:ml-auto lg:!block"
            />
          </>
        ) : (
          <>
            <div className="relative order-1 ml-auto lg:!hidden">
              <button
                type="button"
                className={`${primaryButtonClass} !h-9 px-2.5 text-xs`}
                aria-expanded={filtersOpen}
                onClick={() => setFiltersOpen((current) => !current)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Opciones
              </button>
              {filtersOpen ? (
                <div className="absolute right-0 top-full z-[120] mt-2 grid w-[min(22rem,calc(100vw-2.5rem))] gap-2 rounded-xl border border-black bg-surface-card p-2 shadow-[0_16px_36px_rgba(0,0,0,0.45)]">
                  <div className="grid gap-1 grid-cols-4" aria-label="Secciones de logística">
                    <Link href="/logistica" className={`${primaryButtonClass} !h-11 min-w-0 flex-col gap-0.5 px-1 text-[10px]`}>
                      <ClipboardList className="h-3.5 w-3.5" aria-hidden />
                      Tareas
                    </Link>
                    <Link href="/logistica/conductores" className={`${secondaryButtonClass} !h-11 min-w-0 flex-col gap-0.5 px-1 text-[10px]`}>
                      <Users className="h-3.5 w-3.5" aria-hidden />
                      Choferes
                    </Link>
                    <Link href="/logistica/vehiculos" className={`${secondaryButtonClass} !h-11 min-w-0 flex-col gap-0.5 px-1 text-[10px]`}>
                      <Truck className="h-3.5 w-3.5" aria-hidden />
                      Flota
                    </Link>
                    <Link href="/logistica?view=rutas" className={`${secondaryButtonClass} !h-11 min-w-0 flex-col gap-0.5 px-1 text-[10px]`}>
                      <Route className="h-3.5 w-3.5" aria-hidden />
                      Rutas
                    </Link>
                  </div>
                  <div className="grid h-9 grid-cols-2 rounded-lg border border-black bg-surface-inset p-0.5 text-xs font-black">
                    <button type="button" className="rounded-md px-2.5 text-slate-300" onClick={() => setOperationScope("domicilios")}>Domicilios</button>
                    <button type="button" className="rounded-md bg-emerald-400 px-2.5 text-slate-950" onClick={() => setOperationScope("agencias")}>Agencias</button>
                  </div>
                </div>
              ) : null}
            </div>
            <LogisticsSectionNav active="tasks" className="order-1 !hidden lg:order-none lg:ml-auto lg:!block" />
          </>
        )}
      </div>
    </div>
  );
}
