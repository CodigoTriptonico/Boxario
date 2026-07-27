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
    assert.match(panelSource, /onConfirmPreferredRoute/);
    assert.match(panelSource, /enterPendingDayRouteMode/);
    assert.match(panelSource, /pendingDayAction/);
    assert.match(panelSource, /pendingRouteAction/);
    assert.match(panelSource, /\{pendingDayAction\}/);
    assert.match(panelSource, /\{pendingRouteAction\}/);

    const dayStepIndex = panelSource.indexOf("const dayStepField =");
    const dateStepIndex = panelSource.indexOf("const dateStepField =");
    const routeStepIndex = panelSource.indexOf("const routeStepField =");
    assert.ok(dayStepIndex >= 0 && dateStepIndex > dayStepIndex && routeStepIndex > dateStepIndex);
  });

  it("enters an all-routes picker without closing, then can leave both pending", () => {
    assert.match(panelSource, /pendingDayRouteMode/);
    assert.match(panelSource, /enterPendingDayRouteMode/);
    assert.match(panelSource, /onConfirmPreferredRoute/);
    assert.match(panelSource, /Elige una ruta ahora, o No sé la ruta deja día y ruta pendientes\./);
    assert.match(
      panelSource,
      /if \(pendingDayRouteMode\) \{\s*void onConfirmPendingDay\?\.\(\);/,
    );
  });

  it("clears date and route state for full-box pending day decisions", () => {
    assert.match(
      saleSource,
      /const decision: SaleRouteDecision = \{ kind: "undated", routeDate: null \}/,
    );
    assert.match(
      saleSource,
      /setFullBoxScheduleMode\("pending"\);\s*setFullBoxScheduleAt\(""\);\s*setFullBoxRouteDecision\(decision\)/,
    );
    assert.match(saleSource, /onConfirmPendingDay=\{\s*routePlannerLeg === "fullBox" \? confirmSalePendingDay/);
    assert.match(saleSource, /onConfirmPreferredRoute=\{\s*routePlannerLeg === "fullBox" \? confirmSalePreferredRoute/);
    assert.match(saleSource, /kind: "route_preferred"/);
  });
});
