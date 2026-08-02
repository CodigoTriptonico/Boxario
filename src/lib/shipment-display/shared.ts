import { formatScheduleAtDisplay } from "@/lib/sale/schedule-time";
import type {
  ShipmentLogisticsTaskRow,
  ShipmentProgressChannel,
  ShipmentProgressKind,
  ShipmentRow,
} from "@/lib/shipment-types";

export function planLeg(
  plan: Record<string, unknown> | null | undefined,
  key: "emptyBox" | "fullBox",
) {
  const leg = plan?.[key];

  return leg && typeof leg === "object" && !Array.isArray(leg)
    ? (leg as Record<string, unknown>)
    : null;
}

export function taskByType(
  row: ShipmentRow,
  taskType: ShipmentLogisticsTaskRow["taskType"],
  options?: { includeCancelled?: boolean },
) {
  const includeCancelled = options?.includeCancelled === true;
  return row.logisticsTasks.find(
    (task) =>
      task.taskType === taskType && (includeCancelled || task.status !== "cancelled"),
  );
}

/** Prefer active (non-cancelled) logistics tasks for operational milestones. */
export function findActiveTaskByType(
  row: ShipmentRow,
  taskType: ShipmentLogisticsTaskRow["taskType"],
) {
  return taskByType(row, taskType, { includeCancelled: false });
}

/** Include cancelled tasks only when reconstructing historical assignment state. */
export function findTaskByTypeIncludingCancelled(
  row: ShipmentRow,
  taskType: ShipmentLogisticsTaskRow["taskType"],
) {
  return taskByType(row, taskType, { includeCancelled: true });
}

export function taskIsDone(
  task: ShipmentLogisticsTaskRow | undefined,
) {
  return task?.status === "completed";
}

export function taskIsInProgress(
  task: ShipmentLogisticsTaskRow | undefined,
) {
  return Boolean(
    task &&
      task.status !== "completed" &&
      task.status !== "cancelled" &&
      task.status !== "pending",
  );
}

export function stepMeta(
  kind: ShipmentProgressKind,
  channel: ShipmentProgressChannel = "neutral",
  channelLabel?: string,
) {
  return { kind, channel, channelLabel };
}

export function legPlannedScheduleDetail(
  leg: Record<string, unknown> | null,
  fallback: string,
) {
  if (leg?.scheduleMode === "scheduled" && leg.scheduleAt) {
    return `Programado · ${formatScheduleAtDisplay(String(leg.scheduleAt))}`;
  }

  return fallback;
}

export function scheduleDetail(
  task: ShipmentLogisticsTaskRow | undefined,
  pendingLabel: string,
) {
  if (!task) {
    return `${pendingLabel} · sin fecha`;
  }

  if (task.status === "scheduled" && task.scheduledAt) {
    return `Programado · ${formatScheduleAtDisplay(task.scheduledAt)}`;
  }

  if (taskIsInProgress(task)) {
    if (task.status === "loaded_to_truck") {
      return "En camión";
    }

    if (task.status === "assigned") {
      return "Chofer asignado";
    }

    return "En proceso";
  }

  return `${pendingLabel} · sin fecha`;
}

function logisticsTaskOpen(
  row: ShipmentRow,
  taskType: ShipmentLogisticsTaskRow["taskType"],
) {
  const task = taskByType(row, taskType);

  return Boolean(task && task.status !== "cancelled");
}

export function legDriverTaskOrdered(
  row: ShipmentRow,
  taskType: ShipmentLogisticsTaskRow["taskType"],
) {
  return logisticsTaskOpen(row, taskType);
}

export function driverLegAwaitingOrder(
  row: ShipmentRow,
  taskType: ShipmentLogisticsTaskRow["taskType"],
  mode: string,
) {
  if (!mode.includes("Programar")) {
    return false;
  }

  return !logisticsTaskOpen(row, taskType);
}
