"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Crosshair,
  Delete,
  Keyboard,
  Map,
  MapPin,
  PersonStanding,
  Satellite,
  Search,
  X,
} from "lucide-react";
import type { AddressSuggestion } from "@/components/sale/venta-parts";

export type ExactEntranceDraft = {
  lat: number;
  lng: number;
  note: string;
  panoId?: string;
  heading?: number | null;
  pitch?: number | null;
};

export type MapResolvedAddress = {
  street: string;
  houseNumber: string;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  formattedAddress: string;
  placeId: string;
  lat: number;
  lng: number;
};

export type MapAddressFields = Pick<MapResolvedAddress, "street" | "houseNumber" | "neighborhood" | "city" | "state" | "postalCode" | "country">;

type LatLngValue = { lat: () => number; lng: () => number };
type MapInstance = {
  setMapTypeId: (type: string) => void;
  panTo: (position: { lat: number; lng: number }) => void;
  setZoom: (zoom: number) => void;
};
type MarkerInstance = {
  setMap: (map: MapInstance | null) => void;
  getPosition: () => LatLngValue | null;
  addListener: (event: string, listener: () => void) => unknown;
};
type StreetViewInstance = {
  getPano: () => string;
  getPov: () => { heading: number; pitch: number };
  addListener: (event: string, listener: () => void) => unknown;
};
type MapsRuntime = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => MapInstance;
  Marker: new (options: Record<string, unknown>) => MarkerInstance;
  StreetViewPanorama: new (element: HTMLElement, options: Record<string, unknown>) => StreetViewInstance;
  StreetViewStatus: { OK: string };
  StreetViewService: new () => {
    getPanorama: (
      request: Record<string, unknown>,
      callback: (data: { location?: { pano?: string; latLng?: LatLngValue } } | null, status: string) => void,
    ) => void;
  };
};

const DEFAULT_CENTER = { lat: 39.5, lng: -98.35 };
const KEYBOARD_ROWS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ñ"],
  ["Z", "X", "C", "V", "B", "N", "M", ".", "-", "#"],
];

function ensureGoogleMapsScript(apiKey: string, targetWindow: Window) {
  const existing = targetWindow.document.querySelector<HTMLScriptElement>('script[data-boxario-google-maps="true"]');
  if (existing) return existing;
  const script = targetWindow.document.createElement("script");
  script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&v=weekly`;
  script.async = true;
  script.dataset.boxarioGoogleMaps = "true";
  targetWindow.document.head.appendChild(script);
  return script;
}

function loadGoogleMaps(apiKey: string, targetWindow: Window): Promise<MapsRuntime> {
  const mapWindow = targetWindow as Window & { google?: { maps?: MapsRuntime } };
  const current = mapWindow.google?.maps;
  if (current) return Promise.resolve(current);
  return new Promise((resolve, reject) => {
    const script = ensureGoogleMapsScript(apiKey, targetWindow);
    const loaded = () => {
      const maps = mapWindow.google?.maps;
      if (maps) resolve(maps);
      else reject(new Error("Google Maps no pudo iniciar"));
    };
    script.addEventListener("load", loaded, { once: true });
    script.addEventListener("error", () => reject(new Error("No se pudo cargar Google Maps")), {
      once: true,
    });
  });
}

export function openExactEntranceBrowserWindow() {
  const width = Math.min(960, window.screen.availWidth || 960);
  const height = Math.min(900, window.screen.availHeight || 900);
  const left = Math.max(0, window.screenX + Math.round((window.outerWidth - width) / 2));
  const top = Math.max(0, window.screenY + 24);
  const popup = window.open(
    "",
    `boxario-entry-map-${Date.now()}`,
    `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
  );
  if (popup) {
    const popupDocument = popup.document;
    popupDocument.title = "Boxario · Ubicar entrada exacta";
    popupDocument.documentElement.className = document.documentElement.className;
    popupDocument.body.className = document.body.className;
    popupDocument.body.style.margin = "0";
    popupDocument.body.style.background = "#111a17";
    document.head.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
      popupDocument.head.appendChild(node.cloneNode(true));
    });
  }
  return popup;
}

