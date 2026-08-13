"use server";

import { revalidatePath } from "next/cache";
import { requireAppSession } from "@/lib/auth/session";
import { createScopedSupabase } from "@/lib/supabase/scoped";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
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
