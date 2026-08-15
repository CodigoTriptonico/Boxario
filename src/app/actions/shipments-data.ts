import { createScopedSupabase } from "@/lib/supabase/scoped";
import { computeInvoiceBilling, defaultInvoiceBillingConfig, readBillingFromPlan, type LogisticsAdditionalCharge } from "@/lib/invoice-billing";
import { formatMoneyValue } from "@/lib/logistics-fees";
import { promotionFromDbRow } from "@/lib/combo-rules";
import { DEFAULT_PAYMENT_METHOD, isPaymentMethod, type PaymentMethod } from "@/lib/payment-methods";
import { type ShipmentContactChannel, type ShipmentContactLogRow, type ShipmentContactOutcome } from "@/lib/shipment-contact-log";
import { formatBoxQuantityLabel } from "@/lib/shipment-display";
import { readPositiveIntegerQty } from "@/lib/security/qty";
import type { AppSession } from "@/lib/auth/types";
import type {
  DbShipment,
  DbShipmentLogisticsTask,
  DbShipmentPayment,
} from "@/lib/db";
import type { AccountingStatus, InvoiceStatus, LogisticsTaskStatus, LogisticsTaskType, ShipmentLogisticsTaskRow, ShipmentPaymentKind, ShipmentPaymentRow, ShipmentRow, ShipmentSaleKind, ShipmentStatus } from "@/lib/shipment-types";

/** Aligned with generated `shipment_logistics_tasks`; domain enums narrow string columns. */
export type LogisticsTaskDbRow = Omit<
  Pick<
    DbShipmentLogisticsTask,
    | "id"
    | "shipment_id"
    | "assigned_to"
    | "scheduled_at"
    | "requested_schedule_at"
    | "window_start_at"
    | "window_end_at"
    | "warehouse_id"
    | "notes"
    | "stock_deducted_at"
    | "completed_at"
    | "ordered_at"
    | "assigned_at"
    | "loaded_at"
    | "created_at"
  >,
  "task_type" | "status" | "schedule_confirmation_status" | "schedule_kind"
> & {
  task_type: LogisticsTaskType;
  status: LogisticsTaskStatus;
  schedule_confirmation_status?: "pending" | "confirmed" | null;
  schedule_kind: "exact" | "range" | "from" | null;
};

export type ShipmentPaymentDbRow = Omit<
  Pick<
    DbShipmentPayment,
    "id" | "shipment_id" | "amount" | "method" | "note" | "created_by" | "created_at"
  >,
  "kind"
> & {
  kind: ShipmentPaymentKind;
};

type ShipmentContactLogDbRow = {
  id: string;
  shipment_id: string;
  channel: ShipmentContactChannel;
  channel_other?: string | null;
  outcome: ShipmentContactOutcome;
  note: string | null;
  next_step: string | null;
  follow_up_at: string | null;
  created_by: string | null;
  created_by_profile?: ProfileLabelRow | ProfileLabelRow[] | null;
  created_at: string;
};

type ShipmentPartyDbRow = {
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
};

type ShipmentPackageDbRow = {
  id: string;
  invoice_marked_at?: string | null;
  invoice_pickup_confirmed_at?: string | null;
  invoice_incident_at?: string | null;
  invoice_incident_reason?: string | null;
};

type ShipmentCoreDbRow = Omit<
  Pick<
    DbShipment,
    | "id"
    | "code"
    | "customer_id"
    | "recipient_id"
    | "recipient_snapshot"
    | "customer_name"
    | "country"
    | "carrier"
    | "paid"
    | "profit"
    | "assigned_to"
    | "created_by"
    | "sales_owner_id"
    | "created_at"
    | "finalized_at"
    | "empty_box_delivered_at"
    | "full_box_collected_at"
    | "office_received_at"
    | "departed_at"
    | "shipped_at"
    | "delivered_at"
    | "delivery_notes"
    | "logistics_plan"
    | "invoice_priority"
    | "organization_id"
  >,
  "status" | "sale_kind" | "invoice_status" | "accounting_status" | "recipient_snapshot" | "logistics_plan"
> & {
  status: ShipmentStatus;
  sale_kind?: ShipmentSaleKind | null;
  invoice_status?: InvoiceStatus | null;
  accounting_status?: AccountingStatus | null;
  recipient_snapshot: Record<string, unknown> | null;
  logistics_plan: Record<string, unknown>;
};

