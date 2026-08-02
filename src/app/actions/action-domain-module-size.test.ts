import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const actionsRoot = dirname(fileURLToPath(import.meta.url));
const MAX_ACTION_MODULE_LINES = 800;

function actionDomainFiles(
  domain: "inventory" | "customer-route-assignments",
) {
  const domainRoot = join(actionsRoot, domain);
  const implementationFiles = readdirSync(domainRoot)
    .filter((file) => file.endsWith(".ts"))
    .map((file) => join(domainRoot, file));

  return [
    join(actionsRoot, `${domain}.ts`),
    ...implementationFiles,
  ];
}

describe("action domain module boundaries", () => {
  for (const domain of [
    "inventory",
    "customer-route-assignments",
  ] as const) {
    it(`keeps ${domain} modules below the maintainability limit`, () => {
      for (const file of actionDomainFiles(domain)) {
        const lineCount = readFileSync(file, "utf8").split(
          /\r?\n/,
        ).length;

        assert.ok(
          lineCount <= MAX_ACTION_MODULE_LINES,
          `${file} has ${lineCount} lines (max ${MAX_ACTION_MODULE_LINES})`,
        );
      }
    });
  }
});
