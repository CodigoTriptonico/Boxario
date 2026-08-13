import {
  PENDING_EMPTY_BOX_STATUS,
  PENDING_FULL_BOX_STATUS,
  PENDING_SHIPMENT_STATUSES,
  TRANSIT_SHIPMENT_STATUSES,
} from "@/lib/shipment-display/constants";
import { shipmentLogisticsSteps } from "@/lib/shipment-display/progress";
import { legDriverTaskOrdered } from "@/lib/shipment-display/shared";
import type {
  ShipmentLogisticsTaskRow,
  ShipmentProgressStep,
  ShipmentRow,
  ShipmentStatus,
} from "@/lib/shipment-types";

export type EnviosStatusFilterBucket =
  | "recolecciones"
  | "entregas"
  | "en_oficina"
  | "en_transito"
  | "en_destino_final";

export type EnviosStatusFilterValue =
  | Exclude<EnviosStatusFilterBucket, "en_destino_final">
  | "recolecciones_sin_orden"
  | "recolecciones_solicitadas"
  | "entregas_sin_orden"
  | "entregas_solicitadas";

export type EnviosStatusFilterOption = {
  value: EnviosStatusFilterValue;
  label: string;
  children?: ReadonlyArray<{
    value: EnviosStatusFilterValue;
    label: string;
  }>;
};

/** Primero la pierna (dejar/recoger); dentro, pendiente vs ya en Logística. */
export const ENVIOS_STATUS_FILTER_OPTIONS: ReadonlyArray<EnviosStatusFilterOption> = [
  {
    value: "recolecciones",
    label: "Recolecciones",
    children: [
      { value: "recolecciones_sin_orden", label: "Pendientes" },
      { value: "recolecciones_solicitadas", label: "En logística" },
    ],
  },
  {
    value: "entregas",
    label: "Entregas",
    children: [
      { value: "entregas_sin_orden", label: "Pendientes" },
      { value: "entregas_solicitadas", label: "En logística" },
    ],
  },
  { value: "en_oficina", label: "En oficina" },
  { value: "en_transito", label: "En tránsito" },
];

export function enviosStatusFilterDisplayLabel(value: string) {
  const clean = value.trim();
  if (!clean) {
    return "";
  }

  switch (clean as EnviosStatusFilterValue) {
    case "recolecciones":
      return "Recolecciones";
    case "recolecciones_sin_orden":
      return "Recolección pendiente";
    case "recolecciones_solicitadas":
      return "Recolección en logística";
    case "entregas":
      return "Entregas";
    case "entregas_sin_orden":
      return "Entrega pendiente";
    case "entregas_solicitadas":
      return "Entrega en logística";
    case "en_oficina":
      return "En oficina";
    case "en_transito":
      return "En tránsito";
    default:
      break;
  }

  for (const option of ENVIOS_STATUS_FILTER_OPTIONS) {
    if (option.value === clean) {
      return option.label;
    }
  }

  return clean;
}

const ENVIOS_STATUS_BUCKET_LABEL: Record<
  EnviosStatusFilterBucket,
  string
> = {
  recolecciones: "Recolecciones",
  entregas: "Entregas",
  en_oficina: "En oficina",
  en_transito: "En tránsito",
  en_destino_final: "Entregado",
};

export function isCompletedShipment(row: ShipmentRow) {
  return row.status === "Entregado";
}

export function isActiveShipment(row: ShipmentRow) {
  return row.status !== "Entregado";
}

export type EnviosClientMode = "tracking" | "history";

export function filterShipmentsForEnviosMode(
  shipments: ShipmentRow[],
  mode: EnviosClientMode,
) {
  return shipments.filter((row) =>
    mode === "tracking"
      ? isActiveShipment(row)
      : isCompletedShipment(row),
  );
}

function normalizeEnviosSearchText(value: unknown) {
  return String(value || "")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-MX")
    .replace(/\s+/g, " ")
    .trim();
}

function digitsOnly(value: unknown) {
  return String(value || "").replace(/\D/g, "");
}

