import { readFileSync } from "node:fs";
import { join } from "node:path";

const SHIPMENT_ACTION_FILES = [
  "shipments.ts",
  "shipments-context.ts",
  "shipments-data.ts",
  "shipments-state.ts",
  "shipments-read.ts",
  "shipments-create.ts",
  "shipments-commercial.ts",
  "shipments-inventory.ts",
  "shipments-logistics-tasks.ts",
  "shipments-logistics.ts",
] as const;

export function readShipmentActionsSource(root = process.cwd()) {
  return SHIPMENT_ACTION_FILES.map((file) =>
    readFileSync(join(root, "src", "app", "actions", file), "utf8"),
  ).join("\n");
}
