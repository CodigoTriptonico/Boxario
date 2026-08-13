import { createScopedSupabase } from "@/lib/supabase/scoped";
import { recordActivityHistory } from "@/lib/activity-history";
import { logisticsScheduleWindowPatch } from "@/lib/logistics-schedule-window";
import { describeLogisticsAuditChange, describeLogisticsTaskOrdered, logisticsLegSnapshot, type ShipmentAuditContext } from "@/lib/shipment-audit";
import { applyScheduleChangeMetadata, describeScheduleAuditChange, detectLegScheduleChanges, hasLogisticsPlanChangeBesidesSchedule, scheduleAuditMetadata, scheduleAuditTitle, SHIPMENT_SCHEDULE_UPDATED_ACTION } from "@/lib/shipment-schedule-history";
import { shipmentMilestoneAuditPayload, type ShipmentMilestoneKey, type ShipmentMilestoneSource } from "@/lib/shipment-milestones";
import { buildUpdatedLogisticsPlan, logisticsTaskSyncPlan, type UpdateShipmentLogisticsPlanInput } from "@/lib/shipment-logistics-edit";
import {
  isLogisticsTaskReactivation,
  logisticsTaskCancelPatch,
  logisticsTaskOrderInsertPatch,
  logisticsTaskReactivatePatch,
} from "@/lib/shipment-logistics-task-timestamps";
import { syncShipmentStatusPatch } from "@/lib/shipment-display";
import { scheduledAtToLocalDateInput } from "@/lib/schedule-date";
import type { AppSession } from "@/lib/auth/types";
import type { ShipmentRow } from "@/lib/shipment-types";

import {
  SHIPMENT_SELECT,
  listShipmentById,
  mapShipment,
  type ShipmentDbRow,
} from "@/app/actions/shipments-data";

function planTaskMutationError(message: string) {
  const text = String(message || "").trim();
  if (/FORBIDDEN/i.test(text)) return "No tienes permiso para esta accion";
  if (/UNAUTHORIZED/i.test(text)) return "Sesion requerida";
  if (/TASK_TRANSITION_NOT_ALLOWED/i.test(text)) {
    return "No se puede cancelar o reprogramar esta tarea en su estado actual";
  }
  if (/violates|permission denied|PGRST|SQLSTATE|postgres/i.test(text)) {
    return "No se pudo actualizar la tarea de logistica";
  }
  return text || "No se pudo actualizar la tarea de logistica";
}

async function releaseActiveStopsForTask(
  supabase: NonNullable<Awaited<ReturnType<typeof createScopedSupabase>>>,
  session: AppSession,
  taskId: string,
  releaseReason: string,
) {
  const nowIso = new Date().toISOString();
  const { data: stops, error: listError } = await supabase
    .from("logistics_route_stops")
    .select("id, outcome")
    .eq("organization_id", session.organizationId)
    .eq("task_id", taskId)
    .is("released_at", null);

  if (listError) {
    return listError.message;
  }

  const releasableIds = (stops || [])
    .filter((stop) => stop.outcome !== "completed" && stop.outcome !== "failed")
    .map((stop) => stop.id);

  if (!releasableIds.length) {
    return null;
  }

  const { error } = await supabase
    .from("logistics_route_stops")
    .update({
      released_at: nowIso,
      release_reason: releaseReason,
      outcome: "cancelled",
      outcome_at: nowIso,
    })
    .eq("organization_id", session.organizationId)
    .in("id", releasableIds)
    .is("released_at", null);

  return error?.message || null;
}export async function recordShipmentMilestoneAudits(
  supabase: NonNullable<Awaited<ReturnType<typeof createScopedSupabase>>>,
  session: AppSession,
  shipment: Pick<ShipmentRow, "id" | "code" | "customer_name" | "country">,
  milestones: Array<{ key: ShipmentMilestoneKey; recordedAt: string }>,
  source: ShipmentMilestoneSource,
  context?: {
    previousStatus?: string;
    nextStatus?: string;
    taskId?: string;
    taskType?: string;
    audit?: ShipmentAuditContext;
  },
) {
  for (const milestone of milestones) {
    await recordActivityHistory(
      supabase,
      session,
      shipmentMilestoneAuditPayload({
        shipmentId: shipment.id,
        shipmentCode: shipment.code,
        milestone: milestone.key,
        recordedAt: milestone.recordedAt,
        source,
        customerName: shipment.customer_name,
        country: shipment.country,
        previousStatus: context?.previousStatus,
        nextStatus: context?.nextStatus,
        taskId: context?.taskId,
        taskType: context?.taskType,
        actorInteraction: context?.audit?.interaction,
        stepTitle: context?.audit?.stepTitle || null,
        stepKind: context?.audit?.stepKind || null,
      }),
    );
  }
}

