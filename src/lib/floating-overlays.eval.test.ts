import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();

function tsxFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return tsxFiles(path);
    return entry.isFile() && entry.name.endsWith(".tsx") ? [path] : [];
  });
}

describe("floating overlay foundations", () => {
  it("renders shared anchored menus in the document layer", () => {
    const source = readFileSync(join(root, "src/components/anchored-menu.tsx"), "utf8");

    assert.match(source, /createPortal\(/);
    assert.match(source, /document\.body/);
    assert.match(source, /resolveFloatingPanelPosition/);
    assert.match(source, /window\.addEventListener\("scroll", updatePosition, true\)/);
    assert.match(source, /aria-haspopup="menu"/);
  });

  it("does not place floating panels inside native details elements", () => {
    const offenders: string[] = [];

    for (const path of tsxFiles(join(root, "src"))) {
      const source = readFileSync(path, "utf8");
      for (const block of source.matchAll(/<details\b[\s\S]*?<\/details>/g)) {
        if (/className=(?:"[^"\n]*(?:absolute|fixed)[^"\n]*"|\{`[^`]*(?:absolute|fixed)[^`]*`\})/.test(block[0])) {
          offenders.push(path.slice(root.length + 1));
          break;
        }
      }
    }

    assert.deepEqual(offenders, [], `Paneles flotantes vulnerables a recorte: ${offenders.join(", ")}`);
  });
});
