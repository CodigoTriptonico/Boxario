import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { readVentaPartsSource } from "@/test-utils/venta-source";

const stepBarSource = readVentaPartsSource();
const boxPickerSource = readFileSync(new URL("../components/sale/sale-box-picker.tsx", import.meta.url), "utf8");

describe("venta mobile text readability", () => {
  it("bounds each step value inside its own mobile tile", () => {
    assert.match(
      stepBarSource,
      /w-full min-w-0 max-w-full break-words text-center text-\[10px\].*sm:truncate/,
    );
    assert.match(
      stepBarSource,
      /hidden min-h-\[1rem\] w-full min-w-0 max-w-full items-center justify-center.*lg:flex/,
    );
    assert.match(stepBarSource, /line-clamp-2 max-w-full break-words/);
  });

  it("keeps a product row to name, timing, price, and quantity", () => {
    assert.match(
      boxPickerSource,
      /flex min-w-0 items-center gap-2[\s\S]*?\{box\[0\]\}[\s\S]*?\{box\[1\]\}[\s\S]*?SaleBoxCartQtyBadge/,
    );
    assert.match(boxPickerSource, /SaleBoxStockBadge/);
    assert.doesNotMatch(boxPickerSource, /grid-cols-\[2rem_minmax\(0,1fr\)_auto\]/);
    assert.doesNotMatch(boxPickerSource, /minmax\(0,6rem\)_minmax\(0,5\.5rem\)_auto/);
    assert.doesNotMatch(boxPickerSource, /min-w-0 flex-1/);
  });
});
