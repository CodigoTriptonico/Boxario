"use server";

import type { SupabaseClient } from "@supabase/supabase-js";

import { requireAppSession } from "@/lib/auth/session";
import { sessionHasPermission } from "@/lib/auth/permissions";
import { createScopedSupabase } from "@/lib/supabase/scoped";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import { recordActivityHistory } from "@/lib/activity-history";
import { isLogisticsWeekdayKey, logisticsWeekdayKeys, type LogisticsWeekdayKey } from "@/lib/logistics-route-catalog";
import {
  ROUTE_TEMPLATE_SELECT,
  assertConductorProfile,
  canManageRouteSchedule,
  canManageRoutes,
  mapRouteTemplate,
  routeOperationalWindowInput,
  type LogisticsRouteTemplateDbRow,
  type LogisticsRouteTemplateRow,
  type LogisticsWeekdaySchedule,
  type LogisticsWeekdayScheduleDbRow,
} from "@/app/actions/logistics-routes-shared";

function optionalPositiveInteger(value: unknown, label: string) {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 10000) {
    throw new Error(`${label} debe ser un numero entero mayor a cero`);
  }
  return parsed;
}
function normalizedPostalCodes(value: unknown) {
  const source = Array.isArray(value) ? value : String(value || "").split(/[\s,;]+/);
  return Array.from(new Set(source.map((entry) => String(entry).trim().toUpperCase()).filter(Boolean))).slice(0, 250);
}

/** Keep the geographic day-as-route schedule aligned with weekday defaults. */
async function syncSystemGeneralDaySchedule(input: {
  supabase: NonNullable<Awaited<ReturnType<typeof createScopedSupabase>>>;
  organizationId: string;
  userId: string;
  weekday: number;
  startTime: string;
  estimatedEndTime: string | null;
  activate: boolean;
}) {
  const geographicDb = input.supabase as unknown as SupabaseClient;
  const dayKey = logisticsWeekdayKeys[input.weekday];
  const { data: systemRoute, error: systemRouteError } = await geographicDb
    .from("logistics_route_definitions")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("is_system_general", true)
    .eq("system_weekday", input.weekday)
    .eq("status", "active")
    .maybeSingle();
  if (systemRouteError) throw new Error(systemRouteError.message);

  let systemRouteId = systemRoute?.id ? String(systemRoute.id) : "";
  if (!systemRouteId) {
    const { data: created, error: createError } = await geographicDb
      .from("logistics_route_definitions")
      .insert({
        organization_id: input.organizationId,
        name: `Ruta general de ${dayKey}`,
        color: "#10b981",
        coverage_mode: "day_only",
        is_system_general: true,
        system_weekday: input.weekday,
        created_by: input.userId,
      })
      .select("id")
      .single();
    if (createError || !created) throw new Error(createError?.message || "No se pudo crear la ruta general del día");
    systemRouteId = String(created.id);
  }

  const { data: namedSchedules, error: namedError } = await geographicDb
    .from("logistics_route_schedules")
    .select("id, route_definition_id")
    .eq("organization_id", input.organizationId)
    .eq("weekday", input.weekday)
    .eq("is_active", true);
  if (namedError) throw new Error(namedError.message);
  const hasNamed = (namedSchedules || []).some(
    (row) => String(row.route_definition_id) !== systemRouteId,
  );

  const { data: existingSchedule, error: existingError } = await geographicDb
    .from("logistics_route_schedules")
    .select("id")
    .eq("route_definition_id", systemRouteId)
    .eq("weekday", input.weekday)
    .maybeSingle();
  if (existingError) throw new Error(existingError.message);

  const payload = {
    organization_id: input.organizationId,
    route_definition_id: systemRouteId,
    weekday: input.weekday,
    start_time: input.startTime,
    estimated_end_time: input.estimatedEndTime,
    is_active: input.activate && !hasNamed,
    updated_at: new Date().toISOString(),
  };

  const query = existingSchedule
    ? geographicDb.from("logistics_route_schedules").update(payload).eq("id", existingSchedule.id)
    : geographicDb.from("logistics_route_schedules").insert({ ...payload, created_by: input.userId });
  const { error: scheduleError } = await query;
  if (scheduleError) throw new Error(scheduleError.message);
}

