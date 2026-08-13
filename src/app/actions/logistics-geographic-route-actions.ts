"use server";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { recordActivityHistory } from "@/lib/activity-history";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import { requireAppSession } from "@/lib/auth/session";
import { sessionHasPermission } from "@/lib/auth/permissions";
import {
  CENSUS_PLACE_GEOMETRY_VINTAGE,
  fetchCensusPlaceGeometryAtPoint,
  fetchCensusPlacesInBounds,
  type CensusCatalogPlace,
  type CensusPlaceLayer,
} from "@/lib/coverage-census-places";
import {
  fetchCoveragePlaceDetails,
  resolveCoveragePlaceAtLatLng,
  resolveCoveragePlaceFromCensusName,
  searchCoveragePlaceChildren,
  searchCoveragePlaces,
  type CoveragePlaceSuggestion,
} from "@/lib/coverage-places-google";
import {
  normalizeCoveragePlaceColor,
  normalizeCoveragePlaceKind,
  normalizeCoveragePlaceSelectionRole,
  normalizeUsPostalCode,
  normalizedAddressFingerprintSource,
  parseCoveragePlaceBounds,
  routeCandidateCoverageMatches,
  routeCandidateIsSelectable,
  type RouteCoverageAddress,
  type RouteCoverageMode,
  type RouteCoveragePlace,
} from "@/lib/logistics-route-coverage";
import { getLogisticsWeekdayIndex } from "@/lib/logistics-route-week";
import { scheduledAtToLocalDateInput } from "@/lib/schedule-date";
import { createScopedSupabase } from "@/lib/supabase/scoped";

export type GeographicRouteScheduleInput = {
  id?: string;
  weekday: number;
  startTime: string;
  estimatedEndTime?: string | null;
  maxStops?: number | null;
  maxBoxes?: number | null;
  defaultDriverId?: string | null;
  isActive?: boolean;
};

export type GeographicRouteDefinitionInput = {
  name: string;
  zoneName?: string;
  color: string;
  coverageMode: RouteCoverageMode;
  postalCodes?: string[];
  places?: RouteCoveragePlace[];
  schedules: GeographicRouteScheduleInput[];
};

export type CompatibleGeographicRoute = {
  routeDefinitionId: string;
  routeScheduleId: string;
  name: string;
  zoneName: string;
  color: string;
  coverageMode: RouteCoverageMode;
  places: RouteCoveragePlace[];
  weekday: number;
  startTime: string;
  estimatedEndTime: string;
  maxStops: number | null;
  maxBoxes: number | null;
  reservedStops: number;
  reservedBoxes: number;
  needsApproval: boolean;
  coverageMatches: boolean;
  explanation: string;
};

function untyped(supabase: unknown) {
  return supabase as SupabaseClient;
}

function requireRouteManager(session: Awaited<ReturnType<typeof requireAppSession>>) {
  if (!sessionHasPermission(session, "routes.update_status")) throw new Error("FORBIDDEN");
}

