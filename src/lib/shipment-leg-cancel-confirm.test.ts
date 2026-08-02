import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { logisticsLegCancelCopy } from "@/lib/shipment-leg-cancel-confirm";

describe("logisticsLegCancelCopy", () => {
  it("builds destructive copy for canceling a driver leg", () => {
    const copy = logisticsLegCancelCopy("Cancelar entrega", "Dejar");

    assert.equal(copy.title, "¿Cancelar entrega?");
    assert.match(copy.message, /Se quita el aviso a logística/i);
    assert.match(copy.message, /dejar/i);
    assert.equal(copy.confirmLabel, "Cancelar entrega");
    assert.equal(copy.tone, "danger");
  });
});
