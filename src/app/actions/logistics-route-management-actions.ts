"use server";

import { requireAppSession } from "@/lib/auth/session";
import { createScopedSupabase } from "@/lib/supabase/scoped";
import {
  ActionError,
  actionErrorMessage,
  fail,
  ok,
  type ActionResult,
} from "@/lib/actions/errors";
import { assertLogisticsRouteTransition } from "@/lib/logistics-state-machine";
import { type LogisticsRouteRow } from "@/lib/logistics-routing";
import { logOperation } from "@/lib/observability/operation-log";
import { listLogisticsVehiclesAction } from "@/app/actions/logistics-fleet";
import { suggestVehicleIdForDriver } from "@/lib/logistics-route-vehicle";

import {
  canManageRoutes,
  loadRouteById,
  syncRouteDriver,
} from "@/app/actions/logistics-routes-shared";

export type CancelLogisticsRouteCommand = {
  routeId: string;
};

export async function assignLogisticsRouteDriverAction(input: {
  routeId: string;
  assignedTo: string | null;
  vehicleId?: string | null;
}): Promise<ActionResult<LogisticsRouteRow>> {
  try {
    const session = await requireAppSession();

    if (!canManageRoutes(session)) {
      throw new ActionError("FORBIDDEN", "FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    let route = await loadRouteById(supabase, session, input.routeId);
    if (route.status !== "planned") {
      return fail("Cierra la ruta antes de asignar el conductor");
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
      throw new ActionError("FORBIDDEN", "FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const route = await loadRouteById(supabase, session, input.routeId);
    if (route.status !== "planned") {
      return fail("Cierra la ruta antes de asignar el vehiculo");
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


export async function cancelLogisticsRouteAction(
  command: CancelLogisticsRouteCommand,
): Promise<ActionResult<null>> {
  const startedAt = Date.now();
  let organizationId: string | undefined;
  let actorUserId: string | undefined;
  let resourceId: string | undefined;

  try {
    const session = await requireAppSession();
    organizationId = session.organizationId;
    actorUserId = session.userId;
    resourceId = command.routeId;

    if (!canManageRoutes(session)) {
      throw new ActionError("FORBIDDEN", "FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      logOperation({
        operation: "logistics.route_cancel",
        organizationId,
        actorUserId,
        resourceType: "logistics_route",
        resourceId,
        durationMs: Date.now() - startedAt,
        result: "error",
        errorCode: "INTERNAL",
      });
      return fail("Supabase no configurado");
    }

    const route = await loadRouteById(supabase, session, command.routeId);
    resourceId = route.id;
    assertLogisticsRouteTransition(route.status, "cancelled");
    if (route.status !== "draft" && route.status !== "planned") {
      logOperation({
        operation: "logistics.route_cancel",
        organizationId,
        actorUserId,
        resourceType: "logistics_route",
        resourceId,
        durationMs: Date.now() - startedAt,
        result: "error",
        errorCode: "CONFLICT",
      });
      return fail("Solo puedes cancelar rutas en borrador o enviadas");
    }

    const { data, error } = await supabase.rpc("cancel_logistics_route_atomic", {
      p_route_id: route.id,
      p_client_operation_id: null,
    });

    if (error) {
      logOperation({
        operation: "logistics.route_cancel",
        organizationId,
        actorUserId,
        resourceType: "logistics_route",
        resourceId,
        durationMs: Date.now() - startedAt,
        result: "error",
        errorCode: "INTERNAL",
      });
      return fail(error.message);
    }

    const payload = (data || {}) as { replayed?: boolean; status?: string };
    if (payload.status && payload.status !== "cancelled" && !payload.replayed) {
      logOperation({
        operation: "logistics.route_cancel",
        organizationId,
        actorUserId,
        resourceType: "logistics_route",
        resourceId,
        durationMs: Date.now() - startedAt,
        result: "error",
        errorCode: "CONFLICT",
      });
      return fail("No se pudo cancelar la ruta");
    }

    logOperation({
      operation: "logistics.route_cancel",
      organizationId,
      actorUserId,
      resourceType: "logistics_route",
      resourceId,
      durationMs: Date.now() - startedAt,
      result: "ok",
    });
    return ok(null);
  } catch (error) {
    logOperation({
      operation: "logistics.route_cancel",
      organizationId,
      actorUserId,
      resourceType: "logistics_route",
      resourceId,
      durationMs: Date.now() - startedAt,
      result: "error",
      errorCode: error instanceof ActionError ? error.code : "INTERNAL",
    });
    return fail(actionErrorMessage(error));
  }
}