/** Shipment select row: generated core columns plus nested relations from SHIPMENT_SELECT. */
export type ShipmentDbRow = ShipmentCoreDbRow & {
  customer?: ShipmentPartyDbRow | ShipmentPartyDbRow[] | null;
  sales_owner_profile?: ProfileLabelRow | ProfileLabelRow[] | null;
  shipment_logistics_tasks?: LogisticsTaskDbRow[] | null;
  shipment_payments?: ShipmentPaymentDbRow[] | null;
  shipment_contact_logs?: ShipmentContactLogDbRow[] | null;
  shipment_packages?: ShipmentPackageDbRow[] | null;
};

type ProfileLabelRow = {
  full_name?: string | null;
  email?: string | null;
};

type ShipmentQuote = {
  label: string;
  paid: string;
  cost: string;
  quantity: number;
};

export const SHIPMENT_SELECT = `
  id, code, customer_id, recipient_id, recipient_snapshot, customer_name, country, carrier, paid, profit, status, assigned_to,
  customer:customers!shipments_customer_id_fkey(first_name, last_name, phones, email, emails, street, house_number, neighborhood, city, state, postal_code, country, formatted_address),
  created_by, sales_owner_id, sales_owner_profile:profiles!shipments_sales_owner_id_fkey(full_name, email),
  sale_kind, invoice_status, invoice_priority, accounting_status, created_at, finalized_at,
  empty_box_delivered_at, full_box_collected_at, office_received_at, departed_at, shipped_at, delivered_at,
  delivery_notes, logistics_plan,
  shipment_logistics_tasks (
    id, shipment_id, task_type, status, assigned_to, scheduled_at, requested_schedule_at, schedule_confirmation_status, schedule_kind, window_start_at, window_end_at, warehouse_id,
    notes, stock_deducted_at, completed_at, ordered_at, assigned_at, loaded_at, created_at
  ),
  shipment_payments (
    id, shipment_id, amount, method, kind, note, created_by, created_at
  ),
  shipment_contact_logs (
    id, shipment_id, channel, channel_other, outcome, note, next_step, follow_up_at, created_by, created_at,
    created_by_profile:profiles!shipment_contact_logs_created_by_fkey(full_name, email)
  ),
  shipment_packages (
    id, invoice_marked_at, invoice_pickup_confirmed_at, invoice_incident_at, invoice_incident_reason
  )
`;

export function parseMoney(value: string | number | null | undefined) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  return Number(String(value || "").replace(/[^\d.-]/g, "")) || 0;
}

