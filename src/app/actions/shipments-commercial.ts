"use server";

import { requireAppSession } from "@/lib/auth/session";
import { normalizePersonName, normalizePersonNameSnapshot } from "@/lib/person-name";
import { sessionHasPermission } from "@/lib/auth/permissions";
import { createScopedSupabase } from "@/lib/supabase/scoped";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import { recordActivityHistory } from "@/lib/activity-history";
import { depositStatusForPayment, invoicePaymentKindForCurrentDeposit, readBillingFromPlan } from "@/lib/invoice-billing";
import { formatMoneyValue } from "@/lib/logistics-fees";
import { paymentMethodLabel, type PaymentMethod } from "@/lib/payment-methods";
import { canManageAllShipments, canChangeShipmentSalesOwner } from "@/lib/shipment-visibility";
import { shipmentContactLogAuditDescription, validateShipmentContactLogInput, type ShipmentContactLogInput } from "@/lib/shipment-contact-log";
import { isSalesOwnerRole } from "@/lib/shipment-sales-owner";
import { assertSameOrgProfileIds } from "@/lib/security/org-scope";
import type { AppSession, RoleSlug } from "@/lib/auth/types";
import type { ShipmentRow } from "@/lib/shipment-types";

import {
  SHIPMENT_SELECT,
  asRecord,
  cleanPaymentNote,
  listShipmentById,
  mapShipment,
  parseMoney,
  readPaymentMethod,
  readQuoteFromPlan,
  type ShipmentDbRow,
} from "@/app/actions/shipments-data";
import { requireShipmentActionContext } from "@/app/actions/shipments-context";

function canWriteShipmentContactLog(session: AppSession, shipment: ShipmentRow) {
  return (
    canManageAllShipments(session) ||
    (sessionHasPermission(session, "sales.manage") && shipment.salesOwnerId === session.userId)
  );
}

