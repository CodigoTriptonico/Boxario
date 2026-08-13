import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import {
  SHIPMENTS_BOARD_LIMIT,
  SHIPMENTS_MAX_PAGE_SIZE,
  SHIPMENTS_PAGE_SIZE,
  clampShipmentsLimit,
} from "@/lib/shipments-pagination";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("shipment list defaults are bounded (no silent 500/1000 over-fetch)", () => {
  assert.equal(SHIPMENTS_PAGE_SIZE, 50);
  assert.equal(SHIPMENTS_MAX_PAGE_SIZE, 200);
  assert.equal(SHIPMENTS_BOARD_LIMIT, 200);
  assert.equal(clampShipmentsLimit(undefined), 50);
  assert.equal(clampShipmentsLimit(999), 200);

  const readSource = readFileSync(join(root, "src/app/actions/shipments-read.ts"), "utf8");
  const palletsSource = readFileSync(join(root, "src/app/actions/physical-packages.ts"), "utf8");

  assert.doesNotMatch(readSource, /limit \?\? 500/);
  assert.doesNotMatch(readSource, /,\s*1000\)/);
  assert.match(readSource, /clampShipmentsLimit/);
  assert.match(palletsSource, /\.range\(offset, offset \+ limit - 1\)/);
  assert.match(palletsSource, /listWarehousePalletsAction/);
});
