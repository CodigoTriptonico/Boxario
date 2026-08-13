import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { readVentaPartsSource } from "@/test-utils/venta-source";

const stepBarSource = readVentaPartsSource();
const boxPickerSource = readFileSync(new URL("../components/sale/sale-box-picker.tsx", import.meta.url), "utf8");

describe("venta mobile text readability eval", () => {
  it("preserves the desktop stepper while five compact mobile tiles share the available width", () => {
    assert.match(stepBarSource, /grid w-full grid-cols-5 items-start gap-0 lg:flex lg:min-w-0/);
    assert.match(stepBarSource, /relative flex min-w-0 flex-col lg:w-auto lg:snap-start/);
    assert.match(stepBarSource, /step\.detailRows\?\.length/);
    assert.match(stepBarSource, /lg:flex-\[1\.45\]/);
    assert.match(stepBarSource, /lg:flex-1/);
    assert.doesNotMatch(stepBarSource, /w-\[(?:13\.5|8\.5)rem\]/);
    assert.match(stepBarSource, /tracking-normal sm:truncate sm:text-\[11px\] sm:tracking-wide/);
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
