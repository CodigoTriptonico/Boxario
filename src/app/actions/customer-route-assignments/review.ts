"use server";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { canReviewCustomerRoute } from "@/app/actions/customer-route-assignments/shared";
import { recordActivityHistory } from "@/lib/activity-history";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import { requireAppSession } from "@/lib/auth/session";
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

type RouteRequestRow = {
  id: string;
  customer_id: string;
  shipment_id: string;
  task_id: string;
  route_definition_id: string | null;
  route_schedule_id: string | null;
  route_name: string;
  address_fingerprint: string | null;
  postal_code: string | null;
  status: string;
};

function databaseClient(value: unknown) {
  return value as SupabaseClient;
}

async function loadRequest(database: SupabaseClient, organizationId: string, requestId: string) {
  const { data, error } = await database
    .from("customer_route_assignment_requests")
    .select("id, customer_id, shipment_id, task_id, route_definition_id, route_schedule_id, route_name, address_fingerprint, postal_code, status")
    .eq("id", requestId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error || !data) throw new Error(error?.message || "Solicitud no encontrada");
  return data as RouteRequestRow;
}

async function loadAddressIdentity(database: SupabaseClient, organizationId: string, customerId: string) {
  const { data, error } = await database
    .from("customers")
    .select("street, house_number, neighborhood, city, state, postal_code, country, formatted_address, place_id, lat, lng")
    .eq("id", customerId)
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (error || !data) throw new Error(error?.message || "Remitente no encontrado");
  const postalCode = normalizeUsPostalCode(data.postal_code) || "";
  const fingerprint = createHash("sha256")
    .update(normalizedAddressFingerprintSource({
      ...data,
      houseNumber: data.house_number,
      postalCode: data.postal_code,
      placeId: data.place_id,
      formattedAddress: data.formatted_address,
    }))
    .digest("hex");
  return { data, postalCode, fingerprint };
}

