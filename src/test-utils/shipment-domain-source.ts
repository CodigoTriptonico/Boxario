import { readFileSync } from "node:fs";
import { join } from "node:path";

const SHIPMENT_DISPLAY_FILES = [
  "shipment-display.ts",
  "shipment-display/constants.ts",
  "shipment-display/shared.ts",
  "shipment-display/progress.ts",
  "shipment-display/status.ts",
  "shipment-display/finance.ts",
  "shipment-display/assignment.ts",
] as const;

const SHIPMENT_TIMING_FILES = [
  "shipment-timing.ts",
  "shipment-timing/core.ts",
  "shipment-timing/milestones.ts",
  "shipment-timing/timings.ts",
  "shipment-timing/insights.ts",
  "shipment-timing/audit.ts",
] as const;

function readShipmentDomainSource(
  files: readonly string[],
  root: string,
) {
  return files
    .map((file) =>
      readFileSync(join(root, "src", "lib", file), "utf8"),
    )
    .join("\n");
}

export function readShipmentDisplaySource(root = process.cwd()) {
  return readShipmentDomainSource(SHIPMENT_DISPLAY_FILES, root);
}

export function readShipmentTimingSource(root = process.cwd()) {
  return readShipmentDomainSource(SHIPMENT_TIMING_FILES, root);
}
