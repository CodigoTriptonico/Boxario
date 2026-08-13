"use server";

import { requireAppSession } from "@/lib/auth/session";
import { createScopedSupabase } from "@/lib/supabase/scoped";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import { recordActivityHistory } from "@/lib/activity-history";
import { getLogisticsWeekdayIndex } from "@/lib/logistics-route-week";
import { logisticsScheduleWindowPatch } from "@/lib/logistics-schedule-window";
import { scheduledAtToLocalDateInput } from "@/lib/schedule-date";
import { hasRouteGeo, statusAfterRouteUnassign, type LogisticsRouteRow } from "@/lib/logistics-routing";
import {
  routeAllowsNormalStopEdits,
  routeAllowsPreDepartureStopReorder,
} from "@/lib/logistics-state-machine";

import {
  ROUTE_SELECT,
  canManageRoutes,
  insertStops,
  loadRouteById,
  loadTaskInputs,
  loadTaskRows,
  mapRoute,
  routeTaskConstraintError,
  type LogisticsRouteDbRow,
} from "@/app/actions/logistics-routes-shared";

function taskOperationalDate(task: { scheduledAt: string | null; windowStartAt?: string | null }) {
  return (
    scheduledAtToLocalDateInput(task.scheduledAt) ||
    scheduledAtToLocalDateInput(task.windowStartAt || null) ||
    ""
  );
}

