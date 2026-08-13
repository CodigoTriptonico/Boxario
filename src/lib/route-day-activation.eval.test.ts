import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const actions = readFileSync("src/app/actions/logistics-route-catalog-actions.ts", "utf8");
const catalog = readFileSync("src/components/logistica/logistics-route-catalog.tsx", "utf8");
const migration = readFileSync("supabase/migrations/185_route_booking_cutoff_overrides.sql", "utf8");
const openEndedMigration = readFileSync("supabase/migrations/186_open_ended_route_hours.sql", "utf8");
const removalMigration = readFileSync("supabase/migrations/204_remove_route_booking_cutoff.sql", "utf8");

describe("activación de días y horarios de ruta", () => {
  it("activa el día y guarda el horario en un único comando", () => {
    assert.match(actions, /activateLogisticsRouteWeekdayAction/);
    assert.match(actions, /rpc\("activate_logistics_route_weekday"/);
    assert.match(migration, /create or replace function public\.activate_logistics_route_weekday/);
    assert.match(catalog, /activatingDay === day/);
    assert.match(catalog, /Ruta del \$\{weekdayNames\[day\]\} activada/);
  });

  it("exige inicio para días y subrutas", () => {
    assert.match(actions, /La hora de inicio es obligatoria/);
    assert.match(migration, /logistics_route_templates_schedule_required/);
    assert.match(migration, /WEEKDAY_SCHEDULE_REQUIRED/);
  });

  it("ya no ofrece cierre global ni herencia de cutoff", () => {
    assert.doesNotMatch(catalog, /Usar cierre global|globalBookingCutoffTime|bookingCutoffTime|Cierre del día anterior/);
    assert.doesNotMatch(actions, /setLogisticsWeekdayBookingCutoff|bookingCutoffTime|target_booking_cutoff_time/);
    assert.match(removalMigration, /drop column if exists booking_cutoff_time/);
  });

  it("permite terminar la ruta sin una hora de fin estimada", () => {
    assert.match(catalog, /Sin hora de fin · hasta terminar la ruta/);
    assert.match(actions, /routeOperationalWindowInput/);
    assert.match(openEndedMigration, /estimated_end_time is null or start_time < estimated_end_time/);
  });

  it("mantiene los campos de capacidad dentro de su columna clicable", () => {
    assert.match(catalog, /Limitar paradas y cajas/);
    assert.match(catalog, /className="grid items-start gap-2 p-3 sm:grid-cols-2 xl:grid-cols-7"/);
    assert.match(catalog, /\{dayLimitsCapacity \? \([\s\S]*?value=\{dayMaxStops\}/);
    assert.match(catalog, /setDayMaxStops\(""\)[\s\S]*?setDayMaxBoxes\(""\)/);
    assert.match(catalog, /value=\{dayMaxStops\}[\s\S]*?className="h-8 w-full min-w-0 max-w-full/);
    assert.match(catalog, /value=\{dayMaxBoxes\}[\s\S]*?className="h-8 w-full min-w-0 max-w-full/);
  });

  it("coloca las acciones al final del editor del día", () => {
    const limitsPosition = catalog.indexOf("Limitar paradas y cajas");
    const actionsPosition = catalog.indexOf('{activatingDay === index ? "Activar" : "Guardar"}');
    assert.ok(limitsPosition >= 0);
    assert.ok(actionsPosition > limitsPosition);
  });

  it("no duplica la gestión de subrutas dentro de la tarjeta del día", () => {
    assert.doesNotMatch(catalog, />Gestionar</);
    assert.doesNotMatch(catalog, /routeCount/);
    assert.match(catalog, /onClick=\{\(\) => setSelectedDay\(index\)\}/);
  });
});
