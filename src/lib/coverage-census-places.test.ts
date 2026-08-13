import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  boundsFromGeoJson,
  buildCensusPlaceQueryUrl,
  buildCensusPlacesBoundsQueryUrl,
  censusLayersForPlaceKind,
  censusPlaceDisplayName,
  parseCensusPlaceGeoJson,
  parseCensusPlacesFeatureCollection,
  fetchCensusPlaceGeometryAtPoint,
  fetchCensusPlacesInBounds,
} from "@/lib/coverage-census-places";

describe("coverage-census-places", () => {
  it("elige capas Census según el tipo de lugar", () => {
    assert.deepEqual(censusLayersForPlaceKind("locality"), ["incorporated", "cdp"]);
    assert.deepEqual(censusLayersForPlaceKind("neighborhood"), ["cdp"]);
    assert.deepEqual(censusLayersForPlaceKind("sublocality"), ["cdp"]);
  });

  it("arma la consulta espacial TIGERweb", () => {
    const url = buildCensusPlaceQueryUrl({ layer: "incorporated", lat: 34.39, lng: -118.54 });
    assert.match(url.pathname, /\/MapServer\/4\/query$/);
    assert.equal(url.searchParams.get("geometry"), "-118.54,34.39");
    assert.equal(url.searchParams.get("geometryType"), "esriGeometryPoint");
    assert.equal(url.searchParams.get("f"), "geojson");
    assert.equal(url.searchParams.get("maxAllowableOffset"), "0.0005");
    assert.equal(url.searchParams.get("geometryPrecision"), "5");
  });

  it("arma la consulta por extensión para el mosaico de piezas", () => {
    const url = buildCensusPlacesBoundsQueryUrl({
      layer: "cdp",
      bounds: { north: 34.5, south: 34.3, east: -118.4, west: -118.6 },
      resultRecordCount: 80,
    });
    assert.match(url.pathname, /\/MapServer\/5\/query$/);
    assert.equal(url.searchParams.get("geometry"), "-118.6,34.3,-118.4,34.5");
    assert.equal(url.searchParams.get("geometryType"), "esriGeometryEnvelope");
    assert.equal(url.searchParams.get("resultRecordCount"), "80");
    assert.equal(censusPlaceDisplayName("Santa Clarita city"), "Santa Clarita");
    assert.equal(censusPlaceDisplayName("Valencia CDP"), "Valencia");
  });

  it("parsea GeoJSON Census y calcula bounds", () => {
    const hit = parseCensusPlaceGeoJson(
      {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { GEOID: "0669088", NAME: "Santa Clarita city" },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [-118.6, 34.3],
                  [-118.4, 34.3],
                  [-118.4, 34.5],
                  [-118.6, 34.5],
                  [-118.6, 34.3],
                ],
              ],
            },
          },
        ],
      },
      "incorporated",
    );
    assert.ok(hit);
    assert.equal(hit.geoid, "0669088");
    assert.equal(hit.name, "Santa Clarita city");
    assert.deepEqual(hit.bounds, { north: 34.5, south: 34.3, east: -118.4, west: -118.6 });
    assert.deepEqual(boundsFromGeoJson(hit.geojson), hit.bounds);
  });

  it("parsea varias piezas del mosaico", () => {
    const places = parseCensusPlacesFeatureCollection(
      {
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            properties: { GEOID: "0669088", NAME: "Santa Clarita city" },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [-118.6, 34.3],
                  [-118.4, 34.3],
                  [-118.4, 34.5],
                  [-118.6, 34.5],
                  [-118.6, 34.3],
                ],
              ],
            },
          },
          {
            type: "Feature",
            properties: { GEOID: "0666140", NAME: "San Fernando city" },
            geometry: {
              type: "Polygon",
              coordinates: [
                [
                  [-118.45, 34.28],
                  [-118.43, 34.28],
                  [-118.43, 34.3],
                  [-118.45, 34.3],
                  [-118.45, 34.28],
                ],
              ],
            },
          },
        ],
      },
      "incorporated",
    );
    assert.equal(places.length, 2);
    assert.equal(places[0].displayName, "Santa Clarita");
    assert.equal(places[1].geoid, "0666140");
  });

  it("consulta capas en orden y devuelve el primer hit", async () => {
    const calls: string[] = [];
    const fetchImpl = async (input: RequestInfo | URL) => {
      const href = String(input);
      calls.push(href);
      if (href.includes("/MapServer/4/")) {
        return new Response(
          JSON.stringify({
            type: "FeatureCollection",
            features: [
              {
                type: "Feature",
                properties: { GEOID: "0669088", NAME: "Santa Clarita city" },
                geometry: {
                  type: "Polygon",
                  coordinates: [
                    [
                      [-118.6, 34.3],
                      [-118.4, 34.3],
                      [-118.4, 34.5],
                      [-118.6, 34.5],
                      [-118.6, 34.3],
                    ],
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { "content-type": "application/json" } },
        );
      }
      return new Response(JSON.stringify({ type: "FeatureCollection", features: [] }), { status: 200 });
    };

    const hit = await fetchCensusPlaceGeometryAtPoint({
      lat: 34.39,
      lng: -118.54,
      kind: "locality",
      fetchImpl: fetchImpl as typeof fetch,
    });
    assert.ok(hit);
    assert.equal(hit.geoid, "0669088");
    assert.equal(calls.length, 1);
    assert.match(calls[0], /\/MapServer\/4\/query/);
  });

  it("carga el mosaico por extensión", async () => {
    const fetchImpl = async () =>
      new Response(
        JSON.stringify({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              properties: { GEOID: "0669088", NAME: "Santa Clarita city" },
              geometry: {
                type: "Polygon",
                coordinates: [
                  [
                    [-118.6, 34.3],
                    [-118.4, 34.3],
                    [-118.4, 34.5],
                    [-118.6, 34.5],
                    [-118.6, 34.3],
                  ],
                ],
              },
            },
          ],
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );

    const places = await fetchCensusPlacesInBounds({
      bounds: { north: 34.5, south: 34.3, east: -118.4, west: -118.6 },
      layers: ["incorporated"],
      fetchImpl: fetchImpl as typeof fetch,
    });
    assert.equal(places.length, 1);
    assert.equal(places[0].displayName, "Santa Clarita");
  });
});
