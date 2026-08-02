import {
  milestoneKeyForProgressKind,
  type ShipmentMilestoneKey,
} from "@/lib/shipment-milestones";
import { parseShipmentIso } from "@/lib/shipment-time-format";
import type {
  ShipmentProgressKind,
  ShipmentRow,
} from "@/lib/shipment-types";

import {
  planLeg,
  taskByType,
} from "@/lib/shipment-display/shared";

export { formatShipmentAbsolute } from "@/lib/shipment-time-format";
export { planLeg, taskByType };
const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

export type SaleAgeTone = "fresh" | "recent" | "aging" | "stale" | "urgent";

const SALE_AGE_TEXT_CLASS: Record<SaleAgeTone, string> = {
  fresh: "text-slate-500",
  recent: "text-slate-400",
  aging: "text-slate-300",
  stale: "text-amber-400",
  urgent: "text-amber-300",
};

export function saleAgeTone(saleAgeMs: number): SaleAgeTone {
  if (!Number.isFinite(saleAgeMs) || saleAgeMs < 0) {
    return "fresh";
  }

  if (saleAgeMs < HOUR_MS) {
    return "fresh";
  }

  if (saleAgeMs < 6 * HOUR_MS) {
    return "recent";
  }

  if (saleAgeMs < DAY_MS) {
    return "aging";
  }

  if (saleAgeMs < 2 * DAY_MS) {
    return "stale";
  }

  return "urgent";
}

export function saleAgeTextClass(saleAgeMs: number): string {
  return SALE_AGE_TEXT_CLASS[saleAgeTone(saleAgeMs)];
}

export type ShipmentStepGap = {
  fromKind: ShipmentProgressKind;
  toKind: ShipmentProgressKind;
  durationMs: number;
  label: string;
};

export type ShipmentTimings = {
  saleAgeMs: number;
  saleAgeLabel: string;
  completedAtByKind: Partial<Record<ShipmentProgressKind, string>>;
  gaps: ShipmentStepGap[];
  gapSummaries: string[];
  completedGapsLine: string | null;
  lastCompletedGap: string | null;
  progressStepLabel: string;
  activeElapsedMs: number | null;
  activeElapsedLabel: string | null;
  activeElapsedDetail: string | null;
  waitingHeadline: string | null;
  waitingSinceLabel: string | null;
  waitingText: string | null;
  activeStepShortName: string | null;
  isLongWait: boolean;
};

const STEP_SHORT_NAMES: Record<ShipmentProgressKind, string> = {
  sale: "Venta",
  empty_box: "Dejar",
  full_box: "Recoger",
  payment: "Cobro",
  office: "Oficina",
  pickup: "Salida",
  transit: "Tránsito",
  delivered: "Destino",
};

export function stepShortName(kind: ShipmentProgressKind) {
  return STEP_SHORT_NAMES[kind] || kind;
}

export function parseIso(value: string | null | undefined) {
  return parseShipmentIso(value);
}

export function formatShipmentDuration(durationMs: number) {
  if (!Number.isFinite(durationMs) || durationMs < 0) {
    return "";
  }

  if (durationMs < MINUTE_MS) {
    return "inmediato";
  }

  if (durationMs < HOUR_MS) {
    const minutes = Math.max(1, Math.round(durationMs / MINUTE_MS));
    return `${minutes} min`;
  }

  if (durationMs < DAY_MS) {
    const hours = Math.max(1, Math.round(durationMs / HOUR_MS));
    return hours === 1 ? "1 hora" : `${hours} horas`;
  }

  const days = Math.max(1, Math.round(durationMs / DAY_MS));
  return days === 1 ? "1 día" : `${days} días`;
}

export function formatShipmentRelative(iso: string, nowMs = Date.now()) {
  const at = parseIso(iso);
  if (at === null) {
    return "";
  }

  const durationMs = Math.max(0, nowMs - at);
  const duration = formatShipmentDuration(durationMs);

  if (duration === "inmediato") {
    return "hace un momento";
  }

  return `hace ${duration}`;
}

function gapPairLabel(
  fromKind: ShipmentProgressKind,
  toKind: ShipmentProgressKind,
) {
  return `${stepShortName(fromKind)} → ${stepShortName(toKind).toLowerCase()}`;
}

export function formatGapSummary(gap: ShipmentStepGap) {
  return `${gapPairLabel(gap.fromKind, gap.toKind)} · ${gap.label}`;
}

export function formatActiveElapsed(
  durationLabel: string,
  anchorKind: ShipmentProgressKind | null,
) {
  if (!durationLabel) {
    return null;
  }

  if (!anchorKind || anchorKind === "sale") {
    return `${durationLabel} desde la venta`;
  }

  return `${durationLabel} desde ${stepShortName(anchorKind).toLowerCase()}`;
}

export function formatWaitingHeadline(durationLabel: string) {
  if (!durationLabel || durationLabel === "inmediato") {
    return "Recién iniciado";
  }

  return `Lleva ${durationLabel}`;
}

export function formatWaitingSince(anchorKind: ShipmentProgressKind | null) {
  if (!anchorKind || anchorKind === "sale") {
    return "desde la venta";
  }

  return `desde ${stepShortName(anchorKind).toLowerCase()}`;
}

function milestoneColumnValue(row: ShipmentRow, key: ShipmentMilestoneKey) {
  return row[key] || null;
}

export function resolveStepCompletedAt(
  row: ShipmentRow,
  kind: ShipmentProgressKind,
): string | null {
  if (kind === "sale") {
    return row.created_at || null;
  }

  if (kind === "payment") {
    return row.finalized_at || null;
  }

  const milestoneKey = milestoneKeyForProgressKind(kind);
  if (milestoneKey) {
    const columnValue = milestoneColumnValue(row, milestoneKey);
    if (columnValue) {
      return columnValue;
    }
  }

  if (kind === "empty_box") {
    const emptyLeg = planLeg(row.logistics_plan, "emptyBox");
    const stockDeductedAt = String(emptyLeg?.stockDeductedAt || "").trim();
    if (stockDeductedAt) {
      return stockDeductedAt;
    }

    const task = taskByType(row, "deliver_empty_box");
    return task?.completedAt || task?.stockDeductedAt || null;
  }

  if (kind === "full_box") {
    const task = taskByType(row, "pickup_full_box");
    if (task?.completedAt) {
      return task.completedAt;
    }

    return row.full_box_collected_at || row.office_received_at || null;
  }

  return null;
}

export function gapBetween(
  fromKind: ShipmentProgressKind,
  toKind: ShipmentProgressKind,
  fromIso: string,
  toIso: string,
): ShipmentStepGap | null {
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

  return { fromKind, toKind, durationMs, label };
}
