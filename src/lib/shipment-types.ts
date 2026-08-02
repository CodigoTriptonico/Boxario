import type { RoleSlug } from "@/lib/auth/types";
import type { PaymentMethod } from "@/lib/payment-methods";
import type { ShipmentContactLogRow } from "@/lib/shipment-contact-log";

export type ShipmentStatus =
  | "Pendiente entrega caja vacía"
  | "Pendiente recolección caja llena"
  | "En oficina"
  | "Pickup"
  | "Enviado"
  | "Entregado";

export type ShipmentSaleKind = "full" | "empty_box_deposit";
export type InvoiceStatus = "open" | "paid" | "void";
export type AccountingStatus = "not_exportable" | "exportable";

export type LogisticsTaskType = "deliver_empty_box" | "pickup_full_box";
export type LogisticsTaskStatus =
  | "pending"
  | "scheduled"
  | "assigned"
  | "loaded_to_truck"
  | "completed"
  | "cancelled";

export type ShipmentPaymentKind = "deposit" | "balance" | "full";

export type ShipmentPaymentRow = {
  id: string;
  shipmentId: string;
  amount: number;
  method: PaymentMethod;
  kind: ShipmentPaymentKind;
  note: string;
  createdBy: string | null;
  createdAt: string;
};

export type ShipmentLogisticsTaskRow = {
  id: string;
  shipmentId: string;
  taskType: LogisticsTaskType;
  status: LogisticsTaskStatus;
  assignedTo: string | null;
  scheduledAt: string | null;
  requestedScheduleAt?: string | null;
  scheduleConfirmationStatus?: "pending" | "confirmed";
  scheduleKind?: "exact" | "range" | "from" | null;
  windowStartAt?: string | null;
  windowEndAt?: string | null;
  warehouseId: string | null;
  notes: string;
  stockDeductedAt: string | null;
  completedAt: string | null;
  orderedAt: string | null;
  assignedAt: string | null;
  loadedAt: string | null;
  createdAt: string;
};

export type ShipmentRow = {
  id: string;
  code: string;
  customerId: string | null;
  recipientId: string | null;
  recipientSnapshot: Record<string, unknown> | null;
  customerPhone?: string | null;
  customerSearchText?: string | null;
  customer_name: string;
  country: string;
  carrier: string;
  paid: number;
  profit: number;
  status: ShipmentStatus;
  assigned_to: string | null;
  createdBy: string | null;
  salesOwnerId: string | null;
  salesOwnerName: string;
  sale_kind: ShipmentSaleKind;
  invoice_status: InvoiceStatus;
  invoice_priority: boolean;
  accounting_status: AccountingStatus;
  created_at: string | null;
  finalized_at: string | null;
  empty_box_delivered_at: string | null;
  full_box_collected_at: string | null;
  office_received_at: string | null;
  departed_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  delivery_notes: string;
  logistics_plan: Record<string, unknown>;
  invoiceBoxEvidence?: {
    totalBoxes: number;
    markedBoxes: number;
    pickupConfirmedBoxes: number;
    incidentBoxes: number;
    incidentReason: string;
  };
  logisticsTasks: ShipmentLogisticsTaskRow[];
  payments: ShipmentPaymentRow[];
  contactLogs?: ShipmentContactLogRow[];
  /** Returned only by the atomic creation command; never selected from storage. */
  publicTrackingToken?: string;
  publicTrackingExpiresAt?: string;
};

export type CreateShipmentResult = ShipmentRow & {
  stockWarning?: string;
};

export type RouteMemberRow = {
  id: string;
  label: string;
  roleSlug: RoleSlug;
};

export type SalesOwnerRow = {
  id: string;
  label: string;
  roleSlug: RoleSlug;
};

export type CreateLogisticsTaskInput = {
  taskType: LogisticsTaskType;
  status?: LogisticsTaskStatus;
  scheduledAt?: string | null;
  /** A seller knows the route day, but Logistics still owns the route and time. */
  requestedRouteDate?: string | null;
  warehouseId?: string | null;
  notes?: string;
};

type ShipmentProgressStepState = "done" | "active" | "pending";

export type ShipmentProgressKind =
  | "sale"
  | "empty_box"
  | "full_box"
  | "payment"
  | "office"
  | "pickup"
  | "transit"
  | "delivered";

export type ShipmentProgressChannel = "office" | "home" | "neutral";

export type ShipmentProgressStep = {
  id: string;
  title: string;
  detail: string;
  state: ShipmentProgressStepState;
  kind: ShipmentProgressKind;
  channel: ShipmentProgressChannel;
  channelLabel?: string;
  awaitingOrder?: boolean;
  driverTaskOrdered?: boolean;
  scheduleChanged?: boolean;
};
