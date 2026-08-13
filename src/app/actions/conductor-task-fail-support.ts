import { formatConductorAdminActionNote } from "@/lib/conductor-tareas-view";
import type { ShipmentRow } from "@/lib/shipment-types";
import { conductorTaskTypeLabel, type ConductorDriverTask } from "@/lib/conductor-tasks";
import type { ConductorTaskFailureReason } from "@/lib/conductor-truck-inventory";
import { recordActivityHistory } from "@/lib/activity-history";
import type { AppSession } from "@/lib/auth/types";
import {
  CONDUCTOR_FAIL_INCOMPLETE_ERROR,
  resolveConductorFailOutcome,
  type ConductorFailAtomicPayload,
} from "@/lib/conductor-fail-idempotency";

import {
  conductorActionAudit,
  conductorActionAuditMetadata,
  type Admin,
  type Supabase,
} from "@/app/actions/conductor-tasks-shared";
import { recordInvoiceIncident } from "@/app/actions/conductor-task-result-support";

async function hasFailedActivityForTask(
  admin: Admin,
  session: AppSession,
  input: { shipmentId: string; taskId: string },
) {
  const { data, error } = await admin
    .from("activity_history")
    .select("id")
    .eq("organization_id", session.organizationId)
    .eq("entity_id", input.shipmentId)
    .eq("action", "shipment.logistics_task_failed")
    .contains("metadata", { taskId: input.taskId, status: "cancelled" })
    .limit(1);
  if (error) throw new Error(error.message);
  return Boolean(data?.length);
}

async function ensureConductorFailedHistory(input: {
  admin: Admin;
  session: AppSession;
  task: ConductorDriverTask;
  shipment: ShipmentRow;
  driverId: string;
  failureReason: ConductorTaskFailureReason | string;
  note: string;
  evidenceUrl: string;
}) {
  if (await hasFailedActivityForTask(input.admin, input.session, {
    shipmentId: input.shipment.id,
    taskId: input.task.id,
  })) {
    return;
  }

  const audit = conductorActionAudit(input.session, input.driverId);
  const fullNote = [input.failureReason, input.note].filter(Boolean).join(" - ");
  const auditedFullNote = formatConductorAdminActionNote(fullNote, audit);

  await recordActivityHistory(input.admin, input.session, {
    action: "shipment.logistics_task_failed",
    entityType: "shipment",
    entityId: input.shipment.id,
    title: `Tarea cancelada: ${input.shipment.code}`,
    description: `${conductorTaskTypeLabel[input.task.taskType]} - ${auditedFullNote}`,
    metadata: {
      shipmentCode: input.shipment.code,
      source: "conductor.tareas",
      taskId: input.task.id,
      taskType: input.task.taskType,
      status: "cancelled",
      driverId: input.driverId,
      failureReason: input.failureReason,
      note: input.note,
      evidenceUrl: input.evidenceUrl,
      cancelledAt: new Date().toISOString(),
      nextStep: "Reprogramar con Logística",
      ...conductorActionAuditMetadata(input.session, input.driverId),
    },
  });
}

/**
 * L-H5: post-commit effects after authoritative cancelled status.
 * Idempotent for replay / offline retry.
 */
export async function applyConductorFailedPostCommitEffects(input: {
  admin: Admin;
  session: AppSession;
  task: ConductorDriverTask;
  shipment: ShipmentRow;
  driverId: string;
  failureReason: ConductorTaskFailureReason | string;
  note: string;
  evidenceUrl: string;
}) {
  if (String(input.failureReason || "").includes("Invoice no visible")) {
    await recordInvoiceIncident(input.admin, input.session, {
      task: input.task,
      shipment: input.shipment,
      driverId: input.driverId,
      evidenceUrl: input.evidenceUrl,
    });
  }

  await ensureConductorFailedHistory(input);
}

/**
 * L-H5: atomic fail via fail_conductor_task_atomic.
 * Does not insert attempts before the RPC. Verifies persisted status=cancelled.
 */
export async function failTask(supabase: Supabase, session: AppSession, input: {
  task: ConductorDriverTask;
  shipment: ShipmentRow;
  driverId: string;
  failureReason: ConductorTaskFailureReason;
  note: string;
  evidenceUrl: string;
  clientOperationId: string;
  capturedAt?: string | null;
  invoiceVisible?: boolean;
}) {
  const audit = conductorActionAudit(session, input.driverId);
  const auditedFailure = formatConductorAdminActionNote(input.failureReason, audit);
  const auditedNote = formatConductorAdminActionNote(input.note, audit);

  const { data, error } = await supabase.rpc("fail_conductor_task_atomic", {
    p_organization_id: session.organizationId,
    p_task_id: input.task.id,
    p_driver_id: input.driverId,
    p_note: auditedNote,
    p_failure_reason: auditedFailure,
    p_evidence_url: input.evidenceUrl,
    p_client_operation_id: input.clientOperationId,
    p_captured_at: input.capturedAt || new Date().toISOString(),
    p_invoice_visible: Boolean(input.invoiceVisible),
    p_actor_id: session.userId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data: taskAfter, error: taskLookupError } = await supabase
    .from("shipment_logistics_tasks")
    .select("status")
    .eq("id", input.task.id)
    .eq("organization_id", session.organizationId)
    .maybeSingle();

  if (taskLookupError) {
    throw new Error(taskLookupError.message);
  }

  const outcome = resolveConductorFailOutcome({
    rpcResult: data as ConductorFailAtomicPayload,
    persistedTaskStatus: taskAfter?.status ?? null,
  });

  if (outcome === "incomplete_after_rpc") {
    throw new Error(CONDUCTOR_FAIL_INCOMPLETE_ERROR);
  }

  // History / invoice incident are post-commit only.
}
