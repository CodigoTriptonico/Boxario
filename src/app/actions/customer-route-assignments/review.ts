"use server";

import { confirmLogisticsTaskScheduleAction } from "@/app/actions/logistics-routes";
import {
  canReviewCustomerRoute,
  loadCustomerZone,
  upsertCustomerRouteVerification,
} from "@/app/actions/customer-route-assignments/shared";
import { recordActivityHistory } from "@/lib/activity-history";
import {
  actionErrorMessage,
  fail,
  ok,
  type ActionResult,
} from "@/lib/actions/errors";
import { requireAppSession } from "@/lib/auth/session";
import { customerHasRouteGeo } from "@/lib/customer-route-verification";
import {
  genericLogisticsRouteName,
  isDayAsRouteTemplateId,
} from "@/lib/logistics-day-route";
import { getLogisticsWeekdayIndex } from "@/lib/logistics-route-week";
import { customerRouteReplacementNote } from "@/lib/customer-route-replacement";
import { logisticsScheduleExpressionFromWindow } from "@/lib/logistics-schedule-window";
import { scheduledAtToLocalDateInput } from "@/lib/schedule-date";
import { createScopedSupabase } from "@/lib/supabase/scoped";

export async function reviewCustomerRouteAssignmentRequestAction(
  input: {
    requestId: string;
    decision: "approved" | "rejected";
    note?: string;
  },
): Promise<ActionResult<{ routeId: string | null }>> {
  try {
    const session = await requireAppSession();
    if (!canReviewCustomerRoute(session)) {
      throw new Error("FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const requestId = String(input.requestId || "").trim();
    if (
      !requestId ||
      (input.decision !== "approved" &&
        input.decision !== "rejected")
    ) {
      return fail("Solicitud inválida");
    }

    const { data: request, error: requestError } =
      await supabase
        .from("customer_route_assignment_requests")
        .select(
          "id, customer_id, shipment_id, task_id, route_template_id, scheduled_at, driver_id, zone_key, status",
        )
        .eq("id", requestId)
        .eq("organization_id", session.organizationId)
        .maybeSingle();

    if (requestError || !request) {
      return fail(
        requestError?.message || "Solicitud no encontrada",
      );
    }
    if (request.status !== "pending") {
      return fail("La solicitud ya fue revisada");
    }

    const nowIso = new Date().toISOString();
    const reviewNote = String(input.note || "").trim();

    if (input.decision === "rejected") {
      const { error: updateError } = await supabase
        .from("customer_route_assignment_requests")
        .update({
          status: "rejected",
          reviewed_by: session.userId,
          reviewed_at: nowIso,
          review_note: reviewNote,
          updated_at: nowIso,
        })
        .eq("id", requestId)
        .eq("organization_id", session.organizationId);

      if (updateError) {
        return fail(updateError.message);
      }

      await recordActivityHistory(supabase, session, {
        action: "customer.route_assignment.rejected",
        entityType: "shipment",
        entityId: request.shipment_id,
        title: "Asignación de ruta rechazada",
        description:
          reviewNote ||
          "Logística rechazó la ruta propuesta",
        metadata: {
          requestId,
          taskId: request.task_id,
        },
      });

      return ok({ routeId: null });
    }

    const { zoneKey: currentZoneKey, zoneInput } =
      await loadCustomerZone(
        supabase,
        session,
        request.customer_id,
      );
    if (
      !customerHasRouteGeo(zoneInput) ||
      currentZoneKey === "falta-geo"
    ) {
      return fail(
        "El remitente necesita geo antes de aprobar",
      );
    }
    if (currentZoneKey !== request.zone_key) {
      return fail(
        "La zona del remitente cambió; el vendedor debe volver a proponer la ruta",
      );
    }

    const { data: taskSchedule, error: taskScheduleError } =
      await supabase
        .from("shipment_logistics_tasks")
        .select(
          "scheduled_at, schedule_kind, window_start_at, window_end_at",
        )
        .eq("id", request.task_id)
        .eq("organization_id", session.organizationId)
        .maybeSingle();
    if (taskScheduleError || !taskSchedule) {
      return fail(
        taskScheduleError?.message ||
          "No se encontró el horario de la tarea",
      );
    }

    const scheduleExpression =
      logisticsScheduleExpressionFromWindow({
        scheduledAt: taskSchedule.scheduled_at,
        scheduleKind: taskSchedule.schedule_kind,
        windowStartAt: taskSchedule.window_start_at,
        windowEndAt: taskSchedule.window_end_at,
      }) || request.scheduled_at;
    const routeDate =
      scheduledAtToLocalDateInput(scheduleExpression);
    let assignDriverId = String(
      request.driver_id || "",
    ).trim();
    if (!assignDriverId) {
      const { data: weekdayDefault } = await supabase
        .from("logistics_weekday_defaults")
        .select("default_driver_id")
        .eq("organization_id", session.organizationId)
        .eq("weekday", getLogisticsWeekdayIndex(routeDate))
        .maybeSingle();
      assignDriverId = String(
        weekdayDefault?.default_driver_id || "",
      ).trim();
    }

    const assignResult =
      await confirmLogisticsTaskScheduleAction({
        taskId: request.task_id,
        scheduledAt: scheduleExpression,
        driverId: assignDriverId || null,
        routeTemplateId: request.route_template_id,
      });
    if (!assignResult.ok) {
      return fail(assignResult.error);
    }

    await upsertCustomerRouteVerification({
      supabase,
      session,
      customerId: request.customer_id,
      routeTemplateId: request.route_template_id,
      zoneKey: currentZoneKey,
    });

    const { error: updateError } = await supabase
      .from("customer_route_assignment_requests")
      .update({
        status: "approved",
        reviewed_by: session.userId,
        reviewed_at: nowIso,
        review_note: reviewNote,
        updated_at: nowIso,
      })
      .eq("id", requestId)
      .eq("organization_id", session.organizationId);

    if (updateError) {
      return fail(updateError.message);
    }

    await recordActivityHistory(supabase, session, {
      action: "customer.route_assignment.approved",
      entityType: "shipment",
      entityId: request.shipment_id,
      title: "Asignación de ruta aprobada",
      description: `Remitente verificado · ${assignResult.data.name}`,
      metadata: {
        requestId,
        taskId: request.task_id,
        routeId: assignResult.data.id,
        zoneKey: currentZoneKey,
      },
    });

    return ok({ routeId: assignResult.data.id });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function replaceCustomerRouteAssignmentRequestAction(
  input: {
    requestId: string;
    routeTemplateId: string;
    scheduledAt: string;
    driverId?: string | null;
    note?: string;
  },
): Promise<ActionResult<{ routeId: string }>> {
  try {
    const session = await requireAppSession();
    if (!canReviewCustomerRoute(session)) {
      throw new Error("FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const requestId = String(input.requestId || "").trim();
    const routeTemplateId = String(
      input.routeTemplateId || "",
    ).trim();
    const dayAsRoute =
      isDayAsRouteTemplateId(routeTemplateId);
    let driverId = String(input.driverId || "").trim();
    const scheduledAt = String(input.scheduledAt || "").trim();
    const routeDate = scheduledAtToLocalDateInput(scheduledAt);

    if (
      !requestId ||
      !routeTemplateId ||
      !/^\d{4}-\d{2}-\d{2}$/.test(routeDate)
    ) {
      return fail(
        "Completa la ruta y la fecha de reemplazo",
      );
    }

    const { data: request, error: requestError } =
      await supabase
        .from("customer_route_assignment_requests")
        .select(
          "id, customer_id, shipment_id, task_id, route_template_id, scheduled_at, driver_id, zone_key, status",
        )
        .eq("id", requestId)
        .eq("organization_id", session.organizationId)
        .maybeSingle();

    if (requestError || !request) {
      return fail(
        requestError?.message || "Solicitud no encontrada",
      );
    }
    if (request.status !== "pending") {
      return fail("La solicitud ya fue revisada");
    }

    const newTemplatePromise = dayAsRoute
      ? Promise.resolve({ data: null, error: null })
      : supabase
          .from("logistics_route_templates")
          .select("id, name, weekday")
          .eq("id", routeTemplateId)
          .eq("organization_id", session.organizationId)
          .maybeSingle();
    const [
      { data: oldTemplate },
      { data: newTemplateRow, error: templateError },
    ] = await Promise.all([
      supabase
        .from("logistics_route_templates")
        .select("id, name")
        .eq("id", request.route_template_id)
        .eq("organization_id", session.organizationId)
        .maybeSingle(),
      newTemplatePromise,
    ]);

    if (!dayAsRoute && (templateError || !newTemplateRow)) {
      return fail(
        templateError?.message ||
          "Ruta semanal no encontrada",
      );
    }

    const replacementWeekday =
      getLogisticsWeekdayIndex(routeDate);
    let newTemplate: {
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
        !enabledDays?.includes(dayKeys[replacementWeekday])
      ) {
        return fail(
          daysError?.message ||
            "El dia no esta disponible en el calendario de rutas",
        );
      }
      newTemplate = {
        id: null,
        weekday: replacementWeekday,
        name: genericLogisticsRouteName(replacementWeekday),
      };
    } else {
      newTemplate = {
        id: String(newTemplateRow?.id || ""),
        weekday: Number(newTemplateRow?.weekday),
        name: String(newTemplateRow?.name || ""),
      };
    }

    if (
      Number(newTemplate.weekday) !== replacementWeekday
    ) {
      return fail(
        "La ruta de reemplazo no corresponde al día elegido",
      );
    }

    const { zoneKey: currentZoneKey, zoneInput } =
      await loadCustomerZone(
        supabase,
        session,
        request.customer_id,
      );
    if (
      !customerHasRouteGeo(zoneInput) ||
      currentZoneKey === "falta-geo"
    ) {
      return fail(
        "El remitente necesita geo antes de cambiar la ruta",
      );
    }
    if (currentZoneKey !== request.zone_key) {
      return fail(
        "La zona del remitente cambió; el vendedor debe volver a proponer la ruta",
      );
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

    const assignResult =
      await confirmLogisticsTaskScheduleAction({
        taskId: request.task_id,
        scheduledAt,
        driverId: driverId || null,
        routeTemplateId,
      });
    if (!assignResult.ok) {
      return fail(assignResult.error);
    }

    if (!dayAsRoute) {
      await upsertCustomerRouteVerification({
        supabase,
        session,
        customerId: request.customer_id,
        routeTemplateId,
        zoneKey: currentZoneKey,
      });
    }

    const nowIso = new Date().toISOString();
    const reviewNote =
      String(input.note || "").trim() ||
      customerRouteReplacementNote(
        String(oldTemplate?.name || "propuesta"),
        String(newTemplate.name || "nueva ruta"),
      );

    const { error: updateError } = await supabase
      .from("customer_route_assignment_requests")
      .update({
        status: "rejected",
        reviewed_by: session.userId,
        reviewed_at: nowIso,
        review_note: reviewNote,
        updated_at: nowIso,
      })
      .eq("id", requestId)
      .eq("organization_id", session.organizationId);

    if (updateError) {
      return fail(updateError.message);
    }

    await recordActivityHistory(supabase, session, {
      action: "customer.route_assignment.replaced",
      entityType: "shipment",
      entityId: request.shipment_id,
      title:
        "Ruta propuesta reemplazada por logística",
      description: reviewNote,
      metadata: {
        requestId,
        taskId: request.task_id,
        previousRouteTemplateId:
          request.route_template_id,
        routeTemplateId: newTemplate.id,
        dayAsRoute,
        routeId: assignResult.data.id,
        zoneKey: currentZoneKey,
        driverId,
      },
    });

    return ok({ routeId: assignResult.data.id });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
