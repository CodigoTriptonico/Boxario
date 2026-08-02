import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { readConductorTareasClientSource } from "@/test-utils/conductor-tareas-client-source";
import { readLogisticaClientSource } from "@/test-utils/logistica-client-source";

const root = process.cwd();

function readSource(relativePath: string) {
  return readFileSync(join(root, relativePath), "utf8");
}

describe("logistics nice-to-have eval", () => {
  it("wires ETA, delivery evidence and fleet capacity into active logistics flows", () => {
    const logisticaSource = readLogisticaClientSource(root);
    const conductorSource = readConductorTareasClientSource(root);
    const conductorOfflineQueueSource = readSource("src/lib/conductor-offline/queue.ts");
    const routingSource = readSource("src/lib/logistics-routing.ts");

    assert.match(logisticaSource, /estimateRouteStopEtaMinutes/);
    assert.match(conductorSource, /estimateRouteStopEtaMinutes/);
    assert.match(conductorSource, /enqueueConductorTaskResult/);
    assert.match(conductorOfflineQueueSource, /formData\.set\(\s*"evidence"/);
    assert.match(routingSource, /vehicleCargoCapacity/);
    assert.match(routingSource, /routeStopsWithinVehicleCapacity/);
  });
});
