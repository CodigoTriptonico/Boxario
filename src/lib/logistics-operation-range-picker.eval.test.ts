import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const source = readFileSync(
  join(process.cwd(), "src/components/logistica/logistics-unified-route-list.tsx"),
  "utf8",
);

describe("logistics operation range picker", () => {
  it("uses one calendar to select both dates", () => {
    assert.match(source, /<DatePickerCalendar/);
    assert.match(source, /selectLogisticsOperationRangeDate/);
    assert.match(source, /rangeStart=\{draftRange\.from\}/);
    assert.match(source, /rangeEnd=\{draftRange\.to\}/);
    assert.match(source, /Ahora selecciona la fecha final/);
    assert.match(source, /disabled=\{selectionPhase === "end"\}/);
    assert.doesNotMatch(source, /Primera fecha del rango operativo/);
    assert.doesNotMatch(source, /Última fecha del rango operativo/);
    assert.doesNotMatch(source, /import \{ DateInput \}/);
  });
});
