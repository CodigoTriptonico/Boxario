import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { readVentaClientSource } from "@/test-utils/venta-source";

const decisionSource = readFileSync(
  new URL("sale-route-decision.ts", import.meta.url),
  "utf8",
);
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

describe("sale unknown day eval", () => {
  it("models unknown day separately from a known day with unknown route", () => {
    assert.match(decisionSource, /kind: "undated";\s*routeDate: null/);
    assert.match(decisionSource, /return "Día y ruta pendientes"/);
    assert.match(decisionSource, /kind: "route_preferred"/);
    assert.match(decisionSource, /día pendiente/);
  });

  it("keeps the unknown-day choice on the day wizard step", () => {
    assert.match(saleSource, /allowPendingDay/);
    assert.match(saleSource, /pendingDayLabel="No sé el día"/);
    assert.match(panelLogicSource, /showPendingDay/);
    assert.match(panelLogicSource, /pendingDayAction/);
    assert.match(panelHelpersSource, /\{pendingDayAction\}/);
    assert.match(panelLogicSource, /step === "day"/);
    assert.match(panelLogicSource, /enterPendingDayRouteMode/);
    assert.match(
      panelViewSource,
      /No sé el día permite elegir una ruta semanal sin fecha\./,
    );
  });

  it("creates a pending task without a requested route date", () => {
    assert.match(
      decisionSource,
      /status: "pending" as const,\s*scheduledAt: null,\s*requestedRouteDate: decision\.routeDate/,
    );
  });
});
