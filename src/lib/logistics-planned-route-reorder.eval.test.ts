import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

const stateMachine = read("src/lib/logistics-state-machine.ts");
const stopActions = read("src/app/actions/logistics-route-stop-actions.ts");
const atomicReorder = read("supabase/migrations/203_reorder_logistics_route_stops_atomic.sql");
const workspaceDetail = read(
  "src/components/logistica/logistics-routes-workspace-details.tsx",
);
const legacyDetail = read(
  "src/components/logistica/panels/logistics-route-detail-panel.tsx",
);

describe("planned route stop reordering", () => {
  it("permits only pre-departure route states", () => {
    assert.match(
      stateMachine,
      /routeAllowsPreDepartureStopReorder[\s\S]*status === "draft" \|\| status === "planned"/,
    );
    assert.match(
      stopActions,
      /!routeAllowsPreDepartureStopReorder\(route\.status\)/,
    );
    assert.match(stopActions, /previousStopIds/);
    assert.match(stopActions, /p_stop_ids: input\.stopIds/);
  });

  it("writes the complete order in one request and audits closed routes", () => {
    assert.match(stopActions, /\.rpc\("reorder_logistics_route_stops_atomic"/);
    assert.doesNotMatch(stopActions, /\.upsert\([\s\S]*onConflict: "id"/);
    assert.match(atomicReorder, /from unnest\(p_stop_ids\) with ordinality/);
    assert.match(atomicReorder, /'logistics\.route_stops_reordered'/);
    assert.match(atomicReorder, /'stop_reordered'/);
    assert.match(atomicReorder, /route_row\.status not in \('draft', 'planned'\)/);
  });

  it("returns actionable messages when the saved route changed", () => {
    assert.match(stopActions, /Las paradas cambiaron mientras ordenabas/);
    assert.match(stopActions, /No pudimos guardar el nuevo orden/);
  });

  it("shows up and down controls on planned routes without enabling removal", () => {
    assert.match(workspaceDetail, /const reorderable = routeAllowsPreDepartureStopReorder/);
    assert.match(workspaceDetail, /aria-label={`Subir parada \$\{index \+ 1\}`}/);
    assert.match(workspaceDetail, /aria-label={`Bajar parada \$\{index \+ 1\}`}/);
    assert.match(workspaceDetail, /reorderable \?[\s\S]*editable \? \([\s\S]*Quitar parada/);
    assert.match(legacyDetail, /routeAllowsPreDepartureStopReorder\(selectedRoute\.status\)/);
    assert.match(legacyDetail, /selectedRoute\.status === "draft" \? <button[\s\S]*Quitar parada/);
  });
});
