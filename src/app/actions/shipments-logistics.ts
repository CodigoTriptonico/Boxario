"use server";

import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import { recordActivityHistory } from "@/lib/activity-history";
import { describeStatusAuditChange, type ShipmentAuditContext } from "@/lib/shipment-audit";
import { buildFirstMilestonePatch, milestoneKeyForStatus, newlyRecordedMilestones, readShipmentMilestones, type ShipmentMilestoneKey } from "@/lib/shipment-milestones";
import { validateLogisticsPlanUpdate, canRevertFullBoxOfficeReception, type UpdateShipmentLogisticsPlanInput } from "@/lib/shipment-logistics-edit";
import { FULL_BOX_OFFICE_MODE } from "@/lib/sale-logistics-modes";
import { isPendingShipmentStatus, PENDING_FULL_BOX_STATUS, resolvePendingShipmentStatus } from "@/lib/shipment-display";
import type { ShipmentRow, ShipmentStatus } from "@/lib/shipment-types";

import {
  SHIPMENT_SELECT,
  asRecord,
  listShipmentById,
  mapShipment,
  type ShipmentDbRow,
} from "@/app/actions/shipments-data";
import {
  persistShipmentLogisticsPlanUpdate,
  recordShipmentMilestoneAudits,
} from "@/app/actions/shipments-state";
import { requireShipmentActionContext } from "@/app/actions/shipments-context";

