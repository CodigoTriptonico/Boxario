import {
  ENVIOS_STATUS_FILTER_OPTIONS,
  type EnviosReadinessFilter,
  type EnviosStatusFilterValue,
} from "@/lib/shipment-display";

export const ENVIOS_FILTER_STORAGE_KEY = "boxario.seguimiento.filters.v1";

export type EnviosPersistedFilters = {
  query: string;
  country: string;
  statusFilter: string;
  salesOwnerFilter: string;
  readinessFilter: EnviosReadinessFilter;
};

export const EMPTY_ENVIOS_FILTERS: EnviosPersistedFilters = {
  query: "",
  country: "",
  statusFilter: "",
  salesOwnerFilter: "",
  readinessFilter: "all",
};

const STATUS_VALUES = new Set<string>(
  ENVIOS_STATUS_FILTER_OPTIONS.flatMap((option) => [
    option.value,
    ...(option.children?.map((child) => child.value) ?? []),
  ]),
);

const READINESS_VALUES = new Set<EnviosReadinessFilter>(["all", "listos", "pendientes"]);

export function isEnviosStatusFilterValue(value: string): value is EnviosStatusFilterValue {
  return STATUS_VALUES.has(value);
}

export function isEnviosReadinessFilter(value: string): value is EnviosReadinessFilter {
  return READINESS_VALUES.has(value as EnviosReadinessFilter);
}

function cleanText(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeEnviosPersistedFilters(
  input: Partial<EnviosPersistedFilters> | null | undefined,
): EnviosPersistedFilters {
  const status = cleanText(input?.statusFilter);
  const readiness = cleanText(input?.readinessFilter);
  return {
    query: cleanText(input?.query),
    country: cleanText(input?.country),
    statusFilter: status && isEnviosStatusFilterValue(status) ? status : "",
    salesOwnerFilter: cleanText(input?.salesOwnerFilter),
    readinessFilter: readiness && isEnviosReadinessFilter(readiness) ? readiness : "all",
  };
}

export function enviosFiltersHaveValues(filters: EnviosPersistedFilters) {
  return Boolean(
    filters.query
      || filters.country
      || filters.statusFilter
      || filters.salesOwnerFilter
      || filters.readinessFilter !== "all",
  );
}

/** True when the URL carries at least one explicit filter key (even empty ready=all is ignored). */
export function enviosFiltersPresentInSearchParams(params: URLSearchParams) {
  return ["q", "status", "country", "seller", "ready"].some((key) => params.has(key));
}

export function enviosFiltersFromSearchParams(params: URLSearchParams): EnviosPersistedFilters {
  return normalizeEnviosPersistedFilters({
    query: params.get("q") ?? "",
    statusFilter: params.get("status") ?? "",
    country: params.get("country") ?? "",
    salesOwnerFilter: params.get("seller") ?? "",
    readinessFilter: (params.get("ready") as EnviosReadinessFilter | null) ?? "all",
  });
}

export function applyEnviosFiltersToSearchParams(
  params: URLSearchParams,
  filters: EnviosPersistedFilters,
) {
  const next = normalizeEnviosPersistedFilters(filters);

  if (next.query) params.set("q", next.query);
  else params.delete("q");

  if (next.statusFilter) params.set("status", next.statusFilter);
  else params.delete("status");

  if (next.country) params.set("country", next.country);
  else params.delete("country");

  if (next.salesOwnerFilter) params.set("seller", next.salesOwnerFilter);
  else params.delete("seller");

  if (next.readinessFilter !== "all") params.set("ready", next.readinessFilter);
  else params.delete("ready");

  return params;
}

export function readEnviosFiltersFromSession(): EnviosPersistedFilters | null {
  try {
    const storage = globalThis.sessionStorage;
    if (!storage) {
      return null;
    }
    const raw = storage.getItem(ENVIOS_FILTER_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<EnviosPersistedFilters>;
    return normalizeEnviosPersistedFilters(parsed);
  } catch {
    return null;
  }
}

export function writeEnviosFiltersToSession(filters: EnviosPersistedFilters) {
  try {
    const storage = globalThis.sessionStorage;
    if (!storage) {
      return;
    }
    const next = normalizeEnviosPersistedFilters(filters);
    if (!enviosFiltersHaveValues(next)) {
      storage.removeItem(ENVIOS_FILTER_STORAGE_KEY);
      return;
    }
    storage.setItem(ENVIOS_FILTER_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage failures
  }
}

export function resolveEnviosFiltersOnLoad(params: URLSearchParams): EnviosPersistedFilters {
  const stored = readEnviosFiltersFromSession() ?? EMPTY_ENVIOS_FILTERS;
  if (!enviosFiltersPresentInSearchParams(params)) {
    return stored;
  }

  const fromUrl = enviosFiltersFromSearchParams(params);
  return normalizeEnviosPersistedFilters({
    query: params.has("q") ? fromUrl.query : stored.query,
    statusFilter: params.has("status") ? fromUrl.statusFilter : stored.statusFilter,
    country: params.has("country") ? fromUrl.country : stored.country,
    salesOwnerFilter: params.has("seller") ? fromUrl.salesOwnerFilter : stored.salesOwnerFilter,
    readinessFilter: params.has("ready") ? fromUrl.readinessFilter : stored.readinessFilter,
  });
}
