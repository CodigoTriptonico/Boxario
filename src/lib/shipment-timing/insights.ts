import {
  EMPTY_BOX_DRIVER_MODE,
  FULL_BOX_DRIVER_MODE,
} from "@/lib/sale-logistics-modes";
import {
  DAY_MS,
  formatShipmentAbsolute,
  formatShipmentDuration,
  formatShipmentRelative,
  parseIso,
  planLeg,
  resolveStepCompletedAt,
  saleAgeTextClass,
  taskByType,
} from "@/lib/shipment-timing/core";
import {
  activeStepForKind,
  elapsedSince,
  legIsMarkedReady,
  shouldTrackEmptyBoxInProgressWait,
  shouldTrackFullBoxInProgressWait,
} from "@/lib/shipment-timing/milestones";
import type {
  ShipmentProgressStep,
  ShipmentRow,
} from "@/lib/shipment-types";

export type ShipmentTimingInsightStatus = "done" | "active" | "pending";

export type ShipmentTimingInsightRow = {
  id: string;
  label: string;
  value: string;
  status: ShipmentTimingInsightStatus;
  detail: string | null;
  elapsedMs: number | null;
};

function legUsesDriverDelivery(
  plan: Record<string, unknown>,
  key: "emptyBox" | "fullBox",
) {
  const leg = planLeg(plan, key);
  const driverMode =
    key === "emptyBox" ? EMPTY_BOX_DRIVER_MODE : FULL_BOX_DRIVER_MODE;
  return String(leg?.mode || "") === driverMode;
}

function insightDurationValue(durationMs: number) {
  const duration = formatShipmentDuration(durationMs);
  return duration === "inmediato" ? "<1 min" : duration;
}

function insightGapRow(
  id: string,
  label: string,
  fromIso: string | null,
  toIso: string | null,
  nowMs: number,
  options?: {
    allowInProgress?: boolean;
    pendingDetail?: string;
    activePrefix?: string;
  },
): ShipmentTimingInsightRow {
  if (!fromIso) {
    return {
      id,
      label,
      value: "—",
      status: "pending",
      detail: options?.pendingDetail ?? "Pendiente",
      elapsedMs: null,
    };
  }

  if (!toIso) {
    if (!options?.allowInProgress) {
      return {
        id,
        label,
        value: "—",
        status: "pending",
        detail: options?.pendingDetail ?? "Pendiente",
        elapsedMs: null,
      };
    }

    const elapsedMs = elapsedSince(fromIso, nowMs);
    const duration = formatShipmentDuration(elapsedMs ?? 0);

    return {
      id,
      label,
      value: duration === "inmediato" ? "ahora" : duration,
      status: "active",
      detail: `${options?.activePrefix ?? "Lleva"} ${duration} · desde ${formatShipmentAbsolute(fromIso)}`,
      elapsedMs,
    };
  }

  const fromMs = parseIso(fromIso);
  const toMs = parseIso(toIso);

  if (fromMs === null || toMs === null || toMs < fromMs) {
    return {
      id,
      label,
      value: "—",
      status: "pending",
      detail: null,
      elapsedMs: null,
    };
  }

  const durationMs = toMs - fromMs;

  return {
    id,
    label,
    value: insightDurationValue(durationMs),
    status: "done",
    detail: `${formatShipmentAbsolute(fromIso)} → ${formatShipmentAbsolute(toIso)}`,
    elapsedMs: durationMs,
  };
}

export function timingInsightRowTextClass(
  status: ShipmentTimingInsightStatus,
  elapsedMs: number | null,
): string {
  if (status === "pending") {
    return "text-slate-600";
  }

  if (status === "active") {
    return elapsedMs !== null && elapsedMs >= DAY_MS
      ? "text-amber-300"
      : "text-amber-400/90";
  }

  return saleAgeTextClass(elapsedMs ?? 0);
}

