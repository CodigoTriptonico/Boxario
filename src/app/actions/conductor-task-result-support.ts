import { formatConductorAdminActionNote, formatConductorAdminActorDescription } from "@/lib/conductor-tareas-view";
import type { ShipmentRow } from "@/lib/shipment-types";
import { conductorTaskTypeLabel, type ConductorDriverTask } from "@/lib/conductor-tasks";
import {
  hasDeliverEventForTaskLine,
  hasPickupReturnEventForTaskLine,
  LOGISTICS_TASK_EVIDENCE_BUCKET,
  validateConductorTruckDeliver,
} from "@/lib/conductor-truck-inventory";
import { createStorageSignedUrl } from "@/lib/supabase/storage-url";
import { recordActivityHistory } from "@/lib/activity-history";
import { decodeAndSanitizeImage } from "@/lib/security/safe-image";
import { parseMoneyValue } from "@/lib/logistics-fees";
import { readBillingFromPlan } from "@/lib/invoice-billing";
import { conductorCollectionAuditDescription, settleConductorPayment, type ConductorPaymentOutcome } from "@/lib/conductor-driver-payment";
import { type PaymentMethod } from "@/lib/payment-methods";
import { quoteFromShipment, syncShipmentStatusPatch } from "@/lib/shipment-display";
import { physicalPackageCodesForShipment } from "@/lib/physical-packages";
import { invoiceBoxCode } from "@/lib/invoice-child-codes";
import { buildFirstMilestonePatch, milestoneKeyForLogisticsTask, readShipmentMilestones } from "@/lib/shipment-milestones";
import type { AppSession } from "@/lib/auth/types";
import {
  CONDUCTOR_COMPLETE_INCOMPLETE_ERROR,
  buildConductorCompleteShipmentPatch,
  resolveConductorCompleteOutcome,
  type ConductorCompleteAtomicPayload,
} from "@/lib/conductor-complete-idempotency";

import {
  EVIDENCE_MAX_BYTES,
  EVIDENCE_TYPES,
  conductorActionAudit,
  conductorActionAuditMetadata,
  findInventoryLine,
  insertFullBoxCollectionEvent,
  insertTruckEvent,
  loadTruckEvents,
  loadTruckInventoryView,
  requireTruckVehicleId,
  type Admin,
  type Supabase,
} from "@/app/actions/conductor-tasks-shared";

export async function uploadEvidence(
  admin: Admin,
  session: AppSession,
  taskId: string,
  clientOperationId: string,
  file: File | null,
) {
  if (!file || !file.name || file.size <= 0) {
    return "";
  }

  if (file.size > EVIDENCE_MAX_BYTES) {
    throw new Error("Foto maxima: 8MB");
  }

  if (!EVIDENCE_TYPES.has(file.type)) {
    throw new Error("Foto debe ser JPG, PNG o WebP");
  }

  const safeImage = await decodeAndSanitizeImage(file, { maxBytes: EVIDENCE_MAX_BYTES });
  const safeOperationId = clientOperationId.replace(/[^a-zA-Z0-9-]/g, "");
  const path = `${session.organizationId}/${taskId}/${safeOperationId}.${safeImage.extension}`;
  const { error } = await admin.storage.from(LOGISTICS_TASK_EVIDENCE_BUCKET).upload(path, safeImage.bytes, {
    contentType: safeImage.contentType,
    upsert: false,
  });

  if (error && !/already exists|duplicate/i.test(error.message)) {
    throw new Error(error.message);
  }

  const signed = await createStorageSignedUrl(admin, LOGISTICS_TASK_EVIDENCE_BUCKET, path, {
    ownerId: session.organizationId,
  });
  return signed || path;
}

