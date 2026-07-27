import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  saleRouteDecisionSchedule,
  saleRouteDecisionSummary,
  saleRouteDecisionTask,
  saleRouteDecisionTemplateId,
  type SaleRouteDecision,
} from "@/lib/sale-route-decision";

const selected: SaleRouteDecision = {
  kind: "selected",
  routeDate: "2026-07-27",
  routeTemplateId: "route-monday",
  routeLabel: "Ruta norte",
  scheduledAt: "2026-07-27T17:00:00.000Z",
};

describe("sale route decision", () => {
  it("turns a selected weekly route into a scheduled delivery task", () => {
    assert.deepEqual(saleRouteDecisionTask(selected), {
      taskType: "deliver_empty_box",
      status: "scheduled",
      scheduledAt: "2026-07-27T17:00:00.000Z",
      requestedRouteDate: null,
    });
    assert.equal(
      saleRouteDecisionSummary(selected),
      "Ruta norte · 27 de julio de 2026 a las 10:00 AM",
    );
    assert.deepEqual(saleRouteDecisionSchedule(selected), {
      scheduleMode: "scheduled",
      scheduleAt: "2026-07-27T10:00",
    });
    assert.equal(saleRouteDecisionTemplateId(selected), "route-monday");
  });

  it("keeps the selected operating day when Logistics will choose the route later", () => {
    const pending: SaleRouteDecision = { kind: "pending", routeDate: "2026-07-29" };

    assert.deepEqual(saleRouteDecisionTask(pending), {
      taskType: "deliver_empty_box",
      status: "pending",
      scheduledAt: null,
      requestedRouteDate: "2026-07-29",
    });
    assert.equal(
      saleRouteDecisionSummary(pending),
      "Ruta pendiente · 29 de julio de 2026",
    );
    assert.deepEqual(saleRouteDecisionSchedule(pending), {
      scheduleMode: "pending",
      scheduleAt: "",
    });
    assert.equal(saleRouteDecisionTemplateId(pending), null);
  });

  it("keeps a preferred route without inventing a delivery day", () => {
    const preferred: SaleRouteDecision = {
      kind: "route_preferred",
      routeDate: null,
      routeTemplateId: "tpl-van-nuys",
      routeLabel: "Van Nuys",
    };

    assert.deepEqual(saleRouteDecisionTask(preferred), {
      taskType: "deliver_empty_box",
      status: "pending",
      scheduledAt: null,
      requestedRouteDate: null,
    });
    assert.equal(saleRouteDecisionSummary(preferred), "Van Nuys · día pendiente");
    assert.deepEqual(saleRouteDecisionSchedule(preferred), {
      scheduleMode: "pending",
      scheduleAt: "",
    });
    assert.equal(saleRouteDecisionTemplateId(preferred), "tpl-van-nuys");
  });

  it("keeps an unknown day pending without date or route", () => {
    const undated: SaleRouteDecision = { kind: "undated", routeDate: null };

    assert.deepEqual(saleRouteDecisionTask(undated), {
      taskType: "deliver_empty_box",
      status: "pending",
      scheduledAt: null,
      requestedRouteDate: null,
    });
    assert.equal(saleRouteDecisionSummary(undated), "Día y ruta pendientes");
    assert.deepEqual(saleRouteDecisionSchedule(undated), {
      scheduleMode: "pending",
      scheduleAt: "",
    });
    assert.equal(saleRouteDecisionTemplateId(undated), null);
  });
});
