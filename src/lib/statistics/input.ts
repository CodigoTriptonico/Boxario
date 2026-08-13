import type { StatisticsDashboardInput, StatisticsFilters } from "@/lib/statistics/types";

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const MAX_RANGE_DAYS = 366;
const MAX_FILTER_LENGTH = 120;

function parseDateKey(value: unknown, field: string) {
  const key = typeof value === "string" ? value.trim() : "";
  if (!DATE_KEY_PATTERN.test(key)) {
    throw new Error(`${field} debe usar el formato YYYY-MM-DD`);
  }

  const [year, month, day] = key.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    throw new Error(`${field} no es una fecha valida`);
  }
  return { key, epochDay: Math.floor(date.getTime() / 86_400_000) };
}

function optionalText(value: unknown, field: string) {
  if (value == null || value === "") return undefined;
  if (typeof value !== "string") throw new Error(`${field} no es valido`);
  const normalized = value.trim();
  if (!normalized) return undefined;
  if (normalized.length > MAX_FILTER_LENGTH || /[\u0000-\u001f]/.test(normalized)) {
    throw new Error(`${field} no es valido`);
  }
  return normalized;
}

function optionalUuid(value: unknown, field: string) {
  const normalized = optionalText(value, field);
  if (normalized && !UUID_PATTERN.test(normalized)) {
    throw new Error(`${field} no es valido`);
  }
  return normalized;
}

function normalizeFilters(filters: StatisticsFilters | null | undefined): StatisticsFilters {
  const source = filters || {};
  return {
    agencyId: optionalUuid(source.agencyId, "agencyId"),
    country: optionalText(source.country, "country"),
    sellerId: optionalUuid(source.sellerId, "sellerId"),
    routeId: optionalUuid(source.routeId, "routeId"),
    driverId: optionalUuid(source.driverId, "driverId"),
    shipmentStatus: optionalText(source.shipmentStatus, "shipmentStatus"),
    operationType: optionalText(source.operationType, "operationType"),
    productKey: optionalText(source.productKey, "productKey"),
  };
}

export function normalizeStatisticsDashboardInput(
  input: StatisticsDashboardInput,
): Required<Omit<StatisticsDashboardInput, "filters">> & { filters: StatisticsFilters } {
  if (!input || typeof input !== "object") {
    throw new Error("El periodo es obligatorio");
  }

  const from = parseDateKey(input.from, "from");
  const to = parseDateKey(input.to, "to");
  const compareFrom = parseDateKey(input.compareFrom, "compareFrom");
  const compareTo = parseDateKey(input.compareTo, "compareTo");

  for (const [label, first, last] of [
    ["periodo", from, to],
    ["comparacion", compareFrom, compareTo],
  ] as const) {
    const duration = last.epochDay - first.epochDay + 1;
    if (duration < 1) throw new Error(`El ${label} tiene fechas invertidas`);
    if (duration > MAX_RANGE_DAYS) {
      throw new Error(`El ${label} no puede superar ${MAX_RANGE_DAYS} dias`);
    }
  }

  return {
    from: from.key,
    to: to.key,
    compareFrom: compareFrom.key,
    compareTo: compareTo.key,
    filters: normalizeFilters(input.filters),
  };
}
