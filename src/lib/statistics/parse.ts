import type { StatisticsDashboard } from "@/lib/statistics/types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function requireRecord(parent: Record<string, unknown>, key: string) {
  const value = parent[key];
  if (!isRecord(value)) throw new Error(`Respuesta estadística inválida: ${key}`);
  return value;
}

function requireArray(parent: Record<string, unknown>, key: string) {
  const value = parent[key];
  if (!Array.isArray(value)) throw new Error(`Respuesta estadística inválida: ${key}`);
  return value;
}

function requireString(parent: Record<string, unknown>, key: string) {
  if (typeof parent[key] !== "string") throw new Error(`Respuesta estadística inválida: ${key}`);
}

function requireFiniteNumber(parent: Record<string, unknown>, key: string) {
  if (typeof parent[key] !== "number" || !Number.isFinite(parent[key])) {
    throw new Error(`Respuesta estadística inválida: ${key}`);
  }
}

function validateKpi(parent: Record<string, unknown>, key: string) {
  const metric = requireRecord(parent, key);
  requireFiniteNumber(metric, "value");
  requireFiniteNumber(metric, "previous");
  if (metric.deltaPct !== null && (typeof metric.deltaPct !== "number" || !Number.isFinite(metric.deltaPct))) {
    throw new Error(`Respuesta estadística inválida: ${key}.deltaPct`);
  }
}

/**
 * The RPC is the aggregation authority. This boundary rejects malformed or
 * partially deployed SQL responses before they reach client rendering.
 */
export function parseStatisticsDashboard(value: unknown): StatisticsDashboard {
  if (!isRecord(value)) throw new Error("Respuesta estadística inválida");

  const meta = requireRecord(value, "meta");
  requireString(meta, "generatedAt");
  requireString(meta, "timeZone");
  requireString(meta, "currency");
  const period = requireRecord(meta, "period");
  for (const key of ["from", "to", "compareFrom", "compareTo", "granularity"]) requireString(period, key);
  requireRecord(meta, "filters");
  requireArray(meta, "coverage");
  requireArray(meta, "limitations");

  const capabilities = requireRecord(value, "capabilities");
  for (const key of ["finance", "logistics", "inventory", "agencies", "agencyFinance"]) {
    if (typeof capabilities[key] !== "boolean") throw new Error(`Respuesta estadística inválida: capabilities.${key}`);
  }

  const filterOptions = requireRecord(value, "filterOptions");
  for (const key of ["agencies", "countries", "sellers", "routes", "drivers", "shipmentStatuses", "operationTypes", "products"]) requireArray(filterOptions, key);

  const kpis = requireRecord(value, "kpis");
  for (const key of ["sales", "collections", "pending", "shipments", "boxes", "customers", "averageTicket"]) validateKpi(kpis, key);

  const trend = requireRecord(value, "trend");
  requireString(trend, "granularity");
  requireArray(trend, "buckets");

  const finance = requireRecord(value, "finance");
  for (const key of ["billed", "collected", "pending", "averageTicket", "openInvoices", "paidInvoices"]) requireFiniteNumber(finance, key);
  requireArray(finance, "byStatus");
  requireArray(finance, "paymentMethods");

  const logistics = requireRecord(value, "logistics");
  for (const key of ["exceptions", "pendingCustody"]) requireFiniteNumber(logistics, key);
  for (const key of ["tasks", "routes", "packages"]) requireArray(logistics, key);

  const logisticsAnalytics = requireRecord(value, "logisticsAnalytics");
  const logisticsSummary = requireRecord(logisticsAnalytics, "summary");
  for (const key of ["completedOperations", "deliveryOperations", "pickupOperations", "deliveryBoxOperations", "pickupBoxOperations", "deliveredBoxes", "collectedBoxes"]) {
    requireFiniteNumber(logisticsSummary, key);
  }
  const logisticsCoverage = requireRecord(logisticsAnalytics, "coverage");
  requireRecord(logisticsCoverage, "boxes");
  requireRecord(logisticsCoverage, "postalCodes");
  requireArray(logisticsAnalytics, "daily");
  const logisticsRankings = requireRecord(logisticsAnalytics, "rankings");
  for (const key of ["postalCodes", "routes", "vehicles", "drivers"]) requireArray(logisticsRankings, key);

  const inventory = requireRecord(value, "inventory");
  for (const key of ["stock", "reserved", "assigned", "unavailable", "available", "valuationCoveragePct"]) requireFiniteNumber(inventory, key);
  if (inventory.estimatedValue !== null && (typeof inventory.estimatedValue !== "number" || !Number.isFinite(inventory.estimatedValue))) throw new Error("Respuesta estadística inválida: inventory.estimatedValue");
  requireArray(inventory, "lowStockItems");

  const agencies = requireRecord(value, "agencies");
  for (const key of ["agencyReceivable", "customerReceivable", "unappliedAgencyPayments"]) requireFiniteNumber(agencies, key);
  requireArray(agencies, "rows");

  const rankings = requireRecord(value, "rankings");
  for (const key of ["sellers", "countries", "products", "routes", "drivers"]) requireArray(rankings, key);
  requireArray(value, "attention");
  const tables = requireRecord(value, "tables");
  for (const key of ["shipments", "payments", "tasks"]) requireArray(tables, key);

  return value as unknown as StatisticsDashboard;
}
