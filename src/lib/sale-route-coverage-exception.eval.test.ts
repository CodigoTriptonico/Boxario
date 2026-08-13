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
  assert.match(map, /focusLocation/);
  assert.match(map, /text: "Cliente"/);
});
