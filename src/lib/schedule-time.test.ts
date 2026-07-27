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
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../components/sale/schedule-time-field.tsx"),
      "utf8",
    );

    assert.match(source, /rangeTarget/);
    assert.match(source, /DEFAULT_SCHEDULE_SUGGESTIONS/);
    assert.match(source, /resolvedSuggestions\.range/);
    assert.match(source, /PRESET_LABELS\[parsed\.kind\]/);
    assert.match(source, /formatScheduleTimePart\(\{ kind: "range", start, end \}\)/);
    assert.match(source, /onFocus=\{\(\) => setRangeTarget\("end"\)\}/);
  });

  it("renders preset shortcuts above time inputs so the picker does not cover them", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../components/sale/schedule-time-field.tsx"),
      "utf8",
    );

    const presetIndex = source.indexOf('PRESET_LABELS[parsed.kind]');
    const timeInputIndex = source.indexOf("Hora exacta");

    assert.ok(presetIndex > -1);
    assert.ok(timeInputIndex > -1);
    assert.ok(presetIndex < timeInputIndex);
  });

  it("uses the custom grid time picker instead of native time inputs", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../components/sale/schedule-time-field.tsx"),
      "utf8",
    );
    const calendarSource = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../components/time-picker-calendar.tsx"),
      "utf8",
    );

    assert.match(source, /TimePickerInput/);
    assert.match(source, /\["until", "Antes de"\]/);
    assert.match(source, /\["from", "A partir"\]/);
    assert.match(source, /\["range", "Entre"\]/);
    assert.equal(source.includes('type="time"'), false);
    assert.equal(source.includes("openNativePicker"), false);
    assert.match(calendarSource, /Elige la hora/);
    assert.match(calendarSource, /Elige el minuto/);
    assert.match(calendarSource, /setStep\("minute"\)/);
  });
});
