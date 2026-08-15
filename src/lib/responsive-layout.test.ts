import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

const root = process.cwd();
const source = (path: string) => readFileSync(join(root, path), "utf8");

test("shared responsive foundations protect intrinsic content without clipping it", () => {
  const css = source("src/app/globals.css");

  assert.match(css, /\*::before,[\s\S]*box-sizing: border-box/);
  assert.doesNotMatch(css, /box-sizing: inherit/);
  assert.match(css, /overflow-wrap: anywhere/);
  assert.match(css, /\.text-truncate-safe/);
  assert.match(css, /overflow-clip-margin:\s*0\.25em/);
  assert.match(css, /padding-block:\s*0\.2em/);
  assert.match(css, /line-height:\s*1\.45/);
  assert.doesNotMatch(css, /\.text-truncate-safe[\s\S]*margin-block:/);
  assert.match(css, /img,[\s\S]*max-width: 100%/);
  assert.match(css, /\.app-modal-overlay[\s\S]*overflow-y: auto/);
  assert.match(css, /\.app-modal-content[\s\S]*max-height: calc\(100dvh - 1\.5rem\)/);
});

test("core dialogs scroll inside the available phone viewport", () => {
  const dialogSources = [
    "src/components/action-confirm-dialog.tsx",
    "src/components/logistica/logistics-task-edit-panel.tsx",
    "src/components/logistica/task-schedule/schedule-confirm-view.tsx",
    "src/components/logistica/logistics-driver-change-dialog.tsx",
    "src/components/logistica/live-route-change-reason-dialog.tsx",
    "src/components/logistica/logistics-admin-task-exception-dialog.tsx",
    "src/components/sale/sale-invoice-confirm-dialog.tsx",
    "src/components/sale/sale-quick-checkout-modal.tsx",
    "src/components/product-countries-modal.tsx",
  ];

  for (const path of dialogSources) {
    const file = source(path);
    assert.match(file, /app-modal-overlay/);
    assert.match(file, /app-modal-content/);
  }
});

test("time report becomes labelled metrics instead of a squeezed four-column table on mobile", () => {
  const report = source("src/components/time-clock/time-clock-admin-client.tsx");

  assert.match(report, /hidden grid-cols-\[minmax\(0,1fr\)_auto_auto_auto\][\s\S]*sm:grid/);
  assert.match(report, /grid grid-cols-3[\s\S]*sm:grid-cols-\[minmax\(0,1fr\)_auto_auto_auto\]/);
  assert.match(report, /sm:hidden">Regular/);
  assert.match(report, /sm:hidden">Extra/);
  assert.match(report, /sm:hidden">Total/);
});

test("dense navigation and date controls reflow instead of being clipped on 320px screens", () => {
  const logisticsNav = source("src/components/logistica/logistics-section-nav.tsx");
  const anchoredMenu = source("src/components/anchored-menu.tsx");
  const salesMetrics = source("src/components/estadisticas/statistics-toolbar.tsx");
  const kpis = source("src/components/estadisticas/statistics-kpis.tsx");
  const detail = source("src/components/estadisticas/statistics-detail-tables.tsx");
  const datePicker = source("src/components/date-picker-calendar.tsx");

  assert.match(logisticsNav, /<AnchoredMenu ariaLabel="Abrir secciones de logística"/);
  assert.match(logisticsNav, /<AnchoredMenu ariaLabel="Abrir configuración de logística"/);
  assert.match(anchoredMenu, /createPortal/);
  assert.match(anchoredMenu, /className=\{`fixed z-\[280\]/);
  assert.match(logisticsNav, /hidden h-9 shrink-0 items-center gap-0\.5[\s\S]*lg:inline-flex/);
  assert.match(salesMetrics, /w-full max-w-md/);
  assert.match(salesMetrics, /aria-modal="true"/);
  assert.match(kpis, /grid grid-cols-2[\s\S]*sm:grid-cols-4/);
  assert.match(detail, /grid gap-2 xl:hidden/);
  assert.match(datePicker, /w-\[17\.5rem\]/);
});
