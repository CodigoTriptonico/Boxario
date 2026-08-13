import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const source = readFileSync("src/components/config/ventas-rutas-panel.tsx", "utf8");
const scheduleSource = readFileSync("src/app/actions/logistics-route-schedule-actions.ts", "utf8");
const catalogSource = readFileSync("src/app/actions/logistics-route-catalog-actions.ts", "utf8");
const shared = readFileSync("src/app/actions/logistics-routes-shared.ts", "utf8");

describe("calendario de rutas sin cierre global", () => {
  it("ya no muestra reservas, fechas especiales ni cierre global", () => {
    assert.doesNotMatch(source, /Reservas y fechas especiales/);
    assert.doesNotMatch(source, /Cierre global|Sin cierre global/);
    assert.doesNotMatch(source, /dateExceptions|bookingPolicy|RouteBookingControls/);
    assert.match(source, /GeographicRouteCatalog/);
  });

  it("no valida anticipación mínima ni cutoff al programar", () => {
    assert.doesNotMatch(source, /Anticipación adicional|minimumNoticeHours/);
    assert.doesNotMatch(scheduleSource, /route_minimum_notice_hours|minimumNoticeHours|isRouteBookingClosed|route_booking_cutoff/);
    assert.doesNotMatch(catalogSource, /route_minimum_notice_hours|minimumNoticeHours|saveLogisticsRouteBookingPolicy|DateException/);
    assert.doesNotMatch(shared, /isRouteBookingClosed|route_booking_cutoff|logistics_route_date_exceptions/);
  });

  it("mantiene el calendario montado mientras sincroniza un cambio", () => {
    assert.match(source, /if \(loading && !catalog\)/);
    assert.doesNotMatch(source, /key=\{reloadToken\}/);
    assert.match(source, /onCatalogChange=\{reloadCatalog\}/);
  });
});
