import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const actionSource = readFileSync(
  new URL("../app/actions/axis-settings.ts", import.meta.url),
  "utf8",
);
const routePanelSource = readFileSync(
  new URL("../components/config/ventas-rutas-panel.tsx", import.meta.url),
  "utf8",
);
const geographicRouteSource = readFileSync(
  new URL("../components/logistica/geographic-route-catalog.tsx", import.meta.url),
  "utf8",
);
const dayMigrationSource = readFileSync(
  new URL("../../supabase/migrations/144_route_days_single_source.sql", import.meta.url),
  "utf8",
);
const hourMigrationSource = readFileSync(
  new URL("../../supabase/migrations/145_route_hours_single_source.sql", import.meta.url),
  "utf8",
);
const implicitDayMigrationSource = readFileSync(
  new URL("../../supabase/migrations/146_implicit_weekday_routes.sql", import.meta.url),
  "utf8",
);

describe("logistics settings ownership", () => {
  it("keeps weekday selection exclusively in routes", () => {
    assert.match(routePanelSource, /GeographicRouteCatalog/);
    assert.match(geographicRouteSource, /weekday/);
    assert.doesNotMatch(
      actionSource,
      /deliveryDays|pickupDays|p_delivery_days|p_pickup_days/,
    );
    assert.match(actionSource, /save_logistics_axis_settings_v3/);
  });

  it("does not let the settings RPC overwrite route days", () => {
    const settingsRpc = dayMigrationSource.match(
      /create or replace function public\.save_logistics_axis_settings_v2[\s\S]*?revoke all on function/,
    )?.[0];
    assert.ok(settingsRpc);
    assert.doesNotMatch(settingsRpc, /delivery_days|pickup_days/);
    assert.match(
      dayMigrationSource,
      /revoke execute on function public\.save_logistics_axis_settings\(text\[\], text\[\], text\[\], text\[\], text, boolean, text, text\) from authenticated/,
    );
  });

  it("keeps operational hours exclusively in the route catalog", () => {
    assert.match(routePanelSource, /GeographicRouteCatalog/);
    assert.match(geographicRouteSource, /schedules/);
    assert.doesNotMatch(
      actionSource,
      /deliveryRanges|pickupRanges|p_delivery_ranges|p_pickup_ranges/,
    );
    const settingsRpc = hourMigrationSource.match(
      /create or replace function public\.save_logistics_axis_settings_v3[\s\S]*?revoke all on function/,
    )?.[0];
    assert.ok(settingsRpc);
    assert.doesNotMatch(
      settingsRpc,
      /delivery_ranges|pickup_ranges|linked_route_schedules/,
    );
    assert.match(implicitDayMigrationSource, /logistics_weekday_defaults/);
    assert.match(implicitDayMigrationSource, /set_logistics_weekday_schedule/);
  });
});
