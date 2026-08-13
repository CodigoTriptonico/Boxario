import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/196_geographic_routes_zip_schedules.sql"),
  "utf8",
);
const placesMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/205_route_coverage_places.sql"),
  "utf8",
);
const placeColorMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/206_route_coverage_place_color.sql"),
  "utf8",
);
const requestAction = readFileSync(
  join(process.cwd(), "src/app/actions/customer-route-assignments/request.ts"),
  "utf8",
);
const reviewAction = readFileSync(
  join(process.cwd(), "src/app/actions/customer-route-assignments/review.ts"),
  "utf8",
);

test("geographic route schema separates identity, schedules, ZIPs and exact approvals", () => {
  for (const table of [
    "logistics_route_definitions",
    "logistics_route_schedules",
    "logistics_route_postal_codes",
    "logistics_route_address_approvals",
    "logistics_zcta_geometry_cache",
  ]) {
    assert.match(migration, new RegExp(`create table if not exists public\\.${table}`));
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`));
  }
  assert.match(migration, /postal_code ~ '\^\[0-9\]\{5\}\$'/);
  assert.match(migration, /coverage_mode in \('day_only', 'postal_codes'\)/);
  assert.match(migration, /routes\.view/);
  assert.match(migration, /routes\.update_status/);
  assert.match(migration, /sales\.manage/);
});

test("places coverage extends mode and stores hierarchical selections", () => {
  assert.match(placesMigration, /coverage_mode in \('day_only', 'postal_codes', 'places'\)/);
  assert.match(placesMigration, /create table if not exists public\.logistics_route_coverage_places/);
  assert.match(placesMigration, /selection_role in \('root_whole', 'root_partial', 'child_included'\)/);
  assert.match(placesMigration, /create table if not exists public\.logistics_place_children_cache/);
  assert.match(placesMigration, /logistics_route_coverage_places enable row level security/);
  assert.match(placeColorMigration, /add column if not exists color text/);
});

test("migration cleanup preserves sales, customers, shipments and task rows", () => {
  assert.match(migration, /update public\.shipment_logistics_tasks task/);
  assert.doesNotMatch(migration, /delete from public\.(shipments|customers|shipment_logistics_tasks)/);
  assert.match(migration, /delete from public\.logistics_routes/);
  assert.match(migration, /delete from public\.customer_route_assignment_requests/);
});

test("template confirmation never creates an operational route", () => {
  assert.match(reviewAction, /status: "template_confirmed"/);
  assert.match(reviewAction, /routeId: null/);
  assert.doesNotMatch(reviewAction, /confirmLogisticsTaskScheduleAction/);
  assert.match(migration, /BOOKING_PENDING_APPROVAL/);
  assert.match(migration, /status = 'routed'/);
});

test("seller request validates ZIP, address fingerprint and provisional capacity", () => {
  assert.match(requestAction, /normalizeUsPostalCode/);
  assert.match(requestAction, /address_fingerprint/);
  assert.match(requestAction, /pending_approval/);
  assert.match(requestAction, /template_confirmed/);
  assert.match(requestAction, /reservedStops/);
  assert.match(requestAction, /reservedBoxes/);
  assert.match(requestAction, /addressMatchesCoveragePlaces/);
});

test("seller request resolves the implicit day route to its active schedule", () => {
  assert.match(requestAction, /isDayAsRouteTemplateId/);
  assert.match(requestAction, /is_system_general/);
  assert.match(requestAction, /system_weekday.*routeWeekday/);
  assert.match(requestAction, /route_definition_id.*generalDefinition\.id/);
  assert.match(requestAction, /routeScheduleId = String\(generalSchedule\.id\)/);
});
