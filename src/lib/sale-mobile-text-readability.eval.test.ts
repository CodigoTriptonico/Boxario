import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { readVentaPartsSource } from "@/test-utils/venta-source";

const stepBarSource = readVentaPartsSource();
const boxPickerSource = readFileSync(new URL("../components/sale/sale-box-picker.tsx", import.meta.url), "utf8");

describe("venta mobile text readability eval", () => {
  it("preserves the desktop stepper while mobile tiles scroll instead of squeezing text", () => {
    assert.match(stepBarSource, /min-w-max items-start gap-0 lg:min-w-0 lg:w-full/);
    assert.match(stepBarSource, /relative flex shrink-0 snap-start flex-col lg:min-w-0 lg:w-auto/);
    assert.match(stepBarSource, /step\.detailRows\?\.length/);
    assert.match(stepBarSource, /w-\[13\.5rem\] lg:flex-\[1\.45\]/);
    assert.match(stepBarSource, /w-\[8\.5rem\] lg:flex-1/);
  });

  it("keeps the product title and price together instead of opposite edges", () => {
    assert.match(
      boxPickerSource,
      /flex min-w-0 items-center gap-2[\s\S]*?\{box\[0\]\}[\s\S]*?\{box\[1\]\}[\s\S]*?SaleBoxCartQtyBadge/,
    );
    assert.match(boxPickerSource, /whitespace-nowrap[^"]*tabular-nums[^"]*text-emerald-200/);
    assert.match(boxPickerSource, /SaleBoxStockBadge/);
    assert.match(boxPickerSource, /boxStockByKey/);
    assert.doesNotMatch(
      boxPickerSource,
      /grid-cols-\[2rem_minmax\(0,1fr\)_auto\]/,
    );
    assert.doesNotMatch(boxPickerSource, /min-w-0 flex-1/);
    assert.doesNotMatch(boxPickerSource, /disabled=\{stock/);
  });
});
