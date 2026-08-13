import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../components/shipment-progress-steps.tsx"),
  "utf8",
);

describe("shipment compact progress UI eval", () => {
  it("shows readable step names and current state instead of number-only bars", () => {
    assert.equal(source.includes("function compactStepName"), true);
    assert.equal(source.includes("compactStepName(step, row, routeByTaskId)"), true);
    assert.equal(source.includes("logisticsLegCompactLabel"), true);
    assert.equal(source.includes("routeConfirmed"), true);
    assert.equal(source.includes("grid h-12"), false);
  });

  it("opens pickup actions when clicking active Recoger step", () => {
    assert.equal(source.includes("function shouldOpenLegMenuOnClick"), true);
    assert.equal(source.includes("openStepMenuFromButton(step, step.id, event)"), true);
    assert.doesNotMatch(source, /Clic en Recoger para programar o marcar recolección/);
    assert.match(source, /step\.kind === "empty_box" \|\| step\.kind === "full_box"/);
  });

  it("blocks interaction on future pending steps", () => {
    assert.equal(source.includes("export function stepIsReachable"), true);
    assert.match(source, /stepIsReachable\(step\)/);
    assert.match(source, /disabled=\{!stepIsInteractive\(step\)\}/);
  });

  it("keeps active logistics legs visually distinct without a global pulse shell", () => {
    assert.equal(source.includes("function compactStepNodeClass"), true);
    assert.equal(source.includes("compactLogisticsLegUsesOutline"), true);
    assert.match(source, /Pendiente = ámbar outline/);
    assert.match(source, /return !step\.driverTaskOrdered/);
    assert.match(source, /border-sky-400 bg-sky-400/);
    assert.match(source, /stepIconWrapClass = singleLine \? "h-7 w-7" : "h-8 w-8"/);
    assert.equal(source.includes("transition-transform"), true);
    assert.equal(source.includes("shipment-step-active-pulse"), false);
  });

  it("does not show the last completed gap summary row", () => {
    assert.equal(source.includes("Último tramo:"), false);
    assert.equal(source.includes("lastCompletedGap"), false);
  });

  it("supports a single-line compact row for envios", () => {
    assert.equal(source.includes("singleLine?: boolean"), true);
    assert.match(source, /if \(singleLine\) \{[\s\S]*?gridTemplateColumns: `repeat\(\$\{steps\.length\}, minmax\(0, 1fr\)\)`/);
    assert.equal(source.includes("w-full max-w-full"), true);
    assert.equal(source.includes("w-fit max-w-full"), false);
    assert.match(source, /text-\[10px\] font-black leading-tight/);
    assert.equal(source.includes("whitespace-normal break-words"), true);
    assert.equal(source.includes("sm:truncate sm:whitespace-nowrap"), true);
    assert.match(source, /Paso \{focusIndex \|\| steps\.length\} de \{steps\.length\}/);
  });
});
