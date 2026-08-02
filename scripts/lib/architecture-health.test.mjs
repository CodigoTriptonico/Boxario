import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import test from "node:test";
import { analyzeArchitecture } from "./architecture-health.mjs";

function fixture(files, run) {
  const root = mkdtempSync(join(tmpdir(), "boxario-architecture-"));
  try {
    for (const [path, source] of Object.entries(files)) {
      const target = join(root, path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, source);
    }
    run(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

test("reports upper-layer imports, cycles and oversized runtime files", () => {
  fixture(
    {
      "src/app/actions/example.ts": 'import "@/lib/a";\nexport const action = true;\n',
      "src/app/actions/ui-action.ts":
        'import "@/components/widget";\nexport const action = true;\n',
      "src/components/widget.tsx":
        "export const widget = true;\nexport const widget2 = true;\n",
      "src/lib/a.ts": 'import "@/lib/b";\nexport const a = true;\n',
      "src/lib/b.ts":
        'import "@/lib/a";\nimport type { action } from "@/app/actions/example";\nimport "@/components/widget";\nexport const b = true;\n',
      "src/lib/ignored.test.ts": 'import "@/app/actions/example";\n',
    },
    (root) => {
      const result = analyzeArchitecture(root, { maxLines: 2 });
      assert.equal(result.files, 5);
      assert.equal(result.issues.filter((issue) => issue.type === "cycle").length, 1);
      assert.equal(result.issues.filter((issue) => issue.type === "layer").length, 3);
      assert.equal(result.issues.filter((issue) => issue.type === "max-lines").length, 5);
    },
  );
});

test("accepts one-way domain dependencies", () => {
  fixture(
    {
      "src/app/actions/example.ts": 'import "@/lib/domain";\nexport const action = true;\n',
      "src/lib/domain.ts": "export const domain = true;\n",
    },
    (root) => {
      assert.deepEqual(analyzeArchitecture(root).issues, []);
    },
  );
});
