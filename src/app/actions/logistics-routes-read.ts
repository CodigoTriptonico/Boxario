"use server";

import { requireAppSession } from "@/lib/auth/session";
import { sessionHasPermission } from "@/lib/auth/permissions";
import { createScopedSupabase } from "@/lib/supabase/scoped";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import { hasRouteGeo, logisticsZoneKey, logisticsZoneLabel, type LogisticsRouteRow, type LogisticsTaskAddressRow } from "@/lib/logistics-routing";
import type { ShipmentRow } from "@/lib/shipment-types";
import {
  clampLogisticsRoutesLimit,
  clampLogisticsRoutesOffset,
  logisticsRoutesDatesForWeekday,
  type ListLogisticsRoutesOptions,
} from "@/lib/logistics-routes-pagination";

import {
  ROUTE_SELECT,
  loadTaskInputs,
  mapRoute,
  type LogisticsRouteDbRow,
} from "@/app/actions/logistics-routes-shared";

export async function listLogisticsRoutesAction(
  options?: ListLogisticsRoutesOptions,
): Promise<ActionResult<LogisticsRouteRow[]>> {
  try {
    const session = await requireAppSession();

    if (
      !sessionHasPermission(session, "routes.view") &&
      !sessionHasPermission(session, "sales.manage")
    ) {
      throw new Error("FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const limit = clampLogisticsRoutesLimit(options?.limit);
    const offset = clampLogisticsRoutesOffset(options?.offset);

    let query = supabase
      .from("logistics_routes")
      .select(ROUTE_SELECT)
      .eq("organization_id", session.organizationId)
      .order("route_date", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + limit - 1);

    const routeDate = String(options?.routeDate || "").trim();
    if (routeDate) {
      query = query.eq("route_date", routeDate);
    } else if (
      options?.weekday != null &&
      Number.isInteger(options.weekday) &&
      options.weekday >= 0 &&
      options.weekday <= 6
    ) {
      const dates = logisticsRoutesDatesForWeekday(options.weekday);
      if (dates.length) {
        query = query.in("route_date", dates);
      }
    }

    const assignedTo = String(options?.assignedTo || "").trim();
    if (assignedTo) {
      query = query.eq("assigned_to", assignedTo);
    }

    const zoneKey = String(options?.zoneKey || "").trim();
    if (zoneKey) {
      query = query.eq("zone_key", zoneKey);
    }

    const routeTemplateId = String(options?.routeTemplateId || "").trim();
    if (routeTemplateId) {
      query = query.eq("route_template_id", routeTemplateId);
    }

    if (options?.statusMode === "active") {
      query = query.not("status", "in", "(cancelled,completed)");
    } else if (options?.statusMode === "history") {
      query = query.eq("status", "completed");
    } else if (options?.statusMode === "all") {
      query = query.neq("status", "cancelled");
    }

    const search = String(options?.search || "").trim();
    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === "42P01" || error.code === "42703") {
        return ok([]);
      }

      return fail(error.message);
    }

    return ok(((data || []) as unknown as LogisticsRouteDbRow[]).map(mapRoute));
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function listLogisticsTaskAddressesAction(options?: {
  /** Si se pasan envíos ya cargados, no se vuelve a llamar listShipmentsAction. */
  shipments?: ShipmentRow[];
}): Promise<ActionResult<LogisticsTaskAddressRow[]>> {
  try {
    const session = await requireAppSession();

    if (!sessionHasPermission(session, "routes.view")) {
      throw new Error("FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const tasks = await loadTaskInputs(supabase, session, {
      shipments: options?.shipments,
    });

    return ok(
      tasks.map((task) => ({
        taskId: task.taskId,
        address: task.address,
        zoneKey: logisticsZoneKey(task.address),
        zoneLabel: logisticsZoneLabel(task.address),
        hasGeo: hasRouteGeo(task.address),
      })),
    );
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
