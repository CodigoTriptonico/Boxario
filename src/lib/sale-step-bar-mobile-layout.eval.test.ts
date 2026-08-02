import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readVentaPartsSource } from "@/test-utils/venta-source";

const source = readVentaPartsSource();

describe("sale step bar mobile layout", () => {
  it("keeps each step number inside its narrow tile and uses a compact label", () => {
    assert.match(source, /flex-col items-center justify-center gap-0\.5 sm:min-h-\[2rem\] sm:flex-row/);
    assert.match(source, /<span className="sm:hidden">\{step\.compactLabel\}<\/span>/);
    assert.match(source, /<span className="hidden sm:inline">\{step\.label\}<\/span>/);
  });
});
