import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const source = readFileSync(
  join(process.cwd(), "src/components/sale/sale-cart-panel.tsx"),
  "utf8",
);

describe("sale cart panel cleanup eval", () => {
  it("keeps only the cart components used by venta", () => {
    assert.match(source, /export function SaleCartPanel\(/);
    assert.match(source, /export function SaleHeaderCartTrigger\(/);
    assert.match(source, /export function SaleHeaderCartPanel\(/);
    assert.doesNotMatch(source, /SaleStepCartTrigger/);
    assert.doesNotMatch(
      source,
      /SaleCart(?:Drawer|Rail|MobileChip|BottomBar|Dock|IconButton|MobileDrawer|FloatingTrigger)/,
    );
  });

  it("does not retain portal or lifecycle code from the removed cart variants", () => {
    assert.doesNotMatch(source, /createPortal|useEffect|useState/);
  });

  it("uses a compact header trigger and a floating cart panel", () => {
    assert.match(source, /data-sale-header-cart=""/);
    assert.match(source, /inline-flex h-8 w-8 shrink-0/);
    assert.match(source, /data-sale-header-cart-panel=""/);
    assert.match(source, /fixed inset-0 z-\[145\]/);
    assert.match(source, /role="dialog"/);
  });
});
