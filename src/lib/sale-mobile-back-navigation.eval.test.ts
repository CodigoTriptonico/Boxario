import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const ventaSource = readFileSync(
  new URL("../components/venta-client.tsx", import.meta.url),
  "utf8",
);
const appFrameSource = readFileSync(
  new URL("../components/app-frame.tsx", import.meta.url),
  "utf8",
);

describe("sale mobile back navigation", () => {
  it("reserves the header arrow for an earlier sale step", () => {
    assert.match(
      ventaSource,
      /const activeStepIndex = saleSteps\.findIndex\(\(step\) => step\.id === activeStep\);/,
    );
    assert.match(ventaSource, /const previousStep = saleSteps\[activeStepIndex - 1\];/);
    assert.match(
      ventaSource,
      /if \(previousStep\) \{\s*setActiveStep\(previousStep\.id\);\s*scrollToStep\(previousStep\.id\);/,
    );
    assert.match(
      ventaSource,
      /enabled: ventaNavTitle !== null \|\| activeStep !== "client"/,
    );
  });

  it("does not add the generic page-level back arrow to the sale route", () => {
    assert.match(
      appFrameSource,
      /pathname === "\/" \|\| pathname === "\/venta" \|\| pathname\.startsWith\("\/login"\)/,
    );
  });
});
