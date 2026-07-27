export type ScheduleSuggestionModes = {
  exact: string[];
  until: string[];
  from: string[];
};

export type ScheduleSuggestionConfig = {
  delivery: ScheduleSuggestionModes;
  pickup: ScheduleSuggestionModes;
};

export type ScheduleTimeSuggestions = ScheduleSuggestionModes & {
  range: string[];
};

export const DEFAULT_SCHEDULE_SUGGESTIONS: ScheduleSuggestionConfig = {
  delivery: {
    exact: ["10:00", "12:00", "14:00", "17:00"],
    until: ["10:00", "12:00", "15:00", "18:00"],
    from: ["08:00", "10:00", "14:00", "17:00"],
  },
  pickup: {
    exact: ["10:00", "12:00", "14:00", "17:00"],
    until: ["10:00", "12:00", "15:00", "18:00"],
    from: ["08:00", "10:00", "14:00", "17:00"],
  },
};

function isTime(value: unknown): value is string {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function normalizeTimes(value: unknown, fallback: string[]) {
  const source = Array.isArray(value) ? value : [];
  const normalized = source.filter(isTime).slice(0, 12);
  return normalized.length ? Array.from(new Set(normalized)).sort() : [...fallback];
}

function normalizeModes(
  value: unknown,
  fallback: ScheduleSuggestionModes,
): ScheduleSuggestionModes {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    exact: normalizeTimes(input.exact, fallback.exact),
    until: normalizeTimes(input.until, fallback.until),
    from: normalizeTimes(input.from, fallback.from),
  };
}

export function normalizeScheduleSuggestionConfig(value: unknown): ScheduleSuggestionConfig {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return {
    delivery: normalizeModes(input.delivery, DEFAULT_SCHEDULE_SUGGESTIONS.delivery),
    pickup: normalizeModes(input.pickup, DEFAULT_SCHEDULE_SUGGESTIONS.pickup),
  };
}

export function scheduleTimeSuggestionsFor(
  config: ScheduleSuggestionConfig,
  service: "delivery" | "pickup",
  ranges: string[],
): ScheduleTimeSuggestions {
  const normalized = normalizeScheduleSuggestionConfig(config)[service];

  return {
    ...normalized,
    range: ranges.filter((range) => /^(?:[01]\d|2[0-3]):[0-5]\d-(?:[01]\d|2[0-3]):[0-5]\d$/.test(range)),
  };
}
