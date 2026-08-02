import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readConductorTaskActionsSource } from "@/test-utils/conductor-logistics-action-sources";
import { readConductorTareasClientSource } from "@/test-utils/conductor-tareas-client-source";
import { readEnviosClientSource } from "@/test-utils/envios-client-source";
import { readLogisticaClientSource } from "@/test-utils/logistica-client-source";

const enviosSource = readEnviosClientSource();
const conductorSource = readConductorTareasClientSource();
const logisticaSource = readLogisticaClientSource();
const conductorActionsSource = readConductorTaskActionsSource();

describe("logistics ops eval", () => {
  it("wires deep links, navigation, pickup inventory and live refresh", () => {
    assert.match(enviosSource, /buildLogisticaShipmentDeepLink/);
    assert.match(conductorSource, /buildMapsNavigationUrl/);
    assert.match(logisticaSource, /LOGISTICS_LIVE_REFRESH_MS/);
    assert.match(logisticaSource, /Board actualizado/);
    assert.match(conductorActionsSource, /pickup_full_box/);
    assert.match(conductorActionsSource, /hasPickupReturnEventForTaskLine/);
    assert.match(conductorActionsSource, /insertFullBoxCollectionEvent/);
  });
});
