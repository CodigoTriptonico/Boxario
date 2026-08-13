import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const controlsSource = readFileSync(
  join(process.cwd(), "src", "components", "ui", "sidebar-page-surface-controls.tsx"),
  "utf8",
);

describe("sidebar footer controls", () => {
  it("keeps one arrow trigger in place while opening and closing", () => {
    assert.match(controlsSource, /ChevronRight/);
    assert.match(controlsSource, /ChevronLeft/);
    assert.match(controlsSource, /aria-expanded=\{expanded\}/);
    assert.doesNotMatch(controlsSource, /SlidersHorizontal/);
    assert.doesNotMatch(controlsSource, /<X className="h-4 w-4 shrink-0"/);
    assert.doesNotMatch(controlsSource, /ChevronsUp|ChevronsDown/);
    assert.match(controlsSource, /Mostrar opciones de vista y apariencia/);
    assert.match(controlsSource, /Ocultar opciones de vista y apariencia/);
  });
});
