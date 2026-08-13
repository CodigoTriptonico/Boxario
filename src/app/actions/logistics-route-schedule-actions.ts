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
import { requestCustomerRouteAssignmentAction } from "@/app/actions/customer-route-assignments/request";

import {
  ROUTE_SELECT,
  canManageRoutes,
  insertStops,
  loadRouteById,
  loadTaskInputs,
  mapRoute,
  weekdayIndexForRouteDate,
  type LogisticsRouteDbRow,
} from "@/app/actions/logistics-routes-shared";

type LogisticsTaskScheduleConfirmation = {
  outcome: "template_confirmed" | "routed";
  requestId: string | null;
  routeId: string | null;
  route: LogisticsRouteRow | null;
};

export async function confirmLogisticsTaskScheduleAction(input: {
  taskId: string;
  scheduledAt: string;
  /** Optional: routes can be built first and drivers assigned later. */
  driverId?: string | null;
  routeTemplateId: string;
}): Promise<ActionResult<LogisticsTaskScheduleConfirmation>> {
  try {
    const session = await requireAppSession();
    if (!canManageRoutes(session)) throw new Error("FORBIDDEN");
    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");
    const routeDate = scheduledAtToLocalDateInput(input.scheduledAt);
    const schedulePatch = logisticsScheduleWindowPatch(input.scheduledAt);
    const routeTemplateId = String(input.routeTemplateId || "").trim();
    if (
      !input.taskId ||
      !routeTemplateId ||
      !schedulePatch.scheduled_at ||
      !/^\d{4}-\d{2}-\d{2}$/.test(routeDate)
    ) {
      return fail("Completa fecha y ruta");
    }

    // En el catálogo geográfico, Programar desde Logística es una decisión
    // explícita: confirma la reserva dentro de Plantillas. Crear ruta queda
    // reservado para la conversión posterior a un recorrido operativo.
    if (!isDayAsRouteTemplateId(routeTemplateId)) {
      const { data: geographicSchedule } = await supabase
        .from("logistics_route_schedules")
        .select("id")
        .eq("id", routeTemplateId)
        .eq("organization_id", session.organizationId)
        .maybeSingle();
      if (geographicSchedule) {
        const { data: taskIdentity, error: taskIdentityError } = await supabase
          .from("shipment_logistics_tasks")
          .select("shipment_id")
          .eq("id", input.taskId)
          .eq("organization_id", session.organizationId)
          .maybeSingle();
        if (taskIdentityError || !taskIdentity?.shipment_id) {
          return fail(taskIdentityError?.message || "Tarea no encontrada");
        }
        const booking = await requestCustomerRouteAssignmentAction({
          shipmentId: String(taskIdentity.shipment_id),
          taskId: input.taskId,
          routeTemplateId,
          scheduledAt: input.scheduledAt,
          driverId: input.driverId,
          confirmImmediately: true,
        });
        if (!booking.ok) return fail(booking.error);
        return ok({
          outcome: "template_confirmed",
          requestId: booking.data.requestId,
          routeId: null,
          route: null,
        } satisfies LogisticsTaskScheduleConfirmation);
      }
    }
    const weekday = weekdayIndexForRouteDate(routeDate);
    if (weekday === null) return fail("Fecha invalida");
    const dayAsRoute = isDayAsRouteTemplateId(routeTemplateId);
    let template: {
      id: string | null;
      weekday: number;
      name: string;
      maxStops: number | null;
      maxBoxes: number | null;
      coveredPostalCodes: string[];
      zoneKey: string;
      defaultDriverId: string | null;
    };

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
      const { data: weekdayDefaults } = await supabase
        .from("logistics_weekday_defaults")
        .select("max_stops, max_boxes, default_driver_id")
        .eq("organization_id", session.organizationId)
        .eq("weekday", weekday)
        .maybeSingle();
      template = {
        id: null,
        weekday,
        name: genericLogisticsRouteName(weekday),
        maxStops: weekdayDefaults?.max_stops ?? null,
        maxBoxes: weekdayDefaults?.max_boxes ?? null,
        coveredPostalCodes: [],
        zoneKey: "",
        defaultDriverId: weekdayDefaults?.default_driver_id || null,
      };
    } else {
      const { data, error } = await supabase
        .from("logistics_route_templates")
        .select("id, weekday, name, max_stops, max_boxes, covered_postal_codes, zone_key, default_driver_id")
        .eq("id", routeTemplateId)
        .eq("organization_id", session.organizationId)
        .single();
      if (error || !data) return fail("Ruta semanal no encontrada");
      template = {
        id: String(data.id),
        weekday: Number(data.weekday),
        name: String(data.name),
        maxStops: data.max_stops ?? null,
        maxBoxes: data.max_boxes ?? null,
        coveredPostalCodes: data.covered_postal_codes || [],
        zoneKey: data.zone_key || "",
        defaultDriverId: data.default_driver_id || null,
      };
    }

    // No filtrar por paso logístico actual: en venta se puede preasignar
    // entrega y recolección el mismo día aunque la entrega aún no esté hecha.
    const taskInputs = await loadTaskInputs(supabase, session, {
      excludeRouted: true,
    });
    if (Number(template.weekday) !== weekday) return fail("La ruta no corresponde al día elegido");
    const task = taskInputs.find((entry) => entry.taskId === input.taskId);
    if (!task) return fail("Tarea no disponible para programar");
    const taskPostalCode = task.address.postalCode.trim().toUpperCase();
    if (
      template.coveredPostalCodes.length &&
      (!taskPostalCode || !template.coveredPostalCodes.includes(taskPostalCode))
    ) {
      return fail("El codigo postal de la tarea no pertenece a esta subruta");
    }
    let existingQuery = supabase
      .from("logistics_routes")
      .select(ROUTE_SELECT)
      .eq("organization_id", session.organizationId)
      .eq("route_date", routeDate)
      .eq("status", "draft");
    existingQuery = dayAsRoute
      ? existingQuery.is("route_template_id", null).eq("name", template.name)
      : existingQuery.eq("route_template_id", routeTemplateId);
    const { data: existingRows } = await existingQuery
      .order("created_at", { ascending: true })
      .limit(1);
    const existing = existingRows?.[0] || null;
    let route = existing ? mapRoute(existing as unknown as LogisticsRouteDbRow) : null;
    const currentStops = route?.stops || [];
    if (template.maxStops && currentStops.length >= template.maxStops) {
      return fail(`La ruta alcanzo su capacidad de ${template.maxStops} paradas`);
    }
    if (template.maxBoxes) {
      const existingTaskIds = currentStops.map((stop) => stop.taskId);
      const { data: existingTasks } = existingTaskIds.length
        ? await supabase
            .from("shipment_logistics_tasks")
            .select("shipment_id")
            .eq("organization_id", session.organizationId)
            .in("id", existingTaskIds)
        : { data: [] };
      const shipmentIds = Array.from(new Set([
        ...(existingTasks || []).map((row) => row.shipment_id),
        task.shipmentId,
      ]));
      const { count: boxCount, error: boxCountError } = await supabase
        .from("shipment_packages")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", session.organizationId)
        .in("shipment_id", shipmentIds);
      if (boxCountError) return fail(boxCountError.message);
      if ((boxCount || 0) > template.maxBoxes) {
        return fail(`La ruta supera su capacidad de ${template.maxBoxes} cajas`);
      }
    }
    if (!route) {
      const { data, error } = await supabase.from("logistics_routes").insert({ organization_id: session.organizationId, route_template_id: template.id, route_date: routeDate, name: template.name, status: "draft", assigned_to: null, zone_key: template.zoneKey, created_by: session.userId }).select(ROUTE_SELECT).single();
      if (error || !data) return fail(error?.message || "No se pudo crear la ruta operativa");
      route = mapRoute(data as unknown as LogisticsRouteDbRow);
    }
    if (route.status !== "draft") {
      return fail("Solo puedes programar sobre rutas en preparacion");
    }
    route = await loadRouteById(supabase, session, route.id);
    if (!route.stops.some((stop) => stop.taskId === task.taskId)) await insertStops(supabase, session, route.id, [task], Math.max(0, ...route.stops.map((stop) => stop.order)) + 1);
    const nowIso = new Date().toISOString();
    const taskAssignedTo = null;
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
    const loadedRoute = await loadRouteById(supabase, session, route.id);
    return ok({
      outcome: "routed",
      requestId: null,
      routeId: loadedRoute.id,
      route: loadedRoute,
    } satisfies LogisticsTaskScheduleConfirmation);
  } catch (error) { return fail(actionErrorMessage(error)); }
}
