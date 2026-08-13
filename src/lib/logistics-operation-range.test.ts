import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  dateIsInLogisticsOperationRange,
  logisticsOperationRangeDayCount,
  logisticsOperationWeekRange,
  normalizeLogisticsOperationRange,
  selectLogisticsOperationRangeDate,
  shiftLogisticsOperationRange,
} from "./logistics-operation-range";

describe("logistics operation ranges", () => {
  it("builds the Monday-to-Sunday operation week", () => {
    assert.deepEqual(
      logisticsOperationWeekRange(0, new Date("2026-08-13T12:00:00")),
      { from: "2026-08-10", to: "2026-08-16" },
    );
  });

  it("normalizes and filters a custom inclusive range", () => {
    const range = normalizeLogisticsOperationRange({
      from: "2026-08-20",
      to: "2026-08-10",
    });
    assert.deepEqual(range, { from: "2026-08-10", to: "2026-08-20" });
    assert.equal(dateIsInLogisticsOperationRange("2026-08-10", range), true);
    assert.equal(dateIsInLogisticsOperationRange("2026-08-20", range), true);
    assert.equal(dateIsInLogisticsOperationRange("2026-08-21", range), false);
  });

  it("moves the complete range by its own inclusive duration", () => {
    const range = { from: "2026-08-10", to: "2026-08-12" };
    assert.equal(logisticsOperationRangeDayCount(range), 3);
    assert.deepEqual(shiftLogisticsOperationRange(range, 1), {
      from: "2026-08-13",
      to: "2026-08-15",
    });
    assert.deepEqual(shiftLogisticsOperationRange(range, -1), {
      from: "2026-08-07",
      to: "2026-08-09",
    });
  });

  it("selects both limits sequentially in one calendar", () => {
    const first = selectLogisticsOperationRangeDate(
      { from: "2026-08-10", to: "2026-08-16" },
      "start",
      "2026-08-12",
    );
    assert.deepEqual(first, {
      range: { from: "2026-08-12", to: "2026-08-12" },
      phase: "end",
    });

    const second = selectLogisticsOperationRangeDate(first.range, first.phase, "2026-08-08");
    assert.deepEqual(second, {
      range: { from: "2026-08-08", to: "2026-08-12" },
      phase: "complete",
    });

    const restarted = selectLogisticsOperationRangeDate(second.range, second.phase, "2026-08-20");
    assert.deepEqual(restarted, {
      range: { from: "2026-08-20", to: "2026-08-20" },
      phase: "end",
    });
  });
});
