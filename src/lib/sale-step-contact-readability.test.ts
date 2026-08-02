import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readVentaPartsSource } from "@/test-utils/venta-source";

const source = readVentaPartsSource();

describe("sale step contact readability", () => {
  it("keeps long contact details out of the compact mobile step bar", () => {
    assert.match(source, /<span className="hidden sm:contents">\s*<Flag country=\{step\.country\} \/>/);
    assert.match(
      source,
      /hidden min-h-\[1rem\] w-full min-w-0 max-w-full items-center justify-center gap-1\.5.*lg:flex/,
    );
    assert.match(
      source,
      /min-w-0 max-w-full break-words text-center text-\[11px\] font-black leading-snug sm:truncate/,
    );
    assert.match(
      source,
      /hidden min-h-\[1\.25rem\].*overflow-hidden px-1 text-center leading-tight.*lg:flex/,
    );
    assert.match(source, /line-clamp-2 max-w-full break-words/);
  });
});
