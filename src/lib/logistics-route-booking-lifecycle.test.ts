import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/196_geographic_routes_zip_schedules.sql"),
  "utf8",
);
const confirmationMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/202_confirm_prepared_route_atomically.sql"),
  "utf8",
);
const sellerAction = readFileSync(
  join(process.cwd(), "src/app/actions/customer-route-assignments/request.ts"),
  "utf8",
);
const workspace = readFileSync(
  join(process.cwd(), "src/components/logistica/logistics-routes-workspace.tsx"),
  "utf8",
);
const tasksBoard = readFileSync(
  join(process.cwd(), "src/components/logistica/panels/logistics-tasks-board.tsx"),
  "utf8",
);
const bookingActions = readFileSync(
  join(process.cwd(), "src/app/actions/logistics-route-booking-actions.ts"),
  "utf8",
);

describe("logistics route booking lifecycle", () => {
  it("keeps seller selections as bookings instead of creating operational routes", () => {
    assert.match(sellerAction, /customer_route_assignment_requests/);
    assert.match(sellerAction, /pending_approval/);
    assert.match(sellerAction, /template_confirmed/);
    assert.match(sellerAction, /driver_id: null/);
    assert.doesNotMatch(sellerAction, /confirmLogisticsTaskScheduleAction/);
  });

  it("creates a draft route atomically from one booking group", () => {
    assert.match(migration, /create_logistics_route_from_bookings/);
    assert.match(migration, /BOOKINGS_MUST_SHARE_ROUTE/);
    assert.match(migration, /'draft'/);
    assert.match(migration, /route_id = route_row\.id/);
  });

  it("confirms preparation by creating and closing the route atomically", () => {
    assert.match(confirmationMigration, /confirm_logistics_route_from_bookings/);
    assert.match(confirmationMigration, /create_logistics_route_from_bookings/);
    assert.match(confirmationMigration, /publish_logistics_route/);
    assert.match(confirmationMigration, /confirmed_route_status = 'draft'/);
    assert.match(confirmationMigration, /confirmed_route_status is distinct from 'planned'/);
    assert.match(confirmationMigration, /status = 'planned'/);
    assert.match(confirmationMigration, /Incomplete drafts remain/);
    assert.match(bookingActions, /confirmOperationalRouteFromBookingsAction/);
    assert.match(bookingActions, /rpc\("confirm_logistics_route_from_bookings"/);
    assert.match(bookingActions, /rpc\("create_logistics_route_from_bookings"/);
  });

  it("closes before assigning a driver and restores bookings on cancel", () => {
    assert.match(migration, /restore_route_bookings_after_cancel/);
    assert.doesNotMatch(migration, /ROUTE_MISSING_DRIVER/);
    assert.match(migration, /restore_route_bookings_after_cancel/);
    assert.match(migration, /status = 'template_confirmed'/);
  });

  it("uses one Routes surface with operational and template views", () => {
    assert.match(workspace, /Operativas/);
    assert.match(workspace, /Plantillas/);
    assert.match(workspace, /Todos los estados/);
    assert.match(workspace, /Cerrar ruta/);
  });

  it("offers route assignment from the active-task context menu", () => {
    assert.match(tasksBoard, /logistics-task-context-menu/);
    assert.match(tasksBoard, /Asignar a ruta/);
    assert.match(tasksBoard, /Crear ruta/);
    assert.match(tasksBoard, /Agregar a ruta abierta/);
    assert.match(tasksBoard, /onAssignTaskFromContext/);
    assert.match(tasksBoard, /onCreateRouteFromBooking/);
  });
});
