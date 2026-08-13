import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readVentaClientSource, readVentaPartsSource } from "@/test-utils/venta-source";

const ventaSource = readVentaClientSource();
const stepBarSource = readVentaPartsSource();

describe("venta mobile flow layout eval", () => {
  it("pins Siguiente under the catalog and keeps all mobile steps visible without clipping step popovers", () => {
    assert.match(
      ventaSource,
      /min-h-0 flex-1 overflow-y-auto pr-1[\s\S]*?flex shrink-0 justify-center border-t border-black\/80 pt-4[\s\S]*?onClick=\{continueFromCart\}/,
    );
    assert.match(
      ventaSource,
      /justify-center overflow-y-auto px-1 py-2 sm:px-1\.5[\s\S]*?SaleLogisticsStep[\s\S]*?flex shrink-0 justify-center border-t border-black\/80 pt-4[\s\S]*?onClick=\{continueFromLogistics\}/,
    );
    assert.equal(ventaSource.includes("sticky top-0 z-20"), false);
    assert.match(
      stepBarSource,
      /hasOpenStepPopover[\s\S]*?\? "overflow-visible pb-1 lg:pb-\[min\(40vh,17rem\)\]"/,
    );
    assert.match(
      stepBarSource,
      /<ol className="grid w-full grid-cols-5 items-start gap-0 lg:flex lg:min-w-0">/,
    );
    assert.match(stepBarSource, /overflow-x-hidden lg:snap-x lg:snap-mandatory lg:overflow-x-auto/);
    assert.doesNotMatch(stepBarSource, /SaleMobileStepSummary|activeMobileStep/);
    assert.match(ventaSource, /<SaleHeaderCartTrigger/);
    assert.match(ventaSource, /setShellConfig\(\{ headerAction: saleHeaderCartAction \}\)/);
    assert.doesNotMatch(ventaSource, /stepPopovers=\{/);
    assert.match(
      stepBarSource,
      /className=\{`hidden min-h-\[1rem\][\s\S]*?lg:flex/,
    );
  });
});
