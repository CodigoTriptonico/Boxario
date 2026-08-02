import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  applyScheduleTimePreset,
  formatScheduleAtDisplay,
  formatScheduleDateLabel,
  formatScheduleTimePart,
  parseScheduleTime,
  scheduleTimeComplete,
  scheduleTimePresetMatches,
} from "@/lib/sale/schedule-time";
import {
  DEFAULT_SCHEDULE_SUGGESTIONS,
  scheduleSuggestionModeEnabled,
} from "@/lib/sale/schedule-suggestions";

const root = dirname(fileURLToPath(import.meta.url));
const scheduleTimeFieldSource = readFileSync(
  join(root, "../components/sale/schedule-time-field.tsx"),
  "utf8",
);
const scheduleSuggestionsSource = readFileSync(
  join(root, "sale/schedule-suggestions.ts"),
  "utf8",
);
const calendarSource = readFileSync(
  join(root, "../components/time-picker-calendar.tsx"),
  "utf8",
);

describe("schedule time display", () => {
  it("starts without a default exact time", () => {
    assert.deepEqual(parseScheduleTime(""), { kind: "exact", start: "" });
  });

  it("shows Spanish month names for scheduled dates", () => {
    assert.equal(formatScheduleDateLabel("2026-07-10"), "10 de julio de 2026");
  });

  it("shows scheduled date and time with month name", () => {
    assert.equal(
      formatScheduleAtDisplay("2026-07-10T17:00:00.000Z"),
      "10 de julio de 2026 a las 5:00 PM",
    );
  });

  it("keeps desde mode when applying a preset time", () => {
    const parsed = parseScheduleTime("12:00+");
    assert.equal(parsed.kind, "from");
    assert.equal(formatScheduleTimePart({ ...parsed, start: "10:00" }), "10:00+");
  });

  it("supports a deadline expressed as antes de", () => {
    assert.deepEqual(parseScheduleTime("-10:00"), { kind: "until", start: "10:00" });
    assert.equal(
      formatScheduleAtDisplay("2026-07-10T-10:00"),
      "10 de julio de 2026 antes de 10:00 AM",
    );
    assert.equal(scheduleTimeComplete("-10:00"), true);
  });

  it("normalizes a between range even when the two hours are entered backwards", () => {
    assert.equal(
      formatScheduleTimePart({ kind: "range", start: "17:00", end: "16:00" }),
      "16:00-17:00",
    );
    assert.equal(
      formatScheduleAtDisplay("2026-07-10T16:00-17:00"),
      "10 de julio de 2026 entre 4:00 PM y 5:00 PM",
    );
  });

  it("highlights presets for desde and rango, not only puntual", () => {
    assert.equal(scheduleTimePresetMatches("10:00+", "10:00"), true);
    assert.equal(scheduleTimePresetMatches("10:00-14:00", "10:00"), true);
    assert.equal(scheduleTimePresetMatches("10:00", "10:00"), true);
    assert.equal(scheduleTimePresetMatches("12:00+", "10:00"), false);
  });

  it("applies presets to hasta when targeting the range end", () => {
    assert.equal(applyScheduleTimePreset("10:00-14:00", "17:00", "end"), "10:00-17:00");
    assert.equal(applyScheduleTimePreset("10:00-14:00", "12:00", "start"), "12:00-14:00");
    assert.equal(scheduleTimePresetMatches("10:00-14:00", "14:00", "end"), true);
    assert.equal(scheduleTimePresetMatches("10:00-14:00", "14:00", "start"), false);
  });
});

describe("schedule time field eval", () => {
  it("changes suggestions with the selected mode and applies complete ranges", () => {
    assert.match(scheduleTimeFieldSource, /rangeTarget/);
    assert.match(scheduleTimeFieldSource, /resolvedSuggestions\.range/);
    assert.match(scheduleTimeFieldSource, /PRESET_LABELS\[activeKind\]/);
    assert.match(
      scheduleTimeFieldSource,
      /formatScheduleTimePart\(\{ kind: "range", start, end \}\)/,
    );
    assert.match(scheduleTimeFieldSource, /onFocus=\{\(\) => setRangeTarget\("end"\)\}/);

    // Defaults live in the shared config module; the field consumes props and does not invent hours.
    assert.match(scheduleSuggestionsSource, /export const DEFAULT_SCHEDULE_SUGGESTIONS/);
    assert.ok(DEFAULT_SCHEDULE_SUGGESTIONS.delivery.until.includes("18:00"));
    assert.equal(
      scheduleSuggestionModeEnabled(
        { exact: [], until: [], from: [], range: [] },
        "until",
      ),
      true,
    );
    assert.doesNotMatch(scheduleTimeFieldSource, /DEFAULT_SCHEDULE_SUGGESTIONS/);
  });

  it("renders preset shortcuts above time inputs so the picker does not cover them", () => {
    const presetIndex = scheduleTimeFieldSource.indexOf("PRESET_LABELS[activeKind]");
    const timeInputIndex = scheduleTimeFieldSource.indexOf("Hora exacta");

    assert.ok(presetIndex > -1);
    assert.ok(timeInputIndex > -1);
    assert.ok(presetIndex < timeInputIndex);
  });

  it("uses the custom grid time picker instead of native time inputs", () => {
    assert.match(scheduleTimeFieldSource, /TimePickerInput/);
    assert.match(
      scheduleTimeFieldSource,
      /kind === "until" \? "Antes de"/,
    );
    assert.match(
      scheduleTimeFieldSource,
      /kind === "exact" \? "Exacta"/,
    );
    assert.match(scheduleTimeFieldSource, /\["range", "Entre"\]/);
    assert.match(scheduleTimeFieldSource, /"A partir"/);
    assert.equal(scheduleTimeFieldSource.includes('type="time"'), false);
    assert.equal(scheduleTimeFieldSource.includes("openNativePicker"), false);
    assert.match(calendarSource, /aria-label="Seleccionar hora"/);
    assert.match(calendarSource, /aria-label="Seleccionar minuto"/);
    assert.match(calendarSource, /setStep\("minute"\)/);
  });
});
