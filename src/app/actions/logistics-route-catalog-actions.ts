"use server";

import { requireAppSession } from "@/lib/auth/session";
import { sessionHasPermission } from "@/lib/auth/permissions";
import { createScopedSupabase } from "@/lib/supabase/scoped";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import { recordActivityHistory } from "@/lib/activity-history";
import { isLogisticsWeekdayKey, logisticsWeekdayKeys, type LogisticsWeekdayKey } from "@/lib/logistics-route-catalog";
import {
  normalizeScheduleSuggestionConfig,
  scheduleTimeSuggestionsFor,
} from "@/lib/sale/schedule-suggestions";

import {
  ROUTE_TEMPLATE_SELECT,
  assertConductorProfile,
  canManageRouteSchedule,
  canManageRoutes,
  isLegacyImplicitDayTemplate,
  mapRouteTemplate,
  routeScheduleInput,
  type LogisticsRouteCatalog,
  type LogisticsRouteTemplateDbRow,
  type LogisticsRouteTemplateRow,
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

    const [daysResult, templatesResult, defaultsResult, schedulesResult, suggestionsResult] = await Promise.all([
      supabase.rpc("list_logistics_route_weekdays", { target_org_id: session.organizationId }),
      supabase
        .from("logistics_route_templates")
        .select(ROUTE_TEMPLATE_SELECT)
        .eq("organization_id", session.organizationId)
        .order("weekday", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("logistics_weekday_defaults")
        .select("weekday, default_driver_id")
        .eq("organization_id", session.organizationId),
      supabase.rpc("list_logistics_weekday_schedules", {
        target_org_id: session.organizationId,
      }),
      supabase
        .from("organization_route_settings")
        .select("schedule_suggestions")
        .eq("organization_id", session.organizationId)
        .maybeSingle(),
    ]);

    if (daysResult.error) {
      return fail(daysResult.error.message);
    }

    if (templatesResult.error) {
      return fail(templatesResult.error.message);
    }

    if (schedulesResult.error) {
      return fail(schedulesResult.error.message);
    }

    if (suggestionsResult.error) {
      return fail(suggestionsResult.error.message);
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
    for (const row of (schedulesResult.data || []) as LogisticsWeekdayScheduleDbRow[]) {
      if (
        Number.isInteger(row.weekday) &&
        row.weekday >= 0 &&
        row.weekday <= 6 &&
        row.start_time &&
        row.estimated_end_time
      ) {
        weekdayScheduleByWeekday[row.weekday] = {
          startTime: row.start_time.slice(0, 5),
          estimatedEndTime: row.estimated_end_time.slice(0, 5),
        };
      }
    }

    const enabledDays = (daysResult.data || []).filter(isLogisticsWeekdayKey);
    const templates = ((templatesResult.data || []) as LogisticsRouteTemplateDbRow[])
      .map(mapRouteTemplate)
      .filter((template) => !isLegacyImplicitDayTemplate(template));
    const scheduleSuggestions = normalizeScheduleSuggestionConfig(
      suggestionsResult.data?.schedule_suggestions,
    );

    return ok({
      enabledDays,
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

export async function setLogisticsWeekdayScheduleAction(input: {
  weekday: number;
  startTime: string;
  estimatedEndTime: string;
}): Promise<ActionResult<LogisticsWeekdaySchedule>> {
  try {
    const session = await requireAppSession();
    if (!canManageRouteSchedule(session)) {
      throw new Error("FORBIDDEN");
    }

    if (!Number.isInteger(input.weekday) || input.weekday < 0 || input.weekday > 6) {
      return fail("Dia de ruta invalido");
    }

    const schedule = routeScheduleInput(input);
    if (!schedule.startTime || !schedule.estimatedEndTime) {
      return fail("Completa el horario general del dia");
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
    if (error || !row?.start_time || !row.estimated_end_time) {
      return fail(error?.message || "No se pudo guardar el horario general del dia");
    }

    const result = {
      startTime: row.start_time.slice(0, 5),
      estimatedEndTime: row.estimated_end_time.slice(0, 5),
    };
    await recordActivityHistory(supabase, session, {
      action: "logistics.weekday_schedule_changed",
      entityType: "logistics_weekday_default",
      entityId: null,
      title: `Horario general actualizado: ${logisticsWeekdayKeys[input.weekday]}`,
      description: `${result.startTime} - ${result.estimatedEndTime}`,
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

export async function setLogisticsRouteWeekdayEnabledAction(input: {
  day: LogisticsWeekdayKey;
  enabled: boolean;
}): Promise<ActionResult<LogisticsWeekdayKey[]>> {
  try {
    const session = await requireAppSession();

    if (!canManageRoutes(session)) {
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

    const enabledDays = (data || []).filter(isLogisticsWeekdayKey);
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

export async function createLogisticsRouteTemplateAction(input: {
  weekday: number;
  name: string;
  startTime?: string;
  estimatedEndTime?: string;
}): Promise<ActionResult<LogisticsRouteTemplateRow>> {
  try {
    const session = await requireAppSession();

    if (!canManageRoutes(session)) {
      throw new Error("FORBIDDEN");
    }

    const schedule = routeScheduleInput(input);
    if (schedule.hasScheduleInput && !canManageRouteSchedule(session)) {
      throw new Error("FORBIDDEN");
    }

    const name = input.name.trim();
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
  estimatedEndTime?: string;
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

    const schedule = routeScheduleInput(input);
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
