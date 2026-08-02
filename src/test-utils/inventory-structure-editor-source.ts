import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const INVENTORY_STRUCTURE_SOURCE_FILES = [
  "components/inventory-structure-editor.tsx",
  "components/inventory/inventory-structure-embedded-shell.tsx",
  "components/inventory/use-inventory-tree-crud.ts",
  "components/inventory/use-inventory-structure-selection.ts",
  "components/inventory/use-inventory-structure-menus.ts",
  "components/inventory/use-inventory-embedded-options.tsx",
] as const;

function resolveSrcRoot(root = process.cwd()) {
  if (existsSync(join(root, "src", "components", "inventory-structure-editor.tsx"))) {
    return join(root, "src");
  }

  if (existsSync(join(root, "components", "inventory-structure-editor.tsx"))) {
    return root;
  }

  return join(root, "src");
}

export function readInventoryStructureEditorSource(root = process.cwd()) {
  const srcRoot = resolveSrcRoot(root);

  return INVENTORY_STRUCTURE_SOURCE_FILES.map((file) =>
    readFileSync(join(srcRoot, file), "utf8"),
  ).join("\n");
}
