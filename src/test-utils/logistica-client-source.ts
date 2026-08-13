import { readFileSync } from "node:fs";
import path from "node:path";

const LOGISTICA_CLIENT_SOURCE_FILES = [
  "src/components/logistica-client.tsx",
  "src/components/logistica/logistica-client-implementation.tsx",
  "src/components/logistica/types.ts",
  "src/components/logistica/lib/constants.ts",
  "src/components/logistica/lib/formatters.ts",
  "src/components/logistica/lib/task-ui.tsx",
  "src/components/logistica/lib/use-wide-logistics-layout.ts",
  "src/components/logistica/lib/use-logistics-task-data.ts",
  "src/components/logistica/lib/use-logistics-data.ts",
  "src/components/logistica/lib/use-logistics-filters.ts",
  "src/components/logistica/lib/task-route-picker.ts",
  "src/components/logistica/lib/use-logistics-route-actions.ts",
  "src/components/logistica/lib/use-logistics-task-actions.ts",
  "src/components/logistica/panels/logistics-task-waiting-banner.tsx",
  "src/components/logistica/panels/logistics-task-route-picker.tsx",
  "src/components/logistica/panels/logistics-invoice-card.tsx",
  "src/components/logistica/panels/logistics-invoice-row.tsx",
  "src/components/logistica/panels/logistics-route-detail-panel.tsx",
  "src/components/logistica/panels/logistics-client-dialogs.tsx",
  "src/components/logistica/panels/logistics-toolbar.tsx",
  "src/components/logistica/panels/logistics-tasks-board.tsx",
  "src/components/logistica/logistics-routes-workspace.tsx",
  "src/components/logistica/logistics-confirmations-excel-table.tsx",
  "src/components/logistica/logistics-template-booking-groups.tsx",
  "src/components/logistica/logistics-unified-route-list.tsx",
  "src/components/logistica/logistics-history-route-list.tsx",
] as const;

export function readLogisticaClientSource(root = process.cwd()) {
  return LOGISTICA_CLIENT_SOURCE_FILES.map((relativePath) =>
    readFileSync(path.join(root, relativePath), "utf8"),
  ).join("\n");
}
