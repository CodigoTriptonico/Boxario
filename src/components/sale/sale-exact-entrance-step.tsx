"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Crosshair,
  Delete,
  Keyboard,
  Map,
  MapPin,
  Satellite,
  Search,
  ZoomIn,
  ZoomOut,
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
  addressReference?: string;
};

export type MapAddressFields = Pick<MapResolvedAddress, "street" | "houseNumber" | "neighborhood" | "city" | "state" | "postalCode" | "country"> & {
  addressReference: string;
};

type LatLngValue = { lat: () => number; lng: () => number };
type MapInstance = {
  setMapTypeId: (type: string) => void;
  panTo: (position: { lat: number; lng: number }) => void;
  getZoom: () => number;
  setZoom: (zoom: number) => void;
};
type MarkerInstance = {
  setMap: (map: MapInstance | null) => void;
  getPosition: () => LatLngValue | null;
  addListener: (event: string, listener: () => void) => unknown;
};
type MapsRuntime = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => MapInstance;
  Marker: new (options: Record<string, unknown>) => MarkerInstance;
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
    popupDocument.body.style.height = "100vh";
    popupDocument.body.style.overflow = "hidden";
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
  onAddressReferenceChange,
  onConfirm,
  showOperationalNotes = true,
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
  onAddressReferenceChange?: (value: string) => void;
  onConfirm: (draft: ExactEntranceDraft) => void | Promise<void>;
  showOperationalNotes?: boolean;
}) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const entranceMarkerRef = useRef<MarkerInstance | null>(null);
  const runtimeRef = useRef<MapsRuntime | null>(null);
  const onCloseRef = useRef(onClose);
  const onAddressResolvedRef = useRef(onAddressResolved);
  const hostWindowRef = useRef(hostWindow);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const initialPoint = initialEntrance || (addressLocation ? { ...addressLocation, note: "" } : null);
  const [mode, setMode] = useState<"map" | "satellite">("satellite");
  const [addressDraft, setAddressDraft] = useState<MapAddressFields>(addressFields);
  const [activeField, setActiveField] = useState<keyof MapAddressFields>("street");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [bottomTab, setBottomTab] = useState<"references" | "driverNote">("references");
  const [status, setStatus] = useState(apiKey ? `Búsqueda limitada a ${country}.` : "Falta configurar Google Maps.");
  const [draft, setDraft] = useState<ExactEntranceDraft | null>(initialPoint);
  const [confirming, setConfirming] = useState(false);
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
    onAddressResolvedRef.current = onAddressResolved;
  }, [onAddressResolved]);

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
        const showCountryCenter = () => {
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
        };
        if (!draft && !addressLocation) {
          const addressQuery = [
            addressFields.street,
            addressFields.houseNumber,
            addressFields.neighborhood,
            addressFields.city,
            addressFields.state,
            addressFields.postalCode,
          ].filter(Boolean).join(", ");
          if (addressQuery.trim()) {
            void fetch("/api/validate-address", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                street: addressFields.street,
                houseNumber: addressFields.houseNumber,
                neighborhood: addressFields.neighborhood,
                city: addressFields.city,
                state: addressFields.state,
                postalCode: addressFields.postalCode,
                country,
              }),
            })
              .then((response) => response.json())
              .then((data: {
                ok?: boolean;
                address?: Omit<MapResolvedAddress, "lat" | "lng"> & {
                  lat?: number | null;
                  lng?: number | null;
                };
              }) => {
                if (
                  !data.address ||
                  data.address.lat == null ||
                  data.address.lng == null ||
                  mapRef.current !== map
                ) {
                  return;
                }
                const resolved: MapResolvedAddress = {
                  street: data.address.street || addressFields.street,
                  houseNumber: data.address.houseNumber || addressFields.houseNumber,
                  neighborhood: data.address.neighborhood || addressFields.neighborhood,
                  city: data.address.city || addressFields.city,
                  state: data.address.state || addressFields.state,
                  postalCode: data.address.postalCode || addressFields.postalCode,
                  country: data.address.country || country,
                  formattedAddress: data.address.formattedAddress || addressQuery,
                  placeId: data.address.placeId || "",
                  lat: data.address.lat,
                  lng: data.address.lng,
                  addressReference: addressFields.addressReference,
                };
                setAddressDraft({
                  street: resolved.street,
                  houseNumber: resolved.houseNumber,
                  neighborhood: resolved.neighborhood,
                  city: resolved.city,
                  state: resolved.state,
                  postalCode: resolved.postalCode,
                  country: resolved.country,
                  addressReference: addressFields.addressReference,
                });
                onAddressResolvedRef.current(resolved);
                const nextDraft = { lat: resolved.lat, lng: resolved.lng, note: "" };
                setDraft(nextDraft);
                createEntranceMarker(maps, map, nextDraft);
                map.panTo(nextDraft);
                map.setZoom(20);
                setStatus("Dirección encontrada. Arrastra el pin rojo hasta la entrada exacta.");
              })
              .catch(() => showCountryCenter());
            return;
          }
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
        addressReference: addressDraft.addressReference,
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

  function changeMode(next: "map" | "satellite") {
    setMode(next);
    mapRef.current?.setMapTypeId(next === "map" ? "roadmap" : "satellite");
  }

  function zoomMap(delta: number) {
    if (!mapRef.current) return;
    const currentZoom = mapRef.current.getZoom();
    mapRef.current.setZoom(Math.max(3, Math.min(21, currentZoom + delta)));
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

  async function confirmEntrance() {
    if (!draft || confirming) return;
    setConfirming(true);
    try {
      await onConfirm(draft);
      if (!hostWindowRef.current.closed) hostWindowRef.current.close();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo guardar la entrada exacta.");
    } finally {
      setConfirming(false);
    }
  }

  if (!open || typeof document === "undefined" || hostWindow.closed) return null;

  return createPortal(
    <main
      className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-[#111a17] text-slate-100"
      aria-label={`Mapa de entrada de ${personLabel}`}
    >
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
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
            <div className="mt-1 overflow-hidden rounded-lg border border-sky-400/40 bg-[#111a20] shadow-2xl">
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
            ["houseNumber", "Número de unidad", "Apto / suite"],
            ["neighborhood", "Colonia", "Barrio / colonia"],
            ["city", "Ciudad", "Ciudad"],
            ["state", "Estado", "Estado"],
            ["postalCode", "Código postal", "Código postal"],
          ] as const).map(([field, label, placeholder]) => {
            const missing = !addressDraft[field].trim();
            return (
            <label key={field} className="grid gap-1">
              <span className={`text-[10px] font-black uppercase ${missing ? "text-rose-300" : "text-slate-300"}`}>{label}</span>
              <input
                value={addressDraft[field]}
                onFocus={() => setActiveField(field)}
                onChange={(event) => setAddressDraft((current) => ({ ...current, [field]: event.target.value }))}
                placeholder={placeholder}
                className={`h-9 rounded-md border px-2.5 text-xs font-bold text-slate-50 outline-none ${missing ? "border-rose-400/80 bg-rose-950/25 placeholder:text-rose-200/70 focus:border-rose-300" : "border-slate-600 bg-surface-inset placeholder:text-slate-500 focus:border-emerald-300"}`}
              />
            </label>
            );
          })}
          <label className="hidden grid gap-1 sm:col-span-2">
            <span className={`text-[10px] font-black uppercase ${addressDraft.addressReference.trim() ? "text-slate-300" : "text-rose-300"}`}>Referencias</span>
            <textarea
              value={addressDraft.addressReference}
              onChange={(event) => setAddressDraft((current) => ({ ...current, addressReference: event.target.value }))}
              placeholder="Ej. segundo piso, casa roja, portón negro..."
              maxLength={500}
              className={`min-h-16 rounded-md border px-2.5 py-2 text-xs font-bold text-slate-50 outline-none ${addressDraft.addressReference.trim() ? "border-slate-600 bg-surface-inset placeholder:text-slate-500 focus:border-emerald-300" : "border-rose-400/80 bg-rose-950/25 placeholder:text-rose-200/70 focus:border-rose-300"}`}
            />
            <span className="text-[11px] font-bold leading-snug text-slate-500">Indicaciones extra para encontrar el domicilio. No afectan la verificación en Google.</span>
          </label>
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
          {([["map", "Mapa", Map], ["satellite", "Satélite", Satellite]] as const).map(([value, label, Icon]) => (
            <button key={value} type="button" onClick={() => changeMode(value)} className={`inline-flex h-9 items-center gap-2 rounded-md border px-3 text-xs font-black ${mode === value ? "border-emerald-300 bg-emerald-400 text-slate-950" : "border-slate-600 bg-surface-inset text-slate-100"}`}><Icon className="h-4 w-4" /> {label}</button>
          ))}
        </div>

        <div className="relative mt-2 min-h-[240px] min-w-0 flex-1 basis-0 overflow-hidden rounded-lg border border-black bg-[#0b100e]">
          <div ref={mapElementRef} className="h-full w-full" />
          <div className="absolute left-3 top-3 z-10 flex flex-col overflow-hidden rounded-lg border border-slate-500/80 bg-slate-950/90 shadow-xl">
              <button
                type="button"
                onClick={() => zoomMap(1)}
                disabled={!draft}
                aria-label="Acercar mapa"
                title="Acercar mapa"
                className="grid h-11 w-11 place-items-center border-b border-slate-600 text-slate-50 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ZoomIn className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => zoomMap(-1)}
                disabled={!draft}
                aria-label="Alejar mapa"
                title="Alejar mapa"
                className="grid h-11 w-11 place-items-center text-slate-50 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ZoomOut className="h-5 w-5" />
              </button>
            </div>
          {!draft ? <div className="pointer-events-none absolute inset-0 grid place-items-center bg-black/35 p-8 text-center text-sm font-black text-slate-100">Busca y selecciona una dirección para colocar el pin.</div> : null}
        </div>

        <div className="mt-2 text-xs font-bold text-slate-300">
          <span className="inline-flex items-center gap-2"><Crosshair className="h-4 w-4 text-emerald-300" /> {draft ? "Arrastra el pin rojo directamente sobre la entrada. " : ""}{status}</span>
        </div>

        {showOperationalNotes ? (
        <section className="mt-3 grid gap-2" aria-label="Referencias e instrucciones">
          <div className="flex gap-1 border-b border-white/10" role="tablist" aria-label="Tipo de nota">
            <button type="button" role="tab" aria-selected={bottomTab === "references"} onClick={() => setBottomTab("references")} className={`h-9 rounded-t-md border border-b-0 px-3 text-xs font-black ${bottomTab === "references" ? "border-emerald-300 bg-emerald-400 text-slate-950" : "border-slate-600 bg-surface-inset text-slate-200"}`}>Referencias</button>
            <button type="button" role="tab" aria-selected={bottomTab === "driverNote"} onClick={() => setBottomTab("driverNote")} className={`h-9 rounded-t-md border border-b-0 px-3 text-xs font-black ${bottomTab === "driverNote" ? "border-emerald-300 bg-emerald-400 text-slate-950" : "border-slate-600 bg-surface-inset text-slate-200"}`}>Nota para el conductor</button>
          </div>
          {bottomTab === "references" ? (
            <>
              <textarea
                role="tabpanel"
                aria-label="Referencias del domicilio"
                value={addressDraft.addressReference}
                onChange={(event) => {
                  const value = event.target.value;
                  setAddressDraft((current) => ({ ...current, addressReference: value }));
                  onAddressReferenceChange?.(value);
                }}
                maxLength={500}
                className={`min-h-16 rounded-lg border px-3 py-2 text-sm font-bold text-slate-50 outline-none ${addressDraft.addressReference.trim() ? "border-slate-600 bg-surface-inset placeholder:text-slate-500 focus:border-emerald-300" : "border-rose-400/80 bg-rose-950/25 placeholder:text-rose-200/70 focus:border-rose-300"}`}
                placeholder="Ej. segundo piso, casa roja, portón negro..."
              />
              <span className="text-[11px] font-bold leading-snug text-slate-500">Indicaciones permanentes para encontrar el domicilio.</span>
            </>
          ) : (
            <>
              <textarea role="tabpanel" aria-label="Nota para el conductor" value={draft?.note || ""} disabled={!draft} maxLength={500} onChange={(event) => setDraft((current) => current ? { ...current, note: event.target.value } : current)} className="min-h-16 rounded-lg border border-slate-600 bg-surface-inset px-3 py-2 text-sm text-slate-50 outline-none focus:border-emerald-300 disabled:opacity-40" placeholder="Portón negro, entrada por el callejón, llamar al llegar…" />
              <span className="text-[11px] font-bold leading-snug text-slate-500">Instrucciones específicas para la entrada confirmada.</span>
            </>
          )}
        </section>
        ) : null}

      </div>
      <div className="flex shrink-0 justify-end gap-2 border-t border-white/10 bg-[#111a17] px-3 py-3">
        <button type="button" onClick={closeWindow} className="h-10 rounded-md border border-slate-600 px-4 text-sm font-black text-slate-100">Cancelar</button>
        <button type="button" disabled={!draft || confirming} onClick={() => void confirmEntrance()} className="inline-flex h-10 items-center gap-2 rounded-md bg-emerald-400 px-5 text-sm font-black text-slate-950 disabled:opacity-40"><MapPin className="h-4 w-4" /> {confirming ? "Guardando..." : "Confirmar ubicación"}</button>
      </div>
    </main>,
    hostWindow.document.body,
  );
}