function normalizedRouteInput(input: GeographicRouteDefinitionInput) {
  const name = String(input.name || "").trim().slice(0, 120);
  const zoneName = String(input.zoneName || "").trim().slice(0, 120);
  const color = String(input.color || "").trim();
  if (!name) throw new Error("El nombre de la ruta es obligatorio");
  if (!/^#[0-9a-f]{6}$/i.test(color)) throw new Error("El color de la ruta no es valido");
  const places = normalizeCoveragePlacesInput(input.places || []);
  if (input.coverageMode === "places" && places.length === 0) {
    throw new Error("Agrega al menos una ciudad o zona");
  }
  if (!input.schedules.length) throw new Error("Agrega al menos un horario semanal");
  const schedules = input.schedules.map((schedule) => {
    const startTime = String(schedule.startTime || "").slice(0, 5);
    const estimatedEndTime = String(schedule.estimatedEndTime || "").slice(0, 5);
    if (!Number.isInteger(schedule.weekday) || schedule.weekday < 0 || schedule.weekday > 6) {
      throw new Error("Uno de los dias no es valido");
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(startTime)) {
      throw new Error("Cada horario necesita una hora de inicio valida");
    }
    if (estimatedEndTime && estimatedEndTime <= startTime) {
      throw new Error("La hora final debe ser posterior a la inicial");
    }
    return {
      ...schedule,
      startTime,
      estimatedEndTime: estimatedEndTime || null,
      maxStops: schedule.maxStops == null ? null : Math.max(1, Number(schedule.maxStops)),
      maxBoxes: schedule.maxBoxes == null ? null : Math.max(1, Number(schedule.maxBoxes)),
      defaultDriverId: schedule.defaultDriverId || null,
      isActive: schedule.isActive !== false,
    };
  });
  return { name, zoneName, color, coverageMode: input.coverageMode, postalCodes: [], places, schedules };
}

function normalizeCoveragePlacesInput(places: RouteCoveragePlace[]) {
  const byId = new Map<string, RouteCoveragePlace>();
  for (const place of places) {
    const placeId = String(place.placeId || "").trim().slice(0, 256);
    const displayName = String(place.displayName || "").trim().slice(0, 160);
    if (!placeId || !displayName) continue;
    const selectionRole = normalizeCoveragePlaceSelectionRole(place.selectionRole);
    const kind = normalizeCoveragePlaceKind(place.kind);
    const parentPlaceId = place.parentPlaceId ? String(place.parentPlaceId).trim().slice(0, 256) : null;
    if (selectionRole === "child_included" && !parentPlaceId) continue;
    byId.set(placeId, {
      placeId,
      displayName,
      kind,
      parentPlaceId: selectionRole === "child_included" ? parentPlaceId : null,
      selectionRole,
      lat: place.lat == null || !Number.isFinite(Number(place.lat)) ? null : Number(place.lat),
      lng: place.lng == null || !Number.isFinite(Number(place.lng)) ? null : Number(place.lng),
      bounds: parseCoveragePlaceBounds(place.bounds),
      color: normalizeCoveragePlaceColor(place.color),
    });
  }
  const list = Array.from(byId.values());
  const roots = list.filter((place) => place.selectionRole === "root_whole" || place.selectionRole === "root_partial");
  const children = list.filter((place) => place.selectionRole === "child_included");
  const rootIds = new Set(roots.map((place) => place.placeId));
  const validChildren = children.filter((place) => place.parentPlaceId && rootIds.has(place.parentPlaceId));
  const partialRootIds = new Set(validChildren.map((place) => String(place.parentPlaceId)));
  return [
    ...roots.map((root) => ({
      ...root,
      selectionRole: (partialRootIds.has(root.placeId) ? "root_partial" : "root_whole") as RouteCoveragePlace["selectionRole"],
    })),
    ...validChildren,
  ];
}

async function replacePostalCodes(input: {
  database: SupabaseClient;
  organizationId: string;
  routeDefinitionId: string;
  userId: string;
  postalCodes: string[];
}) {
  const { data: current, error: currentError } = await input.database
    .from("logistics_route_postal_codes")
    .select("postal_code")
    .eq("organization_id", input.organizationId)
    .eq("route_definition_id", input.routeDefinitionId);
  if (currentError) throw new Error(currentError.message);
  const next = new Set(input.postalCodes);
  const removed = (current || []).map((row) => String(row.postal_code)).filter((zip) => !next.has(zip));
  if (removed.length) {
    const { error } = await input.database
      .from("logistics_route_postal_codes")
      .delete()
      .eq("organization_id", input.organizationId)
      .eq("route_definition_id", input.routeDefinitionId)
      .in("postal_code", removed);
    if (error) throw new Error(error.message);
  }
  const existing = new Set((current || []).map((row) => String(row.postal_code)));
  const inserted = input.postalCodes.filter((zip) => !existing.has(zip));
  if (inserted.length) {
    const { error } = await input.database.from("logistics_route_postal_codes").insert(
      inserted.map((postalCode) => ({
        organization_id: input.organizationId,
        route_definition_id: input.routeDefinitionId,
        postal_code: postalCode,
        created_by: input.userId,
      })),
    );
    if (error) throw new Error(error.message);
  }
}

async function replaceCoveragePlaces(input: {
  database: SupabaseClient;
  organizationId: string;
  routeDefinitionId: string;
  userId: string;
  places: RouteCoveragePlace[];
}) {
  const { error: deleteError } = await input.database
    .from("logistics_route_coverage_places")
    .delete()
    .eq("organization_id", input.organizationId)
    .eq("route_definition_id", input.routeDefinitionId);
  if (deleteError) throw new Error(deleteError.message);
  if (!input.places.length) return;
  const { error } = await input.database.from("logistics_route_coverage_places").insert(
    input.places.map((place) => ({
      organization_id: input.organizationId,
      route_definition_id: input.routeDefinitionId,
      place_id: place.placeId,
      display_name: place.displayName,
      kind: place.kind,
      parent_place_id: place.parentPlaceId,
      selection_role: place.selectionRole,
      lat: place.lat ?? null,
      lng: place.lng ?? null,
      bounds: place.bounds || {},
      color: normalizeCoveragePlaceColor(place.color),
      created_by: input.userId,
    })),
  );
  if (error) throw new Error(error.message);
}

function mapCoveragePlaceRow(row: Record<string, unknown>): RouteCoveragePlace {
  return {
    placeId: String(row.place_id || ""),
    displayName: String(row.display_name || ""),
    kind: normalizeCoveragePlaceKind(row.kind),
    parentPlaceId: row.parent_place_id ? String(row.parent_place_id) : null,
    selectionRole: normalizeCoveragePlaceSelectionRole(row.selection_role),
    lat: row.lat == null ? null : Number(row.lat),
    lng: row.lng == null ? null : Number(row.lng),
    bounds: parseCoveragePlaceBounds(row.bounds),
    color: normalizeCoveragePlaceColor(row.color),
  };
}

/** Coverage for the day-as-route (system general) when there are no named subroutes. */
export async function saveSystemDayRouteCoverageAction(input: {
  weekday: number;
  coverageMode: RouteCoverageMode;
  postalCodes?: string[];
  places?: RouteCoveragePlace[];
}): Promise<ActionResult<{
  routeDefinitionId: string;
  coverageMode: RouteCoverageMode;
  postalCodes: string[];
  places: RouteCoveragePlace[];
}>> {
  try {
    const session = await requireAppSession();
    requireRouteManager(session);
    if (!Number.isInteger(input.weekday) || input.weekday < 0 || input.weekday > 6) {
      return fail("Dia de ruta invalido");
    }
    const places = normalizeCoveragePlacesInput(input.places || []);
    const coverageMode: RouteCoverageMode = places.length > 0 ? "places" : "day_only";
    if (coverageMode === "places" && places.length === 0) {
      return fail("Agrega al menos una ciudad o zona");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");
    const database = untyped(supabase);
    const weekdayKeys = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];
    const dayKey = weekdayKeys[input.weekday] || String(input.weekday);

    const { data: systemRoute, error: systemError } = await database
      .from("logistics_route_definitions")
      .select("id")
      .eq("organization_id", session.organizationId)
      .eq("is_system_general", true)
      .eq("system_weekday", input.weekday)
      .eq("status", "active")
      .maybeSingle();
    if (systemError) throw new Error(systemError.message);

    let routeDefinitionId = systemRoute?.id ? String(systemRoute.id) : "";
    if (!routeDefinitionId) {
      const { data: created, error: createError } = await database
        .from("logistics_route_definitions")
        .insert({
          organization_id: session.organizationId,
          name: `Ruta general de ${dayKey}`,
          color: "#10b981",
          coverage_mode: coverageMode,
          is_system_general: true,
          system_weekday: input.weekday,
          created_by: session.userId,
        })
        .select("id")
        .single();
      if (createError || !created) throw new Error(createError?.message || "No se pudo crear la ruta del dia");
      routeDefinitionId = String(created.id);
    } else {
      const { error: updateError } = await database
        .from("logistics_route_definitions")
        .update({
          coverage_mode: coverageMode,
          updated_at: new Date().toISOString(),
        })
        .eq("id", routeDefinitionId)
        .eq("organization_id", session.organizationId)
        .eq("is_system_general", true);
      if (updateError) throw new Error(updateError.message);
    }

    await replacePostalCodes({
      database,
      organizationId: session.organizationId,
      routeDefinitionId,
      userId: session.userId,
      postalCodes: [],
    });
    await replaceCoveragePlaces({
      database,
      organizationId: session.organizationId,
      routeDefinitionId,
      userId: session.userId,
      places: coverageMode === "places" ? places : [],
    });

    await recordActivityHistory(supabase, session, {
      action: "logistics.day_route_coverage.updated",
      entityType: "logistics_route_definition",
      entityId: routeDefinitionId,
      title: `Cobertura del dia actualizada: ${dayKey}`,
      description: coverageMode === "places"
        ? `${places.filter((place) => place.selectionRole !== "child_included").length} lugar(es)`
        : "Sin cobertura geografica configurada",
      metadata: { weekday: input.weekday, coverageMode, places },
    });

    return ok({
      routeDefinitionId,
      coverageMode,
      postalCodes: [],
      places: coverageMode === "places" ? places : [],
    });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

async function replaceSchedules(input: {
  database: SupabaseClient;
  organizationId: string;
  routeDefinitionId: string;
  userId: string;
  schedules: ReturnType<typeof normalizedRouteInput>["schedules"];
}) {
  const retainedIds = input.schedules.map((schedule) => schedule.id).filter(Boolean) as string[];
  let disableQuery = input.database
    .from("logistics_route_schedules")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("organization_id", input.organizationId)
    .eq("route_definition_id", input.routeDefinitionId)
    .eq("is_active", true);
  if (retainedIds.length) disableQuery = disableQuery.not("id", "in", `(${retainedIds.join(",")})`);
  const { error: disableError } = await disableQuery;
  if (disableError) throw new Error(disableError.message);

  for (const schedule of input.schedules) {
    const payload = {
      organization_id: input.organizationId,
      route_definition_id: input.routeDefinitionId,
      weekday: schedule.weekday,
      start_time: schedule.startTime,
      estimated_end_time: schedule.estimatedEndTime,
      max_stops: schedule.maxStops,
      max_boxes: schedule.maxBoxes,
      default_driver_id: schedule.defaultDriverId,
      is_active: schedule.isActive,
      updated_at: new Date().toISOString(),
    };
    const query = schedule.id
      ? input.database.from("logistics_route_schedules").update(payload).eq("id", schedule.id)
      : input.database.from("logistics_route_schedules").insert({ ...payload, created_by: input.userId });
    const { error } = await query;
    if (error) throw new Error(error.message);
  }
}

/** Day-as-route schedule is active only when the weekday has no named subroutes. */
async function reconcileSystemDaySchedulesForWeekdays(input: {
  database: SupabaseClient;
  organizationId: string;
  weekdays: number[];
}) {
  const uniqueWeekdays = Array.from(new Set(input.weekdays.filter((day) => Number.isInteger(day) && day >= 0 && day <= 6)));
  if (!uniqueWeekdays.length) return;

  const { data: settings, error: settingsError } = await input.database
    .from("organization_route_settings")
    .select("delivery_days, pickup_days")
    .eq("organization_id", input.organizationId)
    .maybeSingle();
  if (settingsError) throw new Error(settingsError.message);
  const enabledDays = new Set([
    ...((settings?.delivery_days || []) as string[]),
    ...((settings?.pickup_days || []) as string[]),
  ]);
  const weekdayKeys = ["Lun", "Mar", "Mie", "Jue", "Vie", "Sab", "Dom"];

  for (const weekday of uniqueWeekdays) {
    const { data: systemRoute, error: systemError } = await input.database
      .from("logistics_route_definitions")
      .select("id")
      .eq("organization_id", input.organizationId)
      .eq("is_system_general", true)
      .eq("system_weekday", weekday)
      .eq("status", "active")
      .maybeSingle();
    if (systemError) throw new Error(systemError.message);
    if (!systemRoute?.id) continue;

    const { data: namedSchedules, error: namedError } = await input.database
      .from("logistics_route_schedules")
      .select("id, route_definition_id")
      .eq("organization_id", input.organizationId)
      .eq("weekday", weekday)
      .eq("is_active", true);
    if (namedError) throw new Error(namedError.message);

    const systemRouteId = String(systemRoute.id);
    const hasNamed = (namedSchedules || []).some(
      (row) => String(row.route_definition_id) !== systemRouteId,
    );
    const dayEnabled = enabledDays.has(weekdayKeys[weekday] || "");

    const { error: updateError } = await input.database
      .from("logistics_route_schedules")
      .update({ is_active: !hasNamed && dayEnabled, updated_at: new Date().toISOString() })
      .eq("organization_id", input.organizationId)
      .eq("route_definition_id", systemRouteId)
      .eq("weekday", weekday);
    if (updateError) throw new Error(updateError.message);
  }
}

async function weekdaysForRouteDefinition(input: {
  database: SupabaseClient;
  organizationId: string;
  routeDefinitionId: string;
}) {
  const { data, error } = await input.database
    .from("logistics_route_schedules")
    .select("weekday")
    .eq("organization_id", input.organizationId)
    .eq("route_definition_id", input.routeDefinitionId);
  if (error) throw new Error(error.message);
  return (data || []).map((row) => Number(row.weekday));
}

export async function createGeographicRouteDefinitionAction(
  input: GeographicRouteDefinitionInput,
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAppSession();
    requireRouteManager(session);
    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");
    const database = untyped(supabase);
    const route = normalizedRouteInput(input);
    const { data: definition, error } = await database
      .from("logistics_route_definitions")
      .insert({
        organization_id: session.organizationId,
        name: route.name,
        zone_name: route.zoneName,
        color: route.color,
        coverage_mode: route.coverageMode,
        created_by: session.userId,
      })
      .select("id")
      .single();
    if (error || !definition) throw new Error(error?.message || "No se pudo crear la ruta");
    const routeDefinitionId = String(definition.id);
    await replaceSchedules({ database, organizationId: session.organizationId, routeDefinitionId, userId: session.userId, schedules: route.schedules });
    await replacePostalCodes({
      database,
      organizationId: session.organizationId,
      routeDefinitionId,
      userId: session.userId,
      postalCodes: [],
    });
    await replaceCoveragePlaces({
      database,
      organizationId: session.organizationId,
      routeDefinitionId,
      userId: session.userId,
      places: route.coverageMode === "places" ? route.places : [],
    });
    await reconcileSystemDaySchedulesForWeekdays({
      database,
      organizationId: session.organizationId,
      weekdays: route.schedules.map((schedule) => schedule.weekday),
    });
    await recordActivityHistory(supabase, session, {
      action: "logistics.route_definition.created",
      entityType: "logistics_route_definition",
      entityId: routeDefinitionId,
      title: `Ruta geografica creada: ${route.name}`,
      metadata: {
        coverageMode: route.coverageMode,
        postalCodes: route.postalCodes,
        places: route.places,
        schedules: route.schedules.length,
      },
    });
    return ok({ id: routeDefinitionId });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function updateGeographicRouteDefinitionAction(
  input: GeographicRouteDefinitionInput & { routeDefinitionId: string },
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAppSession();
    requireRouteManager(session);
    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");
    const database = untyped(supabase);
    const route = normalizedRouteInput(input);
    const routeDefinitionId = String(input.routeDefinitionId || "").trim();
    const previousWeekdays = await weekdaysForRouteDefinition({
      database,
      organizationId: session.organizationId,
      routeDefinitionId,
    });
    const { error } = await database.from("logistics_route_definitions").update({
      name: route.name,
      zone_name: route.zoneName,
      color: route.color,
      coverage_mode: route.coverageMode,
      updated_at: new Date().toISOString(),
    }).eq("id", routeDefinitionId).eq("organization_id", session.organizationId).eq("is_system_general", false);
    if (error) throw new Error(error.message);
    await replacePostalCodes({
      database,
      organizationId: session.organizationId,
      routeDefinitionId,
      userId: session.userId,
      postalCodes: [],
    });
    await replaceCoveragePlaces({
      database,
      organizationId: session.organizationId,
      routeDefinitionId,
      userId: session.userId,
      places: route.coverageMode === "places" ? route.places : [],
    });
    await replaceSchedules({ database, organizationId: session.organizationId, routeDefinitionId, userId: session.userId, schedules: route.schedules });
    await reconcileSystemDaySchedulesForWeekdays({
      database,
      organizationId: session.organizationId,
      weekdays: [...previousWeekdays, ...route.schedules.map((schedule) => schedule.weekday)],
    });
    await recordActivityHistory(supabase, session, {
      action: "logistics.route_definition.updated",
      entityType: "logistics_route_definition",
      entityId: routeDefinitionId,
      title: `Ruta geografica actualizada: ${route.name}`,
      metadata: {
        coverageMode: route.coverageMode,
        postalCodes: route.postalCodes,
        places: route.places,
        schedules: route.schedules.length,
      },
    });
    return ok({ id: routeDefinitionId });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function archiveGeographicRouteDefinitionAction(input: {
  routeDefinitionId: string;
  reason: string;
}): Promise<ActionResult<null>> {
  try {
    const session = await requireAppSession();
    requireRouteManager(session);
    const reason = String(input.reason || "").trim();
    if (reason.length < 3) return fail("Escribe el motivo para archivar la ruta");
    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");
    const database = untyped(supabase);
    const now = new Date().toISOString();
    const previousWeekdays = await weekdaysForRouteDefinition({
      database,
      organizationId: session.organizationId,
      routeDefinitionId: input.routeDefinitionId,
    });
    const { error } = await database.from("logistics_route_definitions").update({
      status: "archived", archived_at: now, archived_by: session.userId, updated_at: now,
    }).eq("id", input.routeDefinitionId).eq("organization_id", session.organizationId).eq("is_system_general", false);
    if (error) throw new Error(error.message);
    const { error: scheduleError } = await database.from("logistics_route_schedules").update({ is_active: false, updated_at: now })
      .eq("route_definition_id", input.routeDefinitionId).eq("organization_id", session.organizationId).eq("is_active", true);
    if (scheduleError) throw new Error(scheduleError.message);
    await reconcileSystemDaySchedulesForWeekdays({
      database,
      organizationId: session.organizationId,
      weekdays: previousWeekdays,
    });
    await recordActivityHistory(supabase, session, {
      action: "logistics.route_definition.archived",
      entityType: "logistics_route_definition",
      entityId: input.routeDefinitionId,
      title: "Ruta geografica archivada",
      description: reason,
    });
    return ok(null);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

function addressFingerprint(address: RouteCoverageAddress) {
  return createHash("sha256").update(normalizedAddressFingerprintSource(address)).digest("hex");
}

export async function resolveCompatibleGeographicRoutesAction(input: {
  customerId: string;
  scheduledAt: string;
  boxCount?: number;
}): Promise<ActionResult<{
  routes: CompatibleGeographicRoute[];
  postalCode: string;
  addressFingerprint: string;
  customerLocation: { lat: number; lng: number; label: string } | null;
}>> {
  try {
    const session = await requireAppSession();
    if (!sessionHasPermission(session, "sales.manage") && !sessionHasPermission(session, "routes.view")) {
      throw new Error("FORBIDDEN");
    }
    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");
    const database = untyped(supabase);
    const routeDate = scheduledAtToLocalDateInput(input.scheduledAt);
    const weekday = getLogisticsWeekdayIndex(routeDate);
    const parsedDate = new Date(input.scheduledAt);
    const time = `${String(parsedDate.getHours()).padStart(2, "0")}:${String(parsedDate.getMinutes()).padStart(2, "0")}`;
    const { data: customer, error: customerError } = await database.from("customers")
      .select("street, house_number, neighborhood, city, state, postal_code, country, formatted_address, place_id, lat, lng")
      .eq("id", input.customerId).eq("organization_id", session.organizationId).maybeSingle();
    if (customerError || !customer) return fail(customerError?.message || "Remitente no encontrado");
    const postalCode = normalizeUsPostalCode(customer.postal_code) || "";
    const fingerprint = addressFingerprint({ ...customer, houseNumber: customer.house_number, postalCode: customer.postal_code, placeId: customer.place_id, formattedAddress: customer.formatted_address });
    const [{ data: definitions, error: definitionsError }, { data: schedules, error: schedulesError }, { data: placeRows }, { data: reservations }, { data: approvals }] = await Promise.all([
      database.from("logistics_route_definitions").select("id, name, zone_name, color, coverage_mode, status, is_system_general")
        .eq("organization_id", session.organizationId).eq("status", "active"),
      database.from("logistics_route_schedules").select("id, route_definition_id, weekday, start_time, estimated_end_time, max_stops, max_boxes, is_active")
        .eq("organization_id", session.organizationId).eq("weekday", weekday).eq("is_active", true),
      database.from("logistics_route_coverage_places").select("route_definition_id, place_id, display_name, kind, parent_place_id, selection_role, lat, lng, bounds, color").eq("organization_id", session.organizationId),
      database.from("customer_route_assignment_requests").select("route_schedule_id, box_count").eq("organization_id", session.organizationId)
        .eq("route_date", routeDate).in("status", ["pending_approval", "template_confirmed"]),
      database.from("logistics_route_address_approvals").select("route_definition_id").eq("organization_id", session.organizationId)
        .eq("customer_id", input.customerId).eq("address_fingerprint", fingerprint).is("revoked_at", null),
    ]);
    if (definitionsError || schedulesError) throw new Error(definitionsError?.message || schedulesError?.message || "No se pudo consultar rutas");
    const definitionMap = new Map((definitions || []).map((row) => [String(row.id), row]));
    const placesByDefinition = new Map<string, RouteCoveragePlace[]>();
    for (const row of placeRows || []) {
      const definitionId = String(row.route_definition_id || "");
      if (!definitionId) continue;
      placesByDefinition.set(definitionId, [
        ...(placesByDefinition.get(definitionId) || []),
        mapCoveragePlaceRow(row as Record<string, unknown>),
      ]);
    }
    const reserved = new Map<string, { stops: number; boxes: number }>();
    for (const row of reservations || []) {
      const key = String(row.route_schedule_id || "");
      if (!key) continue;
      const value = reserved.get(key) || { stops: 0, boxes: 0 };
      value.stops += 1; value.boxes += Math.max(1, Number(row.box_count || 1)); reserved.set(key, value);
    }
    const approvedDefinitions = new Set((approvals || []).map((row) => String(row.route_definition_id)));
    const activeNamedWeekday = (schedules || []).some((schedule) => !Boolean(definitionMap.get(String(schedule.route_definition_id))?.is_system_general));
    const address: RouteCoverageAddress = {
      ...customer,
      houseNumber: customer.house_number,
      postalCode: customer.postal_code,
      placeId: customer.place_id,
      formattedAddress: customer.formatted_address,
    };
    const routes: CompatibleGeographicRoute[] = [];
    for (const schedule of schedules || []) {
      const definition = definitionMap.get(String(schedule.route_definition_id));
      if (!definition || (definition.is_system_general && activeNamedWeekday)) continue;
      const reservation = reserved.get(String(schedule.id)) || { stops: 0, boxes: 0 };
      const coverageMode: RouteCoverageMode =
        definition.coverage_mode === "places" ? "places" : "day_only";
      const candidate = {
        routeDefinitionId: String(definition.id), routeScheduleId: String(schedule.id), name: String(definition.name),
        weekday: Number(schedule.weekday), startTime: String(schedule.start_time).slice(0, 5),
        estimatedEndTime: String(schedule.estimated_end_time || "").slice(0, 5), coverageMode,
        postalCodes: [],
        places: placesByDefinition.get(String(definition.id)) || [],
        maxStops: schedule.max_stops == null ? null : Number(schedule.max_stops),
        maxBoxes: schedule.max_boxes == null ? null : Number(schedule.max_boxes), reservedStops: reservation.stops,
        reservedBoxes: reservation.boxes, isActive: Boolean(schedule.is_active), routeStatus: "active" as const,
      };
      if (!routeCandidateIsSelectable({
        candidate,
        weekday,
        time,
        requestedBoxes: Math.max(1, Number(input.boxCount || 1)),
      })) continue;
      const coverageMatches = routeCandidateCoverageMatches({ candidate, address });
      const needsApproval = !coverageMatches && !approvedDefinitions.has(String(definition.id));
      const explanation = coverageMatches
        ? "La direccion cae en la cobertura de ciudad o zona de esta ruta"
        : "La direccion no coincide con la cobertura; Logistica debe verificar la excepcion";
      routes.push({
        ...candidate,
        zoneName: String(definition.zone_name || ""),
        color: String(definition.color || "#10b981"),
        needsApproval,
        coverageMatches,
        explanation,
      });
    }
    const customerLat = Number(customer.lat);
    const customerLng = Number(customer.lng);
    return ok({
      routes,
      postalCode,
      addressFingerprint: fingerprint,
      customerLocation:
        Number.isFinite(customerLat) && Number.isFinite(customerLng)
          ? {
              lat: customerLat,
              lng: customerLng,
              label: String(customer.formatted_address || "Dirección del cliente"),
            }
          : null,
    });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export type ZctaGeometry = { postalCode: string; censusVintage: string; geojson: Record<string, unknown>; bounds: Record<string, unknown> };

export type CensusPlaceGeometry = {
  placeId: string;
  censusGeoid: string | null;
  censusName: string | null;
  censusLayer: "incorporated" | "cdp" | null;
  censusVintage: string;
  geojson: Record<string, unknown> | null;
  bounds: RouteCoveragePlace["bounds"];
  found: boolean;
};

export async function loadCensusPlaceGeometryAction(input: {
  places: Array<{
    placeId: string;
    kind: RouteCoveragePlace["kind"];
    lat?: number | null;
    lng?: number | null;
  }>;
}): Promise<ActionResult<CensusPlaceGeometry[]>> {
  try {
    const session = await requireAppSession();
    if (!sessionHasPermission(session, "routes.view") && !sessionHasPermission(session, "sales.manage")) {
      throw new Error("FORBIDDEN");
    }
    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");
    const database = untyped(supabase);

    const unique = new Map<string, { placeId: string; kind: RouteCoveragePlace["kind"]; lat: number | null; lng: number | null }>();
    for (const place of input.places || []) {
      const placeId = String(place.placeId || "").trim();
      if (!placeId || unique.has(placeId)) continue;
      const lat = place.lat == null ? null : Number(place.lat);
      const lng = place.lng == null ? null : Number(place.lng);
      unique.set(placeId, {
        placeId,
        kind: normalizeCoveragePlaceKind(place.kind) || "locality",
        lat: lat != null && Number.isFinite(lat) ? lat : null,
        lng: lng != null && Number.isFinite(lng) ? lng : null,
      });
    }
    const places = Array.from(unique.values()).slice(0, 40);
    if (!places.length) return ok([]);

    const { data: cached } = await database
      .from("logistics_census_place_geometry_cache")
      .select("place_id, census_geoid, census_name, census_layer, census_vintage, geojson, bounds, found, fetched_at")
      .in(
        "place_id",
        places.map((place) => place.placeId),
      );

    const fresh = new Map<string, CensusPlaceGeometry>();
    const staleAfter = Date.now() - 1000 * 60 * 60 * 24 * 180;
    const missStaleAfter = Date.now() - 1000 * 60 * 60 * 24 * 14;
    for (const row of cached || []) {
      const fetchedAt = new Date(row.fetched_at).getTime();
      const found = Boolean(row.found);
      const vintage = String(row.census_vintage || "");
      if (vintage !== CENSUS_PLACE_GEOMETRY_VINTAGE) continue;
      const freshEnough = found ? fetchedAt >= staleAfter : fetchedAt >= missStaleAfter;
      if (!freshEnough) continue;
      fresh.set(String(row.place_id), {
        placeId: String(row.place_id),
        censusGeoid: row.census_geoid ? String(row.census_geoid) : null,
        censusName: row.census_name ? String(row.census_name) : null,
        censusLayer:
          row.census_layer === "incorporated" || row.census_layer === "cdp"
            ? row.census_layer
            : null,
        censusVintage: vintage,
        geojson: found ? (row.geojson as Record<string, unknown>) : null,
        bounds: found ? parseCoveragePlaceBounds(row.bounds) : null,
        found,
      });
    }

    for (const place of places.filter((item) => !fresh.has(item.placeId))) {
      let value: CensusPlaceGeometry = {
        placeId: place.placeId,
        censusGeoid: null,
        censusName: null,
        censusLayer: null,
        censusVintage: CENSUS_PLACE_GEOMETRY_VINTAGE,
        geojson: null,
        bounds: null,
        found: false,
      };

      if (place.lat != null && place.lng != null) {
        try {
          const hit = await fetchCensusPlaceGeometryAtPoint({
            lat: place.lat,
            lng: place.lng,
            kind: place.kind,
          });
          if (hit) {
            value = {
              placeId: place.placeId,
              censusGeoid: hit.geoid,
              censusName: hit.name,
              censusLayer: hit.layer,
              censusVintage: CENSUS_PLACE_GEOMETRY_VINTAGE,
              geojson: hit.geojson,
              bounds: hit.bounds,
              found: true,
            };
          }
        } catch {
          // Census is degradable; keep miss and continue.
        }
      }

      fresh.set(place.placeId, value);
      try {
        await database.from("logistics_census_place_geometry_cache").upsert(
          {
            place_id: place.placeId,
            census_geoid: value.censusGeoid,
            census_name: value.censusName,
            census_layer: value.censusLayer,
            census_vintage: value.censusVintage,
            geojson: value.geojson || { type: "FeatureCollection", features: [] },
            bounds: value.bounds || {},
            found: value.found,
            fetched_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "place_id" },
        );
      } catch {
        // Cache write is best-effort (viewers may lack routes.update_status).
      }
    }

    return ok(places.map((place) => fresh.get(place.placeId)).filter((item): item is CensusPlaceGeometry => Boolean(item)));
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function loadZctaGeometryAction(input: { postalCodes: string[] }): Promise<ActionResult<ZctaGeometry[]>> {
  try {
    const session = await requireAppSession();
    if (!sessionHasPermission(session, "routes.view") && !sessionHasPermission(session, "sales.manage")) throw new Error("FORBIDDEN");
    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");
    const database = untyped(supabase);
    const postalCodes = Array.from(new Set(input.postalCodes.map(normalizeUsPostalCode).filter((zip): zip is string => Boolean(zip)))).slice(0, 100);
    const { data: cached } = await database.from("logistics_zcta_geometry_cache").select("postal_code, census_vintage, geojson, bounds, fetched_at").in("postal_code", postalCodes);
    const fresh = new Map<string, ZctaGeometry>();
    const staleAfter = Date.now() - 1000 * 60 * 60 * 24 * 180;
    for (const row of cached || []) {
      if (new Date(row.fetched_at).getTime() >= staleAfter) fresh.set(String(row.postal_code), { postalCode: String(row.postal_code), censusVintage: String(row.census_vintage), geojson: row.geojson as Record<string, unknown>, bounds: row.bounds as Record<string, unknown> });
    }
    for (const postalCode of postalCodes.filter((zip) => !fresh.has(zip))) {
      const url = new URL("https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/PUMA_TAD_TAZ_UGA_ZCTA/MapServer/1/query");
      url.searchParams.set("where", `ZCTA5='${postalCode}'`); url.searchParams.set("outFields", "ZCTA5,GEOID");
      url.searchParams.set("returnGeometry", "true"); url.searchParams.set("outSR", "4326"); url.searchParams.set("f", "geojson");
      const response = await fetch(url, { next: { revalidate: 60 * 60 * 24 * 30 } });
      if (!response.ok) continue;
      const geojson = await response.json() as Record<string, unknown>;
      if (!Array.isArray(geojson.features) || geojson.features.length === 0) continue;
      const value = { postalCode, censusVintage: "2020", geojson, bounds: {} };
      fresh.set(postalCode, value);
      await database.from("logistics_zcta_geometry_cache").upsert({ postal_code: postalCode, census_vintage: "2020", geojson, bounds: {}, fetched_at: new Date().toISOString(), updated_at: new Date().toISOString() }, { onConflict: "postal_code" });
    }
    return ok(postalCodes.map((zip) => fresh.get(zip)).filter((item): item is ZctaGeometry => Boolean(item)));
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function searchCoveragePlacesAction(input: {
  query: string;
  countryCode?: string | null;
}): Promise<ActionResult<{ suggestions: CoveragePlaceSuggestion[] }>> {
  try {
    const session = await requireAppSession();
    requireRouteManager(session);
    const suggestions = await searchCoveragePlaces({
      query: input.query,
      countryCode: input.countryCode || "us",
      kinds: ["cities", "zones"],
    });
    return ok({ suggestions });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function resolveCoveragePlaceDetailsAction(input: {
  placeId: string;
}): Promise<ActionResult<RouteCoveragePlace>> {
  try {
    const session = await requireAppSession();
    requireRouteManager(session);
    const details = await fetchCoveragePlaceDetails(input.placeId);
    return ok({
      placeId: details.placeId,
      displayName: details.displayName,
      kind: details.kind,
      parentPlaceId: null,
      selectionRole: "root_whole",
      lat: details.lat,
      lng: details.lng,
      bounds: details.bounds,
    });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function loadCensusPlacesCatalogAction(input: {
  north: number;
  south: number;
  east: number;
  west: number;
  zoom?: number;
}): Promise<ActionResult<CensusCatalogPlace[]>> {
  try {
    const session = await requireAppSession();
    if (!sessionHasPermission(session, "routes.view") && !sessionHasPermission(session, "sales.manage")) {
      throw new Error("FORBIDDEN");
    }
    const north = Number(input.north);
    const south = Number(input.south);
    const east = Number(input.east);
    const west = Number(input.west);
    if (![north, south, east, west].every(Number.isFinite)) {
      return fail("Extensión de mapa no válida");
    }
    const zoom = Number(input.zoom);
    // Puzzle pieces are only useful once the operator is close enough to read city outlines.
    if (Number.isFinite(zoom) && zoom < 9) {
      return ok([]);
    }
    const span = Math.max(north - south, east - west);
    const maxAllowableOffset = span > 0.8 ? 0.002 : span > 0.35 ? 0.0012 : 0.0007;
    const places = await fetchCensusPlacesInBounds({
      bounds: { north, south, east, west },
      maxAllowableOffset,
      resultRecordCount: 140,
    });
    return ok(places.slice(0, 180));
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function resolveCoveragePlaceFromCensusPolygonAction(input: {
  geoid: string;
  name: string;
  layer?: CensusPlaceLayer | null;
  lat: number;
  lng: number;
  geojson: Record<string, unknown>;
  bounds?: RouteCoveragePlace["bounds"];
}): Promise<ActionResult<RouteCoveragePlace>> {
  try {
    const session = await requireAppSession();
    requireRouteManager(session);
    const geoid = String(input.geoid || "").trim();
    const name = String(input.name || "").trim();
    const lat = Number(input.lat);
    const lng = Number(input.lng);
    if (!geoid || !name) return fail("Falta la zona administrativa");
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return fail("Coordenadas no válidas");
    if (!input.geojson || typeof input.geojson !== "object") {
      return fail("Falta la geometría GeoJSON de la zona");
    }

    const preferLocality = input.layer !== "cdp";
    const details = await resolveCoveragePlaceFromCensusName({
      name,
      lat,
      lng,
      preferLocality,
    });

    const place: RouteCoveragePlace = {
      placeId: details.placeId,
      displayName: details.displayName || name,
      kind: preferLocality ? "locality" : details.kind === "locality" ? "neighborhood" : details.kind,
      parentPlaceId: null,
      selectionRole: "root_whole",
      lat: details.lat ?? lat,
      lng: details.lng ?? lng,
      bounds: details.bounds || input.bounds || null,
    };

    // Persist the exact clicked polygon so preview/coverage never invent a different outline.
    try {
      const supabase = await createScopedSupabase(session);
      if (supabase) {
        const database = untyped(supabase);
        await database.from("logistics_census_place_geometry_cache").upsert(
          {
            place_id: place.placeId,
            census_geoid: geoid,
            census_name: name,
            census_layer: input.layer === "cdp" || input.layer === "incorporated" ? input.layer : null,
            census_vintage: CENSUS_PLACE_GEOMETRY_VINTAGE,
            geojson: input.geojson,
            bounds: place.bounds || input.bounds || {},
            found: true,
            fetched_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "place_id" },
        );
      }
    } catch {
      // Cache write is best-effort.
    }

    return ok(place);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function resolveCoveragePlaceAtMapClickAction(input: {
  lat: number;
  lng: number;
}): Promise<ActionResult<RouteCoveragePlace>> {
  try {
    const session = await requireAppSession();
    requireRouteManager(session);
    const details = await resolveCoveragePlaceAtLatLng({
      lat: input.lat,
      lng: input.lng,
      prefer: "locality",
    });
    // Prefer Place Details when we have a real place_id so bounds are richer.
    if (details.placeId && !details.placeId.startsWith("latlng:")) {
      try {
        const richer = await fetchCoveragePlaceDetails(details.placeId);
        return ok({
          placeId: richer.placeId,
          displayName: richer.displayName || details.displayName,
          kind: richer.kind === "locality" ? "locality" : details.kind,
          parentPlaceId: null,
          selectionRole: "root_whole",
          lat: richer.lat ?? details.lat,
          lng: richer.lng ?? details.lng,
          bounds: richer.bounds || details.bounds,
        });
      } catch {
        // Fall through to geocode details.
      }
    }
    return ok({
      placeId: details.placeId,
      displayName: details.displayName,
      kind: details.kind,
      parentPlaceId: null,
      selectionRole: "root_whole",
      lat: details.lat,
      lng: details.lng,
      bounds: details.bounds,
    });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function listCoveragePlaceChildrenAction(input: {
  parentPlaceId: string;
  parentDisplayName?: string;
  lat?: number | null;
  lng?: number | null;
}): Promise<ActionResult<{ children: CoveragePlaceSuggestion[] }>> {
  try {
    const session = await requireAppSession();
    requireRouteManager(session);
    const parentPlaceId = String(input.parentPlaceId || "").trim();
    if (!parentPlaceId) return fail("Falta la ciudad padre");

    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");
    const database = untyped(supabase);
    const staleAfter = Date.now() - 1000 * 60 * 60 * 24 * 30;
    const { data: cached } = await database
      .from("logistics_place_children_cache")
      .select("children, fetched_at, parent_display_name")
      .eq("parent_place_id", parentPlaceId)
      .maybeSingle();
    if (cached && new Date(cached.fetched_at).getTime() >= staleAfter && Array.isArray(cached.children)) {
      return ok({ children: cached.children as CoveragePlaceSuggestion[] });
    }

    let parentDisplayName = String(input.parentDisplayName || cached?.parent_display_name || "").trim();
    let lat = input.lat == null ? null : Number(input.lat);
    let lng = input.lng == null ? null : Number(input.lng);
    if (!parentDisplayName || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      const details = await fetchCoveragePlaceDetails(parentPlaceId);
      parentDisplayName = parentDisplayName || details.displayName;
      lat = Number.isFinite(lat) ? lat : details.lat;
      lng = Number.isFinite(lng) ? lng : details.lng;
    }

    const children = await searchCoveragePlaceChildren({
      parentDisplayName,
      location: Number.isFinite(lat) && Number.isFinite(lng) ? { lat: Number(lat), lng: Number(lng) } : null,
      countryCode: "us",
    });

    await database.from("logistics_place_children_cache").upsert({
      parent_place_id: parentPlaceId,
      parent_display_name: parentDisplayName,
      children,
      fetched_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "parent_place_id" });

    return ok({ children });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