async function resetTaskToPending(database: SupabaseClient, organizationId: string, taskId: string) {
  const { error } = await database
    .from("shipment_logistics_tasks")
    .update({
      ...logisticsScheduleWindowPatch(null),
      schedule_confirmation_status: "pending",
      status: "pending",
      assigned_to: null,
      assigned_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("organization_id", organizationId);
  if (error) throw new Error(error.message);
}

export async function reviewCustomerRouteAssignmentRequestAction(input: {
  requestId: string;
  decision: "approved" | "rejected";
  note?: string;
}): Promise<ActionResult<{ routeId: string | null }>> {
  try {
    const session = await requireAppSession();
    if (!canReviewCustomerRoute(session)) throw new Error("FORBIDDEN");
    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");
    const database = databaseClient(supabase);
    const requestId = String(input.requestId || "").trim();
    const note = String(input.note || "").trim();
    if (!requestId) return fail("Solicitud inválida");
    const request = await loadRequest(database, session.organizationId, requestId);
    if (request.status !== "pending_approval") return fail("La solicitud ya fue revisada");

    if (input.decision === "rejected") {
      if (note.length < 3) return fail("Escribe el motivo del rechazo");
      await resetTaskToPending(database, session.organizationId, request.task_id);
      const { error } = await database.from("customer_route_assignment_requests").update({
        status: "rejected", reviewed_by: session.userId, reviewed_at: new Date().toISOString(),
        review_note: note, updated_at: new Date().toISOString(),
      }).eq("id", requestId).eq("organization_id", session.organizationId).eq("status", "pending_approval");
      if (error) throw new Error(error.message);
      await recordActivityHistory(supabase, session, {
        action: "customer.route_assignment.rejected", entityType: "shipment", entityId: request.shipment_id,
        title: "Solicitud logística rechazada", description: note,
        metadata: { requestId, taskId: request.task_id, routeDefinitionId: request.route_definition_id },
      });
      return ok({ routeId: null });
    }

    if (!request.route_definition_id || !request.route_schedule_id) {
      return fail("La solicitud no pertenece a una ruta geográfica vigente");
    }
    const address = await loadAddressIdentity(database, session.organizationId, request.customer_id);
    if (address.fingerprint !== request.address_fingerprint) {
      return fail("La dirección cambió; el vendedor debe volver a evaluar la ruta");
    }
    const { data: existingApproval, error: approvalLookupError } = await database
      .from("logistics_route_address_approvals")
      .select("id")
      .eq("organization_id", session.organizationId)
      .eq("customer_id", request.customer_id)
      .eq("route_definition_id", request.route_definition_id)
      .eq("address_fingerprint", address.fingerprint)
      .is("revoked_at", null)
      .maybeSingle();
    if (approvalLookupError) throw new Error(approvalLookupError.message);
    if (!existingApproval) {
      const { error } = await database.from("logistics_route_address_approvals").insert({
        organization_id: session.organizationId,
        customer_id: request.customer_id,
        route_definition_id: request.route_definition_id,
        address_fingerprint: address.fingerprint,
        postal_code: address.postalCode || null,
        place_id: address.data.place_id || "",
        lat: address.data.lat,
        lng: address.data.lng,
        approved_by: session.userId,
      });
      if (error) throw new Error(error.message);
    }
    const { error: updateError } = await database.from("customer_route_assignment_requests").update({
      status: "template_confirmed", reviewed_by: session.userId, reviewed_at: new Date().toISOString(),
      review_note: note, updated_at: new Date().toISOString(),
    }).eq("id", requestId).eq("organization_id", session.organizationId).eq("status", "pending_approval");
    if (updateError) throw new Error(updateError.message);
    const confirmedAt = new Date().toISOString();
    const { error: taskConfirmationError } = await database.from("shipment_logistics_tasks").update({
      schedule_confirmation_status: "confirmed",
      schedule_confirmed_at: confirmedAt,
      schedule_confirmed_by: session.userId,
      updated_at: confirmedAt,
    }).eq("id", request.task_id).eq("organization_id", session.organizationId);
    if (taskConfirmationError) throw new Error(taskConfirmationError.message);
    await recordActivityHistory(supabase, session, {
      action: "customer.route_assignment.template_confirmed", entityType: "shipment", entityId: request.shipment_id,
      title: "Dirección confirmada en plantilla",
      description: "La aprobación se guardó para esta dirección exacta. No se creó un recorrido operativo.",
      metadata: { requestId, taskId: request.task_id, routeDefinitionId: request.route_definition_id, routeScheduleId: request.route_schedule_id, addressFingerprint: address.fingerprint },
    });
    return ok({ routeId: null });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function deferCustomerRouteAssignmentRequestAction(input: {
  requestId: string;
  note: string;
}): Promise<ActionResult<{ requestId: string }>> {
  try {
    const session = await requireAppSession();
    if (!canReviewCustomerRoute(session)) throw new Error("FORBIDDEN");
    const note = String(input.note || "").trim();
    if (note.length < 3) return fail("Escribe por qué se deja pendiente");
    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");
    const database = databaseClient(supabase);
    const request = await loadRequest(database, session.organizationId, input.requestId);
    if (!['pending_approval', 'template_confirmed'].includes(request.status)) return fail("La solicitud ya fue procesada");
    await resetTaskToPending(database, session.organizationId, request.task_id);
    const { error } = await database.from("customer_route_assignment_requests").update({
      status: "deferred", reviewed_by: session.userId, reviewed_at: new Date().toISOString(),
      review_note: note, updated_at: new Date().toISOString(),
    }).eq("id", request.id).eq("organization_id", session.organizationId).in("status", ["pending_approval", "template_confirmed"]);
    if (error) throw new Error(error.message);
    await recordActivityHistory(supabase, session, {
      action: "customer.route_assignment.deferred", entityType: "shipment", entityId: request.shipment_id,
      title: "Solicitud devuelta a Tareas", description: note, metadata: { requestId: request.id, taskId: request.task_id },
    });
    return ok({ requestId: request.id });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function replaceCustomerRouteAssignmentRequestAction(input: {
  requestId: string;
  routeTemplateId: string;
  scheduledAt: string;
  driverId?: string | null;
  note?: string;
}): Promise<ActionResult<{ routeId: string | null }>> {
  try {
    const session = await requireAppSession();
    if (!canReviewCustomerRoute(session)) throw new Error("FORBIDDEN");
    const routeScheduleId = String(input.routeTemplateId || "").trim();
    const routeDate = scheduledAtToLocalDateInput(input.scheduledAt);
    if (!routeScheduleId || !/^\d{4}-\d{2}-\d{2}$/.test(routeDate)) return fail("Completa la ruta y la fecha de reemplazo");
    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");
    const database = databaseClient(supabase);
    const request = await loadRequest(database, session.organizationId, input.requestId);
    if (!['pending_approval', 'template_confirmed'].includes(request.status)) return fail("La solicitud ya fue procesada");
    const { data: schedule, error: scheduleError } = await database.from("logistics_route_schedules")
      .select("id, route_definition_id, weekday, is_active")
      .eq("id", routeScheduleId).eq("organization_id", session.organizationId).eq("is_active", true).maybeSingle();
    if (scheduleError || !schedule) return fail(scheduleError?.message || "Horario de ruta no disponible");
    if (Number(schedule.weekday) !== getLogisticsWeekdayIndex(routeDate)) return fail("La ruta no corresponde al día elegido");
    const { data: definition, error: definitionError } = await database.from("logistics_route_definitions")
      .select("id, name, coverage_mode").eq("id", schedule.route_definition_id)
      .eq("organization_id", session.organizationId).eq("status", "active").maybeSingle();
    if (definitionError || !definition) return fail(definitionError?.message || "Ruta no disponible");
    const address = await loadAddressIdentity(database, session.organizationId, request.customer_id);
    if (definition.coverage_mode === "postal_codes") {
      const { data: covered } = await database.from("logistics_route_postal_codes").select("id")
        .eq("route_definition_id", definition.id).eq("postal_code", address.postalCode).maybeSingle();
      if (!covered) return fail("El ZIP de la dirección no pertenece a la nueva ruta");
    }
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
      if (!addressMatchesCoveragePlaces({
        places,
        address: {
          city: address.data.city,
          neighborhood: address.data.neighborhood,
          placeId: address.data.place_id,
          lat: address.data.lat,
          lng: address.data.lng,
          postalCode: address.postalCode,
          formattedAddress: address.data.formatted_address,
        },
      })) {
        return fail("La dirección no pertenece a la cobertura de la nueva ruta");
      }
    }
    const { data: approval } = await database.from("logistics_route_address_approvals").select("id")
      .eq("organization_id", session.organizationId).eq("customer_id", request.customer_id)
      .eq("route_definition_id", definition.id).eq("address_fingerprint", address.fingerprint).is("revoked_at", null).maybeSingle();
    const nextStatus = definition.coverage_mode === "postal_codes" || definition.coverage_mode === "places" || approval
      ? "template_confirmed"
      : "pending_approval";
    const { error: taskError } = await database.from("shipment_logistics_tasks").update({
      ...logisticsScheduleWindowPatch(input.scheduledAt),
      schedule_confirmation_status: nextStatus === "template_confirmed" ? "confirmed" : "pending",
      schedule_confirmed_at: nextStatus === "template_confirmed" ? new Date().toISOString() : null,
      schedule_confirmed_by: nextStatus === "template_confirmed" ? session.userId : null,
      assigned_to: null, assigned_at: null, updated_at: new Date().toISOString(),
    }).eq("id", request.task_id).eq("organization_id", session.organizationId);
    if (taskError) throw new Error(taskError.message);
    const { error: updateError } = await database.from("customer_route_assignment_requests").update({
      route_template_id: null, route_definition_id: definition.id, route_schedule_id: schedule.id,
      route_date: routeDate, route_weekday: schedule.weekday, route_name: definition.name,
      scheduled_at: logisticsScheduleWindowPatch(input.scheduledAt).scheduled_at,
      address_fingerprint: address.fingerprint, postal_code: address.postalCode, status: nextStatus,
      reviewed_by: nextStatus === "template_confirmed" ? session.userId : null,
      reviewed_at: nextStatus === "template_confirmed" ? new Date().toISOString() : null,
      review_note: String(input.note || "").trim(), updated_at: new Date().toISOString(),
    }).eq("id", request.id).eq("organization_id", session.organizationId);
    if (updateError) throw new Error(updateError.message);
    await recordActivityHistory(supabase, session, {
      action: "customer.route_assignment.moved", entityType: "shipment", entityId: request.shipment_id,
      title: `Solicitud movida a ${definition.name}`,
      description: nextStatus === "template_confirmed" ? "Quedó confirmada en la nueva plantilla" : "Quedó pendiente de aprobación en la nueva plantilla",
      metadata: { requestId: request.id, routeDefinitionId: definition.id, routeScheduleId: schedule.id, previousRouteDefinitionId: request.route_definition_id },
    });
    return ok({ routeId: null });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
