import type { EnviosClientMode } from "@/lib/shipment-display";

export function resolveSeguimientoWorkspaceViewForStatus(
  status: string | null | undefined,
): EnviosClientMode | undefined {
  if (!status) {
    return undefined;
  }

  if (status === "Delivered" || status === "Cancelled") {
    return "history";
  }

  return "tracking";
}

export function buildSeguimientoShipmentDeepLink(input: {
  code?: string | null;
  shipmentId?: string | null;
  status?: string | null;
  audit?: boolean;
}) {
  const params = new URLSearchParams();
  const code = input.code?.trim();
  const shipmentId = input.shipmentId?.trim();

  if (code) {
    params.set("q", code);
  }

  if (shipmentId) {
    params.set("open", shipmentId);
    if (input.audit) {
      params.set("audit", shipmentId);
    }
  }

  const view = resolveSeguimientoWorkspaceViewForStatus(input.status);
  if (view === "history") {
    params.set("view", "history");
  }

  const query = params.toString();
  return query ? `/seguimiento?${query}` : "/seguimiento";
}
