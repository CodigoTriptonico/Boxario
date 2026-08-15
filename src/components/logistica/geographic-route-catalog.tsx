"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, CalendarDays, Clock3, List, Loader2, Map as MapIcon, MapPinned, Plus, X } from "lucide-react";
import {
  activateLogisticsRouteWeekdayAction,
  archiveGeographicRouteDefinitionAction,
  createGeographicRouteDefinitionAction,
  saveSystemDayRouteCoverageAction,
  setLogisticsRouteWeekdayEnabledAction,
  setLogisticsWeekdayScheduleAction,
  updateGeographicRouteDefinitionAction,
  type LogisticsRouteCatalog,
  type LogisticsRouteDefinitionRow,
} from "@/app/actions/logistics-routes";
import { TimePickerInput } from "@/components/time-picker-input";
import { ActionConfirmDialog } from "@/components/action-confirm-dialog";
import { GeographicRouteCoverageMap } from "@/components/logistica/geographic-route-coverage-map";
import { GeographicRoutePlacesEditor } from "@/components/logistica/geographic-route-places-editor";
import { CompactInfoDisclosure, primaryButtonClass, secondaryButtonClass } from "@/components/ui-blocks";
import { useNotify } from "@/hooks/use-notify";
import { logisticsWeekdayKeys, logisticsWeekdayLabels } from "@/lib/logistics-route-catalog";
import { normalizeCoveragePlaceColor, nextCoveragePlaceColor, type RouteCoveragePlace } from "@/lib/logistics-route-coverage";
import { upsertCoverageRootPlace } from "@/lib/coverage-places-selection";
import { formatTime12Hour } from "@/lib/sale/schedule-time";
import type { RouteMemberRow } from "@/lib/shipment-types";

type PendingCoveragePlaces = {
  scope: "day" | "subroute";
  places: RouteCoveragePlace[];
  /** Fit the map once to the preview selected from search. */
  fitPreview: boolean;
  /** Color applied to the whole pending batch when confirming. */
  batchColor: string;
};

type ScheduleDraft = {
  id?: string;
  weekday: number;
  startTime: string;
  estimatedEndTime: string;
  maxStops: string;
  maxBoxes: string;
  defaultDriverId: string;
  isActive: boolean;
  reservedStops?: number;
};

type RouteDraft = {
  id?: string;
  name: string;
  zoneName: string;
  color: string;
  coverageMode: "day_only" | "places";
  postalCodes: string[];
  places: RouteCoveragePlace[];
  schedules: ScheduleDraft[];
};

type SubrouteEditorTab = "schedules" | "coverage";

type PendingSubrouteDiscard =
  | { action: "close" }
  | { action: "new" }
  | { action: "open"; route: LogisticsRouteDefinitionRow; tab: SubrouteEditorTab }
  | { action: "color"; route: LogisticsRouteDefinitionRow; color: string };

const emptySchedule = (weekday = 0): ScheduleDraft => ({
  weekday,
  startTime: "10:00",
  estimatedEndTime: "",
  maxStops: "",
  maxBoxes: "",
  defaultDriverId: "",
  isActive: true,
});

const emptyDraft = (weekday = 0): RouteDraft => ({
  name: "",
  zoneName: "",
  color: "#10b981",
  coverageMode: "day_only",
  postalCodes: [],
  places: [],
  schedules: [emptySchedule(weekday)],
});

function routeToDraft(route: LogisticsRouteDefinitionRow): RouteDraft {
  return {
    id: route.id,
    name: route.name,
    zoneName: route.zoneName,
    color: route.color,
    coverageMode: route.coverageMode === "places" ? "places" : "day_only",
    postalCodes: [],
    places: route.places || [],
    schedules: route.schedules.map((schedule) => ({
      id: schedule.id,
      weekday: schedule.weekday,
      startTime: schedule.startTime,
      estimatedEndTime: schedule.estimatedEndTime,
      maxStops: schedule.maxStops == null ? "" : String(schedule.maxStops),
      maxBoxes: schedule.maxBoxes == null ? "" : String(schedule.maxBoxes),
      defaultDriverId: schedule.defaultDriverId || "",
      isActive: schedule.isActive,
      reservedStops: schedule.reservedStops,
    })),
  };
}

function scheduleSummary(schedule: Pick<ScheduleDraft, "weekday" | "startTime" | "estimatedEndTime">) {
  const day = logisticsWeekdayLabels[schedule.weekday] || "Día";
  const window = schedule.estimatedEndTime
    ? `${formatTime12Hour(schedule.startTime)}–${formatTime12Hour(schedule.estimatedEndTime)}`
    : `${formatTime12Hour(schedule.startTime)}–hasta terminar`;
  return `${day} ${window}`;
}

function coverageDraftSnapshotKey(draft: RouteDraft) {
  const placesKey = draft.places
    .map(
      (place) =>
        `${place.placeId}:${place.selectionRole}:${place.parentPlaceId || ""}:${place.color || ""}`,
    )
    .sort()
    .join("|");
  const schedulesKey = draft.schedules
    .map(
      (schedule) =>
        `${schedule.weekday}:${schedule.startTime}:${schedule.estimatedEndTime || ""}:${schedule.maxStops}:${schedule.maxBoxes}:${schedule.defaultDriverId}:${schedule.isActive}`,
    )
    .join("|");
  return [
    draft.name,
    draft.zoneName,
    draft.color,
    draft.coverageMode,
    placesKey,
    schedulesKey,
  ].join("::");
}

function coveragePlacesSnapshotKey(places: RouteCoveragePlace[]) {
  return places
    .map(
      (place) =>
        `${place.placeId}:${place.selectionRole}:${place.parentPlaceId || ""}:${place.color || ""}`,
    )
    .sort()
    .join("|");
}

function draftCoverageLabel(draft: RouteDraft) {
  const roots = draft.places.filter(
    (place) => place.selectionRole === "root_whole" || place.selectionRole === "root_partial",
  );
  if (!roots.length) return "sin cobertura";
  return roots
    .map((root) => {
      if (root.selectionRole === "root_whole") return `${root.displayName} (ciudad completa)`;
      const children = draft.places.filter(
        (place) => place.selectionRole === "child_included" && place.parentPlaceId === root.placeId,
      );
      return `${root.displayName} (${children.length} zonas seleccionadas)`;
    })
    .join(", ");
}

function draftSchedulesLabel(draft: RouteDraft) {
  if (!draft.schedules.length) return "sin horarios";
  return draft.schedules.map(scheduleSummary).join(" · ");
}

function subrouteChangeDetails(current: RouteDraft, baseline: RouteDraft | null) {
  if (!baseline) return [];
  const changes: string[] = [];
  const displayValue = (value: string) => value.trim() || "vacío";

  if (current.name !== baseline.name) {
    changes.push(`Ruta: ${displayValue(baseline.name)} → ${displayValue(current.name)}`);
  }
  if (current.zoneName !== baseline.zoneName) {
    changes.push(`Zona: ${displayValue(baseline.zoneName)} → ${displayValue(current.zoneName)}`);
  }
  if (current.color !== baseline.color) {
    changes.push(`Color: ${baseline.color} → ${current.color}`);
  }
  if (
    current.coverageMode !== baseline.coverageMode ||
    coveragePlacesSnapshotKey(current.places) !== coveragePlacesSnapshotKey(baseline.places)
  ) {
    changes.push(`Cobertura: ${draftCoverageLabel(baseline)} → ${draftCoverageLabel(current)}`);
  }
  if (coverageDraftSnapshotKey(current).split("::").at(-1) !== coverageDraftSnapshotKey(baseline).split("::").at(-1)) {
    changes.push(`Horarios: ${draftSchedulesLabel(baseline)} → ${draftSchedulesLabel(current)}`);
  }
  return changes;
}

