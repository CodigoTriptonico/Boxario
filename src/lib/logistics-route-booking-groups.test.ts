import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CustomerRouteAssignmentRequestRow } from "@/app/actions/customer-route-assignments/types";
import type { LogisticsRouteRow } from "@/lib/logistics-routing";
import {
  bookingGroupKey,
  findOpenRouteForBooking,
  findPendingBookingGroupForTask,
  routeMatchesBooking,
} from "./logistics-route-booking-groups";

function booking(
  overrides: Partial<CustomerRouteAssignmentRequestRow> = {},
): CustomerRouteAssignmentRequestRow {
  return {
    id: "booking-1",
    customerId: "customer-1",
    customerName: "Helena",
    customerPhone: "",
    formattedAddress: "",
    addressReference: "",
    shipmentId: "shipment-1",
    shipmentCode: "INV-000005",
    taskId: "task-1",
    taskType: "pickup_full_box",
    routeTemplateId: null,
    routeTemplateName: "Ruta del jueves",
    routeWeekday: 3,
    routeDate: "2026-08-06",
    routeId: null,
    scheduledAt: "2026-08-06T10:00",
    driverId: "",
    driverLabel: "Sin conductor todavía",
    zoneKey: "zone",
    boxLines: [],
    boxSummary: "",
    status: "pending_approval",
    requestedBy: "user-1",
    createdAt: "2026-08-05T00:00:00.000Z",
    reviewNote: "",
    ...overrides,
  };
}

function route(overrides: Partial<LogisticsRouteRow> = {}): LogisticsRouteRow {
  return {
    id: "route-1",
    name: "Ruta del jueves",
    status: "draft",
    routeDate: "2026-08-06",
    routeTemplateId: null,
    assignedTo: null,
    vehicleId: null,
    stops: [],
    ...overrides,
  } as LogisticsRouteRow;
}

describe("logistics-route-booking-groups", () => {
  it("groups day-as-route bookings by date and weekday", () => {
    const first = booking();
    const sibling = booking({ id: "booking-2", taskId: "task-2", shipmentCode: "INV-000006" });
    const otherDay = booking({
      id: "booking-3",
      taskId: "task-3",
      routeDate: "2026-08-07",
      routeWeekday: 4,
      routeTemplateName: "Ruta del viernes",
    });

    assert.equal(bookingGroupKey(first), bookingGroupKey(sibling));
    assert.notEqual(bookingGroupKey(first), bookingGroupKey(otherDay));

    const group = findPendingBookingGroupForTask([first, sibling, otherDay], "task-1");
    assert.ok(group);
    assert.equal(group.items.length, 2);
    assert.equal(group.first.taskId, "task-1");
  });

  it("matches open draft routes for day-as-route bookings", () => {
    const pending = booking();
    const open = route();
    assert.equal(routeMatchesBooking(open, pending), true);
    assert.equal(findOpenRouteForBooking([open], pending)?.id, "route-1");
    assert.equal(findOpenRouteForBooking([route({ status: "planned" })], pending), null);
  });
});
