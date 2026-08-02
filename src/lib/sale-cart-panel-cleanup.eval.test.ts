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
    assert.doesNotMatch(source, /export function SaleCartPanel\(/);
    assert.match(source, /export function SaleHeaderCartTrigger\(/);
    assert.match(source, /export function SaleHeaderCartPanel\(/);
    assert.doesNotMatch(source, /SaleStepCartTrigger/);
    assert.doesNotMatch(
      source,
      /SaleCart(?:Drawer|Rail|MobileChip|BottomBar|Dock|IconButton|MobileDrawer|FloatingTrigger)/,
    );
  });

  it("does not retain portal code from the removed cart variants", () => {
    assert.doesNotMatch(source, /createPortal/);
  });

  it("uses a compact header trigger and a floating cart panel", () => {
    assert.match(source, /data-sale-header-cart=""/);
    assert.match(source, /inline-flex h-8 w-8 shrink-0/);
    assert.match(source, /data-sale-header-cart-panel=""/);
    assert.match(source, /fixed inset-0 z-\[145\]/);
    assert.match(source, /role="dialog"/);
  });

  it("anchors the cart panel under the header trigger instead of a fixed screen corner", () => {
    assert.match(source, /resolveCartPanelPosition/);
    assert.match(source, /\[data-sale-header-cart\]/);
    assert.match(source, /anchor\.right - width/);
    assert.match(source, /anchor\.bottom \+ 6/);
    assert.doesNotMatch(source, /lg:right-5 lg:top-5/);
    assert.doesNotMatch(source, /right-3 top-\[4\.75rem\]/);
  });

  it("makes a filled cart an amber action instead of a quiet emerald ghost", () => {
    assert.match(
      source,
      /hasItems[\s\S]*?from-amber-300 via-amber-400 to-orange-500/,
    );
    assert.match(source, /bg-slate-950 px-1 text-\[10px\][\s\S]*?text-amber-300/);
    assert.doesNotMatch(
      source,
      /itemCount\s*\?\s*"border-emerald-800\/60 bg-emerald-400\/15/,
    );
  });
});
