"use server";

import { requireAppSession } from "@/lib/auth/session";
import { createScopedSupabase } from "@/lib/supabase/scoped";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import { getLogisticsWeekdayIndex } from "@/lib/logistics-route-week";
import { scheduledAtToLocalDateInput } from "@/lib/schedule-date";
import { hasRouteGeo, statusAfterRouteUnassign, type LogisticsRouteRow } from "@/lib/logistics-routing";
import { routeAllowsNormalStopEdits } from "@/lib/logistics-state-machine";

import {
  ROUTE_SELECT,
  assertConductorProfile,
  canManageRoutes,
  defaultDriverForRouteDate,
  insertStops,
  loadRouteById,
  loadTaskInputs,
  loadTaskRows,
  mapRoute,
  syncRouteDriver,
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
      return fail("Solo puedes agregar tareas antes de iniciar la ruta");
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

    const nextOrder = Math.max(0, ...route.stops.map((stop) => stop.order)) + 1;
    await insertStops(supabase, session, route.id, [task], nextOrder);
    let updated = await loadRouteById(supabase, session, route.id);

    if (route.assignedTo) {
      await syncRouteDriver(supabase, session, updated, route.assignedTo);
      updated = await loadRouteById(supabase, session, route.id);
    }

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
      .select("id, weekday, name")
      .eq("id", cleanTemplateId)
      .eq("organization_id", session.organizationId)
      .single();

    if (templateError || !template) {
      return fail("Ruta semanal no encontrada");
    }

    if (Number(template.weekday) !== getLogisticsWeekdayIndex(anchorDate)) {
      return fail("La fecha de la tarea no coincide con el dia de la ruta semanal");
    }

    const routeDate = anchorDate;

    const { data: taskRow } = await supabase
      .from("shipment_logistics_tasks")
      .select("assigned_to")
      .eq("id", cleanTaskId)
      .eq("organization_id", session.organizationId)
      .maybeSingle();

    const driverId =
      (taskRow as { assigned_to?: string | null } | null)?.assigned_to ||
      (await defaultDriverForRouteDate(supabase, session, routeDate));

    if (!driverId) {
      return fail("Asigna un conductor a la tarea o define el conductor por defecto del día en Rutas");
    }

    await assertConductorProfile(supabase, session, driverId);

    const { data: existing } = await supabase
      .from("logistics_routes")
      .select(ROUTE_SELECT)
      .eq("organization_id", session.organizationId)
      .eq("route_template_id", cleanTemplateId)
      .eq("route_date", routeDate)
      .in("status", ["draft", "planned"])
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
          assigned_to: driverId,
          zone_key: "",
          created_by: session.userId,
        })
        .select(ROUTE_SELECT)
        .single();

      if (error || !data) {
        return fail(error?.message || "No se pudo crear la ruta operativa");
      }

      route = mapRoute(data as unknown as LogisticsRouteDbRow);
    } else if (route.assignedTo && route.assignedTo !== driverId) {
      return fail("Esta ruta ya tiene otro conductor asignado");
    }

    if (!route.assignedTo) {
      await syncRouteDriver(supabase, session, route, driverId);
      route = await loadRouteById(supabase, session, route.id);
    }

    if (!routeAllowsNormalStopEdits(route.status)) {
      return fail("Solo puedes agregar tareas antes de iniciar la ruta");
    }

    if (!route.stops.some((stop) => stop.taskId === task.taskId)) {
      const nextOrder = Math.max(0, ...route.stops.map((stop) => stop.order)) + 1;
      await insertStops(supabase, session, route.id, [task], nextOrder);
      route = await loadRouteById(supabase, session, route.id);
    }

    const nowIso = new Date().toISOString();
    await supabase
      .from("shipment_logistics_tasks")
      .update({
        assigned_to: driverId,
        assigned_at: nowIso,
        status: "assigned",
        updated_at: nowIso,
      })
      .eq("id", cleanTaskId)
      .eq("organization_id", session.organizationId);

    await supabase
      .from("shipments")
      .update({ assigned_to: driverId })
      .eq("id", task.shipmentId)
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
    if (route.status !== "draft" && route.status !== "planned") {
      return fail("Solo puedes quitar tareas antes de iniciar la ruta");
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
    if (route.status !== "draft" && route.status !== "planned") {
      return fail("Solo puedes ordenar paradas antes de iniciar la ruta");
    }
    const currentIds = new Set(route.stops.map((stop) => stop.id));

    if (input.stopIds.length !== route.stops.length || input.stopIds.some((id) => !currentIds.has(id))) {
      return fail("Orden invalido");
    }

    for (const [index, stopId] of input.stopIds.entries()) {
      await supabase
        .from("logistics_route_stops")
        .update({ stop_order: index + 1, updated_at: new Date().toISOString() })
        .eq("id", stopId)
        .eq("route_id", route.id)
        .eq("organization_id", session.organizationId);
    }

    return ok(await loadRouteById(supabase, session, route.id));
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
