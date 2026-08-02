"use server";

import { randomUUID } from "node:crypto";
import { requireAppSession } from "@/lib/auth/session";
import { createScopedSupabase } from "@/lib/supabase/scoped";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import { logisticsScheduleWindowPatch } from "@/lib/logistics-schedule-window";
import { assertSameOrgProfileIds, assertSameOrgWarehouseIds } from "@/lib/security/org-scope";
import {
  assertLogisticsTaskTransition,
  isLogisticsTaskTransitionAllowed,
} from "@/lib/logistics-state-machine";
import { scheduledAtToLocalDateInput } from "@/lib/schedule-date";
import type { AppSession } from "@/lib/auth/types";
import type {
  LogisticsTaskStatus,
  ShipmentLogisticsTaskRow,
  ShipmentRow,
} from "@/lib/shipment-types";

import {
  listShipmentById,
  mapTask,
  type LogisticsTaskDbRow,
} from "@/app/actions/shipments-data";
import { canManageRoutes } from "@/app/actions/shipments-state";

type ScopedSupabase = NonNullable<Awaited<ReturnType<typeof createScopedSupabase>>>;
type LogisticsTaskMutationInput = {
  taskId: string;
  assignedTo?: string | null;
  warehouseId?: string | null;
};

function updateLogisticsTaskErrorMessage(code: string) {
  const message = code || "";
  if (/UNAUTHORIZED/i.test(message)) return "No autenticado";
  if (/FORBIDDEN/i.test(message)) return "No tienes permiso";
  if (/TASK_NOT_FOUND/i.test(message)) return "Tarea no encontrada";
  if (/SHIPMENT_NOT_FOUND/i.test(message)) return "Invoice no encontrado";
  if (/TASK_TRANSITION_NOT_ALLOWED/i.test(message)) {
    return message
      .replace(/^ERROR:\s*/i, "")
      .replace(/^TASK_TRANSITION_NOT_ALLOWED:\s*/i, "Transicion de tarea no permitida: ");
  }
  if (/WAREHOUSE_LOCKED_AFTER_STOCK/i.test(message)) {
    return "No puedes cambiar bodega despues de descontar stock";
  }
  if (/WAREHOUSE_REQUIRED_FOR_STOCK|WAREHOUSE_NOT_FOUND/i.test(message)) {
    return "Selecciona una bodega valida";
  }
  if (/Stock insuficiente|No hay stock registrado|EMPTY_BOX/i.test(message)) {
    return message.replace(/^ERROR:\s*/i, "").replace(/\s+CONTEXT:[\s\S]*$/i, "");
  }
  if (/OPERATION_KEY_PAYLOAD_MISMATCH/i.test(message)) {
    return "La misma operacion se reintento con datos distintos";
  }
  if (/OPERATION_KEY_REQUIRED/i.test(message)) return "Falta la clave de operacion";
  return (
    message.replace(/^ERROR:\s*/i, "").replace(/\s+CONTEXT:[\s\S]*$/i, "") ||
    "No se pudo actualizar la tarea"
  );
}

function taskFromAtomicResult(
  result: Record<string, unknown>,
  fallback: ShipmentLogisticsTaskRow,
): ShipmentLogisticsTaskRow {
  const scheduleConfirmation = result.scheduleConfirmationStatus;
  return {
    ...fallback,
    id: String(result.taskId || fallback.id),
    shipmentId: String(result.shipmentId || fallback.shipmentId),
    taskType: (result.taskType as ShipmentLogisticsTaskRow["taskType"]) || fallback.taskType,
    status: (result.status as LogisticsTaskStatus) || fallback.status,
    assignedTo: (result.assignedTo as string | null | undefined) ?? null,
    scheduledAt: (result.scheduledAt as string | null | undefined) ?? null,
    requestedScheduleAt: (result.requestedScheduleAt as string | null | undefined) ?? null,
    scheduleConfirmationStatus:
      scheduleConfirmation === "pending" || scheduleConfirmation === "confirmed"
        ? scheduleConfirmation
        : fallback.scheduleConfirmationStatus || "confirmed",
    scheduleKind: (result.scheduleKind as ShipmentLogisticsTaskRow["scheduleKind"]) || null,
    windowStartAt: (result.windowStartAt as string | null | undefined) ?? null,
    windowEndAt: (result.windowEndAt as string | null | undefined) ?? null,
    warehouseId: (result.warehouseId as string | null | undefined) ?? null,
    notes: String(result.notes ?? fallback.notes ?? ""),
    stockDeductedAt: (result.stockDeductedAt as string | null | undefined) ?? null,
    completedAt: (result.completedAt as string | null | undefined) ?? null,
    orderedAt: (result.orderedAt as string | null | undefined) ?? null,
    assignedAt: (result.assignedAt as string | null | undefined) ?? null,
    loadedAt: (result.loadedAt as string | null | undefined) ?? null,
    createdAt: fallback.createdAt,
  };
}

