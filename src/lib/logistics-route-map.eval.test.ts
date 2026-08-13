import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { resolve } from "node:path";

const detailSource = readFileSync(
  resolve(process.cwd(), "src/components/logistica/logistics-routes-workspace-details.tsx"),
  "utf8",
);
const mapSource = readFileSync(
  resolve(process.cwd(), "src/components/logistica/logistics-stops-map.tsx"),
  "utf8",
);

describe("operational route map", () => {
  it("renders the route map beside the ordered stop list", () => {
    assert.match(detailSource, /<LogisticsStopsMap stops=\{mapStops\} \/>/);
    assert.match(detailSource, /sequence: index \+ 1/);
    assert.match(detailSource, /buildGoogleMapsRouteUrl\(mapStops\)/);
    assert.match(detailSource, /Google Maps/);
  });

  it("requests a driving route in the explicit stop order without automatic optimization", () => {
    assert.match(mapSource, /origin: distinctPositions\[0\]/);
    assert.match(mapSource, /intermediates: distinctPositions\.slice\(1, -1\)/);
    assert.match(mapSource, /travelMode: "DRIVING"/);
    assert.doesNotMatch(mapSource, /optimizeWaypointOrder|optimizeWaypoints/);
  });

  it("keeps numbered markers and a direct-line fallback", () => {
    assert.match(mapSource, /text: String\(stop\.sequence\)/);
    assert.match(mapSource, /path: roadPath \|\| distinctPositions/);
    assert.match(mapSource, /se muestra el orden directo/);
  });

  it("uses a neighborhood zoom instead of zero-area bounds for one location", () => {
    assert.match(mapSource, /distinctPositions\.length === 1/);
    assert.match(mapSource, /map\.setZoom\(SINGLE_LOCATION_ZOOM\)/);
    assert.match(mapSource, /paradas comparten esta misma ubicación/);
  });

  it("keeps the map hidden until Google finishes loading its tiles", () => {
    assert.match(mapSource, /mapRef\.current \?\? new runtime\.Map/);
    assert.match(mapSource, /addListener\("tilesloaded"/);
    assert.match(mapSource, /Cargando mapa…/);
    assert.match(mapSource, /mapReady \? "opacity-100" : "opacity-0"/);
  });
});
