"use server";

import { requireAppSession } from "@/lib/auth/session";
import { createScopedSupabase } from "@/lib/supabase/scoped";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import { recordActivityHistory } from "@/lib/activity-history";
import { scheduledAtToLocalDateInput } from "@/lib/schedule-date";
import { type LogisticsRouteRow } from "@/lib/logistics-routing";
import { isLogisticsWeekdayKey, logisticsWeekdayKeys } from "@/lib/logistics-route-catalog";
import { genericLogisticsRouteName, isDayAsRouteTemplateId } from "@/lib/logistics-day-route";
import { logisticsScheduleWindowPatch } from "@/lib/logistics-schedule-window";

import {
  ROUTE_SELECT,
  assertConductorProfile,
  canManageRoutes,
  insertStops,
  loadRouteById,
  loadTaskInputs,
  mapRoute,
  syncRouteDriver,
  weekdayIndexForRouteDate,
  type LogisticsRouteDbRow,
} from "@/app/actions/logistics-routes-shared";

export async function confirmLogisticsTaskScheduleAction(input: {
  taskId: string;
  scheduledAt: string;
  /** Optional: routes can be built first and drivers assigned later. */
  driverId?: string | null;
  routeTemplateId: string;
}): Promise<ActionResult<LogisticsRouteRow>> {
  try {
    const session = await requireAppSession();
    if (!canManageRoutes(session)) throw new Error("FORBIDDEN");
    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");
    const routeDate = scheduledAtToLocalDateInput(input.scheduledAt);
    const schedulePatch = logisticsScheduleWindowPatch(input.scheduledAt);
    const driverId = String(input.driverId || "").trim() || null;
    const routeTemplateId = String(input.routeTemplateId || "").trim();
    if (
      !input.taskId ||
      !routeTemplateId ||
      !schedulePatch.scheduled_at ||
      !/^\d{4}-\d{2}-\d{2}$/.test(routeDate)
    ) {
      return fail("Completa fecha y ruta");
    }
    const weekday = weekdayIndexForRouteDate(routeDate);
    if (weekday === null) return fail("Fecha invalida");
    const dayAsRoute = isDayAsRouteTemplateId(routeTemplateId);
    let template: { id: string | null; weekday: number; name: string };

    if (dayAsRoute) {
      const { data: enabledDaysRaw, error: daysError } = await supabase.rpc(
        "list_logistics_route_weekdays",
        { target_org_id: session.organizationId },
      );
      const weekdayKey = logisticsWeekdayKeys[weekday];
      if (
        daysError ||
        !weekdayKey ||
        !(enabledDaysRaw || []).filter(isLogisticsWeekdayKey).includes(weekdayKey)
      ) {
        return fail(daysError?.message || "El dia no esta disponible en el calendario de rutas");
      }
      template = {
        id: null,
        weekday,
        name: genericLogisticsRouteName(weekday),
      };
    } else {
      const { data, error } = await supabase
        .from("logistics_route_templates")
        .select("id, weekday, name")
        .eq("id", routeTemplateId)
        .eq("organization_id", session.organizationId)
        .single();
      if (error || !data) return fail("Ruta semanal no encontrada");
      template = {
        id: String(data.id),
        weekday: Number(data.weekday),
        name: String(data.name),
      };
    }

    // No filtrar por paso logístico actual: en venta se puede preasignar
    // entrega y recolección el mismo día aunque la entrega aún no esté hecha.
    const taskInputs = await loadTaskInputs(supabase, session, {
      excludeRouted: true,
    });
    if (driverId) {
      await assertConductorProfile(supabase, session, driverId);
    }
    if (Number(template.weekday) !== weekday) return fail("La ruta no corresponde al día elegido");
    const task = taskInputs.find((entry) => entry.taskId === input.taskId);
    if (!task) return fail("Tarea no disponible para programar");
    let existingQuery = supabase
      .from("logistics_routes")
      .select(ROUTE_SELECT)
      .eq("organization_id", session.organizationId)
      .eq("route_date", routeDate)
      .in("status", ["draft", "planned"]);
    existingQuery = dayAsRoute
      ? existingQuery.is("route_template_id", null).eq("name", template.name)
      : existingQuery.eq("route_template_id", routeTemplateId);
    const { data: existingRows } = await existingQuery
      .order("created_at", { ascending: true })
      .limit(1);
    const existing = existingRows?.[0] || null;
    let route = existing ? mapRoute(existing as unknown as LogisticsRouteDbRow) : null;
    if (!route) {
      const { data, error } = await supabase.from("logistics_routes").insert({ organization_id: session.organizationId, route_template_id: template.id, route_date: routeDate, name: template.name, status: "draft", assigned_to: driverId, zone_key: "", created_by: session.userId }).select(ROUTE_SELECT).single();
      if (error || !data) return fail(error?.message || "No se pudo crear la ruta operativa");
      route = mapRoute(data as unknown as LogisticsRouteDbRow);
    } else if (driverId && route.assignedTo && route.assignedTo !== driverId) {
      return fail("Esta ruta ya tiene otro conductor asignado");
    }
    if (route.status !== "draft" && route.status !== "planned") {
      return fail("Solo puedes programar sobre rutas en borrador o publicadas");
    }
    if (driverId && !route.assignedTo) await syncRouteDriver(supabase, session, route, driverId);
    route = await loadRouteById(supabase, session, route.id);
    if (!route.stops.some((stop) => stop.taskId === task.taskId)) await insertStops(supabase, session, route.id, [task], Math.max(0, ...route.stops.map((stop) => stop.order)) + 1);
    const nowIso = new Date().toISOString();
    const taskAssignedTo = driverId || route.assignedTo || null;
    const { error: taskError } = await supabase
      .from("shipment_logistics_tasks")
      .update({
        ...schedulePatch,
        assigned_to: taskAssignedTo,
        assigned_at: taskAssignedTo ? nowIso : null,
        status: taskAssignedTo ? "assigned" : "scheduled",
        schedule_confirmation_status: "confirmed",
        schedule_confirmed_at: nowIso,
        schedule_confirmed_by: session.userId,
        updated_at: nowIso,
      })
      .eq("id", input.taskId)
      .eq("organization_id", session.organizationId);
    if (taskError) return fail(taskError.message);

    if (taskAssignedTo) {
      await supabase
        .from("shipments")
        .update({ assigned_to: taskAssignedTo })
        .eq("id", task.shipmentId)
        .eq("organization_id", session.organizationId);
    }

    await recordActivityHistory(supabase, session, {
      action: "shipment.logistics_task_schedule_confirmed",
      entityType: "shipment",
      entityId: task.shipmentId,
      title: `Tarea confirmada: ${task.shipmentCode}`,
      description: `${route.name} - ${routeDate}`,
      metadata: {
        taskId: task.taskId,
        taskType: task.taskType,
        scheduledAt: input.scheduledAt,
        driverId: taskAssignedTo,
        routeId: route.id,
        routeTemplateId: template.id,
        dayAsRoute,
      },
    });
    return ok(await loadRouteById(supabase, session, route.id));
  } catch (error) { return fail(actionErrorMessage(error)); }
}
