"use server";

import { requireAppSession } from "@/lib/auth/session";
import { createScopedSupabase } from "@/lib/supabase/scoped";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import { recordActivityHistory } from "@/lib/activity-history";
import { type LogisticsRouteRow } from "@/lib/logistics-routing";
import { publishRouteValidationErrors } from "@/lib/logistics-state-machine";
import { scheduledAtToLocalDateInput } from "@/lib/schedule-date";

import {
  canManageRoutes,
  loadRouteById,
} from "@/app/actions/logistics-routes-shared";

function publishErrorMessage(code: string) {
  switch (code) {
    case "ROUTE_NOT_FOUND":
      return "Ruta no encontrada";
    case "ROUTE_NOT_DRAFT":
      return "Solo puedes cerrar rutas en preparacion";
    case "ROUTE_WITHOUT_STOPS":
      return "Agrega al menos una parada antes de cerrar";
    case "ROUTE_STOPS_WITHOUT_GEO":
      return "Hay paradas sin ubicacion verificada";
    case "ROUTE_TASKS_WITHOUT_CONFIRMED_DATE":
      return "Hay tareas sin fecha confirmada";
    case "ROUTE_TASK_DATE_MISMATCH":
      return "Hay tareas con fecha distinta a la ruta";
    case "ROUTE_WAREHOUSE_INVALID":
      return "La bodega de la ruta no es valida";
    case "FORBIDDEN":
      return "No tienes permiso para cerrar rutas";
    default:
      return code || "No se pudo cerrar la ruta";
  }
}

export async function closeLogisticsRouteAction(
  routeId: string,
): Promise<ActionResult<LogisticsRouteRow>> {
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
    const stopCount = route.stops.filter((stop) => !stop.releasedAt).length;
    const stopsWithoutGeo = route.stops.filter(
      (stop) =>
        !stop.releasedAt &&
        (!Number.isFinite(Number(stop.lat)) || !Number.isFinite(Number(stop.lng))),
    ).length;

    const taskIds = route.stops
      .filter((stop) => !stop.releasedAt)
      .map((stop) => stop.taskId);
    const { data: tasks } = taskIds.length
      ? await supabase
          .from("shipment_logistics_tasks")
          .select("id, scheduled_at, window_start_at, schedule_confirmation_status")
          .eq("organization_id", session.organizationId)
          .in("id", taskIds)
      : { data: [] };

    const taskRows = tasks || [];
    const tasksWithoutConfirmedDate = taskRows.filter(
      (task) =>
        task.schedule_confirmation_status !== "confirmed" ||
        (!task.scheduled_at && !task.window_start_at),
    ).length;
    const tasksWithMismatchedDate = taskRows.filter((task) => {
      const date =
        scheduledAtToLocalDateInput(task.scheduled_at) ||
        scheduledAtToLocalDateInput(task.window_start_at) ||
        "";
      return date !== route.routeDate;
    }).length;

    const validationErrors = publishRouteValidationErrors({
      status: route.status,
      stopCount,
      stopsWithoutGeo,
      tasksWithoutConfirmedDate,
      tasksWithMismatchedDate,
    });

    if (validationErrors.length) {
      return fail(validationErrors[0]);
    }

    const { error } = await supabase.rpc("publish_logistics_route", {
      target_route_id: routeId,
    });

    if (error) {
      return fail(publishErrorMessage(error.message));
    }

    const published = await loadRouteById(supabase, session, routeId);

    await recordActivityHistory(supabase, session, {
      action: "logistics.route_closed",
      entityType: "logistics_route",
      entityId: published.id,
      title: `Ruta cerrada: ${published.name}`,
      description: `${published.routeDate} · ${published.stops.length} paradas`,
      metadata: {
        routeId: published.id,
        publishedAt: published.publishedAt,
        assignedTo: published.assignedTo,
        vehicleId: published.vehicleId,
      },
    });

    return ok(published);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

/** @deprecated Use closeLogisticsRouteAction. Kept for older clients during rollout. */
export async function publishLogisticsRouteAction(
  routeId: string,
): Promise<ActionResult<LogisticsRouteRow>> {
  return closeLogisticsRouteAction(routeId);
}
