import type { CoveragePlaceKind, RouteCoveragePlaceBounds } from "@/lib/logistics-route-coverage";

export type CensusPlaceLayer = "incorporated" | "cdp";

export type CensusPlaceGeometryHit = {
  geoid: string;
  name: string;
  layer: CensusPlaceLayer;
  geojson: Record<string, unknown>;
  bounds: RouteCoveragePlaceBounds | null;
};

const TIGER_PLACES_BASE =
  "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Places_CouSub_ConCity_SubMCD/MapServer";

const LAYER_IDS: Record<CensusPlaceLayer, number> = {
  incorporated: 4,
  cdp: 5,
};

export function censusLayersForPlaceKind(kind: CoveragePlaceKind): CensusPlaceLayer[] {
  if (kind === "locality") return ["incorporated", "cdp"];
  // Barrios/zonas: no caer a la ciudad incorporada (pintaría toda la ciudad).
  return ["cdp"];
}

export function boundsFromGeoJson(geojson: Record<string, unknown>): RouteCoveragePlaceBounds | null {
  const points: Array<{ lat: number; lng: number }> = [];
  collectGeoJsonPoints(geojson, points);
  if (!points.length) return null;
  let north = -Infinity;
  let south = Infinity;
  let east = -Infinity;
  let west = Infinity;
  for (const point of points) {
    north = Math.max(north, point.lat);
    south = Math.min(south, point.lat);
    east = Math.max(east, point.lng);
    west = Math.min(west, point.lng);
  }
  if (![north, south, east, west].every(Number.isFinite)) return null;
  return { north, south, east, west };
}

function collectGeoJsonPoints(value: unknown, out: Array<{ lat: number; lng: number }>) {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    if (
      value.length >= 2 &&
      typeof value[0] === "number" &&
      typeof value[1] === "number" &&
      Number.isFinite(value[0]) &&
      Number.isFinite(value[1])
    ) {
      out.push({ lng: value[0], lat: value[1] });
      return;
    }
    for (const item of value) collectGeoJsonPoints(item, out);
    return;
  }
  const record = value as Record<string, unknown>;
  if (record.coordinates) collectGeoJsonPoints(record.coordinates, out);
  if (Array.isArray(record.features)) {
    for (const feature of record.features) collectGeoJsonPoints(feature, out);
  }
  if (record.geometry) collectGeoJsonPoints(record.geometry, out);
}

/** Display vintage: simplified outlines (~55 m) for stable Google Maps Data Layer rendering. */
export const CENSUS_PLACE_GEOMETRY_VINTAGE = "tigerweb-simp-v1";

export function buildCensusPlaceQueryUrl(input: {
  layer: CensusPlaceLayer;
  lat: number;
  lng: number;
}) {
  const url = new URL(`${TIGER_PLACES_BASE}/${LAYER_IDS[input.layer]}/query`);
  url.searchParams.set("geometry", `${input.lng},${input.lat}`);
  url.searchParams.set("geometryType", "esriGeometryPoint");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("outFields", "GEOID,NAME,BASENAME,STATE");
  url.searchParams.set("returnGeometry", "true");
  url.searchParams.set("outSR", "4326");
  // WGS84 degrees ≈ 55 m — keeps city outline readable without huge MultiPolygons.
  url.searchParams.set("maxAllowableOffset", "0.0005");
  url.searchParams.set("geometryPrecision", "5");
  url.searchParams.set("f", "geojson");
  return url;
}

export type CensusPlacesBounds = {
  north: number;
  south: number;
  east: number;
  west: number;
};

export type CensusCatalogPlace = {
  geoid: string;
  name: string;
  displayName: string;
  layer: CensusPlaceLayer;
  geojson: Record<string, unknown>;
  bounds: RouteCoveragePlaceBounds | null;
  center: { lat: number; lng: number } | null;
};

/** Strip Census suffixes so Google Places matches "Santa Clarita" not "Santa Clarita city". */
export function censusPlaceDisplayName(name: string) {
  const trimmed = String(name || "").trim();
  return trimmed.replace(/\s+(city|CDP|town|village|borough|municipality)$/i, "").trim() || trimmed;
}

export function buildCensusPlacesBoundsQueryUrl(input: {
  layer: CensusPlaceLayer;
  bounds: CensusPlacesBounds;
  maxAllowableOffset?: number;
  resultRecordCount?: number;
  resultOffset?: number;
}) {
  const { north, south, east, west } = input.bounds;
  const url = new URL(`${TIGER_PLACES_BASE}/${LAYER_IDS[input.layer]}/query`);
  url.searchParams.set("geometry", `${west},${south},${east},${north}`);
  url.searchParams.set("geometryType", "esriGeometryEnvelope");
  url.searchParams.set("inSR", "4326");
  url.searchParams.set("spatialRel", "esriSpatialRelIntersects");
  url.searchParams.set("outFields", "GEOID,NAME,BASENAME,STATE");
  url.searchParams.set("returnGeometry", "true");
  url.searchParams.set("outSR", "4326");
  url.searchParams.set(
    "maxAllowableOffset",
    String(input.maxAllowableOffset == null ? 0.0008 : input.maxAllowableOffset),
  );
  url.searchParams.set("geometryPrecision", "5");
  url.searchParams.set(
    "resultRecordCount",
    String(Math.max(1, Math.min(200, input.resultRecordCount ?? 120))),
  );
  if (input.resultOffset != null && input.resultOffset > 0) {
    url.searchParams.set("resultOffset", String(Math.floor(input.resultOffset)));
  }
  url.searchParams.set("f", "geojson");
  return url;
}

