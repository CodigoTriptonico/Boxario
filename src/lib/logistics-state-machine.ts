import type { LogisticsRouteStatus, LogisticsTaskType } from "@/lib/logistics-routing";
import type { LogisticsTaskStatus } from "@/lib/shipment-types";
import type { PhysicalPackageStatus } from "@/lib/physical-packages";

export type LogisticsStopOutcome = "completed" | "failed" | "cancelled";
export type WarehousePalletStatus = "open" | "closed";

const ROUTE_TRANSITIONS: Record<LogisticsRouteStatus, readonly LogisticsRouteStatus[]> = {
  draft: ["planned", "cancelled"],
  planned: ["in_progress", "cancelled", "draft"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

const TASK_TRANSITIONS: Record<LogisticsTaskStatus, readonly LogisticsTaskStatus[]> = {
  pending: ["scheduled", "assigned", "cancelled"],
  scheduled: ["assigned", "pending", "cancelled"],
  assigned: ["loaded_to_truck", "scheduled", "pending", "cancelled", "completed"],
  loaded_to_truck: ["completed", "cancelled"],
  completed: [],
  cancelled: ["pending", "scheduled", "assigned"],
};

const PACKAGE_TRANSITIONS: Record<PhysicalPackageStatus, readonly PhysicalPackageStatus[]> = {
  awaiting_full_box: ["in_truck"],
  in_truck: ["pending_intake", "warehouse_intake"],
  pending_intake: ["warehouse_intake", "in_warehouse"],
  warehouse_intake: ["in_warehouse"],
  in_warehouse: ["on_pallet"],
  on_pallet: ["handed_to_carrier", "in_warehouse"],
  handed_to_carrier: [],
};

const PALLET_TRANSITIONS: Record<WarehousePalletStatus, readonly WarehousePalletStatus[]> = {
  open: ["closed"],
  closed: ["open"],
};

const STOP_OUTCOME_TRANSITIONS: Record<
  "open" | LogisticsStopOutcome,
  readonly LogisticsStopOutcome[]
> = {
  open: ["completed", "failed", "cancelled"],
  completed: [],
  failed: [],
  cancelled: [],
};

export function isLogisticsRouteTransitionAllowed(
  from: LogisticsRouteStatus,
  to: LogisticsRouteStatus,
) {
  return ROUTE_TRANSITIONS[from].includes(to);
}

export function assertLogisticsRouteTransition(
  from: LogisticsRouteStatus,
  to: LogisticsRouteStatus,
) {
  if (!isLogisticsRouteTransitionAllowed(from, to)) {
    throw new Error(`Transicion de ruta no permitida: ${from} → ${to}`);
  }
}

export function isLogisticsTaskTransitionAllowed(
  from: LogisticsTaskStatus,
  to: LogisticsTaskStatus,
) {
  return TASK_TRANSITIONS[from].includes(to);
}

export function assertLogisticsTaskTransition(
  from: LogisticsTaskStatus,
  to: LogisticsTaskStatus,
) {
  if (!isLogisticsTaskTransitionAllowed(from, to)) {
    throw new Error(`Transicion de tarea no permitida: ${from} → ${to}`);
  }
}

export function isPhysicalPackageTransitionAllowed(
  from: PhysicalPackageStatus,
  to: PhysicalPackageStatus,
) {
  return PACKAGE_TRANSITIONS[from].includes(to);
}

export function assertPhysicalPackageTransition(
  from: PhysicalPackageStatus,
  to: PhysicalPackageStatus,
) {
  if (!isPhysicalPackageTransitionAllowed(from, to)) {
    throw new Error(`Transicion de paquete no permitida: ${from} → ${to}`);
  }
}

export function isWarehousePalletTransitionAllowed(
  from: WarehousePalletStatus,
  to: WarehousePalletStatus,
) {
  return PALLET_TRANSITIONS[from].includes(to);
}

export function isStopOutcomeTransitionAllowed(
  from: LogisticsStopOutcome | null | undefined,
  to: LogisticsStopOutcome,
) {
  const key = from || "open";
  return STOP_OUTCOME_TRANSITIONS[key].includes(to);
}

export function routeAllowsOperationalTaskCompletion(status: LogisticsRouteStatus) {
  return status === "in_progress";
}

export function routeAllowsNormalStopEdits(status: LogisticsRouteStatus) {
  return status === "draft" || status === "planned";
}

export function routeAllowsLivePendingStopEdits(status: LogisticsRouteStatus) {
  return status === "in_progress";
}

export function routeIsClosedForOperationalEdits(status: LogisticsRouteStatus) {
  return status === "completed" || status === "cancelled";
}

function conductorVisibleRouteStatuses(): readonly LogisticsRouteStatus[] {
  return ["planned", "in_progress"];
}

export function isConductorVisibleRouteStatus(status: LogisticsRouteStatus) {
  return conductorVisibleRouteStatuses().includes(status);
}

export function taskRequiresActiveRouteToComplete(taskType: LogisticsTaskType) {
  return taskType === "deliver_empty_box" || taskType === "pickup_full_box";
}

export function publishRouteValidationErrors(input: {
  status: LogisticsRouteStatus;
  assignedTo: string | null;
  vehicleId: string | null;
  stopCount: number;
  stopsWithoutGeo: number;
  tasksWithoutConfirmedDate: number;
  tasksWithMismatchedDate: number;
}) {
  const errors: string[] = [];

  if (input.status !== "draft") {
    errors.push("Solo puedes publicar rutas en borrador");
  }
  if (!input.assignedTo) {
    errors.push("Asigna un conductor antes de publicar");
  }
  if (!input.vehicleId) {
    errors.push("Asigna un vehiculo antes de publicar");
  }
  if (input.stopCount < 1) {
    errors.push("Agrega al menos una parada antes de publicar");
  }
  if (input.stopsWithoutGeo > 0) {
    errors.push("Hay paradas sin ubicacion verificada");
  }
  if (input.tasksWithoutConfirmedDate > 0) {
    errors.push("Hay tareas sin fecha confirmada");
  }
  if (input.tasksWithMismatchedDate > 0) {
    errors.push("Hay tareas con fecha distinta a la ruta");
  }

  return errors;
}

export function physicalStatusForCustodyHolder(
  holderType: string,
  currentStatus: PhysicalPackageStatus,
): PhysicalPackageStatus | null {
  if (holderType === "proveedor") {
    return currentStatus === "on_pallet" || currentStatus === "in_warehouse"
      ? "handed_to_carrier"
      : null;
  }
  if (holderType === "bodega" && currentStatus === "on_pallet") {
    return "in_warehouse";
  }
  return null;
}
