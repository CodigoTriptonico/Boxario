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
const checkoutSource = readFileSync(
  join(root, "src/components/sale/sale-quick-checkout-modal.tsx"),
  "utf8",
);
const fieldSource = readFileSync(
  join(root, "src/components/sale/sale-payment-method-field.tsx"),
  "utf8",
);

describe("quick-sale product-picker visual contract", () => {
  it("uses the same product hierarchy as the normal sales picker", () => {
    assert.match(boxPickerSource, /<Package className="h-5 w-5"/);
    assert.match(boxPickerSource, /\{box\[0\]\}/);
    assert.match(boxPickerSource, /\{box\[1\]\}/);
    assert.match(saleSource, /<SaleBoxPicker/);
    assert.match(saleSource, /onChoose=\{chooseBox\}/);
  });

  it("keeps selection obvious and the grid usable on narrow screens", () => {
    assert.match(boxPickerSource, /grid-cols-\[repeat\(auto-fit/);
    assert.match(boxPickerSource, /SaleBoxCartQtyBadge/);
    assert.match(boxPickerSource, /Clic izquierdo agrega, clic derecho quita/);
  });

  it("keeps the box total and payment choice in the final checkout", () => {
    assert.match(checkoutSource, /QuickEmptyBoxDraft/);
    assert.match(fieldSource, /Total de cajas/);
    assert.match(fieldSource, /Queda debiendo/);
    assert.match(fieldSource, /Pago completo/);
    assert.match(saleSource, /proceedQuickSaleFromSelectedBox/);
  });
});
