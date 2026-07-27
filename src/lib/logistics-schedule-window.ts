import {
  parseScheduleTime,
  scheduleTimeComplete,
} from "@/lib/sale/schedule-time";
import { formatScheduleDateInput } from "@/lib/schedule-date";

function localTimestamp(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return null;
  }

  const value = new Date(`${date}T${time}`);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

function localTimePart(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function logisticsScheduleExpressionFromWindow(input: {
  scheduledAt?: string | null;
  scheduleKind?: "exact" | "range" | "from" | null;
  windowStartAt?: string | null;
  windowEndAt?: string | null;
}) {
  const anchor = input.windowStartAt || input.windowEndAt || input.scheduledAt;
  if (!anchor) {
    return "";
  }

  const anchorDate = new Date(anchor);
  if (Number.isNaN(anchorDate.getTime())) {
    return String(input.scheduledAt || "");
  }

  const date = formatScheduleDateInput(anchorDate);
  const start = localTimePart(input.windowStartAt || input.scheduledAt);
  const end = localTimePart(input.windowEndAt);

  if (input.scheduleKind === "from" && start) {
    return `${date}T${start}+`;
  }

  if (input.scheduleKind === "range" && !input.windowStartAt && end) {
    return `${date}T-${end}`;
  }

  if (input.scheduleKind === "range" && start && end) {
    return `${date}T${start}-${end}`;
  }

  return start ? `${date}T${start}` : "";
}

export function logisticsScheduleWindowPatch(scheduledAt: string | null | undefined) {
  const schedule = scheduledAt?.trim() || null;

  if (!schedule) {
    return {
      scheduled_at: null,
      requested_schedule_at: null,
      schedule_confirmation_status: "confirmed" as const,
      schedule_kind: null,
      window_start_at: null,
      window_end_at: null,
    };
  }

  const expressionMatch = /^(\d{4}-\d{2}-\d{2})T(.+)$/.exec(schedule);
  if (expressionMatch && scheduleTimeComplete(expressionMatch[2])) {
    const [, date, timePart] = expressionMatch;
    const parsed = parseScheduleTime(timePart);

    if (parsed.kind === "until") {
      const end = localTimestamp(date, parsed.start);
      if (end) {
        return {
          scheduled_at: end,
          requested_schedule_at: end,
          schedule_confirmation_status: "pending" as const,
          schedule_kind: "range" as const,
          window_start_at: null,
          window_end_at: end,
        };
      }
      return logisticsScheduleWindowPatch(null);
    }

    const start = localTimestamp(date, parsed.start);
    if (start) {
      const end =
        parsed.kind === "range" && parsed.end
          ? localTimestamp(date, parsed.end)
          : null;

      if (parsed.kind !== "range" || end) {
        return {
          scheduled_at: start,
          requested_schedule_at: start,
          schedule_confirmation_status: "pending" as const,
          schedule_kind: parsed.kind,
          window_start_at: start,
          window_end_at: end,
        };
      }
    }
  }

  const exact = new Date(schedule);
  if (Number.isNaN(exact.getTime())) {
    return logisticsScheduleWindowPatch(null);
  }
  const exactIso = exact.toISOString();

  return {
    scheduled_at: exactIso,
    requested_schedule_at: exactIso,
    schedule_confirmation_status: "pending" as const,
    schedule_kind: "exact" as const,
    window_start_at: exactIso,
    window_end_at: null,
  };
}

/**
 * Records a requested route day without inventing an appointment time.
 * Noon local avoids a UTC date rollover while the task remains unconfirmed.
 */
export function logisticsRequestedRouteDayPatch(routeDate: string | null | undefined) {
  const date = routeDate?.trim() || "";

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return logisticsScheduleWindowPatch(null);
  }

  const requestedAt = new Date(`${date}T12:00:00`);

  if (Number.isNaN(requestedAt.getTime())) {
    return logisticsScheduleWindowPatch(null);
  }

  return {
    scheduled_at: null,
    requested_schedule_at: requestedAt.toISOString(),
    schedule_confirmation_status: "pending" as const,
    schedule_kind: null,
    window_start_at: null,
    window_end_at: null,
  };
}