async function loadLogisticsTaskMutationContext(
  supabase: ScopedSupabase,
  session: AppSession,
  input: LogisticsTaskMutationInput,
  validateTask?: (task: ShipmentLogisticsTaskRow) => string | null,
): Promise<
  | {
      ok: true;
      task: ShipmentLogisticsTaskRow;
      shipment: ShipmentRow;
    }
  | { ok: false; error: string }
> {
  const { data: taskData, error: taskError } = await supabase
    .from("shipment_logistics_tasks")
    .select("*")
    .eq("id", input.taskId)
    .eq("organization_id", session.organizationId)
    .single();

  if (taskError || !taskData) {
    return { ok: false, error: taskError?.message || "Tarea no encontrada" };
  }

  const task = mapTask(taskData as LogisticsTaskDbRow);
  const validationError = validateTask?.(task);
  if (validationError) {
    return { ok: false, error: validationError };
  }

  const shipment = await listShipmentById(supabase, session, task.shipmentId);
  if (!shipment) {
    return { ok: false, error: "Invoice no encontrado" };
  }

  if (input.assignedTo) {
    await assertSameOrgProfileIds(supabase, session.organizationId, [input.assignedTo]);
  }

  if (input.warehouseId) {
    await assertSameOrgWarehouseIds(supabase, session.organizationId, [input.warehouseId]);
  }

  return { ok: true, task, shipment };
}

function resolveClientOperationId(value?: string) {
  if (
    value &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
  ) {
    return value;
  }
  return randomUUID();
}

