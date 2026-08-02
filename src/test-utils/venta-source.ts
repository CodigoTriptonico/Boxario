import { readFileSync } from "node:fs";
import { join } from "node:path";

const ventaClientImplementationFiles = [
  "src/components/venta-client.tsx",
  "src/components/sale/venta/shared.tsx",
  "src/components/sale/venta/use-venta-context-actions.ts",
  "src/components/sale/venta/use-venta-controller.ts",
  "src/components/sale/venta/use-venta-core.tsx",
  "src/components/sale/venta/use-venta-data.ts",
  "src/components/sale/venta/use-venta-effects.ts",
  "src/components/sale/venta/use-venta-flow.ts",
  "src/components/sale/venta/use-venta-forms.ts",
  "src/components/sale/venta/use-venta-foundation.ts",
  "src/components/sale/venta/use-venta-invoices.ts",
  "src/components/sale/venta/use-venta-navigation.ts",
  "src/components/sale/venta/use-venta-selection-base.ts",
  "src/components/sale/venta/use-venta-selection.ts",
  "src/components/sale/venta/venta-client-step.tsx",
  "src/components/sale/venta/venta-delivery-step.tsx",
  "src/components/sale/venta/venta-finish-step.tsx",
  "src/components/sale/venta/venta-history-view.tsx",
  "src/components/sale/venta/venta-main-shell.tsx",
  "src/components/sale/venta/venta-overlays.tsx",
  "src/components/sale/venta/venta-recipient-box-steps.tsx",
  "src/components/sale/venta/venta-sale-flow.tsx",
  "src/components/sale/venta/venta-view.tsx",
] as const;

const ventaPartsImplementationFiles = [
  "src/components/sale/venta-parts.tsx",
  "src/components/sale/venta/parts-documents.tsx",
  "src/components/sale/venta/parts-logistics.tsx",
  "src/components/sale/venta/parts-person.tsx",
  "src/components/sale/venta/parts-step-bar.tsx",
  "src/components/sale/venta/parts-types.ts",
  // Domain helpers extracted from parts-logistics for layer boundaries.
  "src/lib/sale-logistics-summary.ts",
  "src/lib/sale-logistics-modes.ts",
] as const;

function readSources(root: string, files: readonly string[]) {
  return files.map((file) => readFileSync(join(root, file), "utf8")).join("\n");
}

export function readVentaClientSource(root = process.cwd()) {
  return readSources(root, ventaClientImplementationFiles);
}

export function readVentaPartsSource(root = process.cwd()) {
  return readSources(root, ventaPartsImplementationFiles);
}