export async function createShipmentContactLogAction(
  input: ShipmentContactLogInput,
): Promise<ActionResult<ShipmentRow>> {
  try {
    const session = await requireAppSession();

    if (!sessionHasPermission(session, "sales.manage")) {
      throw new Error("FORBIDDEN");
    }

    const validated = validateShipmentContactLogInput(input);

    if (!validated.ok) {
      return fail(validated.error);
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const shipment = await listShipmentById(supabase, session, validated.data.shipmentId);

    if (!shipment) {
      return fail("Invoice no encontrado");
    }

    if (!canWriteShipmentContactLog(session, shipment)) {
      throw new Error("FORBIDDEN");
    }

    const { error } = await supabase.from("shipment_journal_entries").insert({
      organization_id: session.organizationId,
      shipment_id: shipment.id,
      category: "customer",
      body: validated.data.note,
      details: {
        channel: validated.data.channel,
        channelOther: validated.data.channelOther,
        outcome: validated.data.outcome,
        nextStep: validated.data.nextStep,
      },
      follow_up_at: validated.data.followUpAt,
      assigned_to: validated.data.followUpAt ? session.userId : null,
      reminder_status: "pending",
      source: "manual",
      created_by: session.userId,
      updated_by: session.userId,
    });

    if (error) {
      return fail(error.message);
    }

    await recordActivityHistory(supabase, session, {
      action: "shipment.journal_entry_created",
      entityType: "shipment",
      entityId: shipment.id,
      title: `Seguimiento · ${shipment.code}`,
      description: shipmentContactLogAuditDescription(validated.data),
      metadata: {
        shipmentCode: shipment.code,
        customerName: shipment.customer_name,
        channel: validated.data.channel,
        channelOther: validated.data.channelOther,
        outcome: validated.data.outcome,
        nextStep: validated.data.nextStep,
        followUpAt: validated.data.followUpAt,
        source: "envios.journal",
      },
    });

    const updated = await listShipmentById(supabase, session, shipment.id);
    return updated ? ok(updated) : ok(shipment);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

function partyCorrectionChangedKeys(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
) {
  const keys = new Set([...Object.keys(before), ...Object.keys(after)]);
  return [...keys].filter((key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]));
}

export async function syncShipmentPartyAction(input: {
  shipmentId: string;
  customerName?: string;
  recipientSnapshot?: Record<string, unknown>;
}): Promise<ActionResult<ShipmentRow>> {
  try {
    const session = await requireAppSession();
    if (!sessionHasPermission(session, "sales.manage")) {
      throw new Error("FORBIDDEN");
    }

    const shipmentId = input.shipmentId.trim();
    if (!shipmentId) {
      return fail("Invoice no encontrado");
    }

    const hasCustomerName = typeof input.customerName === "string";
    const hasRecipientSnapshot = Boolean(input.recipientSnapshot);
    if (!hasCustomerName && !hasRecipientSnapshot) {
      return fail("No hay datos para corregir");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const shipment = await listShipmentById(supabase, session, shipmentId);
    if (!shipment) {
      return fail("Invoice no encontrado");
    }

    const beforeCustomerName = shipment.customer_name;
    const beforeRecipientSnapshot =
      (shipment.recipientSnapshot as Record<string, unknown> | null) || {};
    const nextCustomerName = hasCustomerName
      ? normalizePersonName(input.customerName || "")
      : beforeCustomerName;
    const nextRecipientSnapshot = hasRecipientSnapshot
      ? normalizePersonNameSnapshot(input.recipientSnapshot) || {}
      : beforeRecipientSnapshot;
    const nextCountry =
      typeof nextRecipientSnapshot.country === "string" && nextRecipientSnapshot.country.trim()
        ? nextRecipientSnapshot.country.trim()
        : shipment.country;

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (hasCustomerName) {
      patch.customer_name = nextCustomerName;
    }
    if (hasRecipientSnapshot) {
      patch.recipient_snapshot = nextRecipientSnapshot;
      patch.country = nextCountry;
    }

    const { error } = await supabase
      .from("shipments")
      .update(patch)
      .eq("id", shipment.id)
      .eq("organization_id", session.organizationId);

    if (error) {
      return fail(error.message);
    }

    const afterCustomerName = hasCustomerName ? nextCustomerName : beforeCustomerName;
    const afterRecipientSnapshot = hasRecipientSnapshot
      ? nextRecipientSnapshot
      : beforeRecipientSnapshot;
    const changedFields = [
      ...(hasCustomerName && beforeCustomerName !== afterCustomerName ? ["customerName"] : []),
      ...(hasRecipientSnapshot
        ? partyCorrectionChangedKeys(beforeRecipientSnapshot, afterRecipientSnapshot).map(
            (key) => `recipient.${key}`,
          )
        : []),
      ...(hasRecipientSnapshot && shipment.country !== nextCountry ? ["country"] : []),
    ];

    await recordActivityHistory(supabase, session, {
      action: "shipment.party_corrected",
      entityType: "shipment",
      entityId: shipment.id,
      title: `Datos corregidos · ${shipment.code}`,
      description:
        changedFields.length > 0
          ? `Campos: ${changedFields.join(", ")}`
          : "Sin cambios detectados",
      metadata: {
        shipmentCode: shipment.code,
        changedFields,
        before: {
          customerName: beforeCustomerName,
          recipientSnapshot: beforeRecipientSnapshot,
          country: shipment.country,
        },
        after: {
          customerName: afterCustomerName,
          recipientSnapshot: afterRecipientSnapshot,
          country: nextCountry,
        },
        source: "venta.document_edit",
      },
    });

    const updated = await listShipmentById(supabase, session, shipment.id);
    return updated ? ok(updated) : ok(shipment);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function finalizeShipmentInvoiceAction(input: {
  shipmentId: string;
  amount?: string;
  cost?: string;
  paymentMethod?: PaymentMethod;
  paymentNote?: string;
}): Promise<ActionResult<ShipmentRow>> {
  try {
    const { session, supabase } = await requireShipmentActionContext("sales.manage");

    const { data: current, error: loadError } = await supabase
      .from("shipments")
      .select(SHIPMENT_SELECT)
      .eq("id", input.shipmentId)
      .eq("organization_id", session.organizationId)
      .single();

    if (loadError || !current) {
      return fail(loadError?.message || "Invoice no encontrado");
    }

    const shipment = mapShipment(current as unknown as ShipmentDbRow);
    const quote = readQuoteFromPlan(shipment.logistics_plan);
    const billing = readBillingFromPlan(shipment.logistics_plan);
    const cost = parseMoney(input.cost || quote?.cost || 0);
    const alreadyPaid = shipment.paid;
    const quotedTotal = billing
      ? parseMoney(billing.quotedTotal)
      : parseMoney(
          (quote as { total?: string | number } | null)?.total
            ?? "0",
        );
    const balanceDue = Math.max(quotedTotal - alreadyPaid, 0);

    if (balanceDue <= 0) {
      return fail("No hay pendiente en este invoice");
    }

    const collectAmount =
      input.amount !== undefined && input.amount.trim() !== ""
        ? parseMoney(input.amount)
        : balanceDue;

    if (collectAmount <= 0) {
      return fail("El monto debe ser mayor a cero");
    }

    if (collectAmount > balanceDue) {
      return fail(`El monto no puede superar ${formatMoneyValue(balanceDue)}`);
    }

    const isFullPayment = collectAmount >= balanceDue;
    const paid = alreadyPaid + collectAmount;
    const paymentMethod = readPaymentMethod(input.paymentMethod);
    const paymentNote = cleanPaymentNote(input.paymentNote);
    const nextBalanceDue = Math.max(quotedTotal - paid, 0);
    const nextInvoiceStatus = isFullPayment ? "paid" : "open";
    const nextAccountingStatus = isFullPayment ? "exportable" : shipment.accounting_status;
    const nextFinalizedAt = isFullPayment ? new Date().toISOString() : shipment.finalized_at;
    const paymentKind = billing
      ? invoicePaymentKindForCurrentDeposit({
          depositRequired: billing.depositRequired,
          alreadyPaid,
        })
      : "balance";
    const nextLogisticsPlan = {
      ...asRecord(shipment.logistics_plan),
      billing: billing
        ? {
            ...billing,
            depositStatus: depositStatusForPayment(billing.depositRequired, paid),
            payNow: formatMoneyValue(paid),
            balanceDue: formatMoneyValue(nextBalanceDue),
          }
        : {
            quotedTotal: formatMoneyValue(quotedTotal),
            payNow: formatMoneyValue(paid),
            balanceDue: formatMoneyValue(nextBalanceDue),
          },
    };

    const { error } = await supabase.rpc("collect_shipment_invoice_payment", {
      target_shipment_id: input.shipmentId,
      target_organization_id: session.organizationId,
      next_paid: paid,
      next_profit: isFullPayment ? Math.max(paid - cost, 0) : 0,
      next_sale_kind: shipment.sale_kind === "empty_box_deposit" ? "empty_box_deposit" : "full",
      next_invoice_status: nextInvoiceStatus,
      next_accounting_status: nextAccountingStatus,
      next_finalized_at: nextFinalizedAt,
      next_logistics_plan: nextLogisticsPlan,
      payment_amount: collectAmount,
      payment_method: paymentMethod,
      payment_kind: paymentKind,
      payment_note: paymentNote,
      payment_created_by: session.userId,
    });

    if (error) {
      return fail(error?.message || "No se pudo cobrar el invoice");
    }

    const updatedWithPayments = await listShipmentById(supabase, session, input.shipmentId);

    if (!updatedWithPayments) {
      return fail("No se pudo recargar el invoice");
    }

    await recordActivityHistory(supabase, session, {
      action: isFullPayment ? "sale.invoice_finalized" : "sale.invoice_partial_payment",
      entityType: "shipment",
      entityId: updatedWithPayments.id,
      title: isFullPayment
        ? `Invoice cobrado: ${updatedWithPayments.code}`
        : `Abono registrado: ${updatedWithPayments.code}`,
      description: isFullPayment
        ? `${updatedWithPayments.customer_name} · cobrado ${formatMoneyValue(collectAmount)} · ${paymentMethodLabel(paymentMethod)} · total ${formatMoneyValue(paid)}`
        : `${updatedWithPayments.customer_name} · abono ${formatMoneyValue(collectAmount)} · ${paymentMethodLabel(paymentMethod)} · pendiente ${formatMoneyValue(nextBalanceDue)}`,
      metadata: {
        paid,
        collectAmount,
        balanceDue: nextBalanceDue,
        quotedTotal,
        cost,
        profit: isFullPayment ? Math.max(paid - cost, 0) : 0,
        invoiceStatus: nextInvoiceStatus,
        accountingStatus: nextAccountingStatus,
        paymentMethod,
        paymentKind,
        paymentMethodLabel: paymentMethodLabel(paymentMethod),
        paymentNote,
      },
    });

    return ok(updatedWithPayments);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function updateShipmentInvoicePriorityAction(input: {
  shipmentId: string;
  priority: boolean;
}): Promise<ActionResult<ShipmentRow>> {
  try {
    const { session, supabase } = await requireShipmentActionContext("sales.manage");

    const before = await listShipmentById(supabase, session, input.shipmentId);
    if (!before) {
      return fail("Invoice no encontrado");
    }

    if (before.invoice_priority === input.priority) {
      return ok(before);
    }

    const { data, error } = await supabase
      .from("shipments")
      .update({ invoice_priority: input.priority })
      .eq("id", input.shipmentId)
      .eq("organization_id", session.organizationId)
      .select(SHIPMENT_SELECT)
      .single();

    if (error || !data) {
      return fail(error?.message || "No se pudo actualizar prioridad");
    }

    const updated = mapShipment(data as unknown as ShipmentDbRow);

    await recordActivityHistory(supabase, session, {
      action: "sale.invoice_priority_updated",
      entityType: "shipment",
      entityId: updated.id,
      title: `Prioridad invoice: ${updated.code}`,
      description: input.priority ? "Marcado como prioridad" : "Prioridad removida",
      metadata: {
        shipmentCode: updated.code,
        previousPriority: before.invoice_priority,
        nextPriority: updated.invoice_priority,
      },
    });

    return ok(updated);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function updateShipmentSalesOwnerAction(input: {
  shipmentId: string;
  salesOwnerId: string;
}): Promise<ActionResult<ShipmentRow>> {
  try {
    const session = await requireAppSession();

    if (!canChangeShipmentSalesOwner(session)) {
      throw new Error("FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const { data: owner, error: ownerError } = await supabase
      .from("profiles")
      .select("id, full_name, email, roles(slug)")
      .eq("id", input.salesOwnerId)
      .eq("organization_id", session.organizationId)
      .eq("is_active", true)
      .maybeSingle();

    if (ownerError) {
      return fail(ownerError.message);
    }

    const roleRow = owner?.roles as { slug: RoleSlug } | { slug: RoleSlug }[] | null | undefined;
    const role = Array.isArray(roleRow) ? roleRow[0] : roleRow;

    if (!owner || !isSalesOwnerRole(role?.slug)) {
      return fail("Vendedor no valido");
    }

    const before = await listShipmentById(supabase, session, input.shipmentId);

    await assertSameOrgProfileIds(supabase, session.organizationId, [input.salesOwnerId]);

    const { data, error } = await supabase
      .from("shipments")
      .update({ sales_owner_id: input.salesOwnerId })
      .eq("id", input.shipmentId)
      .eq("organization_id", session.organizationId)
      .select(SHIPMENT_SELECT)
      .single();

    if (error || !data) {
      return fail(error?.message || "No se pudo cambiar vendedor");
    }

    const updated = mapShipment(data as unknown as ShipmentDbRow);

    await recordActivityHistory(supabase, session, {
      action: "shipment.sales_owner_updated",
      entityType: "shipment",
      entityId: updated.id,
      title: `Vendedor · ${updated.code}`,
      description: `${before?.salesOwnerName || "Sin vendedor"} → ${updated.salesOwnerName}`,
      metadata: {
        shipmentCode: updated.code,
        previousSalesOwnerId: before?.salesOwnerId || null,
        nextSalesOwnerId: updated.salesOwnerId,
      },
    });

    return ok(updated);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