export async function authoritativeSaleQuote(
  supabase: NonNullable<Awaited<ReturnType<typeof createScopedSupabase>>>,
  organizationId: string,
  countryInput: string,
  planInput: Record<string, unknown>,
  actor?: Pick<AppSession, "userId" | "fullName" | "email">,
) {
  const { data: countries, error: countryError } = await supabase
    .from("pricing_countries")
    .select("id, code, name, pricing_country_boxes(size, price, cost, catalog_key)")
    .eq("organization_id", organizationId);
  if (countryError) throw new Error(countryError.message);
  const normalizedCountry = countryInput.trim().toLocaleLowerCase("es");
  const country = (countries || []).find((row) =>
    [row.code, row.name].some(
      (value) => String(value || "").trim().toLocaleLowerCase("es") === normalizedCountry,
    ),
  );
  if (!country) throw new Error("Pais sin tarifa vigente");

  const plan = asRecord(planInput);
  const emptyBoxPlan = asRecord(plan.emptyBox);
  const fullBoxPlan = asRecord(plan.fullBox);
  const emptyBoxDriver = Boolean(emptyBoxPlan.driverTaskNeeded);
  const fullBoxDriver = Boolean(fullBoxPlan.driverTaskNeeded);
  const { data: routeSettings, error: routeSettingsError } = await supabase
    .from("organization_route_settings")
    .select("minimum_deposit, pickup_included_enabled, pickup_included_days, late_pickup_fee")
    .eq("organization_id", organizationId)
    .maybeSingle();
  if (routeSettingsError) throw new Error(routeSettingsError.message);
  const feeSuggestions = {
    emptyBoxDeliveryFee: defaultInvoiceBillingConfig.emptyBoxDeliveryFee,
    fullBoxPickupFee: defaultInvoiceBillingConfig.fullBoxPickupFee,
    minimumDeposit:
      String(routeSettings?.minimum_deposit || defaultInvoiceBillingConfig.minimumDeposit),
    pickupIncludedEnabled: routeSettings?.pickup_included_enabled ?? true,
    pickupIncludedDays: Math.max(Number(routeSettings?.pickup_included_days) || 30, 1),
    latePickupFee: String(routeSettings?.late_pickup_fee || "$0"),
    logisticsFeeMode: "per_trip" as const,
  };
  const requestedAdjustments = asRecord(plan.feeAdjustments);

  function readAdditionalCharge(
    key: "emptyBoxDelivery" | "fullBoxPickup",
    driverParticipates: boolean,
  ): LogisticsAdditionalCharge & {
    suggestion: string;
    appliedBy: string | null;
    appliedByName: string;
    appliedAt: string | null;
  } {
    const requested = asRecord(requestedAdjustments[key]);
    const enabled = requested.enabled === true;
    if (enabled && !driverParticipates) {
      throw new Error("El cargo adicional solo aplica cuando participa un conductor");
    }
    const rawAmount = String(requested.amount || "").trim();
    if (enabled && !rawAmount) {
      throw new Error("Indica el importe del cargo logístico adicional");
    }
    if (enabled && !/^\$?\d+(?:\.\d{1,2})?$/.test(rawAmount)) {
      throw new Error("Importe de cargo logístico inválido");
    }
    const amount = enabled ? parseMoney(rawAmount) : 0;
    if (enabled && (!Number.isFinite(amount) || amount <= 0 || amount > 100000)) {
      throw new Error("Importe de cargo logístico inválido");
    }
    const reason = String(requested.reason || "").trim().slice(0, 500);
    if (enabled && !reason) {
      throw new Error("Indica la razón del cargo logístico adicional");
    }
    return {
      enabled,
      amount: formatMoneyValue(enabled ? amount : 0),
      reason: enabled ? reason : "",
      suggestion: "$0",
      appliedBy: enabled ? actor?.userId || null : null,
      appliedByName: enabled ? actor?.fullName || actor?.email || "" : "",
      appliedAt: enabled ? new Date().toISOString() : null,
    };
  }

  const feeAdjustments = {
    emptyBoxDelivery: readAdditionalCharge("emptyBoxDelivery", emptyBoxDriver),
    fullBoxPickup: readAdditionalCharge("fullBoxPickup", fullBoxDriver),
  };
  const rawLines = Array.isArray(plan.boxLines) && plan.boxLines.length
    ? plan.boxLines
    : [asRecord(plan.box)];
  const boxes = (country.pricing_country_boxes || []) as Array<{
    size: string;
    price: string;
    cost: string | null;
    catalog_key: string | null;
  }>;
  const lines = rawLines.map((raw) => {
    const line = asRecord(raw);
    const key = String(line.catalogKey || "").trim();
    const label = String(line.label || "").trim();
    const box = boxes.find((candidate) =>
      (key && candidate.catalog_key === key) ||
      candidate.size.trim().toLocaleLowerCase("es") === label.toLocaleLowerCase("es"),
    );
    const quantity = readPositiveIntegerQty(line.quantity || plan.boxCount || 1);
    if (!box || quantity > 100) throw new Error("Caja sin tarifa vigente");
    return {
      label: box.size,
      catalogKey: box.catalog_key || box.size,
      quantity,
      unitPrice: box.price,
      unitCost: box.cost || "$0",
    };
  });

  const { data: promotionRows, error: promotionError } = await supabase
    .from("pricing_promotions")
    .select("id, catalog_key, name, is_active, promotion_type, bundle_quantity, bundle_price, paid_quantity, discounted_quantity, discount_percent, rule_json, sort_order")
    .eq("organization_id", organizationId)
    .eq("country_id", country.id)
    .eq("is_active", true);
  if (promotionError) throw new Error(promotionError.message);
  const promotions = (promotionRows || []).map((row) =>
    promotionFromDbRow({
      id: row.id,
      countryName: country.name,
      name: row.name,
      active: row.is_active,
      catalog_key: row.catalog_key,
      sort_order: row.sort_order,
      rule_json: row.rule_json,
      legacy: row,
    }),
  );
  const requestedBilling = readBillingFromPlan(plan);
  const billing = computeInvoiceBilling({
    cartLines: lines,
    boxUnitPrice: lines[0]?.unitPrice || "$0",
    boxCount: lines.reduce((sum, line) => sum + line.quantity, 0),
    catalogKey: lines[0]?.catalogKey,
    emptyBoxDriver,
    fullBoxDriver,
    fees: feeSuggestions,
    additionalCharges: feeAdjustments,
    promotions,
    selectedPromotionId: requestedBilling?.promotion?.promotionId,
  });
  const cost = lines.reduce(
    (sum, line) => sum + parseMoney(line.unitCost) * line.quantity,
    0,
  );
  const securedLines = lines.map((line) => ({
    label: line.label,
    catalogKey: line.catalogKey,
    quantity: line.quantity,
    // Persist unit price. Legacy key `paid` remains for JSON compatibility with stored plans.
    unitPrice: line.unitPrice,
    paid: line.unitPrice,
    cost: line.unitCost,
  }));
  return {
    cost,
    total: parseMoney(billing.quotedTotal),
    plan: {
      ...plan,
      boxLines: securedLines,
      boxCount: securedLines.reduce((sum, line) => sum + line.quantity, 0),
      box: securedLines[0] || null,
      feeAdjustments,
      fees: {
        emptyBoxDelivery: billing.emptyBoxDelivery,
        fullBoxPickup: billing.fullBoxPickup,
        total: billing.logisticsSubtotal,
      },
      ...(billing.pickupIncludedDays > 0
        ? {
            pickupPolicy: {
              includedDays: billing.pickupIncludedDays,
              latePickupFee: billing.latePickupFeeConfigured,
              startsWhen: "empty_box_delivered_at",
              snapshottedAt: new Date().toISOString(),
            },
          }
        : {}),
      billing,
      quote: {
        total: billing.quotedTotal,
        cost: formatMoneyValue(cost),
      },
    },
  };
}

