import { readFileSync } from "node:fs";
import path from "node:path";

const ENVIOS_CLIENT_SOURCE_FILES = [
  "src/components/envios-client.tsx",
  "src/components/envios/types.ts",
  "src/components/envios/shipment-row-helpers.ts",
  "src/components/envios/envios-workspace-tabs.tsx",
  "src/components/envios/envios-readiness-actions.tsx",
  "src/components/envios/envios-filters-toolbar.tsx",
  "src/components/envios/envios-bulk-selection-bar.tsx",
  "src/components/envios/envios-shipment-rows-list.tsx",
  "src/components/envios/envios-shipment-cards-grid.tsx",
  "src/components/envios/envios-shipment-excel-table.tsx",
  "src/components/envios/use-envios-billing.ts",
  "src/components/envios/use-envios-logistics.ts",
  "src/components/envios/envios-client-dialogs.tsx",
  "src/components/envios/envios-shipments-panel.tsx",
  "src/components/envios/use-envios-bulk-owners.ts",
] as const;

export function readEnviosClientSource(root = process.cwd()) {
  return ENVIOS_CLIENT_SOURCE_FILES.map((relativePath) =>
    readFileSync(path.join(root, relativePath), "utf8"),
  ).join("\n");
}
