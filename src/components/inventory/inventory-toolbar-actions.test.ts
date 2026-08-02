import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { readInventoryStructureEditorSource } from "@/test-utils/inventory-structure-editor-source";

const componentDir = dirname(fileURLToPath(import.meta.url));
const structureSource = readInventoryStructureEditorSource();
const treeCrudSource = readFileSync(
  join(componentDir, "use-inventory-tree-crud.ts"),
  "utf8",
);
const menuSource = readFileSync(
  join(componentDir, "inventory-structure-options-menu.tsx"),
  "utf8",
);
const custodySource = readFileSync(
  join(componentDir, "inventory-control-menu.tsx"),
  "utf8",
);

describe("inventory toolbar actions", () => {
  it("keeps the primary add action separate from the operation menu", () => {
    assert.match(structureSource, /label="Agregar artículo"/);
    assert.match(structureSource, /label="Operación de inventario"/);
    assert.match(structureSource, /ariaHaspopup="menu"/);
    assert.match(structureSource, /w-\[min\(19rem,calc\(100vw-1rem\)\)\]/);
  });

  it("routes catalog structure through the pencil and custody through the menu", () => {
    assert.match(structureSource, /icon=\{Pencil\}/);
    assert.match(structureSource, /Editar categorías y subcategorías/);
    assert.match(structureSource, /onOpenStructureMenu\(event\.currentTarget, "create"\)/);
    assert.doesNotMatch(structureSource, /Categorías y subcategorías/);
    assert.doesNotMatch(structureSource, /Gestionar estructura/);
    assert.doesNotMatch(structureSource, /Herramientas de inventario/);
    assert.doesNotMatch(structureSource, /Control operativo y organización del catálogo/);
    assert.match(menuSource, /Renombrar categoría/);
    assert.match(custodySource, /Quién tiene cada caja y sus movimientos/);
  });

  it("keeps category pickers compact beside the pencil", () => {
    assert.match(structureSource, /inventoryToolbarCatalogGroupClass/);
    assert.match(structureSource, /inventoryToolbarPickerShellClass/);
    assert.match(structureSource, /showEmbeddedSubcategoryPicker/);
    assert.match(structureSource, /inventoryToolbarChevronButtonClass/);
  });

  it("blocks duplicate category names in the client before persisting", () => {
    assert.match(treeCrudSource, /categoryNames\.includes\(normalizedName\)/);
    assert.match(
      treeCrudSource,
      /inventoryTreeItemExists\(categoryItems\(categoryData\), subcategoryName\)/,
    );
    assert.match(treeCrudSource, /Ya existe una subcategoría con ese nombre aquí/);
  });
});
