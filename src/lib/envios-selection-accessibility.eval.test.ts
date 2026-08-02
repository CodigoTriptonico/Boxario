import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readEnviosClientSource } from "@/test-utils/envios-client-source";

const source = readEnviosClientSource();

describe("envios selection accessibility eval", () => {
  it("exposes selectable shipment cards with supported checkbox semantics", () => {
    assert.match(source, /role=\{selectionEnabled \? "checkbox" : undefined\}/);
    assert.match(source, /aria-checked=\{selectionEnabled \? isSelected : undefined\}/);
    assert.doesNotMatch(source, /aria-selected=\{isSelected\}/);
  });
});
