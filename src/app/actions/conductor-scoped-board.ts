import {
  hasRouteGeo,
  logisticsZoneKey,
  logisticsZoneLabel,
  type LogisticsTaskAddressRow,
} from "@/lib/logistics-routing";
import { buildConductorDriverTasks } from "@/lib/conductor-tasks";
import { requireAppSession } from "@/lib/auth/session";
import { createScopedSupabase } from "@/lib/supabase/scoped";
import { listLogisticsVehiclesAction } from "@/app/actions/logistics-fleet";
import {
  ROUTE_SELECT,
  loadTaskInputs,
  mapRoute,
  type LogisticsRouteDbRow,
  type Supabase,
} from "@/app/actions/logistics-routes-shared";
import {
  SHIPMENT_SELECT,
  mapShipment,
  type ShipmentDbRow,
} from "@/app/actions/shipments-data";
import { promoteDueScheduledLegsForListedShipments } from "@/app/actions/shipments-state";
import type { AppSession } from "@/lib/auth/types";
import type { ShipmentRow } from "@/lib/shipment-types";

async function listShipmentsByIds(
  supabase: Supabase,
  session: AppSession,
  shipmentIds: string[],
): Promise<ShipmentRow[]> {
  if (!shipmentIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("shipments")
    .select(SHIPMENT_SELECT)
    .eq("organization_id", session.organizationId)
    .in("id", shipmentIds);

  if (error) {
    throw new Error(error.message);
  }

  return promoteDueScheduledLegsForListedShipments(
    supabase,
    session,
    ((data || []) as unknown as ShipmentDbRow[]).map(mapShipment),
  );
}

/**
 * Carga rutas, envíos y direcciones acotados al conductor.
 * Límites intencionales: 60 rutas + 200 tareas del conductor (BOUNDED).
 * No descarga hasta 500 envíos de toda la organización ni duplica el listado
 * vía listLogisticsTaskAddressesAction. Los envíos se cargan solo por IDs
 * derivados de esas tareas/paradas acotadas.
 */
export async function loadConductorScopedBoard(driverId: string, scopeDate: string) {
  const session = await requireAppSession();
  const supabase = await createScopedSupabase(session);
  if (!supabase) {
    throw new Error("Supabase no configurado");
  }

  const [
    { data: routeRows, error: routesError },
    { data: taskRows, error: tasksError },
    vehiclesResult,
  ] = await Promise.all([
    supabase
      .from("logistics_routes")
      .select(ROUTE_SELECT)
      .eq("organization_id", session.organizationId)
      .eq("assigned_to", driverId)
      .neq("status", "draft")
      .neq("status", "cancelled")
      .order("route_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("shipment_logistics_tasks")
      .select("id, shipment_id, assigned_to, status, scheduled_at")
      .eq("organization_id", session.organizationId)
      .eq("assigned_to", driverId)
      .limit(200),
    listLogisticsVehiclesAction(),
  ]);

  if (routesError) {
    throw new Error(routesError.message);
  }
  if (tasksError) {
    throw new Error(tasksError.message);
  }

  const routes = ((routeRows || []) as unknown as LogisticsRouteDbRow[]).map(mapRoute);
  const shipmentIds = new Set<string>();

  for (const task of taskRows || []) {
    if (task.shipment_id) {
      shipmentIds.add(String(task.shipment_id));
    }
  }

  // Paradas de rutas asignadas al conductor (pueden no tener assigned_to en la tarea).
  const routedTaskIds = routes.flatMap((route) =>
    route.stops.filter((stop) => !stop.releasedAt).map((stop) => stop.taskId),
  );

  if (routedTaskIds.length) {
    const { data: routedTaskRows, error: routedTasksError } = await supabase
      .from("shipment_logistics_tasks")
      .select("shipment_id")
      .eq("organization_id", session.organizationId)
      .in("id", routedTaskIds);

    if (routedTasksError) {
      throw new Error(routedTasksError.message);
    }

    for (const row of routedTaskRows || []) {
      if (row.shipment_id) {
        shipmentIds.add(String(row.shipment_id));
      }
    }
  }

  const shipments = await listShipmentsByIds(supabase, session, Array.from(shipmentIds));
  const taskInputs = await loadTaskInputs(supabase, session, { shipments });
  const taskAddresses: LogisticsTaskAddressRow[] = taskInputs.map((task) => ({
    taskId: task.taskId,
    address: task.address,
    zoneKey: logisticsZoneKey(task.address),
    zoneLabel: logisticsZoneLabel(task.address),
    hasGeo: hasRouteGeo(task.address),
  }));

  const vehicles = vehiclesResult.ok ? vehiclesResult.data : [];
  const tasks = buildConductorDriverTasks({
    shipments,
    routes,
    taskAddresses,
    vehicles,
    driverId,
    scopeDate,
    visibility: "open",
  });

  return {
    shipments,
    routes,
    taskAddresses,
    vehicles,
    tasks,
    scopeDate,
    metrics: {
      shipmentCount: shipments.length,
      routeCount: routes.length,
      taskAddressCount: taskAddresses.length,
      queryMode: "driver-scoped" as const,
    },
  };
}
