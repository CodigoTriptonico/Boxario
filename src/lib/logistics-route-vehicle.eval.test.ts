import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { readLogisticsRouteActionsSource } from "@/test-utils/conductor-logistics-action-sources";
import { readLogisticaClientSource } from "@/test-utils/logistica-client-source";

const migrationSource = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../../supabase/migrations/050_logistics_route_vehicle.sql",
  ),
  "utf8",
);
const routesSource = readLogisticsRouteActionsSource();
const logisticaSource = readLogisticaClientSource();

describe("logistics route vehicle eval", () => {
  it("adds vehicle_id to logistics routes schema and actions", () => {
    assert.match(migrationSource, /vehicle_id uuid references public\.logistics_vehicles/);
    assert.match(routesSource, /vehicle_id/);
    assert.match(routesSource, /assignLogisticsRouteVehicleAction/);
    assert.match(logisticaSource, /assignLogisticsRouteVehicleAction/);
  });
});
