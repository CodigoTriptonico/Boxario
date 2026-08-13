import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path: string) => readFileSync(join(root, path), "utf8");

describe("estadisticas executive dashboard", () => {
  it("composes the report from focused modules instead of the legacy tab panels", () => {
    const client = read("components/estadisticas-client.tsx");
    assert.match(client, /StatisticsToolbar/);
    assert.match(client, /StatisticsKpiStrip/);
    assert.match(client, /StatisticsTrendChart/);
    assert.match(client, /StatisticsDetailTables/);
    assert.doesNotMatch(client, /DistribuidoresPanel|EstadisticasVentasPanel/);
  });

  it("keeps URL filters synchronized without issuing a duplicate router navigation", () => {
    const client = read("components/estadisticas-client.tsx");
    assert.match(client, /statisticsStateToSearchParams/);
    assert.match(client, /window\.history\.replaceState/);
    assert.match(client, /requestSequence/);
    assert.match(client, /sequence !== requestSequence\.current/);
  });

  it("separates company, logistics, and risks while sharing period and filters", () => {
    const client = read("components/estadisticas-client.tsx");
    const toolbar = read("components/estadisticas/statistics-toolbar.tsx");
    const logistics = read("components/estadisticas/statistics-logistics-analytics.tsx");
    assert.match(client, /id: "company", label: "Compañía"/);
    assert.match(client, /id: "logistics", label: "Logística"/);
    assert.match(client, /id: "risks", label: "Riesgos"/);
    assert.match(client, /StatisticsLogisticsAnalytics/);
    assert.match(client, /badge: dashboard\.attention\.length/);
    assert.match(client, /activeTab === "risks"[\s\S]*StatisticsAttentionSection[\s\S]*StatisticsDataQuality/);
    assert.match(client, /navigation={<AppTabs/);
    assert.doesNotMatch(toolbar, /<h1[^>]*>Estadísticas<\/h1>/);
    assert.match(toolbar, /aria-label="Controles de estadísticas"/);
    const tabHandler = client.slice(client.indexOf("const changeTab"), client.indexOf("useEffect", client.indexOf("const changeTab")));
    assert.match(tabHandler, /history\.replaceState/);
    assert.doesNotMatch(tabHandler, /void load\(/);
    assert.match(logistics, /ZIP con más cajas entregadas/);
    assert.match(logistics, /Vehículo con más cajas/);
    assert.match(logistics, /Conductor con más entregas/);
  });

  it("uses semantic desktop tables and compact cards below the wide breakpoint", () => {
    const table = read("components/estadisticas/statistics-detail-tables.tsx");
    assert.match(table, /<table/);
    assert.match(table, /aria-sort/);
    assert.match(table, /hidden overflow-hidden[\s\S]*xl:block/);
    assert.match(table, /grid gap-2 xl:hidden/);
  });
});
