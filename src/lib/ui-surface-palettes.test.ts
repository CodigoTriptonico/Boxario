import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyListRowCssVariables,
  DEFAULT_LIST_ROW_PALETTE_ID,
  DEFAULT_PERSON_CARD_PALETTE_ID,
  resolveUiSurfacePalette,
  UI_SURFACE_PALETTES,
  uiSurfacePalettesForKind,
} from "./ui-surface-palettes.ts";
import { contrastRatio } from "./ui-surface-color-math.ts";

describe("ui surface palettes", () => {
  it("exposes list palettes and person-card variants in one catalog", () => {
    assert.ok(UI_SURFACE_PALETTES.length >= 15);
    const listOnly = uiSurfacePalettesForKind("listRow");
    const person = uiSurfacePalettesForKind("personCard");
    assert.ok(listOnly.length >= 15);
    assert.ok(person.length >= 10);
    assert.ok(person.every((palette) => palette.personCardId));
  });

  it("falls back to the default list palette for unknown ids", () => {
    const palette = resolveUiSurfacePalette("not-a-real-palette");
    assert.equal(palette.id, DEFAULT_LIST_ROW_PALETTE_ID);
  });

  it("resolves the default person card palette", () => {
    const palette = resolveUiSurfacePalette(DEFAULT_PERSON_CARD_PALETTE_ID);
    assert.equal(palette.personCardId, "emerald-classic");
  });

  it("writes list row css variables on a root element", () => {
    const palette = resolveUiSurfacePalette("sapphire");
    const root = { style: { setProperty: () => {}, removeProperty: () => {} } } as unknown as HTMLElement;
    const values = new Map<string, string>();
    root.style.setProperty = (name, value) => {
      values.set(name, value ?? "");
    };
    applyListRowCssVariables(palette, root);
    assert.equal(values.get("--surface-list-row"), "#1e4a9e");
    assert.equal(values.get("--surface-list-row-hover"), "#2563c4");
    assert.equal(values.get("--surface-list-row-foreground"), palette.listRow.foregroundHex);
    assert.equal(values.get("--surface-list-row-muted-foreground"), palette.listRow.mutedForegroundHex);
    assert.equal(values.get("--surface-list-row-hover-foreground"), palette.listRow.hoverForegroundHex);
    assert.equal(values.get("--surface-list-row-border"), palette.listRow.borderHex);
  });

  it("derives AA-readable text and control borders for every catalog palette", () => {
    for (const palette of UI_SURFACE_PALETTES) {
      const row = palette.listRow;
      assert.ok(contrastRatio(row.foregroundHex, row.hex) >= 4.5, palette.id);
      assert.ok(contrastRatio(row.mutedForegroundHex, row.hex) >= 4.5, palette.id);
      assert.ok(contrastRatio(row.hoverForegroundHex, row.hoverHex) >= 4.5, palette.id);
      assert.ok(contrastRatio(row.hoverMutedForegroundHex, row.hoverHex) >= 4.5, palette.id);
      assert.ok(contrastRatio(row.borderHex, row.hex) >= 3, palette.id);
      assert.ok(contrastRatio(row.hoverBorderHex, row.hoverHex) >= 3, palette.id);
    }
  });
});
