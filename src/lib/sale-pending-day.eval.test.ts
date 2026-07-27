import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const decisionSource = readFileSync(
  new URL("sale-route-decision.ts", import.meta.url),
  "utf8",
);
const panelSource = readFileSync(
  new URL("../components/logistica/logistics-task-schedule-confirm-panel.tsx", import.meta.url),
  "utf8",
);
const saleSource = readFileSync(
  new URL("../components/venta-client.tsx", import.meta.url),
  "utf8",
);

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
    assert.match(panelSource, /showPendingDay/);
    assert.match(panelSource, /pendingDayAction/);
    assert.match(panelSource, /\{pendingDayAction\}/);
    assert.match(panelSource, /step === "day"/);
    assert.match(panelSource, /enterPendingDayRouteMode/);
    assert.match(
      panelSource,
      /No sé el día te deja elegir ruta sin fecha\. No sé la ruta conserva el día elegido\./,
    );
  });

  it("creates a pending task without a requested route date", () => {
    assert.match(
      decisionSource,
      /status: "pending" as const,\s*scheduledAt: null,\s*requestedRouteDate: decision\.routeDate/,
    );
  });
});