export async function addLogisticsRouteStopAction(input: {
  routeId: string;
  taskId: string;
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
    if (!routeAllowsNormalStopEdits(route.status)) {
      return fail("Solo puedes agregar tareas mientras la ruta esta en preparacion");
    }

    const candidates = await loadTaskInputs(supabase, session, {
      excludeRouted: true,
      onlyCurrentStep: true,
    });
    const task = candidates.find((candidate) => candidate.taskId === input.taskId);

    if (!task) {
      return fail("Tarea no disponible");
    }

    if (!hasRouteGeo(task.address)) {
      return fail("Esta tarea no tiene geo");
    }

    const taskDate = taskOperationalDate(task);
    if (!taskDate) {
      return fail("La tarea necesita una fecha confirmada antes de asignarla a la ruta");
    }
    if (taskDate !== route.routeDate) {
      return fail("La fecha de la tarea no coincide con la fecha de la ruta");
    }
    const constraintError = await routeTaskConstraintError(supabase, session, route, task);
    if (constraintError) return fail(constraintError);

    const nextOrder = Math.max(0, ...route.stops.map((stop) => stop.order)) + 1;
    await insertStops(supabase, session, route.id, [task], nextOrder);
    const updated = await loadRouteById(supabase, session, route.id);

    return ok(updated);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function assignLogisticsTaskToRouteFromPickerAction(input: {
  taskId: string;
  routeId?: string | null;
  routeTemplateId?: string | null;
  routeDate?: string | null;
}): Promise<ActionResult<LogisticsRouteRow>> {
  try {
    const session = await requireAppSession();

    if (!canManageRoutes(session)) {
      throw new Error("FORBIDDEN");
    }

    const cleanRouteId = String(input.routeId || "").trim();
    const cleanTemplateId = String(input.routeTemplateId || "").trim();
    const cleanTaskId = String(input.taskId || "").trim();

    if (!cleanTaskId) {
      return fail("Falta tarea");
    }

    if (cleanRouteId && cleanTemplateId) {
      return fail("Selecciona solo una ruta");
    }

    if (!cleanRouteId && !cleanTemplateId) {
      return fail("Selecciona una ruta");
    }

    if (cleanRouteId) {
      return await addLogisticsRouteStopAction({
        routeId: cleanRouteId,
        taskId: cleanTaskId,
      });
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const taskInputs = await loadTaskInputs(supabase, session, {
      excludeRouted: true,
      onlyCurrentStep: true,
    });
    const task = taskInputs.find((entry) => entry.taskId === cleanTaskId);

    if (!task) {
      return fail("Tarea no disponible para asignar");
    }

    if (!hasRouteGeo(task.address)) {
      return fail("Esta tarea no tiene geo");
    }

    const anchorDate =
      taskOperationalDate(task) ||
      String(input.routeDate || "").trim() ||
      "";

    if (!/^\d{4}-\d{2}-\d{2}$/.test(anchorDate)) {
      return fail("La tarea necesita una fecha antes de asignar la ruta");
    }

    const { data: template, error: templateError } = await supabase
      .from("logistics_route_templates")
      .select("id, weekday, name, zone_key, max_boxes, covered_postal_codes")
      .eq("id", cleanTemplateId)
      .eq("organization_id", session.organizationId)
      .single();

    if (templateError || !template) {
      return fail("Ruta semanal no encontrada");
    }

    if (Number(template.weekday) !== getLogisticsWeekdayIndex(anchorDate)) {
      return fail("La fecha de la tarea no coincide con el dia de la ruta semanal");
    }
    const postalCode = task.address.postalCode.trim().toUpperCase();
    if (
      template.covered_postal_codes.length &&
      (!postalCode || !template.covered_postal_codes.includes(postalCode))
    ) {
      return fail("El codigo postal de la tarea no pertenece a esta subruta");
    }
    if (template.max_boxes) {
      const { count, error: countError } = await supabase
        .from("shipment_packages")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", session.organizationId)
        .eq("shipment_id", task.shipmentId);
      if (countError) return fail(countError.message);
      if ((count || 0) > template.max_boxes) {
        return fail(`La tarea supera la capacidad de ${template.max_boxes} cajas de la ruta`);
      }
    }

    const routeDate = anchorDate;

    const { data: existing } = await supabase
      .from("logistics_routes")
      .select(ROUTE_SELECT)
      .eq("organization_id", session.organizationId)
      .eq("route_template_id", cleanTemplateId)
      .eq("route_date", routeDate)
      .eq("status", "draft")
      .maybeSingle();

    let route = existing ? mapRoute(existing as unknown as LogisticsRouteDbRow) : null;

    if (!route) {
      const { data, error } = await supabase
        .from("logistics_routes")
        .insert({
          organization_id: session.organizationId,
          route_template_id: cleanTemplateId,
          route_date: routeDate,
          name: template.name,
          status: "draft",
          assigned_to: null,
          zone_key: template.zone_key || "",
          created_by: session.userId,
        })
        .select(ROUTE_SELECT)
        .single();

      if (error || !data) {
        return fail(error?.message || "No se pudo crear la ruta operativa");
      }

      route = mapRoute(data as unknown as LogisticsRouteDbRow);
    }

    if (!routeAllowsNormalStopEdits(route.status)) {
      return fail("Solo puedes agregar tareas mientras la ruta esta en preparacion");
    }

    const constraintError = await routeTaskConstraintError(supabase, session, route, task);
    if (constraintError) return fail(constraintError);

    if (!route.stops.some((stop) => stop.taskId === task.taskId)) {
      const nextOrder = Math.max(0, ...route.stops.map((stop) => stop.order)) + 1;
      await insertStops(supabase, session, route.id, [task], nextOrder);
      route = await loadRouteById(supabase, session, route.id);
    }

    const nowIso = new Date().toISOString();
    await supabase
      .from("shipment_logistics_tasks")
      .update({
        assigned_to: null,
        assigned_at: null,
        status: "scheduled",
        updated_at: nowIso,
      })
      .eq("id", cleanTaskId)
      .eq("organization_id", session.organizationId);

    return ok(route);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function removeLogisticsRouteStopAction(input: {
  routeId: string;
  stopId: string;
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
    if (route.status !== "draft") {
      return fail("Solo puedes quitar tareas mientras la ruta esta en preparacion");
    }

    const stop = route.stops.find((entry) => entry.id === input.stopId);
    if (!stop) {
      return fail("Parada no encontrada");
    }

    const [task] = await loadTaskRows(supabase, session, [stop.taskId]);

    const { error } = await supabase
      .from("logistics_route_stops")
      .update({
        released_at: new Date().toISOString(),
        release_reason: "removed_before_departure",
        updated_at: new Date().toISOString(),
      })
      .eq("id", stop.id)
      .eq("organization_id", session.organizationId);

    if (error) {
      return fail(error.message);
    }

    if (task && route.assignedTo && task.assigned_to === route.assignedTo) {
      await supabase
        .from("shipment_logistics_tasks")
        .update({
          assigned_to: null,
          status: statusAfterRouteUnassign(task.status, task.scheduled_at),
          updated_at: new Date().toISOString(),
        })
        .eq("id", task.id)
        .eq("organization_id", session.organizationId);

      await supabase
        .from("shipments")
        .update({ assigned_to: null })
        .eq("id", task.shipment_id)
        .eq("organization_id", session.organizationId);
    }

    return ok(await loadRouteById(supabase, session, route.id));
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function removeLogisticsRouteStopWithDispositionAction(input: {
  routeId: string;
  stopId: string;
  disposition: "deferred" | "rejected";
  reason: string;
}): Promise<ActionResult<LogisticsRouteRow>> {
  try {
    const session = await requireAppSession();
    if (!canManageRoutes(session)) throw new Error("FORBIDDEN");

    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");

    const reason = String(input.reason || "").trim().slice(0, 500);
    if (reason.length < 3) return fail("Escribe el motivo de la decisión");

    const route = await loadRouteById(supabase, session, input.routeId);
    if (route.status !== "draft") {
      return fail("Solo puedes sacar paradas de una ruta en preparación");
    }

    const stop = route.stops.find((entry) => entry.id === input.stopId);
    if (!stop) return fail("Parada no encontrada");

    const [task] = await loadTaskRows(supabase, session, [stop.taskId]);
    if (!task) return fail("Tarea de la parada no encontrada");

    const { data: request, error: requestError } = await supabase
      .from("customer_route_assignment_requests")
      .select("id, shipment_id, task_id, status")
      .eq("organization_id", session.organizationId)
      .eq("task_id", stop.taskId)
      .eq("route_id", route.id)
      .in("status", ["pending", "approved"])
      .maybeSingle();

    if (requestError) return fail(requestError.message);

    const nowIso = new Date().toISOString();
    const { error: stopError } = await supabase
      .from("logistics_route_stops")
      .update({
        released_at: nowIso,
        release_reason: `${input.disposition}: ${reason}`,
        updated_at: nowIso,
      })
      .eq("id", stop.id)
      .eq("route_id", route.id)
      .eq("organization_id", session.organizationId);

    if (stopError) return fail(stopError.message);

    const { error: taskError } = await supabase
      .from("shipment_logistics_tasks")
      .update({
        ...logisticsScheduleWindowPatch(null),
        schedule_confirmation_status: "pending",
        status: "pending",
        assigned_to: null,
        assigned_at: null,
        updated_at: nowIso,
      })
      .eq("id", task.id)
      .eq("organization_id", session.organizationId);

    if (taskError) return fail(taskError.message);

    if (request) {
      const { error: requestUpdateError } = await supabase
        .from("customer_route_assignment_requests")
        .update({
          status: input.disposition,
          route_id: null,
          reviewed_by: session.userId,
          reviewed_at: nowIso,
          review_note: reason,
          updated_at: nowIso,
        })
        .eq("id", request.id)
        .eq("organization_id", session.organizationId);

      if (requestUpdateError) return fail(requestUpdateError.message);
    }

    const action = input.disposition === "rejected"
      ? "customer.route_assignment.rejected"
      : "customer.route_assignment.deferred";
    await recordActivityHistory(supabase, session, {
      action,
      entityType: "shipment",
      entityId: request?.shipment_id || task.shipment_id,
      title: input.disposition === "rejected"
        ? "Solicitud de ruta rechazada"
        : "Solicitud devuelta a pendiente",
      description: reason,
      metadata: {
        routeId: route.id,
        stopId: stop.id,
        taskId: task.id,
        requestId: request?.id || null,
        disposition: input.disposition,
      },
    });

    return ok(await loadRouteById(supabase, session, route.id));
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function reorderLogisticsRouteStopsAction(input: {
  routeId: string;
  stopIds: string[];
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
    if (!routeAllowsPreDepartureStopReorder(route.status)) {
      return fail("Solo puedes ordenar paradas antes de iniciar la ruta");
    }
    const previousStopIds = route.stops.map((stop) => stop.id);
    const currentIds = new Set(previousStopIds);

    if (input.stopIds.length !== route.stops.length || input.stopIds.some((id) => !currentIds.has(id))) {
      return fail("Orden invalido");
    }

    if (input.stopIds.every((stopId, index) => stopId === previousStopIds[index])) {
      return ok(route);
    }

    const { error: reorderError } = await supabase
      .rpc("reorder_logistics_route_stops_atomic", {
        p_route_id: route.id,
        p_stop_ids: input.stopIds,
      });

    if (reorderError) {
      console.error("[reorderLogisticsRouteStopsAction] atomic reorder failed", {
        code: reorderError.code,
        message: reorderError.message,
        details: reorderError.details,
        hint: reorderError.hint,
        routeId: route.id,
      });
      if (reorderError.message.includes("ROUTE_STOPS_CHANGED") || reorderError.message.includes("ROUTE_REORDER_CONFLICT")) {
        return fail("Las paradas cambiaron mientras ordenabas. Recarga la ruta e intenta de nuevo");
      }
      if (reorderError.message.includes("ROUTE_REORDER_STATE_CHANGED")) {
        return fail("La ruta ya inicio y no permite este cambio de orden");
      }
      if (reorderError.message.includes("ROUTE_NOT_FOUND")) {
        return fail("La ruta ya no esta disponible");
      }
      if (reorderError.message.includes("FORBIDDEN")) {
        return fail("No tienes permiso para cambiar el orden de esta ruta");
      }
      return fail("No pudimos guardar el nuevo orden. Recarga la ruta e intenta de nuevo");
    }

    const updated = await loadRouteById(supabase, session, route.id);

    return ok(updated);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
