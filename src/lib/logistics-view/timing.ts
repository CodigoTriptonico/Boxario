import type { LogisticsTaskType } from "@/lib/shipment-types";
import { formatShipmentDuration } from "@/lib/shipment-timing";

function localDayStart(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

export function logisticsScheduleProximityClass(
  scheduledAt: string | null | undefined,
  now = new Date(),
) {
  if (!scheduledAt) {
    return "border-yellow-500 bg-yellow-400/30 text-yellow-50 shadow-[inset_0_0_0_1px_rgba(253,224,71,0.24)]";
  }

  const scheduledDate = new Date(scheduledAt);
  if (Number.isNaN(scheduledDate.getTime())) {
    return "border-yellow-500 bg-yellow-400/30 text-yellow-50 shadow-[inset_0_0_0_1px_rgba(253,224,71,0.24)]";
  }

  const dayDistance = Math.floor(
    (localDayStart(scheduledDate) - localDayStart(now)) / 86_400_000,
  );

  if (dayDistance <= 0) {
    return "border-red-500 bg-red-500/24 text-red-50 shadow-[inset_0_0_0_1px_rgba(248,113,113,0.34),0_0_14px_rgba(239,68,68,0.2)]";
  }

  if (dayDistance === 1) {
    return "border-amber-500 bg-amber-400/30 text-amber-50 shadow-[inset_0_0_0_1px_rgba(251,191,36,0.28)]";
  }

  if (dayDistance <= 3) {
    return "border-violet-500 bg-violet-400/28 text-violet-50 shadow-[inset_0_0_0_1px_rgba(196,181,253,0.22)]";
  }

  return "border-sky-500 bg-sky-400/22 text-sky-50 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.18)]";
}

const WAIT_HOUR_MS = 60 * 60 * 1000;
const WAIT_DAY_MS = 24 * WAIT_HOUR_MS;

export function logisticsWaitingToneClass(elapsedMs: number | null | undefined) {
  if (elapsedMs === null || elapsedMs === undefined || !Number.isFinite(elapsedMs)) {
    return "border-black bg-surface-inset text-slate-400";
  }

  if (elapsedMs < WAIT_HOUR_MS) {
    return "border-black bg-surface-inset text-slate-400";
  }

  if (elapsedMs < 6 * WAIT_HOUR_MS) {
    return "border-black bg-surface-inset text-slate-300";
  }

  if (elapsedMs < WAIT_DAY_MS) {
    return "border-black bg-surface-inset text-slate-200";
  }

  if (elapsedMs < 2 * WAIT_DAY_MS) {
    return "border-amber-800/40 bg-surface-inset text-amber-300";
  }

  return "border-amber-700/55 bg-amber-950/20 text-amber-200";
}

export function logisticsScheduleDisplayParts(
  scheduledAt: string | null | undefined,
  now = new Date(),
) {
  if (!scheduledAt) {
    return { primary: "Sin fecha", secondary: null as string | null };
  }

  const scheduledDate = new Date(scheduledAt);
  if (Number.isNaN(scheduledDate.getTime())) {
    return { primary: "Fecha invalida", secondary: null as string | null };
  }

  const primary = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(scheduledDate);

  const dayDistance = Math.floor(
    (localDayStart(scheduledDate) - localDayStart(now)) / 86_400_000,
  );

  let secondary: string | null = null;
  if (dayDistance < 0) {
    const days = Math.abs(dayDistance);
    secondary = days === 1 ? "hace 1 día" : `hace ${days} días`;
  } else if (dayDistance === 0) {
    secondary = "hoy";
  } else if (dayDistance === 1) {
    secondary = "mañana";
  } else {
    secondary = `en ${dayDistance} días`;
  }

  return { primary, secondary };
}

export type LogisticsTaskWaiting = {
  elapsedMs: number;
  waitingText: string;
  requestLabel: "entrega" | "recolección";
};

function logisticsTaskRequestLabel(taskType: LogisticsTaskType) {
  return taskType === "deliver_empty_box" ? "entrega" : "recolección";
}

export function logisticsActionIconWellClass(taskType: LogisticsTaskType) {
  return taskType === "deliver_empty_box"
    ? "border-sky-700/45 bg-sky-950/25 text-sky-200"
    : "border-violet-700/45 bg-violet-950/25 text-violet-200";
}

export function logisticsPriorityAwaitingDriver(
  invoicePriority: boolean,
  assignedTo: string | null | undefined,
  canAssignDriver: boolean,
) {
  return Boolean(invoicePriority && canAssignDriver && !assignedTo);
}

export function logisticsPriorityAwaitingDriverClass(
  invoicePriority: boolean,
  assignedTo: string | null | undefined,
  canAssignDriver: boolean,
) {
  return logisticsPriorityAwaitingDriver(invoicePriority, assignedTo, canAssignDriver)
    ? "logistics-priority-awaiting-driver"
    : "";
}

export function logisticsPriorityCardClass(invoicePriority: boolean) {
  return invoicePriority ? "border-amber-600" : "border-black";
}

export function logisticsPriorityHeaderClass(invoicePriority: boolean) {
  if (!invoicePriority) {
    return "bg-surface-card-header";
  }

  return "bg-amber-950/45";
}

export function logisticsTaskWaitingParts(
  taskType: LogisticsTaskType | null | undefined,
  orderedAt: string | null | undefined,
  createdAt: string | null | undefined,
  nowMs = Date.now(),
): LogisticsTaskWaiting | null {
  if (!taskType) {
    return null;
  }

  const anchorIso = orderedAt || createdAt;
  if (!anchorIso) {
    return null;
  }

  const anchorMs = Date.parse(anchorIso);
  if (!Number.isFinite(anchorMs)) {
    return null;
  }

  const elapsedMs = Math.max(0, nowMs - anchorMs);
  const durationLabel = formatShipmentDuration(elapsedMs);
  const requestLabel = logisticsTaskRequestLabel(taskType);

  const waitingText =
    durationLabel === "inmediato"
      ? `Recién solicitada la ${requestLabel}`
      : `Lleva ${durationLabel} desde que se solicitó la ${requestLabel}`;

  return { elapsedMs, waitingText, requestLabel };
}

export function logisticsUnroutedTaskCardClass(options: {
  missingGeo: boolean;
  highlighted: boolean;
  invoicePriority?: boolean;
  assignedTo?: string | null;
  canAssignDriver?: boolean;
}) {
  const classes = ["rounded-lg border shadow-[0_6px_18px_rgba(0,0,0,0.18)]"];

  if (options.missingGeo) {
    classes.push("border-amber-600 bg-amber-950/40");
  } else if (options.invoicePriority) {
    classes.push("bg-surface-card", logisticsPriorityCardClass(true));
  } else {
    classes.push("border-black bg-surface-card");
  }

  if (options.highlighted) {
    classes.push("ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#1a2320]");
  }

  return classes.join(" ");
}
