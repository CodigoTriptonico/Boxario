import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const shared = readFileSync("src/app/actions/logistics-routes-shared.ts", "utf8");
const stopActions = readFileSync("src/app/actions/logistics-route-stop-actions.ts", "utf8");
const liveActions = readFileSync("src/app/actions/logistics-route-live-edit-actions.ts", "utf8");
const scheduleActions = readFileSync("src/app/actions/logistics-route-schedule-actions.ts", "utf8");
const requestActions = readFileSync("src/app/actions/customer-route-assignments/request.ts", "utf8");

describe("agregar cajas a rutas sin cierre de reservas", () => {
  it("solo valida capacidad y cobertura postal compartida", () => {
    assert.match(shared, /routeTaskConstraintError/);
    assert.match(shared, /max_stops|max_boxes/);
    assert.doesNotMatch(shared, /booking_cutoff_time|isRouteBookingClosed|logistics_route_date_exceptions/);
  });

  it("protege el alta normal, el selector y la edición operativa sin cutoff", () => {
    assert.ok((stopActions.match(/routeTaskConstraintError\(/g) || []).length >= 2);
    assert.match(liveActions, /routeTaskConstraintError\(/);
    assert.doesNotMatch(scheduleActions, /isRouteBookingClosed|route_booking_cutoff|date_exceptions/);
    assert.doesNotMatch(requestActions, /isRouteBookingClosed|route_booking_cutoff|date_exceptions/);
  });
});
