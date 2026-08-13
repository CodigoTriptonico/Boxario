import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canConfirmLogisticsSchedule } from "../components/logistica/task-schedule/logistics-task-schedule-confirm-helpers";

describe("logistics schedule confirmation", () => {
  it("does not confirm a fallback date before the user selects a weekday", () => {
    assert.equal(
      canConfirmLogisticsSchedule({
        hasSelectedWeekday: false,
        hasCompleteTime: true,
        routeSelectionValid: true,
        dateMatchesRoute: true,
      }),
      false,
    );
  });

  it("confirms after a valid weekday and route are selected", () => {
    assert.equal(
      canConfirmLogisticsSchedule({
        hasSelectedWeekday: true,
        hasCompleteTime: true,
        routeSelectionValid: true,
        dateMatchesRoute: true,
      }),
      true,
    );
  });
});
