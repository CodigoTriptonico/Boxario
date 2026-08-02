import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import {
  buildBundleRule,
  buildDiscountRule,
  buildFreeGiftRule,
  inferIntent,
  productPickerOptions,
  pruneDiscountTargetForBuy,
} from "../components/config/combo-builder/helpers";

const root = process.cwd();
const productionFiles = [
  "src/components/config/combo-builder.tsx",
  "src/components/config/combo-builder/types.ts",
  "src/components/config/combo-builder/helpers.ts",
  "src/components/config/combo-builder/controls.tsx",
  "src/components/config/combo-builder/use-combo-builder.ts",
];
const products = [
  { catalogKey: "small", label: "Caja pequeña", price: "$10" },
  { catalogKey: "large", label: "Caja grande", price: "$25" },
];

describe("combo builder refactor", () => {
  it("keeps the public entrypoint and every production module below 800 lines", () => {
    const entrypoint = readFileSync(join(root, productionFiles[0]), "utf8");

    assert.match(entrypoint, /export function ComboBuilder/);
    assert.match(entrypoint, /export type \{ ComboBuilderProduct \}/);

    for (const relativePath of productionFiles) {
      const lineCount = readFileSync(join(root, relativePath), "utf8").split(/\r?\n/).length;
      assert.ok(lineCount < 800, `${relativePath} has ${lineCount} lines`);
    }
  });

  it("preserves product picker availability and promotion intent inference", () => {
    const pickerOptions = productPickerOptions(products, ["small"], "large");

    assert.equal(
      pickerOptions.find((option) => option.value === "small")?.disabled,
      true,
    );
    assert.equal(
      pickerOptions.find((option) => option.value === "large")?.disabled,
      false,
    );

    const buy = [{ id: "buy-1", catalogKey: "small", quantity: 2 }];
    assert.equal(inferIntent(buildDiscountRule(buy, "small")), "discount");
    assert.equal(inferIntent(buildFreeGiftRule(buy, "large")), "free_gift");
    assert.equal(
      inferIntent(
        buildBundleRule(
          [...buy, { id: "buy-2", catalogKey: "large", quantity: 1 }],
          products,
        ),
      ),
      "bundle_price",
    );
  });

  it("keeps discounts scoped to products in the purchase when requested", () => {
    const rule = buildDiscountRule(
      [
        { id: "buy-1", catalogKey: "small", quantity: 1 },
        { id: "buy-2", catalogKey: "large", quantity: 1 },
      ],
      "outside",
    );
    const pruned = pruneDiscountTargetForBuy(
      rule,
      { small: "Caja pequeña", large: "Caja grande" },
      "buy",
    );

    assert.equal(pruned.get[0]?.catalogKey, "");
  });
});
