export type InventoryMovementReasonCode =
  | "unspecified"
  | "manual_entry"
  | "manual_exit"
  | "physical_count"
  | "sale_fulfillment"
  | "warehouse_transfer_out"
  | "warehouse_transfer_in"
  | "warehouse_transfer_cancel"
  | "assignment_issue"
  | "assignment_return"
  | "assignment_consume"
  | "assignment_damage"
  | "assignment_loss"
  | "agency_delivery"
  | "correction_reversal"
  | "other";

export type InventoryMovementLocationType =
  | "warehouse"
  | "assignee"
  | "truck"
  | "agency"
  | "external"
  | "shipment"
  | "unknown";

export type InventoryMovementReferenceType =
  | "shipment"
  | "assignment"
  | "warehouse_transfer"
  | "sale_reservation"
  | "agency_visit"
  | "physical_count"
  | "manual";

export type InventoryMovementEvidence = {
  photos?: string[];
  note?: string;
  supplierName?: string;
  invoiceReference?: string;
  purchaseDate?: string;
};

export type ManualInventoryMovementType = "entrada" | "salida" | "ajuste";

export type InventoryMovementAuditFields = {
  reasonCode: InventoryMovementReasonCode;
  fromLocationType: InventoryMovementLocationType | null;
  fromLocationId: string | null;
  fromLocationLabel: string;
  toLocationType: InventoryMovementLocationType | null;
  toLocationId: string | null;
  toLocationLabel: string;
  referenceType: InventoryMovementReferenceType | null;
  referenceId: string | null;
  evidence: InventoryMovementEvidence;
  reversalOfMovementId: string | null;
};
