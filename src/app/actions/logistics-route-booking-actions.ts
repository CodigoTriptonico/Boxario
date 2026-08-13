"use server";

import { randomUUID } from "node:crypto";
import { recordActivityHistory } from "@/lib/activity-history";
import {
  actionErrorMessage,
  fail,
  ok,
  type ActionResult,
} from "@/lib/actions/errors";
import { requireAppSession } from "@/lib/auth/session";
import type { LogisticsRouteRow } from "@/lib/logistics-routing";
import { createScopedSupabase } from "@/lib/supabase/scoped";
import {
  canManageRoutes,
  loadRouteById,
} from "@/app/actions/logistics-routes-shared";

function bookingRouteErrorMessage(value: string, intent: "create" | "confirm" = "create") {
  const message = String(value || "");
  if (/BOOKINGS_REQUIRED/i.test(message)) return "Selecciona al menos una reserva";
  if (/BOOKINGS_DUPLICATED/i.test(message)) return "La seleccion contiene reservas repetidas";
  if (/BOOKING_NOT_FOUND/i.test(message)) return "Una reserva ya no esta disponible";
  if (/BOOKING_ALREADY_REVIEWED/i.test(message)) return "Una reserva ya fue procesada";
  if (/BOOKING_PENDING_APPROVAL/i.test(message)) return "Confirma o retira todas las solicitudes pendientes antes de crear la ruta";
  if (/BOOKINGS_MUST_SHARE_ROUTE/i.test(message)) {
    return "Todas las reservas deben pertenecer a la misma plantilla y fecha";
  }
  if (/BOOKING_TASK_NOT_AVAILABLE/i.test(message)) return "Una tarea ya esta cerrada";
  if (/BOOKING_TASK_ALREADY_ROUTED/i.test(message)) return "Una caja ya pertenece a otra ruta";
  if (/ROUTE_TEMPLATE_NOT_FOUND/i.test(message)) return "La plantilla ya no esta disponible";
  if (/ROUTE_DEFINITION_NOT_FOUND|ROUTE_SCHEDULE_NOT_FOUND|ROUTE_SCHEDULE_MISMATCH|ROUTE_DAY_DISABLED/i.test(message)) {
    return "La definición, el horario o el día de esta ruta ya no está disponible";
  }
  if (/ROUTE_ALREADY_CLOSED/i.test(message)) {
    return "La ruta de esa fecha ya esta cerrada; las reservas siguen pendientes";
  }
  if (/ROUTE_NOT_PUBLISHED/i.test(message)) return "La ruta ya no está disponible para actualizar";
  if (/ROUTE_UPDATE_CONFLICT/i.test(message)) return "La ruta cambió mientras se actualizaba; vuelve a intentarlo";
  if (/ROUTE_MAX_STOPS_EXCEEDED/i.test(message)) return "La ruta supera su limite de paradas";
  if (/ROUTE_MAX_BOXES_EXCEEDED/i.test(message)) return "La ruta supera su limite de cajas";
  if (/ROUTE_POSTAL_CODE_NOT_COVERED/i.test(message)) {
    return "Una direccion no pertenece a la cobertura postal de la plantilla";
  }
  if (/ROUTE_WITHOUT_STOPS/i.test(message)) return "La ruta debe incluir al menos una parada";
  if (/ROUTE_STOPS_WITHOUT_GEO/i.test(message)) return "Hay paradas sin ubicación verificada";
  if (/ROUTE_TASKS_WITHOUT_CONFIRMED_DATE/i.test(message)) return "Hay tareas sin fecha confirmada";
  if (/ROUTE_TASK_DATE_MISMATCH/i.test(message)) return "Hay tareas con fecha distinta a la ruta";
  if (/ROUTE_CONFIRM_CONFLICT/i.test(message)) return "La ruta cambió mientras se confirmaba; vuelve a intentarlo";
  if (/FORBIDDEN/i.test(message)) {
    return intent === "confirm" ? "No tienes permiso para confirmar rutas" : "No tienes permiso para crear rutas";
  }
  return actionErrorMessage(new Error(message || (intent === "confirm" ? "No se pudo confirmar la ruta operativa" : "No se pudo crear la ruta operativa")));
}

