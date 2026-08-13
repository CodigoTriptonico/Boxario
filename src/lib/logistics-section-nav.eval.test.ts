import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../components/logistica/logistics-section-nav.tsx"),
  "utf8",
);

describe("logistics section nav eval", () => {
  it("keeps conductores, vehiculos and the shared Rutas access in one nav", () => {
    const conductoresIndex = source.indexOf('"/logistica/conductores"');
    const vehiculosIndex = source.indexOf('"/logistica/vehiculos"');

    assert.ok(conductoresIndex >= 0);
    assert.ok(vehiculosIndex > conductoresIndex);
    const rutasIndex = source.indexOf('href: "/logistica?view=rutas"');

    assert.ok(rutasIndex >= 0);
    assert.match(source, /label: "Rutas"/);
    assert.match(source, /rounded-lg border border-black bg-surface-inset/);
    assert.match(source, /<AnchoredMenu ariaLabel="Abrir secciones de logística"/);
  });
});
