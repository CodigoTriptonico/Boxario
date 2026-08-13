import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const migrationSource = readFileSync(
  join(process.cwd(), "supabase/migrations/107_inventory_entry_costs.sql"),
  "utf8",
);
const movementModalSource = readFileSync(
  join(process.cwd(), "src/components/inventory/inventory-item-movement-draft-modal.tsx"),
  "utf8",
);
const structureEditorSource = readFileSync(
  join(process.cwd(), "src/components/inventory/use-inventory-movements.ts"),
  "utf8",
);

describe("inventory entry cost eval", () => {
  it("stores movement costs and weighted average in the database layer", () => {
    assert.match(migrationSource, /avg_cost/);
    assert.match(migrationSource, /unit_cost/);
    assert.match(migrationSource, /total_cost/);
    assert.match(migrationSource, /p_unit_cost numeric default null/);
    assert.match(migrationSource, /next_avg_cost/);
  });

  it("exposes optional synced cost fields only on entrada", () => {
    assert.match(movementModalSource, /Total del lote/);
    assert.match(movementModalSource, /Costo por pieza/);
    assert.match(movementModalSource, /movementDraft\.type === "entrada"/);
    assert.match(movementModalSource, /syncEntryCostFields/);
    assert.match(movementModalSource, /movementFieldClass/);
    assert.match(movementModalSource, /w-full min-w-0 max-w-full/);
    assert.match(movementModalSource, /flex min-w-0 flex-col gap-3/);
    assert.doesNotMatch(movementModalSource, /sm:grid-cols-2/);
  });

  it("submits resolved entry costs from the inventory editor", () => {
    assert.match(structureEditorSource, /resolveEntryCostForSubmit/);
    assert.match(structureEditorSource, /unitCost:/);
    assert.match(structureEditorSource, /totalCost:/);
  });
});
