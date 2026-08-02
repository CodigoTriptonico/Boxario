import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  collectInventorySupplierTagsFromMovements,
  filterInventorySupplierTags,
  mergeInventorySupplierTags,
} from "@/lib/inventory-supplier-tags";

describe("inventory supplier tags", () => {
  it("deduplicates suppliers from movements by recent order", () => {
    const tags = collectInventorySupplierTagsFromMovements([
      { evidence: { supplierName: "Proveedor A" } },
      { evidence: { supplierName: "proveedor b" } },
      { evidence: { supplierName: "Proveedor A" } },
      { evidence: { supplierName: "  Proveedor C  " } },
    ]);

    assert.deepEqual(tags, ["Proveedor A", "proveedor b", "Proveedor C"]);
  });

  it("merges new suppliers to the front without duplicates", () => {
    const merged = mergeInventorySupplierTags(
      ["Proveedor A", "Proveedor B"],
      "proveedor a",
    );

    assert.deepEqual(merged, ["Proveedor A", "Proveedor B"]);
  });

  it("filters tags by query", () => {
    const filtered = filterInventorySupplierTags(
      ["Amazon", "Costco", "Sam's Club"],
      "co",
    );

    assert.deepEqual(filtered, ["Costco"]);
  });
});
