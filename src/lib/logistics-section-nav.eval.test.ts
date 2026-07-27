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
  it("keeps conductores, vehiculos and rutas in a fixed order", () => {
    const conductoresIndex = source.indexOf('href="/logistica/conductores"');
    const vehiculosIndex = source.indexOf('href="/logistica/vehiculos"');
    const rutasIndex = source.indexOf("<Route", vehiculosIndex);

    assert.ok(conductoresIndex >= 0);
    assert.ok(vehiculosIndex > conductoresIndex);
    assert.ok(rutasIndex > vehiculosIndex);
    assert.equal(source.includes('routesHref = "/logistica?view=rutas"'), true);
    assert.match(source, /!h-9/);
    assert.match(source, /<details className="group relative lg:hidden">/);
    assert.match(source, /hidden min-w-0 flex-wrap items-center gap-1\.5 lg:flex/);
  });
});
