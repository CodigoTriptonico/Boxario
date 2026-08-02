import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertLogisticsRouteTransition,
  assertPhysicalPackageTransition,
  isLogisticsRouteTransitionAllowed,
  isLogisticsTaskTransitionAllowed,
  isWarehousePalletTransitionAllowed,
  publishRouteValidationErrors,
  routeAllowsLivePendingStopEdits,
  routeAllowsOperationalTaskCompletion,
  taskRequiresActiveRouteToComplete,
} from "@/lib/logistics-state-machine";

describe("logistics-state-machine", () => {
  it("allows draft to planned publish transition", () => {
    assert.equal(isLogisticsRouteTransitionAllowed("draft", "planned"), true);
    assert.doesNotThrow(() => assertLogisticsRouteTransition("draft", "planned"));
  });

  it("blocks completing a cancelled task without reactivation", () => {
    assert.equal(isLogisticsTaskTransitionAllowed("cancelled", "completed"), false);
    assert.equal(isLogisticsTaskTransitionAllowed("cancelled", "scheduled"), true);
  });

  it("marks in_progress routes as live-editable", () => {
    assert.equal(routeAllowsLivePendingStopEdits("in_progress"), true);
    assert.equal(routeAllowsLivePendingStopEdits("planned"), false);
  });

  it("guards package pallet and operational completion contracts", () => {
    assert.doesNotThrow(() => assertPhysicalPackageTransition("in_truck", "pending_intake"));
    assert.equal(isWarehousePalletTransitionAllowed("open", "closed"), true);
    assert.equal(routeAllowsOperationalTaskCompletion("in_progress"), true);
    assert.equal(routeAllowsOperationalTaskCompletion("planned"), false);
    assert.equal(taskRequiresActiveRouteToComplete("deliver_empty_box"), true);
    assert.equal(taskRequiresActiveRouteToComplete("pickup_full_box"), true);
  });

  it("requires driver vehicle and stops to publish", () => {
    assert.deepEqual(
      publishRouteValidationErrors({
        status: "draft",
        assignedTo: "d1",
        vehicleId: "v1",
        stopCount: 2,
        stopsWithoutGeo: 0,
        tasksWithoutConfirmedDate: 0,
        tasksWithMismatchedDate: 0,
      }),
      [],
    );
  });
});
