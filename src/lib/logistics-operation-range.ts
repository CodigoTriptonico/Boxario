import { startOfLogisticsWeek } from "@/lib/logistics-route-week";
import { formatScheduleDateInput } from "@/lib/schedule-date";

export type LogisticsOperationRange = {
  from: string;
  to: string;
};

export type LogisticsOperationRangeSelectionPhase = "start" | "end" | "complete";

export function selectLogisticsOperationRangeDate(
  current: LogisticsOperationRange,
  phase: LogisticsOperationRangeSelectionPhase,
  date: string,
): { range: LogisticsOperationRange; phase: LogisticsOperationRangeSelectionPhase } {
  if (phase === "start" || phase === "complete") {
    return { range: { from: date, to: date }, phase: "end" };
  }

  return {
    range: normalizeLogisticsOperationRange({ from: current.from, to: date }),
    phase: "complete",
  };
}

function parseDateKey(value: string) {
  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function normalizeLogisticsOperationRange(
  range: LogisticsOperationRange,
): LogisticsOperationRange {
  return range.from <= range.to
    ? range
    : { from: range.to, to: range.from };
}

export function logisticsOperationWeekRange(
  offset = 0,
  reference = new Date(),
): LogisticsOperationRange {
  const fromDate = startOfLogisticsWeek(reference);
  fromDate.setDate(fromDate.getDate() + offset * 7);
  const toDate = new Date(
    fromDate.getFullYear(),
    fromDate.getMonth(),
    fromDate.getDate() + 6,
    12,
  );

  return {
    from: formatScheduleDateInput(fromDate),
    to: formatScheduleDateInput(toDate),
  };
}

export function logisticsOperationRangeDayCount(range: LogisticsOperationRange) {
  const normalized = normalizeLogisticsOperationRange(range);
  const from = parseDateKey(normalized.from);
  const to = parseDateKey(normalized.to);
  if (!from || !to) return 1;
  return Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1);
}

function shiftDateKey(value: string, days: number) {
  const date = parseDateKey(value);
  if (!date) return value;
  date.setDate(date.getDate() + days);
  return formatScheduleDateInput(date);
}

export function shiftLogisticsOperationRange(
  range: LogisticsOperationRange,
  direction: -1 | 1,
): LogisticsOperationRange {
  const normalized = normalizeLogisticsOperationRange(range);
  const delta = logisticsOperationRangeDayCount(normalized) * direction;
  return {
    from: shiftDateKey(normalized.from, delta),
    to: shiftDateKey(normalized.to, delta),
  };
}

export function dateIsInLogisticsOperationRange(
  value: string,
  range: LogisticsOperationRange,
) {
  const normalized = normalizeLogisticsOperationRange(range);
  return value >= normalized.from && value <= normalized.to;
}
