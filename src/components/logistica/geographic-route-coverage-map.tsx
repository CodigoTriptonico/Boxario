"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { BoxSelect, Crosshair, GripHorizontal, GripVertical, Loader2, MapPin } from "lucide-react";
import {
  loadCensusPlaceGeometryAction,
  loadCensusPlacesCatalogAction,
  loadZctaGeometryAction,
  resolveCoveragePlaceFromCensusPolygonAction,
  type ZctaGeometry,
} from "@/app/actions/logistics-routes";
import { secondaryButtonClass } from "@/components/ui-blocks";
import type { CensusCatalogPlace } from "@/lib/coverage-census-places";
import { boundsToGeoJsonPolygon, normalizeCoveragePlaceColor, type RouteCoveragePlace, type RouteCoveragePlaceBounds } from "@/lib/logistics-route-coverage";

type DataFeature = {
  getGeometry: () => GeometryLike | null;
  getProperty?: (name: string) => unknown;
  setProperty?: (name: string, value: unknown) => void;
};

type MapInstance = {
  fitBounds: (bounds: unknown, padding?: number | { top: number; right: number; bottom: number; left: number }) => void;
  setCenter: (center: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
  getZoom: () => number;
  getBounds: () => {
    getNorthEast: () => { lat: () => number; lng: () => number };
    getSouthWest: () => { lat: () => number; lng: () => number };
  } | null;
  panTo: (center: { lat: number; lng: number }) => void;
  addListener: (
    eventName: string,
    handler: (event: {
      feature?: DataFeature;
      latLng?: { lat: () => number; lng: () => number } | null;
    }) => void,
  ) => { remove: () => void };
  setOptions: (options: Record<string, unknown>) => void;
  data: DataLayer;
};

type DataLayer = {
  addGeoJson: (geojson: Record<string, unknown>) => DataFeature[];
  setStyle: (style: Record<string, unknown> | ((feature: DataFeature) => Record<string, unknown>)) => void;
  overrideStyle?: (feature: DataFeature, style: Record<string, unknown>) => void;
  revertStyle?: (feature?: DataFeature) => void;
  forEach: (callback: (feature: DataFeature) => void) => void;
  remove: (feature: DataFeature) => void;
  setMap?: (map: MapInstance | null) => void;
  addListener: (
    eventName: string,
    handler: (event: { feature?: DataFeature; latLng?: { lat: () => number; lng: () => number } | null }) => void,
  ) => { remove: () => void };
};

type MarkerInstance = {
  setMap: (map: MapInstance | null) => void;
  setPosition: (position: { lat: number; lng: number }) => void;
  getPosition?: () => { lat: () => number; lng: () => number } | null;
  setLabel?: (label: string | Record<string, unknown> | null) => void;
  setIcon?: (icon: unknown) => void;
  setOpacity?: (opacity: number) => void;
  setZIndex?: (zIndex: number) => void;
  setTitle?: (title: string) => void;
  addListener?: (eventName: string, handler: () => void) => { remove: () => void };
};

type RectangleInstance = {
  setMap: (map: MapInstance | null) => void;
  setBounds: (bounds: RouteCoveragePlaceBounds) => void;
  setOptions?: (options: Record<string, unknown>) => void;
};

type MapsRuntime = {
  Map: new (node: HTMLElement, options: Record<string, unknown>) => MapInstance;
  Marker: new (options: Record<string, unknown>) => MarkerInstance;
  Data: new (options?: { map?: MapInstance | null }) => DataLayer;
  Rectangle: new (options?: Record<string, unknown>) => RectangleInstance;
  LatLngBounds: new () => {
    extend: (point: { lat: number; lng: number }) => void;
    isEmpty: () => boolean;
  };
  event?: {
    trigger: (instance: MapInstance, eventName: string) => void;
  };
  SymbolPath?: { CIRCLE: unknown };
};

function resizeMapInstance(map: MapInstance, runtime: MapsRuntime | null) {
  if (runtime?.event?.trigger) {
    runtime.event.trigger(map, "resize");
    return;
  }
  const googleMaps = (window as typeof window & {
    google?: { maps?: { event?: { trigger: (instance: MapInstance, eventName: string) => void } } };
  }).google?.maps;
  googleMaps?.event?.trigger(map, "resize");
}

async function waitForMapContainerSize(element: HTMLElement) {
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const rect = element.getBoundingClientRect();
    if (rect.width >= 120 && rect.height >= 120) return;
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }
}

function scheduleMapResize(map: MapInstance, runtime: MapsRuntime | null) {
  resizeMapInstance(map, runtime);
  requestAnimationFrame(() => resizeMapInstance(map, runtime));
  window.setTimeout(() => resizeMapInstance(map, runtime), 120);
  window.setTimeout(() => resizeMapInstance(map, runtime), 400);
}

type GeometryLike = {
  forEachLatLng?: (callback: (latLng: { lat: () => number; lng: () => number }) => void) => void;
  getArray?: () => GeometryLike[];
};

type UserLocation = { lat: number; lng: number };
export type CoverageMapFocusLocation = UserLocation & {
  label: string;
  source?: "exact_entrance" | "address";
};

type CoverageMapGeometry = {
  id: string;
  label: string;
  parentPlaceId: string | null;
  geojson: Record<string, unknown> | null;
  center: { lat: number; lng: number } | null;
  bounds: RouteCoveragePlaceBounds | null;
  color: string;
  visual: "place" | "postal";
  source?: "census" | "viewport" | "postal" | "none" | "preview";
};

function geometryContentKey(items: CoverageMapGeometry[]) {
  return items
    .map((item) => {
      const outline = item.geojson
        ? item.source === "census"
          ? "census"
          : item.source === "preview"
            ? "preview"
          : item.source === "viewport"
            ? "viewport"
            : "geo"
        : "none";
      return `${item.visual}:${item.id}:${item.color}:${item.center?.lat ?? ""}:${item.center?.lng ?? ""}:${outline}`;
    })
    .join("|");
}

/** Extend fit bounds from real outlines only (geojson / place bounds). Centers alone cause extreme zoom. */
function extendCoverageOutlineBounds(
  bounds: { extend: (point: { lat: number; lng: number }) => void },
  geometry: CoverageMapGeometry,
) {
  let added = false;
  if (geometry.geojson) {
    const fromGeoJson: Array<{ lat: number; lng: number }> = [];
    collectGeoJsonCoordinates(geometry.geojson, fromGeoJson);
    for (const point of fromGeoJson) {
      bounds.extend(point);
      added = true;
    }
  }
  if (geometry.bounds) {
    bounds.extend({ lat: geometry.bounds.north, lng: geometry.bounds.west });
    bounds.extend({ lat: geometry.bounds.south, lng: geometry.bounds.east });
    added = true;
  }
  return added;
}

function fitCoverageCamera(
  map: MapInstance,
  bounds: { isEmpty: () => boolean },
) {
  if (bounds.isEmpty()) return;
  map.fitBounds(bounds, COVERAGE_FIT_PADDING);
  const listener = map.addListener("idle", () => {
    listener.remove();
    const zoom = map.getZoom?.();
    if (typeof zoom === "number" && zoom > COVERAGE_FIT_MAX_ZOOM) {
      map.setZoom(COVERAGE_FIT_MAX_ZOOM);
    }
  });
}

/** Camera key: committed place/ZIP ids only. Never includes preview or outline load state
 * (census vs none) — otherwise the map re-fits and jumps when Census returns mid-click. */
function geometryCoverageIdsKey(
  items: CoverageMapGeometry[],
  previewPlaceIds?: ReadonlySet<string> | null,
) {
  return items
    .filter((item) => item.source !== "preview" && !previewPlaceIds?.has(item.id))
    .map((item) => `${item.visual}:${item.id}`)
    .sort()
    .join("|");
}

const FALLBACK_CENTER = { lat: 34.05, lng: -118.25 };
const FALLBACK_ZOOM = 9;
/** Padding around coverage polygons so a city/route isn't glued to the map edges. */
const COVERAGE_FIT_PADDING = { top: 72, right: 72, bottom: 96, left: 72 };
/** Cap after fitBounds — a single city/center must not open at street-level zoom. */
const COVERAGE_FIT_MAX_ZOOM = 11;
const AREA_SELECT_MAX_PLACES = 40;
const MAP_HEIGHT_STORAGE_KEY = "boxario:logistics-coverage-map-height";
const MAP_HEIGHT_MIN = 240;
const MAP_HEIGHT_DEFAULT = 320;
const MAP_HEIGHT_MAX = 900;
const MAP_WIDTH_STORAGE_KEY = "boxario:logistics-coverage-map-width";
const MAP_WIDTH_MIN = 280;
const MAP_WIDTH_DEFAULT = 640;
const MAP_EDGE_HANDLE = 14;

function clampMapHeight(value: number) {
  const maxForViewport =
    typeof window === "undefined"
      ? MAP_HEIGHT_MAX
      : Math.min(MAP_HEIGHT_MAX, Math.max(MAP_HEIGHT_MIN, Math.floor(window.innerHeight * 0.85)));
  return Math.min(maxForViewport, Math.max(MAP_HEIGHT_MIN, Math.round(value)));
}

/** Ceiling for map width: never wider than the panel host (avoids horizontal page scroll). */
function maxMapWidth(availableWidth?: number) {
  const viewportMax =
    typeof window === "undefined"
      ? 2400
      : Math.max(MAP_WIDTH_MIN, Math.floor(window.innerWidth - 24));
  if (availableWidth != null && Number.isFinite(availableWidth) && availableWidth > 0) {
    return Math.min(viewportMax, Math.floor(availableWidth));
  }
  return viewportMax;
}

