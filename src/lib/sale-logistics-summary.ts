import {
  EMPTY_BOX_DRIVER_MODE,
  EMPTY_BOX_OFFICE_MODE,
  FULL_BOX_DEFERRED_SUMMARY,
  FULL_BOX_DRIVER_MODE,
  FULL_BOX_OFFICE_MODE,
} from "@/lib/sale-logistics-modes";
import { formatScheduleAtDisplay, scheduleTimeComplete } from "@/lib/sale/schedule-time";

export function emptyBoxOfficeSummary() {
  return "Caja vacia entregada en mostrador";
}

export function deliverySummary(
  action: string,
  scheduleMode: string,
  scheduleAt: string,
) {
  if (!action) {
    return "Pendiente";
  }

  if (action === EMPTY_BOX_OFFICE_MODE) {
    return emptyBoxOfficeSummary();
  }

  if (!action.includes("Programar")) {
    return action;
  }

  if (scheduleMode === "pending") {
    return `${action} - pendiente`;
  }

  if (scheduleMode !== "scheduled") {
    return `${action} - falta elegir`;
  }

  return scheduleAt ? `${action} - ${formatScheduleAtDisplay(scheduleAt)}` : `${action} - falta fecha`;
}

export function fullBoxSummaryLine(
  fullBoxMode: string,
  fullBoxScheduleMode: string,
  fullBoxScheduleAt: string,
) {
  if (!fullBoxMode) {
    return FULL_BOX_DEFERRED_SUMMARY;
  }

  return deliverySummary(fullBoxMode, fullBoxScheduleMode, fullBoxScheduleAt);
}

function scheduledModeComplete(
  scheduleMode: string,
  scheduleAt: string,
  options?: { allowPending?: boolean },
) {
  const allowPending = options?.allowPending ?? false;
  const routeDate = scheduleAt.split("T")[0] || "";
  const routeTime = scheduleAt.split("T")[1] || "";

  if (allowPending && scheduleMode === "pending") {
    return true;
  }

  return (
    scheduleMode === "scheduled" && Boolean(routeDate && scheduleTimeComplete(routeTime))
  );
}

export function logisticsLegComplete(mode: string, scheduleMode: string, scheduleAt: string) {
  if (!mode) {
    return false;
  }

  if (mode === EMPTY_BOX_OFFICE_MODE || mode === FULL_BOX_OFFICE_MODE) {
    return true;
  }

  // Ambos modos conductor pueden quedar pendientes a nivel de agenda.
  // Caja vacía exige día/fecha en la decisión de ruta (selected o pending con fecha).
  const allowPending = mode === FULL_BOX_DRIVER_MODE || mode === EMPTY_BOX_DRIVER_MODE;
  return scheduledModeComplete(scheduleMode, scheduleAt, { allowPending });
}

export function saleLogisticsPlanReady(
  emptyBoxMode: string,
  emptyBoxScheduleMode: string,
  emptyBoxScheduleAt: string,
  fullBoxMode: string,
  fullBoxScheduleMode: string,
  fullBoxScheduleAt: string,
) {
  const emptyBoxComplete = logisticsLegComplete(
    emptyBoxMode,
    emptyBoxScheduleMode,
    emptyBoxScheduleAt,
  );

  if (!emptyBoxComplete) {
    return false;
  }

  if (!fullBoxMode) {
    return true;
  }

  return logisticsLegComplete(fullBoxMode, fullBoxScheduleMode, fullBoxScheduleAt);
}

export function saleLogisticsContinueHint(
  emptyBoxMode: string,
  emptyBoxScheduleMode: string,
  emptyBoxScheduleAt: string,
  fullBoxMode: string,
  fullBoxScheduleMode: string,
  fullBoxScheduleAt: string,
  fullBoxPickupExpanded: boolean,
) {
  if (
    saleLogisticsPlanReady(
      emptyBoxMode,
      emptyBoxScheduleMode,
      emptyBoxScheduleAt,
      fullBoxMode,
      fullBoxScheduleMode,
      fullBoxScheduleAt,
    )
  ) {
    return "";
  }

  const emptyComplete = logisticsLegComplete(emptyBoxMode, emptyBoxScheduleMode, emptyBoxScheduleAt);
  const pickupDeferred = !fullBoxMode && !fullBoxPickupExpanded;
  const fullComplete = logisticsLegComplete(fullBoxMode, fullBoxScheduleMode, fullBoxScheduleAt);

  if (!emptyComplete) {
    if (emptyBoxMode === EMPTY_BOX_DRIVER_MODE) {
      return "Elige la fecha de entrega de la caja vacía (la ruta es opcional).";
    }

    return "Elige cómo sale la caja vacía para continuar.";
  }

  if (pickupDeferred) {
    return "Elige cómo sale la caja vacía. La recolección queda pendiente.";
  }

  if (fullBoxMode && !fullComplete) {
    return "Completa la recolección o toca Dejar pendiente.";
  }

  return "Elige cómo sale la caja vacía para continuar.";
}

export function logisticsDriverTaskCount(emptyBoxMode: string, fullBoxMode: string) {
  return Number(emptyBoxMode === EMPTY_BOX_DRIVER_MODE) + Number(fullBoxMode === FULL_BOX_DRIVER_MODE);
}

export function logisticsSummary(
  emptyBoxMode: string,
  emptyBoxScheduleMode: string,
  emptyBoxScheduleAt: string,
  fullBoxMode: string,
  fullBoxScheduleMode: string,
  fullBoxScheduleAt: string,
  notes = "",
) {
  const parts = [
    `Caja vacia: ${deliverySummary(emptyBoxMode, emptyBoxScheduleMode, emptyBoxScheduleAt)}`,
    `Caja llena: ${fullBoxSummaryLine(fullBoxMode, fullBoxScheduleMode, fullBoxScheduleAt)}`,
  ];
  const cleanNotes = notes.trim();

  if (cleanNotes) {
    parts.push(`Notas: ${cleanNotes}`);
  }

  return parts.join(" | ");
}
