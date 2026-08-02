import {
  formatShipmentDuration,
  formatShipmentRelative,
  parseIso,
  taskByType,
  type ShipmentTimings,
} from "@/lib/shipment-timing/core";
import { buildShipmentTimings } from "@/lib/shipment-timing/timings";
import type {
  ShipmentLogisticsTaskRow,
  ShipmentProgressStep,
  ShipmentRow,
} from "@/lib/shipment-types";

type LogisticsPhaseKey =
  | "ordered"
  | "scheduled"
  | "assigned"
  | "loaded"
  | "completed";

type LogisticsPhase = {
  key: LogisticsPhaseKey;
  label: string;
  at: string | null;
  relative: string | null;
  gapFromPreviousMs: number | null;
  gapFromPreviousLabel: string | null;
};

type LogisticsLegTiming = {
  taskType: ShipmentLogisticsTaskRow["taskType"];
  legLabel: string;
  orderedAt: string | null;
  scheduledAt: string | null;
  assignedAt: string | null;
  loadedAt: string | null;
  completedAt: string | null;
  phases: LogisticsPhase[];
  activePhaseLabel: string | null;
  activeElapsedMs: number | null;
  activeElapsedLabel: string | null;
  orderToCompleteMs: number | null;
  orderToCompleteLabel: string | null;
};

type LogisticsSubGap = {
  fromLabel: string;
  toLabel: string;
  durationMs: number;
  label: string;
};

export type ShipmentAuditTimings = ShipmentTimings & {
  emptyBoxLeg: LogisticsLegTiming | null;
  fullBoxLeg: LogisticsLegTiming | null;
  logisticsGaps: LogisticsSubGap[];
  logisticsGapsLine: string | null;
};

function subGapBetween(
  fromLabel: string,
  toLabel: string,
  fromIso: string | null,
  toIso: string | null,
) {
  const fromMs = parseIso(fromIso);
  const toMs = parseIso(toIso);

  if (fromMs === null || toMs === null || toMs < fromMs) {
    return null;
  }

  const durationMs = toMs - fromMs;
  const label = formatShipmentDuration(durationMs);

  if (!label) {
    return null;
  }

  return { fromLabel, toLabel, durationMs, label };
}

function buildLogisticsLegTiming(
  task: ShipmentLogisticsTaskRow | undefined,
  legLabel: string,
  nowMs = Date.now(),
): LogisticsLegTiming | null {
  if (!task || task.status === "cancelled") {
    return null;
  }

  const orderedAt = task.orderedAt || task.createdAt || null;
  const scheduledAt = task.scheduledAt;
  const assignedAt = task.assignedAt;
  const loadedAt = task.loadedAt || task.stockDeductedAt;
  const completedAt = task.completedAt;
  const phaseDefs: Array<{
    key: LogisticsPhaseKey;
    label: string;
    at: string | null;
  }> = [
    { key: "ordered", label: "Ordenada en envíos", at: orderedAt },
    { key: "scheduled", label: "Fecha programada", at: scheduledAt },
    { key: "assigned", label: "Asignada a chofer", at: assignedAt },
    { key: "loaded", label: "Cargada a ruta", at: loadedAt },
    { key: "completed", label: "Completada", at: completedAt },
  ];

  let previousAt: string | null = null;
  const phases: LogisticsPhase[] = phaseDefs.map((phase) => {
    const gap =
      previousAt && phase.at
        ? subGapBetween("anterior", phase.label, previousAt, phase.at)
        : null;

    if (phase.at) {
      previousAt = phase.at;
    }

    return {
      key: phase.key,
      label: phase.label,
      at: phase.at,
      relative: phase.at ? formatShipmentRelative(phase.at, nowMs) : null,
      gapFromPreviousMs: gap?.durationMs ?? null,
      gapFromPreviousLabel: gap?.label ?? null,
    };
  });

  const orderToCompleteMs =
    orderedAt && completedAt
      ? Math.max(
          0,
          (parseIso(completedAt) || nowMs) -
            (parseIso(orderedAt) || nowMs),
        )
      : null;

  let activePhaseLabel: string | null = null;
  let activeElapsedMs: number | null = null;

  if (!completedAt && orderedAt) {
    const anchorMs = parseIso(orderedAt);
    if (anchorMs !== null) {
      activeElapsedMs = Math.max(0, nowMs - anchorMs);
      activePhaseLabel = `desde que se ordenó en envíos (${formatShipmentDuration(activeElapsedMs)})`;
    }
  }

  return {
    taskType: task.taskType,
    legLabel,
    orderedAt,
    scheduledAt,
    assignedAt,
    loadedAt,
    completedAt,
    phases,
    activePhaseLabel,
    activeElapsedMs,
    activeElapsedLabel: activePhaseLabel,
    orderToCompleteMs,
    orderToCompleteLabel:
      orderToCompleteMs !== null
        ? formatShipmentDuration(orderToCompleteMs)
        : null,
  };
}

function buildLogisticsLegTimings(
  row: ShipmentRow,
  nowMs = Date.now(),
) {
  const emptyTask = taskByType(row, "deliver_empty_box");
  const fullTask = taskByType(row, "pickup_full_box");

  return {
    emptyBoxLeg: buildLogisticsLegTiming(
      emptyTask,
      "Dejar caja vacía",
      nowMs,
    ),
    fullBoxLeg: buildLogisticsLegTiming(
      fullTask,
      "Recoger caja llena",
      nowMs,
    ),
  };
}

export function buildShipmentAuditTimings(
  row: ShipmentRow,
  steps: ShipmentProgressStep[],
  nowMs = Date.now(),
): ShipmentAuditTimings {
  const base = buildShipmentTimings(row, steps, nowMs);
  const { emptyBoxLeg, fullBoxLeg } = buildLogisticsLegTimings(row, nowMs);
  const logisticsGaps: LogisticsSubGap[] = [];

  for (const leg of [emptyBoxLeg, fullBoxLeg]) {
    if (!leg) {
      continue;
    }

    const gap = subGapBetween(
      "Ordenada",
      "Completada",
      leg.orderedAt,
      leg.completedAt,
    );
    if (gap) {
      logisticsGaps.push({
        ...gap,
        fromLabel: `${leg.legLabel} · ordenada`,
        toLabel: `${leg.legLabel} · completada`,
      });
    }

    for (let index = 1; index < leg.phases.length; index += 1) {
      const previous = leg.phases[index - 1];
      const current = leg.phases[index];
      if (!previous?.at || !current?.at) {
        continue;
      }

      const phaseGap = subGapBetween(
        previous.label,
        current.label,
        previous.at,
        current.at,
      );
      if (phaseGap) {
        logisticsGaps.push({
          ...phaseGap,
          fromLabel: `${leg.legLabel} · ${previous.label.toLowerCase()}`,
          toLabel: `${leg.legLabel} · ${current.label.toLowerCase()}`,
        });
      }
    }
  }

  const logisticsGapsLine = logisticsGaps.length
    ? logisticsGaps
        .map(
          (gap) =>
            `${gap.fromLabel} → ${gap.toLabel} · ${gap.label}`,
        )
        .join(" · ")
    : null;

  return {
    ...base,
    emptyBoxLeg,
    fullBoxLeg,
    logisticsGaps,
    logisticsGapsLine,
  };
}

export function stepTimingTooltip(
  step: ShipmentProgressStep,
): string | undefined {
  return step.title;
}
