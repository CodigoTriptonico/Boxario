import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LogisticsRouteTemplateRow } from "@/app/actions/logistics-routes";
import { DAY_AS_ROUTE_TEMPLATE_ID } from "@/lib/logistics-day-route";
import { resolveLogisticsDefaultDriverId } from "@/lib/logistics-default-driver";

const template = {
  id: "route-riverside",
  weekday: 4,
  name: "Riverside",
  startTime: "10:00",
  estimatedEndTime: "",
  defaultDriverId: "driver-route",
  createdAt: "2026-08-05T00:00:00.000Z",
  updatedAt: "2026-08-05T00:00:00.000Z",
} satisfies LogisticsRouteTemplateRow;

describe("conductor predeterminado por ruta", () => {
  it("usa el conductor general cuando el día no tiene subrutas", () => {
    assert.equal(
      resolveLogisticsDefaultDriverId({
        weekday: 4,
        routeTemplateId: DAY_AS_ROUTE_TEMPLATE_ID,
        templates: [],
        defaultDriverByWeekday: [null, null, null, null, "driver-day", null, null],
      }),
      "driver-day",
    );
  });

  it("usa el conductor propio de la subruta y no el del día", () => {
    assert.equal(
      resolveLogisticsDefaultDriverId({
        weekday: 4,
        routeTemplateId: template.id,
        templates: [template],
        defaultDriverByWeekday: [null, null, null, null, "driver-day", null, null],
      }),
      "driver-route",
    );
  });

  it("no aplica el conductor general si el día tiene subrutas pero aún no se eligió una", () => {
    assert.equal(
      resolveLogisticsDefaultDriverId({
        weekday: 4,
        routeTemplateId: "",
        templates: [template],
        defaultDriverByWeekday: [null, null, null, null, "driver-day", null, null],
      }),
      "",
    );
  });
});
