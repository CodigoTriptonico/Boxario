import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeScheduleSuggestionConfig,
  scheduleSuggestionModesForWeekday,
  scheduleTimeSuggestionsFor,
  setScheduleSuggestionModeEnabledForWeekday,
  setScheduleSuggestionModesForWeekday,
} from "@/lib/sale/schedule-suggestions";

describe("schedule suggestions by route weekday", () => {
  it("keeps legacy global values as the fallback for an unconfigured day", () => {
    const config = normalizeScheduleSuggestionConfig({
      delivery: { exact: ["08:00"], until: ["09:00"], from: ["10:00"] },
      pickup: { exact: ["11:00"], until: ["12:00"], from: ["13:00"] },
    });

    assert.deepEqual(scheduleSuggestionModesForWeekday(config, 1, "delivery"), {
      exact: ["08:00"],
      until: ["09:00"],
      from: ["10:00"],
      ranges: [],
      enabledModes: { exact: true, until: true, from: true, range: true },
    });
  });

  it("overrides only the selected service and weekday", () => {
    const config = normalizeScheduleSuggestionConfig(undefined);
    const monday = setScheduleSuggestionModesForWeekday(
      config,
      0,
      "delivery",
      { exact: ["07:00"], until: ["08:00"], from: ["09:00"] },
    );

    assert.deepEqual(scheduleSuggestionModesForWeekday(monday, 0, "delivery"), {
      exact: ["07:00"],
      until: ["08:00"],
      from: ["09:00"],
      ranges: [],
      enabledModes: { exact: true, until: true, from: true, range: true },
    });
    assert.deepEqual(
      scheduleSuggestionModesForWeekday(monday, 0, "pickup"),
      config.pickup,
    );
    assert.deepEqual(
      scheduleSuggestionModesForWeekday(monday, 1, "delivery"),
      config.delivery,
    );
  });

  it("can disable a mode by weekday without deleting its saved times", () => {
    const config = normalizeScheduleSuggestionConfig(undefined);
    const monday = setScheduleSuggestionModeEnabledForWeekday(
      config,
      0,
      "delivery",
      "exact",
      false,
    );
    const mondaySuggestions = scheduleTimeSuggestionsFor(monday, "delivery", [], 0);

    assert.equal(mondaySuggestions.enabledModes?.exact, false);
    assert.equal(mondaySuggestions.enabledModes?.until, true);
    assert.deepEqual(mondaySuggestions.exact, config.delivery.exact);
    assert.deepEqual(scheduleSuggestionModesForWeekday(monday, 1, "delivery"), config.delivery);
  });

  it("keeps an explicitly empty list empty instead of restoring defaults", () => {
    const config = normalizeScheduleSuggestionConfig(undefined);
    const monday = setScheduleSuggestionModesForWeekday(
      config,
      0,
      "delivery",
      { exact: [], until: [], from: [] },
    );

    assert.deepEqual(scheduleSuggestionModesForWeekday(monday, 0, "delivery"), {
      exact: [],
      until: [],
      from: [],
      ranges: [],
      enabledModes: { exact: true, until: true, from: true, range: true },
    });
  });

  it("combines configured Entre ranges with the route ranges", () => {
    const config = setScheduleSuggestionModesForWeekday(
      normalizeScheduleSuggestionConfig(undefined),
      0,
      "delivery",
      {
        exact: [],
        until: [],
        from: [],
        ranges: ["10:00-16:00"],
      },
    );

    assert.deepEqual(scheduleTimeSuggestionsFor(config, "delivery", ["08:00-10:00"], 0).range, [
      "08:00-10:00",
      "10:00-16:00",
    ]);
  });
});
