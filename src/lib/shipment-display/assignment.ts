import {
  FULL_BOX_DRIVER_MODE,
  FULL_BOX_OFFICE_MODE,
} from "@/lib/shipment-display/constants";
import { shipmentLogisticsSteps } from "@/lib/shipment-display/progress";
import {
  planLeg,
  taskByType,
  taskIsDone,
} from "@/lib/shipment-display/shared";
import type {
  ShipmentProgressStep,
  ShipmentRow,
} from "@/lib/shipment-types";

export function shipmentOperationalDriverLabel(
  row: ShipmentRow,
  step: ShipmentProgressStep | null | undefined,
  driverLabelById: (
    driverId: string,
  ) => string | undefined = () => undefined,
) {
  const taskType =
    step?.kind === "empty_box"
      ? "deliver_empty_box"
      : step?.kind === "full_box"
        ? "pickup_full_box"
        : null;

  if (!taskType) {
    return "";
  }

  const task = taskByType(row, taskType);

  if (task?.assignedTo) {
    return `Chofer: ${driverLabelById(task.assignedTo) || task.assignedTo}`;
  }

  if (step?.channel === "home") {
    return "Sin chofer asignado";
  }

  return "";
}

export type ShipmentRouteAssignmentInfo = {
  routeName: string;
  assignedTo: string | null;
};

export type FullBoxPickupPlanStatus =
  | "inactive"
  | "deferred"
  | "marked"
  | "scheduled"
  | "office"
  | "done";

export function fullBoxPickupPlanStatus(
  row: ShipmentRow,
  step: ShipmentProgressStep | null | undefined,
): FullBoxPickupPlanStatus {
  if (!step || step.kind !== "full_box") {
    return "inactive";
  }

  const leg = planLeg(row.logistics_plan, "fullBox");
  const mode = String(leg?.mode || "");
  const task = taskByType(row, "pickup_full_box");

  if (step.state === "done" || taskIsDone(task)) {
    return "done";
  }

  if (mode === FULL_BOX_OFFICE_MODE) {
    return "office";
  }

  if (mode === FULL_BOX_DRIVER_MODE) {
    if (task?.status === "scheduled" && task.scheduledAt) {
      return "scheduled";
    }

    return "marked";
  }

  return "deferred";
}

export function fullBoxPickupPlanStatusLabel(
  status: FullBoxPickupPlanStatus,
) {
  if (status === "deferred") {
    return "Sin marcar";
  }

  if (status === "marked") {
    return "Marcada para recoger";
  }

  if (status === "scheduled") {
    return "Recolección programada";
  }

  if (status === "office") {
    return "Trae a oficina";
  }

  if (status === "done") {
    return "Recogida";
  }

  return "";
}

export type ShipmentOperationalAssignment = {
  routeLabel: string;
  routeAssigned: boolean;
  driverLabel: string;
  driverAssigned: boolean;
  isReady: boolean;
};

export const SHIPMENT_LOGISTICS_BRIDGE_LABEL =
  "Avisado a logística · pendiente ruta y conductor";

export function shipmentLogisticsBridgeLabel(
  assignment: ShipmentOperationalAssignment | null,
  step: ShipmentProgressStep | null | undefined,
): string {
  if (!assignment || assignment.isReady) {
    return "";
  }

  if (
    !step ||
    (step.kind !== "empty_box" && step.kind !== "full_box")
  ) {
    return "";
  }

  if (step.awaitingOrder || step.driverTaskOrdered !== true) {
    return "";
  }

  return SHIPMENT_LOGISTICS_BRIDGE_LABEL;
}

export function shipmentOperationalAssignment(
  row: ShipmentRow,
  step: ShipmentProgressStep | null | undefined,
  driverLabelById: (
    driverId: string,
  ) => string | undefined = () => undefined,
  routeByTaskId: (
    taskId: string,
  ) => ShipmentRouteAssignmentInfo | undefined = () => undefined,
): ShipmentOperationalAssignment | null {
  if (
    !step ||
    (step.kind !== "empty_box" && step.kind !== "full_box")
  ) {
    return null;
  }

  if (step.channel === "office") {
    return null;
  }

  if (step.awaitingOrder) {
    return null;
  }

  if (step.driverTaskOrdered !== true) {
    return null;
  }

  const taskType =
    step.kind === "empty_box"
      ? "deliver_empty_box"
      : "pickup_full_box";
  const task = taskByType(row, taskType);
  const route = task ? routeByTaskId(task.id) : undefined;
  const driverId = task?.assignedTo || route?.assignedTo || null;
  const routeAssigned = Boolean(route?.routeName);
  const driverAssigned = Boolean(driverId);

  return {
    routeLabel: routeAssigned
      ? route!.routeName
      : "Ruta no asignada",
    routeAssigned,
    driverLabel: driverAssigned
      ? driverLabelById(driverId!) || driverId!
      : "Conductor no asignado",
    driverAssigned,
    isReady: routeAssigned && driverAssigned,
  };
}

export function shipmentOperationalAssignmentLabel(
  row: ShipmentRow,
  step: ShipmentProgressStep | null | undefined,
  driverLabelById: (
    driverId: string,
  ) => string | undefined = () => undefined,
  routeByTaskId: (
    taskId: string,
  ) => ShipmentRouteAssignmentInfo | undefined = () => undefined,
) {
  const assignment = shipmentOperationalAssignment(
    row,
    step,
    driverLabelById,
    routeByTaskId,
  );

  if (!assignment) {
    return "";
  }

  const routeLabel = assignment.routeAssigned
    ? `Ruta asignada: ${assignment.routeLabel}`
    : assignment.routeLabel;
  const driverLabel = assignment.driverAssigned
    ? `Conductor asignado: ${assignment.driverLabel}`
    : assignment.driverLabel;

  return `${routeLabel} · ${driverLabel}`;
}

export type EnviosReadinessFilter =
  | "all"
  | "listos"
  | "pendientes";

export type EnviosReadinessBucket = "listos" | "pendientes";

function activeHomeLogisticsStep(
  row: ShipmentRow,
): ShipmentProgressStep | null {
  const step = shipmentLogisticsSteps(row).find(
    (item) => item.state === "active",
  );

  if (
    !step ||
    (step.kind !== "empty_box" && step.kind !== "full_box")
  ) {
    return null;
  }

  if (step.channel === "office") {
    return null;
  }

  return step;
}

export function classifyEnviosReadinessBucket(
  row: ShipmentRow,
): EnviosReadinessBucket | null {
  const step = activeHomeLogisticsStep(row);

  if (!step) {
    return null;
  }

  if (step.awaitingOrder || step.driverTaskOrdered !== true) {
    return "pendientes";
  }

  return "listos";
}

export function matchesEnviosReadinessFilter(
  row: ShipmentRow,
  filter: EnviosReadinessFilter,
) {
  if (filter === "all") {
    return true;
  }

  return classifyEnviosReadinessBucket(row) === filter;
}
