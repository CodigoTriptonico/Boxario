"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { formatConductorAdminActionNote, formatConductorAdminActorDescription } from "@/lib/conductor-tareas-view";
import { buildRouteByTaskId, buildConductorDriverTasks, conductorScopeDate, conductorTaskTypeLabel, isConductorClosedTaskInScope, isTaskAssignedToDriver, scheduledAtScopeDate } from "@/lib/conductor-tasks";
import { validateConductorTaskResultInput, type ConductorTaskFailureReason } from "@/lib/conductor-truck-inventory";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import { recordActivityHistory } from "@/lib/activity-history";
import { parseMoneyValue } from "@/lib/logistics-fees";
import { conductorExpectedDepositCollection, conductorPaymentChoiceError, isConductorPaymentChoice, resolveConductorPaymentAmount, type ConductorPaymentOutcome } from "@/lib/conductor-driver-payment";
import { logisticsScheduleWindowPatch } from "@/lib/logistics-schedule-window";
import { logisticsTaskAssignedPatch, logisticsTaskReactivatePatchPreservingStock } from "@/lib/shipment-logistics-task-timestamps";

import {
  cleanText,
  conductorActionAudit,
  conductorActionAuditMetadata,
  loadConductorData,
  loadDriverTaskFromDb,
  readPaymentMethod,
  requireConductorMutationContext,
  resolveConductorActionDriverId,
} from "@/app/actions/conductor-tasks-shared";
import {
  applyConductorCompletedPostCommitEffects,
  completeTask,
  failTask,
  recordInvoiceIncident,
  recordTaskAttempt,
  uploadEvidence,
  validateConductorCompletedTruckEffects,
} from "@/app/actions/conductor-task-result-support";

