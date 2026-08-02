"use server";

import { requireAppSession } from "@/lib/auth/session";
import { createScopedSupabase } from "@/lib/supabase/scoped";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import { recordActivityHistory } from "@/lib/activity-history";
import { assertLogisticsRouteTransition } from "@/lib/logistics-state-machine";
import { type LogisticsRouteRow } from "@/lib/logistics-routing";
import { listLogisticsVehiclesAction } from "@/app/actions/logistics-fleet";
import { suggestVehicleIdForDriver } from "@/lib/logistics-route-vehicle";

import {
  canManageRoutes,
  loadRouteById,
  syncRouteDriver,
} from "@/app/actions/logistics-routes-shared";

export async function assignLogisticsRouteDriverAction(input: {
  routeId: string;
  assignedTo: string | null;
  vehicleId?: string | null;
}): Promise<ActionResult<LogisticsRouteRow>> {
  try {
    const session = await requireAppSession();

    if (!canManageRoutes(session)) {
      throw new Error("FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    let route = await loadRouteById(supabase, session, input.routeId);
    if (route.status !== "draft" && route.status !== "planned") {
      return fail("Solo puedes cambiar el conductor mientras la ruta no ha iniciado");
    }

    const assignedTo = input.assignedTo || null;
    let vehicleId = input.vehicleId ?? route.vehicleId;

    if (assignedTo && vehicleId === null) {
      const vehiclesResult = await listLogisticsVehiclesAction();
      if (vehiclesResult.ok) {
        vehicleId = suggestVehicleIdForDriver(vehiclesResult.data, assignedTo);
      }
    }

    const { error } = await supabase
      .from("logistics_routes")
      .update({
        assigned_to: assignedTo,
        vehicle_id: vehicleId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", route.id)
      .eq("organization_id", session.organizationId);

    if (error) {
      return fail(error.message);
    }

    await syncRouteDriver(supabase, session, route, assignedTo);
    route = await loadRouteById(supabase, session, route.id);

    return ok(route);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function assignLogisticsRouteVehicleAction(input: {
  routeId: string;
  vehicleId: string | null;
}): Promise<ActionResult<LogisticsRouteRow>> {
  try {
    const session = await requireAppSession();

    if (!canManageRoutes(session)) {
      throw new Error("FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const route = await loadRouteById(supabase, session, input.routeId);
    if (route.status !== "draft" && route.status !== "planned") {
      return fail("Solo puedes cambiar el vehiculo mientras la ruta no ha iniciado");
    }

    const { error } = await supabase
      .from("logistics_routes")
      .update({
        vehicle_id: input.vehicleId || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", route.id)
      .eq("organization_id", session.organizationId);

    if (error) {
      return fail(error.message);
    }

    return ok(await loadRouteById(supabase, session, route.id));
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}


export async function cancelLogisticsRouteAction(routeId: string): Promise<ActionResult<null>> {
  try {
    const session = await requireAppSession();

    if (!canManageRoutes(session)) {
      throw new Error("FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const route = await loadRouteById(supabase, session, routeId);
    assertLogisticsRouteTransition(route.status, "cancelled");
    if (route.status !== "draft" && route.status !== "planned") {
      return fail("Solo puedes cancelar rutas en borrador o enviadas");
    }

    await syncRouteDriver(supabase, session, route, null);

    const nowIso = new Date().toISOString();
    const { error: releaseStopsError } = await supabase
      .from("logistics_route_stops")
      .update({
        released_at: nowIso,
        release_reason: "route_cancelled",
        updated_at: nowIso,
      })
      .eq("route_id", route.id)
      .is("released_at", null)
      .eq("organization_id", session.organizationId);

    if (releaseStopsError) {
      return fail(releaseStopsError.message);
    }

    const { error } = await supabase
      .from("logistics_routes")
      .update({
        status: "cancelled",
        assigned_to: null,
        updated_at: nowIso,
      })
      .eq("id", route.id)
      .eq("organization_id", session.organizationId);

    if (error) {
      return fail(error.message);
    }

    await recordActivityHistory(supabase, session, {
      action: "logistics.route_cancelled",
      entityType: "logistics_route",
      entityId: route.id,
      title: `Ruta cancelada: ${route.name}`,
      description: `${route.routeDate} · ${route.stops.length} paradas liberadas`,
    });

    return ok(null);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
