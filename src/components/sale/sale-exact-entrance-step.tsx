"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  BookOpen,
  Building2,
  Car,
  Check,
  ChevronDown,
  Clock,
  CornerDownRight,
  Delete,
  DoorOpen,
  Edit3,
  Fence,
  FileText,
  History,
  Keyboard,
  Map,
  MapPin,
  Plus,
  Satellite,
  Trash2,
  Truck,
  Undo2,
  User,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

const KEYBOARD_ROWS = [
  ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
  ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
  ["A", "S", "D", "F", "G", "H", "J", "K", "L", "Ñ"],
  ["Z", "X", "C", "V", "B", "N", "M", "-", ",", "."],
];

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

export type MapAddressFields = Pick<
  MapResolvedAddress,
  "street" | "houseNumber" | "neighborhood" | "city" | "state" | "postalCode" | "country"
> & {
  addressReference: string;
};

type LatLngValue = { lat: () => number; lng: () => number };
type MapBoundsInstance = {
  getNorthEast: () => LatLngValue;
  getSouthWest: () => LatLngValue;
};
type MapInstance = {
  setMapTypeId: (type: string) => void;
  setOptions: (options: Record<string, unknown>) => void;
  panTo: (position: { lat: number; lng: number }) => void;
  getZoom: () => number;
  setZoom: (zoom: number) => void;
  getBounds: () => MapBoundsInstance | null;
  addListener: (event: string, listener: (e: { latLng: LatLngValue }) => void) => unknown;
};
type MarkerInstance = {
  setMap: (map: MapInstance | null) => void;
  setPosition: (position: { lat: number; lng: number }) => void;
  getPosition: () => LatLngValue | null;
  setTitle: (title: string) => void;
  setIcon: (icon: unknown) => void;
  setZIndex: (zIndex: number) => void;
  addListener: (event: string, listener: () => void) => unknown;
};
type MapsRuntime = {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => MapInstance;
  Marker: new (options: Record<string, unknown>) => MarkerInstance;
};

type LastPinMove = {
  tag: EntranceTagId;
  previous: AccessPointData;
  movedTo: { lat: number; lng: number };
};

const DEFAULT_CENTER = { lat: 39.5, lng: -98.35 };

export const ENTRANCE_TAGS = [
  {
    id: "Entrada principal",
    label: "Entrada principal",
    shortLabel: "Entrada",
    icon: DoorOpen,
    color: "#10b981",
    letter: "E",
  },
  {
    id: "Garaje",
    label: "Garaje / Cochera",
    shortLabel: "Garaje",
    icon: Car,
    color: "#0284c7",
    letter: "G",
  },
  {
    id: "Portón",
    label: "Portón",
    shortLabel: "Portón",
    icon: Fence,
    color: "#f59e0b",
    letter: "P",
  },
  {
    id: "Recepción",
    label: "Recepción / Lobby",
    shortLabel: "Recepción",
    icon: Building2,
    color: "#8b5cf6",
    letter: "R",
  },
  {
    id: "Muelle de carga",
    label: "Muelle de carga",
    shortLabel: "Muelle",
    icon: Truck,
    color: "#6366f1",
    letter: "M",
  },
  {
    id: "Puerta trasera",
    label: "Puerta trasera",
    shortLabel: "Puerta trasera",
    icon: CornerDownRight,
    color: "#f43f5e",
    letter: "T",
  },
  {
    id: "Otro",
    label: "Otro punto",
    shortLabel: "Otro",
    icon: MapPin,
    color: "#14b8a6",
    letter: "O",
  },
] as const;

export type EntranceTagId = (typeof ENTRANCE_TAGS)[number]["id"];

export type NoteHistoryEntry = {
  id: string;
  action: "created" | "updated" | "deleted";
  actorName: string;
  timestamp: string;
  previousNote?: string;
  note: string;
};

export type NoteMetadata = {
  author: string;
  createdAt: string;
  updatedAt?: string;
  updatedBy?: string;
  history: NoteHistoryEntry[];
};

export type AccessPointData = {
  lat: number;
  lng: number;
  detail: string;
  customLabel?: string;
  noteMeta?: NoteMetadata;
};

export type AccessPointsState = Partial<Record<EntranceTagId, AccessPointData>>;

function formatJournalDate(isoString?: string): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString("es-ES", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return isoString;
  }
}

function formatJournalTime(isoString?: string): string {
  if (!isoString) return "";
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

function createMarkerIconSvg(color: string, letter: string, isSelected: boolean) {
  const width = isSelected ? 36 : 28;
  const height = isSelected ? 46 : 36;
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 36 46">
      <path d="M18 0 C8 0 0 8 0 18 C0 29 18 46 18 46 C18 46 36 29 36 18 C36 8 28 0 18 0 Z" 
            fill="${color}" 
            stroke="#ffffff" 
            stroke-width="${isSelected ? 2.5 : 1.5}"/>
      <circle cx="18" cy="17" r="9" fill="#ffffff" />
      <text x="18" y="21" font-size="11" font-weight="900" font-family="system-ui, -apple-system, sans-serif" fill="${color}" text-anchor="middle">${letter}</text>
    </svg>
  `;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function getMarkerIcon(maps: MapsRuntime, color: string, letter: string, isSelected: boolean) {
  const width = isSelected ? 36 : 28;
  const height = isSelected ? 46 : 36;
  const svgUrl = createMarkerIconSvg(color, letter, isSelected);

  const mapsAny = maps as unknown as {
    Size?: new (w: number, h: number) => unknown;
    Point?: new (x: number, y: number) => unknown;
  };

  if (typeof mapsAny.Size === "function" && typeof mapsAny.Point === "function") {
    return {
      url: svgUrl,
      scaledSize: new mapsAny.Size(width, height),
      anchor: new mapsAny.Point(width / 2, height),
    };
  }

  return svgUrl;
}

function getAddressLocationIcon(maps: MapsRuntime) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 34 34">
    <circle cx="17" cy="17" r="11" fill="#0f172a" fill-opacity=".9" stroke="#ffffff" stroke-width="2.5"/>
    <circle cx="17" cy="17" r="4" fill="#ffffff"/>
    <path d="M17 2v7M17 25v7M2 17h7M25 17h7" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
  </svg>`;
  const mapsAny = maps as unknown as {
    Size?: new (w: number, h: number) => unknown;
    Point?: new (x: number, y: number) => unknown;
  };
  const url = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  if (typeof mapsAny.Size === "function" && typeof mapsAny.Point === "function") {
    return {
      url,
      scaledSize: new mapsAny.Size(34, 34),
      anchor: new mapsAny.Point(17, 17),
    };
  }
  return url;
}

export function parseAccessPoints(
  rawNote?: string | null,
  fallbackCoords?: { lat: number; lng: number } | null,
): {
  points: AccessPointsState;
  activeTag: EntranceTagId;
  customLabels: Partial<Record<EntranceTagId, string>>;
} {
  const text = (rawNote || "").trim();
  const points: AccessPointsState = {};
  const customLabels: Partial<Record<EntranceTagId, string>> = {};

  if (!text) {
    if (fallbackCoords && isValidGeoPoint(fallbackCoords)) {
      points["Entrada principal"] = {
        lat: fallbackCoords.lat,
        lng: fallbackCoords.lng,
        detail: "",
      };
    }
    return { points, activeTag: "Entrada principal", customLabels };
  }

  const segments = text.split(/\s*\|\s*|\s*•\s*/);
  let firstTag: EntranceTagId | null = null;

  for (const seg of segments) {
    const trimmed = seg.trim();
    if (!trimmed) continue;

    // Pattern 1: [Tag: 34.12345, -118.12345] Detail
    const matchWithCoords = trimmed.match(/^\[(.*?):\s*([-\d.]+)\s*,\s*([-\d.]+)\]\s*(.*)$/);
    if (matchWithCoords) {
      const rawTagName = matchWithCoords[1].trim();
      const lat = parseFloat(matchWithCoords[2]);
      const lng = parseFloat(matchWithCoords[3]);
      const detail = matchWithCoords[4].trim();

      let tagId: EntranceTagId = "Otro";
      let customLabel: string | undefined = undefined;

      const otroMatch = rawTagName.match(/^Otro\s*\((.*?)\)$/i);
      if (otroMatch) {
        tagId = "Otro";
        customLabel = otroMatch[1].trim();
      } else {
        const known = ENTRANCE_TAGS.find((t) => t.id.toLowerCase() === rawTagName.toLowerCase());
        if (known) {
          tagId = known.id;
        } else {
          tagId = "Otro";
          customLabel = rawTagName;
        }
      }

      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        points[tagId] = { lat, lng, detail, customLabel };
        if (customLabel) customLabels[tagId] = customLabel;
        if (!firstTag) firstTag = tagId;
        continue;
      }
    }

    // Pattern 2: [Tag] Detail
    const matchTag = trimmed.match(/^\[(.*?)\]\s*(.*)$/);
    if (matchTag) {
      const rawTagName = matchTag[1].trim();
      const detail = matchTag[2].trim();

      let tagId: EntranceTagId = "Otro";
      let customLabel: string | undefined = undefined;

      const otroMatch = rawTagName.match(/^Otro\s*\((.*?)\)$/i);
      if (otroMatch) {
        tagId = "Otro";
        customLabel = otroMatch[1].trim();
      } else {
        const known = ENTRANCE_TAGS.find((t) => t.id.toLowerCase() === rawTagName.toLowerCase());
        if (known) {
          tagId = known.id;
        } else {
          tagId = "Otro";
          customLabel = rawTagName;
        }
      }

      const coords = fallbackCoords && isValidGeoPoint(fallbackCoords) ? fallbackCoords : { lat: 0, lng: 0 };
      if (coords.lat !== 0 || coords.lng !== 0) {
        points[tagId] = { lat: coords.lat, lng: coords.lng, detail, customLabel };
        if (customLabel) customLabels[tagId] = customLabel;
        if (!firstTag) firstTag = tagId;
      }
      continue;
    }
  }

  if (Object.keys(points).length === 0) {
    if (fallbackCoords && isValidGeoPoint(fallbackCoords)) {
      points["Entrada principal"] = {
        lat: fallbackCoords.lat,
        lng: fallbackCoords.lng,
        detail: text,
      };
      return { points, activeTag: "Entrada principal", customLabels };
    }
  }

  return { points, activeTag: firstTag || "Entrada principal", customLabels };
}

