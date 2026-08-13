import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readEnviosClientSource } from "@/test-utils/envios-client-source";
import { readShipmentDisplaySource } from "@/test-utils/shipment-domain-source";

const displaySource = readShipmentDisplaySource();
const enviosSource = readEnviosClientSource();
const pickerSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "../components/inline-search-picker.tsx"),
  "utf8",
);

describe("envios status filter buckets eval", () => {
  it("defines Recolecciones/Entregas menus with Pendientes/En logística nested", () => {
    assert.doesNotMatch(displaySource, /value: "pendientes"/);
    assert.doesNotMatch(displaySource, /value: "en_logistica"/);
    assert.match(displaySource, /label: "Recolecciones"/);
    assert.match(displaySource, /label: "Entregas"/);
    assert.match(displaySource, /label: "Pendientes"/);
    assert.match(displaySource, /label: "En logística"/);
    assert.doesNotMatch(displaySource, /label: "Todas"/);
    assert.match(displaySource, /label: "En oficina"/);
    assert.match(displaySource, /label: "En tránsito"/);
    assert.doesNotMatch(displaySource, /label: "Sin orden"/);
    assert.doesNotMatch(displaySource, /label: "Solicitadas"/);
    assert.doesNotMatch(displaySource, /label: "Recolecciones · sin orden"/);
    assert.doesNotMatch(displaySource, /label: "Entregas · solicitadas"/);
    assert.doesNotMatch(displaySource, /label: "Ya en destino final"/);
    assert.doesNotMatch(displaySource, /SHIPMENT_STATUS_FILTER_OPTIONS/);
  });

  it("filters envios by bucket id instead of substring matching", () => {
    assert.match(enviosSource, /matchesEnviosStatusFilter\(row, statusFilter\)/);
    assert.doesNotMatch(enviosSource, /shipmentOperationalStatusLabel\(row\)\.toLowerCase\(\)\.includes/);
  });

  it("matches solicitadas using open logistics tasks", () => {
    assert.match(displaySource, /entregas_solicitadas/);
    assert.match(displaySource, /legDriverTaskOrdered\(row, "deliver_empty_box"\)/);
    assert.match(displaySource, /legDriverTaskOrdered\(row, "pickup_full_box"\)/);
  });

  it("opens nested status options as a Windows-style submenu in the picker", () => {
    assert.match(pickerSource, /children\?: InlineSearchPickerOption\[\]/);
    assert.match(pickerSource, /ChevronRight/);
    assert.match(pickerSource, /data-inline-search-picker-submenu/);
    assert.match(enviosSource, /children: option\.children/);
    assert.match(
      pickerSource,
      /hasChildren[\s\S]*?onSelectOption\(option\);[\s\S]*?return;/,
    );
  });

  it("lets the operator clear an active status filter with X", () => {
    assert.match(pickerSource, /aria-label="Quitar filtro"/);
    assert.match(pickerSource, /value\.trim\(\) && !open/);
  });

  it("persists seguimiento filters across navigation in the same tab", () => {
    assert.match(enviosSource, /resolveEnviosFiltersOnLoad/);
    assert.match(enviosSource, /writeEnviosFiltersToSession/);
    assert.match(enviosSource, /applyEnviosFiltersToSearchParams/);
    assert.match(enviosSource, /filtersHydrated/);
  });

  it("keeps a compact status filter and shows short closed labels", () => {
    const toolbarSource = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../components/envios/envios-filters-toolbar.tsx"),
      "utf8",
    );
    assert.match(toolbarSource, /sm:min-w-\[11rem\] sm:w-\[13rem\]/);
    assert.match(toolbarSource, /enviosStatusFilterDisplayLabel/);
    assert.match(displaySource, /return "Recolección pendiente"/);
    assert.match(displaySource, /return "Recolección en logística"/);
    assert.match(displaySource, /return "Entrega en logística"/);
    assert.doesNotMatch(displaySource, /\$\{option\.label\} · \$\{child\.label/);
  });
});
