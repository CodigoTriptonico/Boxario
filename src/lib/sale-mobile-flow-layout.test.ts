import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const ventaSource = readFileSync(new URL("../components/venta-client.tsx", import.meta.url), "utf8");
const stepBarSource = readFileSync(new URL("../components/sale/venta-parts.tsx", import.meta.url), "utf8");

function sliceAround(source: string, marker: string, before = 500) {
  const index = source.indexOf(marker);
  assert.ok(index >= 0, `missing marker: ${marker}`);
  return source.slice(Math.max(0, index - before), index);
}

describe("venta mobile flow layout", () => {
  it("keeps the step 3 action pinned below the scrollable catalog", () => {
    assert.match(ventaSource, /overflow-visible lg:overflow-hidden/);
    assert.match(ventaSource, /!overflow-visible lg:!overflow-hidden/);
    assert.match(ventaSource, /flowPersonListShellClass/);
    assert.ok(
      ventaSource.indexOf("min-h-0 flex-1 overflow-y-auto pr-1") <
        ventaSource.indexOf("onClick={continueFromCart}"),
    );
    assert.match(
      sliceAround(ventaSource, "onClick={continueFromCart}"),
      /flex shrink-0 justify-center border-t border-black\/80 pt-4/,
    );
  });

  it("pins logistics Siguiente at the bottom and centers the movement cards", () => {
    assert.match(
      ventaSource,
      /justify-center overflow-y-auto px-1 py-2 sm:px-1\.5[\s\S]*?SaleLogisticsStep[\s\S]*?flex shrink-0 justify-center border-t border-black\/80 pt-4[\s\S]*?onClick=\{continueFromLogistics\}/,
    );
    assert.match(
      ventaSource,
      /activeStep === "box" \|\|\s*activeStep === "delivery"/,
    );
  });

  it("keeps five mobile steps visible without a duplicate active-step summary", () => {
    assert.match(
      stepBarSource,
      /grid min-w-0 grid-cols-5 items-start gap-0 lg:flex/,
    );
    assert.match(
      stepBarSource,
      /lg:snap-x lg:snap-mandatory lg:overflow-x-auto/,
    );
    assert.doesNotMatch(stepBarSource, /SaleMobileStepSummary/);
    assert.doesNotMatch(stepBarSource, /aria-label=\{`Detalle de \$\{step\.label\}`\}/);
    assert.match(stepBarSource, /w-\[13\.5rem\] lg:flex-\[1\.45\]/);
    assert.match(stepBarSource, /w-\[8\.5rem\] lg:flex-1/);
  });

  it("keeps the cart out of Caja content and registers it as a header action", () => {
    assert.match(
      ventaSource,
      /const saleHeaderCartAction = useMemo\([\s\S]*?<SaleHeaderCartTrigger/,
    );
    assert.match(
      ventaSource,
      /setShellConfig\(\{ headerAction: saleHeaderCartAction \}\)/,
    );
    assert.match(
      ventaSource,
      /showSaleHeaderCart && boxCartOpen[\s\S]*?<SaleHeaderCartPanel/,
    );
    assert.doesNotMatch(ventaSource, /stepPopovers=\{/);
  });
});
