export const logisticsWeekdayKeys = [
  "Lun",
  "Mar",
  "Mie",
  "Jue",
  "Vie",
  "Sab",
  "Dom",
] as const;

export const logisticsWeekdayLabels = [
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
  "Domingo",
] as const;

export type LogisticsWeekdayKey = (typeof logisticsWeekdayKeys)[number];

export function isLogisticsWeekdayKey(value: unknown): value is LogisticsWeekdayKey {
  return typeof value === "string" && logisticsWeekdayKeys.includes(value as LogisticsWeekdayKey);
}
