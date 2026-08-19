import {
  classifyEnviosReadinessBucket,
  filterShipmentsForEnviosMode,
  matchesEnviosReadinessFilter,
  matchesEnviosSearchQuery,
  matchesEnviosStatusFilter,
  type EnviosClientMode,
  type EnviosReadinessFilter,
} from "@/lib/shipment-display";
import type { ShipmentRow } from "@/lib/shipment-types";

export function filterAndPaginateEnviosShipments(input: {
  rows: ShipmentRow[];
  mode: EnviosClientMode;
  query?: string;
  country?: string;
  statusFilter?: string;
  salesOwnerId?: string;
  readinessFilter?: EnviosReadinessFilter;
  offset: number;
  limit: number;
}) {
  const country = String(input.country || "").trim().toLowerCase();
  const statusFilter = String(input.statusFilter || "").trim();
  const ownerId = String(input.salesOwnerId || "").trim();
  const base = filterShipmentsForEnviosMode(input.rows, input.mode).filter((row) =>
    matchesEnviosSearchQuery(row, input.query || "") &&
    (!country || row.country.toLowerCase().includes(country)) &&
    (input.mode === "history" || matchesEnviosStatusFilter(row, statusFilter)) &&
    (!ownerId || row.salesOwnerId === ownerId),
  );
  const readiness = base.reduce(
    (summary, row) => {
      const bucket = classifyEnviosReadinessBucket(row);
      if (bucket === "listos") summary.listosCount += 1;
      if (bucket === "pendientes") summary.pendientesCount += 1;
      return summary;
    },
    { totalCount: base.length, listosCount: 0, pendientesCount: 0 },
  );
  const filtered = base.filter((row) => matchesEnviosReadinessFilter(row, input.readinessFilter || "all"));

  return {
    items: filtered.slice(input.offset, input.offset + input.limit),
    total: filtered.length,
    hasMore: input.offset + input.limit < filtered.length,
    readiness,
  };
}
