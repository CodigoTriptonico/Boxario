import { readFileSync } from "node:fs";
import { join } from "node:path";

export const CONDUCTOR_ACTION_FILES = [
  "conductor-tasks.ts",
  "conductor-tasks-shared.ts",
  "conductor-task-result-support.ts",
  "conductor-tasks-read.ts",
  "conductor-route-arrival-actions.ts",
  "conductor-truck-actions.ts",
  "conductor-task-results.ts",
  "conductor-route-notifications.ts",
] as const;

export const LOGISTICS_ROUTE_ACTION_FILES = [
  "logistics-routes.ts",
  "logistics-routes-shared.ts",
  "logistics-route-catalog-actions.ts",
  "logistics-route-catalog-read.ts",
  "logistics-route-schedule-actions.ts",
  "logistics-route-booking-actions.ts",
  "logistics-routes-read.ts",
  "logistics-route-stop-actions.ts",
  "logistics-route-management-actions.ts",
  "logistics-route-publish-actions.ts",
  "logistics-route-live-edit-actions.ts",
] as const;

function readActionSources(files: readonly string[], root: string) {
  return files
    .map((file) =>
      readFileSync(join(root, "src", "app", "actions", file), "utf8"),
    )
    .join("\n");
}

export function readConductorTaskActionsSource(root = process.cwd()) {
  return readActionSources(CONDUCTOR_ACTION_FILES, root);
}

export function readLogisticsRouteActionsSource(root = process.cwd()) {
  return readActionSources(LOGISTICS_ROUTE_ACTION_FILES, root);
}
