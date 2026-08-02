import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { readVentaClientSource } from "@/test-utils/venta-source";

const panelLogicSource = readFileSync(
  new URL(
    "../components/logistica/task-schedule/logistics-task-schedule-confirm-panel-view.tsx",
    import.meta.url,
  ),
  "utf8",
);
const panelHelpersSource = readFileSync(
  new URL(
    "../components/logistica/task-schedule/logistics-task-schedule-confirm-helpers.tsx",
    import.meta.url,
  ),
  "utf8",
);
const panelViewSource = readFileSync(
  new URL("../components/logistica/task-schedule/schedule-confirm-view.tsx", import.meta.url),
  "utf8",
);
const saleSource = readVentaClientSource();

describe("sale pending day", () => {
  it("offers one explicit action on the day wizard step before date and route", () => {
    assert.match(panelLogicSource, /\{pendingDayLabel\}/);
    assert.match(panelLogicSource, /showPendingDay/);
    assert.match(panelLogicSource, /step === "day"/);
    assert.match(panelLogicSource, /const dayStepField =/);
    assert.match(panelLogicSource, /const dateStepField =/);
    assert.match(panelLogicSource, /const routeStepField =/);
    assert.match(panelLogicSource, /onConfirmPreferredRoute/);
    assert.match(panelLogicSource, /enterPendingDayRouteMode/);
    assert.match(panelLogicSource, /pendingDayAction/);
    assert.match(panelLogicSource, /pendingRouteAction/);
    assert.match(panelHelpersSource, /\{pendingDayAction\}/);
    assert.match(panelHelpersSource, /\{pendingRouteAction\}/);

    const dayStepIndex = panelLogicSource.indexOf("const dayStepField =");
    const dateStepIndex = panelLogicSource.indexOf("const dateStepField =");
    const routeStepIndex = panelLogicSource.indexOf("const routeStepField =");
    assert.ok(dayStepIndex >= 0 && dateStepIndex > dayStepIndex && routeStepIndex > dateStepIndex);
  });

  it("enters an all-routes picker without closing, then can leave both pending", () => {
    assert.match(panelLogicSource, /pendingDayRouteMode/);
    assert.match(panelLogicSource, /enterPendingDayRouteMode/);
    assert.match(panelLogicSource, /onConfirmPreferredRoute/);
    assert.match(panelViewSource, /Elige una ruta ahora o deja día y ruta pendientes\./);
    assert.match(
      panelLogicSource,
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
    assert.match(
      saleSource,
      /onConfirmPendingDay=\{\s*routePlannerLeg === "fullBox" \? confirmSalePendingDay/,
    );
    assert.match(
      saleSource,
      /onConfirmPreferredRoute=\{\s*routePlannerLeg === "fullBox" \? confirmSalePreferredRoute/,
    );
    assert.match(saleSource, /kind: "route_preferred"/);
  });
});
