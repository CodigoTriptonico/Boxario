import { formatConductorAdminActionNote, formatConductorAdminActorDescription } from "@/lib/conductor-tareas-view";
import type { ShipmentRow } from "@/lib/shipment-types";
import { conductorTaskTypeLabel, type ConductorDriverTask } from "@/lib/conductor-tasks";
import { LOGISTICS_TASK_EVIDENCE_BUCKET, type ConductorTaskFailureReason } from "@/lib/conductor-truck-inventory";
import { createStorageSignedUrl } from "@/lib/supabase/storage-url";
import { recordActivityHistory } from "@/lib/activity-history";
import { decodeAndSanitizeImage } from "@/lib/security/safe-image";
import { formatMoneyValue, parseMoneyValue } from "@/lib/logistics-fees";
import { depositStatusForPayment, readBillingFromPlan } from "@/lib/invoice-billing";
import { conductorCollectionAuditDescription, settleConductorPayment, type ConductorPaymentOutcome } from "@/lib/conductor-driver-payment";
import { type PaymentMethod } from "@/lib/payment-methods";
import { quoteFromShipment, syncShipmentStatusPatch } from "@/lib/shipment-display";
import { physicalPackageCodesForShipment } from "@/lib/physical-packages";
import { invoiceBoxCode } from "@/lib/invoice-child-codes";
import { buildFirstMilestonePatch, milestoneKeyForLogisticsTask, readShipmentMilestones } from "@/lib/shipment-milestones";
import type { AppSession } from "@/lib/auth/types";

