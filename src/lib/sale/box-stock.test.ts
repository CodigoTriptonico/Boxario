import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSaleBoxStockIndex,
  lookupSaleBoxStock,
  saleBoxStockLevel,
  saleBoxStockTitle,
} from "@/lib/sale/box-stock";

describe("sale box stock", () => {
  it("aggregates available stock across warehouses by box size", () => {
    const index = buildSaleBoxStockIndex([
      {
        item_id: "item-14",
        stock: 10,
        reserved: 2,
        min_stock: 2,
        inventory_items: { name: "14x14x14", kind: "14x14x14" },
      },
      {
        item_id: "item-14",
        stock: 5,
        reserved: 0,
        min_stock: 2,
        inventory_items: { name: "14x14x14", kind: "14x14x14" },
      },
      {
        item_id: "item-16",
        stock: 0,
        reserved: 0,
        min_stock: 3,
        inventory_items: { name: "16x16x16", kind: "16x16x16" },
      },
    ]);

    assert.deepEqual(lookupSaleBoxStock("14x14x14", index), {
      available: 13,
      minStock: 2,
    });
    assert.deepEqual(lookupSaleBoxStock("16x16x16", index), {
      available: 0,
      minStock: 3,
    });
    assert.equal(saleBoxStockLevel(lookupSaleBoxStock("14x14x14", index)), "ok");
    assert.equal(saleBoxStockLevel(lookupSaleBoxStock("16x16x16", index)), "empty");
  });

  it("defaults missing boxes to empty stock without blocking lookup", () => {
    const missing = lookupSaleBoxStock("30x20x20", {});
    assert.deepEqual(missing, { available: 0, minStock: 2 });
    assert.equal(saleBoxStockLevel(missing), "empty");
    assert.match(saleBoxStockTitle(missing), /Sin stock/);
  });
});
