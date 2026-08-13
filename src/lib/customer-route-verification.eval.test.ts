import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  CUSTOMER_ROUTE_ZONE_CHANGE_REASON,
  resolveCustomerRouteAssignmentOutcome,
  zoneChangeShouldRevokeVerification,
} from "@/lib/customer-route-verification";

const root = process.cwd();

function migration(name: string) {
  return readFileSync(path.join(root, "supabase", "migrations", name), "utf8");
}

test("customer route verification migration uses exact address approvals and explicit template states", () => {
  const sql = migration("196_geographic_routes_zip_schedules.sql");
  assert.match(sql, /create table if not exists public\.logistics_route_address_approvals/i);
  assert.match(sql, /address_fingerprint/i);
  assert.match(sql, /pending_approval.*template_confirmed.*deferred.*rejected.*routed/s);
  assert.match(sql, /logistics_route_address_approvals_active_uidx/);
  assert.match(sql, /customer_route_assignment_requests_active_task_uidx/);
  assert.match(sql, /sales\.manage/);
});

test("eval: first assignment pending, verified auto, zone change revokes", () => {
  assert.equal(
    resolveCustomerRouteAssignmentOutcome({
      verification: null,
      routeTemplateId: "a",
      currentZoneKey: "zona-1",
    }),
    "pending_approval",
  );
  assert.equal(
    resolveCustomerRouteAssignmentOutcome({
      verification: { routeTemplateId: "a", zoneKey: "zona-1", endedAt: null },
      routeTemplateId: "a",
      currentZoneKey: "zona-1",
    }),
    "template_confirmed",
  );
  assert.equal(
    zoneChangeShouldRevokeVerification({
      previousZoneKey: "zona-1",
      nextZoneKey: "zona-2",
    }),
    true,
  );
  assert.match(CUSTOMER_ROUTE_ZONE_CHANGE_REASON, /dirección|zona/i);
});
