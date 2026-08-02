"use server";

import { randomBytes } from "node:crypto";
import { requireAppSession } from "@/lib/auth/session";
import { normalizePersonName, normalizePersonNameSnapshot } from "@/lib/person-name";
import { sessionHasPermission } from "@/lib/auth/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createScopedSupabase } from "@/lib/supabase/scoped";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import { recordActivityHistory } from "@/lib/activity-history";
import { logisticsRequestedRouteDayPatch, logisticsScheduleWindowPatch } from "@/lib/logistics-schedule-window";
import { readBillingFromPlan } from "@/lib/invoice-billing";
import { type PaymentMethod } from "@/lib/payment-methods";
import { resolveInitialShipmentStatus } from "@/lib/shipment-display";
import { invoiceBoxCode } from "@/lib/invoice-child-codes";
import { physicalPackageCodesForShipment } from "@/lib/physical-packages";
import { assertSameOrgCustomerIds, assertSameOrgRecipientIds, assertSameOrgWarehouseIds } from "@/lib/security/org-scope";
import { matchEmptyBoxQuoteLinesToStock, readEmptyBoxQuoteLinesFromPlan, shouldReserveEmptyBoxStockOnSale, emptyBoxStockReserved } from "@/lib/inventory-empty-box-stock";
import type { AppSession } from "@/lib/auth/types";
import type { AccountingStatus, CreateLogisticsTaskInput, CreateShipmentResult, InvoiceStatus, ShipmentSaleKind } from "@/lib/shipment-types";

import {
  authoritativeSaleQuote,
  asRecord,
  cleanPaymentNote,
  listShipmentById,
  parseMoney,
  readPaymentMethod,
} from "@/app/actions/shipments-data";
import {
  resolveTaskWarehouse,
  shouldDeductCounterHandingStock,
} from "@/app/actions/shipments-inventory";

type CreateShipmentInput = {
  invoiceNumber: string;
  customerId?: string;
  recipientId?: string;
  customerName: string;
  country?: string;
  carrier: string;
  paid: string;
  cost: string;
  recipientSnapshot?: Record<string, unknown>;
  saleKind?: ShipmentSaleKind;
  deliveryNotes?: string;
  logisticsPlan?: Record<string, unknown>;
  paymentMethod?: PaymentMethod;
  paymentNote?: string;
  invoiceStatus?: InvoiceStatus;
  accountingStatus?: AccountingStatus;
  logisticsTasks?: CreateLogisticsTaskInput[];
  idempotencyKey?: string;
};

async function atomicSaleInventoryCommand(
  session: AppSession,
  plan: Record<string, unknown>,
  tasks: CreateLogisticsTaskInput[],
) {
  const reserve = shouldReserveEmptyBoxStockOnSale(plan) && !emptyBoxStockReserved(plan);
  const deduct = shouldDeductCounterHandingStock(plan);
  if (!reserve && !deduct) {
    return null;
  }

  const quoteLines = readEmptyBoxQuoteLinesFromPlan(plan);
  if (!quoteLines.length) {
    return null;
  }

  const { admin, warehouseId } = await resolveTaskWarehouse(
    session,
    tasks[0]?.warehouseId || null,
  );
  const { data: stockRows, error } = await admin
    .from("inventory_stock")
    .select("id, item_id, stock, reserved, inventory_items(id, name, kind)")
    .eq("warehouse_id", warehouseId)
    .eq("organization_id", session.organizationId);
  if (error) {
    throw new Error(error.message);
  }

  try {
    return {
      mode: deduct ? "deduct" : "reserve",
      lines: matchEmptyBoxQuoteLinesToStock(quoteLines, stockRows || []).map((line) => ({
        warehouseId,
        itemId: line.itemId,
        itemName: line.itemName,
        qty: line.quantity,
      })),
    };
  } catch (error) {
    const reason = error instanceof Error ? error.message : "No hay stock suficiente";
    return {
      mode: "skip" as const,
      lines: [],
      warning: `${reason}. La venta quedó pendiente de inventario.`,
    };
  }
}

