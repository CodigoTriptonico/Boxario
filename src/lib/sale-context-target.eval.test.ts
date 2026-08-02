import assert from "node:assert/strict";
import test from "node:test";
import { readVentaClientSource } from "@/test-utils/venta-source";

test("venta parses context-menu datasets through one helper", async () => {
  const source = await Promise.resolve(readVentaClientSource());

  assert.match(source, /saleContextTargetData\(target\.dataset\)/);
  assert.doesNotMatch(source, /target\.dataset\.saleContextPhones\.split/);
  assert.doesNotMatch(source, /target\.dataset\.saleContextStreet/);
});
