import type { StatisticsDashboardInput, StatisticsFilters } from "@/lib/statistics/types";

export type StatisticsPeriodPreset =
  | "today"
  | "yesterday"
  | "last7"
  | "last30"
  | "thisMonth"
  | "previousMonth"
  | "thisYear"
  | "custom";

export type StatisticsWorkspaceTab = "company" | "logistics" | "risks";

export type StatisticsUrlState = StatisticsDashboardInput & {
  preset: StatisticsPeriodPreset;
  tab: StatisticsWorkspaceTab;
};

export const PERIOD_PRESETS: Array<{ value: StatisticsPeriodPreset; label: string }> = [
  { value: "today", label: "Hoy" },
  { value: "yesterday", label: "Ayer" },
  { value: "last7", label: "Últimos 7 días" },
  { value: "last30", label: "Últimos 30 días" },
  { value: "thisMonth", label: "Este mes" },
  { value: "previousMonth", label: "Mes anterior" },
  { value: "thisYear", label: "Este año" },
  { value: "custom", label: "Rango personalizado" },
];

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function asUtcDate(key: string) {
  return new Date(`${key}T12:00:00.000Z`);
}

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function shiftDays(key: string, amount: number) {
  const date = asUtcDate(key);
  date.setUTCDate(date.getUTCDate() + amount);
  return dateKey(date);
}

function daysBetween(from: string, to: string) {
  return Math.round((asUtcDate(to).getTime() - asUtcDate(from).getTime()) / 86_400_000) + 1;
}

function monthStart(key: string) {
  return `${key.slice(0, 7)}-01`;
}

function yearStart(key: string) {
  return `${key.slice(0, 4)}-01-01`;
}

function previousMonthKey(key: string) {
  const date = asUtcDate(monthStart(key));
  date.setUTCMonth(date.getUTCMonth() - 1);
  return dateKey(date);
}

function monthEnd(key: string) {
  const date = asUtcDate(monthStart(key));
  date.setUTCMonth(date.getUTCMonth() + 1);
  date.setUTCDate(0);
  return dateKey(date);
}

export function todayInStatisticsTimeZone(timeZone = "America/Los_Angeles") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const read = (part: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === part)?.value ?? "";
  return `${read("year")}-${read("month")}-${read("day")}`;
}

export function resolveStatisticsPeriod(
  preset: StatisticsPeriodPreset,
  today = todayInStatisticsTimeZone(),
  custom?: { from?: string | null; to?: string | null },
): Omit<StatisticsDashboardInput, "filters"> {
  let from = today;
  let to = today;

  if (preset === "yesterday") {
    from = shiftDays(today, -1);
    to = from;
  } else if (preset === "last7") {
    from = shiftDays(today, -6);
  } else if (preset === "last30") {
    from = shiftDays(today, -29);
  } else if (preset === "thisMonth") {
    from = monthStart(today);
  } else if (preset === "previousMonth") {
    from = previousMonthKey(today);
    to = monthEnd(from);
  } else if (preset === "thisYear") {
    from = yearStart(today);
  } else if (preset === "custom") {
    const candidateFrom = custom?.from && DATE_KEY.test(custom.from) ? custom.from : shiftDays(today, -6);
    const candidateTo = custom?.to && DATE_KEY.test(custom.to) ? custom.to : today;
    from = candidateFrom <= candidateTo ? candidateFrom : candidateTo;
    to = candidateFrom <= candidateTo ? candidateTo : candidateFrom;
    if (daysBetween(from, to) > 366) from = shiftDays(to, -365);
  }

  const duration = daysBetween(from, to);
  const compareTo = shiftDays(from, -1);
  const compareFrom = shiftDays(compareTo, -(duration - 1));
  return { from, to, compareFrom, compareTo };
}

const FILTER_KEYS: Array<keyof StatisticsFilters> = [
  "agencyId",
  "country",
  "sellerId",
  "routeId",
  "driverId",
  "shipmentStatus",
  "operationType",
  "productKey",
];

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function statisticsStateFromParams(
  params: Record<string, string | string[] | undefined>,
  today = todayInStatisticsTimeZone(),
): StatisticsUrlState {
  const rawPreset = firstParam(params.period);
  const rawTab = firstParam(params.tab);
  const tab: StatisticsWorkspaceTab = rawTab === "logistics" || rawTab === "risks" ? rawTab : "company";
  const preset = PERIOD_PRESETS.some((item) => item.value === rawPreset)
    ? (rawPreset as StatisticsPeriodPreset)
    : "last7";
  const period = resolveStatisticsPeriod(preset, today, {
    from: firstParam(params.from),
    to: firstParam(params.to),
  });
  const filters: StatisticsFilters = {};
  for (const key of FILTER_KEYS) {
    const value = firstParam(params[key]);
    if (value) filters[key] = value;
  }
  return { preset, tab, ...period, filters };
}

export function statisticsStateFromSearchParams(params: URLSearchParams) {
  const record: Record<string, string | undefined> = {};
  params.forEach((value, key) => {
    record[key] = value;
  });
  return statisticsStateFromParams(record);
}

export function statisticsStateToSearchParams(state: StatisticsUrlState) {
  const params = new URLSearchParams();
  params.set("period", state.preset);
  if (state.tab !== "company") params.set("tab", state.tab);
  if (state.preset === "custom") {
    params.set("from", state.from);
    params.set("to", state.to);
  }
  for (const key of FILTER_KEYS) {
    const value = state.filters?.[key];
    if (value) params.set(key, value);
  }
  return params;
}

export function periodDescription(state: StatisticsUrlState) {
  const formatter = new Intl.DateTimeFormat("es-US", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  if (state.from === state.to) return formatter.format(asUtcDate(state.from));
  return `${formatter.format(asUtcDate(state.from))} – ${formatter.format(asUtcDate(state.to))}`;
}
