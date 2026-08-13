import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { readVentaClientSource } from "@/test-utils/venta-source";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const ventaSource = readVentaClientSource();
const senderListSource = readFileSync(join(root, "components/sale/sale-sender-list.tsx"), "utf8");
const recipientListSource = readFileSync(join(root, "components/sale/sale-recipient-list.tsx"), "utf8");
const sidebarControls = readFileSync(
  join(root, "components/ui/sidebar-page-surface-controls.tsx"),
  "utf8",
);
const surfaceContexts = readFileSync(join(root, "lib/ui-surface-context.ts"), "utf8");

describe("venta view layout eval", () => {
  it("shares the persisted view layout between remitentes and destinatarios via sidebar", () => {
    assert.equal(ventaSource.includes("usePageViewLayout(saleListPaletteContext)"), true);
    assert.equal(ventaSource.includes("viewLayout={viewLayout}"), true);
    assert.equal(ventaSource.includes("onViewLayoutToggle"), false);
    assert.equal(senderListSource.includes("SalePersonListToolbar"), true);
    assert.equal(senderListSource.includes("onViewLayoutToggle"), false);
    assert.equal(sidebarControls.includes("usePageViewLayout"), true);
    assert.equal(sidebarControls.includes("sale.senderCard"), false);
    assert.match(surfaceContexts, /id: "sale\.senderCard"[\s\S]*?supportsExcelLayout: true/);
    assert.match(surfaceContexts, /id: "sale\.recipientCard"[\s\S]*?supportsExcelLayout: true/);
  });

  it("renders both row and card person lists in venta", () => {
    assert.equal(senderListSource.includes('viewLayout === "rows"'), true);
    assert.equal(senderListSource.includes("SalePersonRow"), true);
    assert.equal(senderListSource.includes("SalePersonCard"), true);
    assert.equal(senderListSource.includes("flowPersonCardGridClass"), true);
    assert.equal(recipientListSource.includes('viewLayout === "rows"'), true);
    assert.equal(senderListSource.includes('viewLayout === "excel"'), true);
    assert.equal(recipientListSource.includes('viewLayout === "excel"'), true);
    assert.equal(recipientListSource.includes("SalePersonAddRow"), false);
    assert.equal(recipientListSource.includes("SalePersonAddCard"), false);
  });
});
