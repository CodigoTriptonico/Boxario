import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildExpedienteShipmentDeepLink } from "@/lib/expediente-deep-link";

describe("expediente deep link", () => {
  it("opens the expediente for the selected shipment", () => {
    assert.equal(
      buildExpedienteShipmentDeepLink("ship-42"),
      "/seguimiento/ship-42/expediente",
    );
  });

  it("falls back to seguimiento when shipment id is missing", () => {
    assert.equal(buildExpedienteShipmentDeepLink(""), "/seguimiento");
  });
});
