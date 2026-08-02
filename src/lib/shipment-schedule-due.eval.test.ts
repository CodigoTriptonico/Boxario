import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readEnviosClientSource } from "@/test-utils/envios-client-source";
import { readShipmentActionsSource } from "@/test-utils/shipment-actions-source";

const enviosSource = readEnviosClientSource();
const shipmentsSource = readShipmentActionsSource();

describe("scheduled leg auto-order eval", () => {
  it("orders the driver task only inside an explicit route decision", () => {
    assert.match(
      enviosSource,
      /async function confirmProgramRoute[\s\S]*?DriverTaskOrdered: true/,
    );
    assert.match(
      enviosSource,
      /async function confirmPendingRoute[\s\S]*?DriverTaskOrdered: true/,
    );
  });

  it("does not auto-order driver tasks when listing shipments", () => {
    assert.match(shipmentsSource, /promoteDueScheduledLegsForListedShipments/);
    assert.doesNotMatch(
      shipmentsSource,
      /buildDueSchedulePromotionInput[\s\S]*?driverTaskOrdered:\s*true/,
    );
  });
});