export async function updateShipmentLogisticsPlanAction(
  input: UpdateShipmentLogisticsPlanInput & {
    shipmentId: string;
    audit?: ShipmentAuditContext;
  },
): Promise<ActionResult<ShipmentRow>> {
  try {
    const { session, supabase } = await requireShipmentActionContext("sales.manage");

    const shipment = await listShipmentById(supabase, session, input.shipmentId);
    if (!shipment) {
      return fail("Invoice no encontrado");
    }

    const validationError = validateLogisticsPlanUpdate(shipment, input);
    if (validationError) {
      return fail(validationError);
    }

    const persisted = await persistShipmentLogisticsPlanUpdate(
      supabase,
      session,
      shipment,
      input,
      input.audit,
    );

    return persisted.ok ? ok(persisted.shipment) : fail(persisted.error);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function markFullBoxReceivedAtOfficeAction(input: {
  shipmentId: string;
  audit?: ShipmentAuditContext;
}): Promise<ActionResult<ShipmentRow>> {
  try {
    const { session, supabase } = await requireShipmentActionContext("sales.manage");

    const shipment = await listShipmentById(supabase, session, input.shipmentId);
    if (!shipment) {
      return fail("Invoice no encontrado");
    }

    if (shipment.sale_kind === "empty_box_deposit") {
      return fail("Este invoice es solo depósito de caja vacía.");
    }

    if (!shipment.empty_box_delivered_at) {
      return fail("Primero registra la entrega de la caja vacía.");
    }

    if (shipment.full_box_collected_at) {
      return ok(shipment);
    }

    const emptyBox = asRecord(shipment.logistics_plan.emptyBox);
    const persisted = await persistShipmentLogisticsPlanUpdate(
      supabase,
      session,
      shipment,
      {
        emptyBox: {
          mode: String(emptyBox.mode || ""),
          handingNow: emptyBox.handingNow === true,
          scheduleMode: String(emptyBox.scheduleMode || "pending"),
          scheduleAt: String(emptyBox.scheduleAt || "") || null,
          driverTaskOrdered: emptyBox.driverTaskOrdered === true,
        },
        fullBox: {
          mode: FULL_BOX_OFFICE_MODE,
          scheduleMode: "pending",
          scheduleAt: null,
          driverTaskOrdered: false,
        },
      },
      input.audit,
    );

    if (!persisted.ok) {
      return fail(persisted.error);
    }

    const now = new Date().toISOString();
    const beforeMilestones = readShipmentMilestones(persisted.shipment);
    const milestonePatch = buildFirstMilestonePatch(beforeMilestones, [
      { key: "full_box_collected_at", recordedAt: now },
      { key: "office_received_at", recordedAt: now },
    ]);
    const { data, error } = await supabase
      .from("shipments")
      .update({ status: "En oficina", ...milestonePatch })
      .eq("id", persisted.shipment.id)
      .eq("organization_id", session.organizationId)
      .select(SHIPMENT_SELECT)
      .single();

    if (error || !data) {
      return fail(error?.message || "No se pudo registrar la caja en oficina");
    }

    const updated = mapShipment(data as unknown as ShipmentDbRow);
    await recordActivityHistory(supabase, session, {
      action: "shipment.status_updated",
      entityType: "shipment",
      entityId: updated.id,
      title: `Caja llena recibida en oficina · ${updated.code}`,
      description: "El cliente entregó la caja llena en oficina.",
      metadata: {
        shipmentCode: updated.code,
        previousStatus: shipment.status,
        nextStatus: "En oficina",
        source: input.audit?.source || "envios.progress",
        interaction: input.audit?.interaction || "context_menu",
        stepTitle: input.audit?.stepTitle || null,
        stepKind: input.audit?.stepKind || "full_box",
        customerName: updated.customer_name,
        country: updated.country,
      },
    });

    await recordShipmentMilestoneAudits(
      supabase,
      session,
      updated,
      newlyRecordedMilestones(beforeMilestones, milestonePatch),
      "status_update",
      {
        previousStatus: shipment.status,
        nextStatus: "En oficina",
        audit: input.audit,
      },
    );

    return ok(updated);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function revertFullBoxOfficeReceptionAction(input: {
  shipmentId: string;
  audit?: ShipmentAuditContext;
}): Promise<ActionResult<ShipmentRow>> {
  try {
    const { session, supabase } = await requireShipmentActionContext("sales.manage");

    const shipment = await listShipmentById(supabase, session, input.shipmentId);
    if (!shipment) {
      return fail("Invoice no encontrado");
    }

    if (!canRevertFullBoxOfficeReception(shipment)) {
      if (shipment.departed_at || shipment.shipped_at || shipment.delivered_at) {
        return fail("Ya no se puede revertir: el invoice avanzó a salida o tránsito");
      }
      return fail("Este invoice no tiene una recepción en oficina reversible");
    }

    const nextStatus = resolvePendingShipmentStatus({
      ...shipment,
      full_box_collected_at: null,
      office_received_at: null,
      status: PENDING_FULL_BOX_STATUS,
    });

    const { data: cleared, error: clearError } = await supabase
      .from("shipments")
      .update({
        status: nextStatus,
        full_box_collected_at: null,
        office_received_at: null,
      })
      .eq("id", shipment.id)
      .eq("organization_id", session.organizationId)
      .select(SHIPMENT_SELECT)
      .single();

    if (clearError || !cleared) {
      return fail(clearError?.message || "No se pudo revertir la recepción en oficina");
    }

    const clearedShipment = mapShipment(cleared as unknown as ShipmentDbRow);
    const emptyBox = asRecord(clearedShipment.logistics_plan.emptyBox);
    const persisted = await persistShipmentLogisticsPlanUpdate(
      supabase,
      session,
      clearedShipment,
      {
        emptyBox: {
          mode: String(emptyBox.mode || ""),
          handingNow: emptyBox.handingNow === true,
          scheduleMode: String(emptyBox.scheduleMode || "pending"),
          scheduleAt: String(emptyBox.scheduleAt || "") || null,
          driverTaskOrdered: emptyBox.driverTaskOrdered === true,
        },
        fullBox: {
          mode: "",
          scheduleMode: "pending",
          scheduleAt: null,
          driverTaskOrdered: false,
        },
      },
      input.audit,
    );

    if (!persisted.ok) {
      return fail(persisted.error);
    }

    await recordActivityHistory(supabase, session, {
      action: "shipment.status_updated",
      entityType: "shipment",
      entityId: persisted.shipment.id,
      title: `Recepción en oficina revertida · ${persisted.shipment.code}`,
      description: "Se deshizo el registro de caja llena recibida en oficina.",
      metadata: {
        shipmentCode: persisted.shipment.code,
        previousStatus: shipment.status,
        nextStatus: persisted.shipment.status,
        source: input.audit?.source || "envios.progress",
        interaction: input.audit?.interaction || "context_menu",
        stepTitle: input.audit?.stepTitle || null,
        stepKind: input.audit?.stepKind || "full_box",
        customerName: persisted.shipment.customer_name,
        country: persisted.shipment.country,
        revertedMilestones: ["full_box_collected_at", "office_received_at"],
      },
    });

    return ok(persisted.shipment);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function updateShipmentStatusAction(
  shipmentId: string,
  status: ShipmentStatus,
  audit?: ShipmentAuditContext,
): Promise<ActionResult<ShipmentRow>> {
  try {
    const { session, supabase } =
      await requireShipmentActionContext("routes.update_status");

    const current = await listShipmentById(supabase, session, shipmentId);
    if (!current) {
      return fail("Envio no encontrado");
    }

    if (current.status === status) {
      return ok(current);
    }

    if (isPendingShipmentStatus(status)) {
      return fail("Este estado se asigna automáticamente según la logística");
    }

    const now = new Date().toISOString();
    const milestoneEntries: Array<{ key: ShipmentMilestoneKey; recordedAt: string }> = [];

    const statusMilestone = milestoneKeyForStatus(status);
    if (statusMilestone) {
      milestoneEntries.push({ key: statusMilestone, recordedAt: now });
    }

    const fullBoxOfficeMode =
      String(asRecord(current.logistics_plan.fullBox).mode || "") ===
      "Cliente trae caja llena a oficina";

    if (status === "En oficina" && fullBoxOfficeMode) {
      milestoneEntries.push({ key: "full_box_collected_at", recordedAt: now });
    }

    const beforeMilestones = readShipmentMilestones(current);
    const milestonePatch = buildFirstMilestonePatch(beforeMilestones, milestoneEntries);

    let query = supabase
      .from("shipments")
      .update({ status, ...milestonePatch })
      .eq("id", shipmentId)
      .eq("organization_id", session.organizationId);

    if (session.roleSlug === "conductor") {
      query = query.eq("assigned_to", session.userId);
    }

    const { data, error } = await query.select(SHIPMENT_SELECT).single();

    if (error || !data) {
      return fail(error?.message || "Envio no encontrado");
    }

    const row = mapShipment(data as unknown as ShipmentDbRow);

    await recordActivityHistory(supabase, session, {
      action: "shipment.status_updated",
      entityType: "shipment",
      entityId: row.id,
      title: `Estado · ${row.code}`,
      description: audit
        ? describeStatusAuditChange({
            previousStatus: current.status,
            nextStatus: status,
            interaction: audit.interaction,
            stepTitle: audit.stepTitle,
          })
        : `${current.status} → ${status}`,
      metadata: {
        shipmentCode: row.code,
        previousStatus: current.status,
        nextStatus: status,
        source: audit?.source || "envios",
        interaction: audit?.interaction || null,
        stepTitle: audit?.stepTitle || null,
        stepKind: audit?.stepKind || null,
        customerName: row.customer_name,
        country: row.country,
      },
    });

    const recordedMilestones = newlyRecordedMilestones(beforeMilestones, milestonePatch);
    if (recordedMilestones.length) {
      await recordShipmentMilestoneAudits(supabase, session, row, recordedMilestones, "status_update", {
        previousStatus: current.status,
        nextStatus: status,
        audit,
      });
    }

    return ok(row);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
