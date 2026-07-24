import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const panelSource = readFileSync(
  new URL("../components/logistica/logistics-task-schedule-confirm-panel.tsx", import.meta.url),
  "utf8",
);
const saleSource = readFileSync(
  new URL("../components/venta-client.tsx", import.meta.url),
  "utf8",
);

describe("sale pending day", () => {
  it("offers one explicit action on the day wizard step before date and route", () => {
    assert.match(panelSource, /\{pendingDayLabel\}/);
    assert.match(panelSource, /showPendingDay/);
    assert.match(panelSource, /step === "day"/);
    assert.match(panelSource, /const dayStepField =/);
    assert.match(panelSource, /const dateStepField =/);
    assert.match(panelSource, /const routeStepField =/);
    assert.match(panelSource, /onClick=\{\(\) => void onConfirmPendingDay\?\.\(\)\}/);
    assert.match(panelSource, /Deja día, fecha, ruta y conductor pendientes\./);

    const dayStepIndex = panelSource.indexOf("const dayStepField =");
    const dateStepIndex = panelSource.indexOf("const dateStepField =");
    const routeStepIndex = panelSource.indexOf("const routeStepField =");
    assert.ok(dayStepIndex >= 0 && dateStepIndex > dayStepIndex && routeStepIndex > dateStepIndex);
  });

  it("clears date and route state for every sale delivery leg", () => {
    assert.match(
      saleSource,
      /const decision: SaleRouteDecision = \{ kind: "undated", routeDate: null \}/,
    );
    assert.match(
      saleSource,
      /setEmptyBoxScheduleMode\("pending"\);\s*setEmptyBoxScheduleAt\(""\);\s*setEmptyBoxRouteDecision\(decision\)/,
    );
    assert.match(
      saleSource,
      /setFullBoxScheduleMode\("pending"\);\s*setFullBoxScheduleAt\(""\);\s*setFullBoxRouteDecision\(decision\)/,
    );
    assert.match(saleSource, /onConfirmPendingDay=\{confirmSalePendingDay\}/);
  });
});
