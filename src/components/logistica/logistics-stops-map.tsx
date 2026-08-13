"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type LogisticsMapStop = {
  id: string;
  lat: number | null | undefined;
  lng: number | null | undefined;
  label: string;
  kind?: "delivery" | "pickup";
  sequence?: number;
};

type MapInstance = {
  fitBounds: (bounds: unknown, padding?: number) => void;
  setCenter: (center: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
  addListener?: (eventName: string, handler: () => void) => MapEventListener;
};

type MapEventListener = { remove: () => void };

type MapOverlay = {
  setMap: (map: MapInstance | null) => void;
};

type MapsRuntime = {
  Map: new (node: HTMLElement, options: Record<string, unknown>) => MapInstance;
  Marker: new (options: Record<string, unknown>) => MapOverlay;
  Polyline: new (options: Record<string, unknown>) => MapOverlay;
  LatLngBounds: new () => { extend: (point: { lat: number; lng: number }) => void };
  importLibrary?: (library: string) => Promise<unknown>;
};

type RoutesLibrary = {
  Route?: {
    computeRoutes: (request: Record<string, unknown>) => Promise<{
      routes?: Array<{ path?: unknown[] }>;
    }>;
  };
};

const MAX_ROUTED_STOPS = 27;
const SINGLE_LOCATION_ZOOM = 13;

export function uniqueMapPositions(
  points: Array<{ lat: number; lng: number }>,
) {
  const unique = new Map<string, { lat: number; lng: number }>();
  for (const point of points) {
    const key = `${point.lat.toFixed(6)},${point.lng.toFixed(6)}`;
    if (!unique.has(key)) unique.set(key, point);
  }
  return [...unique.values()];
}

export function LogisticsStopsMap({ stops }: { stops: LogisticsMapStop[] }) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const [fallback, setFallback] = useState("");
  const [routeNote, setRouteNote] = useState("");
  const [readySignature, setReadySignature] = useState("");
  const points = useMemo(
    () => stops
      .map((stop, index) => ({ ...stop, sequence: stop.sequence || index + 1 }))
      .filter((stop): stop is LogisticsMapStop & { lat: number; lng: number; sequence: number } =>
        Number.isFinite(stop.lat) && Number.isFinite(stop.lng)),
    [stops],
  );
  const pointsSignature = points
    .map((point) => `${point.id}:${point.lat}:${point.lng}:${point.sequence}`)
    .join("|");
  const mapReady = Boolean(pointsSignature && readySignature === pointsSignature);
  const missingCoordinates = stops.length - points.length;
  const staticFallback = !points.length
    ? "No hay coordenadas verificadas para mostrar estas paradas."
    : !process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      ? "El mapa interno necesita la clave pública de Google Maps. Puedes abrir el recorrido con el botón de Google Maps."
      : "";

  useEffect(() => {
    let cancelled = false;
    const overlays: MapOverlay[] = [];
    const listeners: MapEventListener[] = [];
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!points.length || !apiKey) return;

    const render = async () => {
      if (cancelled || !containerRef.current) return;
      const runtime = (window as typeof window & { google?: { maps?: MapsRuntime } }).google?.maps;
      if (!runtime) return;

      const map = mapRef.current ?? new runtime.Map(containerRef.current, {
          center: { lat: points[0].lat, lng: points[0].lng },
          zoom: 10,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
      mapRef.current = map;
      if (map.addListener) {
        const listener = map.addListener("tilesloaded", () => {
          if (!cancelled) setReadySignature(pointsSignature);
        });
        listeners.push(listener);
      } else {
        requestAnimationFrame(() => {
          if (!cancelled) setReadySignature(pointsSignature);
        });
      }
      const bounds = new runtime.LatLngBounds();
      const positions = points.map((stop) => ({ lat: stop.lat, lng: stop.lng }));
      const distinctPositions = uniqueMapPositions(positions);

      points.forEach((stop) => {
        const position = { lat: stop.lat, lng: stop.lng };
        bounds.extend(position);
        overlays.push(new runtime.Marker({
          map,
          position,
          title: `${stop.sequence}. ${stop.label}`,
          label: { text: String(stop.sequence), color: "#0f172a", fontWeight: "900" },
          icon: {
            path: "M 0,0 m -10,0 a 10,10 0 1,0 20,0 a 10,10 0 1,0 -20,0",
            fillColor: stop.kind === "pickup" ? "#38bdf8" : "#34d399",
            fillOpacity: 1,
            strokeColor: "#020617",
            strokeWeight: 2,
            scale: 1,
          },
        }));
      });

      if (distinctPositions.length > 1) {
        let roadPath: unknown[] | null = null;
        if (distinctPositions.length <= MAX_ROUTED_STOPS && runtime.importLibrary) {
          try {
            const routesLibrary = await runtime.importLibrary("routes") as RoutesLibrary;
            const result = await routesLibrary.Route?.computeRoutes({
              origin: distinctPositions[0],
              destination: distinctPositions.at(-1),
              intermediates: distinctPositions.slice(1, -1).map((location) => ({ location })),
              travelMode: "DRIVING",
              fields: ["path"],
            });
            roadPath = result?.routes?.[0]?.path || null;
          } catch {
            roadPath = null;
          }
        }

        if (cancelled) {
          overlays.forEach((overlay) => overlay.setMap(null));
          return;
        }

        overlays.push(new runtime.Polyline({
          map,
          path: roadPath || distinctPositions,
          geodesic: !roadPath,
          strokeColor: roadPath ? "#10b981" : "#38bdf8",
          strokeOpacity: 0.92,
          strokeWeight: roadPath ? 5 : 3,
        }));

        if (distinctPositions.length > MAX_ROUTED_STOPS) {
          setRouteNote(`Google calcula hasta ${MAX_ROUTED_STOPS} paradas por recorrido; se muestra el orden directo.`);
        } else if (!roadPath) {
          setRouteNote("No se pudo calcular el trayecto vial; se muestra el orden directo de las paradas.");
        } else if (missingCoordinates) {
          setRouteNote(`${missingCoordinates} parada${missingCoordinates === 1 ? "" : "s"} sin coordenadas no aparece${missingCoordinates === 1 ? "" : "n"} en el mapa.`);
        } else {
          setRouteNote("");
        }
      } else {
        const sharedLocationCount = positions.length - distinctPositions.length;
        setRouteNote(sharedLocationCount
          ? `${positions.length} paradas comparten esta misma ubicación.`
          : missingCoordinates
            ? `${missingCoordinates} parada${missingCoordinates === 1 ? "" : "s"} sin coordenadas no aparece${missingCoordinates === 1 ? "" : "n"} en el mapa.`
            : "");
      }

      if (distinctPositions.length === 1) {
        map.setCenter(distinctPositions[0]);
        map.setZoom(SINGLE_LOCATION_ZOOM);
      } else {
        map.fitBounds(bounds, 48);
      }
      setFallback("");
    };

    const loadedRuntime = (window as typeof window & { google?: { maps?: MapsRuntime } }).google?.maps;
    if (loadedRuntime) {
      void render();
    } else {
      const existing = document.querySelector<HTMLScriptElement>('script[data-boxario-google-maps="true"]');
      if (existing) {
        existing.addEventListener("load", render, { once: true });
      } else {
        const script = document.createElement("script");
        script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
        script.async = true;
        script.dataset.boxarioGoogleMaps = "true";
        script.addEventListener("load", render, { once: true });
        script.addEventListener("error", () => setFallback("Mapa no disponible. Las direcciones siguen visibles en la lista."), { once: true });
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      listeners.forEach((listener) => listener.remove());
      overlays.forEach((overlay) => overlay.setMap(null));
    };
  }, [missingCoordinates, points, pointsSignature]);

  return (
    <div className={`relative overflow-hidden rounded-lg border border-black bg-surface-inset ${staticFallback ? "h-24" : "h-56"}`}>
      <div
        ref={containerRef}
        className={`h-full w-full transition-opacity duration-150 ${mapReady ? "opacity-100" : "opacity-0"}`}
      />
      {!staticFallback && !fallback && !mapReady ? (
        <div className="absolute inset-0 grid place-items-center bg-surface-inset text-xs font-black text-slate-500">
          Cargando mapa…
        </div>
      ) : null}
      {staticFallback || fallback ? (
        <div className="absolute inset-0 grid place-items-center p-5 text-center text-xs font-bold text-slate-400">
          {staticFallback || fallback}
        </div>
      ) : null}
      {!staticFallback && !fallback && routeNote ? (
        <p className="absolute inset-x-2 bottom-2 rounded-md border border-black/70 bg-slate-950/90 px-2 py-1.5 text-[11px] font-bold text-slate-200 shadow-lg">
          {routeNote}
        </p>
      ) : null}
    </div>
  );
}