export async function submitConductorTaskResultAction(
  formData: FormData,
): Promise<ActionResult<{ taskId: string }>> {
  try {
    const { admin, supabase, session } = await requireConductorMutationContext();

    const driverId = resolveConductorActionDriverId(session, cleanText(formData.get("driverId"), 80) || null);
    const taskId = cleanText(formData.get("taskId"), 80);
    const result = cleanText(formData.get("result"), 20) === "failed" ? "failed" : "completed";
    const failureReason = cleanText(formData.get("failureReason"), 120);
    const note = cleanText(formData.get("note"), 1000);
    const paymentChoiceValue = cleanText(formData.get("paymentChoice"), 20);
    const customPaymentAmount = Math.max(parseMoneyValue(cleanText(formData.get("paymentAmount"), 40)), 0);
    const paymentMethod = readPaymentMethod(formData.get("paymentMethod"));
    const operationIdValue = cleanText(formData.get("operationId"), 80);
    const clientOperationId = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(operationIdValue)
      ? operationIdValue
      : randomUUID();
    const capturedAtValue = cleanText(formData.get("capturedAt"), 80);
    const capturedAtDate = capturedAtValue ? new Date(capturedAtValue) : null;
    const capturedAt = capturedAtDate && !Number.isNaN(capturedAtDate.getTime())
      ? capturedAtDate.toISOString()
      : null;
    const evidence = formData.get("evidence");
    const evidenceFile = evidence instanceof File && evidence.name ? evidence : null;
    const invoiceVisible = cleanText(formData.get("invoiceVisible"), 10) === "true";

    if (!taskId) {
      return fail("Falta tarea");
    }

    const taskRow = await loadDriverTaskFromDb(admin, session, taskId);

    if (!taskRow) {
      throw new Error("FORBIDDEN");
    }

    if (taskRow.status === "completed") {
      // L-H2 case 4: close already committed — reconcile idempotent post-commit effects.
      const taskScopeDate = scheduledAtScopeDate(taskRow.scheduled_at) || conductorScopeDate();
      const data = await loadConductorData(driverId, taskScopeDate);
      const routeByTaskId = buildRouteByTaskId(data.routes);
      const routeInfo = routeByTaskId.get(taskRow.id);
      if (
        !isTaskAssignedToDriver(
          { assignedTo: taskRow.assigned_to, status: taskRow.status },
          routeInfo,
          driverId,
          { includeClosed: true },
        )
      ) {
        throw new Error("FORBIDDEN");
      }
      const closedTasks = buildConductorDriverTasks({
        shipments: data.shipments,
        routes: data.routes,
        taskAddresses: data.taskAddresses,
        vehicles: data.vehicles,
        driverId,
        scopeDate: data.scopeDate || taskScopeDate,
        visibility: "closed",
      });
      const task = closedTasks.find((entry) => entry.id === taskId);
      const shipment = data.shipments.find((entry) => entry.id === taskRow.shipment_id);
      if (task && shipment) {
        const evidenceUrl = await uploadEvidence(admin, session, task.id, clientOperationId, evidenceFile);
        const { data: attemptRow } = await admin
          .from("shipment_logistics_task_attempts")
          .select("note, payment_expected_amount, payment_amount, payment_method, payment_outcome")
          .eq("organization_id", session.organizationId)
          .eq("client_operation_id", clientOperationId)
          .maybeSingle();
        await applyConductorCompletedPostCommitEffects({
          admin,
          session,
          supabase,
          task,
          shipment,
          driverId,
          taskScopeDate,
          evidenceUrl,
          note: typeof attemptRow?.note === "string" ? attemptRow.note : note,
          paymentExpectedAmount: Number(attemptRow?.payment_expected_amount || 0),
          paymentAmount: Number(attemptRow?.payment_amount || 0),
          paymentMethod: readPaymentMethod(attemptRow?.payment_method || paymentMethod),
          paymentOutcome: (attemptRow?.payment_outcome === "collected"
            || attemptRow?.payment_outcome === "not_collected"
            || attemptRow?.payment_outcome === "not_applicable")
            ? attemptRow.payment_outcome
            : "not_applicable",
        });
      }
      revalidatePath("/conductor/tareas");
      revalidatePath("/conductor/inventario-camion");
      revalidatePath("/seguimiento");
      revalidatePath("/logistica");
      return ok({ taskId });
    }

    if (taskRow.status === "cancelled") {
      const { data: repeatedAttempt } = await admin
        .from("shipment_logistics_task_attempts")
        .select("id")
        .eq("organization_id", session.organizationId)
        .eq("client_operation_id", clientOperationId)
        .maybeSingle();
      return repeatedAttempt ? ok({ taskId }) : fail("Tarea cancelada");
    }

    const taskScopeDate = scheduledAtScopeDate(taskRow.scheduled_at) || conductorScopeDate();
    const { tasks, shipments, routes } = await loadConductorData(driverId, taskScopeDate);
    const routeByTaskId = buildRouteByTaskId(routes);
    const routeInfo = routeByTaskId.get(taskRow.id);

    if (
      !isTaskAssignedToDriver(
        { assignedTo: taskRow.assigned_to, status: taskRow.status },
        routeInfo,
        driverId,
      )
    ) {
      throw new Error("FORBIDDEN");
    }

    if (routeInfo && routeInfo.route.status !== "in_progress") {
      return fail("Inicia la ruta antes de confirmar entregas o recolecciones");
    }

    const task = tasks.find((entry) => entry.id === taskId);

    if (!task) {
      throw new Error("FORBIDDEN");
    }

    const expectedPaymentAmount = conductorExpectedDepositCollection({
      result,
      taskType: task.taskType,
      depositDue: task.depositDue,
      balanceDue: task.balanceDue,
    });
    const hasDeliveryCollection = expectedPaymentAmount > 0;
    let paymentAmount = 0;
    let paymentOutcome: ConductorPaymentOutcome = "not_applicable";

    if (hasDeliveryCollection) {
      const paymentChoice = isConductorPaymentChoice(paymentChoiceValue) ? paymentChoiceValue : null;
      const paymentChoiceError = conductorPaymentChoiceError({
        choice: paymentChoice,
        expectedAmount: expectedPaymentAmount,
        customAmount: customPaymentAmount,
      });

      if (paymentChoiceError) {
        return fail(paymentChoiceError);
      }

      const resolvedPayment = resolveConductorPaymentAmount({
        choice: paymentChoice!,
        expectedAmount: expectedPaymentAmount,
        customAmount: customPaymentAmount,
      });
      paymentAmount = resolvedPayment.amount;
      paymentOutcome = resolvedPayment.outcome;
    }

    const validationError = validateConductorTaskResultInput({
      result,
      taskType: task.taskType,
      failureReason,
      evidenceFileName: evidenceFile?.name,
      invoiceVisible,
      paymentAmount,
    });

    if (validationError) {
      return fail(validationError);
    }

    const shipment = shipments.find((entry) => entry.id === task.shipmentId);

    if (!shipment) {
      return fail("Invoice no encontrado");
    }

    // L-H2: prepare evidence blob only (keyed by clientOperationId). Do not bind it as
    // completed-task evidence until after the atomic close confirms status=completed.
    const evidenceUrl = await uploadEvidence(admin, session, task.id, clientOperationId, evidenceFile);

    if (result === "failed") {
      if (failureReason === "Invoice no visible") {
        await recordInvoiceIncident(admin, session, {
          task,
          shipment,
          driverId,
          evidenceUrl,
        });
      }

      // Failed path still records the attempt here (RPC not used for failed today / L-H5).
      await recordTaskAttempt(admin, session, {
        task,
        result,
        driverId,
        failureReason: failureReason,
        note,
        evidenceUrl,
        paymentExpectedAmount: hasDeliveryCollection ? expectedPaymentAmount : null,
        paymentAmount,
        paymentMethod: paymentOutcome === "collected" ? paymentMethod : "",
        paymentOutcome,
        invoiceVisible,
        clientOperationId,
        capturedAt,
      });

      await failTask(supabase, session, {
        task,
        shipment,
        driverId,
        failureReason: failureReason as ConductorTaskFailureReason,
        note,
        evidenceUrl,
      });

      if (routeInfo?.route.id) {
        const now = new Date().toISOString();
        const { error: stopError } = await admin
          .from("logistics_route_stops")
          .update({
            outcome: result,
            outcome_at: now,
          })
          .eq("route_id", routeInfo.route.id)
          .eq("task_id", task.id)
          .eq("organization_id", session.organizationId)
          .is("released_at", null);

        if (stopError) {
          throw new Error(stopError.message);
        }
      }
    } else {
      // L-H2 frontier: validate → prepare → atomic close → verify completed → post-commit.
      const truckValidationError = await validateConductorCompletedTruckEffects({
        session,
        supabase,
        task,
        driverId,
        taskScopeDate,
      });
      if (truckValidationError) {
        return fail(truckValidationError);
      }

      // L-H1: do NOT insert shipment_logistics_task_attempts before the RPC.
      await completeTask(supabase, session, {
        task,
        shipment,
        driverId,
        evidenceUrl,
        note,
        paymentExpectedAmount: expectedPaymentAmount,
        paymentAmount,
        paymentMethod,
        paymentOutcome,
        clientOperationId,
        capturedAt,
        invoiceVisible,
      });

      // Post-commit only after completeTask verified persisted status=completed.
      // Idempotent for replay / offline retry (case 4).
      await applyConductorCompletedPostCommitEffects({
        admin,
        session,
        supabase,
        task,
        shipment,
        driverId,
        taskScopeDate,
        evidenceUrl,
        note,
        paymentExpectedAmount: expectedPaymentAmount,
        paymentAmount,
        paymentMethod,
        paymentOutcome,
      });
    }

    revalidatePath("/conductor/tareas");
    revalidatePath("/conductor/inventario-camion");
    revalidatePath("/seguimiento");
    revalidatePath("/logistica");
    return ok({ taskId });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function reactivateConductorTaskAction(input: {
  taskId: string;
  driverId?: string | null;
}): Promise<ActionResult<{ taskId: string }>> {
  try {
    const { admin, session } = await requireConductorMutationContext();

    const driverId = resolveConductorActionDriverId(session, input.driverId);
    const taskId = cleanText(input.taskId, 80);

    if (!taskId) {
      return fail("Falta tarea");
    }

    const taskRow = await loadDriverTaskFromDb(admin, session, taskId);

    if (!taskRow) {
      throw new Error("FORBIDDEN");
    }

    if (taskRow.status !== "cancelled") {
      return fail("Solo puedes reactivar visitas marcadas como no se pudo");
    }

    const { shipments, routes } = await loadConductorData(driverId);
    const routeByTaskId = buildRouteByTaskId(routes);
    const routeInfo = routeByTaskId.get(taskRow.id);

    if (
      !isTaskAssignedToDriver(
        { assignedTo: taskRow.assigned_to, status: taskRow.status },
        routeInfo,
        driverId,
        { includeClosed: true },
      )
    ) {
      throw new Error("FORBIDDEN");
    }

    if (
      !isConductorClosedTaskInScope(
        {
          status: taskRow.status,
          scheduledAt: taskRow.scheduled_at,
          assignedTo: taskRow.assigned_to,
        },
        routeInfo,
        conductorScopeDate(),
        driverId,
      )
    ) {
      return fail("La tarea ya no esta en tu jornada");
    }

    const shipment = shipments.find((entry) => entry.id === taskRow.shipment_id);

    if (!shipment) {
      return fail("Invoice no encontrado");
    }

    const now = new Date().toISOString();
    const scheduledAt = taskRow.scheduled_at;
    const assignedTo = taskRow.assigned_to;
    const nextStatus = scheduledAt ? "scheduled" : assignedTo ? "assigned" : "pending";
    const audit = conductorActionAudit(session, driverId);
    const reactivationNote = formatConductorAdminActionNote(
      "Devuelta al listado por conductor",
      audit,
    );

    const taskPatch: Record<string, unknown> = {
      status: nextStatus,
      notes: reactivationNote,
      updated_at: now,
      ...logisticsScheduleWindowPatch(scheduledAt),
      ...logisticsTaskReactivatePatchPreservingStock(
        { stockDeductedAt: taskRow.stock_deducted_at },
        now,
      ),
    };

    if (assignedTo) {
      Object.assign(
        taskPatch,
        logisticsTaskAssignedPatch(
          {
            orderedAt: now,
            assignedAt: null,
            loadedAt: null,
          },
          now,
        ),
      );
    }

    const { error: taskError } = await admin
      .from("shipment_logistics_tasks")
      .update(taskPatch)
      .eq("id", taskId)
      .eq("organization_id", session.organizationId);

    if (taskError) {
      throw new Error(taskError.message);
    }

    const { error: stopError } = await admin
      .from("logistics_route_stops")
      .update({
        outcome: null,
        outcome_at: null,
        updated_at: now,
      })
      .eq("task_id", taskId)
      .eq("organization_id", session.organizationId)
      .is("released_at", null);

    if (stopError) {
      throw new Error(stopError.message);
    }

    await admin
      .from("shipment_logistics_task_attempts")
      .update({
        resolved_at: now,
        resolved_by: session.userId,
        resolution: "reprogrammed",
        resolution_note: reactivationNote,
      })
      .eq("task_id", taskId)
      .eq("organization_id", session.organizationId)
      .eq("result", "failed")
      .is("resolved_at", null);

    await recordActivityHistory(admin, session, {
      action: "shipment.logistics_task_reactivated",
      entityType: "shipment",
      entityId: shipment.id,
      title: `Tarea reactivada: ${shipment.code}`,
      description: `${conductorTaskTypeLabel[taskRow.task_type]} · ${formatConductorAdminActorDescription(audit, "conductor")} la devolvio al listado`,
      metadata: {
        shipmentCode: shipment.code,
        source: "conductor.tareas",
        taskId,
        taskType: taskRow.task_type,
        status: nextStatus,
        driverId,
        ...conductorActionAuditMetadata(session, driverId),
      },
    });

    revalidatePath("/conductor/tareas");
    revalidatePath("/conductor/inventario-camion");
    revalidatePath("/seguimiento");
    revalidatePath("/logistica");
    return ok({ taskId });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
