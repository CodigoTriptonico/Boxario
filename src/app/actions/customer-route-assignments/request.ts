"use server";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  canProposeCustomerRoute,
  canReviewCustomerRoute,
} from "@/app/actions/customer-route-assignments/shared";
import type { CustomerRouteAssignmentResult } from "@/app/actions/customer-route-assignments/types";
import { recordActivityHistory } from "@/lib/activity-history";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import { requireAppSession } from "@/lib/auth/session";
import { customerRouteAssignmentZoneKey } from "@/lib/customer-route-assignment-zone";
import { logisticsWeekdayKeys } from "@/lib/logistics-route-catalog";
import { isDayAsRouteTemplateId } from "@/lib/logistics-day-route";
import {
  addressMatchesCoveragePlaces,
  normalizeCoveragePlaceColor,
  normalizeCoveragePlaceKind,
  normalizeCoveragePlaceSelectionRole,
  normalizeUsPostalCode,
  normalizedAddressFingerprintSource,
  parseCoveragePlaceBounds,
  type RouteCoveragePlace,
} from "@/lib/logistics-route-coverage";
import { getLogisticsWeekdayIndex } from "@/lib/logistics-route-week";
import { logisticsScheduleWindowPatch } from "@/lib/logistics-schedule-window";
import { scheduledAtToLocalDateInput } from "@/lib/schedule-date";
import { createScopedSupabase } from "@/lib/supabase/scoped";

