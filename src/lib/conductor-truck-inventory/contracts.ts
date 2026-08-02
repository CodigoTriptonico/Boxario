export const LOGISTICS_TASK_EVIDENCE_BUCKET = "logistics-task-evidence";

export const CONDUCTOR_TASK_FAILURE_REASONS = [
  "Cliente no contesto",
  "No abrio puerta",
  "Direccion incorrecta",
  "Calle o acceso cerrado",
  "Cliente cancelo",
  "Caja no lista",
  "Invoice no visible",
  "Problema de ruta",
  "Otra",
] as const;

export type ConductorTaskFailureReason = (typeof CONDUCTOR_TASK_FAILURE_REASONS)[number];

export const CONDUCTOR_TRUCK_RETURN_REASONS = [
  "Sobro carga",
  "Caja danada",
  "Error al subir",
  "Ruta reprogramada",
  "Fin de jornada",
  "Cambio de vehiculo",
  "Otra",
] as const;

export type ConductorTruckReturnReason = (typeof CONDUCTOR_TRUCK_RETURN_REASONS)[number];

export type ConductorTransferVehicleOption = {
  id: string;
  label: string;
};

export type ConductorTruckEventType =
  | "load"
  | "deliver"
  | "return"
  | "adjust"
  | "collect_full_box"
  | "unload_full_box";

export type ConductorTruckBoxLine = {
  key: string;
  catalogKey: string;
  label: string;
  quantity: number;
};

export type ConductorTruckTaskInput = {
  id: string;
  shipmentId: string;
  routeId: string | null;
  routeName: string | null;
  routeDate: string | null;
  taskType: "deliver_empty_box" | "pickup_full_box";
  status: string;
  warehouseId: string | null;
  boxLines: ConductorTruckBoxLine[];
};

export type ConductorTruckInventoryEvent = {
  id?: string;
  eventType: ConductorTruckEventType;
  routeId: string | null;
  taskId: string | null;
  shipmentId: string | null;
  warehouseId: string | null;
  itemId: string | null;
  itemName: string;
  catalogKey: string;
  itemLabel: string;
  qty: number;
  createdAt?: string;
};

export type ConductorTruckStockItem = {
  itemId: string;
  itemName: string;
  category: string;
  kind: string;
  subcategory?: string;
  warehouseId: string;
  stock: number;
};

export type ConductorTruckInventoryLine = {
  key: string;
  catalogKey: string;
  label: string;
  requiredQty: number;
  loadedQty: number;
  deliveredQty: number;
  returnedQty: number;
  currentQty: number;
  shortageQty: number;
  stockQty: number;
  itemId: string | null;
  itemName: string;
  warehouseId: string | null;
  taskIds: string[];
  routeIds: string[];
};

export type ConductorTruckInventoryScope = {
  date: string;
  routeIds: string[];
  taskIds: string[];
};

export type ConductorTruckInventorySummary = {
  lines: ConductorTruckInventoryLine[];
  requiredTotal: number;
  loadedTotal: number;
  deliveredTotal: number;
  currentTotal: number;
  shortageTotal: number;
  ready: boolean;
};

export type ConductorTruckOnTruckLine = {
  key: string;
  lineKey: string;
  label: string;
  qty: number;
  maxReturnQty: number;
  itemId: string | null;
  warehouseId: string | null;
  catalogKey: string;
  origin: "route" | "extra";
};

export type ConductorRouteDeliveryBoardLine = {
  key: string;
  label: string;
  requiredQty: number;
  onTruckQty: number;
  pendingQty: number;
  line: ConductorTruckInventoryLine;
};

export type ConductorTruckBalance = {
  vehicleId: string;
  vehicleName: string;
  vehiclePlate: string;
  assignedDriverId: string | null;
  assignedDriverName: string;
  lines: ConductorTruckInventoryLine[];
  totalQty: number;
};

export type ConductorFullBoxCargoLine = {
  key: string;
  taskId: string;
  shipmentId: string | null;
  routeId: string | null;
  label: string;
  collectedQty: number;
  unloadedQty: number;
  pendingQty: number;
};

export type ConductorFullBoxCargoSummary = {
  lines: ConductorFullBoxCargoLine[];
  collectedTotal: number;
  unloadedTotal: number;
  pendingTotal: number;
};