export function buildShipmentTimingInsightPanel(
  row: ShipmentRow,
  steps: ShipmentProgressStep[],
  nowMs = Date.now(),
): ShipmentTimingInsightRow[] {
  const saleIso = row.created_at || null;
  const plan = row.logistics_plan;
  const emptyTask = taskByType(row, "deliver_empty_box");
  const fullTask = taskByType(row, "pickup_full_box");
  const emptyOrderedAt = emptyTask?.orderedAt || null;
  const fullOrderedAt = fullTask?.orderedAt || null;
  const emptyCompletedAt = resolveStepCompletedAt(row, "empty_box");
  const fullCompletedAt = resolveStepCompletedAt(row, "full_box");
  const emptyDriver = legUsesDriverDelivery(plan, "emptyBox");
  const fullDriver = legUsesDriverDelivery(plan, "fullBox");
  const emptyActive = activeStepForKind(steps, "empty_box");
  const fullActive = activeStepForKind(steps, "full_box");
  const rows: ShipmentTimingInsightRow[] = [];

  if (saleIso) {
    const elapsedMs = elapsedSince(saleIso, nowMs) ?? 0;
    const relative = formatShipmentRelative(saleIso, nowMs);

    rows.push({
      id: "sale",
      label: "Venta",
      value: relative.replace(/^hace /, ""),
      status: "done",
      detail: `Registrada ${relative} · ${formatShipmentAbsolute(saleIso)}`,
      elapsedMs,
    });
  } else {
    rows.push({
      id: "sale",
      label: "Venta",
      value: "—",
      status: "pending",
      detail: "Sin fecha de venta",
      elapsedMs: null,
    });
  }

  if (emptyDriver) {
    rows.push(
      insightGapRow(
        "sale-mark-empty",
        "Venta → marcar dejar",
        saleIso,
        emptyOrderedAt,
        nowMs,
        {
          pendingDetail:
            emptyActive && !legIsMarkedReady(emptyActive)
              ? "Aún no se marca para dejar"
              : "Pendiente",
        },
      ),
      insightGapRow(
        "mark-empty-done",
        "Marcar dejar → dejado",
        emptyOrderedAt,
        emptyCompletedAt,
        nowMs,
        {
          allowInProgress: Boolean(
            emptyOrderedAt &&
              !emptyCompletedAt &&
              legIsMarkedReady(emptyActive),
          ),
          pendingDetail: "Aún no se marca para dejar",
          activePrefix: "Lleva dejando",
        },
      ),
    );
  } else {
    rows.push(
      insightGapRow(
        "sale-empty-done",
        "Venta → dejado",
        saleIso,
        emptyCompletedAt,
        nowMs,
        {
          allowInProgress: shouldTrackEmptyBoxInProgressWait(
            row,
            emptyActive,
            emptyCompletedAt,
          ),
          pendingDetail: "Aún no se deja la caja vacía",
          activePrefix: "Lleva pendiente dejar",
        },
      ),
    );
  }

  if (fullDriver) {
    rows.push(
      insightGapRow(
        "empty-mark-full",
        "Dejado → marcar recoger",
        emptyCompletedAt,
        fullOrderedAt,
        nowMs,
        {
          pendingDetail: !emptyCompletedAt
            ? "Primero hay que dejar la caja vacía"
            : "Aún no se marca para recoger",
        },
      ),
      insightGapRow(
        "mark-full-done",
        "Marcar recoger → recogido",
        fullOrderedAt,
        fullCompletedAt,
        nowMs,
        {
          allowInProgress: Boolean(
            fullOrderedAt &&
              !fullCompletedAt &&
              legIsMarkedReady(fullActive),
          ),
          pendingDetail: !fullOrderedAt
            ? "Aún no se marca para recoger"
            : "Pendiente",
          activePrefix: "Lleva recogiendo",
        },
      ),
    );
  } else if (
    String(planLeg(plan, "fullBox")?.mode || "").trim()
  ) {
    rows.push(
      insightGapRow(
        "empty-full-done",
        "Dejado → recogido",
        emptyCompletedAt,
        fullCompletedAt,
        nowMs,
        {
          allowInProgress: shouldTrackFullBoxInProgressWait(
            row,
            fullActive,
            fullCompletedAt,
            emptyCompletedAt,
          ),
          pendingDetail: !emptyCompletedAt
            ? "Primero hay que dejar la caja vacía"
            : "Aún no se recoge la caja llena",
          activePrefix: "Lleva pendiente recoger",
        },
      ),
    );
  }

  return rows;
}
