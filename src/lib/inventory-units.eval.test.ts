import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { readInventoryActionsSource } from "@/test-utils/inventory-route-actions-source";

const root = process.cwd();
const inventoryActionSource = readInventoryActionsSource();
const gridSource = readFileSync(
  join(root, "src/components/inventory/inventory-item-grid.tsx"),
  "utf8",
);
const locationDrawerSource = readFileSync(
  join(root, "src/components/inventory/inventory-bin-placement-drawer.tsx"),
  "utf8",
);
const unitEditorSource = readFileSync(
  join(root, "src/components/inventory/inventory-item-unit-editor-modal.tsx"),
  "utf8",
);

describe("inventory units eval", () => {
  it("exposes unit update action and renders unit labels in inventory UI", () => {
    assert.match(inventoryActionSource, /updateInventoryItemUnitAction/);
    // Preferencia UI 2026-07-28: tarjetas muestran "N disponibles", no la unidad (piezas/cajas).
    assert.match(gridSource, /formatInventoryAvailableLabel/);
    assert.match(locationDrawerSource, /formatInventoryStockLabel/);
    assert.match(unitEditorSource, /Unidad de medida/);
  });
});