export async function setLogisticsWeekdayDefaultDriverAction(input: {
  weekday: number;
  driverId: string | null;
}): Promise<ActionResult<string | null>> {
  try {
    const session = await requireAppSession();
    if (!canManageRoutes(session)) throw new Error("FORBIDDEN");
    if (!Number.isInteger(input.weekday) || input.weekday < 0 || input.weekday > 6) {
      return fail("Dia de ruta invalido");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");

    const driverId = input.driverId || null;
    if (driverId) await assertConductorProfile(supabase, session, driverId);

    const { error } = await supabase
      .from("logistics_weekday_defaults")
      .upsert(
        {
          organization_id: session.organizationId,
          weekday: input.weekday,
          default_driver_id: driverId,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "organization_id,weekday" },
      );
    if (error) return fail(error.message);

    await recordActivityHistory(supabase, session, {
      action: "logistics.weekday_default_driver_changed",
      entityType: "logistics_weekday_default",
      entityId: null,
      title: "Conductor predeterminado actualizado",
      description: logisticsWeekdayKeys[input.weekday] || "Dia de ruta",
      metadata: { weekday: input.weekday, driverId },
    });

    return ok(driverId);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function setLogisticsRouteTemplateDefaultDriverAction(input: {
  templateId: string;
  driverId: string | null;
}): Promise<ActionResult<LogisticsRouteTemplateRow>> {
  try {
    const session = await requireAppSession();
    if (!canManageRoutes(session)) throw new Error("FORBIDDEN");

    const templateId = String(input.templateId || "").trim();
    if (!templateId) return fail("Subruta invalida");

    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");

    const driverId = input.driverId || null;
    if (driverId) await assertConductorProfile(supabase, session, driverId);

    const { data, error } = await supabase
      .from("logistics_route_templates")
      .update({ default_driver_id: driverId, updated_at: new Date().toISOString() })
      .eq("id", templateId)
      .eq("organization_id", session.organizationId)
      .select(ROUTE_TEMPLATE_SELECT)
      .single();
    if (error || !data) return fail(error?.message || "No se pudo actualizar el conductor de la subruta");

    const template = mapRouteTemplate(data as LogisticsRouteTemplateDbRow);
    await recordActivityHistory(supabase, session, {
      action: "logistics.route_template_default_driver_changed",
      entityType: "logistics_route_template",
      entityId: template.id,
      title: "Conductor predeterminado de subruta actualizado",
      description: template.name,
      metadata: { weekday: template.weekday, driverId },
    });

    return ok(template);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function setLogisticsWeekdayScheduleAction(input: {
  weekday: number;
  startTime: string;
  estimatedEndTime?: string | null;
}): Promise<ActionResult<LogisticsWeekdaySchedule>> {
  try {
    const session = await requireAppSession();
    if (!canManageRoutes(session) && !sessionHasPermission(session, "settings.manage")) {
      throw new Error("FORBIDDEN");
    }

    if (!Number.isInteger(input.weekday) || input.weekday < 0 || input.weekday > 6) {
      return fail("Dia de ruta invalido");
    }

    const schedule = routeOperationalWindowInput(input);
    if (!schedule.startTime) {
      return fail("La hora de inicio es obligatoria");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const { data, error } = await supabase.rpc("set_logistics_weekday_schedule", {
      target_org_id: session.organizationId,
      target_weekday: input.weekday,
      target_start_time: schedule.startTime,
      target_estimated_end_time: schedule.estimatedEndTime,
    });

    const row = ((data || []) as LogisticsWeekdayScheduleDbRow[])[0];
    if (error || !row?.start_time) {
      return fail(error?.message || "No se pudo guardar el horario general del dia");
    }

    const result = {
      startTime: row.start_time.slice(0, 5),
      estimatedEndTime: row.estimated_end_time?.slice(0, 5) || "",
      maxStops: row.max_stops ?? null,
      maxBoxes: row.max_boxes ?? null,
    };
    await syncSystemGeneralDaySchedule({
      supabase,
      organizationId: session.organizationId,
      userId: session.userId,
      weekday: input.weekday,
      startTime: result.startTime,
      estimatedEndTime: result.estimatedEndTime || null,
      activate: true,
    });
    await recordActivityHistory(supabase, session, {
      action: "logistics.weekday_schedule_changed",
      entityType: "logistics_weekday_default",
      entityId: null,
      title: `Horario general actualizado: ${logisticsWeekdayKeys[input.weekday]}`,
      description: result.estimatedEndTime
        ? `${result.startTime} - ${result.estimatedEndTime}`
        : `${result.startTime} - hasta terminar la ruta`,
      metadata: {
        weekday: input.weekday,
        ...result,
      },
    });

    return ok(result);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function setLogisticsWeekdayCapacityAction(input: {
  weekday: number;
  maxStops?: number | string | null;
  maxBoxes?: number | string | null;
}): Promise<ActionResult<{ maxStops: number | null; maxBoxes: number | null }>> {
  try {
    const session = await requireAppSession();
    if (!canManageRouteSchedule(session)) throw new Error("FORBIDDEN");
    if (!Number.isInteger(input.weekday) || input.weekday < 0 || input.weekday > 6) {
      return fail("Dia de ruta invalido");
    }
    const maxStops = optionalPositiveInteger(input.maxStops, "El maximo de paradas");
    const maxBoxes = optionalPositiveInteger(input.maxBoxes, "El maximo de cajas");
    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");

    const { data: existing } = await supabase
      .from("logistics_weekday_defaults")
      .select("organization_id")
      .eq("organization_id", session.organizationId)
      .eq("weekday", input.weekday)
      .maybeSingle();
    const query = existing
      ? supabase.from("logistics_weekday_defaults").update({ max_stops: maxStops, max_boxes: maxBoxes, updated_at: new Date().toISOString() })
      : supabase.from("logistics_weekday_defaults").insert({ organization_id: session.organizationId, weekday: input.weekday, max_stops: maxStops, max_boxes: maxBoxes });
    const { error } = await query;
    if (error) return fail(error.message);
    return ok({ maxStops, maxBoxes });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function setLogisticsRouteWeekdayEnabledAction(input: {
  day: LogisticsWeekdayKey;
  enabled: boolean;
}): Promise<ActionResult<LogisticsWeekdayKey[]>> {
  try {
    const session = await requireAppSession();

    if (!canManageRoutes(session) && !sessionHasPermission(session, "settings.manage")) {
      throw new Error("FORBIDDEN");
    }

    if (!isLogisticsWeekdayKey(input.day)) {
      return fail("Dia de ruta invalido");
    }
    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const { data, error } = await supabase.rpc("set_logistics_route_weekday_enabled", {
      target_org_id: session.organizationId,
      target_day: input.day,
      target_enabled: input.enabled,
    });

    if (error) {
      return fail(error.message);
    }

    const weekday = logisticsWeekdayKeys.indexOf(input.day);
    const geographicDb = supabase as unknown as SupabaseClient;
    const { data: systemRoute, error: systemRouteError } = await geographicDb
      .from("logistics_route_definitions")
      .select("id")
      .eq("organization_id", session.organizationId)
      .eq("is_system_general", true)
      .eq("system_weekday", weekday)
      .eq("status", "active")
      .maybeSingle();
    if (systemRouteError) return fail(systemRouteError.message);
    let systemRouteId = systemRoute?.id ? String(systemRoute.id) : "";
    if (input.enabled && !systemRouteId) {
      const { data: created, error: createError } = await geographicDb
        .from("logistics_route_definitions")
        .insert({
          organization_id: session.organizationId,
          name: `Ruta general de ${input.day}`,
          color: "#10b981",
          coverage_mode: "day_only",
          is_system_general: true,
          system_weekday: weekday,
          created_by: session.userId,
        })
        .select("id")
        .single();
      if (createError || !created) return fail(createError?.message || "No se pudo crear la ruta general del día");
      systemRouteId = String(created.id);
    }
    if (systemRouteId) {
      if (input.enabled) {
        const { data: defaults } = await supabase
          .from("logistics_weekday_defaults")
          .select("start_time, estimated_end_time")
          .eq("organization_id", session.organizationId)
          .eq("weekday", weekday)
          .maybeSingle();
        const startTime = defaults?.start_time?.slice(0, 5) || "10:00";
        const estimatedEndTime = defaults?.estimated_end_time?.slice(0, 5) || null;
        await syncSystemGeneralDaySchedule({
          supabase,
          organizationId: session.organizationId,
          userId: session.userId,
          weekday,
          startTime,
          estimatedEndTime,
          activate: true,
        });
      } else {
        const { error: scheduleError } = await geographicDb
          .from("logistics_route_schedules")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("route_definition_id", systemRouteId)
          .eq("weekday", weekday)
          .eq("is_active", true);
        if (scheduleError) return fail(scheduleError.message);
      }
    }

    const enabledDays = (data || []).filter(isLogisticsWeekdayKey);
    // delivery_days is the source of truth; keep legacy pickup_days in sync so it cannot resurrect days.
    const { error: syncPickupError } = await supabase
      .from("organization_route_settings")
      .update({
        pickup_days: enabledDays,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", session.organizationId);
    if (syncPickupError) return fail(syncPickupError.message);

    await recordActivityHistory(supabase, session, {
      action: "logistics.weekday_availability_changed",
      entityType: "organization_route_settings",
      entityId: session.organizationId,
      title: `${input.enabled ? "Dia habilitado" : "Dia deshabilitado"}: ${input.day}`,
      description: input.enabled
        ? "Disponible para dejar y recoger cajas"
        : "No disponible para dejar ni recoger cajas",
      metadata: { day: input.day, enabled: input.enabled },
    });

    return ok(enabledDays);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function activateLogisticsRouteWeekdayAction(input: {
  weekday: number;
  startTime: string;
  estimatedEndTime?: string | null;
  maxStops?: number | string | null;
  maxBoxes?: number | string | null;
}): Promise<ActionResult<{ enabledDays: LogisticsWeekdayKey[]; schedule: LogisticsWeekdaySchedule }>> {
  try {
    const session = await requireAppSession();
    if (!canManageRoutes(session) && !sessionHasPermission(session, "settings.manage")) {
      throw new Error("FORBIDDEN");
    }
    if (!Number.isInteger(input.weekday) || input.weekday < 0 || input.weekday > 6) {
      return fail("Dia de ruta invalido");
    }
    const schedule = routeOperationalWindowInput(input);
    if (!schedule.startTime) {
      return fail("La hora de inicio es obligatoria");
    }
    const maxStops = optionalPositiveInteger(input.maxStops, "El maximo de paradas");
    const maxBoxes = optionalPositiveInteger(input.maxBoxes, "El maximo de cajas");
    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");

    const { data, error } = await supabase.rpc("activate_logistics_route_weekday", {
      target_org_id: session.organizationId,
      target_weekday: input.weekday,
      target_start_time: schedule.startTime,
      target_estimated_end_time: schedule.estimatedEndTime,
      target_max_stops: maxStops,
      target_max_boxes: maxBoxes,
    });
    const row = ((data || []) as Array<{
      enabled_days: string[];
      start_time: string;
      estimated_end_time: string | null;
      max_stops: number | null;
      max_boxes: number | null;
    }>)[0];
    if (error || !row) return fail(error?.message || "No se pudo activar el dia de ruta");

    const result = {
      enabledDays: (row.enabled_days || []).filter(isLogisticsWeekdayKey),
      schedule: {
        startTime: row.start_time.slice(0, 5),
        estimatedEndTime: row.estimated_end_time?.slice(0, 5) || "",
        maxStops: row.max_stops ?? null,
        maxBoxes: row.max_boxes ?? null,
      },
    };
    await syncSystemGeneralDaySchedule({
      supabase,
      organizationId: session.organizationId,
      userId: session.userId,
      weekday: input.weekday,
      startTime: result.schedule.startTime,
      estimatedEndTime: result.schedule.estimatedEndTime || null,
      activate: true,
    });
    await recordActivityHistory(supabase, session, {
      action: "logistics.weekday_route_activated",
      entityType: "logistics_weekday_default",
      entityId: null,
      title: `Dia de ruta activado: ${logisticsWeekdayKeys[input.weekday]}`,
      description: result.schedule.estimatedEndTime
        ? `${result.schedule.startTime} - ${result.schedule.estimatedEndTime}`
        : `${result.schedule.startTime} - hasta terminar la ruta`,
      metadata: { weekday: input.weekday, ...result.schedule },
    });
    return ok(result);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function createLogisticsRouteTemplateAction(input: {
  weekday: number;
  name: string;
  startTime?: string;
  estimatedEndTime?: string | null;
  maxStops?: number | string | null;
  maxBoxes?: number | string | null;
  zoneKey?: string;
  coveredPostalCodes?: string[] | string;
}): Promise<ActionResult<LogisticsRouteTemplateRow>> {
  try {
    const session = await requireAppSession();

    if (!canManageRoutes(session)) {
      throw new Error("FORBIDDEN");
    }

    const schedule = routeOperationalWindowInput(input);
    if (schedule.hasScheduleInput && !canManageRouteSchedule(session)) {
      throw new Error("FORBIDDEN");
    }

    const name = input.name.trim();
    const maxStops = optionalPositiveInteger(input.maxStops, "El maximo de paradas");
    const maxBoxes = optionalPositiveInteger(input.maxBoxes, "El maximo de cajas");
    if (!schedule.startTime) {
      return fail("La hora de inicio es obligatoria");
    }
    if (!Number.isInteger(input.weekday) || input.weekday < 0 || input.weekday > 6 || !name) {
      return fail("Completa el nombre y el dia de la ruta");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const { data, error } = await supabase
      .from("logistics_route_templates")
      .insert({
        organization_id: session.organizationId,
        weekday: input.weekday,
        name,
        start_time: schedule.startTime,
        estimated_end_time: schedule.estimatedEndTime,
        max_stops: maxStops,
        max_boxes: maxBoxes,
        zone_key: String(input.zoneKey || "").trim().slice(0, 80),
        covered_postal_codes: normalizedPostalCodes(input.coveredPostalCodes),
        created_by: session.userId,
      })
      .select(ROUTE_TEMPLATE_SELECT)
      .single();

    if (error || !data) {
      return fail(error?.code === "23505" ? "Ya existe una ruta con ese nombre para este dia" : error?.message || "No se pudo crear la ruta");
    }

    const template = mapRouteTemplate(data as LogisticsRouteTemplateDbRow);
    await recordActivityHistory(supabase, session, {
      action: "logistics.route_template_created",
      entityType: "logistics_route_template",
      entityId: template.id,
      title: `Ruta semanal creada: ${template.name}`,
      description: logisticsWeekdayKeys[template.weekday] || "Dia de ruta",
      metadata: {
        weekday: template.weekday,
        startTime: template.startTime,
        estimatedEndTime: template.estimatedEndTime,
      },
    });

    return ok(template);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function updateLogisticsRouteTemplateAction(input: {
  templateId: string;
  name: string;
  startTime?: string;
  estimatedEndTime?: string | null;
  maxStops?: number | string | null;
  maxBoxes?: number | string | null;
  zoneKey?: string;
  coveredPostalCodes?: string[] | string;
}): Promise<ActionResult<LogisticsRouteTemplateRow>> {
  try {
    const session = await requireAppSession();

    if (!canManageRoutes(session)) {
      throw new Error("FORBIDDEN");
    }

    const name = input.name.trim();
    if (!input.templateId || !name) {
      return fail("El nombre de la ruta es obligatorio");
    }

    const schedule = routeOperationalWindowInput(input);
    const maxStops = optionalPositiveInteger(input.maxStops, "El maximo de paradas");
    const maxBoxes = optionalPositiveInteger(input.maxBoxes, "El maximo de cajas");
    if (!schedule.startTime) {
      return fail("La hora de inicio es obligatoria");
    }
    if (schedule.hasScheduleInput && !canManageRouteSchedule(session)) {
      throw new Error("FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const patch: Record<string, unknown> = {
      name,
      updated_at: new Date().toISOString(),
      max_stops: maxStops,
      max_boxes: maxBoxes,
      zone_key: String(input.zoneKey || "").trim().slice(0, 80),
      covered_postal_codes: normalizedPostalCodes(input.coveredPostalCodes),
    };
    if (schedule.hasScheduleInput) {
      patch.start_time = schedule.startTime;
      patch.estimated_end_time = schedule.estimatedEndTime;
    }

    const { data, error } = await supabase
      .from("logistics_route_templates")
      .update(patch)
      .eq("id", input.templateId)
      .eq("organization_id", session.organizationId)
      .select(ROUTE_TEMPLATE_SELECT)
      .single();

    if (error || !data) {
      return fail(error?.code === "23505" ? "Ya existe una ruta con ese nombre para este dia" : error?.message || "No se pudo actualizar la ruta");
    }

    const template = mapRouteTemplate(data as LogisticsRouteTemplateDbRow);
    await recordActivityHistory(supabase, session, {
      action: "logistics.route_template_updated",
      entityType: "logistics_route_template",
      entityId: template.id,
      title: `Ruta semanal actualizada: ${template.name}`,
      description: logisticsWeekdayKeys[template.weekday] || "Dia de ruta",
      metadata: {
        weekday: template.weekday,
        startTime: template.startTime,
        estimatedEndTime: template.estimatedEndTime,
      },
    });

    return ok(template);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function deleteLogisticsRouteTemplateAction(input: {
  templateId: string;
}): Promise<ActionResult<null>> {
  try {
    const session = await requireAppSession();

    if (!canManageRoutes(session)) {
      throw new Error("FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const { data: current, error: currentError } = await supabase
      .from("logistics_route_templates")
      .select("id, weekday, name")
      .eq("id", input.templateId)
      .eq("organization_id", session.organizationId)
      .maybeSingle();

    if (currentError || !current) {
      return fail(currentError?.message || "No se encontro la ruta semanal");
    }

    const { error } = await supabase
      .from("logistics_route_templates")
      .delete()
      .eq("id", input.templateId)
      .eq("organization_id", session.organizationId);

    if (error) {
      return fail(error.message);
    }

    await recordActivityHistory(supabase, session, {
      action: "logistics.route_template_deleted",
      entityType: "logistics_route_template",
      entityId: current.id,
      title: `Ruta semanal eliminada: ${current.name}`,
      description: logisticsWeekdayKeys[Number(current.weekday)] || "Dia de ruta",
      metadata: { weekday: Number(current.weekday) },
    });

    return ok(null);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
