import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const source = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../components/logistica/logistics-route-catalog.tsx",
  ),
  "utf8",
);

describe("logistics route day schedule UI", () => {
  it("keeps the general schedule inside each enabled weekday card", () => {
    const dayCardsStart = source.indexOf("logisticsWeekdayKeys.map");
    const namedRoutesStart = source.indexOf("Subrutas del {weekdayNames[selectedDay]}");
    const dayCards = source.slice(dayCardsStart, namedRoutesStart);

    assert.notEqual(dayCardsStart, -1);
    assert.notEqual(namedRoutesStart, -1);
    assert.equal(dayCards.includes("Horario general"), true);
    assert.equal(dayCards.includes("dayScheduleStart"), true);
    assert.equal(dayCards.includes("dayScheduleEnd"), true);
    assert.equal(dayCards.includes("saveDaySchedule(index)"), true);
  });

  it("does not repeat the general schedule as a named route", () => {
    const namedRoutesStart = source.indexOf("Subrutas del {weekdayNames[selectedDay]}");
    const namedRoutes = source.slice(namedRoutesStart);

    assert.equal(source.includes("setLogisticsWeekdayScheduleAction"), true);
    assert.equal(source.includes("genericLogisticsRouteName"), false);
    assert.equal(namedRoutes.includes("Horario general"), false);
    assert.equal(namedRoutes.includes("Nueva subruta"), true);
    assert.equal(namedRoutes.includes("Sin subrutas para este día"), true);
  });
});
