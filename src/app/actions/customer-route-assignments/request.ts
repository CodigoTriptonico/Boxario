"use server";

import { confirmLogisticsTaskScheduleAction } from "@/app/actions/logistics-routes";
import {
  canProposeCustomerRoute,
  loadActiveVerification,
  loadCustomerZone,
} from "@/app/actions/customer-route-assignments/shared";
import type { CustomerRouteAssignmentResult } from "@/app/actions/customer-route-assignments/types";
import { recordActivityHistory } from "@/lib/activity-history";
import {
  actionErrorMessage,
  fail,
  ok,
  type ActionResult,
} from "@/lib/actions/errors";
import { requireAppSession } from "@/lib/auth/session";
import {
  customerHasRouteGeo,
  resolveCustomerRouteAssignmentOutcome,
} from "@/lib/customer-route-verification";
import {
  genericLogisticsRouteName,
  isDayAsRouteTemplateId,
} from "@/lib/logistics-day-route";
import { getLogisticsWeekdayIndex } from "@/lib/logistics-route-week";
import {
  logisticsScheduleWindowPatch,
} from "@/lib/logistics-schedule-window";
import { scheduledAtToLocalDateInput } from "@/lib/schedule-date";
import { createScopedSupabase } from "@/lib/supabase/scoped";

