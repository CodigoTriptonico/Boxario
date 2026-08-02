import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const actionsDirectory = join(process.cwd(), "src", "app", "actions");
const implementationFiles = [
  "shipments-context.ts",
  "shipments-data.ts",
  "shipments-state.ts",
  "shipments-read.ts",
  "shipments-create.ts",
  "shipments-commercial.ts",
  "shipments-inventory.ts",
  "shipments-logistics-tasks.ts",
  "shipments-logistics.ts",
] as const;
const publicActions = [
  "listShipmentsAction",
  "listShipmentsForRouteBoardAction",
  "listRouteMembersAction",
  "listSalesOwnersAction",
  "createShipmentAction",
  "createShipmentContactLogAction",
  "syncShipmentPartyAction",
  "finalizeShipmentInvoiceAction",
  "updateShipmentInvoicePriorityAction",
  "updateShipmentSalesOwnerAction",
  "updateLogisticsTaskAction",
  "reactivateLogisticsTaskAction",
  "updateShipmentLogisticsPlanAction",
  "markFullBoxReceivedAtOfficeAction",
  "updateShipmentStatusAction",
] as const;
const serverActionFiles = [
  "shipments-read.ts",
  "shipments-create.ts",
  "shipments-commercial.ts",
  "shipments-logistics-tasks.ts",
  "shipments-logistics.ts",
] as const;

function readActionFile(file: string) {
  return readFileSync(join(actionsDirectory, file), "utf8");
}

function lineCount(source: string) {
  return source.split(/\r?\n/).length;
}

describe("shipment action module boundaries", () => {
  it("keeps the stable public API in a small facade", () => {
    const facade = readActionFile("shipments.ts");

    assert.doesNotMatch(facade, /^"use server";/);
    assert.ok(lineCount(facade) < 100, "shipments.ts must remain a small facade");
    for (const action of publicActions) {
      assert.match(facade, new RegExp(`\\b${action}\\b`));
    }
  });

  it("keeps cohesive implementation modules below 800 lines", () => {
    for (const file of implementationFiles) {
      const source = readActionFile(file);
      assert.ok(lineCount(source) < 800, `${file} exceeded the 799-line limit`);
    }
  });

  it('keeps "use server" on modules that define public actions', () => {
    for (const file of serverActionFiles) {
      assert.match(readActionFile(file), /^"use server";/);
    }
  });

  it("does not let implementation modules depend on the public facade", () => {
    for (const file of implementationFiles) {
      const source = readActionFile(file);
      assert.doesNotMatch(
        source,
        /from\s+["']@\/app\/actions\/shipments["']/,
        `${file} imports the public facade`,
      );
    }
  });
});