function centerFromBounds(bounds: RouteCoveragePlaceBounds | null): { lat: number; lng: number } | null {
  if (!bounds) return null;
  return {
    lat: (bounds.north + bounds.south) / 2,
    lng: (bounds.east + bounds.west) / 2,
  };
}

export function parseCensusPlacesFeatureCollection(
  geojson: Record<string, unknown>,
  layer: CensusPlaceLayer,
): CensusCatalogPlace[] {
  const features = Array.isArray(geojson.features) ? geojson.features : [];
  const places: CensusCatalogPlace[] = [];
  const seen = new Set<string>();

  for (const raw of features) {
    if (!raw || typeof raw !== "object") continue;
    const feature = raw as {
      properties?: Record<string, unknown>;
      geometry?: unknown;
    };
    if (!feature.geometry) continue;
    const properties = feature.properties || {};
    const geoid = String(properties.GEOID || "").trim();
    const name = String(properties.NAME || properties.BASENAME || "").trim();
    if (!geoid || seen.has(geoid)) continue;
    seen.add(geoid);
    const collection = {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            GEOID: geoid,
            NAME: name,
            censusLayer: layer,
          },
          geometry: feature.geometry,
        },
      ],
    };
    const bounds = boundsFromGeoJson(collection);
    places.push({
      geoid,
      name: name || geoid,
      displayName: censusPlaceDisplayName(name || geoid),
      layer,
      geojson: collection,
      bounds,
      center: centerFromBounds(bounds),
    });
  }

  return places;
}

export async function fetchCensusPlacesInBounds(input: {
  bounds: CensusPlacesBounds;
  layers?: CensusPlaceLayer[];
  maxAllowableOffset?: number;
  resultRecordCount?: number;
  fetchImpl?: typeof fetch;
}): Promise<CensusCatalogPlace[]> {
  const { north, south, east, west } = input.bounds;
  if (![north, south, east, west].every(Number.isFinite)) return [];
  if (north <= south || east <= west) return [];

  const fetchImpl = input.fetchImpl || fetch;
  const layers = input.layers?.length ? input.layers : (["incorporated", "cdp"] as CensusPlaceLayer[]);
  const byGeoid = new Map<string, CensusCatalogPlace>();

  for (const layer of layers) {
    const url = buildCensusPlacesBoundsQueryUrl({
      layer,
      bounds: input.bounds,
      maxAllowableOffset: input.maxAllowableOffset,
      resultRecordCount: input.resultRecordCount,
    });
    const response = await fetchImpl(url, { next: { revalidate: 60 * 60 * 24 * 7 } } as RequestInit);
    if (!response.ok) continue;
    const geojson = (await response.json()) as Record<string, unknown>;
    for (const place of parseCensusPlacesFeatureCollection(geojson, layer)) {
      // Incorporated cities win over CDP when GEOIDs somehow collide; otherwise keep first.
      if (!byGeoid.has(place.geoid) || layer === "incorporated") {
        byGeoid.set(place.geoid, place);
      }
    }
  }

  return Array.from(byGeoid.values());
}

function firstFeature(geojson: Record<string, unknown>) {
  const features = geojson.features;
  if (!Array.isArray(features) || features.length === 0) return null;
  const feature = features[0];
  if (!feature || typeof feature !== "object") return null;
  return feature as {
    properties?: Record<string, unknown>;
    geometry?: unknown;
  };
}

export function parseCensusPlaceGeoJson(
  geojson: Record<string, unknown>,
  layer: CensusPlaceLayer,
): CensusPlaceGeometryHit | null {
  const feature = firstFeature(geojson);
  if (!feature?.geometry) return null;
  const properties = feature.properties || {};
  const geoid = String(properties.GEOID || "").trim();
  const name = String(properties.NAME || properties.BASENAME || "").trim();
  if (!geoid) return null;
  const collection = {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          GEOID: geoid,
          NAME: name,
          censusLayer: layer,
        },
        geometry: feature.geometry,
      },
    ],
  };
  return {
    geoid,
    name: name || geoid,
    layer,
    geojson: collection,
    bounds: boundsFromGeoJson(collection),
  };
}

export async function fetchCensusPlaceGeometryAtPoint(input: {
  lat: number;
  lng: number;
  kind: CoveragePlaceKind;
  fetchImpl?: typeof fetch;
}): Promise<CensusPlaceGeometryHit | null> {
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) return null;
  const fetchImpl = input.fetchImpl || fetch;
  for (const layer of censusLayersForPlaceKind(input.kind)) {
    const url = buildCensusPlaceQueryUrl({ layer, lat: input.lat, lng: input.lng });
    const response = await fetchImpl(url, { next: { revalidate: 60 * 60 * 24 * 30 } } as RequestInit);
    if (!response.ok) continue;
    const geojson = (await response.json()) as Record<string, unknown>;
    const hit = parseCensusPlaceGeoJson(geojson, layer);
    if (hit) return hit;
  }
  return null;
}
