"use server";

import type { ActivityHistoryRow } from "@/lib/activity-history-types";
import type {
  ShipmentRow,
} from "@/lib/shipment-types";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import { requireAppSession } from "@/lib/auth/session";
import {
  DEFAULT_PAYMENT_METHOD,
  isPaymentMethod,
  paymentMethodLabel,
  type PaymentMethod,
} from "@/lib/payment-methods";
import { resolveExpedienteSectionPermissions } from "@/lib/expediente-permissions";
import { depositStatusForPayment, readBillingFromPlan } from "@/lib/invoice-billing";
import { invoiceBoxCode } from "@/lib/invoice-child-codes";
import { logisticsScheduleExpressionFromWindow } from "@/lib/logistics-schedule-window";
import { formatMoneyValue, parseMoneyValue } from "@/lib/logistics-fees";
import { resolveOrganizationBrandingFromSession } from "@/lib/organizations/branding";
import { type PhysicalPackageStatus } from "@/lib/physical-packages";
import { formatScheduleAtDisplay } from "@/lib/sale/schedule-time";
import {
  buildExpedienteRecipientParty,
  buildExpedienteSaleSender,
  buildExpedienteSenderParty,
  logisticsLegModeLabel,
  mapExpedienteLogisticsTask,
  recipientRowToSaleRecipient,
  resolveExpedienteServiceOperation,
  snapshotToSaleRecipient,
  type ExpedienteFinancialView,
  type ExpedientePackageRow,
  type ShipmentExpedientePayload,
} from "@/lib/shipment-expediente";
import {
  invoiceStatusLabel,
  readBoxLinesFromLogisticsPlan,
  totalFromShipment,
  quoteFromShipment,
} from "@/lib/shipment-display";
import { shipmentVisibilityScope } from "@/lib/shipment-visibility";
import { consolidateShipmentActivityHistory } from "@/lib/shipment-step-history";
import { createScopedSupabase } from "@/lib/supabase/scoped";
import {
  mapTask,
  type LogisticsTaskDbRow,
  type ShipmentPaymentDbRow,
} from "@/app/actions/shipments-data";

type CustomerDbRow = {
  first_name?: string | null;
  last_name?: string | null;
  phones?: string[] | null;
  email?: string | null;
  emails?: string[] | null;
  street?: string | null;
  house_number?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
  formatted_address?: string | null;
  address_reference?: string | null;
};

type RecipientDbRow = CustomerDbRow & {
  phone?: string | null;
};

type PackageDbRow = {
  id: string;
  code: string;
  invoice_code?: string | null;
  country?: string | null;
  status?: PhysicalPackageStatus | null;
  collection_weight_kg?: number | null;
  intake_weight_kg?: number | null;
  provider_tracking_number?: string | null;
  invoice_incident_at?: string | null;
  invoice_incident_reason?: string | null;
};

type ShipmentPaymentRow = {
  id: string;
  shipmentId: string;
  amount: number;
  method: PaymentMethod;
  kind: "deposit" | "balance" | "full";
  note: string;
  createdBy: string | null;
  createdAt: string;
};

function mapPayment(row: ShipmentPaymentDbRow): ShipmentPaymentRow {
  return {
    id: row.id,
    shipmentId: row.shipment_id,
    amount: Number(row.amount) || 0,
    method: isPaymentMethod(row.method) ? row.method : DEFAULT_PAYMENT_METHOD,
    kind: row.kind,
    note: row.note || "",
    createdBy: row.created_by,
    createdAt: row.created_at,
  };
}

type ExpedienteShipmentDbRow = {
  id: string;
  code: string;
  customer_id?: string | null;
  recipient_id?: string | null;
  recipient_snapshot?: Record<string, unknown> | null;
  customer_name: string;
  country: string;
  carrier: string;
  paid: number | string | null;
  status: ShipmentExpedientePayload["status"];
  sale_kind?: ShipmentExpedientePayload["saleKind"] | null;
  invoice_status?: ShipmentExpedientePayload["financial"] extends infer T
    ? T extends { invoiceStatus: infer S }
      ? S
      : never
    : never;
  created_at?: string | null;
  sales_owner_id?: string | null;
  sales_owner_profile?: { full_name?: string | null; email?: string | null } | Array<{
    full_name?: string | null;
    email?: string | null;
  }> | null;
  logistics_plan?: Record<string, unknown> | null;
  customer?: CustomerDbRow | CustomerDbRow[] | null;
  recipient?: RecipientDbRow | RecipientDbRow[] | null;
  shipment_logistics_tasks?: LogisticsTaskDbRow[] | null;
  shipment_payments?: ShipmentPaymentDbRow[] | null;
  shipment_packages?: PackageDbRow[] | null;
};

