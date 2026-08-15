import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

test("Ventas solo autoselecciona una coincidencia real y permite proponer excepciones", () => {
  const scheduler = read("src/components/logistica/task-schedule/logistics-task-schedule-confirm-panel-view.tsx");
  const routeField = read("src/components/logistica/task-schedule/logistics-task-schedule-route-field.tsx");
  const request = read("src/app/actions/customer-route-assignments/request.ts");

  assert.match(scheduler, /matchingRouteIds\.length === 1/);
  assert.match(scheduler, /route\.coverageMatches/);
  assert.match(routeField, /La dirección coincide con esta cobertura; la ruta se sugirió automáticamente/);
  assert.match(routeField, /Puedes elegir cualquier ruta disponible de ese día/);
  assert.match(routeField, /pendiente de verificación por Logística/);
  assert.match(request, /coverage_status: coverageMatches \? "matched" : "outside"/);
  assert.doesNotMatch(routeField, /ZIP|legado/i);
});

test("Logística recibe un aviso persistido para propuestas fuera de cobertura", () => {
  const workspace = read("src/components/logistica/logistics-routes-workspace.tsx");
  const excel = read("src/components/logistica/logistics-confirmations-excel-table.tsx");
  const queries = read("src/app/actions/customer-route-assignments/queries.ts");

  assert.match(queries, /coverage_status/);
  assert.match(workspace, /request\.coverageStatus === "outside"/);
  assert.match(workspace, /no coincide con la cobertura de la ruta sugerida/);
  assert.match(excel, /Fuera de cobertura; verificar antes de confirmar/);
});

test("el catálogo activo no ofrece cobertura por ZIP", () => {
  const catalog = read("src/components/logistica/geographic-route-catalog.tsx");
  const migration = read("supabase/migrations/208_route_zone_coverage_verification.sql");

  assert.doesNotMatch(catalog, /postal_codes|Cobertura heredada|ZIP legado/);
  assert.match(migration, /where coverage_mode = 'postal_codes'/);
  assert.match(migration, /check \(coverage_mode in \('day_only', 'places'\)\)/);
});

test("el selector abre un mapa comparativo con el pin del cliente", () => {
  const routeField = read("src/components/logistica/task-schedule/logistics-task-schedule-route-field.tsx");
  const preview = read("src/components/logistica/task-schedule/logistics-route-coverage-preview-dialog.tsx");
  const map = read("src/components/logistica/geographic-route-coverage-map.tsx");

  assert.match(routeField, /Ver dirección y coberturas/);
  assert.match(preview, /GeographicRouteCoverageMap/);
  assert.match(preview, /Cubre la dirección/);
  assert.match(preview, /Fuera de cobertura/);
  assert.match(preview, /Seleccionada/);
  assert.match(preview, /Ir a dirección del cliente/);
  assert.match(preview, /Todas las rutas/);
  assert.match(preview, /aria-pressed/);
  assert.match(preview, /routeViewSelection/);
  assert.match(preview, /routeFitRequest/);
  assert.match(preview, /selectRouteView/);
  assert.match(preview, /fitCoverageRequest=\{routeFitRequest\}/);
  assert.match(preview, /setRouteFitRequest\(0\)/);
  assert.match(preview, /defaultRouteViewId/);
  assert.match(preview, /ubicación aproximada de la dirección del cliente/);
  assert.match(preview, /source === "address"/);
  assert.match(preview, /Confirmar pin exacto/);
  assert.match(preview, /updateCustomerExactEntranceLocationAction/);
  assert.match(preview, /onFocusLocationChange/);
  assert.match(map, /focusLocation/);
  assert.match(map, /focusLocationRequest/);
  assert.match(map, /fitCoverageRequest/);
  assert.match(map, /coverage-request:/);
  assert.match(map, /ubicación aproximada/);
  assert.match(map, /text: "Cliente"/);
  assert.match(map, /draggable: Boolean\(onFocusLocationChangeRef\.current\)/);
  assert.match(map, /getPosition/);
});

test("la cobertura desde configuración no presenta contexto de cliente", () => {
  const preview = read("src/components/logistica/task-schedule/logistics-route-coverage-preview-dialog.tsx");
  const catalog = read("src/components/logistica/geographic-route-catalog.tsx");

  assert.match(preview, /coverageContext === "route"/);
  assert.match(preview, /Cobertura configurada para esta ruta\./);
  assert.match(preview, /!isRouteConfiguration/);
  assert.match(catalog, /coverageContext="route"/);
});

test("la ubicación del cliente prioriza entrada exacta y conserva el respaldo postal", () => {
  const action = read("src/app/actions/logistics-geographic-route-actions.ts");
  const geocoder = read("src/lib/google-address-geocoding.ts");

  assert.match(action, /exact_entrance_lat, exact_entrance_lng/);
  assert.match(action, /normalizeGeoPoint\(customer\.exact_entrance_lat, customer\.exact_entrance_lng\)/);
  assert.match(action, /normalizeGeoPoint\(customer\.lat, customer\.lng\)/);
  assert.match(action, /geocodeAddressForDisplay/);
  assert.match(action, /source: "exact_entrance"/);
  assert.match(action, /source: "address"/);
  assert.match(geocoder, /sin modificar el cliente/);
  assert.match(geocoder, /GOOGLE_MAPS_API_KEY/);
});

test("el pin exacto se guarda con permisos de logistica y deja trazabilidad", () => {
  const action = read("src/app/actions/logistics-geographic-route-actions.ts");
  const customers = read("src/app/actions/customers.ts");
  const scheduler = read("src/components/logistica/task-schedule/logistics-task-schedule-confirm-panel-view.tsx");

  assert.match(action, /updateCustomerExactEntranceLocationAction/);
  assert.match(action, /routes\.update_status/);
  assert.match(action, /exact_entrance_confirmed_by/);
  assert.match(action, /customer\.exact_entrance\.updated/);
  assert.match(action, /previousSource/);
  assert.match(action, /nextSource/);
  assert.match(customers, /customer\.exact_entrance\.updated/);
  assert.match(customers, /recipient\.exact_entrance\.updated/);
  assert.match(customers, /source: "sales_contact_form"/);
  assert.match(scheduler, /onCustomerLocationSaved=\{setCoverageCustomerLocation\}/);
  assert.match(scheduler, /customerId=\{String\(customerId\)\}/);
});