function primitiveSearchValues(
  value: unknown,
  seen = new WeakSet<object>(),
): string[] {
  if (value === null || value === undefined) {
    return [];
  }

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    return [String(value)];
  }

  if (Array.isArray(value)) {
    return value.flatMap((entry) =>
      primitiveSearchValues(entry, seen),
    );
  }

  if (typeof value === "object") {
    if (seen.has(value)) {
      return [];
    }

    seen.add(value);
    return Object.values(value).flatMap((entry) =>
      primitiveSearchValues(entry, seen),
    );
  }

  return [];
}

export function matchesEnviosSearchQuery(
  row: ShipmentRow,
  query: string,
) {
  const cleanQuery = normalizeEnviosSearchText(query);
  const queryDigits = digitsOnly(query);

  if (!cleanQuery && !queryDigits) {
    return true;
  }

  const fields = [
    row.id,
    row.code,
    row.customer_name,
    row.customerPhone,
    row.customerSearchText,
    row.carrier,
    row.country,
    row.status,
    row.salesOwnerName,
    row.delivery_notes,
    row.invoice_status,
    row.accounting_status,
    ...primitiveSearchValues(row.recipientSnapshot),
    ...primitiveSearchValues(row.logistics_plan),
    ...primitiveSearchValues(row.logisticsTasks),
    ...primitiveSearchValues(row.payments),
    ...primitiveSearchValues(row.contactLogs),
  ];
  const haystack = normalizeEnviosSearchText(fields.join(" "));
  const haystackDigits = digitsOnly(fields.join(" "));
  const queryIsDigitsOnly =
    Boolean(queryDigits) && digitsOnly(cleanQuery) === queryDigits;

  if (queryIsDigitsOnly) {
    return (
      haystackDigits.includes(queryDigits) ||
      haystack.includes(cleanQuery)
    );
  }

  return cleanQuery
    .split(" ")
    .filter(Boolean)
    .every((term) => haystack.includes(term));
}

function classifyEnviosStatusFilterBucket(
  row: ShipmentRow,
): EnviosStatusFilterBucket {
  if (row.status === "Entregado") {
    return "en_destino_final";
  }

  if (row.status === "Enviado" || row.status === "Pickup") {
    return "en_transito";
  }

  if (row.status === "En oficina") {
    return "en_oficina";
  }

  if (row.status === PENDING_FULL_BOX_STATUS) {
    return "recolecciones";
  }

  if (row.status === PENDING_EMPTY_BOX_STATUS) {
    return "entregas";
  }

  const active = shipmentLogisticsSteps(row).find(
    (step) => step.state === "active",
  );

  if (!active) {
    return "entregas";
  }

  switch (active.kind) {
    case "full_box":
      return "recolecciones";
    case "empty_box":
      return "entregas";
    case "office":
      return "en_oficina";
    case "pickup":
    case "transit":
    case "delivered":
      return "en_transito";
    default:
      return "entregas";
  }
}

function isActiveHomeLegPending(row: ShipmentRow) {
  const bucket = classifyEnviosStatusFilterBucket(row);

  if (bucket === "entregas") {
    return !legDriverTaskOrdered(row, "deliver_empty_box");
  }

  if (bucket === "recolecciones") {
    return !legDriverTaskOrdered(row, "pickup_full_box");
  }

  return false;
}

function isActiveHomeLegInLogistics(row: ShipmentRow) {
  const bucket = classifyEnviosStatusFilterBucket(row);

  if (bucket === "entregas") {
    return legDriverTaskOrdered(row, "deliver_empty_box");
  }

  if (bucket === "recolecciones") {
    return legDriverTaskOrdered(row, "pickup_full_box");
  }

  return false;
}

/** Tone of the active home leg for list surfaces (card/row). */
export type EnviosActiveLegLogisticsTone = "pending" | "in_logistics" | null;

export function enviosActiveLegLogisticsTone(
  row: ShipmentRow,
): EnviosActiveLegLogisticsTone {
  if (isActiveHomeLegPending(row)) {
    return "pending";
  }
  if (isActiveHomeLegInLogistics(row)) {
    return "in_logistics";
  }
  return null;
}

/** Full-surface wash so pendiente vs en logística reads at card scale. */
export function enviosActiveLegLogisticsToneClass(
  tone: EnviosActiveLegLogisticsTone,
) {
  if (tone === "pending") {
    return "bg-amber-900/40";
  }
  if (tone === "in_logistics") {
    return "bg-sky-900/40";
  }
  return "";
}