export async function createOperationalRouteFromBookingsAction(input: {
  bookingIds: string[];
  idempotencyKey?: string;
}): Promise<ActionResult<LogisticsRouteRow>> {
  try {
    const session = await requireAppSession();
    if (!canManageRoutes(session)) throw new Error("FORBIDDEN");
    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");

    const bookingIds = Array.from(
      new Set((input.bookingIds || []).map((id) => String(id || "").trim()).filter(Boolean)),
    );
    if (!bookingIds.length) return fail("Selecciona al menos una reserva");
    const idempotencyKey = /^[0-9a-f-]{36}$/i.test(input.idempotencyKey || "")
      ? input.idempotencyKey!
      : randomUUID();
    const { data, error } = await supabase.rpc("create_logistics_route_from_bookings", {
      p_request_ids: bookingIds,
      p_idempotency_key: idempotencyKey,
    });
    if (error || !data) return fail(bookingRouteErrorMessage(error?.message || ""));

    const route = await loadRouteById(supabase, session, String(data));
    await recordActivityHistory(supabase, session, {
      action: "logistics.route_created_from_bookings",
      entityType: "logistics_route",
      entityId: route.id,
      title: `Ruta operativa creada: ${route.name}`,
      description: `${route.routeDate} · ${route.stops.length} paradas`,
      metadata: { routeId: route.id, bookingIds, stopCount: route.stops.length, idempotencyKey },
    });
    return ok(route);
  } catch (error) {
    return fail(bookingRouteErrorMessage(actionErrorMessage(error)));
  }
}

export async function confirmOperationalRouteFromBookingsAction(input: {
  bookingIds: string[];
  idempotencyKey?: string;
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

    const bookingIds = Array.from(
      new Set((input.bookingIds || []).map((id) => String(id || "").trim()).filter(Boolean)),
    );
    if (!bookingIds.length) {
      return fail("Selecciona al menos una reserva");
    }

    const idempotencyKey = /^[0-9a-f-]{36}$/i.test(input.idempotencyKey || "")
      ? input.idempotencyKey!
      : randomUUID();
    const { data, error } = await supabase.rpc("confirm_logistics_route_from_bookings", {
      p_request_ids: bookingIds,
      p_idempotency_key: idempotencyKey,
    });

    if (error || !data) {
      return fail(bookingRouteErrorMessage(error?.message || "", "confirm"));
    }

    const route = await loadRouteById(supabase, session, String(data));
    await recordActivityHistory(supabase, session, {
      action: "logistics.route_confirmed_from_bookings",
      entityType: "logistics_route",
      entityId: route.id,
      title: `Ruta operativa confirmada: ${route.name}`,
      description: `${route.routeDate} · ${route.stops.length} paradas`,
      metadata: {
        routeId: route.id,
        bookingIds,
        stopCount: route.stops.length,
        idempotencyKey,
      },
    });

    return ok(route);
  } catch (error) {
    return fail(bookingRouteErrorMessage(actionErrorMessage(error), "confirm"));
  }
}

export async function updatePublishedRouteFromBookingsAction(input: {
  bookingIds: string[];
  idempotencyKey?: string;
}): Promise<ActionResult<LogisticsRouteRow>> {
  try {
    const session = await requireAppSession();
    if (!canManageRoutes(session)) throw new Error("FORBIDDEN");
    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");

    const bookingIds = Array.from(new Set((input.bookingIds || []).map((id) => String(id || "").trim()).filter(Boolean)));
    if (!bookingIds.length) return fail("Selecciona al menos una reserva");
    const idempotencyKey = /^[0-9a-f-]{36}$/i.test(input.idempotencyKey || "") ? input.idempotencyKey! : randomUUID();
    const { data, error } = await supabase.rpc("update_logistics_route_from_bookings", {
      p_request_ids: bookingIds,
      p_idempotency_key: idempotencyKey,
    });
    if (error || !data) return fail(bookingRouteErrorMessage(error?.message || ""));

    const route = await loadRouteById(supabase, session, String(data));
    await recordActivityHistory(supabase, session, {
      action: "logistics.route_updated_from_bookings",
      entityType: "logistics_route",
      entityId: route.id,
      title: `Ruta actualizada: ${route.name}`,
      description: `${route.routeDate} · ${route.stops.length} paradas`,
      metadata: { routeId: route.id, bookingIds, stopCount: route.stops.length, idempotencyKey },
    });
    return ok(route);
  } catch (error) {
    return fail(bookingRouteErrorMessage(actionErrorMessage(error)));
  }
}
