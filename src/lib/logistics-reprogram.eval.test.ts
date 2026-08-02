import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readConductorTareasClientSource } from "@/test-utils/conductor-tareas-client-source";
import { readShipmentActionsSource } from "@/test-utils/shipment-actions-source";
import { readLogisticaClientSource } from "@/test-utils/logistica-client-source";

const shipmentsSource = readShipmentActionsSource();
const logisticaSource = readLogisticaClientSource();
const conductorSource = readConductorTareasClientSource();

describe("logistics reprogram eval", () => {
  it("exports reactivate action with preserving stock patch", () => {
    assert.match(shipmentsSource, /export async function reactivateLogisticsTaskAction/);
    assert.match(shipmentsSource, /shipment\.logistics_task_reactivated/);
    assert.match(shipmentsSource, /logisticsTaskReactivatePatchPreservingStock/);
  });

  it("wires reprogram panel and failed filter in logistica", () => {
    assert.match(logisticaSource, /LogisticsTaskReprogramPanel/);
    assert.match(logisticaSource, /failedFilter/);
    assert.match(logisticaSource, /Reprogramar/);
  });

  it("links conductor failure history to logistica", () => {
    assert.match(conductorSource, /buildLogisticaShipmentDeepLink/);
  });
});
