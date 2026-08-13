import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCustomUiSurfacePalette,
  createCustomPalette,
  isCustomPaletteId,
} from "./ui-surface-custom-palettes.ts";
import { contrastRatio } from "./ui-surface-color-math.ts";

describe("ui surface custom palettes", () => {
  it("creates custom palette ids with prefix", () => {
    const custom = createCustomPalette({ label: "Rojo mío", baseHex: "#a83252" });
    assert.ok(custom);
    assert.equal(isCustomPaletteId(custom!.id), true);
    assert.equal(custom!.hoverHex.length, 7);
  });

  it("builds runtime palettes that use css var row classes", () => {
    const custom = createCustomPalette({ label: "Test", baseHex: "#123456" })!;
    const palette = buildCustomUiSurfacePalette(custom);
    assert.equal(palette.listRow.hex, "#123456");
    assert.equal(palette.listRow.rowClass, "bg-surface-list-row");
    assert.ok(palette.personCardId);
  });

  it("keeps custom bright and dark colors readable without changing their backgrounds", () => {
    for (const [baseHex, hoverHex] of [
      ["#a67a0a", "#c49210"],
      ["#f4d35e", "#b85c2a"],
      ["#121212", "#181818"],
    ]) {
      const custom = createCustomPalette({ label: "Test", baseHex, hoverHex })!;
      const palette = buildCustomUiSurfacePalette(custom);

      assert.equal(palette.listRow.hex, baseHex);
      assert.equal(palette.listRow.hoverHex, hoverHex);
      assert.ok(contrastRatio(palette.listRow.foregroundHex, baseHex) >= 4.5);
      assert.ok(contrastRatio(palette.listRow.mutedForegroundHex, baseHex) >= 4.5);
      assert.ok(contrastRatio(palette.listRow.hoverForegroundHex, hoverHex) >= 4.5);
      assert.ok(contrastRatio(palette.listRow.hoverMutedForegroundHex, hoverHex) >= 4.5);
      assert.ok(contrastRatio(palette.listRow.borderHex, baseHex) >= 3);
      assert.ok(contrastRatio(palette.listRow.hoverBorderHex, hoverHex) >= 3);
    }
  });
});
