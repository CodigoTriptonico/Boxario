import type {
  InventoryMovementAuditFields,
  InventoryMovementEvidence,
  InventoryMovementReasonCode,
  InventoryMovementReferenceType,
  ManualInventoryMovementType,
} from "@/lib/inventory-movement-contracts";

export type {
  InventoryMovementEvidence,
  InventoryMovementLocationType,
  InventoryMovementReasonCode,
  InventoryMovementReferenceType,
  ManualInventoryMovementType,
} from "@/lib/inventory-movement-contracts";

export const inventoryMovementReasonLabel: Record<InventoryMovementReasonCode, string> = {
  unspecified: "Sin clasificar",
  manual_entry: "Compra o recepción",
  manual_exit: "Salida manual",
  physical_count: "Conteo físico",
  sale_fulfillment: "Venta / envío",
  warehouse_transfer_out: "Transferencia (salida)",
  warehouse_transfer_in: "Transferencia (entrada)",
  warehouse_transfer_cancel: "Transferencia cancelada",
  assignment_issue: "Asignación a empleado",
  assignment_return: "Devolución de asignación",
  assignment_consume: "Consumo interno",
  assignment_damage: "Daño",
  assignment_loss: "Pérdida",
  agency_delivery: "Entrega a agencia",
  correction_reversal: "Reverso",
  other: "Otro",
};

const inventoryMovementReferenceLabel: Record<InventoryMovementReferenceType, string> = {
  shipment: "Envío",
  assignment: "Asignación",
  warehouse_transfer: "Transferencia",
  sale_reservation: "Reserva de venta",
  agency_visit: "Visita a agencia",
  physical_count: "Conteo físico",
  manual: "Manual",
};

const manualMovementReasonCodesByType: Record<
  ManualInventoryMovementType,
  InventoryMovementReasonCode[]
> = {
  entrada: ["manual_entry", "other"],
  salida: [
    "manual_exit",
    "assignment_damage",
    "assignment_loss",
    "assignment_consume",
    "other",
  ],
  ajuste: ["physical_count", "other"],
};

export function manualMovementReasonOptionsForType(type: ManualInventoryMovementType) {
  return manualMovementReasonCodesByType[type].map((value) => ({
    value,
    label: inventoryMovementReasonLabel[value],
  }));
}

export function isReasonCodeAllowedForMovementType(
  type: ManualInventoryMovementType,
  reasonCode: InventoryMovementReasonCode,
) {
  return manualMovementReasonCodesByType[type].includes(reasonCode);
}

export function normalizeReasonCodeForMovementType(
  type: ManualInventoryMovementType,
  reasonCode?: InventoryMovementReasonCode | null,
): InventoryMovementReasonCode {
  if (reasonCode && isReasonCodeAllowedForMovementType(type, reasonCode)) {
    return reasonCode;
  }

  return defaultReasonCodeForMovementType(type);
}

export function defaultReasonCodeForMovementType(
  type: ManualInventoryMovementType,
): InventoryMovementReasonCode {
  if (type === "entrada") {
    return "manual_entry";
  }

  if (type === "salida") {
    return "manual_exit";
  }

  return "physical_count";
}

export function movementReasonRequiresDetail(reasonCode: InventoryMovementReasonCode) {
  return (
    reasonCode === "other" ||
    reasonCode === "physical_count" ||
    reasonCode === "assignment_damage" ||
    reasonCode === "assignment_loss"
  );
}

export function computeInventoryAdjustmentDelta(currentStock: number, countedQty: number) {
  return countedQty - currentStock;
}

export function formatInventoryAdjustmentDelta(delta: number) {
  if (delta === 0) {
    return "0";
  }

  return delta > 0 ? `+${delta}` : String(delta);
}

export function movementReasonDetailPlaceholder(reasonCode: InventoryMovementReasonCode) {
  if (reasonCode === "physical_count") {
    return "Ej. conté más de lo registrado";
  }

  if (reasonCode === "other") {
    return "Explica el motivo";
  }

  return "Opcional";
}

export function isAgencyInventoryMovement(input: {
  reasonCode?: string | null;
  fromLocationType?: string | null;
  toLocationType?: string | null;
  referenceType?: string | null;
}) {
  return (
    input.reasonCode === "agency_delivery" ||
    input.fromLocationType === "agency" ||
    input.toLocationType === "agency" ||
    input.referenceType === "agency_visit"
  );
}

export function formatInventoryMovementTrail(input: {
  fromLabel?: string;
  toLabel?: string;
}) {
  const fromLabel = input.fromLabel?.trim() || "";
  const toLabel = input.toLabel?.trim() || "";

  if (fromLabel && toLabel) {
    return `${fromLabel} → ${toLabel}`;
  }

  if (toLabel) {
    return `→ ${toLabel}`;
  }

  if (fromLabel) {
    return `${fromLabel} →`;
  }

  return "";
}

export function readInventoryMovementEvidencePhotos(
  evidence: InventoryMovementEvidence | Record<string, unknown> | null | undefined,
) {
  if (!evidence || typeof evidence !== "object") {
    return [] as string[];
  }

  const photos = (evidence as InventoryMovementEvidence).photos;

  if (!Array.isArray(photos)) {
    return [] as string[];
  }

  return photos.filter((url): url is string => typeof url === "string" && url.trim().length > 0);
}

export function readInventoryMovementSupplierName(
  evidence: InventoryMovementEvidence | Record<string, unknown> | null | undefined,
) {
  if (!evidence || typeof evidence !== "object") {
    return "";
  }

  const supplierName = (evidence as InventoryMovementEvidence).supplierName;
  return typeof supplierName === "string" ? supplierName.trim() : "";
}

export function emptyInventoryMovementAuditFields(): InventoryMovementAuditFields {
  return {
    reasonCode: "unspecified",
    fromLocationType: null,
    fromLocationId: null,
    fromLocationLabel: "",
    toLocationType: null,
    toLocationId: null,
    toLocationLabel: "",
    referenceType: null,
    referenceId: null,
    evidence: {},
    reversalOfMovementId: null,
  };
}

export function formatInventoryMovementReference(input: {
  referenceType?: InventoryMovementReferenceType | string | null;
  referenceId?: string | null;
  referenceLabel?: string | null;
}) {
  const type = input.referenceType;

  if (!type) {
    return "";
  }

  const typeLabel =
    inventoryMovementReferenceLabel[type as InventoryMovementReferenceType] || type;

  if (input.referenceLabel?.trim()) {
    return `${typeLabel}: ${input.referenceLabel.trim()}`;
  }

  if (input.referenceId) {
    return `${typeLabel}`;
  }

  return typeLabel;
}