export async function updateLogisticsTaskAction(input: {
  taskId: string;
  status?: LogisticsTaskStatus;
  assignedTo?: string | null;
  scheduledAt?: string | null;
  warehouseId?: string | null;
  notes?: string;
  clientOperationId?: string;
}): Promise<ActionResult<ShipmentLogisticsTaskRow>> {
  try {
    const session = await requireAppSession();

    if (!canManageRoutes(session)) {
      throw new Error("FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const context = await loadLogisticsTaskMutationContext(supabase, session, input);
    if (!context.ok) {
      return fail(context.error);
    }
    const { task } = context;

    if (input.status && input.status !== task.status) {
      if (!isLogisticsTaskTransitionAllowed(task.status, input.status)) {
        return fail(`Transicion de tarea no permitida: ${task.status} → ${input.status}`);
      }
    }

    if (
      input.warehouseId !== undefined &&
      task.stockDeductedAt &&
      input.warehouseId !== task.warehouseId
    ) {
      return fail("No puedes cambiar bodega despues de descontar stock");
    }

    const changes: Record<string, unknown> = {};

    if (input.status !== undefined) {
      changes.status = input.status;
    }
    if (input.assignedTo !== undefined) {
      changes.assignedTo = input.assignedTo;
    }
    if (input.warehouseId !== undefined) {
      changes.warehouseId = input.warehouseId;
    }
    if (input.notes !== undefined) {
      changes.notes = input.notes;
    }

    if (input.scheduledAt !== undefined) {
      const schedulePatch = logisticsScheduleWindowPatch(input.scheduledAt);
      changes.schedule = input.scheduledAt
        ? {
            scheduledAt: schedulePatch.scheduled_at,
            requestedScheduleAt: schedulePatch.requested_schedule_at,
            scheduleConfirmationStatus: schedulePatch.schedule_confirmation_status,
            scheduleKind: schedulePatch.schedule_kind,
            windowStartAt: schedulePatch.window_start_at,
            windowEndAt: schedulePatch.window_end_at,
          }
        : null;

      const previousDate = scheduledAtToLocalDateInput(task.scheduledAt);
      const nextDate = scheduledAtToLocalDateInput(input.scheduledAt);
      if (previousDate && nextDate && previousDate !== nextDate) {
        changes.releaseStopsReason = "task_date_changed";
        if (input.assignedTo === undefined) {
          changes.assignedTo = null;
        }
      }
    }

    const { data, error } = await supabase.rpc("update_logistics_task_atomic", {
      p_task_id: input.taskId,
      p_client_operation_id: resolveClientOperationId(input.clientOperationId),
      p_changes: changes,
    });

    if (error) {
      return fail(updateLogisticsTaskErrorMessage(error.message));
    }

    return ok(taskFromAtomicResult((data || {}) as Record<string, unknown>, task));
  } catch (error) {
    return fail(updateLogisticsTaskErrorMessage(actionErrorMessage(error)));
  }
}

export async function reactivateLogisticsTaskAction(input: {
  taskId: string;
  scheduledAt?: string | null;
  assignedTo?: string | null;
  warehouseId?: string | null;
  notes?: string;
  clientOperationId?: string;
}): Promise<ActionResult<ShipmentLogisticsTaskRow>> {
  try {
    const session = await requireAppSession();

    if (!canManageRoutes(session)) {
      throw new Error("FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const context = await loadLogisticsTaskMutationContext(
      supabase,
      session,
      input,
      (task) =>
        task.status === "cancelled"
          ? null
          : "Solo puedes reprogramar tareas canceladas",
    );
    if (!context.ok) {
      return fail(context.error);
    }
    const { task } = context;

    if (
      input.warehouseId !== undefined &&
      task.stockDeductedAt &&
      input.warehouseId !== task.warehouseId
    ) {
      return fail("No puedes cambiar bodega despues de descontar stock");
    }

    const scheduledAt =
      input.scheduledAt !== undefined ? input.scheduledAt : task.scheduledAt;
    const nextStatus = scheduledAt ? "scheduled" : "pending";

    if (!isLogisticsTaskTransitionAllowed(task.status, nextStatus as LogisticsTaskStatus)) {
      assertLogisticsTaskTransition(task.status, nextStatus as LogisticsTaskStatus);
    }

    const schedulePatch = logisticsScheduleWindowPatch(scheduledAt);

    const { data, error } = await supabase.rpc("update_logistics_task_atomic", {
      p_task_id: input.taskId,
      p_client_operation_id: resolveClientOperationId(input.clientOperationId),
      p_changes: {
        status: nextStatus,
        assignedTo: null,
        warehouseId:
          input.warehouseId !== undefined ? input.warehouseId : task.warehouseId,
        notes: input.notes !== undefined ? input.notes : task.notes,
        releaseStopsReason: "task_reactivated",
        schedule: scheduledAt
          ? {
              scheduledAt: schedulePatch.scheduled_at,
              requestedScheduleAt: schedulePatch.requested_schedule_at,
              scheduleConfirmationStatus: schedulePatch.schedule_confirmation_status,
              scheduleKind: schedulePatch.schedule_kind,
              windowStartAt: schedulePatch.window_start_at,
              windowEndAt: schedulePatch.window_end_at,
            }
          : null,
      },
    });

    if (error) {
      return fail(updateLogisticsTaskErrorMessage(error.message));
    }

    return ok(taskFromAtomicResult((data || {}) as Record<string, unknown>, task));
  } catch (error) {
    return fail(updateLogisticsTaskErrorMessage(actionErrorMessage(error)));
  }
}
