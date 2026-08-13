"use client";

import {
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Route,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DatePickerCalendar } from "@/components/date-picker-calendar";
import { PickerPanelPortal } from "@/components/picker-panel-portal";
import type { LogisticsRouteRow } from "@/lib/logistics-routing";
import { logisticsWeekdayLabels } from "@/lib/logistics-route-catalog";
import { normalizeGenericLogisticsRouteName } from "@/lib/logistics-day-route";
import {
  dateIsInLogisticsOperationRange,
  logisticsOperationWeekRange,
  normalizeLogisticsOperationRange,
  selectLogisticsOperationRangeDate,
  shiftLogisticsOperationRange,
  type LogisticsOperationRange,
  type LogisticsOperationRangeSelectionPhase,
} from "@/lib/logistics-operation-range";
import {
  getLogisticsWeekdayIndex,
  resolveRouteDateForWeekday,
  startOfLogisticsWeek,
  type LogisticsWeekdayIndex,
} from "@/lib/logistics-route-week";
import { PICKER_PANEL_SELECTOR, resolveCalendarView } from "@/lib/date-picker";
import type { RouteMemberRow } from "@/lib/shipment-types";
import type { ViewLayout } from "@/lib/view-layout";
import {
  countLabel,
  formatRouteDate,
  routeBoxCountForTask,
  routeStatusChip,
} from "@/components/logistica/logistics-routes-workspace-details";

export const LOGISTICS_WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export function weekStartForOffset(offset: number) {
  const weekStart = startOfLogisticsWeek();
  weekStart.setDate(weekStart.getDate() + offset * 7);
  return weekStart;
}

function formatOperationRange(range: LogisticsOperationRange) {
  const start = new Date(`${range.from}T12:00:00`);
  const end = new Date(`${range.to}T12:00:00`);
  const formatter = new Intl.DateTimeFormat("es-US", {
    day: "numeric",
    month: "short",
    year: start.getFullYear() === end.getFullYear() ? undefined : "numeric",
  });
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

const routeHeaderWeekdayFormatter = new Intl.DateTimeFormat("es-US", {
  weekday: "short",
});
const routeHeaderMonthFormatter = new Intl.DateTimeFormat("es-US", {
  month: "short",
});

function formatRouteHeaderDate(value: string) {
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return { weekday: "FECHA", day: "—", month: value, year: "" };
  }
  return {
    weekday: routeHeaderWeekdayFormatter.format(parsed).replace(".", "").toLocaleUpperCase(),
    day: String(parsed.getDate()),
    month: routeHeaderMonthFormatter.format(parsed).replace(".", "").toLocaleUpperCase(),
    year: String(parsed.getFullYear()),
  };
}

const weekdayTabDateFormatter = new Intl.DateTimeFormat("es-US", {
  day: "numeric",
  month: "short",
});
const weekdayTabFullDateFormatter = new Intl.DateTimeFormat("es-US", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

function formatWeekdayTabDate(weekday: number, weekStart: Date) {
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) return null;
  const date = resolveRouteDateForWeekday(
    weekday as LogisticsWeekdayIndex,
    weekStart,
  );
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime()))
    return { date, shortLabel: date, fullLabel: date };
  return {
    date,
    shortLabel: weekdayTabDateFormatter.format(parsed),
    fullLabel: weekdayTabFullDateFormatter.format(parsed),
  };
}

function routeMatchesSearch(route: LogisticsRouteRow, query: string) {
  return [
    route.name,
    route.routeDate,
    route.notes,
    route.zoneKey,
    ...route.stops.flatMap((stop) => [
      stop.shipmentCode,
      stop.customerName,
      stop.address.name,
      stop.address.formattedAddress,
      stop.address.city,
      stop.address.postalCode,
    ]),
  ].some((value) =>
    String(value || "")
      .toLocaleLowerCase()
      .includes(query),
  );
}

