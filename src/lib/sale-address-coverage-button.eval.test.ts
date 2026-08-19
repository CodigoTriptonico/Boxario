import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

test("la dirección de recolección separa verificación del cliente y consulta operativa", () => {
  const form = read("src/components/sale/sale-client-form.tsx");
  const button = read("src/components/sale/sale-address-coverage-button.tsx");
  const dialog = read("src/components/logistica/task-schedule/logistics-route-coverage-preview-dialog.tsx");
  const exactEntrance = read("src/components/sale/sale-exact-entrance-step.tsx");
  const action = read("src/app/actions/logistics-geographic-route-actions.ts");

  assert.match(form, /Cliente verifica mapa/);
  assert.match(form, /SaleAddressCoverageButton/);
  assert.match(button, /resolveAddressGeographicRoutesAction/);
  assert.match(button, /Ver rutas y coberturas/);
  assert.match(button, /addressReference/);
  assert.match(button, /exactEntranceNote/);
  assert.match(form, /showOperationalNotes=\{true\}/);
  assert.match(exactEntrance, /showOperationalNotes = true/);
  assert.match(dialog, /aria-label="Referencias e instrucciones"/);
  assert.match(dialog, /Nota para el conductor/);
  assert.match(dialog, /logisticsWeekdayLabels\[route\.weekday\]/);
  assert.match(action, /definition\.schedules/);
  assert.match(action, /routeCandidateCoverageMatches/);
});
