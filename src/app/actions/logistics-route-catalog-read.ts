"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAppSession } from "@/lib/auth/session";
import { sessionHasPermission } from "@/lib/auth/permissions";
import { createScopedSupabase } from "@/lib/supabase/scoped";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import { isLogisticsWeekdayKey, logisticsWeekdayKeys } from "@/lib/logistics-route-catalog";
import { genericLogisticsRouteName } from "@/lib/logistics-day-route";
import { normalizeCoveragePlaceColor } from "@/lib/logistics-route-coverage";
import {
  normalizeScheduleSuggestionConfig,
  scheduleTimeSuggestionsFor,
} from "@/lib/sale/schedule-suggestions";
import {
  ROUTE_TEMPLATE_SELECT,
  isLegacyImplicitDayTemplate,
  mapRouteTemplate,
  type LogisticsRouteCatalog,
  type LogisticsRouteDefinitionRow,
  type LogisticsRouteScheduleRow,
  type LogisticsRouteTemplateDbRow,
  type LogisticsWeekdayDefaultDbRow,
  type LogisticsWeekdaySchedule,
  type LogisticsWeekdayScheduleDbRow,
} from "@/app/actions/logistics-routes-shared";

export async function listLogisticsRouteCatalogAction(): Promise<ActionResult<LogisticsRouteCatalog>> {
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

    const geographicDb = supabase as unknown as SupabaseClient;
    const [
      daysResult,
      templatesResult,
      defaultsResult,
      settingsResult,
      definitionsResult,
      schedulesResult,
      postalCodesResult,
      placesResult,
      reservationsResult,
    ] = await Promise.all([
      supabase.rpc("list_logistics_route_weekdays", { target_org_id: session.organizationId }),
      supabase
        .from("logistics_route_templates")
        .select(ROUTE_TEMPLATE_SELECT)
        .eq("organization_id", session.organizationId)
        .order("weekday", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("logistics_weekday_defaults")
        .select("weekday, default_driver_id, start_time, estimated_end_time, max_stops, max_boxes")
        .eq("organization_id", session.organizationId),
      supabase
        .from("organization_route_settings")
        .select("schedule_suggestions, delivery_days, pickup_days")
        .eq("organization_id", session.organizationId)
        .maybeSingle(),
      geographicDb
        .from("logistics_route_definitions")
        .select("id, name, zone_name, color, coverage_mode, status, is_system_general, system_weekday, created_at, updated_at")
        .eq("organization_id", session.organizationId)
        .order("name", { ascending: true }),
      geographicDb
        .from("logistics_route_schedules")
        .select("id, route_definition_id, weekday, start_time, estimated_end_time, max_stops, max_boxes, default_driver_id, is_active")
        .eq("organization_id", session.organizationId)
        .order("weekday", { ascending: true })
        .order("start_time", { ascending: true }),
      geographicDb
        .from("logistics_route_postal_codes")
        .select("route_definition_id, postal_code")
        .eq("organization_id", session.organizationId)
        .order("postal_code", { ascending: true }),
      geographicDb
        .from("logistics_route_coverage_places")
        .select("route_definition_id, place_id, display_name, kind, parent_place_id, selection_role, lat, lng, bounds, color")
        .eq("organization_id", session.organizationId)
        .order("display_name", { ascending: true }),
      geographicDb
        .from("customer_route_assignment_requests")
        .select("route_schedule_id, route_date, status, box_count")
        .eq("organization_id", session.organizationId)
        .in("status", ["pending_approval", "template_confirmed"]),
    ]);

    if (daysResult.error) {
      return fail(daysResult.error.message);
    }

    if (templatesResult.error) {
      return fail(templatesResult.error.message);
    }

    if (settingsResult.error) {
      return fail(settingsResult.error.message);
    }

    const defaultDriverByWeekday = Array<string | null>(7).fill(null);
    if (!defaultsResult.error) {
      for (const row of (defaultsResult.data || []) as LogisticsWeekdayDefaultDbRow[]) {
        if (Number.isInteger(row.weekday) && row.weekday >= 0 && row.weekday <= 6) {
          defaultDriverByWeekday[row.weekday] = row.default_driver_id || null;
        }
      }
    }

    const weekdayScheduleByWeekday = Array<LogisticsWeekdaySchedule | null>(7).fill(null);
    for (const row of (defaultsResult.data || []) as LogisticsWeekdayScheduleDbRow[]) {
      if (Number.isInteger(row.weekday) && row.weekday >= 0 && row.weekday <= 6) {
        weekdayScheduleByWeekday[row.weekday] = {
          startTime: row.start_time?.slice(0, 5) || "",
          estimatedEndTime: row.estimated_end_time?.slice(0, 5) || "",
          maxStops: row.max_stops ?? null,
          maxBoxes: row.max_boxes ?? null,
        };
      }
    }

    const enabledDays = (daysResult.data || []).filter(isLogisticsWeekdayKey);
    const settingsRow = settingsResult.data as { pickup_days?: unknown; delivery_days?: unknown } | null;
    const legacyPickupDays = ((settingsRow?.pickup_days || []) as unknown[]).filter(isLogisticsWeekdayKey);
    // Keep legacy pickup_days aligned with delivery_days (source of truth). Never restore from pickup.
    if (
      legacyPickupDays.length !== enabledDays.length ||
      legacyPickupDays.some((day) => !enabledDays.includes(day))
    ) {
      await supabase
        .from("organization_route_settings")
        .update({
          pickup_days: enabledDays,
          updated_at: new Date().toISOString(),
        })
        .eq("organization_id", session.organizationId);
    }

    // Ensure enabled days have an operable general schedule when they still are the day-route.
    const weekdaysWithNamedRoutes = new Set<number>();
    for (const row of (schedulesResult.data || []) as Array<Record<string, unknown>>) {
      if (!row.is_active) continue;
      const definition = ((definitionsResult.data || []) as Array<Record<string, unknown>>).find(
        (item) => String(item.id) === String(row.route_definition_id),
      );
      if (definition && !definition.is_system_general && definition.status !== "archived") {
        weekdaysWithNamedRoutes.add(Number(row.weekday));
      }
    }
    for (const dayKey of enabledDays) {
      const weekday = logisticsWeekdayKeys.indexOf(dayKey);
      if (weekday < 0) continue;
      const existingDefault = weekdayScheduleByWeekday[weekday];
      if (!existingDefault?.startTime) {
        const { error: defaultError } = await supabase.from("logistics_weekday_defaults").upsert(
          {
            organization_id: session.organizationId,
            weekday,
            start_time: "10:00",
            estimated_end_time: null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "organization_id,weekday" },
        );
        if (!defaultError) {
          weekdayScheduleByWeekday[weekday] = {
            startTime: "10:00",
            estimatedEndTime: "",
            maxStops: null,
            maxBoxes: null,
          };
        }
      }
      if (weekdaysWithNamedRoutes.has(weekday)) continue;
      const systemRoute = ((definitionsResult.data || []) as Array<Record<string, unknown>>).find(
        (row) => Boolean(row.is_system_general) && Number(row.system_weekday) === weekday && row.status !== "archived",
      );
      if (systemRoute?.id) {
        await geographicDb
          .from("logistics_route_schedules")
          .update({ is_active: true, updated_at: new Date().toISOString() })
          .eq("organization_id", session.organizationId)
          .eq("route_definition_id", String(systemRoute.id))
          .eq("weekday", weekday);
      }
    }

    const geographicCatalogAvailable =
      !definitionsResult.error && !schedulesResult.error && !postalCodesResult.error;
    const coveragePlacesAvailable = !placesResult.error;
    const postalCodesByDefinition = new Map<string, string[]>();
    for (const row of (postalCodesResult.data || []) as Array<Record<string, unknown>>) {
      const definitionId = String(row.route_definition_id || "");
      const postalCode = String(row.postal_code || "");
      if (!definitionId || !postalCode) continue;
      postalCodesByDefinition.set(definitionId, [
        ...(postalCodesByDefinition.get(definitionId) || []),
        postalCode,
      ]);
    }
    const placesByDefinition = new Map<string, LogisticsRouteDefinitionRow["places"]>();
    if (coveragePlacesAvailable) {
      for (const row of (placesResult.data || []) as Array<Record<string, unknown>>) {
      const definitionId = String(row.route_definition_id || "");
      const placeId = String(row.place_id || "");
      if (!definitionId || !placeId) continue;
      const boundsRaw = row.bounds && typeof row.bounds === "object" ? row.bounds as Record<string, unknown> : null;
      const north = Number(boundsRaw?.north);
      const south = Number(boundsRaw?.south);
      const east = Number(boundsRaw?.east);
      const west = Number(boundsRaw?.west);
      placesByDefinition.set(definitionId, [
        ...(placesByDefinition.get(definitionId) || []),
        {
          placeId,
          displayName: String(row.display_name || ""),
          kind: row.kind === "neighborhood" || row.kind === "sublocality" ? row.kind : "locality",
          parentPlaceId: row.parent_place_id ? String(row.parent_place_id) : null,
          selectionRole:
            row.selection_role === "root_partial" || row.selection_role === "child_included"
              ? row.selection_role
              : "root_whole",
          lat: row.lat == null ? null : Number(row.lat),
          lng: row.lng == null ? null : Number(row.lng),
          bounds: [north, south, east, west].every(Number.isFinite)
            ? { north, south, east, west }
            : null,
          color: normalizeCoveragePlaceColor(row.color),
        },
      ]);
      }
    }
    const reservationsBySchedule = new Map<string, { stops: number; boxes: number }>();
    for (const row of (reservationsResult.data || []) as Array<Record<string, unknown>>) {
      const scheduleId = String(row.route_schedule_id || "");
      if (!scheduleId) continue;
      const current = reservationsBySchedule.get(scheduleId) || { stops: 0, boxes: 0 };
      current.stops += 1;
      current.boxes += Math.max(1, Number(row.box_count || 1));
      reservationsBySchedule.set(scheduleId, current);
    }
    const schedules: LogisticsRouteScheduleRow[] = geographicCatalogAvailable
      ? ((schedulesResult.data || []) as Array<Record<string, unknown>>).map((row) => {
          const reserved = reservationsBySchedule.get(String(row.id)) || { stops: 0, boxes: 0 };
          return {
            id: String(row.id),
            routeDefinitionId: String(row.route_definition_id),
            weekday: Number(row.weekday),
            startTime: String(row.start_time || "").slice(0, 5),
            estimatedEndTime: String(row.estimated_end_time || "").slice(0, 5),
            maxStops: row.max_stops == null ? null : Number(row.max_stops),
            maxBoxes: row.max_boxes == null ? null : Number(row.max_boxes),
            defaultDriverId: row.default_driver_id ? String(row.default_driver_id) : null,
            isActive: Boolean(row.is_active),
            reservedStops: reserved.stops,
            reservedBoxes: reserved.boxes,
          };
        })
      : [];
    const schedulesByDefinition = new Map<string, LogisticsRouteScheduleRow[]>();
    for (const schedule of schedules) {
      schedulesByDefinition.set(schedule.routeDefinitionId, [
        ...(schedulesByDefinition.get(schedule.routeDefinitionId) || []),
        schedule,
      ]);
    }
    const routeDefinitions: LogisticsRouteDefinitionRow[] = geographicCatalogAvailable
      ? ((definitionsResult.data || []) as Array<Record<string, unknown>>).map((row) => ({
          id: String(row.id),
          name: String(row.name),
          zoneName: String(row.zone_name || ""),
          color: String(row.color || "#10b981"),
          coverageMode: row.coverage_mode === "places" ? "places" : "day_only",
          status: row.status === "archived" ? "archived" : "active",
          isSystemGeneral: Boolean(row.is_system_general),
          systemWeekday: row.system_weekday == null ? null : Number(row.system_weekday),
          postalCodes: postalCodesByDefinition.get(String(row.id)) || [],
          places: placesByDefinition.get(String(row.id)) || [],
          schedules: schedulesByDefinition.get(String(row.id)) || [],
          createdAt: String(row.created_at),
          updatedAt: String(row.updated_at),
        }))
      : [];
    const namedWeekdays = new Set(
      routeDefinitions
        .filter((definition) => !definition.isSystemGeneral && definition.status === "active")
        .flatMap((definition) => definition.schedules.filter((schedule) => schedule.isActive).map((schedule) => schedule.weekday)),
    );
    const templates = geographicCatalogAvailable
      ? routeDefinitions.flatMap((definition) =>
          definition.schedules
            .filter((schedule) =>
              schedule.isActive &&
              definition.status === "active" &&
              (!definition.isSystemGeneral || !namedWeekdays.has(schedule.weekday)),
            )
            .map((schedule) => ({
              id: schedule.id,
              routeDefinitionId: definition.id,
              routeScheduleId: schedule.id,
              weekday: schedule.weekday,
              name: definition.isSystemGeneral
                ? genericLogisticsRouteName(schedule.weekday)
                : definition.name,
              startTime: schedule.startTime,
              estimatedEndTime: schedule.estimatedEndTime,
              maxStops: schedule.maxStops,
              maxBoxes: schedule.maxBoxes,
              reservedStops: schedule.reservedStops,
              reservedBoxes: schedule.reservedBoxes,
              zoneKey: definition.zoneName,
              coveredPostalCodes: definition.postalCodes,
              defaultDriverId: schedule.defaultDriverId,
              color: definition.color,
              coverageMode: definition.coverageMode,
              routeStatus: definition.status,
              isSystemGeneral: definition.isSystemGeneral,
              createdAt: definition.createdAt,
              updatedAt: definition.updatedAt,
            })))
      : ((templatesResult.data || []) as LogisticsRouteTemplateDbRow[])
          .map(mapRouteTemplate)
          .filter((template) => !isLegacyImplicitDayTemplate(template));
    const scheduleSuggestions = normalizeScheduleSuggestionConfig(
      settingsResult.data?.schedule_suggestions,
    );

    return ok({
      enabledDays,
      routeDefinitions,
      schedules,
      templates,
      defaultDriverByWeekday,
      weekdayScheduleByWeekday,
      scheduleSuggestionsByWeekday: {
        delivery: Array.from({ length: 7 }, (_, weekday) =>
          scheduleTimeSuggestionsFor(scheduleSuggestions, "delivery", [], weekday),
        ),
        pickup: Array.from({ length: 7 }, (_, weekday) =>
          scheduleTimeSuggestionsFor(scheduleSuggestions, "pickup", [], weekday),
        ),
      },
    });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
