import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { readInventoryActionsSource } from "@/test-utils/inventory-route-actions-source";

const root = process.cwd();
const inventoryActionSource = readInventoryActionsSource();
const migrationSource = readFileSync(
  join(root, "supabase/migrations/103_inventory_item_photos.sql"),
  "utf8",
);
const gridSource = readFileSync(
  join(root, "src/components/inventory/inventory-item-grid.tsx"),
  "utf8",
);

describe("inventory item photos eval", () => {
  it("stores photos on inventory_items and exposes upload action", () => {
    assert.match(migrationSource, /inventory_items[\s\S]*photo_url/);
    assert.match(migrationSource, /inventory-item-photos/);
    assert.match(inventoryActionSource, /uploadInventoryItemPhotoAction/);
    assert.match(inventoryActionSource, /photo_url/);
  });

  it("renders product-type thumbnails in the inventory grid", () => {
    assert.match(gridSource, /photoUrl/);
  });
});