export async function createShipmentAction(
  input: CreateShipmentInput,
): Promise<ActionResult<CreateShipmentResult>> {
  try {
    const session = await requireAppSession();
    if (!sessionHasPermission(session, "sales.manage")) {
      throw new Error("FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    const admin = createSupabaseAdminClient();
    if (!supabase || !admin) {
      return fail("Supabase no configurado");
    }

    await assertSameOrgCustomerIds(supabase, session.organizationId, [input.customerId || ""]);
    await assertSameOrgRecipientIds(supabase, session.organizationId, [input.recipientId || ""]);
    const tasks = input.logisticsTasks || [];
    await assertSameOrgWarehouseIds(
      supabase,
      session.organizationId,
      tasks.map((task) => task.warehouseId || "").filter(Boolean),
    );

    const country = input.country || "USA";
    const quote = await authoritativeSaleQuote(
      supabase,
      session.organizationId,
      country,
      input.logisticsPlan || {},
      session,
    );
    const paid = parseMoney(input.paid);
    if (paid < 0 || paid > quote.total) {
      return fail("El pago no coincide con el total vigente");
    }

    const saleKind = input.saleKind || (input.recipientId ? "full" : "empty_box_deposit");
    if (saleKind !== "full" && saleKind !== "empty_box_deposit") {
      return fail("Tipo de venta invalido");
    }
    const invoiceStatus: InvoiceStatus =
      quote.total > 0 && paid >= quote.total ? "paid" : "open";
    const deliveryNotes = input.deliveryNotes || "";
    const inventory = await atomicSaleInventoryCommand(session, quote.plan, tasks);
    const initialStatus = resolveInitialShipmentStatus({
      saleKind,
      logisticsPlan: quote.plan,
      logisticsTasks: tasks.map((task, index) => ({
        id: `draft-${index}`,
        shipmentId: "",
        taskType: task.taskType,
        status: task.status || (task.scheduledAt ? "scheduled" : "pending"),
        assignedTo: null,
        scheduledAt: task.scheduledAt || null,
        warehouseId: task.warehouseId || null,
        notes: task.notes || "",
        stockDeductedAt: null,
        completedAt: null,
        orderedAt: null,
        assignedAt: null,
        loadedAt: null,
        createdAt: new Date().toISOString(),
      })),
      deliveryNotes,
      emptyBoxDeliveredAt: inventory?.mode === "deduct"
        ? new Date().toISOString()
        : null,
    });
    const trackingToken = randomBytes(32).toString("base64url");
    const trackingExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();
    const packages = physicalPackageCodesForShipment(input.invoiceNumber, quote.plan).map(
      (code, index) => ({ code, invoiceCode: invoiceBoxCode(input.invoiceNumber, index) }),
    );
    const logisticsTasks = tasks.map((task) => {
      const schedule = task.scheduledAt
        ? logisticsScheduleWindowPatch(task.scheduledAt)
        : logisticsRequestedRouteDayPatch(task.requestedRouteDate);
      return {
        taskType: task.taskType,
        status: task.status || (task.scheduledAt ? "scheduled" : "pending"),
        scheduledAt: schedule.scheduled_at,
        requestedScheduleAt: schedule.requested_schedule_at,
        scheduleConfirmationStatus: schedule.schedule_confirmation_status,
        scheduleKind: schedule.schedule_kind,
        windowStartAt: schedule.window_start_at,
        windowEndAt: schedule.window_end_at,
        warehouseId: task.warehouseId || null,
        notes: task.notes || "",
      };
    });
    const idempotencyKey =
      input.idempotencyKey?.trim() ||
      `shipment:${session.organizationId}:${input.invoiceNumber.trim()}`;

    const { data: commandResult, error: commandError } = await admin.rpc(
      "create_shipment_sale_atomic",
      {
        p_idempotency_key: idempotencyKey,
        p_command: {
          organizationId: session.organizationId,
          actorId: session.userId,
          actorName: session.fullName || session.email,
          invoiceNumber: input.invoiceNumber,
          customerId: input.customerId || null,
          recipientId: input.recipientId || null,
          customerName: normalizePersonName(input.customerName),
          country,
          carrier: input.carrier || "Sin carrier",
          paidCents: Math.round(paid * 100),
          costCents: Math.round(quote.cost * 100),
          totalCents: Math.round(quote.total * 100),
          recipientSnapshot: normalizePersonNameSnapshot(input.recipientSnapshot),
          saleKind,
          deliveryNotes,
          logisticsPlan: quote.plan,
          invoiceStatus,
          status: initialStatus,
          paymentMethod: readPaymentMethod(input.paymentMethod),
          paymentNote: cleanPaymentNote(input.paymentNote),
          packages,
          logisticsTasks,
          inventory,
          trackingToken,
          trackingExpiresAt,
        },
      },
    );
    if (commandError || !commandResult) {
      return fail(commandError?.message || "No se pudo registrar el envio");
    }

    const result = commandResult as {
      shipmentId?: string;
      trackingToken?: string;
      trackingExpiresAt?: string;
      replayed?: boolean;
    };
    if (!result.shipmentId) {
      return fail("No se pudo confirmar el envio");
    }
    const shipment = await listShipmentById(supabase, session, result.shipmentId);
    if (!shipment) {
      return fail("El envio fue creado, pero no se pudo recargar");
    }
    shipment.publicTrackingToken = result.trackingToken;
    shipment.publicTrackingExpiresAt = result.trackingExpiresAt;
    const securedBilling = readBillingFromPlan(quote.plan);
    if (
      !result.replayed &&
      securedBilling &&
      parseMoney(securedBilling.logisticsSubtotal) > 0
    ) {
      const body = `Cargo logístico adicional: ${securedBilling.logisticsSubtotal}`;
      const details = {
        feeAdjustments: asRecord(quote.plan).feeAdjustments || {},
        emptyBoxDelivery: securedBilling.emptyBoxDelivery,
        fullBoxPickup: securedBilling.fullBoxPickup,
        logisticsSubtotal: securedBilling.logisticsSubtotal,
        quotedTotal: securedBilling.quotedTotal,
      };
      try {
        await admin.from("shipment_journal_entries").insert({
          organization_id: session.organizationId,
          shipment_id: shipment.id,
          category: "billing",
          body,
          details,
          reminder_status: "completed",
          source: "logistics_charge",
          source_id: shipment.id,
          created_by: session.userId,
          updated_by: session.userId,
        });
        await recordActivityHistory(admin, session, {
          action: "shipment.logistics_surcharge_applied",
          entityType: "shipment",
          entityId: shipment.id,
          title: `Cargo logístico adicional · ${shipment.code}`,
          description: body,
          metadata: details,
        });
      } catch {
        // The sale is already committed. Journal/audit recovery can be retried
        // independently and must never make the seller submit it twice.
      }
    }

    const stockWarning = result.replayed ? undefined : inventory?.warning;
    if (!result.replayed && stockWarning) {
      const nowIso = new Date().toISOString();
      const details = {
        shipmentCode: shipment.code,
        warning: stockWarning,
      };
      try {
        await admin.from("shipment_journal_entries").insert({
          organization_id: session.organizationId,
          shipment_id: shipment.id,
          category: "sales",
          body: stockWarning,
          details,
          follow_up_at: nowIso,
          assigned_to: session.userId,
          reminder_status: "pending",
          source: "inventory_pending",
          source_id: shipment.id,
          created_by: session.userId,
          updated_by: session.userId,
        });
        await recordActivityHistory(admin, session, {
          action: "shipment.inventory_pending",
          entityType: "shipment",
          entityId: shipment.id,
          title: `Pendiente de inventario · ${shipment.code}`,
          description: stockWarning,
          metadata: details,
        });
      } catch {
        // The sale is already committed. Journal/audit recovery can be retried
        // independently and must never make the seller submit it twice.
      }
    }

    return ok({
      ...shipment,
      stockWarning,
    });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
