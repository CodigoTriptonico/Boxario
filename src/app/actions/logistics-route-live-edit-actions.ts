"use server";

import { requireAppSession } from "@/lib/auth/session";
import { createScopedSupabase } from "@/lib/supabase/scoped";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import { recordActivityHistory } from "@/lib/activity-history";
import { type LogisticsRouteRow } from "@/lib/logistics-routing";
import {
  isStopOutcomeTransitionAllowed,
  routeAllowsLivePendingStopEdits,
  routeAllowsNormalStopEdits,
  routeIsClosedForOperationalEdits,
} from "@/lib/logistics-state-machine";

import { statusAfterRouteUnassign } from "@/lib/logistics-routing";

import {
  canManageRoutes,
  insertStops,
  routeTaskConstraintError,
  loadRouteById,
  loadTaskInputs,
  loadTaskRows,
} from "@/app/actions/logistics-routes-shared";

function cleanReason(value: unknown) {
  return String(value || "").trim().slice(0, 500);
}

async function requireLiveEditReason(reason: string) {
  if (reason.length < 3) {
    throw new Error("Indica un motivo para modificar la ruta en curso");
  }
}

async function auditLiveRouteChange(input: {
  supabase: NonNullable<Awaited<ReturnType<typeof createScopedSupabase>>>;
  session: Awaited<ReturnType<typeof requireAppSession>>;
  route: LogisticsRouteRow;
  changeType: string;
  reason: string;
  stopId?: string | null;
  beforeValue: Record<string, unknown>;
  afterValue: Record<string, unknown>;
  summary: string;
  idempotencyKey: string;
}) {
  await input.supabase.from("logistics_route_change_audit").insert({
    organization_id: input.session.organizationId,
    route_id: input.route.id,
    stop_id: input.stopId || null,
    change_type: input.changeType,
    reason: input.reason,
    before_value: input.beforeValue,
    after_value: input.afterValue,
    actor_id: input.session.userId,
    actor_name: input.session.fullName || input.session.email,
  });

  if (input.route.assignedTo) {
    await input.supabase.rpc("notify_logistics_route_change", {
      target_route_id: input.route.id,
      target_recipient_id: input.route.assignedTo,
      target_change_type: input.changeType,
      target_summary: input.summary,
      target_stop_id: input.stopId || null,
      target_idempotency_key: input.idempotencyKey,
      target_actor_id: input.session.userId,
      target_actor_name: input.session.fullName || input.session.email,
    });
  }

  await recordActivityHistory(input.supabase, input.session, {
    action: `logistics.route_${input.changeType}`,
    entityType: "logistics_route",
    entityId: input.route.id,
    title: input.summary,
    description: input.reason,
    metadata: {
      changeType: input.changeType,
      stopId: input.stopId,
      beforeValue: input.beforeValue,
      afterValue: input.afterValue,
    },
  });
}

