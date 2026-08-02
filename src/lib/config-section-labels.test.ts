import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CONFIG_SECTION_LABELS } from "./config-section-labels";

describe("config section labels", () => {
  it("names each section by what it actually configures", () => {
    assert.equal(CONFIG_SECTION_LABELS.organization.title, "Organización");
    assert.match(CONFIG_SECTION_LABELS.organization.text, /bodegas/i);
    assert.match(CONFIG_SECTION_LABELS.organization.text, /importación/i);
    assert.equal(CONFIG_SECTION_LABELS.prices.title, "Costos");
    assert.match(CONFIG_SECTION_LABELS.prices.text, /Precios por país/i);
    assert.equal(CONFIG_SECTION_LABELS.distributors.title, "Distribuidores");
    assert.equal(CONFIG_SECTION_LABELS.appearance.title, "Apariencia");
    assert.equal(CONFIG_SECTION_LABELS.timeclock.title, "Control de horario");
  });

  it("does not expose the retired deliveries section as active configuration", () => {
    assert.equal("deliveries" in CONFIG_SECTION_LABELS, false);
  });
});
