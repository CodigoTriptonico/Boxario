import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const recipientListSource = readFileSync(
  join(root, "components/sale/sale-recipient-list.tsx"),
  "utf8",
);
const historyDrawerSource = readFileSync(
  join(root, "components/sale/sale-customer-history-drawer.tsx"),
  "utf8",
);
const personCardSource = readFileSync(
  join(root, "components/sale/sale-person-card.tsx"),
  "utf8",
);

describe("sale recipient shipment history eval", () => {
  it("opens history from the último envío hint", () => {
    assert.equal(recipientListSource.includes("onViewShipmentHistory"), true);
    assert.equal(recipientListSource.includes('hint={isSuggested ? "Último envío" : undefined}'), true);
    assert.equal(recipientListSource.includes("onHintClick"), true);
  });

  it("keeps a notebook list with detail actions", () => {
    assert.equal(historyDrawerSource.includes("Libreta de envíos"), true);
    assert.equal(historyDrawerSource.includes("Último"), true);
    assert.equal(historyDrawerSource.includes("Volver al listado"), true);
    assert.equal(historyDrawerSource.includes("Abrir en Seguimiento"), true);
    assert.equal(historyDrawerSource.includes("Ver expediente"), true);
    assert.equal(historyDrawerSource.includes("buildExpedienteShipmentDeepLink"), true);
    assert.equal(
      historyDrawerSource.match(/Abrir en Seguimiento/g)?.length,
      1,
      "Seguimiento debe tener un solo acceso por envío",
    );
    assert.equal(historyDrawerSource.includes("buildSeguimientoShipmentDeepLink"), true);
    assert.equal(historyDrawerSource.includes("Auditoría completa"), false);
  });

  it("renders último envío as an interactive hint control", () => {
    assert.equal(personCardSource.includes("SalePersonHintControl"), true);
    assert.equal(personCardSource.includes("Ver historial:"), true);
  });
});
