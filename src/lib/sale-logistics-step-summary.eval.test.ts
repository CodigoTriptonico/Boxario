import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readVentaClientSource, readVentaPartsSource } from "@/test-utils/venta-source";

const stepBarSource = readVentaPartsSource();
const saleSource = readVentaClientSource();

describe("sale logistics step summary eval", () => {
  it("renders logistics as two labeled rows instead of one combined sentence", () => {
    assert.match(stepBarSource, /step\.detailRows\.map\(\(row\) =>/);
    assert.match(stepBarSource, /grid-cols-\[3\.9rem_minmax\(0,1fr\)\]/);
    assert.match(stepBarSource, /\{row\.label\}/);
    assert.match(stepBarSource, /\{row\.value\}/);
  });

  it("gives the logistics tile enough mobile width for status and date", () => {
    assert.match(stepBarSource, /w-\[13\.5rem\] lg:flex-\[1\.45\]/);
  });

  it("feeds the structured operational details into step four", () => {
    assert.match(saleSource, /detailRows:\s*step\.id === "delivery"/);
    assert.match(saleSource, /\? currentLogisticsDetails\s*: undefined/);
  });
});
