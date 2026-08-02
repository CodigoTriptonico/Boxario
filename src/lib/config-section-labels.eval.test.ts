import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { CONFIG_SECTION_LABELS } from "./config-section-labels";

const configSource = readFileSync(
  join(process.cwd(), "src", "components", "configuracion-client.tsx"),
  "utf8",
);
const menuSource = readFileSync(
  join(process.cwd(), "src", "lib", "config-menu-groups.ts"),
  "utf8",
);
const configPageSource = readFileSync(
  join(process.cwd(), "src", "app", "configuracion", "page.tsx"),
  "utf8",
);

describe("config section naming contract", () => {
  it("drives landing cards and panel titles from shared labels", () => {
    assert.match(configSource, /CONFIG_SECTION_LABELS/);
    assert.match(configSource, /CONFIG_SECTION_LABELS\.organization\.title/);
    assert.doesNotMatch(configSource, /CONFIG_SECTION_LABELS\.deliveries/);
    assert.equal(CONFIG_SECTION_LABELS.organization.title, "Organización");
    assert.equal(CONFIG_SECTION_LABELS.prices.title, "Costos");
  });

  it("describes administration without vague acceso wording", () => {
    assert.match(menuSource, /Organización, asistencia y apariencia/);
    assert.doesNotMatch(menuSource, /Empresa, acceso, equipo/);
    assert.match(menuSource, /Precios por país y cargos/);
  });

  it("keeps the legacy deliveries URL as a server redirect only", () => {
    assert.match(configPageSource, /view === "deliveries"/);
    assert.match(configPageSource, /redirect\("\/seguimiento\?view=configuracion"\)/);
    assert.doesNotMatch(configSource, /section === "deliveries"/);
  });
});
