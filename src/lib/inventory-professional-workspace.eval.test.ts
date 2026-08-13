import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

const navSource = read("src/components/inventory/inventory-workspace-nav.tsx");
const gridSource = read("src/components/inventory/inventory-item-grid.tsx");
const itemSummarySource = read("src/components/inventory/inventory-item-summary.tsx");
const profileSource = read("src/components/inventory/inventory-item-admin-modal.tsx");
const profileMigration = read(
  "supabase/migrations/201_inventory_article_professional_profile.sql",
);
const binMigration = read("supabase/migrations/200_inventory_bin_transfer_atomic.sql");
const binActions = read("src/app/actions/inventory-bins.ts");
const transferActions = read("src/app/actions/inventory-transfers.ts");
const catalogActions = read("src/app/actions/inventory/catalog.ts");

describe("inventory professional workspace", () => {
  it("keeps the main inventory areas visible in one compact navigation strip", () => {
    for (const label of [
      "Artículos",
      "Dónde están",
      "Transferencias",
      "Asignaciones",
      "Movimientos",
      "Camiones",
      "Bodegas",
    ]) {
      assert.match(navSource, new RegExp(label));
    }

    assert.doesNotMatch(navSource, /overflow-x-auto/);
    assert.match(navSource, /flex-wrap/);
    assert.match(navSource, /h-9/);
    const shellSource = read("src/components/inventory/inventory-structure-embedded-shell.tsx");
    assert.match(shellSource, /workspaceNavSlot/);
    assert.doesNotMatch(
      shellSource,
      /workspaceNavSlot \? \(\s*<div className="flex shrink-0 items-center border-b/,
    );
    assert.match(shellSource, /overflow-x-hidden border-b border-black\/70/);
    assert.doesNotMatch(shellSource, /overflow-x-auto border-b border-black\/70/);
  });

  it("makes per-article operations discoverable without relying on right click", () => {
    assert.match(gridSource, /InventoryItemOperationsButton/);
    assert.match(itemSummarySource, /Abrir operaciones de/);
    assert.match(itemSummarySource, /Operar \$\{itemName\}/);
    assert.match(itemSummarySource, /MoreHorizontal/);
  });

  it("stores the professional article profile without mixing customer packages", () => {
    assert.match(profileMigration, /inventory_class/);
    assert.match(profileMigration, /barcode/);
    assert.match(profileMigration, /max_stock/);
    assert.match(profileMigration, /requires_serial_tracking/);
    assert.match(profileMigration, /requires_lot_tracking/);
    assert.match(profileMigration, /requires_expiry_tracking/);
    assert.match(profileSource, /Clase de inventario/);
    assert.match(profileSource, /Consumible/);
    assert.match(profileSource, /Producto para vender/);
    assert.match(profileSource, /Reutilizable/);
    assert.match(profileSource, /Activo/);
  });

  it("uses complete server reads for custody and transfer selectors", () => {
    assert.match(transferActions, /listInventoryTransferableItemsAction/);
    assert.match(transferActions, /for \(let offset = 0; ; offset \+= pageSize\)/);
  });

  it("moves bin stock atomically and preserves off-page item metadata", () => {
    assert.match(binMigration, /transfer_inventory_bin_stock_atomic/);
    assert.match(binMigration, /for update/);
    assert.match(binActions, /rpc\("transfer_inventory_bin_stock_atomic"/);
    assert.match(catalogActions, /absent `stockItem` means this leaf is outside the/);
    assert.match(catalogActions, /if \(stockItem\)/);
  });
});
