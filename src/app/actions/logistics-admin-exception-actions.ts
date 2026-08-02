"use server";

import { revalidatePath } from "next/cache";
import { requireAppSession } from "@/lib/auth/session";
import { createScopedSupabase } from "@/lib/supabase/scoped";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import { sessionHasPermission } from "@/lib/auth/permissions";
import { canManageRoutes } from "@/app/actions/logistics-routes-shared";

function cleanReason(value: unknown) {
  return String(value || "").trim().slice(0, 500);
}

function exceptionErrorMessage(code: string) {
  switch (code) {
    case "FORBIDDEN":
      return "No tienes permiso para excepciones administrativas";
    case "ADMIN_EXCEPTION_REASON_REQUIRED":
      return "Indica un motivo de al menos 3 caracteres";
    case "ADMIN_EXCEPTION_RISK_ACK_REQUIRED":
      return "Debes confirmar que entiendes el riesgo";
    case "TASK_NOT_FOUND":
      return "Tarea no encontrada";
    case "TASK_ALREADY_COMPLETED":
      return "La tarea ya esta completada";
    case "TASK_CANCELLED":
      return "No puedes completar una tarea cancelada por esta via";
    case "ADMIN_EXCEPTION_REQUIRES_ROUTE_CONTEXT":
      return "La excepcion solo aplica a tareas con ruta asignada";
    case "ADMIN_EXCEPTION_NOT_NEEDED_ROUTE_ACTIVE":
      return "La ruta ya esta en curso; usa el flujo normal del conductor";
    default:
      return code || "No se pudo aplicar la excepcion";
  }
}

export type AdminTaskExceptionResult = {
  taskId: string;
  exceptionId: string;
  previousStatus: string;
  newStatus: string;
  routeId: string;
  routeStatus: string;
  skippedTransition: string;
};

export async function adminCompleteLogisticsTaskExceptionAction(input: {
  taskId: string;
  reason: string;
  riskAcknowledged: boolean;
}): Promise<ActionResult<AdminTaskExceptionResult>> {
  try {
    const session = await requireAppSession();
    if (!canManageRoutes(session)) {
      throw new Error("FORBIDDEN");
    }

    const reason = cleanReason(input.reason);
    if (reason.length < 3) {
      return fail("Indica un motivo de al menos 3 caracteres");
    }
    if (!input.riskAcknowledged) {
      return fail("Debes confirmar que entiendes el riesgo");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const { data, error } = await supabase.rpc("admin_complete_logistics_task_exception", {
      p_task_id: input.taskId,
      p_reason: reason,
      p_risk_acknowledged: true,
    });

    if (error) {
      return fail(exceptionErrorMessage(error.message));
    }

    const payload = (data || {}) as Record<string, unknown>;
    revalidatePath("/logistica");
    revalidatePath("/seguimiento");
    revalidatePath("/conductor/tareas");

    return ok({
      taskId: String(payload.taskId || input.taskId),
      exceptionId: String(payload.exceptionId || ""),
      previousStatus: String(payload.previousStatus || ""),
      newStatus: String(payload.newStatus || "completed"),
      routeId: String(payload.routeId || ""),
      routeStatus: String(payload.routeStatus || ""),
      skippedTransition: String(payload.skippedTransition || ""),
    });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export type InventoryMissingShipmentRefRow = {
  movementId: string;
  warehouseId: string | null;
  itemId: string | null;
  itemName: string;
  qty: number;
  note: string;
  referenceType: string | null;
  referenceId: string | null;
  movementKey: string | null;
  createdAt: string;
  reviewStatus: string;
  linkedShipmentId: string | null;
};

export async function listInventoryMovementsMissingShipmentRefsAction(
  limit = 200,
): Promise<ActionResult<InventoryMissingShipmentRefRow[]>> {
  try {
    const session = await requireAppSession();
    if (
      !sessionHasPermission(session, "inventory.view") &&
      !sessionHasPermission(session, "inventory.adjust") &&
      !sessionHasPermission(session, "settings.manage")
    ) {
      throw new Error("FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const { data, error } = await supabase.rpc("list_inventory_movements_missing_shipment_refs", {
      p_limit: limit,
    });

    if (error) {
      return fail(error.message);
    }

    return ok(
      (data || []).map((row: Record<string, unknown>) => ({
        movementId: String(row.movement_id),
        warehouseId: row.warehouse_id ? String(row.warehouse_id) : null,
        itemId: row.item_id ? String(row.item_id) : null,
        itemName: String(row.item_name || ""),
        qty: Number(row.qty || 0),
        note: String(row.note || ""),
        referenceType: row.reference_type ? String(row.reference_type) : null,
        referenceId: row.reference_id ? String(row.reference_id) : null,
        movementKey: row.movement_key ? String(row.movement_key) : null,
        createdAt: String(row.created_at || ""),
        reviewStatus: String(row.review_status || "needs_manual_review"),
        linkedShipmentId: row.linked_shipment_id ? String(row.linked_shipment_id) : null,
      })),
    );
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function backfillInventoryShipmentRefsUnambiguousAction(
  dryRun = true,
): Promise<ActionResult<{ dryRun: boolean; linkedCount: number; skipped: number }>> {
  try {
    const session = await requireAppSession();
    if (
      !sessionHasPermission(session, "inventory.adjust") &&
      !sessionHasPermission(session, "settings.manage")
    ) {
      throw new Error("FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const { data, error } = await supabase.rpc("backfill_inventory_shipment_refs_unambiguous", {
      p_dry_run: dryRun,
    });

    if (error) {
      return fail(error.message);
    }

    const payload = (data || {}) as Record<string, unknown>;
    revalidatePath("/inventario");
    return ok({
      dryRun: Boolean(payload.dryRun),
      linkedCount: Number(payload.linkedCount || 0),
      skipped: Number(payload.skippedAmbiguousOrUnmatched || 0),
    });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