export async function requestCustomerRouteAssignmentAction(input: {
  shipmentId: string;
  taskId: string;
  /** Compatibility name: this is now a logistics_route_schedules id. */
  routeTemplateId: string;
  scheduledAt: string;
  driverId?: string | null;
  boxCount?: number;
  /** Logística puede confirmar directamente la entrada a Plantillas. */
  confirmImmediately?: boolean;
}): Promise<ActionResult<CustomerRouteAssignmentResult>> {
  try {
    const session = await requireAppSession();
    if (!canProposeCustomerRoute(session)) throw new Error("FORBIDDEN");
    const confirmImmediately = Boolean(input.confirmImmediately);
    if (confirmImmediately && !canReviewCustomerRoute(session)) throw new Error("FORBIDDEN");
    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");
    const database = supabase as unknown as SupabaseClient;
    const shipmentId = String(input.shipmentId || "").trim();
    const taskId = String(input.taskId || "").trim();
    const requestedRouteId = String(input.routeTemplateId || "").trim();
    const schedulePatch = logisticsScheduleWindowPatch(input.scheduledAt);
    const routeDate = scheduledAtToLocalDateInput(input.scheduledAt);
    const routeWeekday = getLogisticsWeekdayIndex(routeDate);
    if (!shipmentId || !taskId || !requestedRouteId || !schedulePatch.scheduled_at || routeWeekday < 0) {
      return fail("Completa fecha, hora y ruta");
    }
    let routeScheduleId = requestedRouteId;
    if (isDayAsRouteTemplateId(requestedRouteId)) {
      const { data: generalDefinition, error: generalDefinitionError } = await database
        .from("logistics_route_definitions")
        .select("id")
        .eq("organization_id", session.organizationId)
        .eq("status", "active")
        .eq("is_system_general", true)
        .eq("system_weekday", routeWeekday)
        .maybeSingle();
      if (generalDefinitionError || !generalDefinition) {
        return fail(generalDefinitionError?.message || "La ruta general del d\u00eda no est\u00e1 disponible");
      }

      const { data: generalSchedule, error: generalScheduleError } = await database
        .from("logistics_route_schedules")
        .select("id")
        .eq("organization_id", session.organizationId)
        .eq("route_definition_id", generalDefinition.id)
        .eq("weekday", routeWeekday)
        .eq("is_active", true)
        .maybeSingle();
      if (generalScheduleError || !generalSchedule) {
        return fail(generalScheduleError?.message || "La ruta general no tiene horario para ese d\u00eda");
      }
      routeScheduleId = String(generalSchedule.id);
    }

    const [{ data: shipment, error: shipmentError }, { data: task, error: taskError }, { data: schedule, error: scheduleError }, { data: settings }] = await Promise.all([
      database.from("shipments").select("id, code, customer_id").eq("id", shipmentId).eq("organization_id", session.organizationId).maybeSingle(),
      database.from("shipment_logistics_tasks").select("id, shipment_id, status").eq("id", taskId).eq("organization_id", session.organizationId).maybeSingle(),
      database.from("logistics_route_schedules").select("id, route_definition_id, weekday, start_time, estimated_end_time, max_stops, max_boxes, is_active")
        .eq("id", routeScheduleId).eq("organization_id", session.organizationId).eq("is_active", true).maybeSingle(),
      database.from("organization_route_settings").select("delivery_days, pickup_days").eq("organization_id", session.organizationId).maybeSingle(),
    ]);
    if (shipmentError || !shipment) return fail(shipmentError?.message || "Envío no encontrado");
    if (taskError || !task || task.shipment_id !== shipmentId) return fail(taskError?.message || "Tarea no encontrada");
    if (["completed", "cancelled"].includes(String(task.status))) return fail("La tarea ya está cerrada");
    if (scheduleError || !schedule) return fail(scheduleError?.message || "El horario de ruta ya no está disponible");
    if (Number(schedule.weekday) !== routeWeekday) return fail("La ruta no corresponde al día elegido");
    const weekdayKey = logisticsWeekdayKeys[routeWeekday];
    const enabledDays = [...(settings?.delivery_days || []), ...(settings?.pickup_days || [])];
    if (!weekdayKey || !enabledDays.includes(weekdayKey)) return fail("El día está desactivado en el calendario de rutas");

    const selectedDate = new Date(schedulePatch.scheduled_at);
    const selectedTime = `${String(selectedDate.getHours()).padStart(2, "0")}:${String(selectedDate.getMinutes()).padStart(2, "0")}`;
    const startTime = String(schedule.start_time).slice(0, 5);
    const endTime = String(schedule.estimated_end_time || "").slice(0, 5);
    if (selectedTime < startTime || (endTime && selectedTime > endTime)) return fail("La hora está fuera del horario de esta ruta");

    const { data: definition, error: definitionError } = await database.from("logistics_route_definitions")
      .select("id, name, zone_name, coverage_mode, status, is_system_general")
      .eq("id", schedule.route_definition_id).eq("organization_id", session.organizationId).eq("status", "active").maybeSingle();
    if (definitionError || !definition) return fail(definitionError?.message || "Ruta no disponible");
    const assignmentZoneKey = customerRouteAssignmentZoneKey({
      zoneName: definition.zone_name,
      isSystemGeneral: definition.is_system_general,
      weekday: routeWeekday,
      routeDefinitionId: definition.id,
    });
    const customerId = String(shipment.customer_id || "");
    if (!customerId) return fail("El envío no tiene remitente");
    const { data: customer, error: customerError } = await database.from("customers")
      .select("street, house_number, neighborhood, city, state, postal_code, country, formatted_address, place_id, lat, lng")
      .eq("id", customerId).eq("organization_id", session.organizationId).maybeSingle();
    if (customerError || !customer) return fail(customerError?.message || "Remitente no encontrado");
    const postalCode = normalizeUsPostalCode(customer.postal_code) || "";
    const fingerprint = createHash("sha256").update(normalizedAddressFingerprintSource({
      ...customer, houseNumber: customer.house_number, postalCode: customer.postal_code,
      placeId: customer.place_id, formattedAddress: customer.formatted_address,
    })).digest("hex");
    let coverageMatches = false;
    if (definition.coverage_mode === "places") {
      const { data: placeRows, error: placesError } = await database
        .from("logistics_route_coverage_places")
        .select("place_id, display_name, kind, parent_place_id, selection_role, lat, lng, bounds, color")
        .eq("organization_id", session.organizationId)
        .eq("route_definition_id", definition.id);
      if (placesError) return fail(placesError.message);
      const places: RouteCoveragePlace[] = (placeRows || []).map((row) => ({
        placeId: String(row.place_id || ""),
        displayName: String(row.display_name || ""),
        kind: normalizeCoveragePlaceKind(row.kind),
        parentPlaceId: row.parent_place_id ? String(row.parent_place_id) : null,
        selectionRole: normalizeCoveragePlaceSelectionRole(row.selection_role),
        lat: row.lat == null ? null : Number(row.lat),
        lng: row.lng == null ? null : Number(row.lng),
        bounds: parseCoveragePlaceBounds(row.bounds),
        color: normalizeCoveragePlaceColor(row.color),
      }));
      coverageMatches = addressMatchesCoveragePlaces({
        places,
        address: {
          ...customer,
          houseNumber: customer.house_number,
          postalCode: customer.postal_code,
          placeId: customer.place_id,
          formattedAddress: customer.formatted_address,
        },
      });
    }

    const [{ count: packageCount }, { data: reservations }, { data: existingStop }, { data: activeRequest }] = await Promise.all([
      database.from("shipment_packages").select("id", { count: "exact", head: true }).eq("organization_id", session.organizationId).eq("shipment_id", shipmentId),
      database.from("customer_route_assignment_requests").select("box_count").eq("organization_id", session.organizationId)
        .eq("route_schedule_id", routeScheduleId).eq("route_date", routeDate).in("status", ["pending_approval", "template_confirmed"]),
      database.from("logistics_route_stops").select("id").eq("task_id", taskId).is("released_at", null).maybeSingle(),
      database.from("customer_route_assignment_requests").select("id").eq("task_id", taskId).in("status", ["pending_approval", "template_confirmed", "routed"]).maybeSingle(),
    ]);
    if (existingStop) return fail("Esta tarea ya está en una ruta operativa");
    if (activeRequest) return fail("Esta caja ya está dentro de una plantilla");
    const boxCount = Math.max(1, Number(input.boxCount || packageCount || 1));
    const reservedStops = (reservations || []).length;
    const reservedBoxes = (reservations || []).reduce((total, row) => total + Math.max(1, Number(row.box_count || 1)), 0);
    if (schedule.max_stops != null && reservedStops + 1 > Number(schedule.max_stops)) return fail("La ruta ya alcanzó su capacidad de paradas");
    if (schedule.max_boxes != null && reservedBoxes + boxCount > Number(schedule.max_boxes)) return fail("La ruta ya alcanzó su capacidad de cajas");

    // Ventas puede proponer una excepción fuera de cobertura, pero solo
    // Logística puede verificarla y confirmar su entrada a Preparación.
    const status = confirmImmediately ? "template_confirmed" : "pending_approval";
    const nowIso = new Date().toISOString();
    const { data: request, error: requestError } = await database.from("customer_route_assignment_requests").insert({
      organization_id: session.organizationId, customer_id: customerId, shipment_id: shipmentId, task_id: taskId,
      route_template_id: null, route_definition_id: definition.id, route_schedule_id: schedule.id,
      route_date: routeDate, route_weekday: routeWeekday, route_name: definition.name,
      scheduled_at: schedulePatch.scheduled_at, driver_id: null, zone_key: assignmentZoneKey,
      address_fingerprint: fingerprint, postal_code: postalCode || null, box_count: boxCount, status,
      coverage_status: coverageMatches ? "matched" : "outside",
      requested_by: session.userId,
      reviewed_by: confirmImmediately ? session.userId : null,
      reviewed_at: confirmImmediately ? nowIso : null,
      review_note: confirmImmediately ? "Confirmada por Logística al programar" : "",
    }).select("id").single();
    if (requestError || !request) return fail(requestError?.message || "No se pudo agregar la caja a la plantilla");
    const { error: updateTaskError } = await database.from("shipment_logistics_tasks").update({
      ...schedulePatch, status: task.status === "pending" ? "scheduled" : task.status,
      schedule_confirmation_status: status === "template_confirmed" ? "confirmed" : "pending",
      schedule_confirmed_at: status === "template_confirmed" ? nowIso : null,
      schedule_confirmed_by: status === "template_confirmed" ? session.userId : null,
      assigned_to: null, assigned_at: null, updated_at: nowIso,
    }).eq("id", taskId).eq("organization_id", session.organizationId);
    if (updateTaskError) {
      await database.from("customer_route_assignment_requests").update({
        status: "rejected",
        review_note: "No se pudo guardar el horario de la tarea",
        reviewed_by: session.userId,
        reviewed_at: nowIso,
        updated_at: nowIso,
      }).eq("id", request.id).eq("organization_id", session.organizationId);
      throw new Error(updateTaskError.message);
    }
    await recordActivityHistory(supabase, session, {
      action: confirmImmediately ? "customer.route_template.confirmed" : "customer.route_template.requested",
      entityType: "shipment", entityId: shipmentId,
      title: `${status === "template_confirmed" ? "Confirmada" : "Pendiente de aprobación"}: ${shipment.code}`,
      description: confirmImmediately
        ? `${definition.name} · ${routeDate}. Confirmada por Logística; aún no existe recorrido operativo.`
        : `${definition.name} · ${routeDate}. Aún no existe recorrido operativo.`,
      metadata: { requestId: request.id, taskId, routeDefinitionId: definition.id, routeScheduleId: schedule.id, addressFingerprint: fingerprint, postalCode, boxCount, status, coverageStatus: coverageMatches ? "matched" : "outside" },
    });
    return ok({ outcome: status, requestId: String(request.id), routeId: null });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
