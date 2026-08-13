import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const source = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../components/expediente/shipment-expediente-client.tsx"),
  "utf8",
);

describe("shipment expediente compact layout", () => {
  it("keeps status, money, progress and map actions close to their context", () => {
    assert.match(source, /Abono cubierto/);
    assert.match(source, /compact singleLine/);
    assert.match(source, />Seguimiento</);
    assert.match(source, />Estado de cuenta</);
    assert.match(source, />Contactos y direcciones</);
    assert.match(source, /field\.label === "Dirección" && mapHref/);
    assert.doesNotMatch(source, /> Ver en mapa</);
  });

  it("places the progress tracker inside the Resumen header", () => {
    assert.match(
      source,
      /\{activeSection === "resumen" \? <header[\s\S]*?<ShipmentProgressSteps[\s\S]*?<\/header> : null\}/,
    );
    assert.doesNotMatch(source, /title="Recorrido del envío"/);
  });

  it("shows the shipment summary header only in Resumen", () => {
    assert.match(
      source,
      /\{activeSection === "resumen" \? <header[\s\S]*?<\/header> : null\}/,
    );
  });
});
