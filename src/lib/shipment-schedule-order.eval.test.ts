import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

import { readEnviosClientSource } from "@/test-utils/envios-client-source";

const logisticsEditSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "shipment-logistics-edit.ts"),
  "utf8",
);
const contextMenuSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../components/shipment-step-context-menu.tsx"),
  "utf8",
);
const enviosSource = readEnviosClientSource();

describe("schedule vs driver order eval", () => {
  it("requires an explicit order flag before syncing driver logistics tasks", () => {
    assert.match(logisticsEditSource, /driverTaskOrdered/);
    assert.match(logisticsEditSource, /function legDriverTaskNeeded/);
    assert.doesNotMatch(
      logisticsEditSource,
      /needed: input\.emptyBox\.mode === EMPTY_BOX_DRIVER_MODE/,
    );
  });

  it("routes the ready action through the route assignment workflow", () => {
    assert.match(contextMenuSource, /onProgramRoute\?\: \(kind: "empty_box" \| "full_box"\) => void/);
    assert.match(contextMenuSource, /onProgramRoute\("empty_box"\)/);
    assert.match(contextMenuSource, /onProgramRoute\("full_box"\)/);
    assert.match(enviosSource, /requestCustomerRouteAssignmentAction\(\{/);
    assert.match(enviosSource, /source: "envios\.program_route"/);
  });

  it("outlines compact logistics tabs until the driver task exists", () => {
    const progressSource = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../components/shipment-progress-steps.tsx"),
      "utf8",
    );
    assert.match(progressSource, /function compactLogisticsLegUsesOutline/);
    assert.match(progressSource, /!step\.driverTaskOrdered/);
    assert.match(progressSource, /border-amber-400 bg-amber-400\/10/);
    assert.match(progressSource, /border-sky-400 bg-sky-400/);
  });
});
