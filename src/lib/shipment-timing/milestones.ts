import {
  EMPTY_BOX_DRIVER_MODE,
  EMPTY_BOX_OFFICE_MODE,
  FULL_BOX_DRIVER_MODE,
} from "@/lib/sale-logistics-modes";
import {
  DAY_MS,
  formatShipmentDuration,
  formatShipmentRelative,
  parseIso,
  planLeg,
  resolveStepCompletedAt,
  saleAgeTone,
  stepShortName,
  taskByType,
  type SaleAgeTone,
} from "@/lib/shipment-timing/core";
import type {
  ShipmentLogisticsTaskRow,
  ShipmentProgressKind,
  ShipmentProgressStep,
  ShipmentRow,
} from "@/lib/shipment-types";

type ShipmentMilestoneAgeKey = "sale" | "empty_box" | "full_box";
type ShipmentMilestoneAgeStatus = "done" | "waiting" | "pending";

export type ShipmentMilestoneAge = {
  key: ShipmentMilestoneAgeKey;
  label: string;
  status: ShipmentMilestoneAgeStatus;
  completedAt: string | null;
  elapsedMs: number | null;
  elapsedLabel: string | null;
  detailLabel: string | null;
};

function progressStepState(
  steps: ShipmentProgressStep[],
  kind: ShipmentProgressKind,
): ShipmentProgressStep["state"] | null {
  return steps.find((step) => step.kind === kind)?.state ?? null;
}

export function elapsedSince(
  iso: string | null,
  nowMs: number,
): number | null {
  const at = parseIso(iso);
  if (at === null) {
    return null;
  }

  return Math.max(0, nowMs - at);
}

export function milestoneAgeDisplayValue(age: ShipmentMilestoneAge): string {
  if (age.status === "pending" || age.elapsedMs === null) {
    return "—";
  }

  const duration = formatShipmentDuration(age.elapsedMs);
  return duration === "inmediato" ? "ahora" : duration;
}

function milestoneAgeFocus(
  ages: ShipmentMilestoneAge[],
): ShipmentMilestoneAge {
  return (
    ages.find((age) => age.status === "waiting") ||
    ages.find((age) => age.key === "full_box" && age.status === "pending") ||
    ages.find((age) => age.key === "empty_box" && age.status === "pending") ||
    ages[0] || {
      key: "sale",
      label: "Venta",
      status: "pending",
      completedAt: null,
      elapsedMs: null,
      elapsedLabel: null,
      detailLabel: null,
    }
  );
}

const MILESTONE_INDICATOR_BUTTON_CLASS: Record<SaleAgeTone, string> = {
  fresh:
    "border-black bg-surface-inset text-slate-500 hover:text-slate-300",
  recent:
    "border-black bg-surface-inset text-slate-400 hover:text-slate-200",
  aging:
    "border-black bg-surface-inset text-slate-300 hover:text-slate-100",
  stale:
    "border-amber-600/40 bg-amber-950/20 text-amber-400 hover:text-amber-300",
  urgent:
    "border-amber-500/50 bg-amber-950/30 text-amber-300 hover:text-amber-200",
};

export function milestoneAgeIndicatorButtonClass(
  ages: ShipmentMilestoneAge[],
): string {
  const focus = milestoneAgeFocus(ages);

  if (focus.status === "waiting") {
    return focus.elapsedMs !== null && focus.elapsedMs >= DAY_MS
      ? MILESTONE_INDICATOR_BUTTON_CLASS.urgent
      : MILESTONE_INDICATOR_BUTTON_CLASS.stale;
  }

  if (focus.status === "pending") {
    return "border-black bg-surface-inset text-slate-600 hover:text-slate-400";
  }

  return MILESTONE_INDICATOR_BUTTON_CLASS[saleAgeTone(focus.elapsedMs ?? 0)];
}

function buildDoneMilestoneAge(
  key: ShipmentMilestoneAgeKey,
  label: string,
  completedAt: string,
  nowMs: number,
): ShipmentMilestoneAge {
  const elapsedMs = elapsedSince(completedAt, nowMs) ?? 0;
  const elapsedLabel = formatShipmentRelative(completedAt, nowMs);

  return {
    key,
    label,
    status: "done",
    completedAt,
    elapsedMs,
    elapsedLabel,
    detailLabel: elapsedLabel ? `${label} ${elapsedLabel}` : label,
  };
}

function buildWaitingMilestoneAge(
  key: ShipmentMilestoneAgeKey,
  label: string,
  anchorIso: string | null,
  sinceLabel: string,
  nowMs: number,
): ShipmentMilestoneAge {
  const elapsedMs = anchorIso ? elapsedSince(anchorIso, nowMs) : null;
  const durationLabel =
    elapsedMs !== null ? formatShipmentDuration(elapsedMs) : "";
  const detailLabel = durationLabel
    ? `${label} · lleva ${durationLabel} ${sinceLabel}`
    : `${label} · en curso`;

  return {
    key,
    label,
    status: "waiting",
    completedAt: null,
    elapsedMs,
    elapsedLabel: durationLabel || null,
    detailLabel,
  };
}

function buildPendingMilestoneAge(
  key: ShipmentMilestoneAgeKey,
  label: string,
  detailLabel?: string,
): ShipmentMilestoneAge {
  return {
    key,
    label,
    status: "pending",
    completedAt: null,
    elapsedMs: null,
    elapsedLabel: null,
    detailLabel: detailLabel ?? `${label} · pendiente`,
  };
}

