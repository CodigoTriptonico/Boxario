import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  routeScheduleHasAvailabilityMismatch,
  routeScheduleRangeSuggestions,
} from "@/lib/logistics-route-schedule";

describe("logistics route schedule", () => {
  const route = { startTime: "08:00", estimatedEndTime: "10:00" };

  it("accepts exact and range availability that touches the route window", () => {
    assert.equal(routeScheduleHasAvailabilityMismatch("09:00", route), false);
    assert.equal(routeScheduleHasAvailabilityMismatch("07:00-08:00", route), false);
    assert.equal(routeScheduleHasAvailabilityMismatch("09:00-11:00", route), false);
  });

  it("warns when customer availability is outside the route window", () => {
    assert.equal(routeScheduleHasAvailabilityMismatch("07:00", route), true);
    assert.equal(routeScheduleHasAvailabilityMismatch("10:00+", route), false);
    assert.equal(routeScheduleHasAvailabilityMismatch("10:01+", route), true);
    assert.equal(routeScheduleHasAvailabilityMismatch("-07:59", route), true);
  });

  it("does not warn when either schedule is incomplete", () => {
    assert.equal(routeScheduleHasAvailabilityMismatch("", route), false);
    assert.equal(routeScheduleHasAvailabilityMismatch("09:00", {}), false);
  });

  it("derives unique range suggestions from the routes of the selected day", () => {
    assert.deepEqual(
      routeScheduleRangeSuggestions([
        { startTime: "10:00", estimatedEndTime: "17:00" },
        { startTime: "08:00", estimatedEndTime: "12:00" },
        { startTime: "10:00", estimatedEndTime: "17:00" },
        { startTime: null, estimatedEndTime: null },
      ]),
      ["08:00-12:00", "10:00-17:00"],
    );
  });
});
