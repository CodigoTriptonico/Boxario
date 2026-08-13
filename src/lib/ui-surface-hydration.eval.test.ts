import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const source = readFileSync(
  join(process.cwd(), "src/components/ui/ui-surface-preferences-provider.tsx"),
  "utf8",
);

describe("ui surface preferences hydration", () => {
  it("starts from deterministic server defaults before reading browser storage", () => {
    assert.match(
      source,
      /useState<UiSurfacePreferences>\(\s*defaultUiSurfacePreferences,?\s*\)/,
    );
    assert.match(source, /useEffect\(\(\) => \{[\s\S]*readUiSurfacePreferences\(\)/);
    assert.doesNotMatch(
      source,
      /useState<UiSurfacePreferences>\(\(\) =>\s*readUiSurfacePreferences\(\)/,
    );
  });
});