function clampMapWidth(value: number, availableWidth?: number) {
  return Math.min(maxMapWidth(availableWidth), Math.max(MAP_WIDTH_MIN, Math.round(value)));
}

function mapWidthFromHost(host: HTMLElement | null) {
  if (!host) return MAP_WIDTH_DEFAULT;
  const raw = host.clientWidth - MAP_EDGE_HANDLE - 4;
  return Math.max(MAP_WIDTH_MIN, Math.round(raw));
}

function readStoredMapHeight() {
  if (typeof window === "undefined") return MAP_HEIGHT_DEFAULT;
  try {
    const raw = Number(window.localStorage.getItem(MAP_HEIGHT_STORAGE_KEY));
    if (!Number.isFinite(raw)) return MAP_HEIGHT_DEFAULT;
    return clampMapHeight(raw);
  } catch {
    return MAP_HEIGHT_DEFAULT;
  }
}

function persistMapHeight(value: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MAP_HEIGHT_STORAGE_KEY, String(clampMapHeight(value)));
  } catch {
    // Ignore quota / private mode.
  }
}

function persistMapWidth(value: number) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(MAP_WIDTH_STORAGE_KEY, String(clampMapWidth(value)));
  } catch {
    // Ignore quota / private mode.
  }
}

function boundsIntersect(left: RouteCoveragePlaceBounds, right: RouteCoveragePlaceBounds) {
  return left.west <= right.east && left.east >= right.west && left.south <= right.north && left.north >= right.south;
}

function clientPointToLatLng(
  map: MapInstance,
  container: HTMLElement,
  clientX: number,
  clientY: number,
): { lat: number; lng: number } | null {
  const bounds = map.getBounds?.();
  if (!bounds) return null;
  const rect = container.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return null;
  const x = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
  const y = Math.min(1, Math.max(0, (clientY - rect.top) / rect.height));
  const northEast = bounds.getNorthEast();
  const southWest = bounds.getSouthWest();
  const north = northEast.lat();
  const south = southWest.lat();
  const east = northEast.lng();
  const west = southWest.lng();
  return {
    lat: north - y * (north - south),
    lng: west + x * (east - west),
  };
}

function featureMatchesHighlight(feature: DataFeature, highlightedPlaceId: string | null) {
  if (!highlightedPlaceId) return false;
  const placeId = String(feature.getProperty?.("placeId") || feature.getProperty?.("postalCode") || "");
  const parentPlaceId = String(feature.getProperty?.("parentPlaceId") || "");
  return placeId === highlightedPlaceId || parentPlaceId === highlightedPlaceId;
}

function styleForFeature(
  feature: DataFeature,
  fallbackColor: string,
  highlightedPlaceId: string | null,
  clickable = false,
) {
  const base = normalizeCoveragePlaceColor(feature.getProperty?.("coverageColor"), fallbackColor);
  const highlighted = featureMatchesHighlight(feature, highlightedPlaceId);
  const hasHighlight = Boolean(highlightedPlaceId);
  const visual = String(feature.getProperty?.("visual") || "postal");
  const source = String(feature.getProperty?.("source") || "");
  if (visual === "place") {
    // Confirmed Census and pending preview both use a readable soft fill at rest.
    // Highlight strengthens one piece; other confirmed pieces stay softly filled
    // (never edge-only / ~0 opacity).
    const census = source === "census";
    const preview = source === "preview";
    return {
      fillColor: base,
      fillOpacity: preview
        ? highlighted
          ? 0.4
          : 0.28
        : highlighted
          ? census
            ? 0.45
            : 0.5
          : hasHighlight
            ? census
              ? 0.16
              : 0.14
            : census
              ? 0.26
              : 0.22,
      strokeColor: preview
        ? highlighted
          ? "#f8fafc"
          : "#38bdf8"
        : highlighted
          ? "#f8fafc"
          : base,
      strokeOpacity: highlighted ? 1 : preview ? 1 : census ? 0.95 : 0.8,
      strokeWeight: highlighted ? (census || preview ? 4 : 3.5) : preview ? 3 : census ? 2.5 : 2,
      zIndex: highlighted ? 4 : preview ? 2 : 1,
      clickable,
    };
  }
  return {
    fillColor: base,
    fillOpacity: highlighted ? 0.72 : hasHighlight ? 0.18 : 0.42,
    strokeColor: highlighted ? "#f8fafc" : base,
    strokeOpacity: highlighted ? 1 : 0.95,
    strokeWeight: highlighted ? 3.5 : 2,
    zIndex: highlighted ? 3 : 1,
    clickable,
  };
}

function styleForCatalogFeature(
  feature: DataFeature,
  hoveredGeoid: string | null,
  clickable: boolean,
) {
  const geoid = String(feature.getProperty?.("censusGeoid") || "");
  const hovered = Boolean(hoveredGeoid && geoid === hoveredGeoid);
  return {
    fillColor: hovered ? "#38bdf8" : "#94a3b8",
    fillOpacity: hovered ? 0.32 : 0.07,
    strokeColor: hovered ? "#e0f2fe" : "#64748b",
    strokeOpacity: hovered ? 1 : 0.8,
    strokeWeight: hovered ? 2.75 : 1.35,
    zIndex: hovered ? 2 : 0,
    clickable,
  };
}

function catalogFeatureCollection(places: CensusCatalogPlace[]) {
  return {
    type: "FeatureCollection",
    features: places.map((place) => {
      const inner = Array.isArray(place.geojson.features)
        ? (place.geojson.features[0] as { geometry?: unknown } | undefined)
        : null;
      return {
        type: "Feature",
        properties: {
          censusGeoid: place.geoid,
          censusName: place.displayName,
          censusLayer: place.layer,
          role: "catalog",
        },
        geometry: inner?.geometry || null,
      };
    }).filter((feature) => Boolean(feature.geometry)),
  };
}

function clearDataLayer(layer: DataLayer) {
  const features: DataFeature[] = [];
  layer.forEach((feature) => features.push(feature));
  for (const feature of features) layer.remove(feature);
}

function centerForPlace(place: RouteCoveragePlace): { lat: number; lng: number } | null {
  if (place.lat != null && place.lng != null && Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lng))) {
    return { lat: Number(place.lat), lng: Number(place.lng) };
  }
  if (place.bounds) {
    return {
      lat: (place.bounds.north + place.bounds.south) / 2,
      lng: (place.bounds.east + place.bounds.west) / 2,
    };
  }
  return null;
}

function collectGeoJsonCoordinates(value: unknown, sink: Array<{ lat: number; lng: number }>) {
  if (!value) return;
  if (Array.isArray(value)) {
    if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
      sink.push({ lng: value[0], lat: value[1] });
      return;
    }
    for (const child of value) collectGeoJsonCoordinates(child, sink);
    return;
  }
  if (typeof value !== "object") return;
  const record = value as Record<string, unknown>;
  if (record.coordinates) collectGeoJsonCoordinates(record.coordinates, sink);
  if (record.geometry) collectGeoJsonCoordinates(record.geometry, sink);
  if (Array.isArray(record.features)) {
    for (const feature of record.features) collectGeoJsonCoordinates(feature, sink);
  }
}

function ensureGoogleMapsScript(apiKey: string) {
  const existing = document.querySelector<HTMLScriptElement>('script[data-boxario-google-maps="true"]');
  if (existing) return existing;
  const script = document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
  script.async = true;
  script.dataset.boxarioGoogleMaps = "true";
  document.head.appendChild(script);
  return script;
}

function waitForGoogleMaps(apiKey: string): Promise<MapsRuntime> {
  const loaded = (window as typeof window & { google?: { maps?: MapsRuntime } }).google?.maps;
  if (loaded) return Promise.resolve(loaded);

  return new Promise((resolve, reject) => {
    const script = ensureGoogleMapsScript(apiKey);
    const onLoad = () => {
      const runtime = (window as typeof window & { google?: { maps?: MapsRuntime } }).google?.maps;
      if (runtime) resolve(runtime);
      else reject(new Error("Google Maps no inicializó"));
    };
    const onError = () => reject(new Error("No se pudo cargar Google Maps"));
    if ((window as typeof window & { google?: { maps?: MapsRuntime } }).google?.maps) {
      onLoad();
      return;
    }
    script.addEventListener("load", onLoad, { once: true });
    script.addEventListener("error", onError, { once: true });
  });
}

function readUserLocation(): Promise<UserLocation> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Este navegador no permite geolocalización"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      (error) => {
        reject(new Error(error.message || "No se pudo obtener tu ubicación"));
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 60_000,
      },
    );
  });
}

const EMPTY_POSTAL_CODES: string[] = [];
const EMPTY_COVERAGE_PLACES: RouteCoveragePlace[] = [];
const EMPTY_PREVIEW_PLACES: RouteCoveragePlace[] = [];

