import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

const ventaModules = [
  "shared.tsx",
  "use-venta-context-actions.ts",
  "use-venta-controller.ts",
  "use-venta-core.tsx",
  "use-venta-data.ts",
  "use-venta-effects.ts",
  "use-venta-flow.ts",
  "use-venta-forms.ts",
  "use-venta-foundation.ts",
  "use-venta-invoices.ts",
  "use-venta-navigation.ts",
  "use-venta-selection-base.ts",
  "use-venta-selection.ts",
  "parts-documents.tsx",
  "parts-logistics.tsx",
  "parts-person.tsx",
  "parts-step-bar.tsx",
  "parts-types.ts",
  "venta-client-step.tsx",
  "venta-delivery-step.tsx",
  "venta-finish-step.tsx",
  "venta-history-view.tsx",
  "venta-main-shell.tsx",
  "venta-overlays.tsx",
  "venta-recipient-box-steps.tsx",
  "venta-sale-flow.tsx",
  "venta-view.tsx",
] as const;

describe("venta module boundaries", () => {
  it("keeps VentaClient as the stable public entry point", () => {
    const source = read("src/components/venta-client.tsx");

    assert.match(source, /export function VentaClient/);
    assert.match(source, /useVentaController\(initialData\)/);
    assert.match(source, /<VentaView controller=\{controller\} \/>/);
  });

  it("keeps cohesive implementation modules below the agreed size ceiling", () => {
    for (const moduleName of ventaModules) {
      const source = read(`src/components/sale/venta/${moduleName}`);
      const lines = source.split(/\r?\n/).length;
      assert.ok(lines <= 800, `${moduleName} has ${lines} lines`);
    }
  });

  it("keeps the legacy venta-parts import path as a compatibility facade", () => {
    const source = read("src/components/sale/venta-parts.tsx");

    assert.match(source, /parts-documents/);
    assert.match(source, /parts-logistics/);
    assert.match(source, /parts-person/);
    assert.match(source, /parts-step-bar/);
    assert.match(source, /parts-types/);
  });

  it("keeps backend logistics and address contracts independent from React components", () => {
    const sources = [
      read("src/lib/sale-logistics-modes.ts"),
      read("src/lib/sale-logistics-summary.ts"),
      read("src/lib/sale-address-validation.ts"),
      read("src/lib/sale-address-validation-ui.ts"),
      read("src/lib/envios-bulk-readiness.ts"),
      read("src/lib/shipment-timing.ts"),
      read("src/lib/shipment-logistics-edit.ts"),
      read("src/lib/shipment-timing/insights.ts"),
      read("src/lib/shipment-timing/milestones.ts"),
      read("src/app/actions/shipments-logistics.ts"),
    ].join("\n");

    assert.doesNotMatch(sources, /@\/components\/sale\/venta-parts/);
    assert.match(
      read("src/lib/shipment-logistics-edit.ts"),
      /from "@\/lib\/sale-logistics-summary"/,
    );
    assert.match(
      read("src/app/actions/shipments-logistics.ts"),
      /from "@\/lib\/sale-logistics-modes"/,
    );
  });
});