export function matchesEnviosStatusFilter(
  row: ShipmentRow,
  filter: string,
) {
  const clean = filter.trim();

  if (!clean) {
    return true;
  }

  const bucket = classifyEnviosStatusFilterBucket(row);

  if (clean === bucket) {
    return true;
  }

  if (clean === "entregas_sin_orden") {
    return bucket === "entregas" && !legDriverTaskOrdered(row, "deliver_empty_box");
  }

  if (clean === "entregas_solicitadas") {
    return bucket === "entregas" && legDriverTaskOrdered(row, "deliver_empty_box");
  }

  if (clean === "recolecciones_sin_orden") {
    return bucket === "recolecciones" && !legDriverTaskOrdered(row, "pickup_full_box");
  }

  if (clean === "recolecciones_solicitadas") {
    return (
      bucket === "recolecciones" && legDriverTaskOrdered(row, "pickup_full_box")
    );
  }

  return false;
}

export function isPendingShipmentStatus(
  status: ShipmentStatus,
): boolean {
  return (PENDING_SHIPMENT_STATUSES as readonly string[]).includes(
    status,
  );
}

function isTransitShipmentStatus(status: ShipmentStatus): boolean {
  return (TRANSIT_SHIPMENT_STATUSES as readonly string[]).includes(
    status,
  );
}

type ResolvePendingShipmentStatusInput = Pick<
  ShipmentRow,
  "sale_kind" | "logistics_plan" | "logisticsTasks" | "delivery_notes"
> &
  Partial<
    Pick<
      ShipmentRow,
      "empty_box_delivered_at" | "full_box_collected_at" | "status"
    >
  >;

function draftShipmentRowForStatusResolve(
  input: ResolvePendingShipmentStatusInput,
): ShipmentRow {
  return {
    id: "",
    code: "",
    customerId: null,
    recipientId: null,
    recipientSnapshot: null,
    customer_name: "",
    country: "",
    carrier: "",
    paid: 0,
    profit: 0,
    status: input.status ?? PENDING_EMPTY_BOX_STATUS,
    assigned_to: null,
    createdBy: null,
    salesOwnerId: null,
    salesOwnerName: "",
    sale_kind: input.sale_kind,
    invoice_status: "open",
    invoice_priority: false,
    accounting_status: "not_exportable",
    created_at: null,
    finalized_at: null,
    empty_box_delivered_at:
      input.empty_box_delivered_at ?? null,
    full_box_collected_at:
      input.full_box_collected_at ?? null,
    office_received_at: null,
    departed_at: null,
    shipped_at: null,
    delivered_at: null,
    delivery_notes: input.delivery_notes ?? "",
    logistics_plan: input.logistics_plan,
    logisticsTasks: input.logisticsTasks,
    payments: [],
  };
}

export function sortShipmentsByInvoicePriority<
  T extends Pick<ShipmentRow, "invoice_priority" | "created_at">,
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    if (a.invoice_priority !== b.invoice_priority) {
      return a.invoice_priority ? -1 : 1;
    }

    return String(b.created_at || "").localeCompare(
      String(a.created_at || ""),
    );
  });
}

/** Newest invoices first (arrival / creation order). */
export function sortShipmentsByArrivalOrder<
  T extends Pick<ShipmentRow, "id" | "created_at">,
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const byCreated = String(b.created_at || "").localeCompare(
      String(a.created_at || ""),
    );
    if (byCreated !== 0) {
      return byCreated;
    }

    return String(b.id).localeCompare(String(a.id));
  });
}

/** Keeps order when the visible id set is unchanged (e.g. toggling invoice_priority). */
export function reconcileShipmentDisplayOrderIds<
  T extends Pick<ShipmentRow, "id" | "created_at">,
