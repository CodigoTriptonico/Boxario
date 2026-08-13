import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

test("GitHub quality-gate workflow is present and runs npm run quality:gate", () => {
  const workflow = readFileSync(join(root, ".github/workflows/quality-gate.yml"), "utf8");
  assert.match(workflow, /name:\s*Quality gate/);
  assert.match(workflow, /pull_request:/);
  assert.match(workflow, /branches:[\s\S]*main/);
  assert.match(workflow, /npm ci/);
  assert.match(workflow, /npm run quality:gate/);
  assert.match(workflow, /node-version:\s*"22"/);
});
