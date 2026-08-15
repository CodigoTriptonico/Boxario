import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readVentaClientSource, readVentaPartsSource } from "@/test-utils/venta-source";

const ventaSource = readVentaClientSource();
const stepBarSource = readVentaPartsSource();

describe("venta mobile flow layout", () => {
  it("keeps the step 3 action pinned below the scrollable catalog", () => {
    assert.match(ventaSource, /overflow-visible lg:overflow-hidden/);
    assert.match(ventaSource, /!overflow-visible lg:!overflow-hidden/);
    assert.match(ventaSource, /flowPersonListShellClass/);
    assert.ok(
      ventaSource.indexOf("min-h-0 flex-1 overflow-y-auto pr-1") <
      ventaSource.indexOf("proceedQuickSaleFromSelectedBox();"),
    );
    assert.match(
      ventaSource,
      /border-t border-black\/80 pt-4/,
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

  it("keeps normal five-step and quick three-step bars visible without a duplicate summary", () => {
    assert.match(
      stepBarSource,
      /grid w-full \$\{steps\.length === 3 \? "grid-cols-3" : "grid-cols-5"\} items-start gap-0 lg:flex lg:min-w-0/,
    );
    assert.match(
      stepBarSource,
      /overflow-x-hidden lg:snap-x lg:snap-mandatory lg:overflow-x-auto/,
    );
    assert.doesNotMatch(stepBarSource, /SaleMobileStepSummary/);
    assert.doesNotMatch(stepBarSource, /aria-label=\{`Detalle de \$\{step\.label\}`\}/);
    assert.match(stepBarSource, /relative flex min-w-0 flex-col lg:w-auto lg:snap-start/);
    assert.match(stepBarSource, /lg:flex-\[1\.45\]/);
    assert.match(stepBarSource, /lg:flex-1/);
    assert.doesNotMatch(stepBarSource, /w-\[(?:13\.5|8\.5)rem\]/);
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
