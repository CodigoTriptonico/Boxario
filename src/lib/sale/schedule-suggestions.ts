const SCHEDULE_SUGGESTION_MODE_KEYS = ["exact", "until", "from", "range"] as const;

export const SCHEDULE_SINGLE_TIME_MODE_KEYS = ["exact", "until", "from"] as const;

export type ScheduleSuggestionModeKey = (typeof SCHEDULE_SUGGESTION_MODE_KEYS)[number];

export type ScheduleSuggestionModeAvailability = Record<ScheduleSuggestionModeKey, boolean>;

export type ScheduleSuggestionModes = {
  exact: string[];
  until: string[];
  from: string[];
  /** Suggested ranges configured for the Entre modality. */
  ranges?: string[];
  /** A missing value keeps every configurable mode enabled for legacy settings. */
  enabledModes?: ScheduleSuggestionModeAvailability;
};

export type ScheduleSuggestionService = "delivery" | "pickup";

export type ScheduleSuggestionDayConfig = {
  delivery: ScheduleSuggestionModes;
  pickup: ScheduleSuggestionModes;
};

export type ScheduleSuggestionConfig = {
  delivery: ScheduleSuggestionModes;
  pickup: ScheduleSuggestionModes;
  /** Optional per-weekday overrides. Keys use the Monday=0…Sunday=6 route indexes. */
  byWeekday?: Partial<Record<number, ScheduleSuggestionDayConfig>>;
};

export type ScheduleTimeSuggestions = ScheduleSuggestionModes & {
  range: string[];
};

export const DEFAULT_SCHEDULE_SUGGESTIONS: ScheduleSuggestionConfig = {
  delivery: {
    exact: ["10:00", "12:00", "14:00", "17:00"],
    until: ["10:00", "12:00", "15:00", "18:00"],
    from: ["08:00", "10:00", "14:00", "17:00"],
    ranges: [],
  },
  pickup: {
    exact: ["10:00", "12:00", "14:00", "17:00"],
    until: ["10:00", "12:00", "15:00", "18:00"],
    from: ["08:00", "10:00", "14:00", "17:00"],
    ranges: [],
  },
  byWeekday: {},
};

function isTime(value: unknown): value is string {
  return typeof value === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function isTimeRange(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^(?:[01]\d|2[0-3]):[0-5]\d-(?:[01]\d|2[0-3]):[0-5]\d$/.test(value)
  );
}

function normalizeTimes(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  return Array.from(new Set(value.filter(isTime).slice(0, 12))).sort();
}

function normalizeRanges(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return [...fallback];
  }

  return Array.from(new Set(value.filter(isTimeRange).slice(0, 12))).sort();
}

function normalizeModes(
  value: unknown,
  fallback: ScheduleSuggestionModes,
): ScheduleSuggestionModes {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const fallbackEnabledModes = normalizeEnabledModes(
    fallback.enabledModes,
    createAllModesEnabled(),
  );

  return {
    exact: normalizeTimes(input.exact, fallback.exact),
    until: normalizeTimes(input.until, fallback.until),
    from: normalizeTimes(input.from, fallback.from),
    ranges: normalizeRanges(input.ranges, fallback.ranges || []),
    enabledModes: normalizeEnabledModes(input.enabledModes, fallbackEnabledModes),
  };
}

function createAllModesEnabled(): ScheduleSuggestionModeAvailability {
  return {
    exact: true,
    until: true,
    from: true,
    range: true,
  };
}

function normalizeEnabledModes(
  value: unknown,
  fallback: ScheduleSuggestionModeAvailability,
): ScheduleSuggestionModeAvailability {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};

  return SCHEDULE_SUGGESTION_MODE_KEYS.reduce(
    (result, key) => {
      result[key] = typeof input[key] === "boolean" ? input[key] : fallback[key];
      return result;
    },
    {} as ScheduleSuggestionModeAvailability,
  );
}

export function isScheduleSuggestionModeKey(value: unknown): value is ScheduleSuggestionModeKey {
  return (
    typeof value === "string" &&
    SCHEDULE_SUGGESTION_MODE_KEYS.includes(value as ScheduleSuggestionModeKey)
  );
}

export function scheduleSuggestionModeEnabled(
  modes: ScheduleSuggestionModes,
  mode: ScheduleSuggestionModeKey,
) {
  return modes.enabledModes?.[mode] !== false;
}

