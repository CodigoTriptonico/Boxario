import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLogisticsRoutesListFilters,
  clampLogisticsRoutesLimit,
  clampLogisticsRoutesOffset,
  defaultLogisticsRoutesListFilters,
  LOGISTICS_ROUTES_MAX_PAGE_SIZE,
  LOGISTICS_ROUTES_PAGE_SIZE,
  logisticsRoutesDatesForWeekday,
  logisticsRoutesListFiltersKey,
} from "@/lib/logistics-routes-pagination";

describe("logistics routes pagination helpers", () => {
  it("defaults page size to 50 and clamps to 200", () => {
    assert.equal(LOGISTICS_ROUTES_PAGE_SIZE, 50);
    assert.equal(clampLogisticsRoutesLimit(undefined), 50);
    assert.equal(clampLogisticsRoutesLimit(0), 1);
    assert.equal(clampLogisticsRoutesLimit(999), LOGISTICS_ROUTES_MAX_PAGE_SIZE);
    assert.equal(clampLogisticsRoutesOffset(-3), 0);
  });

  it("maps board filters to server params like the Activas/Historial toggle", () => {
    assert.deepEqual(
      buildLogisticsRoutesListFilters({
        dateFilter: "2026-08-02",
        weekdayFilter: 6,
        driverFilter: "driver-1",
        zoneFilter: "van-nuys",
        routeTemplateFilter: "tpl-1",
        showRouteHistory: false,
      }),
      {
        routeDate: "2026-08-02",
        weekday: undefined,
        assignedTo: "driver-1",
        zoneKey: "van-nuys",
        routeTemplateId: "tpl-1",
        statusMode: "active",
      },
    );

    assert.deepEqual(
      buildLogisticsRoutesListFilters({
        weekdayFilter: 1,
        showRouteHistory: true,
      }),
      {
        routeDate: undefined,
        weekday: 1,
        assignedTo: undefined,
        zoneKey: undefined,
        routeTemplateId: undefined,
        statusMode: "history",
      },
    );
  });

  it("builds a bounded weekday date list for PostgREST .in filters", () => {
    const dates = logisticsRoutesDatesForWeekday(0, {
      pastWeeks: 1,
      futureWeeks: 1,
      from: new Date("2026-08-05T12:00:00"),
    });
    assert.equal(dates.length, 3);
    assert.ok(dates.every((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)));
  });

  it("exposes default SSR filters for today/active", () => {
    const filters = defaultLogisticsRoutesListFilters(new Date("2026-08-02T15:00:00"));
    assert.equal(filters.routeDate, "2026-08-02");
    assert.equal(filters.statusMode, "active");
    assert.equal(filters.limit, LOGISTICS_ROUTES_PAGE_SIZE);
    assert.equal(filters.offset, 0);
  });

  it("builds a stable filters key for effect deps", () => {
    const key = logisticsRoutesListFiltersKey({
      routeDate: "2026-08-02",
      statusMode: "active",
      assignedTo: "a",
    });
    assert.equal(
      key,
      logisticsRoutesListFiltersKey({
        routeDate: "2026-08-02",
        statusMode: "active",
        assignedTo: "a",
      }),
    );
    assert.notEqual(
      key,
      logisticsRoutesListFiltersKey({
        routeDate: "2026-08-02",
        statusMode: "history",
        assignedTo: "a",
      }),
    );
  });
});
