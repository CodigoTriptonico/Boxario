import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();
const pageSource = readFileSync(join(root, "src/app/conductor/tareas/page.tsx"), "utf8");
const legacyPageSource = readFileSync(
  join(root, "src/app/conductor/inventario-camion/page.tsx"),
  "utf8",
);
const workspaceSource = readFileSync(
  join(root, "src/components/conductor/conductor-tareas-client.tsx"),
  "utf8",
);
const truckSource = readFileSync(
  join(root, "src/components/conductor/conductor-truck-inventory-client.tsx"),
  "utf8",
);
const navSource = readFileSync(join(root, "src/components/app-shell-nav.tsx"), "utf8");
const paymentSource = readFileSync(join(root, "src/lib/conductor-driver-payment.ts"), "utf8");

describe("conductor route workspace", () => {
  it("loads tasks, truck inventory and arrival context for one selected route", () => {
    assert.match(pageSource, /getConductorTruckInventoryAction\(view\.effectiveDriverId, requestedRouteId\)/);
    assert.match(pageSource, /initialTruckView=/);
    assert.match(workspaceSource, /selectedRouteId/);
    assert.match(workspaceSource, /route\.stopCount/);
    assert.match(workspaceSource, /routeDeliveries/);
    assert.match(workspaceSource, /routePickups/);
  });

  it("keeps load, stops and truck return as internal views", () => {
    assert.match(workspaceSource, /Preparar carga/);
    assert.match(workspaceSource, /Paradas/);
    assert.match(workspaceSource, /Camión \/ regreso/);
    assert.match(workspaceSource, /ConductorTruckInventoryClient/);
    assert.match(workspaceSource, /mode=\{workspaceView === "carga" \? "load" : "truck"\}/);
  });

  it("keeps only one primary navigation destination and redirects the legacy inventory URL", () => {
    assert.match(navSource, /label: "Ruta conductor", href: "\/conductor\/tareas"/);
    assert.doesNotMatch(navSource, /href: "\/conductor\/inventario-camion"/);
    assert.match(legacyPageSource, /redirect\(`\/conductor\/tareas\?\$\{params\.toString\(\)\}`\)/);
  });

  it("lets pickup-only routes start without inventing required empty boxes", () => {
    assert.doesNotMatch(truckSource, /disabled=\{!ready \|\| !hasRequiredBoxes/);
    assert.match(truckSource, /No hay cajas vacias por cargar/);
  });

  it("offers an outstanding deposit at completed pickups and requires a no-payment reason", () => {
    assert.doesNotMatch(paymentSource, /taskType !== "deliver_empty_box"/);
    assert.match(paymentSource, /input\.choice === "none"/);
    assert.match(paymentSource, /input\.note/);
    assert.match(workspaceSource, /Indica por que no recibiste dinero/);
  });
});