const EXPEDIENTE_SHIPMENT_SELECT = `
  id, code, customer_id, recipient_id, recipient_snapshot, customer_name, country, carrier, paid,
  status, sale_kind, invoice_status, created_at, sales_owner_id, logistics_plan,
  customer:customers!shipments_customer_id_fkey(
    first_name, last_name, phones, email, emails, street, house_number, neighborhood, city, state,
    postal_code, country, formatted_address, address_reference
  ),
  recipient:customer_recipients!shipments_recipient_id_fkey(
    first_name, last_name, phone, email, emails, street, house_number, neighborhood, city, state,
    postal_code, country, formatted_address, address_reference
  ),
  sales_owner_profile:profiles!shipments_sales_owner_id_fkey(full_name, email),
  shipment_logistics_tasks (
    id, shipment_id, task_type, status, assigned_to, scheduled_at, requested_schedule_at,
    schedule_confirmation_status, schedule_kind, window_start_at, window_end_at, warehouse_id,
    notes, stock_deducted_at, completed_at, ordered_at, assigned_at, loaded_at, created_at
  ),
  shipment_payments (
    id, shipment_id, amount, method, kind, note, created_by, created_at
  ),
  shipment_packages (
    id, code, invoice_code, country, status, collection_weight_kg, intake_weight_kg,
    provider_tracking_number, invoice_incident_at, invoice_incident_reason
  )
`;

function firstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] || null : value;
}

function profileLabel(
  profile:
    | { full_name?: string | null; email?: string | null }
    | Array<{ full_name?: string | null; email?: string | null }>
    | null
    | undefined,
) {
  const row = firstRelation(profile);
  return String(row?.full_name || row?.email || "").trim();
}

function taskScheduleLabel(task: ReturnType<typeof mapTask>) {
  const expression = logisticsScheduleExpressionFromWindow({
    scheduledAt: task.scheduledAt,
    scheduleKind: task.scheduleKind,
    windowStartAt: task.windowStartAt,
    windowEndAt: task.windowEndAt,
  });

  if (expression) {
    return formatScheduleAtDisplay(expression);
  }

  if (task.requestedScheduleAt) {
    return `Fecha solicitada · ${formatScheduleAtDisplay(task.requestedScheduleAt.split("T")[0])}`;
  }

  return "Sin horario configurado";
}

function readFeeAdjustmentReason(plan: Record<string, unknown>) {
  const adjustments =
    plan.feeAdjustments && typeof plan.feeAdjustments === "object"
      ? (plan.feeAdjustments as Record<string, unknown>)
      : {};

  for (const key of ["emptyBoxDelivery", "fullBoxPickup"]) {
    const charge =
      adjustments[key] && typeof adjustments[key] === "object"
        ? (adjustments[key] as Record<string, unknown>)
        : null;
    const reason = String(charge?.reason || "").trim();
    if (reason) {
      return reason;
    }
  }

  return "";
}

function readFeeAdjustmentAdjusted(plan: Record<string, unknown>) {
  const adjustments =
    plan.feeAdjustments && typeof plan.feeAdjustments === "object"
      ? (plan.feeAdjustments as Record<string, unknown>)
      : {};

  return Object.values(adjustments).some((value) => {
    if (!value || typeof value !== "object") {
      return false;
    }

    const charge = value as Record<string, unknown>;
    return (
      charge.enabled === true &&
      parseMoneyValue(String(charge.amount || "$0")) !==
        parseMoneyValue(String(charge.suggestion || "$0"))
    );
  });
}

