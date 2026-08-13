import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const saleCommandMigration = readFileSync(
  new URL("../../supabase/migrations/132_atomic_sales_tracking_and_authoritative_writes.sql", import.meta.url),
  "utf8",
);
const reasonCatalogMigration = readFileSync(
  new URL("../../supabase/migrations/188_inventory_sale_counter_handoff_reason.sql", import.meta.url),
  "utf8",
);

describe("sale counter handoff inventory movement", () => {
  it("admits the reason emitted by the atomic sale command", () => {
    assert.match(saleCommandMigration, /'sale_counter_handoff'/);
    assert.match(
      reasonCatalogMigration,
      /inventory_movements_reason_code_check[\s\S]*?'sale_counter_handoff'/,
    );
  });
});
