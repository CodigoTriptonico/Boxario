"use server";

import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import { requireAppSession } from "@/lib/auth/session";
import { buildConductorDriverTasks, type ConductorDriverTask } from "@/lib/conductor-tasks";
import { hasRouteGeo, logisticsZoneKey, logisticsZoneLabel, type LogisticsTaskAddressRow } from "@/lib/logistics-routing";
import { createScopedSupabase } from "@/lib/supabase/scoped";
import { listLogisticsVehiclesAction } from "@/app/actions/logistics-fleet";
import { ROUTE_SELECT, loadTaskInputs, mapRoute, type LogisticsRouteDbRow } from "@/app/actions/logistics-routes-shared";
import { SHIPMENT_SELECT, mapShipment, type ShipmentDbRow } from "@/app/actions/shipments-data";
import { promoteDueScheduledLegsForListedShipments } from "@/app/actions/shipments-state";
import { listConductorOperationalTaskPageAction } from "@/app/actions/conductor-tasks-read";

type Cursor = { sortAt: string; id: string };

/** Bounded rich hydration for one page only; no historical traversal or N+1. */
export async function listConductorDriverTaskPageAction(input: {
  driverId: string;
  scopeDate: string;
  visibility?: "open" | "closed";
  cursor?: Cursor | null;
  limit?: number;
}): Promise<ActionResult<{ items: ConductorDriverTask[]; nextCursor: Cursor | null }>> {
  try {
    const page = await listConductorOperationalTaskPageAction(input);
    if (!page.ok || !page.data.items.length) return page.ok ? ok({ items: [], nextCursor: null }) : page;
    const session = await requireAppSession();
    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");
    const taskIds = page.data.items.map((item) => item.taskId);
    const shipmentIds = [...new Set(page.data.items.map((item) => item.shipmentId))];
    const routeIds = [...new Set(page.data.items.flatMap((item) => item.routeId ? [item.routeId] : []))];
    const [shipmentsResult, routesResult, vehiclesResult] = await Promise.all([
      supabase.from("shipments").select(SHIPMENT_SELECT).eq("organization_id", session.organizationId).in("id", shipmentIds),
      routeIds.length
        ? supabase.from("logistics_routes").select(ROUTE_SELECT).eq("organization_id", session.organizationId).in("id", routeIds)
        : Promise.resolve({ data: [], error: null }),
      listLogisticsVehiclesAction(),
    ]);
    if (shipmentsResult.error) throw new Error(shipmentsResult.error.message);
    if (routesResult.error) throw new Error(routesResult.error.message);
    const shipments = await promoteDueScheduledLegsForListedShipments(
      supabase,
      session,
      ((shipmentsResult.data || []) as unknown as ShipmentDbRow[]).map(mapShipment),
    );
    const routes = ((routesResult.data || []) as unknown as LogisticsRouteDbRow[]).map(mapRoute);
    const inputs = await loadTaskInputs(supabase, session, { shipments });
    const addresses: LogisticsTaskAddressRow[] = inputs.map((entry) => ({
      taskId: entry.taskId,
      address: entry.address,
      zoneKey: logisticsZoneKey(entry.address),
      zoneLabel: logisticsZoneLabel(entry.address),
      hasGeo: hasRouteGeo(entry.address),
    }));
    const byId = new Map(buildConductorDriverTasks({
      shipments,
      routes,
      taskAddresses: addresses,
      vehicles: vehiclesResult.ok ? vehiclesResult.data : [],
      driverId: input.driverId,
      scopeDate: input.scopeDate,
      visibility: input.visibility || "open",
    }).map((task) => [task.id, task]));
    return ok({ items: taskIds.flatMap((id) => byId.get(id) ? [byId.get(id)!] : []), nextCursor: page.data.nextCursor });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
