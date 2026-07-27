import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  logisticsRequestedRouteDayPatch,
  logisticsScheduleExpressionFromWindow,
  logisticsScheduleWindowPatch,
} from "@/lib/logistics-schedule-window";

describe("logistics schedule window", () => {
  it("keeps a pending route day without inventing an appointment time", () => {
    const patch = logisticsRequestedRouteDayPatch("2026-07-27");

    assert.equal(patch.scheduled_at, null);
    assert.equal(patch.schedule_kind, null);
    assert.equal(patch.window_start_at, null);
    assert.equal(patch.schedule_confirmation_status, "pending");
    assert.equal(patch.requested_schedule_at?.slice(0, 10), "2026-07-27");
  });

  it("clears the request when the route day is invalid", () => {
    assert.deepEqual(logisticsRequestedRouteDayPatch("lunes"), logisticsScheduleWindowPatch(null));
  });

  it("persists a starting-time window without losing its kind", () => {
    const patch = logisticsScheduleWindowPatch("2026-07-27T14:00+");

    assert.equal(patch.schedule_kind, "from");
    assert.ok(patch.window_start_at);
    assert.equal(patch.window_end_at, null);
    assert.equal(
      logisticsScheduleExpressionFromWindow({
        scheduledAt: patch.scheduled_at,
        scheduleKind: patch.schedule_kind,
        windowStartAt: patch.window_start_at,
        windowEndAt: patch.window_end_at,
      }),
      "2026-07-27T14:00+",
    );
  });

  it("persists antes de as an open-start range", () => {
    const patch = logisticsScheduleWindowPatch("2026-07-27T-10:00");

    assert.equal(patch.schedule_kind, "range");
    assert.equal(patch.window_start_at, null);
    assert.ok(patch.window_end_at);
    assert.equal(
      logisticsScheduleExpressionFromWindow({
        scheduledAt: patch.scheduled_at,
        scheduleKind: patch.schedule_kind,
        windowStartAt: patch.window_start_at,
        windowEndAt: patch.window_end_at,
      }),
      "2026-07-27T-10:00",
    );
  });

  it("persists both boundaries of an entre range", () => {
    const patch = logisticsScheduleWindowPatch("2026-07-27T16:00-17:00");

    assert.equal(patch.schedule_kind, "range");
    assert.ok(patch.window_start_at);
    assert.ok(patch.window_end_at);
    assert.equal(
      logisticsScheduleExpressionFromWindow({
        scheduledAt: patch.scheduled_at,
        scheduleKind: patch.schedule_kind,
        windowStartAt: patch.window_start_at,
        windowEndAt: patch.window_end_at,
      }),
      "2026-07-27T16:00-17:00",
    );
  });
});
