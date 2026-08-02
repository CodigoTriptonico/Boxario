import { formatScheduleDateInput } from "@/lib/schedule-date";
import {
  resolveRouteDateForWeekday,
  startOfLogisticsWeek,
  type LogisticsWeekdayIndex,
} from "@/lib/logistics-route-week";

/** Default page size for logistics route lists (server-side). */
export const LOGISTICS_ROUTES_PAGE_SIZE = 50;

/** Hard cap for listLogisticsRoutesAction limit. */
export const LOGISTICS_ROUTES_MAX_PAGE_SIZE = 200;

type LogisticsRoutesStatusMode = "active" | "history" | "all";

export type ListLogisticsRoutesOptions = {
  limit?: number;
  offset?: number;
  /** Exact YYYY-MM-DD */
  routeDate?: string;
  assignedTo?: string;
  zoneKey?: string;
  routeTemplateId?: string;
  /** 0-6 (Mon–Sun) when no exact routeDate */
  weekday?: number;
  /**
   * active = not cancelled/completed;
   * history = completed only;
   * all = exclude cancelled (matches board UX).
   */
  statusMode?: LogisticsRoutesStatusMode;
  /** Route name ilike */
  search?: string;
};

export function clampLogisticsRoutesLimit(limit?: number): number {
  return Math.min(Math.max(limit ?? LOGISTICS_ROUTES_PAGE_SIZE, 1), LOGISTICS_ROUTES_MAX_PAGE_SIZE);
}

export function clampLogisticsRoutesOffset(offset?: number): number {
  return Math.max(offset ?? 0, 0);
}

/**
 * Bounded date list for weekday-only server filters (PostgREST has no EXTRACT).
 * Covers past/future operational windows without dumping the full org.
 */
export function logisticsRoutesDatesForWeekday(
  weekday: number,
  options?: { pastWeeks?: number; futureWeeks?: number; from?: Date },
): string[] {
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    return [];
  }

  const pastWeeks = options?.pastWeeks ?? 52;
  const futureWeeks = options?.futureWeeks ?? 8;
  const from = options?.from ?? new Date();
  const weekStart = startOfLogisticsWeek(from);
  const dates: string[] = [];

  for (let week = -pastWeeks; week <= futureWeeks; week += 1) {
    const anchor = new Date(weekStart);
    anchor.setDate(anchor.getDate() + week * 7);
    dates.push(resolveRouteDateForWeekday(weekday as LogisticsWeekdayIndex, anchor));
  }

  return dates;
}

/** Build server list filters from the logistics board toolbar state. */
export function buildLogisticsRoutesListFilters(input: {
  dateFilter?: string;
  weekdayFilter?: number | null;
  driverFilter?: string;
  zoneFilter?: string;
  routeTemplateFilter?: string;
  showRouteHistory?: boolean;
}): ListLogisticsRoutesOptions {
  const routeDate = String(input.dateFilter || "").trim();
  const weekday = input.weekdayFilter;
  const assignedTo = String(input.driverFilter || "").trim();
  const zoneKey = String(input.zoneFilter || "").trim();
  const routeTemplateId = String(input.routeTemplateFilter || "").trim();

  return {
    routeDate: routeDate || undefined,
    weekday:
      !routeDate && weekday != null && Number.isInteger(weekday) && weekday >= 0 && weekday <= 6
        ? weekday
        : undefined,
    assignedTo: assignedTo || undefined,
    zoneKey: zoneKey || undefined,
    routeTemplateId: routeTemplateId || undefined,
    statusMode: input.showRouteHistory ? "history" : "active",
  };
}

/** Default SSR/bootstrap filters: active routes for today when possible. */
export function defaultLogisticsRoutesListFilters(from: Date = new Date()): ListLogisticsRoutesOptions {
  return {
    routeDate: formatScheduleDateInput(from),
    statusMode: "active",
    limit: LOGISTICS_ROUTES_PAGE_SIZE,
    offset: 0,
  };
}

/** Stable key for effect deps when comparing filter snapshots. */
export function logisticsRoutesListFiltersKey(filters: ListLogisticsRoutesOptions): string {
  return [
    filters.routeDate || "",
    filters.assignedTo || "",
    filters.zoneKey || "",
    filters.routeTemplateId || "",
    filters.weekday == null ? "" : String(filters.weekday),
    filters.statusMode || "",
    filters.search || "",
  ].join("|");
}