>(
  previousOrderIds: string[],
  rows: T[],
  options: { reset?: boolean } = {},
): string[] {
  if (options.reset || previousOrderIds.length === 0) {
    return sortShipmentsByArrivalOrder(rows).map((row) => row.id);
  }

  const rowIdSet = new Set(rows.map((row) => row.id));
  const kept = previousOrderIds.filter((id) => rowIdSet.has(id));

  if (
    kept.length === rows.length &&
    kept.length === previousOrderIds.length
  ) {
    return kept;
  }

  const keptSet = new Set(kept);
  const arrivals = sortShipmentsByArrivalOrder(rows);
  const added = arrivals
    .filter((row) => !keptSet.has(row.id))
    .map((row) => row.id);

  if (added.length === 0) {
    return kept;
  }

  const rank = new Map(
    arrivals.map((row, index) => [row.id, index]),
  );
  const merged = [...kept];

  for (const id of added) {
    const idRank = rank.get(id) ?? merged.length;
    let insertAt = merged.length;

    for (let index = 0; index < merged.length; index += 1) {
      const existingRank =
        rank.get(merged[index]!) ?? Number.MAX_SAFE_INTEGER;
      if (idRank < existingRank) {
        insertAt = index;
        break;
      }
    }

    merged.splice(insertAt, 0, id);
  }

  return merged;
}

/** Keeps the current visual order while rows update (e.g. toggling invoice_priority). */
export function orderShipmentsByStableIds<
  T extends Pick<ShipmentRow, "id">,
>(rows: T[], orderIds: string[]): T[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const ordered: T[] = [];
  const seen = new Set<string>();

  for (const id of orderIds) {
    const row = byId.get(id);
    if (!row) {
      continue;
    }

    ordered.push(row);
    seen.add(id);
  }

  for (const row of rows) {
    if (!seen.has(row.id)) {
      ordered.push(row);
    }
  }

  return ordered;
}

export function resolvePendingShipmentStatus(
  input: ResolvePendingShipmentStatusInput | ShipmentRow,
): ShipmentStatus {
  const row =
    "id" in input && input.id
      ? (input as ShipmentRow)
      : draftShipmentRowForStatusResolve(input);
  const steps = shipmentLogisticsSteps(row);
  const active = steps.find((step) => step.state === "active");

  if (active?.kind === "empty_box") {
    return PENDING_EMPTY_BOX_STATUS;
  }

  if (active?.kind === "full_box") {
    return PENDING_FULL_BOX_STATUS;
  }

  if (!row.empty_box_delivered_at) {
    return PENDING_EMPTY_BOX_STATUS;
  }

  if (row.sale_kind === "full" && !row.full_box_collected_at) {
    return PENDING_FULL_BOX_STATUS;
  }

  return PENDING_EMPTY_BOX_STATUS;
}

export function resolveInitialShipmentStatus(input: {
  saleKind: ShipmentRow["sale_kind"];
  logisticsPlan: Record<string, unknown>;
  logisticsTasks?: ShipmentLogisticsTaskRow[];
  deliveryNotes?: string;
  emptyBoxDeliveredAt?: string | null;
}): ShipmentStatus {
  return resolvePendingShipmentStatus({
    sale_kind: input.saleKind,
    logistics_plan: input.logisticsPlan,
    logisticsTasks: input.logisticsTasks ?? [],
    delivery_notes: input.deliveryNotes ?? "",
    empty_box_delivered_at: input.emptyBoxDeliveredAt ?? null,
  });
}

export function syncShipmentStatusPatch(
  row: ShipmentRow,
): Partial<Pick<ShipmentRow, "status">> {
  if (
    isTransitShipmentStatus(row.status) ||
    row.status === "Entregado"
  ) {
    return {};
  }

  const nextStatus = resolvePendingShipmentStatus(row);

  if (row.status === nextStatus) {
    return {};
  }

  return { status: nextStatus };
}

export function shipmentStatusDisplayLabel(
  status: ShipmentStatus,
): string {
  if (status === "Enviado") {
    return "En tránsito";
  }

  if (status === "Pickup") {
    return "Pendiente salida";
  }

  return status;
}

export function shipmentOperationalStatusLabel(
  row: ShipmentRow,
): string {
  return ENVIOS_STATUS_BUCKET_LABEL[
    classifyEnviosStatusFilterBucket(row)
  ];
}

export function shipmentOperationalDetailLabel(
  step: ShipmentProgressStep | null | undefined,
) {
  const detail = step?.detail.trim() || "";
  const normalized = detail.toLocaleLowerCase("es-MX");

  if (
    normalized === "chofer asignado" ||
    normalized.startsWith("pendiente entrega") ||
    normalized.startsWith("pendiente recolección") ||
    normalized.startsWith("pendiente recoleccion")
  ) {
    return "";
  }

  return detail;
}
