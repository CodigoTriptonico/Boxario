import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const pickerSource = readFileSync("src/components/time-picker-input.tsx", "utf8");
const routeCatalogSource = readFileSync(
  "src/components/logistica/logistics-route-catalog.tsx",
  "utf8",
);

describe("disabled time picker", () => {
  it("visually blocks a disabled picker and closes an open panel", () => {
    assert.match(pickerSource, /disabled[\s\S]*?cursor-not-allowed[\s\S]*?opacity-45/);
    assert.match(pickerSource, /if \(!disabled \|\| !open\) return;[\s\S]*?queueMicrotask[\s\S]*?setOpen\(false\)/);
    assert.match(pickerSource, /disabled=\{disabled\}/);
  });

  it("disables every route end picker while the route has no end time", () => {
    assert.match(routeCatalogSource, /disabled=\{dayWithoutEnd \|\| busy === `schedule:\$\{index\}`\}/);
    assert.match(routeCatalogSource, /disabled=\{draftWithoutEnd\}/);
    assert.match(routeCatalogSource, /disabled=\{editingTemplateWithoutEnd\}/);
  });
});
