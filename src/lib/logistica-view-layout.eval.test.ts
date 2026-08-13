import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { readLogisticaClientSource } from "@/test-utils/logistica-client-source";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const source = readLogisticaClientSource(root);
const sidebarControls = readFileSync(
  join(root, "src/components/ui/sidebar-page-surface-controls.tsx"),
  "utf8",
);

describe("logistica view layout eval", () => {
  it("reads view layout from per-page preferences and toggles in sidebar", () => {
    assert.equal(source.includes('usePageViewLayout("logistics.tasks")'), true);
    assert.equal(source.includes("ViewLayoutToggle"), false);
    assert.equal(sidebarControls.includes("ViewLayoutToggle"), true);
    assert.equal(sidebarControls.includes("usePageViewLayout"), true);
  });

  it("renders row and card invoice lists with shared page palette", () => {
    assert.equal(source.includes('viewLayout === "rows"'), true);
    assert.equal(source.includes("LogisticsInvoiceRow"), true);
    assert.equal(source.includes("LogisticsInvoiceCard"), true);
    assert.equal(source.includes("listCardShellClass"), true);
    assert.equal(source.includes("listRowBaseClass"), true);
  });

  it("renders Excel columns in route confirmations", () => {
    assert.equal(source.includes("LogisticsConfirmationsExcelTable"), true);
    assert.equal(source.includes('viewLayout === "excel"'), true);
    assert.equal(source.includes("Invoice / cliente"), true);
    assert.equal(source.includes("Ruta sugerida"), true);
  });

  it("supports list, card and table views in every logistics route stage", () => {
    for (const context of [
      "logistics.confirmations",
      "logistics.preparation",
      "logistics.routes",
      "logistics.history",
    ]) {
      assert.equal(source.includes(context), true, context);
    }
    assert.equal(source.includes('viewLayout === "cards"'), true);
    assert.equal(source.includes('viewLayout === "excel"'), true);
    assert.equal(source.includes("Grupos de preparación en vista tabla"), true);
    assert.equal(source.includes("Rutas reales en vista tabla"), true);
    assert.equal(source.includes("Historial de rutas en vista tabla"), true);
  });

  it("applies the same page layout to seller route proposals", () => {
    const approval = readFileSync(
      join(root, "src/components/logistica/customer-route-approval-panel.tsx"),
      "utf8",
    );
    assert.equal(approval.includes('usePageViewLayout("logistics.tasks")'), true);
    assert.equal(approval.includes('viewLayout === "rows"'), true);
    assert.equal(approval.includes("APPROVAL_CARD_GRID_CLASS"), true);
    assert.equal(approval.includes("lg:flex-row lg:items-center"), true);
    assert.equal(approval.includes("line-clamp-2"), true);
    assert.equal(approval.includes("text-base font-black leading-snug sm:text-lg"), true);
    assert.equal(approval.includes("Aprobar ruta"), true);
    assert.equal(approval.includes("Cambiar ruta"), true);
  });
});
