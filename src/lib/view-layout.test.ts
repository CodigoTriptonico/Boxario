import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  DEFAULT_VIEW_LAYOUT,
  LEGACY_ENVIOS_VIEW_LAYOUT_STORAGE_KEY,
  VIEW_LAYOUT_STORAGE_KEY,
  parseViewLayout,
  toggleViewLayout,
  viewLayoutAriaLabel,
  viewLayoutToggleLabel,
} from "./view-layout";

describe("view-layout", () => {
  it("defaults to rows and accepts the supported layout values", () => {
    assert.equal(DEFAULT_VIEW_LAYOUT, "rows");
    assert.equal(parseViewLayout("rows"), "rows");
    assert.equal(parseViewLayout("cards"), "cards");
    assert.equal(parseViewLayout("excel"), "excel");
    assert.equal(parseViewLayout("grid"), "rows");
    assert.equal(parseViewLayout(null), "rows");
  });

  it("toggles between rows and cards", () => {
    assert.equal(toggleViewLayout("rows"), "cards");
    assert.equal(toggleViewLayout("cards"), "rows");
  });

  it("cycles through Excel when the surface supports it", () => {
    assert.equal(toggleViewLayout("rows", true), "cards");
    assert.equal(toggleViewLayout("cards", true), "excel");
    assert.equal(toggleViewLayout("excel", true), "rows");
  });

  it("labels the next view mode for the toolbar control", () => {
    assert.equal(viewLayoutToggleLabel("rows"), "Ver como tarjetas");
    assert.equal(viewLayoutToggleLabel("cards"), "Ver como filas");
    assert.equal(viewLayoutAriaLabel("rows"), "Cambiar a vista tarjetas");
    assert.equal(viewLayoutAriaLabel("cards"), "Cambiar a vista filas");
    assert.equal(viewLayoutToggleLabel("cards", true), "Ver como Excel");
    assert.equal(viewLayoutAriaLabel("cards", true), "Cambiar a vista Excel");
  });

  it("uses a shared storage key with legacy envios fallback", () => {
    assert.equal(VIEW_LAYOUT_STORAGE_KEY, "boxario:view-layout");
    assert.equal(LEGACY_ENVIOS_VIEW_LAYOUT_STORAGE_KEY, "boxario:envios:view-layout");
  });
});
