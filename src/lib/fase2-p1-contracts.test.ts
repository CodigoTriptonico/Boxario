import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const read = (path: string) => readFileSync(join(process.cwd(), "src", path), "utf8");

test("P1 usa loaders específicos por módulo", () => {
  const frame = read("components/app-frame.tsx");
  assert.match(frame, /loadingVariantForPath/);
  for (const path of ["app/seguimiento/loading.tsx", "app/inventario/loading.tsx", "app/conductor/tareas/loading.tsx"]) {
    assert.match(read(path), /PageContentPlaceholder/);
  }
});

test("P1 muestra errores de lectura en las superficies operativas", () => {
  assert.match(read("components/envios-client.tsx"), /shipmentsError/);
  assert.match(read("components/inventario-client.tsx"), /inventoryLoadError/);
  assert.match(read("components/conductor/conductor-tareas-client.tsx"), /initialReadError/);
  assert.match(read("components/logistica/logistica-client-implementation.tsx"), /initialReadError \|\| loadError/);
});

test("P1 logística no hidrata el universo de tareas en el workspace de rutas", () => {
  const shipments = read("app/actions/shipments-read.ts");
  const routes = read("app/actions/logistics-routes-read.ts");
  const data = read("components/logistica/lib/use-logistics-data.ts");
  const page = read("app/logistica/page.tsx");
  const client = read("components/logistica/logistica-client-implementation.tsx");
  assert.match(shipments, /listAllShipmentsForRouteBoardAction/);
  assert.match(routes, /listLogisticsRoutesAction/);
  assert.doesNotMatch(page, /listAllShipmentsForRouteBoardAction/);
  assert.match(client, /includeTaskBoardData: !isRoutesView/);
  assert.match(data, /if \(!includeTaskBoardData\)/);
  assert.match(data, /setRefreshing\(true\)/);
  assert.match(data, /finally \{\s*setRefreshing\(false\)/);
  assert.doesNotMatch(data, /setShipments\(\[\]\)/);
});

test("P1 protege la shell móvil de reglas desktop", () => {
  const shell = read("components/app-shell.tsx");
  const css = read("app/globals.css");
  assert.match(shell, /app-shell-root/);
  assert.match(shell, /app-shell-mobile-content/);
  assert.match(css, /\.app-shell-mobile-content/);
  assert.match(css, /env\(safe-area-inset-bottom\)/);
});