function buildDayCoverageKey(places: RouteCoveragePlace[]) {
  return places
    .map(
      (place) =>
        `${place.placeId}:${place.selectionRole}:${place.parentPlaceId ?? ""}:${normalizeCoveragePlaceColor(place.color)}`,
    )
    .sort()
    .join("|");
}

function withNormalizedPlaceColors(places: RouteCoveragePlace[], fallbackColor: string) {
  return places.map((place) => ({
    ...place,
    color: normalizeCoveragePlaceColor(place.color, fallbackColor),
  }));
}

function PendingCoverageAction({
  places,
  batchColor,
  onCancel,
  onConfirm,
  onRemovePlace,
  onBatchColorChange,
}: {
  places: RouteCoveragePlace[];
  batchColor: string;
  onCancel: () => void;
  onConfirm: () => void;
  onRemovePlace: (placeId: string) => void;
  onBatchColorChange: (color: string) => void;
}) {
  const count = places.length;
  if (!count) return null;
  const colorValue = normalizeCoveragePlaceColor(batchColor, "#10b981");
  return (
    <div className="mt-2 border-t border-black pt-2" role="status" aria-live="polite">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black text-amber-100">
            Vista previa: {count === 1 ? places[0].displayName : `${count} zonas`}
          </p>
          <p className="text-[11px] font-bold text-slate-500">
            {count === 1
              ? "Haz clic en la pieza del mapa para quitarla, o confirma la cobertura."
              : "Haz clic en el mapa para añadir o quitar piezas; elige el color y confirma."}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-black bg-surface-card px-2 text-[11px] font-black text-slate-300"
              title="Color al agregar estas zonas"
            >
              Color
              <input
                type="color"
                value={colorValue}
                aria-label="Color de las zonas a agregar"
                onChange={(event) => onBatchColorChange(event.target.value)}
                className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
              />
            </label>
            <div className="flex max-h-28 min-w-0 flex-1 flex-wrap gap-1.5 overflow-y-auto">
              {places.map((place) => (
                <span
                  key={place.placeId}
                  className="inline-flex max-w-full items-center gap-1 rounded-full border border-sky-700/80 bg-sky-950/40 px-2 py-1 text-[11px] font-black text-sky-100"
                >
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/60"
                    style={{ backgroundColor: colorValue }}
                    aria-hidden
                  />
                  <span className="truncate">{place.displayName}</span>
                  <button
                    type="button"
                    aria-label={`Quitar ${place.displayName} de la vista previa`}
                    className="shrink-0 text-sky-200/80 hover:text-rose-200"
                    onClick={() => onRemovePlace(place.placeId)}
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <button type="button" className={`${secondaryButtonClass} h-9 px-3 text-xs`} onClick={onCancel}>
            Cancelar
          </button>
          <button type="button" className={`${primaryButtonClass} h-9 px-3 text-xs`} onClick={onConfirm}>
            {count === 1 ? "Agregar zona" : `Agregar ${count} zonas`}
          </button>
        </div>
      </div>
    </div>
  );
}

function applyPendingPlacesToCoverage(
  currentPlaces: RouteCoveragePlace[],
  pending: RouteCoveragePlace[],
  batchColor: string,
  fallbackColor: string,
) {
  const confirmColor = normalizeCoveragePlaceColor(batchColor, pending[0]?.color || fallbackColor);
  let nextPlaces = currentPlaces;
  for (const place of pending) {
    nextPlaces = upsertCoverageRootPlace(
      nextPlaces,
      { ...place, color: confirmColor },
      fallbackColor,
    );
  }
  return nextPlaces;
}

type CoverageSurfaceTab = "zones" | "map";

function CoverageSurfaceTabs({
  active,
  onChange,
  zonesPanelId,
  mapPanelId,
  listLabel = "Zonas",
  pendingCount = 0,
}: {
  active: CoverageSurfaceTab;
  onChange: (next: CoverageSurfaceTab) => void;
  zonesPanelId: string;
  mapPanelId: string;
  listLabel?: string;
  pendingCount?: number;
}) {
  return (
    <div
      className="flex w-fit max-w-full gap-0.5 rounded-lg border border-black bg-surface-inset p-0.5"
      role="tablist"
      aria-label="Vista de cobertura"
    >
      {(
        [
          ["zones", listLabel, zonesPanelId, List],
          ["map", "Mapa", mapPanelId, MapIcon],
        ] as const
      ).map(([id, label, panelId, Icon]) => {
        const selected = active === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            id={`${panelId}-tab`}
            onClick={() => onChange(id)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 text-xs font-black transition ${
              selected
                ? "bg-emerald-400 text-slate-950"
                : "text-slate-400 hover:bg-surface-card hover:text-slate-100"
            }`}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden />
            <span>{label}</span>
            {id === "map" && pendingCount > 0 ? (
              <span
                className={`min-w-4 rounded px-1 text-center text-[10px] leading-4 ${
                  selected ? "bg-slate-950/15 text-slate-950" : "bg-amber-500/30 text-amber-100"
                }`}
              >
                {pendingCount}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function removeCoveragePlaceSelection(places: RouteCoveragePlace[], placeId: string) {
  const target = places.find((place) => place.placeId === placeId);
  if (!target) return places;

  if (target.selectionRole === "child_included" && target.parentPlaceId) {
    const next = places.filter((place) => place.placeId !== placeId);
    const remainingChildren = next.some(
      (place) => place.selectionRole === "child_included" && place.parentPlaceId === target.parentPlaceId,
    );
    const nextRole: RouteCoveragePlace["selectionRole"] = remainingChildren ? "root_partial" : "root_whole";
    return next.map((place) =>
      place.placeId === target.parentPlaceId
        ? { ...place, selectionRole: nextRole }
        : place,
    );
  }

  return places.filter((place) => place.placeId !== placeId && place.parentPlaceId !== placeId);
}

export function GeographicRouteCatalog({
  catalog,
  canManage,
  onCatalogChange,
  routeMembers,
}: {
  catalog: LogisticsRouteCatalog;
  canManage: boolean;
  onCatalogChange: () => void;
  routeMembers: RouteMemberRow[];
}) {
  const notify = useNotify();
  const [draft, setDraft] = useState<RouteDraft>(emptyDraft);
  const [busy, setBusy] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [subrouteEditorTab, setSubrouteEditorTab] = useState<SubrouteEditorTab>("schedules");
  const [subrouteHighlightPlaceId, setSubrouteHighlightPlaceId] = useState<string | null>(null);
  const [subrouteBaselineKey, setSubrouteBaselineKey] = useState("");
  const [subrouteBaselineDraft, setSubrouteBaselineDraft] = useState<RouteDraft | null>(null);
  const [pendingSubrouteDiscard, setPendingSubrouteDiscard] = useState<PendingSubrouteDiscard | null>(null);
  const [editingDaySchedule, setEditingDaySchedule] = useState(false);
  const [dayScheduleStart, setDayScheduleStart] = useState("10:00");
  const [dayScheduleEnd, setDayScheduleEnd] = useState("");
  const [dayWithoutEnd, setDayWithoutEnd] = useState(false);
  const [dayPlaces, setDayPlaces] = useState<RouteCoveragePlace[]>([]);
  const [dayHighlightPlaceId, setDayHighlightPlaceId] = useState<string | null>(null);
  const [pendingCoveragePlaces, setPendingCoveragePlaces] = useState<PendingCoveragePlaces | null>(null);
  const [dayCoverageTab, setDayCoverageTab] = useState<CoverageSurfaceTab>("zones");
  const [coverageSaveState, setCoverageSaveState] = useState<"idle" | "pending" | "saving" | "saved" | "error">("idle");
  const coverageSyncedKeyRef = useRef("");
  const coverageAutoSaveTimerRef = useRef<number | null>(null);
  const dayCoverageLocalKeyRef = useRef("");
  const [selectedWeekday, setSelectedWeekday] = useState(() => {
    const firstEnabledDay = catalog.enabledDays.find((day) => logisticsWeekdayKeys.includes(day));
    return firstEnabledDay ? logisticsWeekdayKeys.indexOf(firstEnabledDay) : 0;
  });
  const activeRoutes = useMemo(
    () => catalog.routeDefinitions.filter((route) => !route.isSystemGeneral && route.status === "active"),
    [catalog.routeDefinitions],
  );
  const selectedDayRoutes = useMemo(
    () => activeRoutes.filter((route) =>
      route.schedules.some((schedule) => schedule.weekday === selectedWeekday && schedule.isActive),
    ),
    [activeRoutes, selectedWeekday],
  );
  const systemDayRoute = useMemo(
    () => catalog.routeDefinitions.find(
      (route) => route.isSystemGeneral && route.systemWeekday === selectedWeekday && route.status === "active",
    ),
    [catalog.routeDefinitions, selectedWeekday],
  );
  const selectedWeekdayLabel = logisticsWeekdayLabels[selectedWeekday] || "Día";
  const selectedDayEnabled = catalog.enabledDays.includes(logisticsWeekdayKeys[selectedWeekday]);
  const weekdaySchedule = catalog.weekdayScheduleByWeekday[selectedWeekday];
  const dayIsRoute = selectedDayEnabled && selectedDayRoutes.length === 0;
  const showDayScheduleEditor = dayIsRoute && (editingDaySchedule || !weekdaySchedule?.startTime);
  const systemDayRoutePlaces = useMemo(() => systemDayRoute?.places || [], [systemDayRoute?.places]);
  const dayCoverageServerKey = useMemo(
    () => buildDayCoverageKey(systemDayRoutePlaces),
    [systemDayRoutePlaces],
  );
  const dayCoverageLocalKey = useMemo(
    () => buildDayCoverageKey(dayPlaces),
    [dayPlaces],
  );
  useEffect(() => {
    dayCoverageLocalKeyRef.current = dayCoverageLocalKey;
  }, [dayCoverageLocalKey]);

  const dayCoverageFallbackColor = systemDayRoute?.color || "#10b981";

  useEffect(() => {
    const serverPlaces = withNormalizedPlaceColors(systemDayRoutePlaces, dayCoverageFallbackColor);
    const serverKey = buildDayCoverageKey(serverPlaces);

    if (serverKey === dayCoverageLocalKeyRef.current) {
      coverageSyncedKeyRef.current = serverKey;
      return;
    }

    const hasUnsavedLocalEdits =
      coverageSyncedKeyRef.current !== "" &&
      dayCoverageLocalKeyRef.current !== coverageSyncedKeyRef.current;
    if (hasUnsavedLocalEdits) return;

    setDayPlaces(serverPlaces);
    coverageSyncedKeyRef.current = serverKey;
    setCoverageSaveState("idle");
  }, [dayCoverageFallbackColor, dayCoverageServerKey, selectedWeekday, systemDayRoute?.id, systemDayRoutePlaces]);

  function beginDaySchedule(weekday: number) {
    const existing = catalog.weekdayScheduleByWeekday[weekday];
    setDayCoverageTab("zones");
    setSelectedWeekday(weekday);
    setDayScheduleStart(existing?.startTime || "10:00");
    setDayScheduleEnd(existing?.estimatedEndTime || "");
    setDayWithoutEnd(!existing?.estimatedEndTime);
    setEditingDaySchedule(true);
  }

  function proposeCoveragePlaces(
    scope: "day" | "subroute",
    incoming: RouteCoveragePlace[],
    options?: { fitPreview?: boolean; progressive?: boolean },
  ) {
    const existing = scope === "day" ? dayPlaces : draft.places;
    const existingIds = new Set(existing.map((item) => item.placeId));
    const fresh = incoming.filter((place) => place.placeId && !existingIds.has(place.placeId));
    if (!fresh.length) {
      if (options?.progressive) return;
      if (incoming.length === 1) {
        const only = incoming[0];
        if (scope === "day") setDayHighlightPlaceId(only.placeId);
        else setSubrouteHighlightPlaceId(only.placeId);
        notify.success(`${only.displayName} ya está en la cobertura`);
      } else {
        notify.success("Esas zonas ya están parte de la cobertura");
      }
      setPendingCoveragePlaces(null);
      return;
    }

    const defaultColor = scope === "day" ? systemDayRoute?.color || "#10b981" : draft.color;
    const isBatch = fresh.length > 1 || options?.progressive === true;
    const preservedBatchColor =
      pendingCoveragePlaces?.scope === scope
        ? normalizeCoveragePlaceColor(pendingCoveragePlaces.batchColor, defaultColor)
        : null;
    const batchColor =
      preservedBatchColor || nextCoveragePlaceColor(existing, defaultColor);

    const colored: RouteCoveragePlace[] = fresh.map((place) => ({
      ...place,
      color: isBatch
        ? batchColor
        : place.color || nextCoveragePlaceColor(existing, defaultColor),
    }));

    setPendingCoveragePlaces({
      scope,
      places: colored,
      fitPreview: options?.fitPreview === true,
      batchColor: normalizeCoveragePlaceColor(colored[0]?.color, batchColor),
    });
    if (scope === "day") setDayCoverageTab("map");
    // Multi-select previews share the same fill; don't pin highlight to the first piece
    // (that used to attenuate every other pending outline to an edge-only look).
    const highlightId = colored.length === 1 ? colored[0]?.placeId || null : null;
    if (scope === "day") setDayHighlightPlaceId(highlightId);
    else setSubrouteHighlightPlaceId(highlightId);
  }

  function proposeCoveragePlace(
    scope: "day" | "subroute",
    place: RouteCoveragePlace,
    options?: { fitPreview?: boolean },
  ) {
    proposeCoveragePlaces(scope, [place], options);
  }

  function selectCoveragePlaceFromMap(scope: "day" | "subroute", place: RouteCoveragePlace) {
    // While a preview batch is open, map clicks edit that pending list (add/remove), not confirmed coverage.
    if (pendingCoveragePlaces?.scope === scope) {
      if (pendingCoveragePlaces.places.some((item) => item.placeId === place.placeId)) {
        removePendingCoveragePlace(place.placeId);
        return;
      }

      const confirmed = scope === "day" ? dayPlaces : draft.places;
      if (confirmed.some((item) => item.placeId === place.placeId)) {
        notify.success(`${place.displayName} ya está en la cobertura`);
        return;
      }

      const batchColor = normalizeCoveragePlaceColor(
        pendingCoveragePlaces.batchColor,
        scope === "day" ? systemDayRoute?.color || "#10b981" : draft.color,
      );
      setPendingCoveragePlaces((current) => {
        if (!current) return current;
        if (current.places.some((item) => item.placeId === place.placeId)) return current;
        const withColor: RouteCoveragePlace = {
          ...place,
          color: batchColor,
        };
        return {
          ...current,
          places: [...current.places, withColor],
          fitPreview: false,
          batchColor,
        };
      });
      if (scope === "day") setDayHighlightPlaceId(place.placeId);
      else setSubrouteHighlightPlaceId(place.placeId);
      return;
    }

    const current = scope === "day" ? dayPlaces : draft.places;
    if (current.some((item) => item.placeId === place.placeId)) {
      const next = removeCoveragePlaceSelection(current, place.placeId);
      if (scope === "day") {
        setDayPlaces(next);
        setDayHighlightPlaceId(null);
      } else {
        updateDraftCoverage(next);
        setSubrouteHighlightPlaceId(null);
      }
      notify.success(`${place.displayName} se quitó de la cobertura`);
      return;
    }

    proposeCoveragePlaces(scope, [place], { fitPreview: false });
  }

  function selectCoveragePlacesFromMap(
    scope: "day" | "subroute",
    places: RouteCoveragePlace[],
    options?: { progressive?: boolean },
  ) {
    if (!places.length) return;
    proposeCoveragePlaces(scope, places, { fitPreview: false, progressive: options?.progressive === true });
  }

  function cancelPendingCoveragePlaces() {
    setPendingCoveragePlaces(null);
  }

  function removePendingCoveragePlace(placeId: string) {
    setPendingCoveragePlaces((current) => {
      if (!current) return null;
      const nextPlaces = current.places.filter((place) => place.placeId !== placeId);
      if (!nextPlaces.length) return null;
      return { ...current, places: nextPlaces };
    });
  }

  function setPendingBatchColor(color: string) {
    const nextColor = normalizeCoveragePlaceColor(color, "#10b981");
    setPendingCoveragePlaces((current) => {
      if (!current) return null;
      return {
        ...current,
        batchColor: nextColor,
        places: current.places.map((place) => ({ ...place, color: nextColor })),
      };
    });
  }

  function confirmPendingCoveragePlaces() {
    if (!pendingCoveragePlaces?.places.length) return;
    const { scope, places: pending, batchColor } = pendingCoveragePlaces;
    if (scope === "day") {
      const fallbackColor = systemDayRoute?.color || "#10b981";
      setDayPlaces((current) => applyPendingPlacesToCoverage(current, pending, batchColor, fallbackColor));
      setDayHighlightPlaceId(pending[0]?.placeId || null);
    } else {
      updateDraftCoverage((current) => applyPendingPlacesToCoverage(current, pending, batchColor, draft.color));
      setSubrouteHighlightPlaceId(pending[0]?.placeId || null);
    }
    setPendingCoveragePlaces(null);
    notify.success(
      pending.length === 1
        ? `Se amplió la cobertura con ${pending[0].displayName}`
        : `Se amplió la cobertura con ${pending.length} zonas`,
    );
  }

  async function saveDayCoverage(options?: { silent?: boolean }) {
    const placesSnapshot = dayPlaces;
    const coverageMode = placesSnapshot.length > 0 ? "places" : "day_only";
    const savedKey = buildDayCoverageKey(placesSnapshot);
    setBusy(`coverage:${selectedWeekday}`);
    setCoverageSaveState("saving");
    try {
      const result = await saveSystemDayRouteCoverageAction({
        weekday: selectedWeekday,
        coverageMode,
        places: placesSnapshot,
      });
      if (!result.ok) {
        setCoverageSaveState("error");
        notify.error(result.error);
        return false;
      }
      coverageSyncedKeyRef.current = savedKey;
      dayCoverageLocalKeyRef.current = savedKey;
      setCoverageSaveState("saved");
      if (!options?.silent) {
        notify.success(`Cobertura de ${selectedWeekdayLabel} guardada`);
      }
      onCatalogChange();
      return true;
    } catch (error) {
      setCoverageSaveState("error");
      notify.error(error instanceof Error ? error.message : "No se pudo guardar la cobertura");
      return false;
    } finally {
      setBusy("");
    }
  }

  useEffect(() => {
    if (coverageSaveState !== "saved") return;
    const timer = window.setTimeout(() => {
      setCoverageSaveState((current) => (current === "saved" ? "idle" : current));
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [coverageSaveState]);

  useEffect(() => {
    if (!dayIsRoute || !canManage) return;
    if (dayCoverageLocalKey === coverageSyncedKeyRef.current) return;
    setCoverageSaveState((current) => (current === "pending" || current === "saving" ? current : "pending"));
    if (coverageAutoSaveTimerRef.current != null) {
      window.clearTimeout(coverageAutoSaveTimerRef.current);
    }
    coverageAutoSaveTimerRef.current = window.setTimeout(() => {
      coverageAutoSaveTimerRef.current = null;
      void saveDayCoverage({ silent: true });
    }, 700);
    return () => {
      if (coverageAutoSaveTimerRef.current != null) {
        window.clearTimeout(coverageAutoSaveTimerRef.current);
        coverageAutoSaveTimerRef.current = null;
      }
    };
    // saveDayCoverage reads the latest local coverage state when the debounce fires.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage, dayCoverageLocalKey, dayIsRoute, selectedWeekday]);

  function updateDraftCoverage(
    nextPlaces: RouteCoveragePlace[] | ((current: RouteCoveragePlace[]) => RouteCoveragePlace[]),
  ) {
    setDraft((current) => {
      const places = typeof nextPlaces === "function" ? nextPlaces(current.places) : nextPlaces;
      return {
        ...current,
        places,
        coverageMode: places.length ? "places" : "day_only",
      };
    });
  }

  function toggleSubrouteCoveragePlaceFromMap(place: RouteCoveragePlace) {
    if (draft.places.some((item) => item.placeId === place.placeId)) {
      updateDraftCoverage(removeCoveragePlaceSelection(draft.places, place.placeId));
      setSubrouteHighlightPlaceId(null);
      notify.success(`${place.displayName} se quitó de la cobertura`);
      return;
    }

    const color = normalizeCoveragePlaceColor(place.color, draft.color);
    updateDraftCoverage((currentPlaces) =>
      upsertCoverageRootPlace(currentPlaces, { ...place, color }, draft.color),
    );
    setSubrouteHighlightPlaceId(place.placeId);
  }

  function addSubrouteCoveragePlacesFromMap(places: RouteCoveragePlace[]) {
    if (!places.length) return;
    updateDraftCoverage((currentPlaces) => {
      let nextPlaces = currentPlaces;
      for (const place of places) {
        if (nextPlaces.some((item) => item.placeId === place.placeId)) continue;
        nextPlaces = upsertCoverageRootPlace(
          nextPlaces,
          {
            ...place,
            color: normalizeCoveragePlaceColor(place.color, draft.color),
          },
          draft.color,
        );
      }
      return nextPlaces;
    });
    setSubrouteHighlightPlaceId(places.length === 1 ? places[0].placeId : null);
  }

  async function saveRoute() {
    const placesToSave = draft.places;
    if (draft.coverageMode === "places") {
      const rootCount = placesToSave.filter(
        (place) => place.selectionRole === "root_whole" || place.selectionRole === "root_partial",
      ).length;
      if (!rootCount) {
        notify.error("Selecciona al menos una zona para poder guardar los cambios");
        return;
      }
    }
    const removedReservedSchedule = draft.id
      ? catalog.schedules.some((schedule) => schedule.routeDefinitionId === draft.id && schedule.isActive && schedule.reservedStops > 0 && !draft.schedules.some((item) => item.id === schedule.id && item.isActive))
      : false;
    if (removedReservedSchedule && !window.confirm("Desactivar este horario devolverá sus reservas futuras a Tareas. ¿Continuar?")) return;
    const payload = {
      name: draft.name,
      zoneName: draft.zoneName,
      color: draft.color,
      coverageMode: draft.coverageMode,
      postalCodes: [],
      places: draft.coverageMode === "places" ? placesToSave : [],
      schedules: draft.schedules.map((schedule) => ({
        id: schedule.id,
        weekday: schedule.weekday,
        startTime: schedule.startTime,
        estimatedEndTime: schedule.estimatedEndTime || null,
        maxStops: schedule.maxStops ? Number(schedule.maxStops) : null,
        maxBoxes: schedule.maxBoxes ? Number(schedule.maxBoxes) : null,
        defaultDriverId: schedule.defaultDriverId || null,
        isActive: schedule.isActive,
      })),
    };
    setBusy("save");
    try {
      const result = draft.id
        ? await updateGeographicRouteDefinitionAction({ ...payload, routeDefinitionId: draft.id })
        : await createGeographicRouteDefinitionAction(payload);
      if (!result.ok) return notify.error(result.error);
      notify.success(draft.id ? "Subruta actualizada" : "Subruta creada");
      const savedDraft = { ...draft, id: draft.id || result.data.id };
      setDraft(savedDraft);
      setSubrouteBaselineKey(coverageDraftSnapshotKey(savedDraft));
      setSubrouteBaselineDraft(savedDraft);
      setShowForm(true);
      setSubrouteHighlightPlaceId(null);
      onCatalogChange();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "No se pudo guardar la subruta");
    } finally {
      setBusy("");
    }
  }

  async function toggleDay(weekday: number) {
    const key = logisticsWeekdayKeys[weekday];
    const label = logisticsWeekdayLabels[weekday] || key;
    const enabled = catalog.enabledDays.includes(key);
    setDayCoverageTab("zones");
    setSelectedWeekday(weekday);
    setBusy(`day:${weekday}`);
    try {
      if (!enabled) {
        const existing = catalog.weekdayScheduleByWeekday[weekday];
        const result = await activateLogisticsRouteWeekdayAction({
          weekday,
          startTime: existing?.startTime || "10:00",
          estimatedEndTime: existing?.estimatedEndTime || null,
        });
        if (!result.ok) return notify.error(result.error);
        setEditingDaySchedule(false);
        notify.success(`${label} activado`);
        onCatalogChange();
        return;
      }
      const result = await setLogisticsRouteWeekdayEnabledAction({ day: key, enabled: false });
      if (!result.ok) return notify.error(result.error);
      setEditingDaySchedule(false);
      notify.success(`${label} desactivado`);
      onCatalogChange();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "No se pudo cambiar el día");
    } finally {
      setBusy("");
    }
  }

  async function saveDaySchedule() {
    if (!dayScheduleStart) return notify.error("La hora de inicio es obligatoria");
    if (!dayWithoutEnd && !dayScheduleEnd) return notify.error("Indica la hora de fin o marca Sin hora de fin");
    if (!dayWithoutEnd && dayScheduleEnd && dayScheduleEnd <= dayScheduleStart) {
      return notify.error("La hora final debe ser posterior a la inicial");
    }
    const estimatedEndTime = dayWithoutEnd ? null : dayScheduleEnd;
    setBusy(`schedule:${selectedWeekday}`);
    try {
      const result = await setLogisticsWeekdayScheduleAction({
        weekday: selectedWeekday,
        startTime: dayScheduleStart,
        estimatedEndTime,
      });
      if (!result.ok) return notify.error(result.error);
      notify.success(`Horario general de ${selectedWeekdayLabel} guardado`);
      setEditingDaySchedule(false);
      onCatalogChange();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "No se pudo guardar el horario");
    } finally {
      setBusy("");
    }
  }

  async function archiveRoute(route: LogisticsRouteDefinitionRow) {
    const reason = window.prompt(`Motivo para archivar “${route.name}”:`)?.trim() || "";
    if (!reason) return;
    if (!window.confirm("Las reservas futuras no convertidas volverán a Tareas. Las rutas ya creadas no cambiarán. ¿Continuar?")) return;
    setBusy(`archive:${route.id}`);
    try {
      const result = await archiveGeographicRouteDefinitionAction({ routeDefinitionId: route.id, reason });
      if (!result.ok) return notify.error(result.error);
      notify.success("Subruta archivada");
      onCatalogChange();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "No se pudo archivar la subruta");
    } finally {
      setBusy("");
    }
  }

  function hasUnsavedSubrouteChanges() {
    return showForm && Boolean(subrouteBaselineKey) && coverageDraftSnapshotKey(draft) !== subrouteBaselineKey;
  }

  function loadSubrouteDraft(nextDraft: RouteDraft, tab: SubrouteEditorTab = "schedules") {
    setDraft(nextDraft);
    setSubrouteBaselineKey(coverageDraftSnapshotKey(nextDraft));
    setSubrouteBaselineDraft(nextDraft);
    setSubrouteHighlightPlaceId(null);
    setSubrouteEditorTab(tab);
    setShowForm(true);
  }

  function resetSubrouteEditor() {
    setShowForm(false);
    setSubrouteEditorTab("schedules");
    setSubrouteHighlightPlaceId(null);
    setSubrouteBaselineKey("");
    setSubrouteBaselineDraft(null);
    setDraft(emptyDraft(selectedWeekday));
  }

  function closeSubrouteForm() {
    if (hasUnsavedSubrouteChanges()) {
      setPendingSubrouteDiscard({ action: "close" });
      return;
    }
    resetSubrouteEditor();
  }

  function openSubrouteEditor(
    route: (typeof selectedDayRoutes)[number],
    tab: SubrouteEditorTab = "schedules",
  ) {
    if (showForm && draft.id === route.id) {
      setSubrouteEditorTab(tab);
      return;
    }
    if (hasUnsavedSubrouteChanges()) {
      setPendingSubrouteDiscard({ action: "open", route, tab });
      return;
    }
    const nextDraft = routeToDraft(route);
    loadSubrouteDraft(nextDraft, tab);
  }

  function toggleSubrouteEditor(route: (typeof selectedDayRoutes)[number]) {
    if (showForm && draft.id === route.id) {
      closeSubrouteForm();
      return;
    }
    openSubrouteEditor(route);
  }

  function changeSubrouteColor(route: (typeof selectedDayRoutes)[number], color: string) {
    if (showForm && draft.id === route.id) {
      setDraft((current) => ({ ...current, color }));
      return;
    }
    if (hasUnsavedSubrouteChanges()) {
      setPendingSubrouteDiscard({ action: "color", route, color });
      return;
    }
    const routeDraft = routeToDraft(route);
    loadSubrouteDraft({ ...routeDraft, color });
  }

  function beginNewSubroute() {
    if (hasUnsavedSubrouteChanges()) {
      setPendingSubrouteDiscard({ action: "new" });
      return;
    }
    loadSubrouteDraft(emptyDraft(selectedWeekday));
  }

  function confirmPendingSubrouteDiscard() {
    const pending = pendingSubrouteDiscard;
    if (!pending) return;
    setPendingSubrouteDiscard(null);
    if (pending.action === "close") {
      resetSubrouteEditor();
      return;
    }
    if (pending.action === "new") {
      loadSubrouteDraft(emptyDraft(selectedWeekday));
      return;
    }
    const nextDraft = routeToDraft(pending.route);
    loadSubrouteDraft(
      pending.action === "color" ? { ...nextDraft, color: pending.color } : nextDraft,
      pending.action === "open" ? pending.tab : "schedules",
    );
  }

  const subrouteDirty =
    showForm && Boolean(subrouteBaselineKey) && coverageDraftSnapshotKey(draft) !== subrouteBaselineKey;
  const subrouteChangeDetailsList = subrouteChangeDetails(draft, subrouteBaselineDraft);
  const draftEditor = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="mb-3 grid gap-2 border-b border-black/70 pb-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <label className="grid min-w-0 gap-1">
          <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Ruta</span>
          <input
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            placeholder="Ruta Norte"
            disabled={!canManage}
            className="h-9 min-w-0 rounded-lg border border-black bg-surface-card px-3 text-sm font-bold capitalize text-white disabled:opacity-60"
          />
        </label>
        <label className="grid min-w-0 gap-1">
          <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Zona</span>
          <input
            value={draft.zoneName}
            onChange={(event) => setDraft({ ...draft, zoneName: event.target.value })}
            placeholder="Opcional"
            disabled={!canManage}
            className="h-9 min-w-0 rounded-lg border border-black bg-surface-card px-3 text-sm font-bold text-white disabled:opacity-60"
          />
        </label>
      </div>
      <div
        className="mb-3 flex items-center gap-5 border-b border-black/70"
        role="tablist"
        aria-label="Secciones de la subruta"
      >
        <button
          type="button"
          role="tab"
          aria-selected={subrouteEditorTab === "schedules"}
          aria-controls="subroute-schedules-panel"
          onClick={() => setSubrouteEditorTab("schedules")}
          className={`inline-flex h-9 items-center justify-center gap-1.5 border-b-2 px-1 text-xs font-black transition ${
            subrouteEditorTab === "schedules"
              ? "border-emerald-400 text-emerald-200"
              : "border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-100"
          }`}
        >
          <Clock3 className="h-4 w-4" aria-hidden />
          Horarios
          <span className="rounded-full bg-black/20 px-1.5 text-[10px] leading-4 text-current">
            {draft.schedules.length}
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={subrouteEditorTab === "coverage"}
          aria-controls="subroute-coverage-panel"
          onClick={() => setSubrouteEditorTab("coverage")}
          className={`inline-flex h-9 items-center justify-center gap-1.5 border-b-2 px-1 text-xs font-black transition ${
            subrouteEditorTab === "coverage"
              ? "border-emerald-400 text-emerald-200"
              : "border-transparent text-slate-400 hover:border-slate-600 hover:text-slate-100"
          }`}
        >
          <MapPinned className="h-4 w-4" aria-hidden />
          Cobertura
          <span className="rounded-full bg-black/20 px-1.5 text-[10px] leading-4 text-current">
            {draft.places.filter((place) => place.selectionRole !== "child_included").length}
          </span>
        </button>
      </div>

      {subrouteEditorTab === "schedules" ? (
        <div id="subroute-schedules-panel" role="tabpanel" className="grid gap-2">
            {canManage ? (
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-500">Define cuándo sale esta subruta</span>
                <button
                  type="button"
                  className={`${secondaryButtonClass} h-8 px-2 text-[11px]`}
                  onClick={() => setDraft({ ...draft, schedules: [...draft.schedules, emptySchedule(selectedWeekday)] })}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Horario
                </button>
              </div>
            ) : null}
            {draft.schedules.map((schedule, index) => (
              <div key={schedule.id || index} className="grid gap-2 border-t border-black/50 pt-2 first:border-t-0 first:pt-0">
                <div className="grid gap-2 sm:grid-cols-[minmax(0,6.5rem)_minmax(0,6.5rem)_minmax(0,6.5rem)_minmax(0,1fr)_auto]">
                  <select value={schedule.weekday} onChange={(event) => setDraft({ ...draft, schedules: draft.schedules.map((item, itemIndex) => itemIndex === index ? { ...item, weekday: Number(event.target.value) } : item) })} className="h-9 min-w-0 rounded-md border border-black bg-surface-card px-2 text-xs font-bold text-white" disabled={!canManage}>{logisticsWeekdayKeys.map((day, weekday) => <option key={day} value={weekday}>{logisticsWeekdayLabels[weekday]}</option>)}</select>
                  <input type="time" value={schedule.startTime} onChange={(event) => setDraft({ ...draft, schedules: draft.schedules.map((item, itemIndex) => itemIndex === index ? { ...item, startTime: event.target.value } : item) })} className="h-9 min-w-0 rounded-md border border-black bg-surface-card px-2 text-xs font-bold text-white" disabled={!canManage} />
                  <input type="time" value={schedule.estimatedEndTime} disabled={!canManage || !schedule.estimatedEndTime} onChange={(event) => setDraft({ ...draft, schedules: draft.schedules.map((item, itemIndex) => itemIndex === index ? { ...item, estimatedEndTime: event.target.value } : item) })} className="h-9 min-w-0 rounded-md border border-black bg-surface-card px-2 text-xs font-bold text-white disabled:opacity-40" />
                  <select value={schedule.defaultDriverId} onChange={(event) => setDraft({ ...draft, schedules: draft.schedules.map((item, itemIndex) => itemIndex === index ? { ...item, defaultDriverId: event.target.value } : item) })} className="h-9 min-w-0 rounded-md border border-black bg-surface-card px-2 text-xs font-bold text-white" disabled={!canManage}><option value="">Sin conductor</option>{routeMembers.filter((member) => member.roleSlug === "conductor").map((member) => <option key={member.id} value={member.id}>{member.label}</option>)}</select>
                  {canManage ? (
                    <button type="button" aria-label="Quitar horario" disabled={draft.schedules.length === 1} onClick={() => setDraft({ ...draft, schedules: draft.schedules.filter((_, itemIndex) => itemIndex !== index) })} className="grid h-9 w-9 shrink-0 place-items-center rounded-md border border-black text-rose-300 disabled:opacity-30"><X className="h-4 w-4" /></button>
                  ) : null}
                </div>
                <label className="flex items-center gap-2 text-[11px] font-black text-slate-400">
                  <input
                    type="checkbox"
                    checked={!schedule.estimatedEndTime}
                    disabled={!canManage}
                    onChange={(event) => setDraft({
                      ...draft,
                      schedules: draft.schedules.map((item, itemIndex) => itemIndex === index
                        ? { ...item, estimatedEndTime: event.target.checked ? "" : item.estimatedEndTime || "18:00" }
                        : item),
                    })}
                    className="h-3.5 w-3.5 accent-emerald-400"
                  />
                  Sin hora de fin · hasta terminar
                </label>
              </div>
             ))}
         </div>
      ) : (
        <div id="subroute-coverage-panel" role="tabpanel" className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="grid min-h-0 min-w-0 flex-1 gap-3 lg:grid-cols-[minmax(0,1.35fr)_minmax(16rem,0.65fr)] lg:items-stretch">
            <div id="subroute-coverage-map" aria-label="Mapa de cobertura" className="min-h-0 min-w-0 overflow-visible lg:h-full">
              <GeographicRouteCoverageMap
                places={draft.places}
                color={draft.color}
                label={draft.name || "ruta"}
                canPickPlaces={canManage}
                highlightedPlaceId={subrouteHighlightPlaceId}
                showLocationControl
                resizable={false}
                fillHeight
                onSelectPlace={toggleSubrouteCoveragePlaceFromMap}
                onSelectPlaces={addSubrouteCoveragePlacesFromMap}
              />
            </div>
            <div
              id="subroute-coverage-list"
              aria-label="Listado de cobertura"
              className="min-w-0 border-t border-black/70 pt-3 lg:border-l lg:border-t-0 lg:pl-3 lg:pt-0"
            >
              <GeographicRoutePlacesEditor
                places={draft.places}
                onChange={updateDraftCoverage}
                canManage={canManage}
                defaultColor={draft.color}
                highlightedPlaceId={subrouteHighlightPlaceId}
                onHighlightPlaceId={setSubrouteHighlightPlaceId}
                compact
                rootOnly
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );

  return (
    <div className="grid gap-3">
      <style>{`.logistics-capacity-input { -moz-appearance: textfield; } .logistics-capacity-input::-webkit-outer-spin-button, .logistics-capacity-input::-webkit-inner-spin-button { -webkit-appearance: none; appearance: none; margin: 0; }`}</style>
      <section className="border-y border-black py-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-emerald-300" /><h3 className="text-sm font-black text-white">Días maestros</h3></div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {logisticsWeekdayKeys.map((day, weekday) => {
            const enabled = catalog.enabledDays.includes(day);
            const label = logisticsWeekdayLabels[weekday] || day;
            const selected = selectedWeekday === weekday;
            return <div key={day} className={`flex h-11 min-w-0 items-center rounded-lg border px-1.5 transition-colors ${selected ? "border-sky-500/80 bg-sky-400/[0.06] shadow-[inset_0_0_0_1px_rgba(56,189,248,0.12)]" : "border-black bg-surface-inset hover:border-slate-700"}`}>
              <button
                type="button"
                aria-label={`Seleccionar ${label}; ${enabled ? "activo" : "inactivo"}`}
                aria-pressed={selected}
                onClick={() => {
                  setPendingCoveragePlaces(null);
                  setDayCoverageTab("zones");
                  setSelectedWeekday(weekday);
                }}
                className="flex h-9 min-w-0 flex-1 items-center rounded-md px-2 text-left outline-none transition-colors hover:bg-white/[0.03] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-sky-400 lg:px-1.5 xl:px-2"
              >
                <span className={`truncate text-xs font-black ${selected ? "text-white" : "text-slate-300"}`}>{label}</span>
              </button>
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                aria-label={`${enabled ? "Desactivar" : "Activar"} ${label}`}
                title={`${enabled ? "Desactivar" : "Activar"} ${label}`}
                disabled={!canManage || busy.startsWith("day:") || busy.startsWith("schedule:")}
                aria-busy={busy === `day:${weekday}`}
                onClick={(event) => {
                  event.stopPropagation();
                  void toggleDay(weekday);
                }}
                className={`flex h-7 w-7 shrink-0 items-center justify-center gap-1.5 rounded-md text-[10px] font-black transition hover:bg-white/[0.05] disabled:cursor-not-allowed disabled:opacity-50 2xl:w-auto 2xl:px-2 ${enabled ? "bg-emerald-400/10 text-emerald-300" : "bg-black/10 text-slate-500"}`}
              >
                {busy === `day:${weekday}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${enabled ? "bg-emerald-400" : "bg-slate-600"}`} />}
                <span className="hidden 2xl:inline">{enabled ? "Activo" : "Inactivo"}</span>
              </button>
            </div>;
          })}
        </div>

        {dayIsRoute ? (
          <div className="mt-3 grid gap-3">
            <div className="max-w-sm">
              {!showDayScheduleEditor && weekdaySchedule?.startTime ? (
                <button
                  type="button"
                  disabled={!canManage}
                  onClick={() => canManage && beginDaySchedule(selectedWeekday)}
                  className="group flex w-full items-center gap-2 rounded-full border border-black bg-surface-inset px-3 py-1.5 text-left transition hover:border-emerald-700/60 disabled:cursor-default"
                >
                  <span className="truncate text-xs font-black text-white">
                    {formatTime12Hour(weekdaySchedule.startTime)}
                    {weekdaySchedule.estimatedEndTime
                      ? `–${formatTime12Hour(weekdaySchedule.estimatedEndTime)}`
                      : " · hasta terminar"}
                  </span>
                  {canManage ? (
                    <span className="ml-auto shrink-0 text-[10px] font-black text-emerald-300 opacity-80 group-hover:opacity-100">
                      Editar
                    </span>
                  ) : null}
                </button>
              ) : canManage ? (
                <div className="rounded-xl border border-black bg-surface-inset p-2.5">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Horario</p>
                    {editingDaySchedule && weekdaySchedule?.startTime ? (
                      <button
                        type="button"
                        className="text-[10px] font-black text-slate-400 hover:text-slate-200"
                        onClick={() => setEditingDaySchedule(false)}
                      >
                        Cancelar
                      </button>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap items-end gap-2">
                    <label className="grid min-w-0 flex-1 gap-1">
                      <span className="text-[9px] font-black uppercase text-slate-500">Inicio</span>
                      <TimePickerInput
                        value={dayScheduleStart}
                        ariaLabel={`Inicio del horario de ${selectedWeekdayLabel}`}
                        onChange={setDayScheduleStart}
                        disabled={busy === `schedule:${selectedWeekday}`}
                        shellClassName="!h-9 !min-h-9 !px-2"
                      />
                    </label>
                    <label className="grid min-w-0 flex-1 gap-1">
                      <span className="text-[9px] font-black uppercase text-slate-500">Fin</span>
                      <TimePickerInput
                        value={dayScheduleEnd}
                        ariaLabel={`Fin del horario de ${selectedWeekdayLabel}`}
                        onChange={setDayScheduleEnd}
                        disabled={dayWithoutEnd || busy === `schedule:${selectedWeekday}`}
                        shellClassName="!h-9 !min-h-9 !px-2"
                      />
                    </label>
                    <button
                      type="button"
                      className={`${primaryButtonClass} h-9 shrink-0 px-3 text-xs`}
                      disabled={busy === `schedule:${selectedWeekday}`}
                      onClick={() => void saveDaySchedule()}
                    >
                      {busy === `schedule:${selectedWeekday}` ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      Guardar
                    </button>
                  </div>
                  <label className="mt-2 flex items-center gap-2 px-0.5 text-[10px] font-bold text-slate-400">
                    <input
                      type="checkbox"
                      checked={dayWithoutEnd}
                      onChange={(event) => {
                        setDayWithoutEnd(event.target.checked);
                        if (event.target.checked) setDayScheduleEnd("");
                      }}
                      className="h-3.5 w-3.5 accent-emerald-400"
                    />
                    Sin hora de fin · hasta terminar
                  </label>
                </div>
              ) : (
                <p className="text-xs font-bold text-slate-500">Sin horario configurado.</p>
              )}
            </div>

            {dayIsRoute ? (
              <div className="w-full min-w-0 overflow-x-hidden rounded-xl border border-black bg-surface-inset p-3">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                    Cobertura de {selectedWeekdayLabel}
                  </p>
                  {canManage ? (
                    <div className="flex items-center gap-2">
                      {coverageSaveState === "saving" || busy === `coverage:${selectedWeekday}` ? (
                        <p className="inline-flex items-center gap-1.5 text-[11px] font-bold text-slate-400">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Guardando cobertura…
                        </p>
                      ) : coverageSaveState === "pending" ? (
                        <p className="text-[11px] font-bold text-slate-500">Cambios sin guardar…</p>
                      ) : coverageSaveState === "saved" ? (
                        <p className="text-[11px] font-bold text-emerald-300">Cobertura guardada</p>
                      ) : coverageSaveState === "error" ? (
                        <button
                          type="button"
                          className={`${primaryButtonClass} h-8 px-3 text-[11px]`}
                          disabled={busy === `coverage:${selectedWeekday}`}
                          onClick={() => void saveDayCoverage()}
                        >
                          Reintentar guardado
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
                <div className="grid gap-3">
                  <CoverageSurfaceTabs
                    active={dayCoverageTab}
                    onChange={setDayCoverageTab}
                    zonesPanelId="day-coverage-zones"
                    mapPanelId="day-coverage-map"
                    pendingCount={
                      pendingCoveragePlaces?.scope === "day" ? pendingCoveragePlaces.places.length : 0
                    }
                  />
                  {dayCoverageTab === "map" ? (
                    <div
                      id="day-coverage-map"
                      role="tabpanel"
                      aria-labelledby="day-coverage-map-tab"
                      className="min-h-0 min-w-0 overflow-visible"
                    >
                      <GeographicRouteCoverageMap
                        places={dayPlaces}
                        previewPlaces={pendingCoveragePlaces?.scope === "day" ? pendingCoveragePlaces.places : []}
                        fitPreview={pendingCoveragePlaces?.scope === "day" ? pendingCoveragePlaces.fitPreview : false}
                        color={systemDayRoute?.color || "#10b981"}
                        label="ruta del día"
                        canPickPlaces={canManage}
                        highlightedPlaceId={dayHighlightPlaceId}
                        onSelectPlace={(place) => selectCoveragePlaceFromMap("day", place)}
                        onSelectPlaces={(places, options) => selectCoveragePlacesFromMap("day", places, options)}
                      />
                      {pendingCoveragePlaces?.scope === "day" ? (
                        <PendingCoverageAction
                          places={pendingCoveragePlaces.places}
                          batchColor={pendingCoveragePlaces.batchColor}
                          onCancel={cancelPendingCoveragePlaces}
                          onConfirm={confirmPendingCoveragePlaces}
                          onRemovePlace={removePendingCoveragePlace}
                          onBatchColorChange={setPendingBatchColor}
                        />
                      ) : null}
                    </div>
                  ) : (
                    <div
                      id="day-coverage-zones"
                      role="tabpanel"
                      aria-labelledby="day-coverage-zones-tab"
                      className="min-w-0"
                    >
                      <GeographicRoutePlacesEditor
                        places={dayPlaces}
                        onChange={setDayPlaces}
                        canManage={canManage}
                        defaultColor={systemDayRoute?.color || "#10b981"}
                        highlightedPlaceId={dayHighlightPlaceId}
                        onHighlightPlaceId={setDayHighlightPlaceId}
                        onProposePlace={(place) => proposeCoveragePlace("day", place, { fitPreview: true })}
                      />
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <section className="border-b border-black pb-3">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white">Subrutas</h3>
              {selectedDayRoutes.length > 0 ? (
                <CompactInfoDisclosure
                  compact
                  ariaLabel={`Cómo funcionan las subrutas del ${selectedWeekdayLabel}`}
                  title="Cómo funcionan las subrutas"
                >
                  Con subrutas, el <strong className="text-white">{selectedWeekdayLabel}</strong> ya no es la ruta: cada subruta usa su propio horario.
                </CompactInfoDisclosure>
              ) : null}
            </div>
            <p className="mt-1 text-[11px] font-bold text-slate-500">{selectedWeekdayLabel} · {selectedDayRoutes.length} {selectedDayRoutes.length === 1 ? "subruta configurada" : "subrutas configuradas"}</p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {subrouteDirty ? <p className="text-[11px] font-bold text-amber-200">Cambios sin guardar</p> : null}
            {canManage && selectedDayEnabled ? (
              <button type="button" className={`${primaryButtonClass} h-9 px-3 text-xs`} onClick={beginNewSubroute}>
                <Plus className="h-4 w-4" /> Nueva subruta
              </button>
            ) : null}
            {showForm ? (
              canManage ? (
                <>
                  <button type="button" className={`${secondaryButtonClass} h-9 px-3 text-xs`} onClick={closeSubrouteForm}>
                    Cancelar
                  </button>
                  <button
                    type="button"
                    className={`${primaryButtonClass} h-9 px-3 text-xs`}
                    disabled={busy === "save"}
                    onClick={() => void saveRoute()}
                  >
                    {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    Guardar
                  </button>
                </>
              ) : (
                <button type="button" className={`${secondaryButtonClass} h-9 px-3 text-xs`} onClick={closeSubrouteForm}>
                  Cerrar
                </button>
              )
            ) : null}
          </div>
        </div>

        <div className="grid min-h-[18rem] border border-black bg-surface-inset lg:min-h-[calc(100svh-18rem)] lg:grid-cols-[minmax(13rem,0.34fr)_minmax(0,0.66fr)]">
          <nav aria-label="Subrutas del día" className="border-b border-black lg:border-b-0 lg:border-r">
            <div className="border-b border-black px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Rutas del día</div>
            {selectedDayRoutes.length ? (
              <div className="divide-y divide-black/70">
                {selectedDayRoutes.map((route) => {
                  const selectedDaySchedules = route.schedules.filter((item) => item.weekday === selectedWeekday && item.isActive);
                  const selected = showForm && draft.id === route.id;
                  return (
                    <div key={route.id} className={`group relative ${selected ? "bg-emerald-400/[0.09]" : "hover:bg-white/[0.035]"}`}>
                      <button
                        type="button"
                        className="flex min-h-[5.25rem] w-full items-start gap-3 px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-400"
                        aria-pressed={selected}
                        onClick={() => toggleSubrouteEditor(route)}
                      >
                        <span className="mt-1 h-8 w-1 shrink-0 rounded-full" style={{ backgroundColor: selected ? draft.color : route.color }} aria-hidden />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-black capitalize text-white">{route.name}</span>
                          <span className="mt-1 block truncate text-[11px] font-bold text-slate-400">{selectedDaySchedules.map(scheduleSummary).join(" · ") || "Sin horario"}</span>
                          <span className="mt-2 block text-[10px] font-black uppercase tracking-wide text-slate-500">{selected ? "Seleccionada" : "Editar subruta"}</span>
                        </span>
                      </button>
                      <div className="flex items-center justify-end gap-1 px-3 pb-3 pl-10">
                        {canManage ? (
                          <>
                            <label className="relative grid h-7 w-7 cursor-pointer place-items-center rounded-md border border-black text-slate-400 hover:text-white" title={`Cambiar color de ${route.name}`}>
                              <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: selected ? draft.color : route.color }} aria-hidden />
                              <input type="color" value={selected ? draft.color : route.color} aria-label={`Cambiar color de ${route.name}`} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" onChange={(event) => changeSubrouteColor(route, event.target.value)} />
                            </label>
                            <button type="button" className={`${secondaryButtonClass} h-7 w-7 shrink-0 p-0 text-rose-200`} aria-label={`Archivar ${route.name}`} disabled={busy === `archive:${route.id}`} onClick={() => void archiveRoute(route)}>
                              {busy === `archive:${route.id}` ? <Loader2 className="h-3 w-3 animate-spin" /> : <Archive className="h-3 w-3" />}
                            </button>
                          </>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="px-3 py-6 text-center text-xs font-bold text-slate-500">Aún no hay subrutas para este día.</div>
            )}
          </nav>

          <div id={showForm && draft.id ? `subroute-editor-${draft.id}` : "subroute-new-editor"} className="flex h-full min-h-0 min-w-0 flex-col bg-surface-card px-3 py-3 sm:px-4">
            {showForm ? (
              <>
                <div className="mb-3 flex items-start justify-between gap-3 border-b border-black/70 pb-3">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200">{draft.id ? "Editar subruta" : "Nueva subruta"}</p>
                    <p className="mt-1 text-xs font-bold text-slate-400">{draft.id ? draft.name || "Sin nombre" : "Crea una ruta independiente para este día"}</p>
                  </div>
                  <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-slate-500">{selectedWeekdayLabel}</span>
                </div>
                {draftEditor}
              </>
            ) : (
              <div className="grid min-h-[16rem] place-items-center px-6 text-center">
                <div>
                  <p className="text-sm font-black text-slate-300">Selecciona una subruta</p>
                  <p className="mx-auto mt-1 max-w-xs text-xs font-bold leading-5 text-slate-500">El editor aparecerá aquí. Así puedes recorrer las rutas sin abrir y cerrar tarjetas.</p>
                  {canManage && selectedDayEnabled ? <button type="button" className={`${secondaryButtonClass} mt-4 h-9 px-3 text-xs`} onClick={beginNewSubroute}><Plus className="h-4 w-4" /> Nueva subruta</button> : null}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <ActionConfirmDialog
        open={Boolean(pendingSubrouteDiscard)}
        title="Cambios sin guardar"
        message="La subruta abierta tiene cambios que todavía no se han guardado. Si continúas, se descartarán:"
        details={
          <ul className="list-disc space-y-1 pl-5 text-sm font-bold leading-snug text-slate-200">
            {(subrouteChangeDetailsList.length ? subrouteChangeDetailsList : ["Cambios de la subruta abierta"]).map((change) => (
              <li key={change}>{change}</li>
            ))}
          </ul>
        }
        confirmLabel="Descartar cambios"
        cancelLabel="Seguir editando"
        tone="warning"
        onCancel={() => setPendingSubrouteDiscard(null)}
        onConfirm={confirmPendingSubrouteDiscard}
      />

    </div>
  );
}
