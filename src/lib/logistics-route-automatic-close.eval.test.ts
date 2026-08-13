import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const removal = readFileSync(
  "supabase/migrations/204_remove_route_booking_cutoff.sql",
  "utf8",
);
const routeSettings = readFileSync(
  "src/components/config/ventas-rutas-panel.tsx",
  "utf8",
);

describe("removal of automatic logistics route closure", () => {
  it("drops cutoff helpers, guards, cron and date exceptions", () => {
    assert.match(removal, /drop function if exists public\.auto_close_due_logistics_routes/);
    assert.match(removal, /drop function if exists public\.effective_logistics_route_booking_cutoff/);
    assert.match(removal, /drop trigger if exists logistics_route_cutoff_guard/);
    assert.match(removal, /drop trigger if exists logistics_route_stop_cutoff_guard/);
    assert.match(removal, /boxario-close-due-logistics-routes/);
    assert.match(removal, /drop table if exists public\.logistics_route_date_exceptions/);
    assert.match(removal, /drop column if exists route_booking_cutoff_time/);
    assert.match(removal, /drop column if exists booking_cutoff_time/);
  });

  it("recreates weekday activation without booking cutoff", () => {
    assert.match(removal, /create or replace function public\.activate_logistics_route_weekday/);
    assert.doesNotMatch(removal, /target_booking_cutoff_time/);
    assert.doesNotMatch(routeSettings, /Cierre global|Reservas y fechas especiales/);
  });
});