export async function addLogisticsRouteStopWithReasonAction(input: {
  routeId: string;
  taskId: string;
  reason?: string;
}): Promise<ActionResult<LogisticsRouteRow>> {
  try {
    const session = await requireAppSession();
    if (!canManageRoutes(session)) throw new Error("FORBIDDEN");
    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");

    const route = await loadRouteById(supabase, session, input.routeId);
    if (routeIsClosedForOperationalEdits(route.status)) {
      return fail("No puedes modificar una ruta cerrada");
    }

    const isLive = routeAllowsLivePendingStopEdits(route.status);
    const reason = cleanReason(input.reason);
    if (isLive) {
      await requireLiveEditReason(reason);
    } else if (!routeAllowsNormalStopEdits(route.status)) {
      return fail("Solo puedes agregar tareas antes de completar la ruta");
    }

    const taskInputs = await loadTaskInputs(supabase, session, {
      excludeRouted: true,
      onlyCurrentStep: true,
    });
    const task = taskInputs.find((entry) => entry.taskId === input.taskId);
    if (!task) return fail("Tarea no disponible para asignar");

    const taskDate =
      (task.scheduledAt || task.windowStartAt || "").slice(0, 10) || "";
    if (taskDate !== route.routeDate) {
      return fail("La fecha de la tarea no coincide con la fecha de la ruta");
    }

    if (route.stops.some((stop) => stop.taskId === task.taskId && !stop.releasedAt)) {
      return ok(route);
    }

    const constraintError = await routeTaskConstraintError(supabase, session, route, task);
    if (constraintError) return fail(constraintError);

    const nextOrder = Math.max(0, ...route.stops.map((stop) => stop.order)) + 1;
    await insertStops(supabase, session, route.id, [task], nextOrder);
    const updated = await loadRouteById(supabase, session, route.id);
    const newStop = updated.stops.find((stop) => stop.taskId === task.taskId);

    if (isLive) {
      await auditLiveRouteChange({
        supabase,
        session,
        route: updated,
        changeType: "stop_added",
        reason,
        stopId: newStop?.id || null,
        beforeValue: { stopCount: route.stops.length },
        afterValue: { stopCount: updated.stops.length, taskId: task.taskId },
        summary: `Parada agregada: ${task.shipmentCode}`,
        idempotencyKey: `stop_added:${route.id}:${task.taskId}:${Date.now()}`,
      });
    }

    return ok(updated);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function cancelLogisticsRoutePendingStopAction(input: {
  routeId: string;
  stopId: string;
  reason: string;
}): Promise<ActionResult<LogisticsRouteRow>> {
  try {
    const session = await requireAppSession();
    if (!canManageRoutes(session)) throw new Error("FORBIDDEN");
    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");

    const route = await loadRouteById(supabase, session, input.routeId);
    const reason = cleanReason(input.reason);
    const isLive = routeAllowsLivePendingStopEdits(route.status);

    if (routeIsClosedForOperationalEdits(route.status)) {
      return fail("No puedes modificar una ruta cerrada");
    }
    if (!routeAllowsNormalStopEdits(route.status) && !isLive) {
      return fail("No puedes cancelar paradas en este estado de ruta");
    }
    if (isLive) {
      await requireLiveEditReason(reason);
    }

    const stop = route.stops.find((entry) => entry.id === input.stopId);
    if (!stop) return fail("Parada no encontrada");
    if (stop.outcome && !isStopOutcomeTransitionAllowed(stop.outcome, "cancelled")) {
      return fail("No puedes modificar una parada ya ejecutada");
    }

    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from("logistics_route_stops")
      .update({
        released_at: nowIso,
        release_reason: isLive ? "cancelled_while_in_progress" : "removed_before_departure",
        outcome: "cancelled",
        outcome_at: nowIso,
      })
      .eq("id", stop.id)
      .eq("organization_id", session.organizationId)
      .is("released_at", null);

    if (error) return fail(error.message);

    const [task] = await loadTaskRows(supabase, session, [stop.taskId]);
    if (task && route.assignedTo && task.assigned_to === route.assignedTo) {
      await supabase
        .from("shipment_logistics_tasks")
        .update({
          assigned_to: null,
          status: statusAfterRouteUnassign(task.status, task.scheduled_at),
          updated_at: nowIso,
        })
        .eq("id", task.id)
        .eq("organization_id", session.organizationId);
    }

    const updated = await loadRouteById(supabase, session, route.id);
    if (isLive) {
      await auditLiveRouteChange({
        supabase,
        session,
        route: updated,
        changeType: "stop_cancelled",
        reason,
        stopId: stop.id,
        beforeValue: { taskId: stop.taskId, outcome: stop.outcome },
        afterValue: { outcome: "cancelled" },
        summary: `Parada cancelada en ruta activa`,
        idempotencyKey: `stop_cancelled:${stop.id}:${nowIso}`,
      });
    }

    return ok(updated);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function reorderLogisticsRouteStopsWithReasonAction(input: {
  routeId: string;
  orderedStopIds: string[];
  reason?: string;
}): Promise<ActionResult<LogisticsRouteRow>> {
  try {
    const session = await requireAppSession();
    if (!canManageRoutes(session)) throw new Error("FORBIDDEN");
    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");

    const route = await loadRouteById(supabase, session, input.routeId);
    const reason = cleanReason(input.reason);
    const isLive = routeAllowsLivePendingStopEdits(route.status);

    if (routeIsClosedForOperationalEdits(route.status)) {
      return fail("No puedes modificar una ruta cerrada");
    }
    if (route.status === "draft") {
      // draft uses existing reorder without reason
    } else if (isLive) {
      await requireLiveEditReason(reason);
    } else if (!routeAllowsNormalStopEdits(route.status)) {
      return fail("Solo puedes reordenar paradas antes de completar la ruta");
    }

    const pendingStops = route.stops.filter((stop) => !stop.releasedAt && !stop.outcome);
    const completedStops = route.stops.filter((stop) => !stop.releasedAt && stop.outcome);
    if (completedStops.some((stop) => input.orderedStopIds.includes(stop.id))) {
      // reordering list may include only pending; completed keep relative positions
    }

    const pendingIds = new Set(pendingStops.map((stop) => stop.id));
    const orderedPending = input.orderedStopIds.filter((id) => pendingIds.has(id));
    if (orderedPending.length !== pendingStops.length) {
      return fail("El orden debe incluir todas las paradas pendientes");
    }

    let order = 1;
    for (const stop of completedStops.sort((a, b) => a.order - b.order)) {
      await supabase
        .from("logistics_route_stops")
        .update({ stop_order: order })
        .eq("id", stop.id)
        .eq("organization_id", session.organizationId);
      order += 1;
    }
    for (const stopId of orderedPending) {
      await supabase
        .from("logistics_route_stops")
        .update({ stop_order: order })
        .eq("id", stopId)
        .eq("organization_id", session.organizationId);
      order += 1;
    }

    const updated = await loadRouteById(supabase, session, route.id);
    if (isLive) {
      await auditLiveRouteChange({
        supabase,
        session,
        route: updated,
        changeType: "stop_reordered",
        reason,
        beforeValue: { order: pendingStops.map((stop) => stop.id) },
        afterValue: { order: orderedPending },
        summary: `Paradas reordenadas en ruta activa`,
        idempotencyKey: `stop_reordered:${route.id}:${orderedPending.join(",")}`,
      });
    }

    return ok(updated);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