export function normalizeScheduleSuggestionConfig(value: unknown): ScheduleSuggestionConfig {
  const input = value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  const delivery = normalizeModes(input.delivery, DEFAULT_SCHEDULE_SUGGESTIONS.delivery);
  const pickup = normalizeModes(input.pickup, DEFAULT_SCHEDULE_SUGGESTIONS.pickup);
  const byWeekday: Partial<Record<number, ScheduleSuggestionDayConfig>> = {};
  const rawByWeekday =
    input.byWeekday && typeof input.byWeekday === "object"
      ? (input.byWeekday as Record<string, unknown>)
      : {};

  for (let weekday = 0; weekday <= 6; weekday += 1) {
    const rawDay = rawByWeekday[String(weekday)];
    if (!rawDay || typeof rawDay !== "object") {
      continue;
    }

    const day = rawDay as Record<string, unknown>;
    byWeekday[weekday] = {
      delivery: normalizeModes(day.delivery, delivery),
      pickup: normalizeModes(day.pickup, pickup),
    };
  }

  return {
    delivery,
    pickup,
    byWeekday,
  };
}

export function scheduleSuggestionModesForWeekday(
  config: ScheduleSuggestionConfig,
  weekday: number | null | undefined,
  service: ScheduleSuggestionService,
): ScheduleSuggestionModes {
  const normalized = normalizeScheduleSuggestionConfig(config);
  const day =
    Number.isInteger(weekday) && Number(weekday) >= 0 && Number(weekday) <= 6
      ? normalized.byWeekday?.[Number(weekday)]
      : undefined;

  return day?.[service] || normalized[service];
}

export function setScheduleSuggestionModesForWeekday(
  config: ScheduleSuggestionConfig,
  weekday: number,
  service: ScheduleSuggestionService,
  modes: ScheduleSuggestionModes,
): ScheduleSuggestionConfig {
  const normalized = normalizeScheduleSuggestionConfig(config);
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    return normalized;
  }

  const currentDay = normalized.byWeekday?.[weekday] || {
    delivery: normalized.delivery,
    pickup: normalized.pickup,
  };

  return {
    ...normalized,
    byWeekday: {
      ...normalized.byWeekday,
      [weekday]: {
        ...currentDay,
        [service]: normalizeModes(modes, normalized[service]),
      },
    },
  };
}

export function setSharedScheduleSuggestionModesForWeekday(
  config: ScheduleSuggestionConfig,
  weekday: number,
  modes: ScheduleSuggestionModes,
): ScheduleSuggestionConfig {
  const withDelivery = setScheduleSuggestionModesForWeekday(
    config,
    weekday,
    "delivery",
    modes,
  );
  return setScheduleSuggestionModesForWeekday(withDelivery, weekday, "pickup", modes);
}

export function setScheduleSuggestionModeEnabledForWeekday(
  config: ScheduleSuggestionConfig,
  weekday: number,
  service: ScheduleSuggestionService,
  mode: ScheduleSuggestionModeKey,
  enabled: boolean,
): ScheduleSuggestionConfig {
  const normalized = normalizeScheduleSuggestionConfig(config);
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
    return normalized;
  }

  const current = scheduleSuggestionModesForWeekday(normalized, weekday, service);
  return setScheduleSuggestionModesForWeekday(normalized, weekday, service, {
    ...current,
    enabledModes: {
      exact: current.enabledModes?.exact !== false,
      until: current.enabledModes?.until !== false,
      from: current.enabledModes?.from !== false,
      range: current.enabledModes?.range !== false,
      [mode]: enabled,
    },
  });
}

export function setSharedScheduleSuggestionModeEnabledForWeekday(
  config: ScheduleSuggestionConfig,
  weekday: number,
  mode: ScheduleSuggestionModeKey,
  enabled: boolean,
): ScheduleSuggestionConfig {
  const withDelivery = setScheduleSuggestionModeEnabledForWeekday(
    config,
    weekday,
    "delivery",
    mode,
    enabled,
  );
  return setScheduleSuggestionModeEnabledForWeekday(
    withDelivery,
    weekday,
    "pickup",
    mode,
    enabled,
  );
}

export function scheduleTimeSuggestionsFor(
  config: ScheduleSuggestionConfig,
  service: ScheduleSuggestionService,
  ranges: string[],
  weekday?: number | null,
): ScheduleTimeSuggestions {
  const normalized = scheduleSuggestionModesForWeekday(config, weekday, service);
  const configuredRanges = normalized.ranges || [];
  const routeRanges = ranges.filter(isTimeRange);

  return {
    ...normalized,
    range: Array.from(new Set([...configuredRanges, ...routeRanges])).sort(),
  };
}