async function assertShipmentVisible(
  supabase: NonNullable<Awaited<ReturnType<typeof createScopedSupabase>>>,
  session: Awaited<ReturnType<typeof requireAppSession>>,
  shipmentId: string,
) {
  const scope = shipmentVisibilityScope(session);

  if (scope === "none") {
    throw new Error("FORBIDDEN");
  }

  let query = supabase
    .from("shipments")
    .select("id")
    .eq("id", shipmentId)
    .eq("organization_id", session.organizationId)
    .maybeSingle();

  if (scope === "driver") {
    query = supabase
      .from("shipments")
      .select("id")
      .eq("id", shipmentId)
      .eq("organization_id", session.organizationId)
      .eq("assigned_to", session.userId)
      .maybeSingle();
  } else if (scope === "sales_owner") {
    query = supabase
      .from("shipments")
      .select("id")
      .eq("id", shipmentId)
      .eq("organization_id", session.organizationId)
      .eq("sales_owner_id", session.userId)
      .maybeSingle();
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    throw new Error("NOT_FOUND");
  }
}

export async function loadShipmentExpedienteAction(
  shipmentId: string,
): Promise<ActionResult<ShipmentExpedientePayload>> {
  try {
    const session = await requireAppSession();
    const permissions = resolveExpedienteSectionPermissions(session);
    const supabase = await createScopedSupabase(session);

    if (!supabase) {
      return fail("Supabase no configurado");
    }

    await assertShipmentVisible(supabase, session, shipmentId);

    const { data, error } = await supabase
      .from("shipments")
      .select(EXPEDIENTE_SHIPMENT_SELECT)
      .eq("id", shipmentId)
      .eq("organization_id", session.organizationId)
      .maybeSingle();

    if (error) {
      return fail(error.message);
    }

    if (!data) {
      return fail("NOT_FOUND");
    }

    const row = data as unknown as ExpedienteShipmentDbRow;
    const customer = firstRelation(row.customer);
    const recipient = firstRelation(row.recipient);
    const logisticsPlan = row.logistics_plan || {};
    const billing = readBillingFromPlan(logisticsPlan);
    const boxLines = readBoxLinesFromLogisticsPlan(logisticsPlan).map((line) => ({
      label: line.label,
      quantity: line.quantity,
    }));
    const packages = (row.shipment_packages || []).slice();
    const boxCount = Math.max(packages.length, 1);
    const senderParty = buildExpedienteSenderParty({
      customerName: row.customer_name,
      customer,
    });
    const recipientParty = buildExpedienteRecipientParty({
      recipientSnapshot: row.recipient_snapshot,
      recipient,
    });
    const saleSender = buildExpedienteSaleSender({
      customerName: row.customer_name,
      customer,
    });
    const saleRecipient = row.recipient_snapshot
      ? snapshotToSaleRecipient(row.recipient_snapshot, row.country)
      : recipient
        ? recipientRowToSaleRecipient(recipient)
        : null;

    const sectionErrors: ShipmentExpedientePayload["sectionErrors"] = {};
    const tasks = (row.shipment_logistics_tasks || [])
      .map(mapTask)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

    const routeByTaskId = new Map<string, { routeName: string; driverId: string | null }>();
    let driverLabelById = new Map<string, string>();

    if (permissions.canViewLogistics && tasks.length) {
      const taskIds = tasks.map((task) => task.id);
      const [{ data: stops, error: stopsError }, { data: members, error: membersError }] =
        await Promise.all([
          supabase
            .from("logistics_route_stops")
            .select("task_id, logistics_routes(name, assigned_to, status)")
            .eq("organization_id", session.organizationId)
            .in("task_id", taskIds),
          supabase
            .from("profiles")
            .select("id, full_name, email")
            .eq("organization_id", session.organizationId),
        ]);

      if (stopsError) {
        sectionErrors.routes = "No se pudo cargar la ruta asignada.";
      } else {
        for (const stop of stops || []) {
          const route = firstRelation(
            (stop as { logistics_routes?: { name?: string; assigned_to?: string | null; status?: string } | Array<{ name?: string; assigned_to?: string | null; status?: string }> })
              .logistics_routes,
          );

          if (!route || route.status === "cancelled") {
            continue;
          }

          routeByTaskId.set(String((stop as { task_id?: string }).task_id), {
            routeName: String(route.name || "").trim() || "Ruta sin nombre",
            driverId: route.assigned_to || null,
          });
        }
      }

      if (membersError) {
        sectionErrors.routes = sectionErrors.routes || "No se pudo cargar el conductor asignado.";
      } else {
        driverLabelById = new Map(
          (members || []).map((member) => [
            String((member as { id: string }).id),
            String(
              (member as { full_name?: string | null; email?: string | null }).full_name ||
                (member as { full_name?: string | null; email?: string | null }).email ||
                "",
            ).trim(),
          ]),
        );
      }
    }

    const emptyLeg =
      logisticsPlan.emptyBox && typeof logisticsPlan.emptyBox === "object"
        ? (logisticsPlan.emptyBox as Record<string, unknown>)
        : null;
    const fullLeg =
      logisticsPlan.fullBox && typeof logisticsPlan.fullBox === "object"
        ? (logisticsPlan.fullBox as Record<string, unknown>)
        : null;

    const logistics = permissions.canViewLogistics
      ? {
          emptyBoxMode: logisticsLegModeLabel(emptyLeg, "empty_box"),
          fullBoxMode: logisticsLegModeLabel(fullLeg, "full_box"),
          tasks: tasks.map((task) => {
            const route = routeByTaskId.get(task.id);
            const driverId = task.assignedTo || route?.driverId || null;
            const driverLabel = driverId
              ? driverLabelById.get(driverId) || driverId
              : "Conductor no asignado";

            return mapExpedienteLogisticsTask(
              task,
              route?.routeName || "Pendiente de asignar",
              driverLabel,
              taskScheduleLabel(task),
            );
          }),
        }
      : null;

    let audit: ActivityHistoryRow[] | null = null;

    if (permissions.canViewAudit) {
      const { data: historyRows, error: historyError } = await supabase
        .from("activity_history")
        .select(
          "id, action, entity_type, entity_id, title, description, actor_name, created_at, metadata",
        )
        .eq("organization_id", session.organizationId)
        .eq("entity_type", "shipment")
        .eq("entity_id", shipmentId)
        .order("created_at", { ascending: false })
        .limit(100);

      if (historyError) {
        sectionErrors.audit = "No se pudo cargar la auditoría del envío.";
        audit = [];
      } else {
        audit = consolidateShipmentActivityHistory(
          (historyRows || []).map((entry) => ({
            id: String((entry as { id: string }).id),
            action: String((entry as { action: string }).action),
            entityType: String((entry as { entity_type: string }).entity_type),
            entityId: (entry as { entity_id?: string | null }).entity_id || null,
            title: String((entry as { title: string }).title),
            description: String((entry as { description: string }).description),
            actorName: String((entry as { actor_name: string }).actor_name),
            createdAt: String((entry as { created_at: string }).created_at),
            metadata: ((entry as { metadata?: Record<string, unknown> | null }).metadata ||
              {}) as Record<string, unknown>,
          })),
        );
      }
    }

    const packageRows: ExpedientePackageRow[] | null = permissions.canViewPackages
      ? packages.map((pkg, index) => {
          const invoiceCode =
            String(pkg.invoice_code || "").trim() || invoiceBoxCode(row.code, index);
          const line = boxLines[index] || boxLines[0];

          return {
            id: pkg.id,
            code: pkg.code,
            invoiceCode,
            position: index + 1,
            boxCount: Math.max(packages.length, 1),
            country: String(pkg.country || row.country),
            status: (pkg.status || "awaiting_full_box") as PhysicalPackageStatus,
            boxLabel: line?.label || row.carrier || "Caja",
            collectionWeightKg:
              typeof pkg.collection_weight_kg === "number" ? pkg.collection_weight_kg : null,
            intakeWeightKg: typeof pkg.intake_weight_kg === "number" ? pkg.intake_weight_kg : null,
            providerTrackingNumber: String(pkg.provider_tracking_number || "").trim(),
            invoiceIncidentReason: String(pkg.invoice_incident_reason || "").trim(),
            hasIncident: Boolean(pkg.invoice_incident_at),
          };
        })
      : null;

    if (permissions.canViewPackages && !packages.length) {
      sectionErrors.packages = "Este envío no tiene cajas físicas registradas.";
    }

    const shipmentRow = {
      id: row.id,
      code: row.code,
      customer_name: row.customer_name,
      country: row.country,
      carrier: row.carrier,
      paid: Number(row.paid) || 0,
      logistics_plan: logisticsPlan,
      invoice_status: row.invoice_status || "open",
    } as Pick<
      ShipmentRow,
      "id" | "code" | "customer_name" | "country" | "carrier" | "paid" | "logistics_plan" | "invoice_status"
    >;

    const quote = quoteFromShipment(shipmentRow as ShipmentRow);
    const financial: ExpedienteFinancialView | null = permissions.canViewFinancial
      ? {
          quotedTotal: billing
            ? billing.quotedTotal
            : formatMoneyValue(totalFromShipment(shipmentRow as ShipmentRow, quote)),
          paid: Number(row.paid) || 0,
          balanceDue: formatMoneyValue(
            Math.max(
              (billing
                ? parseMoneyValue(billing.quotedTotal)
                : totalFromShipment(shipmentRow as ShipmentRow, quote)) - (Number(row.paid) || 0),
              0,
            ),
          ),
          depositRequired: billing?.depositRequired || null,
          depositStatus: billing
            ? depositStatusForPayment(billing.depositRequired, Number(row.paid) || 0)
            : null,
          depositRemaining: billing
            ? formatMoneyValue(
                Math.max(
                  parseMoneyValue(billing.depositRequired) - (Number(row.paid) || 0),
                  0,
                ),
              )
            : null,
          invoiceStatus: row.invoice_status || "open",
          invoiceStatusLabel: invoiceStatusLabel(row.invoice_status || "open"),
          logisticsCharge:
            billing && parseMoneyValue(billing.logisticsSubtotal) > 0
              ? billing.logisticsSubtotal
              : null,
          logisticsChargeAdjusted: readFeeAdjustmentAdjusted(logisticsPlan),
          logisticsChargeReason: readFeeAdjustmentReason(logisticsPlan),
          promotionName: billing?.promotion?.name || null,
          promotionDiscount:
            billing && parseMoneyValue(billing.promotionDiscount) > 0
              ? billing.promotionDiscount
              : null,
          payments: (row.shipment_payments || [])
            .map(mapPayment)
            .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
            .map((payment: ShipmentPaymentRow) => ({
              id: payment.id,
              amount: payment.amount,
              method: paymentMethodLabel(payment.method),
              kind: payment.kind,
              note: payment.note,
              createdAt: payment.createdAt,
            })),
        }
      : null;

    const documentPackages = packages.map((pkg, index) => {
      const invoiceCode =
        String(pkg.invoice_code || "").trim() || invoiceBoxCode(row.code, index);
      const line = boxLines[index] || boxLines[0];

      return {
        packageId: pkg.id,
        invoiceCode,
        position: index + 1,
        boxCount: Math.max(packages.length, 1),
        boxLabel: line?.label || row.carrier || "Caja",
        box: [line?.label || row.carrier || "Caja", line ? String(line.quantity) : "1"],
      };
    });

    return ok({
      shipmentId: row.id,
      code: row.code,
      status: row.status,
      saleKind: row.sale_kind || "full",
      country: row.country,
      carrier: row.carrier,
      createdAt: row.created_at || null,
      organizationName: session.organizationName,
      organizationBranding: resolveOrganizationBrandingFromSession(session),
      salesOwnerName: profileLabel(row.sales_owner_profile) || "Sin vendedor",
      boxCount,
      permissions,
      sender: senderParty,
      recipient: recipientParty,
      documents: {
        billing,
        boxLines,
        serviceOperation: resolveExpedienteServiceOperation(logisticsPlan),
        sender: saleSender,
        recipient: saleRecipient,
        packages: documentPackages,
      },
      financial,
      logistics,
      packages: packageRows,
      audit,
      sectionErrors,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "NOT_FOUND") {
      return fail("NOT_FOUND");
    }

    return fail(actionErrorMessage(error));
  }
}
