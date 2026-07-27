import { parseScheduleTime } from "@/lib/sale/schedule-time";

export type LogisticsRouteSchedule = {
  startTime?: string | null;
  estimatedEndTime?: string | null;
};

function minutes(value: string | null | undefined) {
  const normalized = String(value || "").slice(0, 5);
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(normalized)) {
    return null;
  }
  const [hour, minute] = normalized.split(":").map(Number);
  return hour * 60 + minute;
}

export function routeScheduleRangeSuggestions(
  routes: ReadonlyArray<LogisticsRouteSchedule>,
) {
  return Array.from(
    new Set(
      routes.flatMap((route) => {
        const start = String(route.startTime || "").slice(0, 5);
        const end = String(route.estimatedEndTime || "").slice(0, 5);
        if (minutes(start) === null || minutes(end) === null || start >= end) {
          return [];
        }
        return [`${start}-${end}`];
      }),
    ),
  ).sort();
}

function clientAvailabilityWindow(value: string) {
  const parsed = parseScheduleTime(value);
  const start = minutes(parsed.start);
  if (start === null) {
    return null;
  }

  if (parsed.kind === "range") {
    const end = minutes(parsed.end);
    if (end === null) {
      return null;
    }
    return { start: Math.min(start, end), end: Math.max(start, end) };
  }

  if (parsed.kind === "from") {
    return { start, end: 24 * 60 };
  }

  if (parsed.kind === "until") {
    return { start: 0, end: start };
  }

  return { start, end: start };
}

export function routeScheduleHasAvailabilityMismatch(
  clientAvailability: string,
  route: LogisticsRouteSchedule,
) {
  const routeStart = minutes(route.startTime);
  const routeEnd = minutes(route.estimatedEndTime);
  const clientWindow = clientAvailabilityWindow(clientAvailability);

  if (routeStart === null || routeEnd === null || routeStart >= routeEnd || !clientWindow) {
    return false;
  }

  return clientWindow.end < routeStart || clientWindow.start > routeEnd;
}
