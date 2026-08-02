"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { vehicleDisplayLabel } from "@/lib/logistics-route-vehicle";
import { requireAppSession } from "@/lib/auth/session";
import { sessionHasPermission } from "@/lib/auth/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createScopedSupabase } from "@/lib/supabase/scoped";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import type { AppSession } from "@/lib/auth/types";
import { routeIsReadyForArrival, validateConductorRouteArrival, type ConductorRouteArrivalWorkspace } from "@/lib/conductor-route-arrival";

import {
  canWriteDriverTask,
  cleanText,
  resolveConductorActionDriverId,
  unwrapJoin,
} from "@/app/actions/conductor-tasks-shared";

async function loadConductorRouteArrivalWorkspace(
  session: AppSession,
  driverId: string,
): Promise<ConductorRouteArrivalWorkspace> {
  const admin = createSupabaseAdminClient();
  if (!admin) throw new Error("Supabase service role no configurado");

  const [routesResult, warehousesResult] = await Promise.all([
    admin
      .from("logistics_routes")
      .select("id, name, route_date, status, assigned_to, warehouse_id, logistics_vehicles(name, plate), logistics_route_stops(id, outcome, released_at)")
      .eq("organization_id", session.organizationId)
      .eq("assigned_to", driverId)
      .eq("status", "in_progress")
      .order("route_date", { ascending: true }),
    admin
      .from("warehouses")
      .select("id, name, code, is_default")
      .eq("organization_id", session.organizationId)
      .eq("is_active", true)
      .order("is_default", { ascending: false })
      .order("name", { ascending: true }),
  ]);
  if (routesResult.error) throw new Error(routesResult.error.message);
  if (warehousesResult.error) throw new Error(warehousesResult.error.message);

  const routes = (routesResult.data || []).flatMap((rawRoute) => {
    const route = rawRoute as unknown as Record<string, unknown>;
    const stopValue = route.logistics_route_stops;
    const stops = (Array.isArray(stopValue) ? stopValue : []).filter((value) => {
      const stop = value as Record<string, unknown>;
      return !stop.released_at;
    }) as Array<Record<string, unknown>>;
    const stopOutcomes = stops.map((stop) => String(stop.outcome || "") || null);
    if (!routeIsReadyForArrival({ status: String(route.status || ""), stopOutcomes })) return [];
    const vehicleJoin = unwrapJoin(route.logistics_vehicles as { name?: string | null; plate?: string | null } | Array<{ name?: string | null; plate?: string | null }> | null);
    const vehicle = vehicleJoin
      ? { name: String(vehicleJoin.name || ""), plate: String(vehicleJoin.plate || "") }
      : null;
    const completedStops = stopOutcomes.filter((outcome) => outcome === "completed").length;
    return [{
      id: String(route.id),
      name: String(route.name || "Ruta"),
      routeDate: String(route.route_date || ""),
      plannedWarehouseId: route.warehouse_id ? String(route.warehouse_id) : null,
      vehicleLabel: vehicleDisplayLabel(vehicle) || "Camión",
      stopCount: stops.length,
      completedStops,
      exceptionStops: Math.max(0, stops.length - completedStops),
    }];
  });

  return {
    routes,
    warehouses: (warehousesResult.data || []).map((warehouse) => ({
      id: String(warehouse.id),
      name: String(warehouse.name || "Bodega"),
      code: String(warehouse.code || ""),
      isDefault: Boolean(warehouse.is_default),
    })),
  };
}

function conductorRouteArrivalError(error: unknown) {
  const raw = actionErrorMessage(error);
  const mappings: Array<[string, string]> = [
    ["ROUTE_ALREADY_COMPLETED", "Esta ruta ya fue terminada."],
    ["ROUTE_NOT_IN_PROGRESS", "Primero debes iniciar la ruta."],
    ["ROUTE_WITHOUT_CLOSED_STOPS", "La ruta todavía no tiene visitas terminadas."],
    ["ROUTE_HAS_OPEN_STOPS", "Todavía faltan visitas. Abre cada una y toca Listo o No se pudo."],
    ["ROUTE_HAS_EXCEPTIONS", "Quedaron visitas pendientes. Elige la razón que explique lo ocurrido."],
    ["WAREHOUSE_NOT_FOUND", "Esa bodega no está disponible."],
    ["WAREHOUSE_CHANGE_NOTE_REQUIRED", "Escribe por qué dejaste las cajas en otra bodega."],
    ["ARRIVAL_REASON_REQUIRED", "Toca una razón para terminar la ruta."],
    ["ARRIVAL_NOTE_REQUIRED", "Escribe en pocas palabras qué pasó."],
    ["OPERATION_KEY_REUSED", "Este intento pertenece a otra ruta. Intenta nuevamente."],
  ];
  return mappings.find(([code]) => raw.includes(code))?.[1] || raw;
}

export async function getConductorRouteArrivalWorkspaceAction(
  driverId?: string | null,
): Promise<ActionResult<ConductorRouteArrivalWorkspace>> {
  try {
    const session = await requireAppSession();
    if (!sessionHasPermission(session, "routes.view")) throw new Error("FORBIDDEN");
    const effectiveDriverId = resolveConductorActionDriverId(session, driverId);
    return ok(await loadConductorRouteArrivalWorkspace(session, effectiveDriverId));
  } catch (error) {
    return fail(conductorRouteArrivalError(error));
  }
}

export async function completeConductorRouteArrivalAction(input: {
  routeId: string;
  warehouseId: string;
  reason: string;
  note?: string;
  capturedAt?: string;
  operationKey?: string;
  driverId?: string | null;
}): Promise<ActionResult<{ routeId: string }>> {
  try {
    const session = await requireAppSession();
    if (!canWriteDriverTask(session)) throw new Error("FORBIDDEN");
    const driverId = resolveConductorActionDriverId(session, input.driverId);
    const workspace = await loadConductorRouteArrivalWorkspace(session, driverId);
    const route = workspace.routes.find((candidate) => candidate.id === cleanText(input.routeId, 80));
    if (!route) return fail("Esta ruta todavía no está lista para terminar.");
    const warehouseId = cleanText(input.warehouseId, 80);
    if (!workspace.warehouses.some((warehouse) => warehouse.id === warehouseId)) {
      return fail("Esa bodega no está disponible.");
    }
    const note = cleanText(input.note, 500);
    const validation = validateConductorRouteArrival({
      warehouseId,
      reason: input.reason,
      note,
      hasExceptions: route.exceptionStops > 0,
    });
    if (!validation.ok) return fail(validation.error);
    if (route.plannedWarehouseId && route.plannedWarehouseId !== warehouseId && note.length < 3) {
      return fail("Escribe por qué dejaste las cajas en otra bodega.");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");
    const capturedAt = input.capturedAt && !Number.isNaN(new Date(input.capturedAt).getTime())
      ? new Date(input.capturedAt).toISOString()
      : new Date().toISOString();
    const { error } = await supabase.rpc("complete_conductor_route_arrival", {
      target_route_id: route.id,
      target_warehouse_id: warehouseId,
      reason_code: validation.reason,
      note_value: note,
      captured_at: capturedAt,
      operation_key: cleanText(input.operationKey, 120) || randomUUID(),
    });
    if (error) throw new Error(error.message);

    revalidatePath("/conductor/tareas");
    revalidatePath("/conductor/inventario-camion");
    revalidatePath("/ingreso-bodega");
    revalidatePath("/seguimiento");
    revalidatePath("/logistica");
    return ok({ routeId: route.id });
  } catch (error) {
    return fail(conductorRouteArrivalError(error));
  }
}
