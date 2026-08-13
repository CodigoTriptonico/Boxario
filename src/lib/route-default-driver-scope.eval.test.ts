import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const catalog = readFileSync("src/components/logistica/logistics-route-catalog.tsx", "utf8");
const actions = readFileSync("src/app/actions/logistics-route-catalog-actions.ts", "utf8");
const shared = readFileSync("src/app/actions/logistics-routes-shared.ts", "utf8");
const schedule = readFileSync("src/app/actions/logistics-route-schedule-actions.ts", "utf8");
const migration = readFileSync("supabase/migrations/190_route_template_default_driver.sql", "utf8");

describe("alcance del conductor predeterminado", () => {
  it("muestra el conductor general abajo y solo cuando el día no tiene subrutas", () => {
    const calendarStart = catalog.indexOf("Calendario de rutas");
    const subroutesStart = catalog.indexOf("Subrutas del {weekdayNames[selectedDay]}");
    const calendar = catalog.slice(calendarStart, subroutesStart);
    const subroutes = catalog.slice(subroutesStart);

    assert.doesNotMatch(calendar, /Conductor por defecto/);
    assert.match(subroutes, /selectedTemplates\.length === 0/);
    assert.match(subroutes, /Conductor de la ruta general/);
    assert.match(subroutes, /value=\{defaultDriverByWeekday\[selectedDay\] \|\| ""\}/);
  });

  it("guarda un conductor independiente en cada subruta", () => {
    assert.match(catalog, /value=\{template\.defaultDriverId \|\| ""\}/);
    assert.match(catalog, /setTemplateDefaultDriver\(template, driverId \|\| null\)/);
    assert.match(actions, /setLogisticsRouteTemplateDefaultDriverAction/);
    assert.match(actions, /default_driver_id: driverId/);
    assert.match(migration, /add column if not exists default_driver_id uuid/);
  });

  it("resuelve el conductor en servidor según la ruta elegida", () => {
    assert.match(shared, /defaultDriverForRouteSelection/);
    assert.match(shared, /isDayAsRouteTemplateId\(input\.routeTemplateId\)/);
    assert.match(shared, /from\("logistics_route_templates"\)[\s\S]*?select\("default_driver_id"\)/);
    assert.match(schedule, /driverId \|\|= template\.defaultDriverId/);
  });
});