async function ensureShipmentPackages(
  admin: Admin,
  session: AppSession,
  shipment: ShipmentRow,
) {
  const rows = physicalPackageCodesForShipment(shipment.code, shipment.logistics_plan).map((code, index) => ({
    organization_id: session.organizationId,
    shipment_id: shipment.id,
    code,
    country: shipment.country || "",
    invoice_code: invoiceBoxCode(shipment.code, index),
    invoice_created_by: session.userId,
    invoice_paid_by: shipment.invoice_status === "paid" ? session.userId : null,
  }));

  const { error } = await admin
    .from("shipment_packages")
    .upsert(rows, { onConflict: "organization_id,code", ignoreDuplicates: true });

  if (error) throw new Error(error.message);
}

async function recordInvoiceEvidence(admin: Admin, session: AppSession, input: {
  task: ConductorDriverTask;
  shipment: ShipmentRow;
  driverId: string;
  evidenceUrl: string;
}) {
  await ensureShipmentPackages(admin, session, input.shipment);

  const { data: existingPackages, error: existingError } = await admin
    .from("shipment_packages")
    .select("invoice_marked_at, invoice_pickup_confirmed_at, invoice_delivery_evidence_url, invoice_pickup_evidence_url")
    .eq("organization_id", session.organizationId)
    .eq("shipment_id", input.shipment.id)
    .limit(1);

  if (existingError) throw new Error(existingError.message);

  const existing = existingPackages?.[0];
  const alreadyConfirmed = input.task.taskType === "deliver_empty_box"
    ? Boolean(existing?.invoice_marked_at)
    : Boolean(existing?.invoice_pickup_confirmed_at);

  // L-H2: idempotent post-commit — do not emit a second "confirmed" history on replay/retry.
  if (alreadyConfirmed) {
    if (!input.evidenceUrl) {
      return;
    }
    const evidenceField = input.task.taskType === "deliver_empty_box"
      ? "invoice_delivery_evidence_url"
      : "invoice_pickup_evidence_url";
    const currentUrl = input.task.taskType === "deliver_empty_box"
      ? existing?.invoice_delivery_evidence_url
      : existing?.invoice_pickup_evidence_url;
    if (currentUrl) {
      return;
    }
    const { error: evidenceOnlyError } = await admin
      .from("shipment_packages")
      .update({ [evidenceField]: input.evidenceUrl })
      .eq("organization_id", session.organizationId)
      .eq("shipment_id", input.shipment.id);
    if (evidenceOnlyError) throw new Error(evidenceOnlyError.message);
    return;
  }

  if (!input.evidenceUrl) {
    return;
  }

  const now = new Date().toISOString();
  const commonPatch = {
    invoice_incident_at: null,
    invoice_incident_reason: "",
  };
  const patch = input.task.taskType === "deliver_empty_box"
    ? {
        ...commonPatch,
        invoice_marked_at: now,
        invoice_marked_by: input.driverId,
        invoice_delivery_evidence_url: input.evidenceUrl,
      }
    : {
        ...commonPatch,
        invoice_marked_at: now,
        invoice_marked_by: input.driverId,
        invoice_pickup_confirmed_at: now,
        invoice_pickup_confirmed_by: input.driverId,
        invoice_pickup_evidence_url: input.evidenceUrl,
      };

  const { error } = await admin
    .from("shipment_packages")
    .update(patch)
    .eq("organization_id", session.organizationId)
    .eq("shipment_id", input.shipment.id);

  if (error) throw new Error(error.message);

  await recordActivityHistory(admin, session, {
    action: input.task.taskType === "deliver_empty_box"
      ? "shipment.invoice_box_delivery_confirmed"
      : "shipment.invoice_box_pickup_confirmed",
    entityType: "shipment",
    entityId: input.shipment.id,
    title: input.task.taskType === "deliver_empty_box"
      ? "Invoice escrito en caja confirmado"
      : "Invoice en caja confirmado al recoger",
    description: `${input.shipment.code}: foto de evidencia con invoice visible.`,
    metadata: {
      source: "conductor.tareas",
      taskId: input.task.id,
      taskType: input.task.taskType,
      evidenceUrl: input.evidenceUrl,
      invoiceCode: input.shipment.code,
      ...conductorActionAuditMetadata(session, input.driverId),
    },
  });
}
export async function recordInvoiceIncident(admin: Admin, session: AppSession, input: {
  shipment: ShipmentRow;
  driverId: string;
  task: ConductorDriverTask;
  evidenceUrl: string;
}) {
  await ensureShipmentPackages(admin, session, input.shipment);

  const { data: existingPackages, error: existingError } = await admin
    .from("shipment_packages")
    .select("invoice_incident_at")
    .eq("organization_id", session.organizationId)
    .eq("shipment_id", input.shipment.id)
    .limit(1);

  if (existingError) throw new Error(existingError.message);

  // L-H5: idempotent post-commit — do not re-emit incident history on replay.
  if (existingPackages?.[0]?.invoice_incident_at) {
    return;
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from("shipment_packages")
    .update({
      invoice_incident_at: now,
      invoice_incident_reason: "Invoice no visible",
    })
    .eq("organization_id", session.organizationId)
    .eq("shipment_id", input.shipment.id);

  if (error) throw new Error(error.message);

  await recordActivityHistory(admin, session, {
    action: "shipment.invoice_box_missing",
    entityType: "shipment",
    entityId: input.shipment.id,
    title: "Incidente: invoice no visible en caja",
    description: `${input.shipment.code}: la visita se canceló porque el invoice no se veía en la caja.`,
    metadata: {
      source: "conductor.tareas",
      taskId: input.task.id,
      taskType: input.task.taskType,
      evidenceUrl: input.evidenceUrl,
      invoiceCode: input.shipment.code,
      ...conductorActionAuditMetadata(session, input.driverId),
    },
  });
}

export async function completeTask(supabase: Supabase, session: AppSession, input: {
  task: ConductorDriverTask;
  shipment: ShipmentRow;
  driverId: string;
  evidenceUrl: string;
  note: string;
  paymentExpectedAmount: number;
  paymentAmount: number;
  paymentMethod: PaymentMethod;
  paymentOutcome: ConductorPaymentOutcome;
  clientOperationId: string;
  capturedAt?: string | null;
  invoiceVisible?: boolean;
}) {
  const now = new Date().toISOString();
  const milestoneKey = milestoneKeyForLogisticsTask(input.task.taskType);
  const milestonePatch = milestoneKey
    ? buildFirstMilestonePatch(readShipmentMilestones(input.shipment), [{ key: milestoneKey, recordedAt: now }])
    : {};
  const nextLogisticsTasks = input.shipment.logisticsTasks.map((task) =>
    task.id === input.task.id ? { ...task, status: "completed" as const, completedAt: now } : task,
  );
  const statusPatch = syncShipmentStatusPatch({
    ...input.shipment,
    ...milestonePatch,
    logisticsTasks: nextLogisticsTasks,
  });
  const collectPayment = input.paymentOutcome === "collected" && input.paymentAmount > 0;
  let nextPaid = input.shipment.paid;
  let nextProfit = input.shipment.profit;
  let nextInvoiceStatus = input.shipment.invoice_status;
  let nextAccountingStatus = input.shipment.accounting_status;
  let nextFinalizedAt: string | null = input.shipment.finalized_at;

  if (collectPayment) {
    const quote = quoteFromShipment(input.shipment);
    const billing = readBillingFromPlan(input.shipment.logistics_plan);
    const quotedTotal = billing
      ? parseMoneyValue(billing.quotedTotal)
      : parseMoneyValue(quote?.total || String(input.shipment.paid));
    const cost = billing
      ? parseMoneyValue(billing.boxSubtotalBeforeDiscount) - parseMoneyValue(billing.promotionDiscount)
      : parseMoneyValue(quote?.cost || "$0");
    const settlement = settleConductorPayment({
      quotedTotal,
      alreadyPaid: input.shipment.paid,
      receivedAmount: input.paymentAmount,
    });
    // Preview-only values for ignored RPC params — not persisted as logistics_plan.
    nextPaid = settlement.paid;
    nextProfit = settlement.isPaidInFull ? Math.max(settlement.paid - cost, 0) : input.shipment.profit;
    nextInvoiceStatus = settlement.isPaidInFull ? "paid" : "open";
    nextAccountingStatus = settlement.isPaidInFull ? "exportable" : "not_exportable";
    nextFinalizedAt = settlement.isPaidInFull ? now : null;
  }

  const taskPatch: Record<string, string | null> = {
    status: "completed",
    completed_at: now,
    notes: input.note,
  };

  if (input.task.taskType === "deliver_empty_box") {
    taskPatch.loaded_at = now;
    // stock_deducted_at is set only by load/fulfill RPCs with a real movement.
  }

  // L-H3: never send a pre-RPC logistics_plan snapshot in p_shipment_patch.
  // SQL owns billing / money after collect_shipment_invoice_payment.
  const shipmentPatch = buildConductorCompleteShipmentPatch({
    milestonePatch,
    statusPatch,
  });

  const { data, error } = await supabase.rpc("complete_conductor_task_atomic", {
    p_organization_id: session.organizationId,
    p_task_id: input.task.id,
    p_driver_id: input.driverId,
    p_result: "completed",
    p_note: input.note,
    p_failure_reason: "",
    p_evidence_url: input.evidenceUrl,
    p_client_operation_id: input.clientOperationId,
    p_captured_at: input.capturedAt || now,
    p_payment_amount: collectPayment ? input.paymentAmount : 0,
    p_payment_method: collectPayment ? input.paymentMethod : "",
    p_payment_expected_amount: input.paymentExpectedAmount,
    p_payment_outcome: input.paymentOutcome,
    p_invoice_visible: Boolean(input.invoiceVisible),
    p_actor_id: session.userId,
    p_task_patch: taskPatch,
    p_shipment_patch: shipmentPatch,
    p_payment_plan: input.shipment.logistics_plan,
    p_next_paid: nextPaid,
    p_next_profit: nextProfit,
    p_next_sale_kind: input.shipment.sale_kind,
    p_next_invoice_status: nextInvoiceStatus,
    p_next_accounting_status: nextAccountingStatus,
    p_next_finalized_at: nextFinalizedAt,
    p_collect_payment: collectPayment,
  });

  if (error) {
    throw new Error(error.message);
  }

  // L-H1: authority is persisted task status, not attempt existence / replayed alone.
  const { data: taskAfter, error: taskLookupError } = await supabase
    .from("shipment_logistics_tasks")
    .select("status")
    .eq("id", input.task.id)
    .eq("organization_id", session.organizationId)
    .maybeSingle();

  if (taskLookupError) {
    throw new Error(taskLookupError.message);
  }

  const outcome = resolveConductorCompleteOutcome({
    rpcResult: data as ConductorCompleteAtomicPayload,
    persistedTaskStatus: taskAfter?.status ?? null,
  });

  if (outcome === "incomplete_after_rpc") {
    throw new Error(CONDUCTOR_COMPLETE_INCOMPLETE_ERROR);
  }

  // L-H2: completion history / invoice / truck effects are post-commit only
  // (applyConductorCompletedPostCommitEffects), so a drop after RPC can still reconcile.
}

/**
 * L-H2: read-only truck readiness checks. Must not insert inventory events.
 */
export async function validateConductorCompletedTruckEffects(input: {
  session: AppSession;
  supabase: Supabase;
  task: ConductorDriverTask;
  driverId: string;
  taskScopeDate: string;
}): Promise<string | null> {
  if (input.task.taskType === "deliver_empty_box") {
    const view = await loadTruckInventoryView(
      input.session,
      input.driverId,
      input.task.routeId,
      input.taskScopeDate,
    );
    const vehicleId = requireTruckVehicleId(view);
    const existingEvents = await loadTruckEvents(input.supabase, input.session, vehicleId);

    for (const boxLine of input.task.boxLines) {
      if (hasDeliverEventForTaskLine(existingEvents, input.task.id, boxLine)) {
        continue;
      }
      const line = findInventoryLine(view.summary, boxLine.key);
      const deliverError = validateConductorTruckDeliver(line, boxLine.quantity);
      if (deliverError) {
        return deliverError;
      }
    }
    return null;
  }

  if (input.task.taskType === "pickup_full_box") {
    if (!input.task.routeId) {
      return "La recoleccion necesita una ruta activa";
    }
    const view = await loadTruckInventoryView(
      input.session,
      input.driverId,
      input.task.routeId,
      input.taskScopeDate,
    );
    requireTruckVehicleId(view);
    return null;
  }

  return null;
}

/**
 * L-H2: definitive truck movements — only after task is completed.
 * Idempotent via unique indexes + existence checks.
 */
async function applyConductorCompletedTruckEffects(input: {
  admin: Admin;
  session: AppSession;
  supabase: Supabase;
  task: ConductorDriverTask;
  shipment: ShipmentRow;
  driverId: string;
  taskScopeDate: string;
}) {
  if (input.task.taskType === "deliver_empty_box") {
    const view = await loadTruckInventoryView(
      input.session,
      input.driverId,
      input.task.routeId,
      input.taskScopeDate,
    );
    const vehicleId = requireTruckVehicleId(view);
    const existingEvents = await loadTruckEvents(input.supabase, input.session, vehicleId);

    for (const boxLine of input.task.boxLines) {
      if (hasDeliverEventForTaskLine(existingEvents, input.task.id, boxLine)) {
        continue;
      }
      const line = findInventoryLine(view.summary, boxLine.key);
      if (line) {
        await insertTruckEvent(input.admin, input.session, {
          driverId: input.driverId,
          vehicleId,
          line,
          eventType: "deliver",
          qty: boxLine.quantity,
          taskId: input.task.id,
          shipmentId: input.task.shipmentId,
          routeId: input.task.routeId,
          note: formatConductorAdminActionNote(
            `Entrega - ${input.shipment.code}`,
            conductorActionAudit(input.session, input.driverId),
          ),
        });
      }
    }
    return;
  }

  if (input.task.taskType === "pickup_full_box") {
    if (!input.task.routeId) {
      throw new Error("La recoleccion necesita una ruta activa");
    }
    const view = await loadTruckInventoryView(
      input.session,
      input.driverId,
      input.task.routeId,
      input.taskScopeDate,
    );
    const vehicleId = requireTruckVehicleId(view);
    const existingEvents = await loadTruckEvents(input.supabase, input.session, vehicleId);

    for (const boxLine of input.task.boxLines) {
      if (hasPickupReturnEventForTaskLine(existingEvents, input.task.id, boxLine)) {
        continue;
      }
      await insertFullBoxCollectionEvent(input.admin, input.session, {
        driverId: input.driverId,
        vehicleId,
        taskId: input.task.id,
        shipmentId: input.task.shipmentId,
        routeId: input.task.routeId,
        warehouseId: input.task.warehouseId,
        boxLine,
        note: formatConductorAdminActionNote(
          `Caja llena recogida - ${input.shipment.code}`,
          conductorActionAudit(input.session, input.driverId),
        ),
      });
    }
  }
}

async function hasActivityForTask(
  admin: Admin,
  session: AppSession,
  input: { action: string; shipmentId: string; taskId: string; status?: string },
) {
  const { data, error } = await admin
    .from("activity_history")
    .select("id")
    .eq("organization_id", session.organizationId)
    .eq("entity_id", input.shipmentId)
    .eq("action", input.action)
    .contains("metadata", input.status
      ? { taskId: input.taskId, status: input.status }
      : { taskId: input.taskId })
    .limit(1);
  if (error) throw new Error(error.message);
  return Boolean(data?.length);
}

/**
 * L-H2: completion history — post-commit, idempotent on replay/reconcile.
 */
async function ensureConductorCompletedHistory(input: {
  admin: Admin;
  session: AppSession;
  task: ConductorDriverTask;
  shipment: ShipmentRow;
  driverId: string;
  evidenceUrl: string;
  note: string;
  paymentExpectedAmount: number;
  paymentAmount: number;
  paymentMethod: PaymentMethod | "";
  paymentOutcome: ConductorPaymentOutcome;
}) {
  if (input.paymentOutcome === "not_collected") {
    const hasPending = await hasActivityForTask(input.admin, input.session, {
      action: "shipment.driver_payment_not_collected",
      shipmentId: input.shipment.id,
      taskId: input.task.id,
    });
    if (!hasPending) {
      await recordActivityHistory(input.admin, input.session, {
        action: "shipment.driver_payment_not_collected",
        entityType: "shipment",
        entityId: input.shipment.id,
        title: `Cobro pendiente: ${input.shipment.code}`,
        description: conductorCollectionAuditDescription({
          expectedAmount: input.paymentExpectedAmount,
          receivedAmount: 0,
          outcome: "not_collected",
        }),
        metadata: {
          shipmentCode: input.shipment.code,
          source: "conductor.tareas",
          taskId: input.task.id,
          expectedAmount: input.paymentExpectedAmount,
          receivedAmount: 0,
          paymentOutcome: input.paymentOutcome,
          evidenceUrl: input.evidenceUrl,
          note: input.note,
          ...conductorActionAuditMetadata(input.session, input.driverId),
        },
      });
    }
  }

  const hasCompleted = await hasActivityForTask(input.admin, input.session, {
    action: "shipment.logistics_task_updated",
    shipmentId: input.shipment.id,
    taskId: input.task.id,
    status: "completed",
  });
  if (hasCompleted) {
    return;
  }

  await recordActivityHistory(input.admin, input.session, {
    action: "shipment.logistics_task_updated",
    entityType: "shipment",
    entityId: input.shipment.id,
    title: `Tarea logistica: completed`,
    description: `${input.shipment.code} - ${conductorTaskTypeLabel[input.task.taskType]} - ${formatConductorAdminActorDescription(conductorActionAudit(input.session, input.driverId), "conductor")} completo`,
    metadata: {
      shipmentCode: input.shipment.code,
      taskId: input.task.id,
      taskType: input.task.taskType,
      status: "completed",
      source: "conductor.tareas",
      driverId: input.driverId,
      evidenceUrl: input.evidenceUrl,
      note: input.note,
      completedAt: new Date().toISOString(),
      expectedPaymentAmount: input.paymentExpectedAmount || null,
      paymentAmount: input.paymentAmount,
      paymentMethod: input.paymentAmount > 0 ? input.paymentMethod : null,
      paymentOutcome: input.paymentOutcome,
      ...conductorActionAuditMetadata(input.session, input.driverId),
    },
  });
}

/**
 * L-H2: post-commit effects after authoritative completed status.
 * Safe to call on replay / retry (idempotent).
 */
export async function applyConductorCompletedPostCommitEffects(input: {
  admin: Admin;
  session: AppSession;
  supabase: Supabase;
  task: ConductorDriverTask;
  shipment: ShipmentRow;
  driverId: string;
  taskScopeDate: string;
  evidenceUrl: string;
  note?: string;
  paymentExpectedAmount?: number;
  paymentAmount?: number;
  paymentMethod?: PaymentMethod | "";
  paymentOutcome?: ConductorPaymentOutcome;
}) {
  await recordInvoiceEvidence(input.admin, input.session, {
    task: input.task,
    shipment: input.shipment,
    driverId: input.driverId,
    evidenceUrl: input.evidenceUrl,
  });
  await applyConductorCompletedTruckEffects(input);
  await ensureConductorCompletedHistory({
    admin: input.admin,
    session: input.session,
    task: input.task,
    shipment: input.shipment,
    driverId: input.driverId,
    evidenceUrl: input.evidenceUrl,
    note: input.note || "",
    paymentExpectedAmount: input.paymentExpectedAmount || 0,
    paymentAmount: input.paymentAmount || 0,
    paymentMethod: input.paymentMethod || "",
    paymentOutcome: input.paymentOutcome || "not_applicable",
  });
}