import {
  EVIDENCE_MAX_BYTES,
  EVIDENCE_TYPES,
  conductorActionAudit,
  conductorActionAuditMetadata,
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

export async function recordTaskAttempt(admin: Admin, session: AppSession, input: {
  task: ConductorDriverTask;
  result: "completed" | "failed";
  driverId: string;
  failureReason: string;
  note: string;
  evidenceUrl: string;
  paymentExpectedAmount: number | null;
  paymentAmount: number;
  paymentMethod: PaymentMethod | "";
  paymentOutcome: ConductorPaymentOutcome;
  invoiceVisible: boolean;
  clientOperationId: string;
  capturedAt: string | null;
}) {
  const audit = conductorActionAudit(session, input.driverId);
  const note = formatConductorAdminActionNote(input.note, audit);
  const failureReason = input.result === "failed"
    ? formatConductorAdminActionNote(input.failureReason, audit)
    : "";

  const { error } = await admin.from("shipment_logistics_task_attempts").insert({
    organization_id: session.organizationId,
    shipment_id: input.task.shipmentId,
    task_id: input.task.id,
    route_id: input.task.routeId,
    driver_id: input.driverId,
    result: input.result,
    failure_reason: failureReason,
    note,
    evidence_url: input.evidenceUrl,
    payment_expected_amount: input.paymentExpectedAmount,
    payment_outcome: input.paymentOutcome,
    payment_amount: input.paymentOutcome === "not_applicable" ? null : input.paymentAmount,
    payment_method: input.paymentMethod || null,
    invoice_visible: input.invoiceVisible,
    client_operation_id: input.clientOperationId,
    captured_at: input.capturedAt,
    created_by: session.userId,
  });

  if (error) {
    if (error.code === "23505" && input.clientOperationId) {
      const { data: existingAttempt, error: lookupError } = await admin
        .from("shipment_logistics_task_attempts")
        .select("task_id, driver_id, result")
        .eq("organization_id", session.organizationId)
        .eq("client_operation_id", input.clientOperationId)
        .maybeSingle();

      if (lookupError) {
        throw new Error(lookupError.message);
      }

      if (
        existingAttempt?.task_id === input.task.id &&
        existingAttempt.driver_id === input.driverId &&
        existingAttempt.result === input.result
      ) {
        return;
      }
    }

    throw new Error(error.message);
  }
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

export async function recordInvoiceEvidence(admin: Admin, session: AppSession, input: {
  task: ConductorDriverTask;
  shipment: ShipmentRow;
  driverId: string;
  evidenceUrl: string;
}) {
  await ensureShipmentPackages(admin, session, input.shipment);

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
  const noCollectionPlan = input.paymentOutcome === "not_collected"
    ? (() => {
        const billing = readBillingFromPlan(input.shipment.logistics_plan);
        const quotedTotal = billing
          ? parseMoneyValue(billing.quotedTotal)
          : parseMoneyValue(quoteFromShipment(input.shipment)?.total || "$0");

        return {
          ...input.shipment.logistics_plan,
          billing: {
            ...(billing || {
              quotedTotal: formatMoneyValue(quotedTotal),
              minimumDeposit: formatMoneyValue(input.paymentExpectedAmount + input.shipment.paid),
              depositRequired: formatMoneyValue(input.paymentExpectedAmount + input.shipment.paid),
              depositStatus: "pending" as const,
              payNow: formatMoneyValue(input.shipment.paid),
              balanceDue: formatMoneyValue(Math.max(quotedTotal - input.shipment.paid, 0)),
            }),
            lastDriverCollection: {
              expectedAmount: input.paymentExpectedAmount,
              receivedAmount: 0,
              outcome: "not_collected",
              collectedAt: now,
              totalBefore: quotedTotal,
              totalAfter: quotedTotal,
            },
          },
        };
      })()
    : null;

  const taskPatch: Record<string, string | null> = {
    status: "completed",
    completed_at: now,
    notes: input.note,
  };

  if (input.task.taskType === "deliver_empty_box") {
    taskPatch.loaded_at = now;
    taskPatch.stock_deducted_at = now;
  }

  const collectPayment = input.paymentOutcome === "collected" && input.paymentAmount > 0;
  let paymentPlan: Record<string, unknown> | null = null;
  let nextPaid = input.shipment.paid;
  let nextProfit = input.shipment.profit;
  let nextInvoiceStatus = input.shipment.invoice_status;
  let nextAccountingStatus = input.shipment.accounting_status;
  let nextFinalizedAt: string | null = input.shipment.finalized_at;
  let settlement: ReturnType<typeof settleConductorPayment> | null = null;

  if (collectPayment) {
    const quote = quoteFromShipment(input.shipment);
    const billing = readBillingFromPlan(input.shipment.logistics_plan);
    const quotedTotal = billing
      ? parseMoneyValue(billing.quotedTotal)
      : parseMoneyValue(quote?.total || String(input.shipment.paid));
    const cost = billing
      ? parseMoneyValue(billing.boxSubtotalBeforeDiscount) - parseMoneyValue(billing.promotionDiscount)
      : parseMoneyValue(quote?.cost || "$0");
    settlement = settleConductorPayment({
      quotedTotal,
      alreadyPaid: input.shipment.paid,
      receivedAmount: input.paymentAmount,
    });
    nextPaid = settlement.paid;
    nextProfit = settlement.isPaidInFull ? Math.max(settlement.paid - cost, 0) : input.shipment.profit;
    nextInvoiceStatus = settlement.isPaidInFull ? "paid" : "open";
    nextAccountingStatus = settlement.isPaidInFull ? "exportable" : "not_exportable";
    nextFinalizedAt = settlement.isPaidInFull ? now : null;
    paymentPlan = {
      ...input.shipment.logistics_plan,
      billing: billing
        ? {
            ...billing,
            quotedTotal: formatMoneyValue(settlement.quotedTotal),
            depositStatus: depositStatusForPayment(billing.depositRequired, settlement.paid),
            payNow: formatMoneyValue(settlement.paid),
            balanceDue: formatMoneyValue(settlement.balanceDue),
            lastDriverCollection: {
              expectedAmount: input.paymentExpectedAmount,
              receivedAmount: input.paymentAmount,
              outcome: "collected",
              collectedAt: now,
              totalBefore: quotedTotal,
              totalAfter: settlement.quotedTotal,
            },
          }
        : {
            quotedTotal: formatMoneyValue(settlement.quotedTotal),
            minimumDeposit: formatMoneyValue(input.paymentExpectedAmount + input.shipment.paid),
            depositRequired: formatMoneyValue(input.paymentExpectedAmount + input.shipment.paid),
            depositStatus: "paid",
            payNow: formatMoneyValue(settlement.paid),
            balanceDue: formatMoneyValue(settlement.balanceDue),
            lastDriverCollection: {
              expectedAmount: input.paymentExpectedAmount,
              receivedAmount: input.paymentAmount,
              outcome: "collected",
              collectedAt: now,
              totalBefore: quotedTotal,
              totalAfter: settlement.quotedTotal,
            },
          },
    };
  }

  const shipmentPatch: Record<string, unknown> = {
    ...milestonePatch,
    ...statusPatch,
    ...(noCollectionPlan ? { logistics_plan: noCollectionPlan } : {}),
    ...(paymentPlan ? { logistics_plan: paymentPlan } : {}),
  };

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
    p_payment_plan: paymentPlan || input.shipment.logistics_plan,
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

  if (input.paymentOutcome === "not_collected") {
    await recordActivityHistory(supabase, session, {
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
        ...conductorActionAuditMetadata(session, input.driverId),
      },
    });
  }

  await recordActivityHistory(supabase, session, {
    action: "shipment.logistics_task_updated",
    entityType: "shipment",
    entityId: input.shipment.id,
    title: `Tarea logistica: completed`,
    description: `${input.shipment.code} - ${conductorTaskTypeLabel[input.task.taskType]} - ${formatConductorAdminActorDescription(conductorActionAudit(session, input.driverId), "conductor")} completo`,
    metadata: {
      shipmentCode: input.shipment.code,
      taskId: input.task.id,
      taskType: input.task.taskType,
      status: "completed",
      source: "conductor.tareas",
      driverId: input.driverId,
      evidenceUrl: input.evidenceUrl,
      note: input.note,
      completedAt: now,
      expectedPaymentAmount: input.paymentExpectedAmount || null,
      paymentAmount: input.paymentAmount,
      paymentMethod: input.paymentAmount > 0 ? input.paymentMethod : null,
      paymentOutcome: input.paymentOutcome,
      paymentSettlement: settlement,
      atomicResult: data,
      ...conductorActionAuditMetadata(session, input.driverId),
    },
  });
}

export async function failTask(supabase: Supabase, session: AppSession, input: {
  task: ConductorDriverTask;
  shipment: ShipmentRow;
  driverId: string;
  failureReason: ConductorTaskFailureReason;
  note: string;
  evidenceUrl: string;
}) {
  const now = new Date().toISOString();
  const audit = conductorActionAudit(session, input.driverId);
  const fullNote = [input.failureReason, input.note].filter(Boolean).join(" - ");
  const auditedFullNote = formatConductorAdminActionNote(fullNote, audit);

  const { error: taskError } = await supabase
    .from("shipment_logistics_tasks")
    .update({
      status: "cancelled",
      notes: auditedFullNote,
      completed_at: null,
      updated_at: now,
    })
    .eq("id", input.task.id)
    .eq("organization_id", session.organizationId);

  if (taskError) {
    throw new Error(taskError.message);
  }

  await recordActivityHistory(supabase, session, {
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
      cancelledAt: now,
      nextStep: "Reprogramar con Logística",
      ...conductorActionAuditMetadata(session, input.driverId),
    },
  });
}