export function GeographicRouteCoverageMap({
  postalCodes = EMPTY_POSTAL_CODES,
  places = EMPTY_COVERAGE_PLACES,
  previewPlaces = EMPTY_PREVIEW_PLACES,
  fitPreview = false,
  color,
  label = "ruta",
  canPickPlaces = false,
  highlightedPlaceId = null,
  focusLocation = null,
  focusLocationRequest = 0,
  fitCoverageRequest = 0,
  onFocusLocationChange,
  showLocationControl = true,
  resizable = true,
  fillHeight = false,
  onSelectPlace,
  onSelectPlaces,
  onCoveragePlaceClick,
}: {
  postalCodes?: string[];
  places?: RouteCoveragePlace[];
  previewPlaces?: RouteCoveragePlace[];
  /** When true, pan/zoom once to the preview outline (search). Map clicks leave the camera still. */
  fitPreview?: boolean;
  color: string;
  label?: string;
  canPickPlaces?: boolean;
  highlightedPlaceId?: string | null;
  /** Fixed point to compare against the coverage polygons, such as a customer address. */
  focusLocation?: CoverageMapFocusLocation | null;
  /** Increments when the user explicitly asks to center the map on the fixed point. */
  focusLocationRequest?: number;
  /** Increments when the user changes the route view and asks to frame its coverage. */
  fitCoverageRequest?: number;
  /** Called after the customer pin is dragged to a new position. */
  onFocusLocationChange?: (location: CoverageMapFocusLocation) => void;
  showLocationControl?: boolean;
  resizable?: boolean;
  /** Makes the map fill the height of its coverage surface instead of using the saved map height. */
  fillHeight?: boolean;
  /** Called after a deliberate map click identifies a city or zone. */
  onSelectPlace?: (place: RouteCoveragePlace) => void;
  /** Called after a rectangle selects one or more catalog polygons. Progressive batches may pass `{ progressive: true }`. */
  onSelectPlaces?: (
    places: RouteCoveragePlace[],
    options?: { progressive?: boolean },
  ) => void;
  /** Called when a coverage polygon is clicked, without enabling place editing. */
  onCoveragePlaceClick?: (placeId: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const catalogLayerRef = useRef<DataLayer | null>(null);
  const markerRef = useRef<MarkerInstance | null>(null);
  const focusMarkerRef = useRef<MarkerInstance | null>(null);
  const rectangleRef = useRef<RectangleInstance | null>(null);
  const runtimeRef = useRef<MapsRuntime | null>(null);
  const highlightedPlaceIdRef = useRef(highlightedPlaceId);
  const fittedCoverageKeyRef = useRef("");
  const fittedPreviewIdRef = useRef("");
  const mapClickBusyRef = useRef(false);
  const lastFeatureClickAtRef = useRef(0);
  const areaModeRef = useRef(false);
  const areaDrawRef = useRef<{
    active: boolean;
    startClient: { x: number; y: number } | null;
  }>({ active: false, startClient: null });
  const onSelectPlaceRef = useRef(onSelectPlace);
  const onSelectPlacesRef = useRef(onSelectPlaces);
  const onCoveragePlaceClickRef = useRef(onCoveragePlaceClick);
  const focusLocationRef = useRef(focusLocation);
  const onFocusLocationChangeRef = useRef(onFocusLocationChange);
  const seededGeometryRef = useRef(
    new Map<string, { geojson: Record<string, unknown>; bounds: RouteCoveragePlaceBounds | null }>(),
  );
  const catalogByGeoidRef = useRef(new Map<string, CensusCatalogPlace>());
  const catalogRequestIdRef = useRef(0);
  const [geometries, setGeometries] = useState<CoverageMapGeometry[]>([]);
  const [catalogPlaces, setCatalogPlaces] = useState<CensusCatalogPlace[]>([]);
  const catalogByGeoid = useMemo(
    () => new Map(catalogPlaces.map((place) => [place.geoid, place])),
    [catalogPlaces],
  );
  const [hoveredCatalogGeoid, setHoveredCatalogGeoid] = useState<string | null>(null);
  const [areaMode, setAreaMode] = useState(false);
  const [areaDraftBox, setAreaDraftBox] = useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [areaResolveProgress, setAreaResolveProgress] = useState<{
    done: number;
    total: number;
  } | null>(null);
  const [mapHeight, setMapHeight] = useState(MAP_HEIGHT_DEFAULT);
  const [mapWidth, setMapWidth] = useState(MAP_WIDTH_DEFAULT);
  const [mapWidthFill, setMapWidthFill] = useState(true);
  const [status, setStatus] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationBusy, setLocationBusy] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [mapClickBusy, setMapClickBusy] = useState(false);
  const mapRootRef = useRef<HTMLDivElement | null>(null);
  const mapShellRef = useRef<HTMLDivElement | null>(null);
  const mapFrameRef = useRef<HTMLDivElement | null>(null);
  const mapWidthFillRef = useRef(true);
  const mapResizeDragRef = useRef<{
    pointerId: number;
    axis: "x" | "y" | "xy";
    startX: number;
    startY: number;
    startHeight: number;
    startWidth: number;
  } | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const postalKey = postalCodes.join("|");
  const placesKey = places
    .map(
      (place) =>
        `${place.placeId}:${place.selectionRole}:${place.kind}:${place.lat ?? ""}:${place.lng ?? ""}:${place.color ?? ""}:${place.bounds?.north ?? ""}:${place.bounds?.south ?? ""}:${place.bounds?.east ?? ""}:${place.bounds?.west ?? ""}`,
    )
    .join("|");
  const previewKey = previewPlaces
    .map(
      (place) =>
        `${place.placeId}:${place.kind}:${place.lat ?? ""}:${place.lng ?? ""}:${place.bounds?.north ?? ""}:${place.bounds?.south ?? ""}:${place.bounds?.east ?? ""}:${place.bounds?.west ?? ""}`,
    )
    .join("|");
  const previewPlaceIds = useMemo(
    () => new Set(previewPlaces.map((place) => place.placeId)),
    [previewPlaces],
  );
  const visiblePlaces = useMemo(() => {
    const roots = places.filter(
      (place) => place.selectionRole === "root_whole" || place.selectionRole === "root_partial",
    );
    const children = places.filter((place) => place.selectionRole === "child_included");
    return [...roots, ...children];
  }, [places]);
  const visiblePlacesRef = useRef(visiblePlaces);
  const previewPlacesRef = useRef(previewPlaces);

  const coverageIdsKey = useMemo(
    () => geometryCoverageIdsKey(geometries, previewPlaceIds),
    [geometries, previewPlaceIds],
  );
  const focusLocationKey = focusLocation
    ? `${focusLocation.lat}:${focusLocation.lng}:${focusLocation.label}:${focusLocation.source || ""}`
    : "";
  const hoverLabel = useMemo(() => {
    if (hoveredCatalogGeoid) {
      return catalogByGeoid.get(hoveredCatalogGeoid)?.displayName || null;
    }
    if (!highlightedPlaceId) return null;
    return (
      places.find((place) => place.placeId === highlightedPlaceId)?.displayName ||
      geometries.find((item) => item.id === highlightedPlaceId)?.label ||
      null
    );
  }, [catalogByGeoid, geometries, highlightedPlaceId, hoveredCatalogGeoid, places]);

  useEffect(() => {
    visiblePlacesRef.current = visiblePlaces;
    previewPlacesRef.current = previewPlaces;
    onSelectPlaceRef.current = onSelectPlace;
    onSelectPlacesRef.current = onSelectPlaces;
    onCoveragePlaceClickRef.current = onCoveragePlaceClick;
    focusLocationRef.current = focusLocation;
    onFocusLocationChangeRef.current = onFocusLocationChange;
  }, [focusLocation, onCoveragePlaceClick, onFocusLocationChange, onSelectPlace, onSelectPlaces, previewPlaces, visiblePlaces]);

  useEffect(() => {
    areaModeRef.current = areaMode;
  }, [areaMode]);

  useEffect(() => {
    catalogByGeoidRef.current = new Map(catalogPlaces.map((place) => [place.geoid, place]));
  }, [catalogPlaces]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- restore persisted panel geometry once on mount.
    setMapHeight(readStoredMapHeight());
    const host = mapRootRef.current;
    const available = mapWidthFromHost(host);
    let stored: number | null = null;
    try {
      const raw = window.localStorage.getItem(MAP_WIDTH_STORAGE_KEY);
      if (raw != null) {
        const parsed = Number(raw);
        if (Number.isFinite(parsed)) stored = clampMapWidth(parsed, available);
      }
    } catch {
      stored = null;
    }
    // Keep the map within the panel. Wider stored widths are discarded so nothing needs sideways scroll.
    if (stored == null || stored >= available - 24) {
      mapWidthFillRef.current = true;
      setMapWidthFill(true);
      setMapWidth(available);
      if (stored != null && stored > available + 24) {
        try {
          window.localStorage.removeItem(MAP_WIDTH_STORAGE_KEY);
        } catch {
          // Ignore quota / private mode.
        }
      }
    } else {
      mapWidthFillRef.current = false;
      setMapWidthFill(false);
      setMapWidth(clampMapWidth(stored, available));
    }
  }, []);

  useEffect(() => {
    const host = mapRootRef.current;
    if (!host || typeof ResizeObserver === "undefined") return;

    const syncToHost = () => {
      if (mapResizeDragRef.current) return;
      const available = mapWidthFromHost(host);
      setMapHeight((current) => clampMapHeight(current));
      if (mapWidthFillRef.current) {
        setMapWidthFill(true);
        setMapWidth(available);
        return;
      }
      setMapWidth((current) => clampMapWidth(current, available));
    };

    syncToHost();
    const observer = new ResizeObserver(() => syncToHost());
    observer.observe(host);
    window.addEventListener("resize", syncToHost);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncToHost);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    const runtime = runtimeRef.current;
    if (!mapReady || !map) return;
    scheduleMapResize(map, runtime);
  }, [mapHeight, mapReady, mapWidth, mapWidthFill]);

  const beginMapSizeDrag = useCallback((
    event: ReactPointerEvent<HTMLButtonElement>,
    axis: "x" | "y" | "xy",
  ) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const measuredWidth = Math.round(mapFrameRef.current?.getBoundingClientRect().width || mapWidth);
    mapWidthFillRef.current = false;
    setMapWidthFill(false);
    setMapWidth(measuredWidth);
    mapResizeDragRef.current = {
      pointerId: event.pointerId,
      axis,
      startX: event.clientX,
      startY: event.clientY,
      startHeight: mapHeight,
      startWidth: measuredWidth,
    };
    document.body.style.cursor = axis === "x" ? "ew-resize" : axis === "y" ? "ns-resize" : "nwse-resize";
    document.body.style.userSelect = "none";
  }, [mapHeight, mapWidth]);

  const onMapSizeDragMove = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = mapResizeDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const available = mapWidthFromHost(mapRootRef.current);
    if (drag.axis === "y" || drag.axis === "xy") {
      setMapHeight(clampMapHeight(drag.startHeight + (event.clientY - drag.startY)));
    }
    if (drag.axis === "x" || drag.axis === "xy") {
      setMapWidth(clampMapWidth(drag.startWidth + (event.clientX - drag.startX), available));
    }
  }, []);

  const endMapSizeDrag = useCallback((event: ReactPointerEvent<HTMLButtonElement>) => {
    const drag = mapResizeDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    mapResizeDragRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    const available = mapWidthFromHost(mapRootRef.current);
    setMapHeight((current) => {
      const next = clampMapHeight(current);
      persistMapHeight(next);
      return next;
    });
    setMapWidth((current) => {
      const next = clampMapWidth(current, available);
      const fill = next >= available - 24;
      mapWidthFillRef.current = fill;
      setMapWidthFill(fill);
      if (fill) {
        try {
          window.localStorage.removeItem(MAP_WIDTH_STORAGE_KEY);
        } catch {
          // Ignore quota / private mode.
        }
        return available;
      }
      persistMapWidth(next);
      return next;
    });
  }, []);

  const clearAreaRectangle = useCallback(() => {
    rectangleRef.current?.setMap(null);
    rectangleRef.current = null;
    areaDrawRef.current = { active: false, startClient: null };
    setAreaDraftBox(null);
  }, []);

  const exitAreaMode = useCallback(() => {
    setAreaMode(false);
    clearAreaRectangle();
    const map = mapRef.current;
    if (map) {
      map.setOptions({
        draggable: true,
        gestureHandling: "greedy",
        draggableCursor: canPickPlaces ? "crosshair" : null,
      });
    }
  }, [canPickPlaces, clearAreaRectangle]);

  const selectCatalogPlace = useCallback(async (geoid: string) => {
    if (mapClickBusyRef.current || areaModeRef.current) return;
    const catalogPlace = catalogByGeoidRef.current.get(geoid);
    if (!catalogPlace?.geojson) {
      setStatus("Esa pieza del mapa no tiene geometría disponible.");
      return;
    }

    mapClickBusyRef.current = true;
    setMapClickBusy(true);
    setHoveredCatalogGeoid(geoid);
    setStatus(`Seleccionando ${catalogPlace.displayName}…`);

    try {
      const center = catalogPlace.center || {
        lat: ((catalogPlace.bounds?.north || 0) + (catalogPlace.bounds?.south || 0)) / 2,
        lng: ((catalogPlace.bounds?.east || 0) + (catalogPlace.bounds?.west || 0)) / 2,
      };
      const result = await resolveCoveragePlaceFromCensusPolygonAction({
        geoid: catalogPlace.geoid,
        name: catalogPlace.displayName,
        layer: catalogPlace.layer,
        lat: center.lat,
        lng: center.lng,
        geojson: catalogPlace.geojson,
        bounds: catalogPlace.bounds,
      });
      if (!result.ok) {
        setStatus(result.error || "No se pudo preparar esa zona.");
        return;
      }

      seededGeometryRef.current.set(result.data.placeId, {
        geojson: catalogPlace.geojson,
        bounds: catalogPlace.bounds,
      });
      const wasInPreview = previewPlacesRef.current.some((item) => item.placeId === result.data.placeId);
      const hadPreview = previewPlacesRef.current.length > 0;
      onSelectPlaceRef.current?.(result.data);
      if (wasInPreview) {
        setStatus(`Se quitó ${result.data.displayName} de la vista previa.`);
      } else if (hadPreview) {
        setStatus(`Se añadió ${result.data.displayName} a la vista previa.`);
      } else {
        setStatus(`Vista previa: ${result.data.displayName}. Confirma si quieres agregarla.`);
      }    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo seleccionar la zona.");
    } finally {
      mapClickBusyRef.current = false;
      setMapClickBusy(false);
    }
  }, []);

  const resolveAreaSelection = useCallback(async (drawn: RouteCoveragePlaceBounds) => {
    if (!canPickPlaces || mapClickBusyRef.current) return;
    const spanOk =
      Math.abs(drawn.north - drawn.south) > 0.0008 || Math.abs(drawn.east - drawn.west) > 0.0008;
    if (!spanOk) {
      setStatus("El área es demasiado pequeña. Arrastra un rectángulo más amplio.");
      clearAreaRectangle();
      setAreaDraftBox(null);
      return;
    }

    const matches = catalogPlaces
      .filter((place) => place.bounds && boundsIntersect(place.bounds, drawn))
      .slice(0, AREA_SELECT_MAX_PLACES);
    if (!matches.length) {
      setStatus("Ninguna pieza del mosaico intersecta ese rectángulo. Acerca el mapa o amplía el área.");
      clearAreaRectangle();
      setAreaDraftBox(null);
      return;
    }

    mapClickBusyRef.current = true;
    setMapClickBusy(true);
    setAreaResolveProgress({ done: 0, total: matches.length });
    setStatus(`Preparando 0/${matches.length} zonas…`);

    const catalogLayer = catalogLayerRef.current;
    const matchGeoids = new Set(matches.map((place) => place.geoid));
    if (catalogLayer) {
      catalogLayer.forEach((feature) => {
        const geoid = String(feature.getProperty?.("geoid") || "");
        if (!matchGeoids.has(geoid)) return;
        catalogLayer.overrideStyle?.(feature, {
          fillOpacity: 0.28,
          fillColor: "#38bdf8",
          strokeColor: "#7dd3fc",
          strokeWeight: 2,
          zIndex: 4,
        });
      });
    }

    try {
      const resolved: RouteCoveragePlace[] = [];
      const seen = new Set<string>();
      const batchSize = 4;
      for (let index = 0; index < matches.length; index += batchSize) {
        const chunk = matches.slice(index, index + batchSize);
        const results = await Promise.all(
          chunk.map(async (catalogPlace) => {
            const center = catalogPlace.center || {
              lat: ((catalogPlace.bounds?.north || 0) + (catalogPlace.bounds?.south || 0)) / 2,
              lng: ((catalogPlace.bounds?.east || 0) + (catalogPlace.bounds?.west || 0)) / 2,
            };
            const result = await resolveCoveragePlaceFromCensusPolygonAction({
              geoid: catalogPlace.geoid,
              name: catalogPlace.displayName,
              layer: catalogPlace.layer,
              lat: center.lat,
              lng: center.lng,
              geojson: catalogPlace.geojson,
              bounds: catalogPlace.bounds,
            });
            if (!result.ok) return null;
            seededGeometryRef.current.set(result.data.placeId, {
              geojson: catalogPlace.geojson,
              bounds: catalogPlace.bounds,
            });
            return result.data;
          }),
        );
        for (const place of results) {
          if (!place || seen.has(place.placeId)) continue;
          seen.add(place.placeId);
          resolved.push(place);
        }

        const done = Math.min(index + chunk.length, matches.length);
        setAreaResolveProgress({ done, total: matches.length });
        setStatus(`Preparando ${done}/${matches.length} zonas…`);

        if (resolved.length) {
          if (onSelectPlacesRef.current) {
            onSelectPlacesRef.current(resolved.slice(), { progressive: true });
          } else {
            for (const place of resolved) onSelectPlaceRef.current?.(place);
          }
        }

        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => resolve());
        });
      }

      if (!resolved.length) {
        setStatus("No se pudieron preparar las zonas del área. Intenta de nuevo o elige pieza a pieza.");
        return;
      }

      if (onSelectPlacesRef.current) {
        onSelectPlacesRef.current(resolved, { progressive: false });
      } else {
        for (const place of resolved) onSelectPlaceRef.current?.(place);
      }
      setStatus(
        resolved.length === 1
          ? `Vista previa: ${resolved[0].displayName}. Confirma o cancela.`
          : `Vista previa: ${resolved.length} zonas. Quita las que no correspondan y confirma.`,
      );
      exitAreaMode();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo preparar el área.");
      clearAreaRectangle();
    } finally {
      mapClickBusyRef.current = false;
      setMapClickBusy(false);
      setAreaResolveProgress(null);
      setAreaDraftBox(null);
      catalogLayer?.revertStyle?.();
      catalogLayer?.setStyle((feature) => styleForCatalogFeature(feature, hoveredCatalogGeoid, canPickPlaces));
    }
  }, [canPickPlaces, catalogPlaces, clearAreaRectangle, exitAreaMode, hoveredCatalogGeoid]);

  const identifyCoverageFeature = useCallback((event: {
    feature?: DataFeature;
    latLng?: { lat: () => number; lng: () => number } | null;
  }) => {
    if (!canPickPlaces || mapClickBusyRef.current || areaModeRef.current) return;
    const featurePlaceId = String(
      event.feature?.getProperty?.("placeId") || event.feature?.getProperty?.("postalCode") || "",
    );
    if (!featurePlaceId) return;
    lastFeatureClickAtRef.current = Date.now();
    onCoveragePlaceClickRef.current?.(featurePlaceId);
    if (!canPickPlaces) return;
    const previewPlace = previewPlacesRef.current.find((place) => place.placeId === featurePlaceId);
    if (previewPlace) {
      onSelectPlaceRef.current?.(previewPlace);
      setStatus(`Se quitó ${previewPlace.displayName} de la vista previa.`);
      return;
    }
    const selectedPlace = visiblePlacesRef.current.find((place) => place.placeId === featurePlaceId);
    if (selectedPlace) {
      onSelectPlaceRef.current?.(selectedPlace);
      setStatus(`${selectedPlace.displayName} seleccionada en el mapa.`);
    }
  }, [canPickPlaces]);

  useEffect(() => {
    highlightedPlaceIdRef.current = highlightedPlaceId;

    const map = mapRef.current;
    const runtime = runtimeRef.current;
    const catalogLayer = catalogLayerRef.current;
    if (map) {
      map.data.revertStyle?.();
      map.data.setStyle((feature) => styleForFeature(feature, color, highlightedPlaceId, canPickPlaces || Boolean(onCoveragePlaceClick)));
      resizeMapInstance(map, runtime);
    }
    if (catalogLayer) {
      catalogLayer.revertStyle?.();
      catalogLayer.setStyle((feature) => styleForCatalogFeature(feature, hoveredCatalogGeoid, canPickPlaces));
    }
  }, [canPickPlaces, color, geometries, highlightedPlaceId, hoveredCatalogGeoid, onCoveragePlaceClick, placesKey]);

  useEffect(() => {
    let cancelled = false;
    const currentPlaces = visiblePlacesRef.current;
    const currentPreviews = previewPlacesRef.current;
    const confirmedIds = new Set(currentPlaces.map((place) => place.placeId));
    const previewIds = new Set(
      currentPreviews.filter((place) => !confirmedIds.has(place.placeId)).map((place) => place.placeId),
    );
    const placesToDraw = [...currentPlaces];
    for (const preview of currentPreviews) {
      if (confirmedIds.has(preview.placeId)) continue;
      placesToDraw.push({
        ...preview,
        selectionRole: preview.selectionRole || "root_whole",
        parentPlaceId: preview.parentPlaceId ?? null,
        color: "#38bdf8",
      });
    }

    if (placesToDraw.length) {
      // Preserve already-loaded census/viewport outlines while refetching — avoids flash/wipe.
      setGeometries((prev) => {
        const prevById = new Map(prev.filter((item) => item.visual === "place").map((item) => [item.id, item]));
        const merged: CoverageMapGeometry[] = placesToDraw.map((place) => {
          const existing = prevById.get(place.placeId);
          const seeded = seededGeometryRef.current.get(place.placeId);
          const isPreview = previewIds.has(place.placeId);
          return {
            id: place.placeId,
            label: place.displayName,
            parentPlaceId: place.parentPlaceId,
            geojson: seeded?.geojson ?? existing?.geojson ?? null,
            center: centerForPlace(place),
            bounds: seeded?.bounds ?? existing?.bounds ?? place.bounds ?? null,
            color: isPreview ? "#38bdf8" : normalizeCoveragePlaceColor(place.color, color),
            visual: "place" as const,
            // Preview must always be "preview" from the first frame so it never
            // enters the committed coverage id set used for camera framing.
            source: isPreview
              ? ("preview" as const)
              : existing?.source === "preview"
                ? seeded
                  ? ("census" as const)
                  : "none"
                : existing?.source ?? (seeded ? ("census" as const) : "none"),
          };
        });
        return geometryContentKey(prev) === geometryContentKey(merged) ? prev : merged;
      });

      if (!previewIds.size) {
        setStatus((current) =>
          current.startsWith("Frontera Census") || current.startsWith("Census:") || current.startsWith("Vista previa")
            ? current.startsWith("Vista previa")
              ? canPickPlaces
                ? "Actualizando frontera oficial…"
                : "Cargando frontera oficial…"
              : current
            : canPickPlaces
              ? "Actualizando frontera oficial…"
              : "Cargando frontera oficial…",
        );
      } else {
        setStatus(
          previewIds.size === 1
            ? `Cargando frontera oficial de ${currentPreviews[0]?.displayName || "la zona"}…`
            : `Cargando frontera oficial de ${previewIds.size} zonas…`,
        );
      }

      void (async () => {
        const result = await loadCensusPlaceGeometryAction({
          places: placesToDraw.map((place) => ({
            placeId: place.placeId,
            kind: place.kind,
            lat: place.lat,
            lng: place.lng,
          })),
        });
        if (cancelled) return;

        const latestPlaces = visiblePlacesRef.current;
        const latestPreviews = previewPlacesRef.current;
        const latestConfirmedIds = new Set(latestPlaces.map((place) => place.placeId));
        const latestPreviewIds = new Set(
          latestPreviews.filter((place) => !latestConfirmedIds.has(place.placeId)).map((place) => place.placeId),
        );
        const latestDraw = [...latestPlaces];
        for (const preview of latestPreviews) {
          if (latestConfirmedIds.has(preview.placeId)) continue;
          latestDraw.push({
            ...preview,
            selectionRole: preview.selectionRole || "root_whole",
            parentPlaceId: preview.parentPlaceId ?? null,
            color: "#38bdf8",
          });
        }
        const byPlaceId = new Map(
          result.ok ? result.data.map((item) => [item.placeId, item] as const) : [],
        );
        const next: CoverageMapGeometry[] = latestDraw.map((place) => {
          const isPreview = latestPreviewIds.has(place.placeId);
          const seeded = seededGeometryRef.current.get(place.placeId);
          const census = byPlaceId.get(place.placeId);
          if (census?.found && census.geojson) {
            return {
              id: place.placeId,
              label: place.displayName,
              parentPlaceId: place.parentPlaceId,
              geojson: census.geojson,
              center: centerForPlace(place),
              bounds: census.bounds ?? place.bounds ?? null,
              color: isPreview ? "#38bdf8" : normalizeCoveragePlaceColor(place.color, color),
              visual: "place" as const,
              source: isPreview ? ("preview" as const) : ("census" as const),
            };
          }
          if (seeded?.geojson) {
            return {
              id: place.placeId,
              label: place.displayName,
              parentPlaceId: place.parentPlaceId,
              geojson: seeded.geojson,
              center: centerForPlace(place),
              bounds: seeded.bounds ?? place.bounds ?? null,
              color: isPreview ? "#38bdf8" : normalizeCoveragePlaceColor(place.color, color),
              visual: "place" as const,
              source: isPreview ? ("preview" as const) : ("census" as const),
            };
          }
          // Google place bounds are a viewport, not an administrative boundary.
          // Never paint that rectangle as the selected area while a preview is pending;
          // it can cover most of the map and make a city such as Los Angeles look wrong.
          const hasViewport = Boolean(place.bounds);
          const canUseViewportFallback = !isPreview && hasViewport;
          return {
            id: place.placeId,
            label: place.displayName,
            parentPlaceId: place.parentPlaceId,
            geojson: canUseViewportFallback && place.bounds ? boundsToGeoJsonPolygon(place.bounds) : null,
            center: centerForPlace(place),
            bounds: place.bounds ?? null,
            color: isPreview ? "#38bdf8" : normalizeCoveragePlaceColor(place.color, color),
            visual: "place" as const,
            source: isPreview
              ? ("none" as const)
              : hasViewport
                ? ("viewport" as const)
                : ("none" as const),
          };
        });
        setGeometries((prev) => (geometryContentKey(prev) === geometryContentKey(next) ? prev : next));

        if (latestPreviewIds.size) {
          const previewReady = next.filter(
            (item) => latestPreviewIds.has(item.id) && item.geojson && item.source === "preview",
          );
          if (previewReady.length === latestPreviewIds.size) {
            setStatus(
              previewReady.length === 1
                ? `Vista previa: ${previewReady[0].label}. Confirma si quieres ampliar la cobertura.`
                : `Vista previa: ${previewReady.length} zonas. Quita las que no correspondan y confirma.`,
            );
          } else if (!result.ok) {
            setStatus("No se pudo cargar alguna frontera oficial. Revisa el mapa antes de confirmar.");
          } else {
            setStatus("Algunas zonas no tienen frontera oficial disponible. Revisa el mapa antes de confirmar.");
          }
          return;
        }

        const committed = next.filter((item) => item.source !== "preview");
        const censusCount = committed.filter((item) => item.source === "census").length;
        const viewportCount = committed.filter((item) => item.source === "viewport").length;
        if (!committed.some((item) => item.center || item.geojson)) {
          setStatus(`Lugares sin posición en mapa. La lista sigue definiendo esta ${label}.`);
        } else if (censusCount === committed.length && committed.length) {
          setStatus(
            canPickPlaces
              ? `Frontera Census: ${committed.map((item) => item.label).join(", ")}. Haz clic en otra pieza o selecciona un área.`
              : `Frontera Census: ${committed.map((item) => item.label).join(", ")}.`,
          );
        } else if (censusCount > 0) {
          setStatus(
            `Census: ${committed.filter((item) => item.source === "census").map((item) => item.label).join(", ")}. ` +
              (viewportCount
                ? `Aproximado (viewport): ${committed.filter((item) => item.source === "viewport").map((item) => item.label).join(", ")}.`
                : "Sin frontera oficial para el resto."),
          );
        } else if (!result.ok) {
          setStatus(result.error || "Límite geográfico no disponible. Se usa contorno aproximado si existe.");
        } else {
          setStatus(
            canPickPlaces
              ? `Marcadas: ${committed.map((item) => item.label).join(", ") || "ninguna"}. Sin frontera Census (EE. UU.); elige una pieza del mapa.`
              : `Marcadas: ${committed.map((item) => item.label).join(", ")}. Contorno aproximado (sin frontera Census).`,
          );
        }
      })();

      return () => {
        cancelled = true;
      };
    }

    if (!postalKey) {
      const emptyStatus = canPickPlaces
        ? catalogPlaces.length
          ? "Haz clic en una pieza o usa Seleccionar área para marcar varias."
          : "Acerca el mapa para ver las zonas administrativas y marcar una pieza."
        : `Agrega una ciudad/zona o un ZIP para iluminar el área de esta ${label}.`;
      setGeometries((current) => (current.length ? [] : current));
      setStatus((current) => (current === emptyStatus ? current : emptyStatus));
      return;
    }

    setStatus("Cargando límites postales…");
    void (async () => {
      const result = await loadZctaGeometryAction({ postalCodes });
      if (cancelled) return;
      if (!result.ok) {
        setGeometries((current) => (current.length ? [] : current));
        setStatus(result.error || "Límite geográfico no disponible.");
        return;
      }
      setGeometries(
        result.data.map((item: ZctaGeometry) => ({
          id: item.postalCode,
          label: item.postalCode,
          parentPlaceId: null,
          geojson: item.geojson,
          center: null,
          bounds: null,
          color: normalizeCoveragePlaceColor(color),
          visual: "postal" as const,
          source: "postal" as const,
        })),
      );
      if (!result.data.length) {
        setStatus("No hay ZCTA para ese ZIP (solo códigos postales de EE. UU.). La lista sigue siendo la fuente de verdad.");
      } else if (result.data.length < postalCodes.length) {
        const missing = postalCodes.filter((zip) => !result.data.some((item) => item.postalCode === zip));
        setStatus(`Se iluminaron ${result.data.map((item) => item.postalCode).join(", ")}. Sin geometría: ${missing.join(", ")}.`);
      } else {
        setStatus(`Área iluminada: ${result.data.map((item) => item.postalCode).join(", ")}.`);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [canPickPlaces, catalogPlaces.length, color, label, placesKey, postalCodes, postalKey, previewKey]);

  useEffect(() => {
    let cancelled = false;
    if (!apiKey) return;

    void (async () => {
      try {
        setLocationBusy(true);
        const location = await readUserLocation();
        if (cancelled) return;
        setUserLocation(location);
        setLocationError("");
      } catch (error) {
        if (!cancelled) {
          setLocationError(error instanceof Error ? error.message : "No se pudo obtener tu ubicación");
        }
      } finally {
        if (!cancelled) setLocationBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  useEffect(() => {
    let cancelled = false;
    if (!apiKey || !containerRef.current) return;

    void (async () => {
      try {
        const runtime = await waitForGoogleMaps(apiKey);
        if (cancelled || !containerRef.current) return;
        runtimeRef.current = runtime;
        await waitForMapContainerSize(containerRef.current);
        if (cancelled || !containerRef.current) return;

        if (!mapRef.current) {
          mapRef.current = new runtime.Map(containerRef.current, {
            center: userLocation || FALLBACK_CENTER,
            zoom: userLocation ? 11 : FALLBACK_ZOOM,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: true,
            gestureHandling: "greedy",
            clickableIcons: false,
          });
          if (runtime.Data) {
            catalogLayerRef.current = new runtime.Data({ map: mapRef.current });
            catalogLayerRef.current.setStyle((feature) =>
              styleForCatalogFeature(feature, null, canPickPlaces),
            );
          }
          setMapReady(true);
          scheduleMapResize(mapRef.current, runtime);
        }

        const map = mapRef.current;
        clearDataLayer(map.data);
        map.data.setStyle((feature) => styleForFeature(feature, color, highlightedPlaceIdRef.current, canPickPlaces || Boolean(onCoveragePlaceClick)));

        for (const geometry of geometries) {
          if (geometry.geojson) {
            const features = map.data.addGeoJson(geometry.geojson);
            for (const feature of features) {
              feature.setProperty?.("coverageLabel", geometry.label);
              feature.setProperty?.("postalCode", geometry.id);
              feature.setProperty?.("placeId", geometry.id);
              feature.setProperty?.("parentPlaceId", geometry.parentPlaceId || "");
              feature.setProperty?.("visual", geometry.visual);
              feature.setProperty?.("source", geometry.source || "");
              feature.setProperty?.("coverageColor", geometry.color);
            }
          }
        }

        if (userLocation) {
          if (!markerRef.current) {
            const circleSymbol = runtime.SymbolPath?.CIRCLE;
            markerRef.current = new runtime.Marker({
              map,
              position: userLocation,
              title: "Tu ubicación",
              icon: {
                path: circleSymbol ?? "M 0,0 m -5,0 a 5,5 0 1,0 10,0 a 5,5 0 1,0 -10,0",
                fillColor: "#38bdf8",
                fillOpacity: 1,
                strokeColor: "#0f172a",
                strokeWeight: 2,
                // SymbolPath.CIRCLE is enum 0; never use truthiness checks on it.
                scale: circleSymbol === undefined ? 1 : 6,
                labelOrigin: { x: 0, y: -12 },
              },
              label: {
                text: "Tú",
                color: "#e2e8f0",
                fontSize: "11px",
                fontWeight: "700",
              },
            });
          } else {
            markerRef.current.setMap(map);
            markerRef.current.setPosition(userLocation);
          }
        } else if (markerRef.current) {
          markerRef.current.setMap(null);
        }

        if (focusLocation) {
          if (!focusMarkerRef.current) {
            const focusMarker = new runtime.Marker({
              map,
              position: focusLocation,
              draggable: Boolean(onFocusLocationChangeRef.current),
              title: focusLocation.source === "address"
                ? `${focusLocation.label} (ubicación aproximada)`
                : focusLocation.label,
              label: {
                text: "Cliente",
                color: "#f8fafc",
                fontSize: "11px",
                fontWeight: "800",
              },
              zIndex: 10,
            });
            focusMarker.addListener?.("dragend", () => {
              const position = focusMarker.getPosition?.();
              const currentLocation = focusLocationRef.current;
              if (!position || !currentLocation) return;
              onFocusLocationChangeRef.current?.({
                lat: position.lat(),
                lng: position.lng(),
                label: currentLocation.label,
                source: "exact_entrance",
              });
            });
            focusMarkerRef.current = focusMarker;
          } else {
            focusMarkerRef.current.setMap(map);
            focusMarkerRef.current.setPosition(focusLocation);
            focusMarkerRef.current.setTitle?.(
              focusLocation.source === "address"
                ? `${focusLocation.label} (ubicación aproximada)`
                : focusLocation.label,
            );
          }
        } else if (focusMarkerRef.current) {
          focusMarkerRef.current.setMap(null);
        }

        // Camera framing lives in a separate effect — never fitBounds here.

        scheduleMapResize(map, runtime);
      } catch {
        if (!cancelled) {
          setStatus("Mapa no disponible. La cobertura sigue guardándose en la lista.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [apiKey, canPickPlaces, color, focusLocation, geometries, onCoveragePlaceClick, onFocusLocationChange, userLocation]);

  useEffect(() => {
    const map = mapRef.current;
    const catalogLayer = catalogLayerRef.current;
    if (!mapReady || !map || (!canPickPlaces && !onCoveragePlaceClick) || areaMode) return;

    if (canPickPlaces) {
      map.setOptions({ draggableCursor: "crosshair", draggable: true, gestureHandling: "greedy" });
    }
    const coverageClickListener = map.data.addListener("click", (event) => {
      identifyCoverageFeature(event);
    });
    const catalogClickListener = catalogLayer?.addListener("click", (event) => {
      lastFeatureClickAtRef.current = Date.now();
      const geoid = String(event.feature?.getProperty?.("censusGeoid") || "");
      if (!geoid) return;
      void selectCatalogPlace(geoid);
    });
    const catalogHoverListener = catalogLayer?.addListener("mouseover", (event) => {
      const geoid = String(event.feature?.getProperty?.("censusGeoid") || "");
      const name = String(event.feature?.getProperty?.("censusName") || "");
      if (!geoid) return;
      setHoveredCatalogGeoid(geoid);
      if (name) setStatus(`Zona: ${name}`);
    });
    const catalogOutListener = catalogLayer?.addListener("mouseout", () => {
      setHoveredCatalogGeoid(null);
    });
    const emptyClickListener = map.addListener("click", () => {
      if (Date.now() - lastFeatureClickAtRef.current < 200) return;
      setStatus("Haz clic dentro de una pieza del mapa o usa Seleccionar área. El sistema no inventa límites desde un punto vacío.");
    });

    return () => {
      coverageClickListener.remove();
      catalogClickListener?.remove();
      catalogHoverListener?.remove();
      catalogOutListener?.remove();
      emptyClickListener.remove();
      if (canPickPlaces) map.setOptions({ draggableCursor: null });
    };
  }, [areaMode, canPickPlaces, identifyCoverageFeature, mapReady, onCoveragePlaceClick, selectCatalogPlace]);

  useEffect(() => {
    const map = mapRef.current;
    const catalogLayer = catalogLayerRef.current;
    if (!mapReady || !map || !canPickPlaces || !areaMode) return;

    // Freeze map gestures while drawing; pointer capture happens on the DOM overlay.
    map.setOptions({
      draggable: false,
      gestureHandling: "none",
      draggableCursor: "crosshair",
    });
    map.data.setStyle((feature) => styleForFeature(feature, color, highlightedPlaceIdRef.current, false));
    catalogLayer?.setStyle((feature) => styleForCatalogFeature(feature, null, false));
    setStatus("Mantén pulsado y arrastra sobre el mapa para dibujar el rectángulo.");

    return () => {
      map.data.setStyle((feature) => styleForFeature(feature, color, highlightedPlaceIdRef.current, canPickPlaces));
      catalogLayer?.setStyle((feature) => styleForCatalogFeature(feature, hoveredCatalogGeoid, canPickPlaces));
    };
  }, [areaMode, canPickPlaces, color, hoveredCatalogGeoid, mapReady]);

  const onAreaOverlayPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!areaMode || mapClickBusyRef.current || event.button !== 0) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const frame = event.currentTarget.getBoundingClientRect();
    const startClient = { x: event.clientX, y: event.clientY };
    areaDrawRef.current = { active: true, startClient };
    setAreaDraftBox({
      left: startClient.x - frame.left,
      top: startClient.y - frame.top,
      width: 0,
      height: 0,
    });
    setStatus("Suelta para preseleccionar las piezas dentro del rectángulo.");
  }, [areaMode]);

  const onAreaOverlayPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!areaDrawRef.current.active || !areaDrawRef.current.startClient) return;
    const frame = event.currentTarget.getBoundingClientRect();
    const start = areaDrawRef.current.startClient;
    const left = Math.min(start.x, event.clientX) - frame.left;
    const top = Math.min(start.y, event.clientY) - frame.top;
    const width = Math.abs(event.clientX - start.x);
    const height = Math.abs(event.clientY - start.y);
    setAreaDraftBox({ left, top, width, height });
  }, []);

  const onAreaOverlayPointerUp = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (!areaDrawRef.current.active || !areaDrawRef.current.startClient) return;
    const start = areaDrawRef.current.startClient;
    const end = { x: event.clientX, y: event.clientY };
    areaDrawRef.current = { active: false, startClient: null };
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    const map = mapRef.current;
    const container = containerRef.current;
    if (!map || !container) {
      setAreaDraftBox(null);
      return;
    }
    const startLatLng = clientPointToLatLng(map, container, start.x, start.y);
    const endLatLng = clientPointToLatLng(map, container, end.x, end.y);
    if (!startLatLng || !endLatLng) {
      setAreaDraftBox(null);
      setStatus("No se pudo leer el área. Intenta de nuevo.");
      return;
    }
    // Keep the drawn rectangle visible while zones resolve progressively.
    void resolveAreaSelection({
      north: Math.max(startLatLng.lat, endLatLng.lat),
      south: Math.min(startLatLng.lat, endLatLng.lat),
      east: Math.max(startLatLng.lng, endLatLng.lng),
      west: Math.min(startLatLng.lng, endLatLng.lng),
    });
  }, [resolveAreaSelection]);

  useEffect(() => {
    if (!mapReady || !canPickPlaces) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- clear data when the external map capability disappears.
      setCatalogPlaces([]);
      return;
    }
    const map = mapRef.current;
    if (!map) return;

    let cancelled = false;
    let timer: number | null = null;

    const loadCatalog = () => {
      if (cancelled) return;
      const bounds = map.getBounds?.();
      const zoom = map.getZoom?.();
      if (!bounds || !Number.isFinite(zoom)) return;
      if (zoom < 9) {
        setCatalogPlaces([]);
        setStatus((current) =>
          current.startsWith("Vista previa") || current.startsWith("Frontera Census") || current.startsWith("Census:")
            ? current
            : "Acerca el mapa para ver las piezas administrativas clicables.",
        );
        return;
      }

      const northEast = bounds.getNorthEast();
      const southWest = bounds.getSouthWest();
      const requestId = catalogRequestIdRef.current + 1;
      catalogRequestIdRef.current = requestId;
      void (async () => {
        const result = await loadCensusPlacesCatalogAction({
          north: northEast.lat(),
          south: southWest.lat(),
          east: northEast.lng(),
          west: southWest.lng(),
          zoom,
        });
        if (cancelled || catalogRequestIdRef.current !== requestId) return;
        if (!result.ok) {
          setStatus(result.error || "No se pudieron cargar las zonas del mapa.");
          return;
        }
        setCatalogPlaces(result.data);
        if (!result.data.length) {
          setStatus((current) =>
            current.startsWith("Vista previa") || current.startsWith("Frontera Census") || current.startsWith("Census:")
              ? current
              : "No hay ciudades o zonas Census en esta vista. Acerca o desplaza el mapa.",
          );
        } else {
          setStatus((current) =>
            current.startsWith("Vista previa") || current.startsWith("Frontera Census") || current.startsWith("Census:")
              ? current
              : `${result.data.length} zonas visibles. Haz clic en una pieza para seleccionarla.`,
          );
        }
      })();
    };

    const scheduleLoad = () => {
      if (timer != null) window.clearTimeout(timer);
      timer = window.setTimeout(loadCatalog, 450);
    };

    scheduleLoad();
    const idleListener = map.addListener("idle", scheduleLoad);
    return () => {
      cancelled = true;
      if (timer != null) window.clearTimeout(timer);
      idleListener.remove();
    };
  }, [canPickPlaces, mapReady]);

  useEffect(() => {
    const catalogLayer = catalogLayerRef.current;
    if (!catalogLayer) return;
    clearDataLayer(catalogLayer);
    if (!catalogPlaces.length) {
      catalogLayer.setStyle((feature) => styleForCatalogFeature(feature, hoveredCatalogGeoid, canPickPlaces));
      return;
    }
    catalogLayer.addGeoJson(catalogFeatureCollection(catalogPlaces));
    catalogLayer.setStyle((feature) => styleForCatalogFeature(feature, hoveredCatalogGeoid, canPickPlaces));
  }, [canPickPlaces, catalogPlaces, hoveredCatalogGeoid]);

  useEffect(() => {
    if (!mapReady || !containerRef.current) return;
    const map = mapRef.current;
    const runtime = runtimeRef.current;
    if (!map) return;

    const syncMapSize = () => {
      if (!mapRef.current) return;
      scheduleMapResize(mapRef.current, runtime);
    };
    syncMapSize();

    const observer = new ResizeObserver(() => {
      syncMapSize();
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [mapReady]);

  // Frame the camera only when the set of committed coverage ids changes (or search asks
  // for fitPreview). Census outline arrival and map-click/area preview must never re-fit.
  useEffect(() => {
    const map = mapRef.current;
    const runtime = runtimeRef.current;
    if (!map || !runtime) return;

    const firstPreview = previewPlaces[0] || null;
    const previewKeyId = previewPlaces.map((place) => place.placeId).sort().join("|");
    if (
      fitPreview &&
      firstPreview &&
      fittedPreviewIdRef.current !== previewKeyId
    ) {
      const previewGeometry = geometries.find(
        (item) => item.id === firstPreview.placeId && item.source === "preview",
      );
      if (previewGeometry?.geojson || previewGeometry?.bounds) {
        const previewBounds = new runtime.LatLngBounds();
        if (extendCoverageOutlineBounds(previewBounds, previewGeometry) && !previewBounds.isEmpty()) {
          fittedPreviewIdRef.current = previewKeyId;
          fitCoverageCamera(map, previewBounds);
        }
      }
    } else if (!previewPlaces.length) {
      fittedPreviewIdRef.current = "";
    }

    const cameraKey = `${coverageIdsKey}|focus:${focusLocationKey}|focus-request:${focusLocationRequest}|coverage-request:${fitCoverageRequest}`;
    if (cameraKey === fittedCoverageKeyRef.current) return;

    const committedBounds = new runtime.LatLngBounds();
    let hasOutline = false;
    for (const geometry of geometries) {
      if (geometry.source === "preview" || previewPlaceIds.has(geometry.id)) continue;
      if (extendCoverageOutlineBounds(committedBounds, geometry)) {
        hasOutline = true;
      }
    }

    if (focusLocation && !fitCoverageRequest) {
      committedBounds.extend({ lat: focusLocation.lat, lng: focusLocation.lng });
    }

    if (!coverageIdsKey && !focusLocation) {
      fittedCoverageKeyRef.current = "";
      return;
    }

    // Wait for geojson/bounds — never fit on center alone (that opens street-level zoom).
    // Do not mark fitted yet so the first real outline can frame once without a second jump.
    // In the customer preview, the address is the anchor. Some route coverage
    // collections can contain distant or broad geometries; fitting all of them
    // would open the map at a world view instead of showing the customer area.
    if (focusLocation && !fitCoverageRequest) {
      fittedCoverageKeyRef.current = cameraKey;
      map.setCenter(focusLocation);
      map.setZoom(10);
      return;
    }

    if (!hasOutline || committedBounds.isEmpty()) {
      if (fitCoverageRequest) {
        const fallbackCenter = geometries.find((item) => item.center)?.center;
        if (fallbackCenter) {
          fittedCoverageKeyRef.current = cameraKey;
          map.setCenter(fallbackCenter);
          map.setZoom(10);
        }
      }
      return;
    }

    fittedCoverageKeyRef.current = cameraKey;
    fitCoverageCamera(map, committedBounds);
  }, [coverageIdsKey, fitCoverageRequest, fitPreview, focusLocation, focusLocationKey, focusLocationRequest, geometries, mapReady, previewPlaceIds, previewPlaces]);

  async function locateMe() {
    setLocationBusy(true);
    setLocationError("");
    try {
      const location = await readUserLocation();
      setUserLocation(location);
      mapRef.current?.panTo(location);
      mapRef.current?.setZoom(13);
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : "No se pudo obtener tu ubicación");
    } finally {
      setLocationBusy(false);
    }
  }

  if (!apiKey) {
    return (
      <div className="grid h-52 place-items-center rounded-lg border border-amber-700/70 bg-amber-950/30 p-4 text-center text-[11px] font-bold text-amber-100">
        Para ver el mapa, configura `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` en `.env.local` y reinicia el servidor. También puedes definir la cobertura desde el buscador.
      </div>
    );
  }

  return (
    <div ref={mapRootRef} className={`grid w-full min-w-0 grid-cols-[minmax(0,1fr)] gap-1.5 ${fillHeight ? "h-full grid-rows-[auto_minmax(0,1fr)]" : ""}`}>
      <div
        className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${mapWidthFill ? "w-full" : ""}`}
        style={mapWidthFill ? undefined : { width: mapWidth }}
      >
        <p className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-[11px] font-bold text-slate-400">
          <MapPin className="h-3.5 w-3.5 shrink-0 text-sky-300" />
          <span className="min-w-0 truncate">
            {focusLocation
              ? "Dirección del cliente y coberturas disponibles"
              : canPickPlaces
              ? areaMode
                ? "Mantén pulsado y arrastra para dibujar el área"
                : "Haz clic en una pieza o selecciona un área"
              : userLocation
                ? "Tu ubicación aparece en el mapa"
                : "Activa la ubicación para situarte"}
          </span>
        </p>
        <div className="flex shrink-0 items-center gap-1">
          {canPickPlaces ? (
            <button
              type="button"
              className={`${secondaryButtonClass} h-7 px-2 text-[11px] ${areaMode ? "border-sky-400 text-sky-100" : ""}`}
              disabled={mapClickBusy}
              onClick={() => {
                if (areaMode) {
                  exitAreaMode();
                  setStatus("Modo área cancelado. Haz clic en una pieza o vuelve a seleccionar un área.");
                  return;
                }
                clearAreaRectangle();
                setAreaMode(true);
              }}
            >
              <BoxSelect className="h-3.5 w-3.5" />
              {areaMode ? "Cancelar área" : "Seleccionar área"}
            </button>
          ) : null}
          {showLocationControl ? <button
            type="button"
            className={`${secondaryButtonClass} h-7 px-2 text-[11px]`}
            disabled={locationBusy || areaMode}
            onClick={() => void locateMe()}
            title="Mi ubicación"
            aria-label="Mi ubicación"
          >
            {locationBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crosshair className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Mi ubicación</span>
          </button> : null}
        </div>
      </div>
      <div ref={mapShellRef} className={`w-full min-w-0 max-w-full overflow-x-hidden ${fillHeight ? "h-full" : ""}`}>
        <div className={`flex max-w-full items-stretch ${mapWidthFill ? "w-full" : ""} ${fillHeight ? "h-full" : ""}`}>
          <div
            ref={mapFrameRef}
            className={`relative isolate min-w-0 overflow-hidden rounded-lg border border-black bg-surface-card ${mapWidthFill ? "flex-1" : ""}`}
            style={{
              height: fillHeight ? "100%" : mapHeight,
              minHeight: fillHeight ? "16rem" : undefined,
              width: mapWidthFill ? undefined : mapWidth,
            }}
          >
            <div ref={containerRef} className="absolute inset-0" />
            {areaResolveProgress ? (
              <div
                className="absolute inset-0 z-30 flex items-center justify-center bg-slate-950/45 p-4"
                role="status"
                aria-live="polite"
                aria-busy="true"
              >
                {areaDraftBox ? (
                  <div
                    className="pointer-events-none absolute border-2 border-sky-300/80 bg-sky-400/15"
                    style={{
                      left: areaDraftBox.left,
                      top: areaDraftBox.top,
                      width: areaDraftBox.width,
                      height: areaDraftBox.height,
                    }}
                  />
                ) : null}
                <div className="relative z-10 flex max-w-sm flex-col items-center gap-2 rounded-lg border border-sky-500/40 bg-slate-950/90 px-4 py-3 text-center shadow-lg">
                  <Loader2 className="h-5 w-5 animate-spin text-sky-300" aria-hidden />
                  <p className="text-sm font-black text-sky-100">
                    Preparando zonas {areaResolveProgress.done}/{areaResolveProgress.total}
                  </p>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full rounded-full bg-sky-400 transition-[width] duration-300 ease-out"
                      style={{
                        width: `${Math.max(
                          4,
                          Math.round((areaResolveProgress.done / Math.max(1, areaResolveProgress.total)) * 100),
                        )}%`,
                      }}
                    />
                  </div>
                  <p className="text-[11px] font-bold text-slate-400">
                    Las piezas aparecen en el mapa a medida que se preparan.
                  </p>
                </div>
              </div>
            ) : areaMode ? (
              <div
                className="absolute inset-0 z-20 cursor-crosshair touch-none"
                onPointerDown={onAreaOverlayPointerDown}
                onPointerMove={onAreaOverlayPointerMove}
                onPointerUp={onAreaOverlayPointerUp}
                onPointerCancel={onAreaOverlayPointerUp}
                role="presentation"
                aria-label="Área de dibujo del rectángulo"
              >
                {areaDraftBox ? (
                  <div
                    className="pointer-events-none absolute border-2 border-sky-300 bg-sky-400/20"
                    style={{
                      left: areaDraftBox.left,
                      top: areaDraftBox.top,
                      width: areaDraftBox.width,
                      height: areaDraftBox.height,
                    }}
                  />
                ) : (
                  <div className="pointer-events-none absolute inset-x-3 top-3 rounded-md border border-sky-500/50 bg-slate-950/70 px-2 py-1.5 text-center text-[11px] font-bold text-sky-100">
                    Mantén pulsado y arrastra para dibujar el rectángulo
                  </div>
                )}
              </div>
            ) : null}
            <div
              className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 flex min-h-[2.75rem] items-end justify-center p-3 text-center text-[11px] font-bold ${
                geometries.length
                  ? "bg-gradient-to-t from-slate-950/85 via-slate-950/40 to-transparent text-slate-100"
                  : "bg-slate-950/55 text-slate-200"
              }`}
              aria-live="polite"
            >
              <div className="space-y-1">
                {hoverLabel ? (
                  <p className="inline-flex max-w-full break-words rounded-md border border-slate-700 bg-slate-950/90 px-2.5 py-1 text-sm font-black text-white shadow-[0_1px_3px_rgba(0,0,0,0.7)]">
                    {hoveredCatalogGeoid ? "Zona" : "Cobertura"}: {hoverLabel}
                  </p>
                ) : null}
                {mapClickBusy && !areaResolveProgress ? (
                  <p className="inline-flex items-center justify-center gap-1.5 text-[10px] uppercase tracking-wide text-sky-200">
                    <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
                    Seleccionando zona…
                  </p>
                ) : null}
                {status ? <p>{status}</p> : null}
                {locationError ? <p className="text-amber-200">{locationError}</p> : null}
              </div>
            </div>
          </div>
          {resizable ? <button
            type="button"
            aria-label="Cambiar ancho del mapa"
            title="Arrastra para cambiar el ancho"
            className="ml-1 flex shrink-0 cursor-ew-resize items-center justify-center rounded-md border border-black bg-surface-inset text-slate-500 hover:bg-surface-card hover:text-slate-200 disabled:pointer-events-none disabled:opacity-40"
            style={{ width: MAP_EDGE_HANDLE }}
            disabled={areaMode}
            onPointerDown={(event) => beginMapSizeDrag(event, "x")}
            onPointerMove={onMapSizeDragMove}
            onPointerUp={endMapSizeDrag}
            onPointerCancel={endMapSizeDrag}
          >
            <GripVertical className="h-3.5 w-3.5" aria-hidden />
          </button> : null}
        </div>
        {resizable ? <div
          className={`mt-1 flex max-w-full ${mapWidthFill ? "w-full" : ""}`}
          style={mapWidthFill ? undefined : { width: mapWidth + MAP_EDGE_HANDLE + 4 }}
        >
          <button
            type="button"
            aria-label="Cambiar altura del mapa"
            title="Arrastra para cambiar la altura"
            className="flex h-3.5 min-w-0 flex-1 cursor-ns-resize items-center justify-center rounded-md border border-black bg-surface-inset text-slate-500 hover:bg-surface-card hover:text-slate-200"
            onPointerDown={(event) => beginMapSizeDrag(event, "y")}
            onPointerMove={onMapSizeDragMove}
            onPointerUp={endMapSizeDrag}
            onPointerCancel={endMapSizeDrag}
          >
            <GripHorizontal className="h-3.5 w-3.5" aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Cambiar ancho y alto del mapa"
            title="Arrastra la esquina para cambiar ancho y alto"
            className="ml-1 h-3.5 shrink-0 cursor-nwse-resize rounded-md border border-black bg-surface-inset text-slate-500 hover:bg-surface-card hover:text-slate-200 disabled:pointer-events-none disabled:opacity-40"
            style={{ width: MAP_EDGE_HANDLE }}
            disabled={areaMode}
            onPointerDown={(event) => beginMapSizeDrag(event, "xy")}
            onPointerMove={onMapSizeDragMove}
            onPointerUp={endMapSizeDrag}
            onPointerCancel={endMapSizeDrag}
          />
        </div> : null}
      </div>
    </div>
  );
}
