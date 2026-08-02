import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const libRoot = dirname(fileURLToPath(import.meta.url));
const MAX_DOMAIN_MODULE_LINES = 800;

function domainModuleFiles(domain: "shipment-display" | "shipment-timing") {
  const domainRoot = join(libRoot, domain);
  const implementationFiles = readdirSync(domainRoot)
    .filter((file) => file.endsWith(".ts"))
    .map((file) => join(domainRoot, file));

  return [join(libRoot, `${domain}.ts`), ...implementationFiles];
}

describe("shipment domain module boundaries", () => {
  for (const domain of [
    "shipment-display",
    "shipment-timing",
  ] as const) {
    it(`keeps ${domain} modules below the maintainability limit`, () => {
      for (const file of domainModuleFiles(domain)) {
        const lineCount = readFileSync(file, "utf8").split(
          /\r?\n/,
        ).length;

        assert.ok(
          lineCount <= MAX_DOMAIN_MODULE_LINES,
          `${file} has ${lineCount} lines (max ${MAX_DOMAIN_MODULE_LINES})`,
        );
      }
    });
  }
});