export function SaleExactEntranceWindow({
  open,
  personLabel,
  country,
  addressFields,
  addressLocation,
  initialEntrance,
  hostWindow,
  onClose,
  onAddressResolved,
  onConfirm,
}: {
  open: boolean;
  personLabel: string;
  country: string;
  addressFields: MapAddressFields;
  addressLocation?: { lat: number; lng: number } | null;
  initialEntrance?: ExactEntranceDraft | null;
  hostWindow: Window;
  onClose: () => void;
  onAddressResolved: (address: MapResolvedAddress) => void;
  onConfirm: (draft: ExactEntranceDraft) => void;
}) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const streetElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const entranceMarkerRef = useRef<MarkerInstance | null>(null);
  const runtimeRef = useRef<MapsRuntime | null>(null);
  const onCloseRef = useRef(onClose);
  const hostWindowRef = useRef(hostWindow);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const initialPoint = initialEntrance || (addressLocation ? { ...addressLocation, note: "" } : null);
  const [mode, setMode] = useState<"map" | "satellite" | "street">("satellite");
  const [addressDraft, setAddressDraft] = useState<MapAddressFields>(addressFields);
  const [activeField, setActiveField] = useState<keyof MapAddressFields>("street");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [status, setStatus] = useState(apiKey ? `Búsqueda limitada a ${country}.` : "Falta configurar Google Maps.");
  const [streetAvailable, setStreetAvailable] = useState(true);
  const [draft, setDraft] = useState<ExactEntranceDraft | null>(initialPoint);
  const query = [
    addressDraft.street,
    addressDraft.houseNumber,
    addressDraft.neighborhood,
    addressDraft.city,
    addressDraft.state,
    addressDraft.postalCode,
  ].filter(Boolean).join(", ");

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const popup = hostWindowRef.current;
    const handleWindowClosed = () => onCloseRef.current();
    popup.addEventListener("beforeunload", handleWindowClosed);
    popup.focus();
    return () => popup.removeEventListener("beforeunload", handleWindowClosed);
  }, []);

  useEffect(() => {
    if (!open || query.trim().length < 3) {
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      setSearching(true);
      void fetch("/api/validate-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "suggest", query, country }),
        signal: controller.signal,
      })
        .then((response) => response.json())
        .then((data: { ok?: boolean; suggestions?: AddressSuggestion[] }) => {
          setSuggestions(data.ok ? data.suggestions || [] : []);
        })
        .catch(() => undefined)
        .finally(() => setSearching(false));
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [country, open, query]);

  function createEntranceMarker(maps: MapsRuntime, map: MapInstance, point: ExactEntranceDraft) {
    entranceMarkerRef.current?.setMap(null);
    const marker = new maps.Marker({
      position: { lat: point.lat, lng: point.lng },
      map,
      draggable: true,
      cursor: "grab",
      title: "Entrada exacta",
      animation: 2,
      zIndex: 1000,
    });
    marker.addListener("dragend", () => {
      const next = marker.getPosition();
      if (!next) return;
      setDraft((current) => ({
        lat: next.lat(),
        lng: next.lng(),
        note: current?.note || "",
      }));
      setStatus("Pin movido. Confirma cuando esté sobre la entrada real.");
    });
    entranceMarkerRef.current = marker;
  }

  useEffect(() => {
    if (!open || !apiKey || !mapElementRef.current) return;
    let cancelled = false;
    void loadGoogleMaps(apiKey, hostWindowRef.current)
      .then((maps) => {
        if (cancelled || !mapElementRef.current) return;
        runtimeRef.current = maps;
        const point = draft || addressLocation || DEFAULT_CENTER;
        const map = new maps.Map(mapElementRef.current, {
          center: { lat: point.lat, lng: point.lng },
          zoom: draft || addressLocation ? 20 : 4,
          mapTypeId: "satellite",
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
        });
        mapRef.current = map;
        if (!draft && !addressLocation) {
          void fetch("/api/validate-address", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ mode: "country-center", country }),
          })
            .then((response) => response.json())
            .then((data: { ok?: boolean; center?: { lat: number; lng: number } }) => {
              if (!data.ok || !data.center || mapRef.current !== map) return;
              map.panTo(data.center);
              map.setZoom(5);
              setStatus(`Busca una dirección dentro de ${country}.`);
            })
            .catch(() => setStatus(`Busca una dirección dentro de ${country}.`));
        }
        if (draft) createEntranceMarker(maps, map, draft);
      })
      .catch((error) => setStatus(error instanceof Error ? error.message : "Mapa no disponible"));
    return () => {
      cancelled = true;
    };
    // Map instance owns its markers until this floating window closes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, country, open]);

  useEffect(() => {
    if (!open || mode !== "street" || !draft || !runtimeRef.current || !streetElementRef.current) return;
    const maps = runtimeRef.current;
    new maps.StreetViewService().getPanorama(
      { location: { lat: draft.lat, lng: draft.lng }, radius: 80, preference: "nearest" },
      (data, resultStatus) => {
        if (resultStatus !== maps.StreetViewStatus.OK || !data?.location?.latLng) {
          setStreetAvailable(false);
          return;
        }
        setStreetAvailable(true);
        const panorama = new maps.StreetViewPanorama(streetElementRef.current!, {
          position: data.location.latLng,
          pano: draft.panoId || data.location.pano,
          pov: { heading: draft.heading ?? 0, pitch: draft.pitch ?? 0 },
          zoom: 1,
          addressControl: false,
          fullscreenControl: true,
        });
        const syncView = () => {
          const pov = panorama.getPov();
          setDraft((current) => current ? {
            ...current,
            panoId: panorama.getPano(),
            heading: pov.heading,
            pitch: pov.pitch,
          } : current);
        };
        panorama.addListener("pano_changed", syncView);
        panorama.addListener("pov_changed", syncView);
        syncView();
      },
    );
    // Street View publishes camera changes through listeners.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft?.lat, draft?.lng, mode, open]);

  async function selectSuggestion(suggestion: AddressSuggestion) {
    setResolving(true);
    setSuggestions([]);
    try {
      const response = await fetch("/api/validate-address", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "details", placeId: suggestion.placeId }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string; address?: Omit<MapResolvedAddress, "lat" | "lng"> & { lat?: number | null; lng?: number | null } };
      if (!response.ok || !data.ok || !data.address || data.address.lat == null || data.address.lng == null) {
        setStatus(data.error || "No se pudo ubicar esa dirección");
        return;
      }
      const resolved: MapResolvedAddress = {
        street: data.address.street || "",
        houseNumber: data.address.houseNumber || "",
        neighborhood: data.address.neighborhood || "",
        city: data.address.city || "",
        state: data.address.state || "",
        postalCode: data.address.postalCode || "",
        country: data.address.country || country,
        formattedAddress: data.address.formattedAddress || suggestion.description,
        placeId: data.address.placeId || suggestion.placeId,
        lat: data.address.lat,
        lng: data.address.lng,
      };
      setAddressDraft({
        street: resolved.street,
        houseNumber: resolved.houseNumber,
        neighborhood: resolved.neighborhood,
        city: resolved.city,
        state: resolved.state,
        postalCode: resolved.postalCode,
        country: resolved.country,
      });
      onAddressResolved(resolved);
      const nextDraft = { lat: resolved.lat, lng: resolved.lng, note: draft?.note || "" };
      setDraft(nextDraft);
      const map = mapRef.current;
      const maps = runtimeRef.current;
      if (map && maps) {
        createEntranceMarker(maps, map, nextDraft);
        map.panTo(nextDraft);
        map.setZoom(20);
      }
      setStatus("Dirección encontrada. Arrastra el pin rojo hasta la entrada exacta.");
    } finally {
      setResolving(false);
    }
  }

  function changeMode(next: "map" | "satellite" | "street") {
    setMode(next);
    if (next !== "street") mapRef.current?.setMapTypeId(next === "map" ? "roadmap" : "satellite");
  }

  function addKey(key: string) {
    setAddressDraft((current) => ({
      ...current,
      [activeField]: `${current[activeField]}${key}`,
    }));
  }

  function closeWindow() {
    onClose();
    if (!hostWindowRef.current.closed) hostWindowRef.current.close();
  }

  function confirmEntrance() {
    if (!draft) return;
    onConfirm(draft);
    if (!hostWindowRef.current.closed) hostWindowRef.current.close();
  }

  if (!open || typeof document === "undefined" || hostWindow.closed) return null;

  return createPortal(
    <main
      className="flex min-h-screen flex-col bg-[#111a17] text-slate-100"
      aria-label={`Mapa de entrada de ${personLabel}`}
    >
      <div className="flex items-center gap-3 border-b border-white/10 bg-[#1d2a26] px-3 py-2.5">
        <span className="grid h-8 w-8 place-items-center rounded-md bg-emerald-400 text-slate-950"><MapPin className="h-4 w-4" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-slate-50">Cliente verifica su ubicación</p>
          <p className="text-[11px] font-bold text-slate-400">Confirma la dirección y marca la entrada exacta · solo {country}</p>
        </div>
        <button type="button" onClick={closeWindow} aria-label="Cerrar mapa" className="grid h-9 w-9 place-items-center rounded-md border border-slate-600 text-slate-200"><X className="h-4 w-4" /></button>
      </div>

      <div className="min-h-0 overflow-y-auto p-3">
        <div className="relative">
          <div className="flex gap-2">
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-sky-400/45 bg-surface-inset px-3 py-2 text-xs font-bold text-slate-300">
              <Search className="h-4 w-4 shrink-0 text-slate-500" />
              <span>Completa los campos y selecciona una sugerencia de {country}</span>
            </div>
            <button type="button" aria-pressed={keyboardOpen} onClick={() => setKeyboardOpen((value) => !value)} className={`inline-flex h-11 items-center gap-2 rounded-lg border px-3 text-xs font-black ${keyboardOpen ? "border-emerald-300 bg-emerald-400 text-slate-950" : "border-slate-600 bg-surface-inset text-slate-100"}`}>
              <Keyboard className="h-4 w-4" /> {keyboardOpen ? "Cerrar teclado" : "Abrir teclado"}
            </button>
          </div>
          {searching || resolving ? <p className="mt-1 text-xs font-bold text-sky-200">{resolving ? "Ubicando dirección…" : "Buscando…"}</p> : null}
          {suggestions.length ? (
            <div className="absolute left-0 right-0 top-[calc(100%+4px)] z-20 overflow-hidden rounded-lg border border-sky-400/40 bg-[#111a20] shadow-2xl">
              {suggestions.map((suggestion) => (
                <button key={suggestion.placeId} type="button" onClick={() => void selectSuggestion(suggestion)} className="block w-full border-b border-white/10 px-3 py-2 text-left last:border-0 hover:bg-surface-card-header">
                  <span className="block text-sm font-black text-slate-50">{suggestion.mainText}</span>
                  <span className="block text-xs font-bold text-slate-400">{suggestion.secondaryText}</span>
                </button>
              ))}
            </div>
          ) : null}
        </div>
        <div className="mt-2 grid gap-2 sm:grid-cols-2" aria-label="Dirección para buscar">
          {([
            ["street", "Calle", "Calle y número"],
            ["houseNumber", "Unidad", "Apto / suite"],
            ["neighborhood", "Colonia", "Barrio / colonia"],
            ["city", "Ciudad", "Ciudad"],
            ["state", "Estado", "Estado"],
            ["postalCode", "Código postal", "Código postal"],
          ] as const).map(([field, label, placeholder]) => (
            <label key={field} className="grid gap-1">
              <span className="text-[10px] font-black uppercase text-slate-300">{label}</span>
              <input
                value={addressDraft[field]}
                onFocus={() => setActiveField(field)}
                onChange={(event) => setAddressDraft((current) => ({ ...current, [field]: event.target.value }))}
                placeholder={placeholder}
                className="h-9 rounded-md border border-slate-600 bg-surface-inset px-2.5 text-xs font-bold text-slate-50 outline-none focus:border-emerald-300"
              />
            </label>
          ))}
          <div className="grid gap-1">
            <span className="text-[10px] font-black uppercase text-slate-300">País</span>
            <div className="flex h-9 items-center rounded-md border border-slate-700 bg-slate-900/50 px-2.5 text-xs font-black text-slate-300">{country}</div>
          </div>
        </div>

        {keyboardOpen ? (
          <div className="mt-2 space-y-1 rounded-lg border border-white/10 bg-surface-inset p-2" aria-label="Teclado en pantalla">
            {KEYBOARD_ROWS.map((row, rowIndex) => (
              <div key={rowIndex} className="flex justify-center gap-1">
                {row.map((key) => <button key={key} type="button" onClick={() => addKey(key)} className="h-8 min-w-8 flex-1 rounded border border-slate-600 bg-surface-card text-xs font-black text-slate-100 hover:border-emerald-300">{key}</button>)}
              </div>
            ))}
            <div className="flex gap-1">
              <button type="button" onClick={() => addKey(" ")} className="h-8 flex-1 rounded border border-slate-600 bg-surface-card text-xs font-black text-slate-100">Espacio</button>
              <button type="button" onClick={() => setAddressDraft((current) => ({ ...current, [activeField]: current[activeField].slice(0, -1) }))} className="inline-flex h-8 items-center gap-1 rounded border border-slate-600 bg-surface-card px-3 text-xs font-black text-slate-100"><Delete className="h-3.5 w-3.5" /> Borrar</button>
              <button type="button" onClick={() => setAddressDraft((current) => ({ ...current, [activeField]: "" }))} className="h-8 rounded border border-rose-700/60 bg-rose-950/30 px-3 text-xs font-black text-rose-100">Limpiar campo</button>
            </div>
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-2" role="tablist" aria-label="Vista del lugar">
          {([[
            "map", "Mapa", Map,
          ], ["satellite", "Satélite", Satellite], ["street", "A nivel de calle", PersonStanding]] as const).map(([value, label, Icon]) => (
            <button key={value} type="button" onClick={() => changeMode(value)} className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-black ${mode === value ? "border-emerald-300 bg-emerald-400 text-slate-950" : "border-slate-600 bg-surface-inset text-slate-100"}`}><Icon className="h-4 w-4" /> {label}</button>
          ))}
        </div>

        <div className="relative mt-2 min-h-[300px] overflow-hidden rounded-lg border border-black bg-[#0b100e]">
          <div ref={mapElementRef} className={mode === "street" ? "hidden" : "h-[300px] w-full"} />
          <div ref={streetElementRef} className={mode === "street" ? "h-[300px] w-full" : "hidden"} />
          {mode === "street" && !streetAvailable ? <div className="absolute inset-0 grid place-items-center p-8 text-center text-sm font-bold text-amber-200">No hay vista a nivel de calle cerca de este punto.</div> : null}
          {!draft ? <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/35 p-8 text-center text-sm font-black text-slate-100">Busca y selecciona una dirección para colocar el pin.</div> : null}
        </div>

        <div className="mt-2 text-xs font-bold text-slate-300">
          <span className="inline-flex items-center gap-2"><Crosshair className="h-4 w-4 text-emerald-300" /> {draft ? "Arrastra el pin rojo directamente sobre la entrada. " : ""}{status}</span>
        </div>

        <label className="mt-3 grid gap-1.5">
          <span className="text-xs font-black uppercase text-slate-300">Nota para el conductor (opcional)</span>
          <textarea value={draft?.note || ""} disabled={!draft} maxLength={500} onChange={(event) => setDraft((current) => current ? { ...current, note: event.target.value } : current)} className="min-h-16 rounded-lg border border-slate-600 bg-surface-inset px-3 py-2 text-sm text-slate-50 outline-none focus:border-emerald-300 disabled:opacity-40" placeholder="Portón negro, entrada por el callejón, llamar al llegar…" />
        </label>

      </div>
      <div className="flex shrink-0 justify-end gap-2 border-t border-white/10 bg-[#111a17] px-3 py-3">
        <button type="button" onClick={closeWindow} className="h-10 rounded-md border border-slate-600 px-4 text-sm font-black text-slate-100">Cancelar</button>
        <button type="button" disabled={!draft} onClick={confirmEntrance} className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-400 px-5 text-sm font-black text-slate-950 disabled:opacity-40"><MapPin className="h-4 w-4" /> Confirmar ubicación</button>
      </div>
    </main>,
    hostWindow.document.body,
  );
}
