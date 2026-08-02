import { logisticsWeekdayFullLabels } from "@/lib/logistics-day-route";
import { getLogisticsWeekdayIndex } from "@/lib/logistics-route-week";
import { scheduledAtToLocalDateInput } from "@/lib/schedule-date";

export const EMPTY_BOX_LEG_LABELS = {
  short: "Dejar",
  ready: "Programar entrega",
  cancel: "Cancelar entrega",
  setDate: "Establecer una fecha",
  scheduleAria: "Fecha para dejar",
  auditStep: "Dejar",
  pendingRoute: "No sé la ruta todavía",
} as const;

export const FULL_BOX_LEG_LABELS = {
  short: "Recoger",
  ready: "Programar recolección",
  cancel: "Cancelar recolección",
  setDate: "Establecer una fecha",
  scheduleAria: "Fecha para recoger",
  auditStep: "Recoger",
  pendingRoute: "No sé la ruta todavía",
} as const;

export function logisticsLegRouteActionCopy(
  kind: "empty_box" | "full_box",
  hasExistingProgramming: boolean,
) {
  if (hasExistingProgramming) {
    return {
      title: kind === "empty_box" ? "Editar entrega" : "Editar recolección",
      description:
        "Ya está programada. Cambia la ruta (día) o la hora solo si hace falta.",
    };
  }

  return {
    title: kind === "empty_box" ? EMPTY_BOX_LEG_LABELS.ready : FULL_BOX_LEG_LABELS.ready,
    description:
      "Elige la ruta (día) y la hora. Si no la sabes, déjala pendiente de ruta.",
  };
}

function logisticsLegNoun(kind: "empty_box" | "full_box") {
  return kind === "empty_box" ? "Entrega" : "Recolección";
}

export function weekdayLabelFromSchedule(
  scheduledAt: string | null | undefined,
) {
  const date = scheduledAtToLocalDateInput(scheduledAt);
  if (!date) {
    return "";
  }

  const label = logisticsWeekdayFullLabels[getLogisticsWeekdayIndex(date)];
  return label ? label.toLowerCase() : "";
}

/** Etiqueta del chip de progreso en Seguimiento según programación. */
export function logisticsLegCompactLabel(
  kind: "empty_box" | "full_box",
  input: {
    active: boolean;
    ordered: boolean;
    scheduledAt?: string | null;
  },
) {
  if (!input.active) {
    return kind === "empty_box" ? EMPTY_BOX_LEG_LABELS.short : FULL_BOX_LEG_LABELS.short;
  }

  const noun = logisticsLegNoun(kind);

  if (!input.ordered) {
    return `${noun} por asignar`;
  }

  const weekday = weekdayLabelFromSchedule(input.scheduledAt);
  if (weekday) {
    return `${noun} para el ${weekday}`;
  }

  return `${noun} programada`;
}