export function activeStepForKind(
  steps: ShipmentProgressStep[],
  kind: ShipmentProgressKind,
): ShipmentProgressStep | null {
  return (
    steps.find((step) => step.kind === kind && step.state === "active") ??
    null
  );
}

export function legIsMarkedReady(step: ShipmentProgressStep | null) {
  return step?.driverTaskOrdered === true;
}

function logisticsLegMode(
  plan: Record<string, unknown>,
  key: "emptyBox" | "fullBox",
) {
  return String(planLeg(plan, key)?.mode || "");
}

export function shouldTrackEmptyBoxInProgressWait(
  row: ShipmentRow,
  step: ShipmentProgressStep | null,
  emptyCompletedAt: string | null,
) {
  if (!step || emptyCompletedAt || step.awaitingOrder) {
    return false;
  }

  const mode = logisticsLegMode(row.logistics_plan, "emptyBox");
  if (!mode) {
    return false;
  }

  if (mode === EMPTY_BOX_DRIVER_MODE) {
    return legIsMarkedReady(step);
  }

  return mode === EMPTY_BOX_OFFICE_MODE;
}

export function shouldTrackFullBoxInProgressWait(
  row: ShipmentRow,
  step: ShipmentProgressStep | null,
  fullCompletedAt: string | null,
  emptyCompletedAt: string | null,
) {
  if (!step || fullCompletedAt || step.awaitingOrder) {
    return false;
  }

  const mode = logisticsLegMode(row.logistics_plan, "fullBox");
  if (!mode) {
    return false;
  }

  if (mode === FULL_BOX_DRIVER_MODE) {
    return legIsMarkedReady(step);
  }

  return Boolean(emptyCompletedAt);
}

function legOrderAnchorIso(
  row: ShipmentRow,
  taskType: ShipmentLogisticsTaskRow["taskType"],
): string | null {
  const task = taskByType(row, taskType);
  return task?.orderedAt || null;
}

function buildActiveLegMilestoneAge(
  key: ShipmentMilestoneAgeKey,
  label: string,
  step: ShipmentProgressStep,
  row: ShipmentRow,
  taskType: ShipmentLogisticsTaskRow["taskType"],
  saleIso: string | null,
  fallbackSinceLabel: string,
  nowMs: number,
): ShipmentMilestoneAge {
  if (!legIsMarkedReady(step)) {
    return buildPendingMilestoneAge(key, label, `${label} · sin marcar`);
  }

  const anchorIso = legOrderAnchorIso(row, taskType) || saleIso;
  const sinceLabel =
    anchorIso && anchorIso !== saleIso
      ? "desde que se marcó"
      : fallbackSinceLabel;

  return buildWaitingMilestoneAge(
    key,
    label,
    anchorIso,
    sinceLabel,
    nowMs,
  );
}

export function buildShipmentMilestoneAges(
  row: ShipmentRow,
  steps: ShipmentProgressStep[],
  nowMs = Date.now(),
): ShipmentMilestoneAge[] {
  const saleIso = row.created_at || null;
  const emptyCompletedAt = resolveStepCompletedAt(row, "empty_box");
  const fullCompletedAt = resolveStepCompletedAt(row, "full_box");
  const emptyState = progressStepState(steps, "empty_box");
  const fullState = progressStepState(steps, "full_box");
  const emptyLabel = stepShortName("empty_box");
  const fullLabel = stepShortName("full_box");

  const saleAge = saleIso
    ? buildDoneMilestoneAge("sale", "Venta", saleIso, nowMs)
    : buildPendingMilestoneAge("sale", "Venta");

  let emptyAge: ShipmentMilestoneAge;
  if (emptyCompletedAt) {
    emptyAge = buildDoneMilestoneAge(
      "empty_box",
      emptyLabel,
      emptyCompletedAt,
      nowMs,
    );
  } else if (emptyState === "active") {
    const activeEmptyStep = activeStepForKind(steps, "empty_box");
    emptyAge = activeEmptyStep
      ? buildActiveLegMilestoneAge(
          "empty_box",
          emptyLabel,
          activeEmptyStep,
          row,
          "deliver_empty_box",
          saleIso,
          "desde la venta",
          nowMs,
        )
      : buildPendingMilestoneAge("empty_box", emptyLabel);
  } else {
    emptyAge = buildPendingMilestoneAge("empty_box", emptyLabel);
  }

  let fullAge: ShipmentMilestoneAge;
  if (fullCompletedAt) {
    fullAge = buildDoneMilestoneAge(
      "full_box",
      fullLabel,
      fullCompletedAt,
      nowMs,
    );
  } else if (fullState === "active") {
    const activeFullStep = activeStepForKind(steps, "full_box");
    const fallbackSince = emptyCompletedAt
      ? "desde dejar"
      : "desde la venta";
    fullAge = activeFullStep
      ? buildActiveLegMilestoneAge(
          "full_box",
          fullLabel,
          activeFullStep,
          row,
          "pickup_full_box",
          saleIso,
          fallbackSince,
          nowMs,
        )
      : buildPendingMilestoneAge("full_box", fullLabel);
  } else {
    fullAge = buildPendingMilestoneAge("full_box", fullLabel);
  }

  return [saleAge, emptyAge, fullAge];
}
