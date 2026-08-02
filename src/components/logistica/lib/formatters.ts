import { logisticsScheduleDisplayParts } from "@/lib/logistics-view";
import { scheduledAtToLocalDateInput } from "@/lib/schedule-date";

export function formatSchedule(value: string | null) {
  return logisticsScheduleDisplayParts(value).primary;
}

export function formatTaskDate(value: string | null) {
  if (!value) {
    return "Sin fecha";
  }

  const localDate = scheduledAtToLocalDateInput(value);
  if (!localDate) {
    return "Sin fecha";
  }

  const [year, month, day] = localDate.split("-").map(Number);
  if (!year || !month || !day) {
    return "Sin fecha";
  }

  const label = new Intl.DateTimeFormat("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day, 12));

  return label.charAt(0).toUpperCase() + label.slice(1);
}
