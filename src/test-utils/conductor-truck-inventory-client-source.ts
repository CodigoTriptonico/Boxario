import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const CONDUCTOR_TRUCK_INVENTORY_CLIENT_FILES = [
  "components/conductor/conductor-truck-inventory-client.tsx",
  "components/conductor/conductor-truck-sections.tsx",
  "components/conductor/conductor-truck-unload-dialog.tsx",
] as const;

function resolveSrcRoot(root = process.cwd()) {
  if (existsSync(join(root, "src", "components", "conductor", "conductor-truck-inventory-client.tsx"))) {
    return join(root, "src");
  }

  if (existsSync(join(root, "components", "conductor", "conductor-truck-inventory-client.tsx"))) {
    return root;
  }

  return join(root, "src");
}

export function readConductorTruckInventoryClientSource(root = process.cwd()) {
  const srcRoot = resolveSrcRoot(root);

  return CONDUCTOR_TRUCK_INVENTORY_CLIENT_FILES
    .map((file) => readFileSync(join(srcRoot, file), "utf8"))
    .join("\n");
}
