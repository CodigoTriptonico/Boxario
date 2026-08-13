import type {
  CustomerRouteAssignmentDbRow,
  CustomerRouteAssignmentRequestRow,
} from "@/app/actions/customer-route-assignments/types";
import { sessionHasPermission } from "@/lib/auth/permissions";
import type { AppSession } from "@/lib/auth/types";
import { customerZoneKeyFromParts } from "@/lib/customer-route-verification";
import { routeAddressFromCustomer } from "@/lib/logistics-address";
import { logisticsScheduleExpressionFromWindow } from "@/lib/logistics-schedule-window";
import {
  readBoxLinesFromLogisticsPlan,
  shipmentBoxLinesDetailLabel,
} from "@/lib/shipment-display";
import { createScopedSupabase } from "@/lib/supabase/scoped";
import { normalizeGenericLogisticsRouteName } from "@/lib/logistics-day-route";

type CustomerRouteSupabase = NonNullable<
  Awaited<ReturnType<typeof createScopedSupabase>>
>;

export function canProposeCustomerRoute(session: AppSession) {
  return (
    sessionHasPermission(session, "sales.manage") ||
    sessionHasPermission(session, "routes.update_status")
  );
}

export function canReviewCustomerRoute(session: AppSession) {
  return sessionHasPermission(session, "routes.update_status");
}

export function mapRequestRow(
  row: CustomerRouteAssignmentDbRow,
): CustomerRouteAssignmentRequestRow {
  const first = String(row.customer?.first_name || "").trim();
  const last = String(row.customer?.last_name || "").trim();
  const driverId = String(row.driver_id || "").trim();
  const address = routeAddressFromCustomer(
    row.customer
      ? {
          id: row.customer_id,
          ...row.customer,
        }
      : null,
  );
  const boxLines = readBoxLinesFromLogisticsPlan(
    row.shipment?.logistics_plan,
  );
  const phones = Array.isArray(row.customer?.phones)
    ? row.customer.phones
    : [];
  const routeWeekday = Number(
    row.schedule?.weekday ?? row.template?.weekday ?? row.route_weekday ?? -1,
  );
  const routeTemplateName = String(
    row.definition?.name || row.template?.name || row.route_name || "",
  ).trim() || "Ruta";

  return {
    id: row.id,
    customerId: row.customer_id,
    customerName:
      [first, last].filter(Boolean).join(" ") || "Remitente",
    customerPhone: String(
      address?.phone || phones[0] || "",
    ).trim(),
    formattedAddress:
      String(address?.formattedAddress || "").trim() ||
      "Sin dirección",
    addressReference: String(
      address?.addressReference || "",
    ).trim(),
    shipmentId: row.shipment_id,
    shipmentCode:
      String(row.shipment?.code || "").trim() || "—",
    taskId: row.task_id,
    taskType: String(row.task?.task_type || "").trim(),
    routeTemplateId: row.route_template_id || null,
    routeDefinitionId: row.route_definition_id || null,
    routeScheduleId: row.route_schedule_id || null,
    routeTemplateName: normalizeGenericLogisticsRouteName(routeTemplateName, routeWeekday),
    routeWeekday,
    routeDate: row.route_date,
    routeId: row.route_id || null,
    scheduledAt:
      logisticsScheduleExpressionFromWindow({
        scheduledAt:
          row.task?.scheduled_at || row.scheduled_at,
        scheduleKind: row.task?.schedule_kind,
        windowStartAt: row.task?.window_start_at,
        windowEndAt: row.task?.window_end_at,
      }) || row.scheduled_at,
    driverId,
    driverLabel: driverId
      ? String(row.driver?.full_name || "").trim() ||
        String(row.driver?.email || "").trim() ||
        "Conductor"
      : "Sin conductor todavía",
    zoneKey: row.zone_key,
    postalCode: row.postal_code || "",
    addressFingerprint: row.address_fingerprint || "",
    coverageStatus: row.coverage_status === "outside" ? "outside" : "matched",
    lat: address?.lat ?? null,
    lng: address?.lng ?? null,
    boxLines,
    boxSummary:
      shipmentBoxLinesDetailLabel(boxLines) ||
      "Sin cajas en el plan",
    status:
      row.status as CustomerRouteAssignmentRequestRow["status"],
    requestedBy: row.requested_by,
    createdAt: row.created_at,
    reviewNote: row.review_note || "",
  };
}

export async function loadCustomerZone(
  supabase: CustomerRouteSupabase,
  session: AppSession,
  customerId: string,
) {
  const { data, error } = await supabase
    .from("customers")
    .select(
      "id, city, postal_code, lat, lng, first_name, last_name",
    )
    .eq("id", customerId)
    .eq("organization_id", session.organizationId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(
      error?.message || "Remitente no encontrado",
    );
  }

  const zoneInput = {
    city: String(data.city || ""),
    postalCode: String(data.postal_code || ""),
    lat: data.lat == null ? null : Number(data.lat),
    lng: data.lng == null ? null : Number(data.lng),
  };

  return {
    customer: data,
    zoneInput,
    zoneKey: customerZoneKeyFromParts(zoneInput),
  };
}

export async function loadActiveVerification(
  supabase: CustomerRouteSupabase,
  session: AppSession,
  customerId: string,
  routeTemplateId: string,
) {
  const { data, error } = await supabase
    .from("customer_route_verifications")
    .select(
      "id, customer_id, route_template_id, zone_key, ended_at",
    )
    .eq("organization_id", session.organizationId)
    .eq("customer_id", customerId)
    .eq("route_template_id", routeTemplateId)
    .is("ended_at", null)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  return {
    id: data.id as string,
    customerId: data.customer_id as string,
    routeTemplateId: data.route_template_id as string,
    zoneKey: data.zone_key as string,
    endedAt: (data.ended_at as string | null) || null,
  };
}

export async function upsertCustomerRouteVerification(input: {
  supabase: CustomerRouteSupabase;
  session: AppSession;
  customerId: string;
  routeTemplateId: string;
  zoneKey: string;
}) {
  const nowIso = new Date().toISOString();
  const existing = await loadActiveVerification(
    input.supabase,
    input.session,
    input.customerId,
    input.routeTemplateId,
  );

  if (existing && existing.zoneKey === input.zoneKey) {
    return existing.id;
  }

  if (existing) {
    const { error: endError } = await input.supabase
      .from("customer_route_verifications")
      .update({
        ended_at: nowIso,
        end_reason: "Nueva verificación de ruta",
      })
      .eq("id", existing.id)
      .eq("organization_id", input.session.organizationId);

    if (endError) {
      throw new Error(endError.message);
    }
  }

  const { data, error } = await input.supabase
    .from("customer_route_verifications")
    .insert({
      organization_id: input.session.organizationId,
      customer_id: input.customerId,
      route_template_id: input.routeTemplateId,
      zone_key: input.zoneKey,
      verified_by: input.session.userId,
      verified_at: nowIso,
      started_at: nowIso,
    })
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(
      error?.message ||
        "No se pudo verificar la ruta del remitente",
    );
  }

  return data.id as string;
}