export function readPaymentMethod(value: unknown): PaymentMethod {
  if (value === undefined || value === null || value === "") {
    return DEFAULT_PAYMENT_METHOD;
  }

  if (isPaymentMethod(value)) {
    return value;
  }

  throw new Error("Forma de pago invalida");
}

export function cleanPaymentNote(value: unknown) {
  return String(value || "").trim().slice(0, 160);
}

export function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function readQuoteFromPlan(value: unknown): ShipmentQuote | null {
  const lines = readQuoteLinesFromPlan(value);

  if (lines.length) {
    return {
      label: lines.map((line) => formatBoxQuantityLabel(line.label, line.quantity)).join(" + "),
      paid: formatMoneyValue(
        lines.reduce((sum, line) => sum + parseMoney(line.paid) * line.quantity, 0),
      ),
      cost: formatMoneyValue(
        lines.reduce((sum, line) => sum + parseMoney(line.cost) * line.quantity, 0),
      ),
      quantity: lines.reduce((sum, line) => sum + line.quantity, 0),
    };
  }

  return null;
}

function readQuoteLinesFromPlan(value: unknown): ShipmentQuote[] {
  const plan = asRecord(value);
  const rawLines = Array.isArray(plan.boxLines) ? plan.boxLines : [];
  const boxLines = rawLines
    .map((entry) => {
      const line = asRecord(entry);
      const label = String(line.label || "").trim();

      if (!label) {
        return null;
      }

      return {
        label,
        paid: String(line.paid || "0"),
        cost: String(line.cost || "0"),
        quantity: Math.max(Number(line.quantity) || 1, 1),
      } satisfies ShipmentQuote;
    })
    .filter((line): line is ShipmentQuote => Boolean(line));

  if (boxLines.length) {
    return boxLines;
  }

  const box = asRecord(plan.box);
  const label = String(box.label || box.name || "").trim();

  if (!label) {
    return [];
  }

  return [
    {
      label,
      paid: String(box.paid || "0"),
      cost: String(box.cost || "0"),
      quantity: Math.max(Number(plan.boxCount) || 1, 1),
    },
  ];
}

export function mapTask(row: LogisticsTaskDbRow): ShipmentLogisticsTaskRow {
  return {
    id: row.id,
    shipmentId: row.shipment_id,
    taskType: row.task_type,
    status: row.status,
    assignedTo: row.assigned_to,
    scheduledAt: row.scheduled_at,
    requestedScheduleAt: row.requested_schedule_at || null,
    scheduleConfirmationStatus: row.schedule_confirmation_status || "confirmed",
    scheduleKind: row.schedule_kind || (row.scheduled_at ? "exact" : null),
    windowStartAt: row.window_start_at || row.scheduled_at,
    windowEndAt: row.window_end_at,
    warehouseId: row.warehouse_id,
    notes: row.notes || "",
    stockDeductedAt: row.stock_deducted_at,
    completedAt: row.completed_at,
    orderedAt: row.ordered_at,
    assignedAt: row.assigned_at,
    loadedAt: row.loaded_at,
    createdAt: row.created_at,
  };
}

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

