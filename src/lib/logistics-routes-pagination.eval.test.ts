import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const root = join(process.cwd(), "src");

function read(path: string) {
  return readFileSync(join(root, path), "utf8");
}

describe("logistics routes server pagination eval", () => {
  it("wires page size, server filters, and Anterior/Siguiente like envíos", () => {
    const action = read("app/actions/logistics-routes-read.ts");
    const dataHook = read("components/logistica/lib/use-logistics-data.ts");
    const filtersHook = read("components/logistica/lib/use-logistics-filters.ts");
    const client = read("components/logistica/logistica-client-implementation.tsx");
    const page = read("app/logistica/page.tsx");
    const agency = read("components/logistica/agency-logistics-panel.tsx");
    const enviosPage = read("components/envios-page-content.tsx");

    assert.match(action, /LOGISTICS_ROUTES_PAGE_SIZE|clampLogisticsRoutesLimit/);
    assert.match(action, /\.range\(offset, offset \+ limit - 1\)/);
    assert.match(action, /statusMode === "active"/);
    assert.match(action, /statusMode === "history"/);
    assert.match(action, /order\("route_date", \{ ascending: false \}\)/);
    assert.match(action, /order\("id", \{ ascending: false \}\)/);

    assert.match(dataHook, /LOGISTICS_ROUTES_PAGE_SIZE/);
    assert.match(dataHook, /reloadRoutes/);
    assert.match(dataHook, /applyRouteFilters/);
    assert.match(dataHook, /hasMore/);

    assert.match(filtersHook, /buildLogisticsRoutesListFilters/);
    assert.match(filtersHook, /onRouteServerFiltersChange/);
    assert.doesNotMatch(
      filtersHook,
      /matchesLogisticsWeekdayFilter\(\{\s*weekdayFilter,\s*routeDate: route\.routeDate/,
    );

    assert.match(client, /Anterior/);
    assert.match(client, /Siguiente/);
    assert.match(client, /applyRouteFilters/);

    assert.match(page, /defaultLogisticsRoutesListFilters/);
    assert.match(agency, /statusMode: "active"/);
    assert.match(enviosPage, /statusMode: "active"/);
  });
});
