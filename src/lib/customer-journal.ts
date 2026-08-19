import {
  SHIPMENT_JOURNAL_CATEGORIES,
  shipmentJournalCategoryLabel,
  shipmentJournalDisplayBody,
  shipmentJournalDisplayTitle,
  type ShipmentJournalAssignee,
  type ShipmentJournalCategory,
  type ShipmentJournalDueState,
  type ShipmentJournalEntry,
  type ShipmentJournalReminderState,
} from "./shipment-journal";

export {
  SHIPMENT_JOURNAL_CATEGORIES,
  shipmentJournalCategoryLabel,
  shipmentJournalDisplayBody,
  shipmentJournalDisplayTitle,
};
export type {
  ShipmentJournalAssignee,
  ShipmentJournalCategory,
  ShipmentJournalDueState,
  ShipmentJournalEntry,
  ShipmentJournalReminderState,
};

export const CUSTOMER_JOURNAL_CHANNELS = [
  { value: "call", label: "Llamada telefónica", icon: "Phone" },
  { value: "whatsapp", label: "WhatsApp", icon: "MessageSquare" },
  { value: "sms", label: "SMS", icon: "MessageCircle" },
  { value: "email", label: "Correo electrónico", icon: "Mail" },
  { value: "note", label: "Nota interna", icon: "FileText" },
  { value: "other", label: "Otro canal", icon: "MoreHorizontal" },
] as const;

export type CustomerJournalChannel =
  (typeof CUSTOMER_JOURNAL_CHANNELS)[number]["value"];

export const CUSTOMER_JOURNAL_OUTCOMES = [
  { value: "answered", label: "Contestó / Contactado" },
  { value: "no_answer", label: "No contestó" },
  { value: "left_message", label: "Dejó mensaje" },
  { value: "call_back", label: "Volver a llamar" },
  { value: "agreement", label: "Acuerdo / Concretado" },
  { value: "wrong_number", label: "Número equivocado" },
  { value: "other", label: "Otro resultado" },
] as const;

export type CustomerJournalOutcome =
  (typeof CUSTOMER_JOURNAL_OUTCOMES)[number]["value"];

export type CustomerAddressSnapshot = {
  street?: string | null;
  houseNumber?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
  addressReference?: string | null;
  exactEntranceNote?: string | null;
  lat?: number | null;
  lng?: number | null;
};

export type CustomerTimelineShipmentItem = {
  kind: "shipment";
  id: string;
  code: string;
  createdAt: string;
  status: string;
  statusLabel: string;
  country: string;
  carrier: string;
  paid: number;
  saleKind: "full" | "empty_box_deposit";
  deliveryNotes: string;
  recipientId: string | null;
  recipientName: string | null;
  originAddress: CustomerAddressSnapshot;
  destinationAddress: CustomerAddressSnapshot;
};

export type CustomerTimelineJournalItem = {
  kind: "journal_entry";
  id: string;
  customerId: string;
  shipmentId: string | null;
  shipmentCode: string | null;
  entryKind: "manual" | "system";
  category: ShipmentJournalCategory;
  channel: CustomerJournalChannel | null;
  outcome: CustomerJournalOutcome | null;
  title: string;
  body: string;
  details: Record<string, unknown>;
  followUpAt: string | null;
  assignedTo: string | null;
  assignedToName: string;
  reminderStatus: ShipmentJournalReminderState;
  dueState: ShipmentJournalDueState;
  actorId: string | null;
  actorName: string;
  createdAt: string;
  updatedAt: string;
  edited: boolean;
  canEdit: boolean;
  canDelete: boolean;
};

export type CustomerTimelineActivityItem = {
  kind: "activity";
  id: string;
  action: string;
  title: string;
  description: string;
  actorId: string | null;
  actorName: string;
  createdAt: string;
  metadata: Record<string, unknown> | null;
};

export type CustomerTimelineItem =
  | CustomerTimelineShipmentItem
  | CustomerTimelineJournalItem
  | CustomerTimelineActivityItem;

export type CustomerProfileHeader = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phones: string[];
  emails: string[];
  street: string;
  houseNumber: string;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  addressReference: string;
  exactEntranceNote: string;
  exactEntranceLat: number | null;
  exactEntranceLng: number | null;
};

export type CustomerShipmentOption = {
  id: string;
  code: string;
  createdAt: string;
  status: string;
  statusLabel: string;
  recipientName: string | null;
};

export type CustomerJournalTimelinePayload = {
  customer: CustomerProfileHeader;
  timeline: CustomerTimelineItem[];
  shipments: CustomerShipmentOption[];
  assignees: ShipmentJournalAssignee[];
};

export function channelLabel(channel: CustomerJournalChannel | string | null | undefined) {
  if (!channel) return null;
  return (
    CUSTOMER_JOURNAL_CHANNELS.find((c) => c.value === channel)?.label || channel
  );
}

export function outcomeLabel(outcome: CustomerJournalOutcome | string | null | undefined) {
  if (!outcome) return null;
  return (
    CUSTOMER_JOURNAL_OUTCOMES.find((o) => o.value === outcome)?.label || outcome
  );
}

export function formatAddressSnapshot(addr: CustomerAddressSnapshot | null | undefined): string {
  if (!addr) return "Sin dirección";
  const parts = [
    [addr.street, addr.houseNumber].filter(Boolean).join(" "),
    addr.neighborhood,
    [addr.city, addr.state, addr.postalCode].filter(Boolean).join(", "),
    addr.country,
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(" · ") : "Sin dirección";
}

export function formatTimelineDate(dateStr?: string | null) {
  if (!dateStr) {
    return {
      dayOfWeek: "",
      date: "",
      fullDate: "",
      time: "",
      dateTime: "",
      full: "",
    };
  }
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      return {
        dayOfWeek: "",
        date: dateStr,
        fullDate: dateStr,
        time: "",
        dateTime: dateStr,
        full: dateStr,
      };
    }

    const rawWeekday = d.toLocaleDateString("es-MX", { weekday: "long" });
    const dayOfWeek = rawWeekday ? rawWeekday.charAt(0).toUpperCase() + rawWeekday.slice(1) : "";

    const date = d.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const fullDate = d.toLocaleDateString("es-MX", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const time = d.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    return {
      dayOfWeek,
      date,
      fullDate,
      time,
      dateTime: `${dayOfWeek}, ${date} · ${time}`,
      full: `${dayOfWeek}, ${fullDate} a las ${time}`,
    };
  } catch {
    return {
      dayOfWeek: "",
      date: dateStr || "",
      fullDate: dateStr || "",
      time: "",
      dateTime: dateStr || "",
      full: dateStr || "",
    };
  }
}