function mapContactLog(row: ShipmentContactLogDbRow): ShipmentContactLogRow {
  return {
    id: row.id,
    shipmentId: row.shipment_id,
    channel: row.channel,
    channelOther: row.channel_other || "",
    outcome: row.outcome,
    note: row.note || "",
    nextStep: row.next_step || "",
    followUpAt: row.follow_up_at || null,
    createdBy: row.created_by || null,
    createdByName: profileLabel(row.created_by_profile) || "Sin vendedor",
    createdAt: row.created_at,
  };
}

function profileLabel(profile: ProfileLabelRow | ProfileLabelRow[] | null | undefined) {
  const row = Array.isArray(profile) ? profile[0] : profile;
  return ((row?.full_name || row?.email || "") as string).trim();
}

function customerPhone(row: ShipmentDbRow) {
  const customer = Array.isArray(row.customer) ? row.customer[0] : row.customer;
  const phones = Array.isArray(customer?.phones) ? customer.phones : [];
  return String(phones[0] || "").trim() || null;
}

function customerSearchText(row: ShipmentDbRow) {
  const customer = Array.isArray(row.customer) ? row.customer[0] : row.customer;

  if (!customer) {
    return null;
  }

  return [
    customer.first_name,
    customer.last_name,
    ...(Array.isArray(customer.phones) ? customer.phones : []),
    customer.email,
    ...(Array.isArray(customer.emails) ? customer.emails : []),
    customer.street,
    customer.house_number,
    customer.neighborhood,
    customer.city,
    customer.state,
    customer.postal_code,
    customer.country,
    customer.formatted_address,
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(" ");
}

export function mapShipment(row: ShipmentDbRow): ShipmentRow {
  const tasks = (row.shipment_logistics_tasks || [])
    .map(mapTask)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const payments = (row.shipment_payments || [])
    .map(mapPayment)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const contactLogs = (row.shipment_contact_logs || [])
    .map(mapContactLog)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const invoicePackages = row.shipment_packages || [];
  const invoiceBoxEvidence = invoicePackages.length
    ? {
        totalBoxes: invoicePackages.length,
        markedBoxes: invoicePackages.filter((pkg) => Boolean(pkg.invoice_marked_at)).length,
        pickupConfirmedBoxes: invoicePackages.filter((pkg) => Boolean(pkg.invoice_pickup_confirmed_at)).length,
        incidentBoxes: invoicePackages.filter((pkg) => Boolean(pkg.invoice_incident_at)).length,
        incidentReason: invoicePackages.find((pkg) => pkg.invoice_incident_reason)?.invoice_incident_reason || "",
      }
    : undefined;

  return {
    id: row.id,
    code: row.code,
    customerId: row.customer_id || null,
    recipientId: row.recipient_id || null,
    recipientSnapshot: row.recipient_snapshot || null,
    customerPhone: customerPhone(row),
    customerSearchText: customerSearchText(row),
    customer_name: row.customer_name,
    country: row.country,
    carrier: row.carrier,
    paid: Number(row.paid) || 0,
    profit: Number(row.profit) || 0,
    status: row.status,
    assigned_to: row.assigned_to,
    createdBy: row.created_by || null,
    salesOwnerId: row.sales_owner_id || null,
    salesOwnerName: profileLabel(row.sales_owner_profile) || "Sin vendedor",
    sale_kind: row.sale_kind || "full",
    invoice_status: row.invoice_status || (row.sale_kind === "empty_box_deposit" ? "open" : "paid"),
    invoice_priority: row.invoice_priority === true,
    accounting_status:
      row.accounting_status ||
      (row.sale_kind === "empty_box_deposit" ? "not_exportable" : "exportable"),
    created_at: row.created_at || null,
    finalized_at: row.finalized_at || null,
    empty_box_delivered_at: row.empty_box_delivered_at || null,
    full_box_collected_at: row.full_box_collected_at || null,
    office_received_at: row.office_received_at || null,
    departed_at: row.departed_at || null,
    shipped_at: row.shipped_at || null,
    delivered_at: row.delivered_at || null,
    delivery_notes: row.delivery_notes || "",
    logistics_plan: row.logistics_plan || {},
    invoiceBoxEvidence,
    logisticsTasks: tasks,
    payments,
    contactLogs,
  };
}

export async function listShipmentById(
  supabase: Awaited<ReturnType<typeof createScopedSupabase>>,
  session: AppSession,
  shipmentId: string,
) {
  if (!supabase) {
    return null;
  }

  const { data } = await supabase
    .from("shipments")
    .select(SHIPMENT_SELECT)
    .eq("id", shipmentId)
    .eq("organization_id", session.organizationId)
    .maybeSingle();

  return data ? mapShipment(data as unknown as ShipmentDbRow) : null;
}
