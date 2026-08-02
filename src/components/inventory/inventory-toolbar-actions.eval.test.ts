import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { readInventoryStructureEditorSource } from "@/test-utils/inventory-structure-editor-source";

const componentDir = dirname(fileURLToPath(import.meta.url));
const structureSource = readInventoryStructureEditorSource();
const menuSource = readFileSync(
  join(componentDir, "inventory-structure-options-menu.tsx"),
  "utf8",
);

describe("inventory toolbar action separation eval", () => {
  it("keeps article creation primary and operational work in the overflow menu", () => {
    assert.match(structureSource, /label="Agregar artículo"/);
    assert.match(structureSource, /label="Operación de inventario"/);
    assert.match(structureSource, /aria-label="Operación de inventario"/);
    assert.match(structureSource, /\{toolbarEndSlot\}/);
    assert.doesNotMatch(structureSource, /Ver tarjetas/);
    assert.doesNotMatch(structureSource, /Ver lista/);
    assert.match(menuSource, /Nueva categoría/);
    assert.match(menuSource, /Nueva subcategoría/);
    assert.doesNotMatch(menuSource, /Nuevo item/);
  });

  it("isolates destructive structure actions in the pencil popover", () => {
    assert.match(structureSource, /icon=\{Pencil\}/);
    assert.match(menuSource, /deleteIconButtonClass/);
    assert.match(menuSource, /onClick=\{confirmDeleteCategory\}/);
    assert.match(menuSource, /onBlur=\{\(\) => saveCategory\(selectedCategoryData\.name\)\}/);
    assert.match(menuSource, /Renombrar categoría/);
    assert.doesNotMatch(menuSource, /Guardar nombre/);
    assert.doesNotMatch(menuSource, />\s*Eliminar categoría\s*<\/button>/);
  });

  it("makes the category hierarchy visible in the compact toolbar", () => {
    assert.match(structureSource, /embeddedSubcategoryOptions\.length > 1/);
    assert.match(structureSource, /placeholder="Subcategor/);
    assert.match(structureSource, /embeddedSubcategoryOpen/);
    assert.match(structureSource, /inventoryToolbarSubcategoryPickerWidthClass/);
    assert.match(structureSource, /ChevronRight/);
  });

  it("keeps duplicate names out of the client structure editor", () => {
    assert.match(treeCrudSource, /categoryNames\.includes\(normalizedName\)/);
    assert.match(treeCrudSource, /inventoryTreeItemExists\(categoryItems\(categoryData\)/);
    assert.match(treeCrudSource, /Ya existe una categoría con ese nombre/);
  });
});
