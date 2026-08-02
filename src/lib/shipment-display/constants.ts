import type {
  ShipmentRow,
  ShipmentStatus,
} from "@/lib/shipment-types";

export const EMPTY_BOX_OFFICE_MODE =
  "Cliente recoge caja vacia en oficina";
export const EMPTY_BOX_DRIVER_MODE =
  "Programar entrega de caja vacia";
export const FULL_BOX_OFFICE_MODE =
  "Cliente trae caja llena a oficina";
export const FULL_BOX_DRIVER_MODE =
  "Programar recoleccion caja llena";

export const PENDING_EMPTY_BOX_STATUS =
  "Pendiente entrega caja vacía" as const;
export const PENDING_FULL_BOX_STATUS =
  "Pendiente recolección caja llena" as const;

export const PENDING_SHIPMENT_STATUSES = [
  PENDING_EMPTY_BOX_STATUS,
  PENDING_FULL_BOX_STATUS,
] as const satisfies readonly ShipmentStatus[];

export const TRANSIT_SHIPMENT_STATUSES = [
  "En oficina",
  "Pickup",
  "Enviado",
  "Entregado",
] as const satisfies readonly ShipmentStatus[];

export const OFFICE_RECEIVED_STATUSES = new Set<ShipmentRow["status"]>([
  "En oficina",
  "Pickup",
  "Enviado",
  "Entregado",
]);

export const STATUS_RANK: Record<ShipmentStatus, number> = {
  [PENDING_EMPTY_BOX_STATUS]: 0,
  [PENDING_FULL_BOX_STATUS]: 0,
  "En oficina": 1,
  Pickup: 2,
  Enviado: 3,
  Entregado: 4,
};
