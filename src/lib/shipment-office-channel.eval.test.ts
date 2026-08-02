import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readShipmentDisplaySource } from "@/test-utils/shipment-domain-source";

const source = readShipmentDisplaySource();

describe("shipment office channel eval", () => {
  it("uses office as the channel with simple office copy", () => {
    assert.equal(source.includes('detail: "Entregado en oficina"'), true);
    assert.equal(source.includes('...stepMeta("empty_box", "office", "Oficina")'), true);
    assert.equal(source.includes("Entregada en mostrador"), false);
    assert.equal(source.includes('...stepMeta("empty_box", "office", handingNow ? "Mostrador" : "Oficina")'), false);
  });
});
