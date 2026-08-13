import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseConfigUrl, parseCostosPanel } from "@/components/config/config-url";

describe("config url costos panels", () => {
  it("defaults to paises and accepts deposito and rutas", () => {
    assert.equal(parseCostosPanel(null), "paises");
    assert.equal(parseCostosPanel("paises"), "paises");
    assert.equal(parseCostosPanel("deposito"), "deposito");
    assert.equal(parseCostosPanel("rutas"), "rutas");
  });

  it("maps retired panels to current ones", () => {
    assert.equal(parseCostosPanel("operativos"), "paises");
    assert.equal(parseCostosPanel("horarios"), "rutas");
  });

  it("reads panel from search params", () => {
    assert.equal(parseConfigUrl(new URLSearchParams("view=prices")).costosPanel, "paises");
    assert.equal(
      parseConfigUrl(new URLSearchParams("view=prices&panel=deposito")).costosPanel,
      "deposito",
    );
    assert.equal(
      parseConfigUrl(new URLSearchParams("view=prices&panel=rutas")).costosPanel,
      "rutas",
    );
    assert.equal(
      parseConfigUrl(new URLSearchParams("view=prices&panel=horarios")).costosPanel,
      "rutas",
    );
    assert.equal(
      parseConfigUrl(new URLSearchParams("view=prices&panel=operativos")).costosPanel,
      "paises",
    );
  });
});
