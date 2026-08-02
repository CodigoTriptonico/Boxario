import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { readVentaClientSource } from "@/test-utils/venta-source";

const root = process.cwd();
const ventaSource = readVentaClientSource();
const dialogSource = readFileSync(
  join(root, "src/components/sale/sale-invoice-confirm-dialog.tsx"),
  "utf8",
);

describe("invoice creation feedback", () => {
  it("keeps the confirmation modal open and exposes action failures", () => {
    assert.match(ventaSource, /catch \(error\)/);
    assert.match(ventaSource, /setStockMessage\(message\)/);
    assert.match(ventaSource, /notify\.error\(message\)/);
    assert.match(ventaSource, /errorMessage=\{stockMessage\}/);
    assert.match(dialogSource, /role="alert"/);
  });
});