async function persistShipmentStatusSync(
  supabase: NonNullable<Awaited<ReturnType<typeof createScopedSupabase>>>,
  session: AppSession,
  shipment: ShipmentRow,
): Promise<ShipmentRow> {
  const statusPatch = syncShipmentStatusPatch(shipment);

  if (!statusPatch.status || statusPatch.status === shipment.status) {
    return shipment;
  }

  const { data, error } = await supabase
    .from("shipments")
    .update({ status: statusPatch.status })
    .eq("id", shipment.id)
    .eq("organization_id", session.organizationId)
    .select(SHIPMENT_SELECT)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "No se pudo sincronizar el estado del envío");
  }

  return mapShipment(data as unknown as ShipmentDbRow);
}

export { canManageRoutes } from "@/lib/auth/permissions";

type PersistLogisticsPlanResult =
  | { ok: true; shipment: ShipmentRow }
  | { ok: false; error: string };

export async function persistShipmentLogisticsPlanUpdate(
  supabase: NonNullable<Awaited<ReturnType<typeof createScopedSupabase>>>,
  session: AppSession,
  shipment: ShipmentRow,
  input: UpdateShipmentLogisticsPlanInput,
  audit?: ShipmentAuditContext,
): Promise<PersistLogisticsPlanResult> {
  const beforePlan = { ...(shipment.logistics_plan || {}) };
  const { logisticsPlan: rawLogisticsPlan, deliveryNotes } = buildUpdatedLogisticsPlan(shipment, input);
  const actorName = session.fullName || session.email;
  const changedAt = new Date().toISOString();
  const scheduleChanges = detectLegScheduleChanges(beforePlan, rawLogisticsPlan);
  const logisticsPlan = applyScheduleChangeMetadata(
    beforePlan,
    rawLogisticsPlan,
    actorName,
    changedAt,
  );
  const nonScheduleChange = hasLogisticsPlanChangeBesidesSchedule(beforePlan, logisticsPlan);
  const taskSync = logisticsTaskSyncPlan(shipment, input);
  const orderedTaskEvents: Array<{
    taskType: "deliver_empty_box" | "pickup_full_box";
    orderedAt: string;
    scheduleMode: string;
    scheduleAt: string | null;
  }> = [];

  for (const spec of taskSync) {
    if (!spec.existing) {
      if (spec.needed) {
        const orderedAt = new Date().toISOString();
        const { error } = await supabase.from("shipment_logistics_tasks").insert({
          organization_id: session.organizationId,
          shipment_id: shipment.id,
          task_type: spec.taskType,
          status: spec.scheduleMode === "scheduled" && spec.scheduleAt ? "scheduled" : "pending",
          ...logisticsScheduleWindowPatch(spec.scheduleAt),
          notes: String(shipment.logistics_plan?.notes || ""),
          ...logisticsTaskOrderInsertPatch(orderedAt),
        });

        if (error) {
          return { ok: false, error: error.message };
        }

        orderedTaskEvents.push({
          taskType: spec.taskType,
          orderedAt,
          scheduleMode: spec.scheduleMode,
          scheduleAt: spec.scheduleAt,
        });
      }

      continue;
    }

    if (!spec.needed) {
      if (spec.existing.status !== "completed" && spec.existing.status !== "cancelled") {
        const releaseError = await releaseActiveStopsForTask(
          supabase,
          session,
          spec.existing.id,
          "task_cancelled_from_plan",
        );
        if (releaseError) {
          return { ok: false, error: planTaskMutationError(releaseError) };
        }

        const { error } = await supabase
          .from("shipment_logistics_tasks")
          .update({
            status: "cancelled",
            assigned_to: null,
            updated_at: new Date().toISOString(),
            ...logisticsTaskCancelPatch(),
            ...logisticsScheduleWindowPatch(null),
          })
          .eq("id", spec.existing.id)
          .eq("organization_id", session.organizationId);

        if (error) {
          return { ok: false, error: planTaskMutationError(error.message) };
        }
      }

      const nowIso = new Date().toISOString();
      const { error: rejectBookingError } = await supabase
        .from("customer_route_assignment_requests")
        .update({
          status: "rejected",
          review_note: "Tarea cancelada desde Seguimiento",
          reviewed_at: nowIso,
          reviewed_by: session.userId,
          updated_at: nowIso,
        })
        .eq("organization_id", session.organizationId)
        .eq("task_id", spec.existing.id)
        .eq("status", "pending");

      if (rejectBookingError) {
        return { ok: false, error: planTaskMutationError(rejectBookingError.message) };
      }

      continue;
    }

    if (spec.existing.status === "completed") {
      continue;
    }

    const nextStatus =
      spec.scheduleMode === "scheduled" && spec.scheduleAt ? "scheduled" : "pending";
    const reactivating = isLogisticsTaskReactivation(spec.existing);
    const orderedAt = reactivating ? new Date().toISOString() : spec.existing.orderedAt;
    const previousDate = scheduledAtToLocalDateInput(spec.existing.scheduledAt);
    const nextDate = scheduledAtToLocalDateInput(spec.scheduleAt);
    const dateChanged = Boolean(previousDate && nextDate && previousDate !== nextDate);
    const shouldReleaseStops = reactivating || dateChanged;

    if (shouldReleaseStops) {
      const releaseError = await releaseActiveStopsForTask(
        supabase,
        session,
        spec.existing.id,
        reactivating ? "task_reactivated" : "task_date_changed",
      );
      if (releaseError) {
        return { ok: false, error: planTaskMutationError(releaseError) };
      }
    }

    const { error } = await supabase
      .from("shipment_logistics_tasks")
      .update({
        status: nextStatus,
        ...(shouldReleaseStops ? { assigned_to: null } : {}),
        ...logisticsScheduleWindowPatch(spec.scheduleAt),
        updated_at: new Date().toISOString(),
        ...(reactivating ? logisticsTaskReactivatePatch(orderedAt as string) : {}),
      })
      .eq("id", spec.existing.id)
      .eq("organization_id", session.organizationId);

    if (error) {
      return { ok: false, error: planTaskMutationError(error.message) };
    }

    if (reactivating && orderedAt) {
      orderedTaskEvents.push({
        taskType: spec.taskType,
        orderedAt,
        scheduleMode: spec.scheduleMode,
        scheduleAt: spec.scheduleAt,
      });
    }
  }

  const { error: updateError } = await supabase.rpc("update_shipment_logistics_plan_atomic", {
    p_shipment_id: shipment.id,
    p_logistics_plan: logisticsPlan,
    p_delivery_notes: deliveryNotes,
  });

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  const pickupRequested = taskSync.some(
    (spec) => spec.taskType === "pickup_full_box" && spec.needed,
  );
  if (pickupRequested) {
    const { error: latePickupError } = await supabase.rpc("apply_late_pickup_fee", {
      p_shipment_id: shipment.id,
    });

    if (latePickupError) {
      return { ok: false, error: latePickupError.message };
    }
  }

  if (nonScheduleChange) {
    await recordActivityHistory(supabase, session, {
      action: "shipment.logistics_plan_updated",
      entityType: "shipment",
      entityId: shipment.id,
      title: `Logística · ${shipment.code}`,
      description: audit
        ? describeLogisticsAuditChange({
            before: beforePlan,
            after: logisticsPlan,
            interaction: audit.interaction,
            stepTitle: audit.stepTitle,
          })
        : deliveryNotes,
      metadata: {
        shipmentCode: shipment.code,
        source: audit?.source || "envios",
        interaction: audit?.interaction || null,
        stepTitle: audit?.stepTitle || null,
        stepKind: audit?.stepKind || null,
        before: {
          emptyBox: logisticsLegSnapshot(beforePlan, "emptyBox"),
          fullBox: logisticsLegSnapshot(beforePlan, "fullBox"),
        },
        after: {
          emptyBox: logisticsLegSnapshot(logisticsPlan, "emptyBox"),
          fullBox: logisticsLegSnapshot(logisticsPlan, "fullBox"),
        },
        deliveryNotes,
      },
    });
  }

  for (const change of scheduleChanges) {
    await recordActivityHistory(supabase, session, {
      action: SHIPMENT_SCHEDULE_UPDATED_ACTION,
      entityType: "shipment",
      entityId: shipment.id,
      title: scheduleAuditTitle(shipment.code),
      description: describeScheduleAuditChange({
        beforeScheduleAt: change.beforeScheduleAt,
        afterScheduleAt: change.afterScheduleAt,
        stepTitle: audit?.stepTitle || change.stepTitle,
      }),
      metadata: scheduleAuditMetadata({
        shipmentCode: shipment.code,
        change,
        source: audit?.source || "envios",
        interaction: audit?.interaction || null,
        stepTitle: audit?.stepTitle || change.stepTitle,
        stepKind: audit?.stepKind || change.stepKind,
      }),
    });
  }

  for (const event of orderedTaskEvents) {
    await recordActivityHistory(supabase, session, {
      action: "shipment.logistics_task_ordered",
      entityType: "shipment",
      entityId: shipment.id,
      title: `Orden logística · ${shipment.code}`,
      description: describeLogisticsTaskOrdered({
        taskType: event.taskType,
        orderedAt: event.orderedAt,
        scheduleMode: event.scheduleMode,
        scheduleAt: event.scheduleAt,
        interaction: audit?.interaction || "context_menu",
        stepTitle: audit?.stepTitle,
      }),
      metadata: {
        shipmentCode: shipment.code,
        taskType: event.taskType,
        orderedAt: event.orderedAt,
        scheduleMode: event.scheduleMode,
        scheduleAt: event.scheduleAt,
        source: audit?.source || "envios",
        interaction: audit?.interaction || null,
        stepTitle: audit?.stepTitle || null,
        stepKind: audit?.stepKind || null,
      },
    });
  }

  const reloaded = await listShipmentById(supabase, session, shipment.id);
  if (!reloaded) {
    return { ok: false, error: "No se pudo recargar el envío" };
  }

  const synced = await persistShipmentStatusSync(supabase, session, reloaded);
  return { ok: true, shipment: synced };
}

export async function promoteDueScheduledLegsForListedShipments(
  _supabase: NonNullable<Awaited<ReturnType<typeof createScopedSupabase>>>,
  _session: AppSession,
  shipments: ShipmentRow[],
): Promise<ShipmentRow[]> {
  return shipments;
}
