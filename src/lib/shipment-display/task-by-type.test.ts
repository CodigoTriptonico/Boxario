import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findActiveTaskByType,
  findTaskByTypeIncludingCancelled,
  taskByType,
} from "@/lib/shipment-display/shared";
import type { ShipmentRow } from "@/lib/shipment-types";

function shipmentWithTasks(
  tasks: Array<{ id: string; taskType: "deliver_empty_box" | "pickup_full_box"; status: "pending" | "cancelled" | "completed" }>,
): ShipmentRow {
  return {
    logisticsTasks: tasks.map((task) => ({
      id: task.id,
      shipmentId: "s1",
      taskType: task.taskType,
      status: task.status,
      assignedTo: null,
      scheduledAt: null,
      requestedScheduleAt: null,
      scheduleConfirmationStatus: null,
      scheduleKind: null,
      windowStartAt: null,
      windowEndAt: null,
      warehouseId: null,
      notes: null,
      stockDeductedAt: null,
      completedAt: null,
      orderedAt: null,
      assignedAt: null,
      loadedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    })),
  } as ShipmentRow;
}

describe("taskByType policy", () => {
  const row = shipmentWithTasks([
    { id: "cancelled", taskType: "deliver_empty_box", status: "cancelled" },
    { id: "active", taskType: "deliver_empty_box", status: "pending" },
  ]);

  it("defaults to active tasks only for operational flows", () => {
    assert.equal(taskByType(row, "deliver_empty_box")?.id, "active");
    assert.equal(findActiveTaskByType(row, "deliver_empty_box")?.id, "active");
  });

  it("can include cancelled tasks when reconstructing history", () => {
    assert.equal(taskByType(row, "deliver_empty_box", { includeCancelled: true })?.id, "cancelled");
    assert.equal(findTaskByTypeIncludingCancelled(row, "deliver_empty_box")?.id, "cancelled");
  });
});