export function formatAccessPoints(points: AccessPointsState): {
  primary: { lat: number; lng: number } | null;
  note: string;
} {
  const entries = Object.entries(points).filter(
    (e): e is [EntranceTagId, AccessPointData] =>
      Boolean(e[1] && Number.isFinite(e[1].lat) && Number.isFinite(e[1].lng)),
  );

  if (entries.length === 0) {
    return { primary: null, note: "" };
  }

  const mainEntry = entries.find(([tag]) => tag === "Entrada principal") || entries[0];
  const primary = { lat: mainEntry[1].lat, lng: mainEntry[1].lng };

  const note = entries
    .map(([tag, data]) => {
      const detail = data.detail.trim();
      const coordsStr = `${data.lat.toFixed(5)}, ${data.lng.toFixed(5)}`;
      const tagDisplay =
        tag === "Otro" && data.customLabel?.trim()
          ? `Otro (${data.customLabel.trim()})`
          : tag;
      return `[${tagDisplay}: ${coordsStr}]${detail ? ` ${detail}` : ""}`;
    })
    .join(" • ");

  return { primary, note };
}

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
  const currentMain = (window as Window & { google?: { maps?: MapsRuntime } }).google?.maps;
  if (currentMain) return Promise.resolve(currentMain);

  const mapWindow = targetWindow as Window & { google?: { maps?: MapsRuntime } };
  const currentTarget = mapWindow.google?.maps;
  if (currentTarget) return Promise.resolve(currentTarget);

  return new Promise((resolve, reject) => {
    let done = false;
    const check = () => {
      if (done) return true;
      const maps =
        (window as Window & { google?: { maps?: MapsRuntime } }).google?.maps ||
        (targetWindow as Window & { google?: { maps?: MapsRuntime } }).google?.maps;
      if (maps) {
        done = true;
        resolve(maps);
        return true;
      }
      return false;
    };

    if (check()) return;

    const script = ensureGoogleMapsScript(apiKey, targetWindow);
    const interval = targetWindow.setInterval(() => {
      if (check()) {
        targetWindow.clearInterval(interval);
      }
    }, 60);

    const loaded = () => {
      targetWindow.clearInterval(interval);
      if (!check()) {
        reject(new Error("Google Maps no pudo iniciar"));
      }
    };

    script.addEventListener("load", loaded, { once: true });
    script.addEventListener(
      "error",
      () => {
        targetWindow.clearInterval(interval);
        reject(new Error("No se pudo cargar Google Maps"));
      },
      { once: true },
    );

    targetWindow.setTimeout(() => {
      targetWindow.clearInterval(interval);
      if (!check()) {
        reject(new Error("Tiempo de espera agotado para Google Maps"));
      }
    }, 10000);
  });
}

function isValidGeoPoint(
  point?: { lat?: number | null; lng?: number | null } | null,
): point is { lat: number; lng: number } {
  return Boolean(
    point &&
      typeof point.lat === "number" &&
      Number.isFinite(point.lat) &&
      typeof point.lng === "number" &&
      Number.isFinite(point.lng) &&
      !(point.lat === 0 && point.lng === 0),
  );
}

let exactEntrancePopup: Window | null = null;

