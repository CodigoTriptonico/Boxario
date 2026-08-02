import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readShipmentActionsSource } from "@/test-utils/shipment-actions-source";

const shipmentsActionsSource = readShipmentActionsSource();

describe("logistica invoice loading eval", () => {
  it("does not hide missing shipment columns as zero invoices", () => {
    assert.equal(shipmentsActionsSource.includes('error.code === "42P01"'), true);
    assert.equal(shipmentsActionsSource.includes('error.code === "42703"'), false);
    assert.equal(shipmentsActionsSource.includes("return fail(error.message);"), true);
  });
});