export function LogisticsWeekNavigator({
  weekOffset,
  onWeekOffsetChange,
  onWeekChange,
  customDateRange,
  onCustomDateRangeChange,
  weekSummaries,
  children,
}: {
  weekOffset: number;
  onWeekOffsetChange: (delta: number) => void;
  onWeekChange?: () => void;
  customDateRange?: LogisticsOperationRange | null;
  onCustomDateRangeChange?: (range: LogisticsOperationRange | null) => void;
  weekSummaries?: Array<{ offset: number; count: number }>;
  children?: ReactNode;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const activeRange =
    customDateRange ?? logisticsOperationWeekRange(weekOffset);
  const todaySummaryCount = weekSummaries?.find((summary) => summary.offset === 0)?.count ?? 0;
  const [draftRange, setDraftRange] = useState(activeRange);
  const [selectionPhase, setSelectionPhase] =
    useState<LogisticsOperationRangeSelectionPhase>("start");
  const initialCalendarView = resolveCalendarView(activeRange.from);
  const [viewYear, setViewYear] = useState(initialCalendarView.year);
  const [viewMonth, setViewMonth] = useState(initialCalendarView.month);

  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const panelWidth = Math.min(352, window.innerWidth - 16);
    const left = Math.max(
      8,
      Math.min(rect.left, window.innerWidth - panelWidth - 8),
    );
    const top =
      rect.bottom + 6 + 430 > window.innerHeight
        ? Math.max(8, rect.top - 436)
        : rect.bottom + 6;
    setPanelPosition({ top, left });
  }, []);

  const closePicker = useCallback(() => {
    setOpen(false);
    setPanelPosition(null);
  }, []);

  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node) || triggerRef.current?.contains(target))
        return;
      if (
        target instanceof Element &&
        (target.closest("[data-operation-range-panel]") ||
          target.closest(PICKER_PANEL_SELECTOR))
      )
        return;
      closePicker();
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePicker();
    };
    window.addEventListener("pointerdown", closeOnOutsidePointer);
    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    return () => {
      window.removeEventListener("pointerdown", closeOnOutsidePointer);
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
    };
  }, [closePicker, open, updatePanelPosition]);

  function moveWeek(delta: number) {
    if (customDateRange && onCustomDateRangeChange) {
      onCustomDateRangeChange(
        shiftLogisticsOperationRange(customDateRange, delta < 0 ? -1 : 1),
      );
      onWeekChange?.();
      return;
    }
    onWeekOffsetChange(delta);
    onWeekChange?.();
  }

  function openPicker() {
    if (!onCustomDateRangeChange) return;
    setDraftRange(activeRange);
    setSelectionPhase("start");
    const nextView = resolveCalendarView(activeRange.from);
    setViewYear(nextView.year);
    setViewMonth(nextView.month);
    updatePanelPosition();
    setOpen(true);
  }

  function pickRangeDate(date: string) {
    const selection = selectLogisticsOperationRangeDate(
      draftRange,
      selectionPhase,
      date,
    );
    setDraftRange(selection.range);
    setSelectionPhase(selection.phase);
  }

  function applyRange() {
    onCustomDateRangeChange?.(normalizeLogisticsOperationRange(draftRange));
    onWeekChange?.();
    closePicker();
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }

  function returnToCurrentWeek() {
    onCustomDateRangeChange?.(null);
    if (weekOffset !== 0) onWeekOffsetChange(-weekOffset);
    onWeekChange?.();
  }

  return (
    <div className="flex min-w-0 items-center gap-1 overflow-x-auto border-b border-black bg-surface-inset/35 px-2 py-1 [scrollbar-width:none] sm:px-3 [&::-webkit-scrollbar]:hidden">
      <button
        ref={triggerRef}
        type="button"
        className="flex h-8 shrink-0 items-center gap-1.5 rounded-md px-1 text-left transition hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
        onClick={() => (open ? closePicker() : openPicker())}
        aria-label="Seleccionar un rango de fechas personalizado"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Seleccionar rango de fechas"
      >
        <CalendarDays className="h-3.5 w-3.5 shrink-0 text-slate-400" />
        <span className="text-[0px] font-black text-slate-200">
          {customDateRange ? "Rango de operación" : "Semana de operación"}:{" "}
          <span className="text-xs">{formatOperationRange(activeRange)}</span>
        </span>
      </button>
      <div className="flex shrink-0 items-center gap-0.5 rounded-md border border-black bg-surface-card p-0.5">
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-black text-slate-300 hover:bg-white/10"
          onClick={() => moveWeek(-1)}
          aria-label="Semana anterior"
          title="Semana anterior"
        >
          <ChevronLeft className="h-3 w-3" />
        </button>
        {
          <button
            type="button"
            className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11px] font-black text-slate-300 hover:bg-white/10"
            onClick={returnToCurrentWeek}
          >
            Hoy
            {todaySummaryCount ? <span className="rounded-full bg-amber-400/20 px-1 text-[10px] text-amber-100">{todaySummaryCount}</span> : null}
          </button>
        }
        <button
          type="button"
          className="inline-flex h-7 w-7 items-center justify-center rounded-md text-[11px] font-black text-slate-300 hover:bg-white/10"
          onClick={() => moveWeek(1)}
          aria-label="Semana siguiente"
          title="Semana siguiente"
        >
          <ChevronRight className="h-3 w-3" />
        </button>
      </div>
      {!customDateRange && weekSummaries?.length ? (
        <div
          className="flex min-w-0 shrink-0 items-center gap-0.5 border-l border-slate-700 pl-1"
          aria-label="Semanas con trabajo pendiente"
        >
          {weekSummaries.filter((summary) => summary.offset !== 0).map((summary) => {
            const range = logisticsOperationWeekRange(summary.offset);
            const selected = summary.offset === weekOffset;
            const rangeLabel = formatOperationRange(range);
            return (
              <button
                key={summary.offset}
                type="button"
                onClick={() => {
                  if (!selected)
                    onWeekOffsetChange(summary.offset - weekOffset);
                  onWeekChange?.();
                }}
                className={`relative h-7 min-w-7 rounded-md border px-1 text-[10px] font-black transition ${selected ? "border-emerald-300 bg-emerald-400 text-slate-950" : summary.count ? "border-amber-400/70 bg-amber-400/10 text-amber-100 hover:bg-amber-400/20" : "border-slate-700 bg-surface-card text-slate-500 hover:text-slate-300"}`}
                title={`${rangeLabel}: ${summary.count ? `${summary.count} pendiente${summary.count === 1 ? "" : "s"}` : "sin pendientes"}`}
                aria-label={`${rangeLabel}: ${summary.count ? `${summary.count} pendientes` : "sin pendientes"}`}
              >
                <span>
                  {summary.offset === 0
                    ? "Hoy"
                    : summary.offset > 0
                      ? `+${summary.offset}`
                      : summary.offset}
                </span>
                {summary.count ? (
                  <span
                    className={`ml-1 rounded-full px-1 ${selected ? "bg-slate-950/15" : "bg-amber-400 text-slate-950"}`}
                  >
                    {summary.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      ) : null}
      {children}
      <PickerPanelPortal open={open} position={panelPosition}>
        <div
          data-operation-range-panel
          role="dialog"
          aria-label="Seleccionar rango de fechas de operación"
          className="w-[min(22rem,calc(100vw-1rem))] overflow-hidden rounded-lg border border-black bg-surface-card shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="border-b border-black bg-[#1a221f] px-3 py-2.5">
            <p className="text-sm font-black text-slate-100">
              Rango personalizado
            </p>
            <p
              className="mt-0.5 text-[11px] font-bold text-slate-400"
              aria-live="polite"
            >
              {selectionPhase === "start"
                ? `Selecciona la fecha inicial · ${formatOperationRange(draftRange)}`
                : selectionPhase === "end"
                  ? `Ahora selecciona la fecha final · Inicio: ${formatOperationRange({ from: draftRange.from, to: draftRange.from })}`
                  : `Rango seleccionado: ${formatOperationRange(draftRange)}`}
            </p>
          </div>
          <DatePickerCalendar
            value=""
            rangeStart={draftRange.from}
            rangeEnd={draftRange.to}
            viewYear={viewYear}
            viewMonth={viewMonth}
            embedded
            onChange={pickRangeDate}
            onViewChange={(year, month) => {
              setViewYear(year);
              setViewMonth(month);
            }}
          />
          <div className="grid grid-cols-2 gap-2 border-t border-black p-3">
            <button
              type="button"
              className="h-9 rounded-md border border-black bg-surface-panel px-3 text-xs font-black text-slate-300 hover:bg-white/10"
              onClick={closePicker}
            >
              Cancelar
            </button>
            <button
              type="button"
              className="h-9 rounded-md bg-emerald-400 px-3 text-xs font-black text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={selectionPhase === "end"}
              onClick={applyRange}
            >
              Aplicar rango
            </button>
          </div>
        </div>
      </PickerPanelPortal>
    </div>
  );
}

export function LogisticsWeekdayTabs({
  weekdays,
  selectedWeekday,
  onSelect,
  panelId,
  compact = false,
  counts,
  weekStart,
}: {
  weekdays: number[];
  selectedWeekday: number | null;
  onSelect: (weekday: number) => void;
  panelId?: string;
  compact?: boolean;
  counts?: Record<number, number>;
  weekStart?: Date;
}) {
  const visibleWeekdays = counts
    ? weekdays.filter((weekday) => (counts[weekday] ?? 0) > 0)
    : weekdays;
  return (
    <div
      className={
        compact
          ? "flex max-w-full shrink-0 gap-1 overflow-x-auto rounded-md border border-black bg-surface-card p-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          : "flex gap-1 overflow-x-auto border-b border-black bg-surface-inset/35 p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      }
      role="tablist"
      aria-label="Días de operación"
    >
      {visibleWeekdays.map((weekday) => {
        const selected = weekday === selectedWeekday;
        const count = counts?.[weekday] ?? 0;
        const dateLabel = weekStart
          ? formatWeekdayTabDate(weekday, weekStart)
          : null;
        const dayLabel = logisticsWeekdayLabels[weekday] || "Día";
        const requestCountLabel =
          count === 1 ? "1 solicitud" : `${count} solicitudes`;
        const accessibleLabel = dateLabel
          ? `${dateLabel.fullLabel}${counts ? ` · ${requestCountLabel}` : ""}`
          : `${dayLabel}${counts ? ` · ${requestCountLabel}` : ""}`;
        return (
          <button
            key={weekday}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            aria-label={accessibleLabel}
            title={accessibleLabel}
            onClick={() => onSelect(weekday)}
            className={`inline-flex shrink-0 items-center gap-2 rounded-md px-2.5 ${dateLabel ? "py-1" : "py-1.5"} text-xs font-black transition-colors ${selected ? "bg-emerald-400 text-slate-950" : "text-slate-400 hover:bg-white/10 hover:text-slate-200"}`}
          >
            <span
              className={
                compact
                  ? "inline-flex items-baseline gap-1"
                  : "flex min-w-0 flex-col items-start leading-tight"
              }
            >
              <span>{dayLabel}</span>
              {dateLabel ? (
                <time
                  dateTime={dateLabel.date}
                  className={`text-[10px] font-bold ${selected ? "text-slate-950/75" : "text-slate-500"}`}
                >
                  {dateLabel.shortLabel}
                </time>
              ) : null}
            </span>
            {counts ? (
              <span
                aria-label={requestCountLabel}
                className={`min-w-4 rounded px-1 text-center text-[10px] leading-4 ${selected ? "bg-slate-950/15" : count ? "bg-slate-700 text-slate-200" : "bg-slate-800/60 text-slate-500"}`}
              >
                {count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

export function LogisticsUnifiedRouteList({
  routes,
  availableWeekdays,
  routeMembers,
  onOpenRoute,
  onWeekChange,
  onWeekOffsetChange,
  onWeekdayChange,
  customDateRange,
  onCustomDateRangeChange,
  query = "",
  selectedRouteId,
  selectedWeekday,
  weekOffset,
  weekSummaries,
  viewLayout = "rows",
}: {
  routes: LogisticsRouteRow[];
  availableWeekdays: number[];
  routeMembers: RouteMemberRow[];
  onOpenRoute: (route: LogisticsRouteRow) => void;
  onWeekChange?: () => void;
  onWeekOffsetChange?: (delta: number) => void;
  onWeekdayChange?: (weekday: number) => void;
  customDateRange?: LogisticsOperationRange | null;
  onCustomDateRangeChange?: (range: LogisticsOperationRange | null) => void;
  query?: string;
  selectedRouteId?: string;
  selectedWeekday?: number | null;
  weekOffset?: number;
  weekSummaries?: Array<{ offset: number; count: number }>;
  viewLayout?: ViewLayout;
}) {
  const [internalWeekOffset, setInternalWeekOffset] = useState(0);
  const [internalSelectedWeekday, setInternalSelectedWeekday] = useState<
    number | null
  >(null);
  const [internalCustomDateRange, setInternalCustomDateRange] =
    useState<LogisticsOperationRange | null>(null);
  const [expandedRouteId, setExpandedRouteId] = useState<string | null>(null);
  const resolvedWeekOffset =
    weekOffset === undefined ? internalWeekOffset : weekOffset;
  const resolvedSelectedWeekday =
    selectedWeekday === undefined ? internalSelectedWeekday : selectedWeekday;
  const resolvedCustomDateRange =
    customDateRange === undefined ? internalCustomDateRange : customDateRange;
  const weekStart = weekStartForOffset(resolvedWeekOffset);
  const weekEnd = new Date(
    weekStart.getFullYear(),
    weekStart.getMonth(),
    weekStart.getDate() + 6,
    12,
  );
  const activeWeekday =
    resolvedSelectedWeekday != null &&
    availableWeekdays.includes(resolvedSelectedWeekday)
      ? resolvedSelectedWeekday
      : (availableWeekdays[0] ?? null);
  const memberById = new Map(
    routeMembers.map((member) => [member.id, member.label]),
  );
  const searchQuery = query.trim().toLocaleLowerCase();
  const visibleRoutes = routes
    .filter((route) => {
      if (!(
        route.status === "draft" ||
        route.status === "planned" ||
        route.status === "in_progress"
      ))
        return false;
      const routeDate = new Date(`${route.routeDate}T12:00:00`);
      if (Number.isNaN(routeDate.getTime())) return false;
      if (resolvedCustomDateRange) {
        if (
          !dateIsInLogisticsOperationRange(
            route.routeDate,
            resolvedCustomDateRange,
          )
        )
          return false;
      } else if (routeDate < weekStart || routeDate > weekEnd) return false;
      if (
        activeWeekday != null &&
        getLogisticsWeekdayIndex(route.routeDate) !== activeWeekday
      )
        return false;
      return !searchQuery || routeMatchesSearch(route, searchQuery);
    })
    .sort(
      (left, right) =>
        left.routeDate.localeCompare(right.routeDate) ||
        left.name.localeCompare(right.name),
    );

  function changeWeekOffset(delta: number) {
    if (onWeekOffsetChange) onWeekOffsetChange(delta);
    else setInternalWeekOffset((current) => current + delta);
  }

  function changeWeekday(weekday: number) {
    if (onWeekdayChange) onWeekdayChange(weekday);
    else setInternalSelectedWeekday(weekday);
  }

  function changeCustomDateRange(range: LogisticsOperationRange | null) {
    if (onCustomDateRangeChange) onCustomDateRangeChange(range);
    else setInternalCustomDateRange(range);
  }

  function routeSummary(route: LogisticsRouteRow) {
    return {
      driver: route.assignedTo
        ? memberById.get(route.assignedTo) || "Conductor"
        : "Sin conductor",
      deliveryBoxes: routeBoxCountForTask(route, "deliver_empty_box"),
      pickupBoxes: routeBoxCountForTask(route, "pickup_full_box"),
      routeName: normalizeGenericLogisticsRouteName(
        route.name,
        getLogisticsWeekdayIndex(route.routeDate),
      ),
    };
  }

  return (
    <section className="overflow-hidden rounded-xl border border-black bg-surface-panel">
      <LogisticsWeekNavigator
        weekOffset={resolvedWeekOffset}
        weekSummaries={weekSummaries}
        onWeekOffsetChange={changeWeekOffset}
        onWeekChange={onWeekChange}
        customDateRange={resolvedCustomDateRange}
        onCustomDateRangeChange={changeCustomDateRange}
      >
        <LogisticsWeekdayTabs
          weekdays={availableWeekdays}
          selectedWeekday={activeWeekday}
          onSelect={changeWeekday}
          panelId="logistics-route-day-panel"
          weekStart={resolvedCustomDateRange ? undefined : weekStart}
          compact
        />
      </LogisticsWeekNavigator>
      <div
        id="logistics-route-day-panel"
        role="tabpanel"
        aria-label={
          activeWeekday == null
            ? "Rutas reales"
            : `Rutas reales del ${logisticsWeekdayLabels[activeWeekday] || "día"}`
        }
      >
        {visibleRoutes.length && viewLayout === "excel" ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-xs">
              <caption className="sr-only">Rutas reales en vista tabla</caption>
              <thead className="sticky top-0 z-10 bg-surface-card-header text-[10px] font-black uppercase tracking-wide text-slate-400">
                <tr>
                  <th className="border-b border-black px-3 py-2">Ruta</th>
                  <th className="border-b border-black px-3 py-2">Fecha</th>
                  <th className="border-b border-black px-3 py-2">Estado</th>
                  <th className="border-b border-black px-3 py-2">Paradas</th>
                  <th className="border-b border-black px-3 py-2">Cajas</th>
                  <th className="border-b border-black px-3 py-2">Conductor</th>
                </tr>
              </thead>
              <tbody>
                {visibleRoutes.map((route) => {
                  const summary = routeSummary(route);
                  return (
                    <tr
                      key={route.id}
                      tabIndex={0}
                      onClick={() => onOpenRoute(route)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          onOpenRoute(route);
                        }
                      }}
                      className={`cursor-pointer text-slate-200 transition hover:bg-surface-inset focus-visible:bg-surface-inset focus-visible:outline-none ${route.id === selectedRouteId ? "bg-emerald-400/[0.07]" : ""}`}
                    >
                      <td className="border-b border-black/70 px-3 py-2 font-black text-white">
                        {summary.routeName}
                      </td>
                      <td className="border-b border-black/70 px-3 py-2 font-bold">
                        {formatRouteDate(route.routeDate)}
                      </td>
                      <td className="border-b border-black/70 px-3 py-2">
                        {routeStatusChip(route.status)}
                      </td>
                      <td className="border-b border-black/70 px-3 py-2 font-black">
                        {route.stops.length}
                      </td>
                      <td className="border-b border-black/70 px-3 py-2 font-bold">
                        {countLabel(
                          summary.deliveryBoxes,
                          "caja para entregar",
                          "cajas para entregar",
                        )}
                        {summary.pickupBoxes
                          ? ` · ${countLabel(summary.pickupBoxes, "caja para recoger", "cajas para recoger")}`
                          : ""}
                      </td>
                      <td className="border-b border-black/70 px-3 py-2 font-bold">
                        {summary.driver}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : visibleRoutes.length ? (
          <div
            className={
              viewLayout === "cards"
                ? "grid gap-3 p-3 md:grid-cols-2 2xl:grid-cols-3"
                : "grid gap-2 p-2"
            }
          >
            {visibleRoutes.map((route) => {
              const summary = routeSummary(route);
              const expanded = expandedRouteId === route.id;
              const headerDate = formatRouteHeaderDate(route.routeDate);
              return (
                <div
                  key={route.id}
                  className={`overflow-hidden rounded-xl border bg-surface-card shadow-sm transition-all ${
                    expanded
                      ? "border-emerald-400/70 ring-1 ring-emerald-400/20"
                      : "border-black hover:border-emerald-500/40"
                  }`}
                >
                  <button
                    type="button"
                    id={`route-trigger-${route.id}`}
                    className={`group grid w-full min-w-0 cursor-pointer grid-cols-[4.25rem_minmax(0,1fr)] items-stretch bg-surface-card-header text-left transition-colors hover:bg-white/[0.07] focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400 sm:grid-cols-[4.75rem_minmax(0,1fr)_8.5rem] ${viewLayout === "cards" ? "min-h-36" : ""} ${route.id === selectedRouteId ? "bg-emerald-400/[0.07]" : ""}`}
                    onClick={() => {
                      setExpandedRouteId(expanded ? null : route.id);
                      onOpenRoute(route);
                    }}
                    aria-expanded={expanded}
                    aria-controls={`route-stops-${route.id}`}
                  >
                    <span className={`flex min-h-24 flex-col items-center justify-center border-r border-black px-2 text-center transition-colors ${expanded ? "bg-emerald-400/15" : "bg-surface-inset group-hover:bg-emerald-400/10"}`}>
                      <span className="text-[10px] font-black tracking-[0.18em] text-emerald-300">
                        {headerDate.weekday}
                      </span>
                      <span className="text-3xl font-black leading-none text-white">
                        {headerDate.day}
                      </span>
                      <span className="mt-1 text-[10px] font-black tracking-wide text-slate-400">
                        {headerDate.month} {headerDate.year}
                      </span>
                    </span>
                    <span className="min-w-0 self-center px-4 py-3">
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-base font-black text-white">
                          {summary.routeName}
                        </span>
                        {routeStatusChip(route.status)}
                      </span>
                      <span className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
                        <span className="flex flex-col">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Entregar</span>
                          <span className="text-xs font-black text-emerald-200">
                            {countLabel(summary.deliveryBoxes, "caja", "cajas")}
                          </span>
                        </span>
                        <span className="flex flex-col">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Recoger</span>
                          <span className="text-xs font-black text-amber-200">
                            {countLabel(summary.pickupBoxes, "caja", "cajas")}
                          </span>
                        </span>
                        <span className="flex min-w-0 flex-col">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Conductor</span>
                          <span className="truncate text-xs font-black text-slate-200">{summary.driver}</span>
                        </span>
                      </span>
                    </span>
                    <span className={`col-span-2 flex min-h-11 items-center justify-between gap-3 border-t border-black px-4 transition-colors sm:col-auto sm:min-h-24 sm:flex-col sm:justify-center sm:border-l sm:border-t-0 sm:px-3 ${expanded ? "bg-emerald-400/15 text-emerald-100" : "bg-surface-inset text-slate-200 group-hover:bg-emerald-400/10 group-hover:text-emerald-100"}`}>
                      <span className="inline-flex items-baseline gap-1 sm:flex-col sm:items-center sm:gap-0">
                        <span className="text-xl font-black leading-none sm:text-2xl">{route.stops.length}</span>
                        <span className="text-[10px] font-black uppercase tracking-wider">
                          {route.stops.length === 1 ? "parada" : "paradas"}
                        </span>
                      </span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full border border-current/30">
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                          aria-hidden
                        />
                      </span>
                      <span className="sr-only">{expanded ? "Ocultar paradas" : "Mostrar paradas"}</span>
                    </span>
                  </button>
                  {expanded ? (
                    <div
                      id={`route-stops-${route.id}`}
                      className="border-t border-emerald-400/30 bg-surface-inset"
                    >
                      <ol className="divide-y divide-black/70">
                        {route.stops.map((stop, index) => (
                          <li
                            key={stop.id}
                            className="grid gap-2 px-4 py-3 text-xs sm:grid-cols-[2rem_minmax(0,1fr)_minmax(12rem,0.7fr)] sm:items-start"
                          >
                            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-400 text-xs font-black text-slate-950">
                              {index + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                                <span className="font-black text-white">
                                  {stop.shipmentCode || "Sin invoice"}
                                </span>
                                <span className="font-bold text-slate-200">
                                  {stop.customerName ||
                                    stop.address.name ||
                                    "Cliente sin nombre"}
                                </span>
                              </p>
                              {stop.address.name &&
                              stop.address.name !== stop.customerName ? (
                                <p className="mt-1 font-bold text-slate-300">
                                  Contacto: {stop.address.name}
                                </p>
                              ) : null}
                              <p className="mt-1 break-words font-bold text-slate-400">
                                {stop.address.formattedAddress ||
                                  "Dirección incompleta"}
                              </p>
                              {stop.address.phone ? (
                                <a
                                  className="mt-1 inline-block font-black text-sky-200 hover:text-sky-100"
                                  href={`tel:${stop.address.phone}`}
                                >
                                  {stop.address.phone}
                                </a>
                              ) : (
                                <p className="mt-1 font-bold text-slate-500">
                                  Sin teléfono
                                </p>
                              )}
                            </div>
                            <div className="min-w-0 rounded-md border border-black bg-surface-card px-3 py-2">
                              <p
                                className={
                                  stop.taskType === "pickup_full_box"
                                    ? "font-black text-amber-200"
                                    : "font-black text-emerald-200"
                                }
                              >
                                {stop.taskType === "pickup_full_box"
                                  ? "Recoger"
                                  : "Dejar"}{" "}
                                ·{" "}
                                {countLabel(
                                  stop.boxCount || 0,
                                  "caja",
                                  "cajas",
                                )}
                              </p>
                              <p className="mt-1 break-words font-bold text-slate-300">
                                {stop.boxSummary || "Medidas no registradas"}
                              </p>
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-4 py-10 text-center">
            <Route className="mx-auto h-7 w-7 text-slate-600" />
            <p className="mt-2 text-sm font-black text-slate-400">
              {searchQuery
                ? "No encontramos rutas con esa búsqueda."
                : availableWeekdays.length
                  ? "No hay rutas creadas para este día."
                  : resolvedCustomDateRange
                    ? "No hay rutas creadas en el rango seleccionado."
                    : "No hay rutas creadas en esta semana."}
            </p>
            <p className="mt-1 text-xs font-bold text-slate-500">
              Los grupos aparecen aquí como rutas cerradas después de
              confirmarlos en Preparación.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
