import assert from "node:assert/strict";
import test from "node:test";
import { formatStatisticDateRange } from "./statistics-format";

test("formatea rangos estadísticos sin fechas técnicas", () => {
  assert.equal(formatStatisticDateRange("2026-08-03", "2026-08-09"), "3 – 9 ago 2026");
  assert.equal(formatStatisticDateRange("2026-07-27", "2026-08-02"), "27 jul – 2 ago 2026");
});
