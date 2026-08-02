export const SHIPMENT_JOURNAL_CATEGORIES = [
  { value: "customer", label: "Cliente" },
  { value: "sales", label: "Venta" },
  { value: "logistics", label: "Logística" },
  { value: "billing", label: "Cobro" },
  { value: "general", label: "Nota general" },
] as const;

export type ShipmentJournalCategory =
  (typeof SHIPMENT_JOURNAL_CATEGORIES)[number]["value"];
export type ShipmentJournalReminderState = "pending" | "completed" | "cancelled";
export type ShipmentJournalDueState = "none" | "pending" | "today" | "overdue";

export type ShipmentJournalEntry = {
  id: string;
  shipmentId: string;
  kind: "manual" | "system";
  category: ShipmentJournalCategory;
  title: string;
  body: string;
  details: Record<string, unknown>;
  source: string;
  actorId: string | null;
  actorName: string;
  assignedTo: string | null;
  assignedToName: string;
  followUpAt: string | null;
  reminderStatus: ShipmentJournalReminderState;
  dueState: ShipmentJournalDueState;
  createdAt: string;
  updatedAt: string;
  edited: boolean;
  deleted: boolean;
  deleteReason: string;
  canEdit: boolean;
  canDelete: boolean;
  canUpdateReminder: boolean;
};

export type ShipmentJournalAssignee = {
  id: string;
  label: string;
};

export function shipmentJournalCategoryLabel(value: ShipmentJournalCategory | string) {
  return SHIPMENT_JOURNAL_CATEGORIES.find((entry) => entry.value === value)?.label || "Nota";
}

export function shipmentJournalDisplayTitle(title: string, shipmentCode: string) {
  const normalizedTitle = String(title || "").trim();
  const normalizedCode = String(shipmentCode || "").trim();
  const repeatedSuffix = normalizedCode ? `: ${normalizedCode}` : "";

  return repeatedSuffix && normalizedTitle.endsWith(repeatedSuffix)
    ? normalizedTitle.slice(0, -repeatedSuffix.length)
    : normalizedTitle;
}

export function shipmentJournalDisplayBody(
  body: string,
  kind: ShipmentJournalEntry["kind"],
) {
  const normalizedBody = String(body || "").trim();
  if (kind !== "system") {
    return normalizedBody;
  }

  return normalizedBody
    .replace(/\s+\|\s+/g, "\n")
    .replace(
      /^Caja llena:\s*Recolecci[oó]n pendiente.*$/gim,
      "",
    )
    .replace(
      /^Caja vac[ií]a:\s*Programar entrega de caja vac[ií]a\s*-\s*/gim,
      "Entrega de caja vacía · ",
    )
    .replace(
      /\b(\d{4})-(\d{2})-(\d{2})\b/g,
      (_, year: string, month: string, day: string) => {
        const monthNames = [
          "enero",
          "febrero",
          "marzo",
          "abril",
          "mayo",
          "junio",
          "julio",
          "agosto",
          "septiembre",
          "octubre",
          "noviembre",
          "diciembre",
        ];
        const monthName = monthNames[Number(month) - 1];
        return monthName ? `${Number(day)} de ${monthName} de ${year}` : `${year}-${month}-${day}`;
      },
    )
    .replace(/\n{2,}/g, "\n")
    .trim();
}

export function shipmentJournalReminderBadge(
  entry: Pick<
    ShipmentJournalEntry,
    "followUpAt" | "reminderStatus" | "dueState"
  >,
) {
  if (!entry.followUpAt) return "";
  if (entry.reminderStatus === "completed") return "Completado";
  if (entry.reminderStatus === "cancelled") return "Cancelado";
  if (entry.dueState === "overdue") return "Vencido";
  if (entry.dueState === "today") return "Hoy";
  if (entry.dueState === "pending") return "Pendiente";
  return "";
}

export function shipmentJournalDueState(
  followUpAt: string | null,
  status: ShipmentJournalReminderState,
  now = new Date(),
): ShipmentJournalDueState {
  if (!followUpAt || status !== "pending") {
    return "none";
  }

  const due = new Date(followUpAt);
  if (Number.isNaN(due.getTime())) {
    return "none";
  }

  const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime();
  const nowDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (dueDay < nowDay) {
    return "overdue";
  }
  if (dueDay === nowDay) {
    return "today";
  }
  return "pending";
}

export function cleanShipmentJournalBody(value: unknown) {
  return String(value || "").replace(/\r\n/g, "\n").trim().slice(0, 4000);
}

export function readShipmentJournalCategory(value: unknown): ShipmentJournalCategory {
  const normalized = String(value || "general");
  return SHIPMENT_JOURNAL_CATEGORIES.some((entry) => entry.value === normalized)
    ? (normalized as ShipmentJournalCategory)
    : "general";
}

export function readShipmentJournalFollowUp(value: unknown) {
  const raw = String(value || "").trim();
  if (!raw) {
    return { ok: true as const, value: null };
  }
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return { ok: false as const, error: "La fecha del recordatorio no es válida" };
  }
  return { ok: true as const, value: date.toISOString() };
}