export async function requestCustomerRouteAssignmentAction(input: {
  shipmentId: string;
  taskId: string;
  routeTemplateId: string;
  scheduledAt: string;
  driverId?: string | null;
}): Promise<ActionResult<CustomerRouteAssignmentResult>> {
  try {
    const session = await requireAppSession();
    if (!canProposeCustomerRoute(session)) {
      throw new Error("FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const shipmentId = String(input.shipmentId || "").trim();
    const taskId = String(input.taskId || "").trim();
    const routeTemplateId = String(
      input.routeTemplateId || "",
    ).trim();
    const dayAsRoute =
      isDayAsRouteTemplateId(routeTemplateId);
    let driverId = String(input.driverId || "").trim();
    const scheduledAt = String(input.scheduledAt || "").trim();
    const routeDate = scheduledAtToLocalDateInput(scheduledAt);
    const schedulePatch =
      logisticsScheduleWindowPatch(scheduledAt);

    if (
      !shipmentId ||
      !taskId ||
      !routeTemplateId ||
      !schedulePatch.scheduled_at ||
      !/^\d{4}-\d{2}-\d{2}$/.test(routeDate)
    ) {
      return fail("Completa fecha y ruta");
    }

    if (!driverId) {
      const { data: weekdayDefault } = await supabase
        .from("logistics_weekday_defaults")
        .select("default_driver_id")
        .eq("organization_id", session.organizationId)
        .eq("weekday", getLogisticsWeekdayIndex(routeDate))
        .maybeSingle();
      driverId = String(
        weekdayDefault?.default_driver_id || "",
      ).trim();
    }

    const templateResultPromise = dayAsRoute
      ? Promise.resolve({ data: null, error: null })
      : supabase
          .from("logistics_route_templates")
          .select("id, weekday, name")
          .eq("id", routeTemplateId)
          .eq("organization_id", session.organizationId)
          .maybeSingle();
    const [
      { data: shipment, error: shipmentError },
      { data: task, error: taskError },
      { data: templateRow, error: templateError },
    ] = await Promise.all([
      supabase
        .from("shipments")
        .select("id, code, customer_id")
        .eq("id", shipmentId)
        .eq("organization_id", session.organizationId)
        .maybeSingle(),
      supabase
        .from("shipment_logistics_tasks")
        .select("id, shipment_id, task_type, status")
        .eq("id", taskId)
        .eq("organization_id", session.organizationId)
        .maybeSingle(),
      templateResultPromise,
    ]);

    if (shipmentError || !shipment) {
      return fail(
        shipmentError?.message || "Envío no encontrado",
      );
    }
    if (
      taskError ||
      !task ||
      task.shipment_id !== shipmentId
    ) {
      return fail(
        taskError?.message || "Tarea no encontrada",
      );
    }
    if (
      task.status === "completed" ||
      task.status === "cancelled"
    ) {
      return fail("La tarea ya está cerrada");
    }
    if (!dayAsRoute && (templateError || !templateRow)) {
      return fail(
        templateError?.message ||
          "Ruta semanal no encontrada",
      );
    }

    const customerId = String(
      shipment.customer_id || "",
    ).trim();
    if (!customerId) {
      return fail("El envío no tiene remitente");
    }

    const weekday = getLogisticsWeekdayIndex(routeDate);
    let template: {
      id: string | null;
      weekday: number;
      name: string;
    };
    if (dayAsRoute) {
      const { data: enabledDays, error: daysError } =
        await supabase.rpc("list_logistics_route_weekdays", {
          target_org_id: session.organizationId,
        });
      const dayKeys = [
        "Lun",
        "Mar",
        "Mie",
        "Jue",
        "Vie",
        "Sab",
        "Dom",
      ];
      if (
        daysError ||
        !enabledDays?.includes(dayKeys[weekday])
      ) {
        return fail(
          daysError?.message ||
            "El dia no esta disponible en el calendario de rutas",
        );
      }
      template = {
        id: null,
        weekday,
        name: genericLogisticsRouteName(weekday),
      };
    } else {
      template = {
        id: String(templateRow?.id || ""),
        weekday: Number(templateRow?.weekday),
        name: String(templateRow?.name || ""),
      };
    }
    if (Number(template.weekday) !== weekday) {
      return fail("La ruta no corresponde al día elegido");
    }

    const { zoneInput, zoneKey } = await loadCustomerZone(
      supabase,
      session,
      customerId,
    );
    const hasRouteGeo =
      customerHasRouteGeo(zoneInput) && zoneKey !== "falta-geo";

    const { data: existingStop } = await supabase
      .from("logistics_route_stops")
      .select("id")
      .eq("task_id", taskId)
      .is("released_at", null)
      .maybeSingle();

    if (existingStop) {
      return fail("Esta tarea ya está en una ruta");
    }

    const { data: pendingExisting } = await supabase
      .from("customer_route_assignment_requests")
      .select("id")
      .eq("task_id", taskId)
      .eq("status", "pending")
      .maybeSingle();

    if (pendingExisting) {
      return fail(
        "Ya hay una solicitud pendiente de logística para esta tarea",
      );
    }

    if (dayAsRoute) {
      // Día habilitado (p. ej. Jueves): la venta puede mandar la ruta a
      // Logística aunque el remitente aún no tenga coordenadas.
      const assignResult =
        await confirmLogisticsTaskScheduleAction({
          taskId,
          scheduledAt,
          driverId: driverId || null,
          routeTemplateId,
        });
      if (!assignResult.ok) {
        return fail(assignResult.error);
      }

      await recordActivityHistory(supabase, session, {
        action:
          "customer.route_assignment.day_route_assigned",
        entityType: "shipment",
        entityId: shipmentId,
        title: `Ruta general asignada: ${shipment.code}`,
        description: `${template.name} · día habilitado`,
        metadata: {
          taskId,
          weekday,
          driverId: driverId || null,
          zoneKey,
          routeId: assignResult.data.id,
          dayAsRoute: true,
        },
      });

      return ok({
        outcome: "assigned",
        requestId: null,
        routeId: assignResult.data.id,
      });
    }

    // Geo sólo hace falta para autoaceptar por zona verificada. Sin geo,
    // la solicitud queda pendiente en Logística en lugar de tumbar la venta.
    const verification = hasRouteGeo
      ? await loadActiveVerification(
          supabase,
          session,
          customerId,
          routeTemplateId,
        )
      : null;
    const outcome = hasRouteGeo
      ? resolveCustomerRouteAssignmentOutcome({
          verification,
          routeTemplateId,
          currentZoneKey: zoneKey,
        })
      : "pending_approval";

    if (outcome === "assigned") {
      const assignResult =
        await confirmLogisticsTaskScheduleAction({
          taskId,
          scheduledAt,
          driverId: driverId || null,
          routeTemplateId,
        });
      if (!assignResult.ok) {
        return fail(assignResult.error);
      }

      await recordActivityHistory(supabase, session, {
        action: "customer.route_assignment.auto_accepted",
        entityType: "shipment",
        entityId: shipmentId,
        title: `Ruta autoasignada: ${shipment.code}`,
        description: `${template.name} · remitente verificado`,
        metadata: {
          taskId,
          routeTemplateId,
          driverId: driverId || null,
          zoneKey,
          routeId: assignResult.data.id,
        },
      });

      return ok({
        outcome: "assigned",
        requestId: null,
        routeId: assignResult.data.id,
      });
    }

    const nowIso = new Date().toISOString();
    const { error: taskScheduleError } = await supabase
      .from("shipment_logistics_tasks")
      .update({
        ...schedulePatch,
        status:
          task.status === "pending"
            ? "scheduled"
            : task.status,
        updated_at: nowIso,
      })
      .eq("id", taskId)
      .eq("organization_id", session.organizationId);

    if (taskScheduleError) {
      return fail(taskScheduleError.message);
    }

    const { data: request, error: requestError } =
      await supabase
        .from("customer_route_assignment_requests")
        .insert({
          organization_id: session.organizationId,
          customer_id: customerId,
          shipment_id: shipmentId,
          task_id: taskId,
          route_template_id: routeTemplateId,
          scheduled_at: schedulePatch.scheduled_at,
          driver_id: driverId || null,
          zone_key: zoneKey,
          status: "pending",
          requested_by: session.userId,
        })
        .select("id")
        .single();

    if (requestError || !request) {
      return fail(
        requestError?.message ||
          "No se pudo crear la solicitud",
      );
    }

    await recordActivityHistory(supabase, session, {
      action: "customer.route_assignment.requested",
      entityType: "shipment",
      entityId: shipmentId,
      title: `Ruta pendiente de logística: ${shipment.code}`,
      description: `${template.name} · ${zoneKey}`,
      metadata: {
        requestId: request.id,
        taskId,
        routeTemplateId,
        driverId,
        zoneKey,
      },
    });

    return ok({
      outcome: "pending_approval",
      requestId: request.id as string,
      routeId: null,
    });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
