import {
  hasRouteGeo,
  logisticsZoneKey,
  logisticsZoneLabel,
  type LogisticsTaskAddressRow,
} from "@/lib/logistics-routing";
import { buildConductorDriverTasks, conductorDirectTaskMatchesScope } from "@/lib/conductor-tasks";
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

  const rows: ShipmentDbRow[] = [];
  // PostgREST `in` payloads are bounded in practice; chunk IDs without ever
  // dropping a driver's eligible task.
  for (let index = 0; index < shipmentIds.length; index += 200) {
    const { data, error } = await supabase
      .from("shipments")
      .select(SHIPMENT_SELECT)
      .eq("organization_id", session.organizationId)
      .in("id", shipmentIds.slice(index, index + 200));

    if (error) {
      throw new Error(error.message);
    }

    rows.push(...((data || []) as unknown as ShipmentDbRow[]));
  }

  return promoteDueScheduledLegsForListedShipments(
    supabase,
    session,
    rows.map(mapShipment),
  );
}

type PagedRead = PromiseLike<{
  data: unknown[] | null;
  error: { message: string } | null;
}>;

async function readAllPages(readPage: (from: number, to: number) => PagedRead) {
  const rows: unknown[] = [];
  const pageSize = 200;

  for (let from = 0; ; from += pageSize) {
    const { data, error } = await readPage(from, from + pageSize - 1);
    if (error) {
      throw new Error(error.message);
    }

    const page = data || [];
    rows.push(...page);
    if (page.length < pageSize) {
      return rows;
    }
  }
}

/**
 * Carga exclusivamente las rutas y tareas que pueden pertenecer al día del
 * conductor. La fecha se aplica antes de decidir qué envíos hidratar; nunca
 * se descartan tareas reales por un límite de una página anterior.
 */
export async function loadConductorScopedBoard(driverId: string, scopeDate: string) {
  const session = await requireAppSession();
  const supabase = await createScopedSupabase(session);
  if (!supabase) {
    throw new Error("Supabase no configurado");
  }

  const [
    routeRows,
    taskRows,
    vehiclesResult,
  ] = await Promise.all([
    readAllPages((from, to) =>
      supabase
        .from("logistics_routes")
        .select(ROUTE_SELECT)
        .eq("organization_id", session.organizationId)
        .eq("assigned_to", driverId)
        .eq("route_date", scopeDate)
        .neq("status", "draft")
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to),
    ),
    readAllPages((from, to) =>
      supabase
        .from("shipment_logistics_tasks")
        .select("id, shipment_id, assigned_to, status, scheduled_at")
        .eq("organization_id", session.organizationId)
        .eq("assigned_to", driverId)
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to),
    ),
    listLogisticsVehiclesAction(),
  ]);

  const routes = (routeRows as LogisticsRouteDbRow[]).map(mapRoute);
  const shipmentIds = new Set<string>();

  for (const task of taskRows as Array<{ shipment_id: string | null; status: string; scheduled_at: string | null }>) {
    if (!conductorDirectTaskMatchesScope({ status: task.status, scheduledAt: task.scheduled_at }, scopeDate)) {
      continue;
    }
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
