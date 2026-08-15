import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();
const boxPickerSource = readFileSync(
  join(root, "src/components/sale/sale-box-picker.tsx"),
  "utf8",
);
const saleSource = readFileSync(
  join(root, "src/components/sale/venta/venta-recipient-box-steps.tsx"),
  "utf8",
);
const fieldSource = readFileSync(
  join(root, "src/components/sale/sale-payment-method-field.tsx"),
  "utf8",
);

describe("quick-sale box picker", () => {
  it("uses the shared product picker for direct box choices", () => {
    assert.match(boxPickerSource, /boxes\.map\(\(box(?:, boxIndex)?\) =>/);
    assert.match(boxPickerSource, /SaleBoxCartQtyBadge/);
    assert.doesNotMatch(boxPickerSource, /<select/);
    assert.match(saleSource, /<SaleBoxPicker/);
    assert.match(saleSource, /onChoose=\{chooseBox\}/);
    assert.match(saleSource, /proceedQuickSaleFromSelectedBox/);
  });

  it("keeps the shared payment field available in the final checkout", () => {
    assert.match(fieldSource, /Total de cajas/);
    assert.match(fieldSource, /Queda debiendo/);
    assert.match(saleSource, /selectedBoxCount < 1/);
  });
});
