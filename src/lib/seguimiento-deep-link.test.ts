import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSeguimientoShipmentDeepLink,
  resolveSeguimientoWorkspaceViewForStatus,
} from "@/lib/seguimiento-deep-link";

describe("seguimiento deep link", () => {
  it("opens tracking shipments on the active workspace", () => {
    assert.equal(resolveSeguimientoWorkspaceViewForStatus("Enviado"), "tracking");
    assert.equal(
      buildSeguimientoShipmentDeepLink({
        code: "INV-42",
        shipmentId: "ship-1",
        status: "Enviado",
      }),
      "/seguimiento?q=INV-42&open=ship-1",
    );
  });

  it("routes completed shipments to history view", () => {
    assert.equal(resolveSeguimientoWorkspaceViewForStatus("Delivered"), "history");
    assert.equal(
      buildSeguimientoShipmentDeepLink({
        code: "INV-99",
        shipmentId: "ship-9",
        status: "Delivered",
      }),
      "/seguimiento?q=INV-99&open=ship-9&view=history",
    );
  });

  it("can open audit overlay from seguimiento", () => {
    assert.equal(
      buildSeguimientoShipmentDeepLink({
        code: "INV-1",
        shipmentId: "ship-1",
        audit: true,
      }),
      "/seguimiento?q=INV-1&open=ship-1&audit=ship-1",
    );
  });
});