export function openExactEntranceBrowserWindow() {
  const width = Math.min(960, window.screen.availWidth || 960);
  const height = Math.min(880, window.screen.availHeight || 880);
  const left = Math.max(0, window.screenX + Math.round((window.outerWidth - width) / 2));
  const top = Math.max(0, window.screenY + 24);
  if (exactEntrancePopup && !exactEntrancePopup.closed) {
    exactEntrancePopup.close();
  }
  exactEntrancePopup = null;

  const popup = window.open(
    "",
    "boxario-entry-map",
    `popup=yes,width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes`,
  );
  if (popup) {
    exactEntrancePopup = popup;
    const popupDocument = popup.document;
    popupDocument.title = "Boxario · Ubicar entrada exacta";
    const viewport = popupDocument.createElement("meta");
    viewport.name = "viewport";
    viewport.content = "width=device-width, initial-scale=1, viewport-fit=cover";
    popupDocument.head.appendChild(viewport);
    popupDocument.documentElement.className = document.documentElement.className;
    popupDocument.body.className = document.body.className;
    popupDocument.body.style.margin = "0";
    popupDocument.body.style.background = "#111a17";
    popupDocument.body.style.height = "100vh";
    popupDocument.body.style.overflow = "hidden";
    document.head.querySelectorAll('link[rel="stylesheet"], style').forEach((node) => {
      popupDocument.head.appendChild(node.cloneNode(true));
    });
    popup.addEventListener(
      "beforeunload",
      () => {
        if (exactEntrancePopup === popup) exactEntrancePopup = null;
      },
      { once: true },
    );
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
  onConfirm,
  showOperationalNotes = true,
  authorName = "Operador",
}: {
  open: boolean;
  personLabel: string;
  country: string;
  addressFields: MapAddressFields;
  addressLocation?: { lat: number; lng: number } | null;
  initialEntrance?: ExactEntranceDraft | null;
  hostWindow: Window;
  onClose: () => void;
  onAddressResolved?: (address: MapResolvedAddress) => void;
  onAddressReferenceChange?: (value: string) => void;
  onConfirm: (draft: ExactEntranceDraft) => void | Promise<void>;
  showOperationalNotes?: boolean;
  authorName?: string;
}) {
  const mapElementRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapInstance | null>(null);
  const markersRef = useRef<Partial<Record<EntranceTagId, MarkerInstance>>>({});
  const addressMarkerRef = useRef<MarkerInstance | null>(null);
  const runtimeRef = useRef<MapsRuntime | null>(null);
  const onCloseRef = useRef(onClose);
  const hostWindowRef = useRef(hostWindow);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  const validInitialEntrance = isValidGeoPoint(initialEntrance) ? initialEntrance : null;
  const validAddressLocation = isValidGeoPoint(addressLocation) ? addressLocation : null;
  const [mapAddressLocation, setMapAddressLocation] = useState(validAddressLocation);

  // Solo se cargan pines iniciales si provienen de una ubicación explícitamente guardada (validInitialEntrance).
  // La dirección general (validAddressLocation) solo se usa para centrar la cámara del mapa, nunca para auto-crear pines.
  const initialParsed = parseAccessPoints(initialEntrance?.note, validInitialEntrance);
  const [points, setPoints] = useState<AccessPointsState>(initialParsed.points);
  const [selectedTag, setSelectedTag] = useState<EntranceTagId>(initialParsed.activeTag);
  const [draft, setDraft] = useState<ExactEntranceDraft | null>(validInitialEntrance);
  const [customLabels, setCustomLabels] = useState<Partial<Record<EntranceTagId, string>>>(
    () => initialParsed.customLabels || {},
  );
  const [tagNotes, setTagNotes] = useState<Partial<Record<EntranceTagId, string>>>(() => {
    const initialNotes: Partial<Record<EntranceTagId, string>> = {};
    Object.entries(initialParsed.points).forEach(([tag, data]) => {
      if (data?.detail) initialNotes[tag as EntranceTagId] = data.detail;
    });
    return initialNotes;
  });

  const [notebookTab, setNotebookTab] = useState<"sheet" | "history">("sheet");
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editingNoteDraft, setEditingNoteDraft] = useState(
    () => initialParsed.points[initialParsed.activeTag]?.detail || "",
  );

  const [notesMetadata, setNotesMetadata] = useState<Partial<Record<EntranceTagId, NoteMetadata>>>(() => {
    const meta: Partial<Record<EntranceTagId, NoteMetadata>> = {};
    const now = new Date().toISOString();
    Object.entries(initialParsed.points).forEach(([tag, data]) => {
      if (data?.detail) {
        meta[tag as EntranceTagId] = {
          author: authorName,
          createdAt: now,
          history: [
            {
              id: `hist-${Date.now()}-${tag}`,
              action: "created",
              actorName: authorName,
              timestamp: now,
              note: data.detail,
            },
          ],
        };
      }
    });
    return meta;
  });

  const selectedTagRef = useRef(selectedTag);
  const pointsRef = useRef(points);
  const tagNotesRef = useRef(tagNotes);
  const customLabelsRef = useRef(customLabels);

  useEffect(() => {
    selectedTagRef.current = selectedTag;
  }, [selectedTag]);

  useEffect(() => {
    pointsRef.current = points;
  }, [points]);

  useEffect(() => {
    tagNotesRef.current = tagNotes;
  }, [tagNotes]);

  useEffect(() => {
    customLabelsRef.current = customLabels;
  }, [customLabels]);

  const [mode, setMode] = useState<"map" | "satellite">("satellite");
  const [showMapLabels, setShowMapLabels] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [addPinOpen, setAddPinOpen] = useState(false);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const [activeInputField, setActiveInputField] = useState<"note" | "customLabel">("note");
  const [status, setStatus] = useState(
    apiKey ? `Selecciona un tag y pulsa en el mapa para ubicar su pin.` : "Falta configurar Google Maps.",
  );
  const [lastPinMove, setLastPinMove] = useState<LastPinMove | null>(null);

  const addPinRef = useRef<HTMLDivElement | null>(null);
  const notePopoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (addPinRef.current && !addPinRef.current.contains(event.target as Node)) {
        setAddPinOpen(false);
      }
      if (notePopoverRef.current && !notePopoverRef.current.contains(event.target as Node)) {
        setShowNoteInput(false);
      }
    }
    const win = hostWindowRef.current || (typeof window !== "undefined" ? window : null);
    if (win) {
      win.addEventListener("mousedown", handleClickOutside);
      return () => {
        win.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, []);

  function handleSaveNote() {
    const currentTag = selectedTagRef.current;
    const currentTagInfo = ENTRANCE_TAGS.find((t) => t.id === currentTag) || ENTRANCE_TAGS[0];
    const previousNote = tagNotesRef.current[currentTag] ?? pointsRef.current[currentTag]?.detail ?? "";
    const newNote = editingNoteDraft.trim();
    const now = new Date().toISOString();

    if (newNote === previousNote) {
      setIsEditingNote(false);
      return;
    }

    const currentMeta = notesMetadata[currentTag];
    const isNew = !previousNote;

    const newHistoryEntry: NoteHistoryEntry = {
      id: `hist-${Date.now()}-${currentTag}`,
      action: isNew ? "created" : "updated",
      actorName: authorName,
      timestamp: now,
      previousNote: isNew ? undefined : previousNote,
      note: newNote,
    };

    setNotesMetadata((prev) => ({
      ...prev,
      [currentTag]: {
        author: currentMeta?.author || authorName,
        createdAt: currentMeta?.createdAt || now,
        updatedAt: isNew ? undefined : now,
        updatedBy: isNew ? undefined : authorName,
        history: [...(currentMeta?.history || []), newHistoryEntry],
      },
    }));

    handleDetailChange(newNote);
    setIsEditingNote(false);
    setStatus(
      newNote
        ? `Nota guardada en libreta para "${currentTagInfo.shortLabel}".`
        : `Nota eliminada para "${currentTagInfo.shortLabel}".`,
    );
  }

  function handleDeleteNote(tag: EntranceTagId) {
    const currentTagInfo = ENTRANCE_TAGS.find((t) => t.id === tag) || ENTRANCE_TAGS[0];
    const previousNote = tagNotesRef.current[tag] ?? pointsRef.current[tag]?.detail ?? "";
    if (!previousNote) return;
    const now = new Date().toISOString();
    const currentMeta = notesMetadata[tag];

    const deleteHistoryEntry: NoteHistoryEntry = {
      id: `hist-${Date.now()}-${tag}`,
      action: "deleted",
      actorName: authorName,
      timestamp: now,
      previousNote,
      note: "",
    };

    setNotesMetadata((prev) => ({
      ...prev,
      [tag]: {
        author: currentMeta?.author || authorName,
        createdAt: currentMeta?.createdAt || now,
        updatedAt: now,
        updatedBy: authorName,
        history: [...(currentMeta?.history || []), deleteHistoryEntry],
      },
    }));

    handleDetailChange("");
    setEditingNoteDraft("");
    setIsEditingNote(false);
    setStatus(`Nota de "${currentTagInfo.shortLabel}" eliminada.`);
  }

  function handleVirtualKeyPress(key: string) {
    if (activeInputField === "customLabel" && selectedTagRef.current === "Otro") {
      setCustomLabels((prev) => {
        const current = prev.Otro || "";
        const next = current + key;
        handleCustomLabelChange("Otro", next);
        return { ...prev, Otro: next };
      });
    } else {
      setShowNoteInput(true);
      setIsEditingNote(true);
      setEditingNoteDraft((prev) => prev + key);
    }
  }

  function handleVirtualBackspace() {
    if (activeInputField === "customLabel" && selectedTagRef.current === "Otro") {
      setCustomLabels((prev) => {
        const current = prev.Otro || "";
        const next = current.slice(0, -1);
        handleCustomLabelChange("Otro", next);
        return { ...prev, Otro: next };
      });
    } else {
      setEditingNoteDraft((prev) => prev.slice(0, -1));
    }
  }

  function handleVirtualClear() {
    if (activeInputField === "customLabel" && selectedTagRef.current === "Otro") {
      handleCustomLabelChange("Otro", "");
    } else {
      setEditingNoteDraft("");
    }
  }

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

  // Sync draft when points state changes
  useEffect(() => {
    const { primary, note } = formatAccessPoints(points);
    if (primary) {
      setDraft({
        lat: primary.lat,
        lng: primary.lng,
        note,
        panoId: initialEntrance?.panoId,
        heading: initialEntrance?.heading,
        pitch: initialEntrance?.pitch,
      });
    } else {
      setDraft(null);
    }
  }, [points, initialEntrance]);

  function syncMapMarkers(
    maps: MapsRuntime,
    map: MapInstance,
    currentPoints: AccessPointsState,
    currentSelectedTag: EntranceTagId,
  ) {
    ENTRANCE_TAGS.forEach((tagInfo) => {
      const tagId = tagInfo.id;
      const pointData = currentPoints[tagId];
      const existingMarker = markersRef.current[tagId];

      if (pointData && Number.isFinite(pointData.lat) && Number.isFinite(pointData.lng)) {
        const isSelected = currentSelectedTag === tagId;
        const icon = getMarkerIcon(maps, tagInfo.color, tagInfo.letter, isSelected);
        const pointCustomLabel = pointData.customLabel || customLabelsRef.current[tagId];
        const displayTitle =
          tagId === "Otro" && pointCustomLabel?.trim()
            ? `Otro (${pointCustomLabel.trim()})${pointData.detail ? `: ${pointData.detail}` : ""}`
            : `${tagInfo.label}${pointData.detail ? `: ${pointData.detail}` : ""}`;

        if (existingMarker) {
          existingMarker.setPosition({ lat: pointData.lat, lng: pointData.lng });
          existingMarker.setIcon(icon);
          existingMarker.setTitle(displayTitle);
          existingMarker.setZIndex(isSelected ? 1000 : 500);
        } else {
          const marker = new maps.Marker({
            position: { lat: pointData.lat, lng: pointData.lng },
            map,
            draggable: true,
            cursor: "grab",
            title: displayTitle,
            icon,
            zIndex: isSelected ? 1000 : 500,
            animation: 2,
          });

          marker.addListener("dragend", () => {
            const pos = marker.getPosition();
            if (!pos) return;
            const newLat = pos.lat();
            const newLng = pos.lng();
            const previousPoint = pointsRef.current[tagId];
            if (previousPoint) {
              setLastPinMove({
                tag: tagId,
                previous: { ...previousPoint },
                movedTo: { lat: newLat, lng: newLng },
              });
            }
            const currentCustom = customLabelsRef.current[tagId];
            setPoints((prev) => ({
              ...prev,
              [tagId]: {
                lat: newLat,
                lng: newLng,
                detail: prev[tagId]?.detail || tagNotesRef.current[tagId] || "",
                customLabel: currentCustom,
              },
            }));
            setSelectedTag(tagId);
            const shortTitle = tagId === "Otro" && currentCustom?.trim() ? currentCustom.trim() : tagInfo.shortLabel;
            setStatus(`Pin de "${shortTitle}" movido. Puedes deshacer este movimiento.`);
          });

          marker.addListener("click", () => {
            setSelectedTag(tagId);
            const currentCustom = customLabelsRef.current[tagId];
            const shortTitle = tagId === "Otro" && currentCustom?.trim() ? currentCustom.trim() : tagInfo.label;
            setStatus(`Punto seleccionado: "${shortTitle}"`);
          });

          markersRef.current[tagId] = marker;
        }
      } else {
        if (existingMarker) {
          existingMarker.setMap(null);
          delete markersRef.current[tagId];
        }
      }
    });
  }

  function syncAddressMarker(maps: MapsRuntime, map: MapInstance, location: { lat: number; lng: number } | null) {
    if (!location) {
      addressMarkerRef.current?.setMap(null);
      addressMarkerRef.current = null;
      return;
    }
    const title = "Ubicación exacta de la dirección postal";
    if (addressMarkerRef.current) {
      addressMarkerRef.current.setPosition(location);
      addressMarkerRef.current.setTitle(title);
      return;
    }
    addressMarkerRef.current = new maps.Marker({
      position: location,
      map,
      title,
      icon: getAddressLocationIcon(maps),
      zIndex: 200,
    });
  }

  // Synchronize Google Maps markers with the points state
  useEffect(() => {
    const map = mapRef.current;
    const maps = runtimeRef.current;
    if (!map || !maps) return;
    syncMapMarkers(maps, map, points, selectedTag);
  }, [points, selectedTag, customLabels]);

  useEffect(() => {
    const map = mapRef.current;
    const maps = runtimeRef.current;
    if (!map || !maps) return;
    syncAddressMarker(maps, map, mapAddressLocation);
  }, [mapAddressLocation]);

  function handleCustomLabelChange(tag: EntranceTagId, label: string) {
    setCustomLabels((prev) => ({ ...prev, [tag]: label }));
    setPoints((prev) => {
      const existing = prev[tag];
      if (!existing) return prev;
      return {
        ...prev,
        [tag]: {
          ...existing,
          customLabel: label,
        },
      };
    });
  }

  function handleMapClick(lat: number, lng: number) {
    const currentTag = selectedTagRef.current;
    const currentTagInfo = ENTRANCE_TAGS.find((t) => t.id === currentTag) || ENTRANCE_TAGS[0];
    const currentDetail = tagNotesRef.current[currentTag] ?? pointsRef.current[currentTag]?.detail ?? "";
    const customLabel = customLabelsRef.current[currentTag] ?? pointsRef.current[currentTag]?.customLabel;
    setLastPinMove(null);
    setPoints((prev) => {
      return {
        ...prev,
        [currentTag]: {
          lat,
          lng,
          detail: currentDetail,
          customLabel,
        },
      };
    });
    const labelDisplayName =
      currentTag === "Otro" && customLabel?.trim()
        ? `Otro (${customLabel.trim()})`
        : currentTagInfo.shortLabel;
    setStatus(`Pin de "${labelDisplayName}" colocado en (${lat.toFixed(5)}, ${lng.toFixed(5)})`);
  }

  function handleTagSelect(tag: EntranceTagId) {
    setSelectedTag(tag);
    setIsEditingNote(false);
    setEditingNoteDraft(tagNotes[tag] ?? points[tag]?.detail ?? "");
    const placed = points[tag];
    if (placed && mapRef.current) {
      mapRef.current.panTo({ lat: placed.lat, lng: placed.lng });
      setStatus(`Editando pin de "${tag}". Puedes arrastrarlo o escribir una instrucción.`);
    } else {
      setStatus(`Pulsa en el mapa para colocar el pin de "${tag}".`);
    }
  }

  function removePin(tag: EntranceTagId) {
    setLastPinMove(null);
    setPoints((prev) => {
      const next = { ...prev };
      delete next[tag];
      return next;
    });
    setTagNotes((prev) => {
      const next = { ...prev };
      delete next[tag];
      return next;
    });
    setCustomLabels((prev) => {
      const next = { ...prev };
      delete next[tag];
      return next;
    });
    const remainingPlaced = Object.keys(points).filter((k) => k !== tag) as EntranceTagId[];
    if (remainingPlaced.length > 0) {
      setSelectedTag(remainingPlaced[0]);
    } else {
      setSelectedTag("Entrada principal");
    }
    setShowNoteInput(false);
    setStatus(`Pin de "${tag}" eliminado.`);
  }

  function undoLastPinMove() {
    if (!lastPinMove) return;
    const { tag, previous, movedTo } = lastPinMove;
    const current = pointsRef.current[tag];
    if (!current || current.lat !== movedTo.lat || current.lng !== movedTo.lng) {
      setLastPinMove(null);
      return;
    }
    setPoints((prev) => ({ ...prev, [tag]: previous }));
    setSelectedTag(tag);
    setLastPinMove(null);
    setStatus(`Movimiento deshecho. El pin de "${tag}" volvió a su lugar anterior.`);
  }

  function handleDetailChange(detail: string) {
    const currentTag = selectedTagRef.current;
    setTagNotes((prev) => ({ ...prev, [currentTag]: detail }));
    setPoints((prev) => {
      const existing = prev[currentTag];
      if (!existing) return prev;
      return {
        ...prev,
        [currentTag]: {
          ...existing,
          detail,
        },
      };
    });
  }

  useEffect(() => {
    if (!open || !apiKey || !mapElementRef.current) return;
    let cancelled = false;

    void loadGoogleMaps(apiKey, hostWindowRef.current)
      .then((maps) => {
        if (cancelled || !mapElementRef.current) return;
        runtimeRef.current = maps;

        const hasValidPoint = isValidGeoPoint(draft) || isValidGeoPoint(validAddressLocation);
        const point = isValidGeoPoint(draft)
          ? draft
          : isValidGeoPoint(validAddressLocation)
            ? validAddressLocation
            : DEFAULT_CENTER;

        const map = new maps.Map(mapElementRef.current, {
          center: { lat: point.lat, lng: point.lng },
          zoom: hasValidPoint ? 20 : 4,
          mapTypeId: showMapLabels ? "hybrid" : "satellite",
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          draggable: true,
          gestureHandling: "greedy",
          scrollwheel: true,
          disableDoubleClickZoom: false,
          clickableIcons: false,
        });
        mapRef.current = map;

        // Render existing markers immediately when map loads
        syncMapMarkers(maps, map, pointsRef.current, selectedTagRef.current);
        syncAddressMarker(maps, map, mapAddressLocation);

        map.addListener("click", (e: { latLng: LatLngValue }) => {
          handleMapClick(e.latLng.lat(), e.latLng.lng());
        });

        const triggerResize = () => {
          if (mapRef.current) {
            try {
              const mapsAny = runtimeRef.current as unknown as {
                event?: { trigger: (instance: unknown, eventName: string) => void };
              };
              mapsAny?.event?.trigger(mapRef.current, "resize");
            } catch {}
          }
        };

        const targetWin = hostWindowRef.current;
        if (targetWin) {
          targetWin.requestAnimationFrame(() => {
            triggerResize();
            targetWin.setTimeout(triggerResize, 150);
          });
        }

        if (hasValidPoint) {
          const firstPlaced = Object.values(pointsRef.current).find(
            (p): p is AccessPointData => Boolean(p && Number.isFinite(p.lat) && Number.isFinite(p.lng)),
          );
          if (firstPlaced) {
            map.panTo({ lat: firstPlaced.lat, lng: firstPlaced.lng });
            map.setZoom(20);
          }
        } else {
          const addressQuery = [
            addressFields.street,
            addressFields.houseNumber,
            addressFields.neighborhood,
            addressFields.city,
            addressFields.state,
            addressFields.postalCode,
          ]
            .filter(Boolean)
            .join(", ");

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
              .then((data: { ok?: boolean; address?: { lat?: number | null; lng?: number | null } }) => {
                if (!data.address || data.address.lat == null || data.address.lng == null || mapRef.current !== map) {
                  return;
                }
                const nextLocation = { lat: data.address.lat, lng: data.address.lng };
                setMapAddressLocation(nextLocation);
                syncAddressMarker(maps, map, nextLocation);
                map.panTo(nextLocation);
                map.setZoom(20);
                setStatus("Dirección ubicada. El punto blanco marca la dirección; elige un tag para colocar un pin operativo.");
              })
              .catch(() => {
                map.panTo(DEFAULT_CENTER);
                map.setZoom(5);
              });
          }
        }
      })
      .catch((error) => setStatus(error instanceof Error ? error.message : "Mapa no disponible"));

    return () => {
      cancelled = true;
      Object.values(markersRef.current).forEach((marker) => marker?.setMap(null));
      markersRef.current = {};
      addressMarkerRef.current?.setMap(null);
      addressMarkerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey, country, open]);

  function mapTypeForMode(nextMode: "map" | "satellite", labels = showMapLabels) {
    if (nextMode === "map") return "roadmap";
    return labels ? "hybrid" : "satellite";
  }

  function changeMode(next: "map" | "satellite") {
    setMode(next);
    const map = mapRef.current;
    if (!map) return;
    const mapTypeId = mapTypeForMode(next);
    map.setMapTypeId(mapTypeId);
    map.setOptions({ mapTypeId });
  }

  function toggleMapLabels() {
    const next = !showMapLabels;
    setShowMapLabels(next);
    if (mode !== "satellite" || !mapRef.current) return;
    const mapTypeId = mapTypeForMode("satellite", next);
    mapRef.current.setMapTypeId(mapTypeId);
    mapRef.current.setOptions({ mapTypeId });
  }

  function zoomMap(delta: number) {
    if (!mapRef.current) return;
    const currentZoom = mapRef.current.getZoom();
    mapRef.current.setZoom(Math.max(3, Math.min(21, currentZoom + delta)));
  }

  function closeWindow() {
    onClose();
    if (!hostWindowRef.current.closed) hostWindowRef.current.close();
  }

  async function confirmEntrance() {
    if (!draft || confirming) return;
    const point = draft;
    setConfirming(true);
    try {
      const { primary, note } = formatAccessPoints(points);
      const draftToSave: ExactEntranceDraft = {
        lat: primary ? primary.lat : point.lat,
        lng: primary ? primary.lng : point.lng,
        note: note || point.note,
        panoId: point.panoId,
        heading: point.heading,
        pitch: point.pitch,
      };
      const draft = draftToSave;
      await onConfirm(draft);
      if (!hostWindowRef.current.closed) hostWindowRef.current.close();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "No se pudo guardar la entrada exacta.");
    } finally {
      setConfirming(false);
    }
  }

  if (!open || typeof document === "undefined" || hostWindow.closed) return null;

  const addressSummary = [
    addressFields.street,
    addressFields.houseNumber,
    addressFields.neighborhood,
    addressFields.city,
    addressFields.state,
  ]
    .filter(Boolean)
    .join(", ");

  const activePointData = points[selectedTag];
  const activeTagInfo = ENTRANCE_TAGS.find((t) => t.id === selectedTag) || ENTRANCE_TAGS[0];
  const ActiveTagIcon = activeTagInfo.icon;
  const activeNote = activePointData?.detail ?? tagNotes[selectedTag] ?? "";
  const placedCount = Object.keys(points).length;
  const placedTags = ENTRANCE_TAGS.filter((tag) => Boolean(points[tag.id]));
  const placedTagIds = new Set(Object.keys(points) as EntranceTagId[]);
  const displayedTagIds = Array.from(new Set([...Array.from(placedTagIds), selectedTag]));
  const displayedTags = ENTRANCE_TAGS.filter((tag) => displayedTagIds.includes(tag.id));
  const availableUnselectedTags = ENTRANCE_TAGS.filter(
    (tag) => !placedTagIds.has(tag.id) && tag.id !== selectedTag,
  );

  const currentPinMeta = notesMetadata[selectedTag];
  const notesWithContentCount = Object.values(points).filter((p) => Boolean(p?.detail?.trim())).length;
  const hasAnyNotes = notesWithContentCount > 0;

  const allHistoryEntries = Object.entries(notesMetadata)
    .flatMap(([tag, meta]) =>
      (meta?.history || []).map((h) => ({
        ...h,
        tag: tag as EntranceTagId,
        tagInfo: ENTRANCE_TAGS.find((t) => t.id === tag) || ENTRANCE_TAGS[0],
      })),
    )
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return createPortal(
    <main
      className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-[#0a100d] text-slate-100 font-sans select-none"
      aria-label={`Mapa de entrada de ${personLabel}`}
    >
      {/* Zona superior: Teclado virtual activo O BIEN Cabecera + Selector de puntos */}
      {keyboardOpen ? (
        <section
          className="shrink-0 border-b border-slate-800 bg-[#090f0c] p-2.5 sm:p-3 shadow-2xl animate-in fade-in slide-in-from-top-2 duration-150"
          aria-label="Teclado virtual superior"
        >
          <div className="mx-auto max-w-2xl space-y-2">
            {/* Fila del campo de texto activo con botón Listo */}
            <div className="flex items-center gap-2">
              <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-emerald-500/60 bg-slate-950 px-3 py-1.5 shadow-inner">
                <span
                  className="rounded-md px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-slate-950 shrink-0"
                  style={{ backgroundColor: activeTagInfo.color }}
                >
                  {selectedTag === "Otro" && customLabels.Otro?.trim()
                    ? customLabels.Otro.trim()
                    : activeTagInfo.shortLabel}
                </span>
                <span className="truncate text-xs font-semibold text-slate-100">
                  {activeInputField === "customLabel" && selectedTag === "Otro" ? (
                    customLabels.Otro || <span className="text-slate-500 italic">Escribe el nombre aquí...</span>
                  ) : (
                    activeNote || <span className="text-slate-500 italic">Escribe la instrucción aquí...</span>
                  )}
                </span>
              </div>

              <button
                type="button"
                onClick={() => setKeyboardOpen(false)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-3 text-xs font-bold text-slate-950 shadow-md shadow-emerald-950/50 transition-all active:scale-95 shrink-0"
                title="Aceptar y volver a los botones"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Listo</span>
              </button>

              <button
                type="button"
                onClick={() => setKeyboardOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800 hover:text-slate-100 transition-colors shrink-0"
                title="Cerrar teclado"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Filas del teclado virtual */}
            <div className="space-y-1">
              {KEYBOARD_ROWS.map((row, rowIndex) => (
                <div key={rowIndex} className="flex justify-center gap-1">
                  {row.map((char) => (
                    <button
                      key={char}
                      type="button"
                      onClick={() => handleVirtualKeyPress(char)}
                      className="h-8 min-w-[26px] sm:min-w-[36px] flex-1 rounded-md border border-slate-700/80 bg-slate-850 text-xs font-bold text-slate-100 shadow-sm hover:border-emerald-400 hover:bg-slate-750 active:scale-95 active:bg-emerald-500 active:text-slate-950 transition-all"
                    >
                      {char}
                    </button>
                  ))}
                </div>
              ))}

              <div className="flex justify-center gap-1 pt-0.5">
                <button
                  type="button"
                  onClick={() => handleVirtualKeyPress(" ")}
                  className="h-8 flex-[3] rounded-md border border-slate-700/80 bg-slate-850 text-xs font-bold text-slate-100 shadow-sm hover:border-emerald-400 hover:bg-slate-750 active:scale-95 transition-all"
                >
                  Espacio
                </button>
                <button
                  type="button"
                  onClick={handleVirtualBackspace}
                  className="inline-flex h-8 flex-1 items-center justify-center gap-1 rounded-md border border-slate-700/80 bg-slate-850 text-xs font-bold text-slate-100 shadow-sm hover:border-amber-400 hover:bg-slate-750 active:scale-95 transition-all"
                  title="Borrar carácter"
                >
                  <Delete className="h-3.5 w-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Borrar</span>
                </button>
                <button
                  type="button"
                  onClick={handleVirtualClear}
                  className="h-8 rounded-md border border-rose-800/50 bg-rose-950/40 px-3 text-xs font-bold text-rose-300 shadow-sm hover:border-rose-500 hover:bg-rose-900/50 active:scale-95 transition-all"
                >
                  Limpiar
                </button>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <>
          {/* Barra superior de vistas y dirección */}
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-800 bg-[#0e1613] px-3 py-2 sm:px-4">
            <div className="min-w-0 flex-1">
              {addressSummary ? (
                <>
                  <p className="truncate text-xs font-medium text-slate-300">
                    <span className="mr-1.5 text-emerald-400">📍</span>
                    {addressSummary}
                  </p>
                  <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-500">
                    <span className="mr-1 text-white">⌖</span>
                    Punto blanco: ubicación de la dirección · pines de colores: preferencias de acceso
                  </p>
                </>
              ) : null}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center rounded-lg border border-slate-800 bg-slate-900/80 p-0.5">
                {([["satellite", "Satélite", Satellite], ["map", "Mapa", Map]] as const).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => changeMode(value)}
                    className={`inline-flex min-h-10 sm:min-h-0 items-center gap-1.5 rounded-md px-3 py-2 sm:py-1 text-sm sm:text-xs font-bold transition-all ${
                      mode === value
                        ? "bg-emerald-500 text-slate-950 shadow-sm"
                        : "text-slate-300 hover:text-slate-100"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {label}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={toggleMapLabels}
                aria-pressed={showMapLabels}
                title={showMapLabels ? "Ocultar nombres de calles y ciudades" : "Mostrar nombres de calles y ciudades"}
                className={`inline-flex min-h-10 sm:min-h-0 items-center gap-1.5 rounded-lg border px-3 py-2 sm:py-1 text-sm sm:text-xs font-bold transition-all ${
                  showMapLabels
                    ? "border-emerald-500/70 bg-emerald-500/15 text-emerald-300"
                    : "border-slate-800 bg-slate-900/80 text-slate-400 hover:text-slate-200"
                }`}
              >
                <span className="text-sm leading-none">Aa</span>
                <span>Nombres</span>
              </button>

              <button
                type="button"
                onClick={closeWindow}
                className="flex h-10 w-10 sm:h-8 sm:w-8 items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800 hover:text-slate-100 transition-colors"
                title="Cerrar ventana"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </header>

          {/* Barra única y unificada de pines: selector, agregar, nota y quitar en un solo renglón */}
          <section
            className="relative z-30 shrink-0 border-b border-slate-800/80 bg-[#0d1411] px-3 py-2 sm:px-4"
            aria-label="Control de pines y accesos"
          >
            <div className="flex items-center justify-between gap-3">
              {/* Grupo izquierdo: botón de agregar pin a la izquierda y pills de pines */}
              <div className="flex min-w-0 flex-1 items-center gap-2">
                {/* Desplegable flotante para agregar pin nuevo al lado izquierdo */}
                {availableUnselectedTags.length > 0 ? (
                  <div className="relative shrink-0" ref={addPinRef}>
                    <button
                      type="button"
                      onClick={() => {
                        setAddPinOpen((v) => !v);
                        setShowNoteInput(false);
                      }}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-dashed border-emerald-500/60 bg-emerald-950/30 px-2.5 text-xs font-bold text-emerald-300 transition-all hover:border-emerald-400 hover:bg-emerald-900/40 active:scale-95 shadow-sm"
                      aria-expanded={addPinOpen}
                      title="Agregar otro pin de acceso"
                    >
                      <span className="grid h-4 w-4 place-items-center rounded bg-emerald-500/20 text-emerald-300 text-xs font-black leading-none">
                        +
                      </span>
                      <span>Agregar pin</span>
                      <ChevronDown className={`h-3 w-3 transition-transform ${addPinOpen ? "rotate-180" : ""}`} />
                    </button>

                    {addPinOpen ? (
                      <div className="absolute left-0 top-full mt-2 z-50 min-w-[210px] rounded-xl border border-slate-700/90 bg-slate-900/95 p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-100 flex flex-col gap-1">
                        <div className="px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-slate-400">
                          Tipos de pin disponibles
                        </div>
                        {availableUnselectedTags.map((tag) => {
                          const Icon = tag.icon;
                          return (
                            <button
                              key={tag.id}
                              type="button"
                              onClick={() => {
                                handleTagSelect(tag.id);
                                setAddPinOpen(false);
                              }}
                              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-200 hover:bg-slate-800 hover:text-white transition-colors text-left"
                            >
                              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                              <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: tag.color }} />
                              <span>{tag.label}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {/* Contenedor con scroll horizontal exclusivo para los pills */}
                <div className="flex min-w-0 items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {displayedTags.map((tag) => {
                    const isSelected = selectedTag === tag.id;
                    const hasPin = Boolean(points[tag.id]);
                    const hasNote = Boolean(points[tag.id]?.detail || tagNotes[tag.id]);
                    const Icon = tag.icon;
                    const displayName =
                      tag.id === "Otro" && customLabels.Otro?.trim()
                        ? customLabels.Otro.trim()
                        : tag.shortLabel;

                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => handleTagSelect(tag.id)}
                        className={`relative inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-bold transition-all active:scale-95 shrink-0 ${
                          isSelected
                            ? "border-emerald-400 bg-emerald-500 text-slate-950 shadow-md shadow-emerald-950/40 ring-1 ring-emerald-300/40"
                            : hasPin
                              ? "border-slate-700 bg-slate-900/90 text-slate-200 hover:border-slate-600 hover:bg-slate-800"
                              : "border-dashed border-emerald-500/50 bg-emerald-950/30 text-emerald-300 hover:border-emerald-400"
                        }`}
                        title={`Seleccionar pin de ${displayName}`}
                      >
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{
                            backgroundColor: hasPin ? tag.color : isSelected ? "#022c22" : tag.color,
                          }}
                        />
                        <Icon className={`h-3.5 w-3.5 shrink-0 ${isSelected ? "text-slate-950" : "text-slate-300"}`} />
                        <span className="truncate max-w-[120px]">{displayName}</span>
                        {hasPin ? (
                          <span
                            className={`ml-0.5 rounded-full p-0.5 text-[9px] ${
                              isSelected ? "bg-slate-950/20 text-slate-950" : "bg-emerald-500/20 text-emerald-400"
                            }`}
                          >
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        ) : null}
                        {hasNote ? (
                          <span
                            className={`ml-0.5 inline-flex items-center justify-center rounded p-0.5 ${
                              isSelected ? "text-slate-950" : "text-amber-400"
                            }`}
                            title="Tiene nota asignada"
                          >
                            <FileText className="h-3 w-3" />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Grupo derecho: Acciones contextuales del pin seleccionado (nombre si es Otro, nota y quitar) */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="h-5 w-px bg-slate-800 shrink-0" />

                {selectedTag === "Otro" ? (
                  <div className="relative flex items-center shrink-0">
                    <span className="mr-1.5 text-[11px] font-bold text-teal-400 shrink-0 hidden sm:inline">¿Qué es?</span>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        value={customLabels.Otro || ""}
                        onFocus={() => setActiveInputField("customLabel")}
                        onChange={(e) => handleCustomLabelChange("Otro", e.target.value)}
                        maxLength={40}
                        placeholder="Ej. Caseta, Bodega..."
                        className="h-8 w-32 sm:w-44 rounded-lg border border-teal-500/50 bg-slate-950 pl-2.5 pr-7 text-xs font-semibold text-teal-200 placeholder:text-slate-500 outline-none focus:border-teal-400 focus:ring-1 focus:ring-teal-400/30 transition-all shadow-inner"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setActiveInputField("customLabel");
                          setKeyboardOpen((v) => !v);
                        }}
                        className="absolute right-1 flex h-5 w-5 items-center justify-center rounded border border-teal-400/60 bg-teal-500/20 text-teal-300 hover:bg-teal-400 hover:text-slate-950 transition-all"
                        title="Abrir teclado en pantalla"
                      >
                        <Keyboard className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ) : null}

                {/* Botón de Bloc de notas de acceso y bitácora */}
                <div className="relative shrink-0" ref={notePopoverRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setShowNoteInput((v) => !v);
                      setAddPinOpen(false);
                      setNotebookTab("sheet");
                      setIsEditingNote(false);
                      setEditingNoteDraft(activeNote || "");
                    }}
                    className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-all active:scale-95 ${
                      activeNote
                        ? "border-amber-500/40 bg-amber-950/25 text-amber-300 hover:bg-amber-900/40 hover:border-amber-400"
                        : hasAnyNotes
                          ? "border-amber-500/30 bg-slate-900/90 text-amber-200 hover:border-amber-400 hover:bg-slate-800"
                          : showNoteInput
                            ? "border-amber-400 bg-amber-500 text-slate-950 font-bold"
                            : "border-slate-800 bg-slate-900/80 text-slate-300 hover:border-slate-700 hover:bg-slate-800 hover:text-slate-100"
                    }`}
                    title={
                      activeNote
                        ? `Bloc de notas (${activeTagInfo.shortLabel}): "${activeNote}"`
                        : "Abrir bloc de notas y bitácora de accesos"
                    }
                    aria-expanded={showNoteInput}
                  >
                    <BookOpen className={`h-3.5 w-3.5 shrink-0 ${activeNote || hasAnyNotes ? "text-amber-400" : ""}`} />
                    <span>{hasAnyNotes ? `Notas (${notesWithContentCount})` : "Libreta de notas"}</span>
                    {activeNote ? (
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-400 shrink-0" title="Este pin tiene nota" />
                    ) : null}
                  </button>

                  {showNoteInput && (
                    <div className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 rounded-2xl border border-amber-500/30 bg-[#0d1412] p-3.5 shadow-2xl backdrop-blur-2xl ring-1 ring-amber-500/20 animate-in fade-in zoom-in-95 duration-100 space-y-3">
                      {/* Cabecera limpia de la libreta / bloc de notas */}
                      <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="grid h-6 w-6 place-items-center rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                            <BookOpen className="h-3.5 w-3.5" />
                          </span>
                          <span className="text-xs font-black uppercase tracking-wider text-amber-200">
                            Bloc de notas
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setShowNoteInput(false);
                            setKeyboardOpen(false);
                          }}
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
                          title="Cerrar bloc de notas"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Hojas de notas individuales por pin */}
                      <div className="space-y-2.5">
                        {/* Tiras de pines como hojas de cuaderno */}
                        {placedTags.length > 1 ? (
                          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                            <span className="text-[10px] font-bold text-slate-500 shrink-0">Hojas:</span>
                            {placedTags.map((tag) => {
                              const isCurrent = tag.id === selectedTag;
                              const hasTagNote = Boolean(points[tag.id]?.detail?.trim());
                              const Icon = tag.icon;
                              return (
                                <button
                                  key={tag.id}
                                  type="button"
                                  onClick={() => handleTagSelect(tag.id)}
                                  className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold transition-all shrink-0 ${
                                    isCurrent
                                      ? "border-amber-400 bg-amber-500/20 text-amber-200 ring-1 ring-amber-400/40"
                                      : "border-slate-800 bg-slate-900/80 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                                  }`}
                                >
                                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
                                  <Icon className="h-3 w-3 shrink-0" />
                                  <span>{tag.shortLabel}</span>
                                  {hasTagNote ? <FileText className="h-2.5 w-2.5 text-amber-400" /> : null}
                                </button>
                              );
                            })}
                          </div>
                        ) : null}

                        {/* Tarjeta / Hojita de nota */}
                        <div className="relative rounded-xl border border-amber-500/20 bg-[#121c17] p-3.5 shadow-inner space-y-2.5 overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-amber-400 to-emerald-500" />

                          {/* Cabecera de la hoja */}
                          <div className="flex items-center justify-between pl-1.5">
                            <div className="flex items-center gap-2">
                              <span
                                className="h-2.5 w-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: activeTagInfo.color }}
                              />
                              <span className="text-xs font-bold text-slate-200">
                                Instrucción para {activeTagInfo.shortLabel}
                              </span>
                            </div>

                            {activeNote && !isEditingNote ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingNoteDraft(activeNote);
                                    setIsEditingNote(true);
                                  }}
                                  className="inline-flex items-center gap-1 rounded-md bg-amber-500/20 border border-amber-500/40 px-2 py-0.5 text-[11px] font-bold text-amber-300 hover:bg-amber-500/30 transition-all active:scale-95"
                                >
                                  <Edit3 className="h-3 w-3" />
                                  <span>Editar</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteNote(selectedTag)}
                                  className="inline-flex items-center gap-1 rounded-md bg-rose-950/30 border border-rose-500/30 px-2 py-0.5 text-[11px] font-bold text-rose-300 hover:bg-rose-900/40 transition-all active:scale-95"
                                >
                                  <Trash2 className="h-3 w-3" />
                                  <span>Borrar</span>
                                </button>
                              </div>
                            ) : null}
                          </div>

                          {/* Contenido de la hoja */}
                          {isEditingNote ? (
                            /* Modo edición de la hoja */
                            <div className="space-y-2 pl-1.5">
                              <div className="relative">
                                <textarea
                                  autoFocus
                                  rows={3}
                                  value={editingNoteDraft}
                                  onFocus={() => setActiveInputField("note")}
                                  onChange={(e) => setEditingNoteDraft(e.target.value)}
                                  maxLength={200}
                                  placeholder={`Escribe aquí la instrucción de acceso para ${activeTagInfo.shortLabel} (ej. portón negro, timbre blanco, clave de acceso 1234, perro guardián)...`}
                                  className="w-full resize-none rounded-lg border border-amber-500/50 bg-slate-950 p-2.5 pr-8 text-xs font-medium text-slate-100 placeholder:text-slate-500 outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400/30 transition-all shadow-inner leading-relaxed"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveInputField("note");
                                    setKeyboardOpen((v) => !v);
                                  }}
                                  className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded border border-amber-400/60 bg-amber-500/20 text-amber-300 hover:bg-amber-400 hover:text-slate-950 transition-all"
                                  title="Abrir teclado en pantalla"
                                >
                                  <Keyboard className="h-3.5 w-3.5" />
                                </button>
                              </div>

                              <div className="flex items-center justify-between pt-1">
                                <span className="text-[10px] font-semibold text-slate-500">
                                  {editingNoteDraft.length} / 200 caracteres
                                </span>

                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsEditingNote(false);
                                      setEditingNoteDraft(activeNote || "");
                                    }}
                                    className="rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={handleSaveNote}
                                    className="inline-flex h-7 items-center gap-1 rounded-lg bg-amber-400 hover:bg-amber-300 px-3 text-xs font-bold text-slate-950 transition-all active:scale-95 shadow-md shadow-amber-950/40"
                                  >
                                    <Check className="h-3 w-3" />
                                    <span>Guardar en hoja</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          ) : activeNote ? (
                            /* Modo lectura / Hojita cerrada con metadatos de bitácora */
                            <div className="space-y-2 pl-1.5">
                              <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs font-medium text-slate-100 whitespace-pre-wrap leading-relaxed shadow-inner font-mono text-[11px]">
                                "{activeNote}"
                              </div>

                              {/* Metadatos de auditoría: Quién la creó y cuándo */}
                              <div className="flex flex-wrap items-center justify-between gap-1 pt-1 text-[10px] text-slate-400 border-t border-slate-800/60">
                                <div className="flex items-center gap-1">
                                  <User className="h-3 w-3 text-amber-400 shrink-0" />
                                  <span>
                                    Creado por: <strong className="text-slate-300">{currentPinMeta?.author || authorName}</strong>
                                  </span>
                                </div>

                                <div className="flex items-center gap-1 text-slate-400">
                                  <Clock className="h-3 w-3 shrink-0" />
                                  <span>
                                    {formatJournalDate(currentPinMeta?.createdAt)} · {formatJournalTime(currentPinMeta?.createdAt)}
                                  </span>
                                </div>
                              </div>

                              {currentPinMeta?.updatedAt ? (
                                <div className="text-[9px] text-amber-400/90 italic pl-1">
                                  Última modificación por {currentPinMeta.updatedBy || authorName} el {formatJournalDate(currentPinMeta.updatedAt)} a las {formatJournalTime(currentPinMeta.updatedAt)}
                                </div>
                              ) : null}
                            </div>
                          ) : (
                            /* Hojita vacía */
                            <div className="py-4 text-center space-y-2 pl-1.5">
                              <p className="text-xs font-medium text-slate-400">
                                Esta hoja no tiene instrucciones de acceso escritas todavía.
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingNoteDraft("");
                                  setIsEditingNote(true);
                                }}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-amber-500/50 bg-amber-950/20 px-3.5 py-1.5 text-xs font-bold text-amber-300 hover:border-amber-400 hover:bg-amber-900/30 transition-all active:scale-95"
                              >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Escribir nota en esta hoja</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Botón de quitar pin */}
                {activePointData ? (
                  <button
                    type="button"
                    onClick={() => removePin(selectedTag)}
                    className="inline-flex h-8 items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-950/25 px-2.5 text-xs font-semibold text-rose-300 hover:border-rose-400 hover:bg-rose-900/40 active:scale-95 transition-all shrink-0"
                    title={`Eliminar pin de ${activeTagInfo.shortLabel}`}
                  >
                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                    <span>Quitar pin</span>
                  </button>
                ) : null}
              </div>
            </div>
          </section>
        </>
      )}

      {/* Mapa interactivo (siempre 100% visible) */}
      <div className="relative min-h-[300px] flex-1 overflow-hidden bg-[#070c0a]">
        <div ref={mapElementRef} className="h-full w-full" style={{ width: "100%", height: "100%" }} />

        {/* Controles de zoom */}
        <div className="absolute left-3 top-3 z-10 flex flex-col overflow-hidden rounded-xl border border-slate-700/80 bg-slate-950/90 shadow-xl backdrop-blur-sm">
          <button
            type="button"
            onClick={() => zoomMap(1)}
            aria-label="Acercar mapa"
            title="Acercar mapa"
            className="grid h-10 w-10 sm:h-9 sm:w-9 place-items-center border-b border-slate-800 text-slate-100 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors"
          >
            <ZoomIn className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => zoomMap(-1)}
            aria-label="Alejar mapa"
            title="Alejar mapa"
            className="grid h-10 w-10 sm:h-9 sm:w-9 place-items-center text-slate-100 hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-400 transition-colors"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
        </div>

        {/* Guía flotante sobre el mapa */}
        <div className="pointer-events-none absolute bottom-3 left-3 right-3 z-10 flex items-center justify-center">
          <div className="flex max-w-full items-center gap-2 rounded-xl border border-slate-800/90 bg-slate-950/90 px-3.5 py-2 text-sm sm:py-1.5 sm:text-xs font-medium text-slate-200 shadow-xl backdrop-blur-md">
            <span
              className="flex h-2.5 w-2.5 rounded-full animate-pulse shrink-0"
              style={{ backgroundColor: activeTagInfo.color }}
            />
            <span className="truncate">{status}</span>
            {lastPinMove ? (
              <button
                type="button"
                onClick={undoLastPinMove}
                className="pointer-events-auto inline-flex h-7 shrink-0 items-center gap-1 rounded-lg border border-amber-400/60 bg-amber-500/15 px-2.5 text-[11px] font-black text-amber-200 transition-colors hover:bg-amber-400 hover:text-slate-950"
                aria-label={`Deshacer movimiento del pin de ${lastPinMove.tag}`}
                title="Devolver el pin a su posición anterior"
              >
                <Undo2 className="h-3.5 w-3.5" />
                <span>Deshacer</span>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {/* Barra de pie con confirmación y coordenadas */}
      <footer className="flex shrink-0 flex-col items-stretch gap-3 border-t border-slate-800 bg-[#0e1613] px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:py-2.5">
        <div className="flex items-center gap-2 text-xs sm:text-[11px] font-medium text-slate-300">
          <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span>
            {placedCount === 0
              ? "Sin puntos ubicados"
              : placedCount === 1
                ? `1 punto ubicado (${Object.keys(points).join(", ")})`
                : `${placedCount} puntos ubicados (${Object.keys(points).join(", ")})`}
          </span>
        </div>

        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={closeWindow}
            className="h-10 sm:h-9 rounded-xl border border-slate-700 px-4 text-sm sm:text-xs font-bold text-slate-200 hover:bg-slate-800 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={placedCount === 0 || confirming}
            onClick={() => void confirmEntrance()}
            className="inline-flex h-10 sm:h-9 items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 px-5 text-sm sm:text-xs font-bold text-slate-950 shadow-md shadow-emerald-950/40 disabled:cursor-not-allowed disabled:opacity-40 transition-all"
          >
            <MapPin className="h-4 w-4" />
            <span>{confirming ? "Guardando..." : placedCount > 1 ? "Guardar pines" : "Guardar pin"}</span>
          </button>
        </div>
      </footer>
    </main>,
    hostWindow.document.body,
  );
}
