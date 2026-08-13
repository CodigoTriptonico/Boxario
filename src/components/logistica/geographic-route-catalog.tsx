"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, CalendarDays, Clock3, Loader2, MapPin, Plus, X } from "lucide-react";
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
  scope: "day" | "draft";
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
  coverageMode: "places",
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
  pendingCount = 0,
}: {
  active: CoverageSurfaceTab;
  onChange: (next: CoverageSurfaceTab) => void;
  zonesPanelId: string;
  mapPanelId: string;
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
          ["zones", "Zonas", zonesPanelId],
          ["map", "Mapa", mapPanelId],
        ] as const
      ).map(([id, label, panelId]) => {
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
  const [subrouteSchedulesOpen, setSubrouteSchedulesOpen] = useState(false);
  const [subrouteCoverageOpen, setSubrouteCoverageOpen] = useState(false);
  const [subrouteBaselineKey, setSubrouteBaselineKey] = useState("");
  const [editingDaySchedule, setEditingDaySchedule] = useState(false);
  const [dayScheduleStart, setDayScheduleStart] = useState("10:00");
  const [dayScheduleEnd, setDayScheduleEnd] = useState("");
  const [dayWithoutEnd, setDayWithoutEnd] = useState(false);
  const [dayPlaces, setDayPlaces] = useState<RouteCoveragePlace[]>([]);
  const [dayHighlightPlaceId, setDayHighlightPlaceId] = useState<string | null>(null);
  const [draftHighlightPlaceId, setDraftHighlightPlaceId] = useState<string | null>(null);
  const [pendingCoveragePlaces, setPendingCoveragePlaces] = useState<PendingCoveragePlaces | null>(null);
  const [draftCoverageTab, setDraftCoverageTab] = useState<CoverageSurfaceTab>("zones");
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
    setSelectedWeekday(weekday);
    setDayScheduleStart(existing?.startTime || "10:00");
    setDayScheduleEnd(existing?.estimatedEndTime || "");
    setDayWithoutEnd(!existing?.estimatedEndTime);
    setEditingDaySchedule(true);
  }

  function proposeCoveragePlaces(
    scope: "day" | "draft",
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
        else setDraftHighlightPlaceId(only.placeId);
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
    // Multi-select previews share the same fill; don't pin highlight to the first piece
    // (that used to attenuate every other pending outline to an edge-only look).
    const highlightId = colored.length === 1 ? colored[0]?.placeId || null : null;
    if (scope === "day") setDayHighlightPlaceId(highlightId);
    else setDraftHighlightPlaceId(highlightId);
  }

  function proposeCoveragePlace(
    scope: "day" | "draft",
    place: RouteCoveragePlace,
    options?: { fitPreview?: boolean },
  ) {
    proposeCoveragePlaces(scope, [place], options);
  }

  function selectCoveragePlaceFromMap(scope: "day" | "draft", place: RouteCoveragePlace) {
    // While a preview batch is open, map clicks edit that pending list (add/remove), not confirmed coverage.
    if (pendingCoveragePlaces && pendingCoveragePlaces.scope === scope) {
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
        if (!current || current.scope !== scope) return current;
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
      else setDraftHighlightPlaceId(place.placeId);
      return;
    }

    const current = scope === "day" ? dayPlaces : draft.places;
    if (current.some((item) => item.placeId === place.placeId)) {
      const next = removeCoveragePlaceSelection(current, place.placeId);
      if (scope === "day") {
        setDayPlaces(next);
        setDayHighlightPlaceId(null);
      } else {
        setDraft((currentDraft) => ({ ...currentDraft, places: next }));
        setDraftHighlightPlaceId(null);
      }
      notify.success(`${place.displayName} se quitó de la cobertura`);
      return;
    }

    proposeCoveragePlaces(scope, [place], { fitPreview: false });
  }

  function selectCoveragePlacesFromMap(
    scope: "day" | "draft",
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
      setDraft((current) => ({
        ...current,
        places: applyPendingPlacesToCoverage(current.places, pending, batchColor, current.color),
      }));
      setDraftHighlightPlaceId(pending[0]?.placeId || null);
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
    if (!pendingCoveragePlaces?.places.length) return;
    if (pendingCoveragePlaces.scope === "draft") {
      setDraftCoverageTab("map");
      setSubrouteCoverageOpen(true);
    }
    else setDayCoverageTab("map");
  }, [pendingCoveragePlaces]);

  useEffect(() => {
    setDayCoverageTab("zones");
  }, [selectedWeekday]);

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

  async function saveRoute() {
    let placesToSave = draft.places;
    if (
      draft.coverageMode === "places" &&
      pendingCoveragePlaces?.scope === "draft" &&
      pendingCoveragePlaces.places.length
    ) {
      placesToSave = applyPendingPlacesToCoverage(
        draft.places,
        pendingCoveragePlaces.places,
        pendingCoveragePlaces.batchColor,
        draft.color,
      );
      setPendingCoveragePlaces(null);
      setDraft((current) => ({ ...current, places: placesToSave }));
      setDraftHighlightPlaceId(placesToSave[0]?.placeId || draftHighlightPlaceId);
    }

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
      const nextDraft = emptyDraft(selectedWeekday);
      setDraft(nextDraft);
      setSubrouteBaselineKey("");
      setShowForm(false);
      setSubrouteSchedulesOpen(false);
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

  function closeSubrouteForm() {
    if (
      showForm &&
      subrouteBaselineKey &&
      coverageDraftSnapshotKey(draft) !== subrouteBaselineKey &&
      !window.confirm("Hay cambios sin guardar. ¿Cerrar sin guardar?")
    ) {
      return;
    }
    setPendingCoveragePlaces((current) => (current?.scope === "draft" ? null : current));
    setShowForm(false);
    setSubrouteSchedulesOpen(false);
    setSubrouteCoverageOpen(false);
    setSubrouteBaselineKey("");
    setDraftCoverageTab("zones");
    setDraft(emptyDraft(selectedWeekday));
    setDraftHighlightPlaceId(null);
  }

  function toggleSubrouteEditor(route: (typeof selectedDayRoutes)[number]) {
    if (showForm && draft.id === route.id) {
      closeSubrouteForm();
      return;
    }
    if (
      showForm &&
      subrouteBaselineKey &&
      coverageDraftSnapshotKey(draft) !== subrouteBaselineKey &&
      !window.confirm("Hay cambios sin guardar en la subruta abierta. ¿Descartarlos?")
    ) {
      return;
    }
    setPendingCoveragePlaces((current) => (current?.scope === "draft" ? null : current));
    const nextDraft = routeToDraft(route);
    setDraft(nextDraft);
    setSubrouteBaselineKey(coverageDraftSnapshotKey(nextDraft));
    setDraftHighlightPlaceId(null);
    setSubrouteSchedulesOpen(false);
    setSubrouteCoverageOpen(false);
    setDraftCoverageTab("zones");
    setShowForm(true);
  }

  function changeSubrouteColor(route: (typeof selectedDayRoutes)[number], color: string) {
    if (showForm && draft.id === route.id) {
      setDraft((current) => ({ ...current, color }));
      return;
    }
    if (
      showForm &&
      subrouteBaselineKey &&
      coverageDraftSnapshotKey(draft) !== subrouteBaselineKey &&
      !window.confirm("Hay cambios sin guardar en la subruta abierta. ¿Descartarlos?")
    ) {
      return;
    }
    setPendingCoveragePlaces((current) => (current?.scope === "draft" ? null : current));
    const routeDraft = routeToDraft(route);
    setDraft({ ...routeDraft, color });
    setSubrouteBaselineKey(coverageDraftSnapshotKey(routeDraft));
    setDraftHighlightPlaceId(null);
    setSubrouteSchedulesOpen(false);
    setSubrouteCoverageOpen(false);
    setDraftCoverageTab("zones");
    setShowForm(true);
  }

  function beginNewSubroute() {
    if (
      showForm &&
      subrouteBaselineKey &&
      coverageDraftSnapshotKey(draft) !== subrouteBaselineKey &&
      !window.confirm("Hay cambios sin guardar. ¿Descartarlos?")
    ) {
      return;
    }
    setPendingCoveragePlaces((current) => (current?.scope === "draft" ? null : current));
    const nextDraft = emptyDraft(selectedWeekday);
    setDraft(nextDraft);
    setSubrouteBaselineKey(coverageDraftSnapshotKey(nextDraft));
    setDraftHighlightPlaceId(null);
    setSubrouteSchedulesOpen(true);
    setSubrouteCoverageOpen(false);
    setDraftCoverageTab("zones");
    setShowForm(true);
  }

  const draftScheduleSummary = draft.schedules
    .filter((item) => item.isActive)
    .map(scheduleSummary)
    .join(" · ");
  const subrouteDirty =
    showForm && Boolean(subrouteBaselineKey) && coverageDraftSnapshotKey(draft) !== subrouteBaselineKey;
  const draftHasPendingPlaces =
    pendingCoveragePlaces?.scope === "draft" && pendingCoveragePlaces.places.length > 0;
  const draftPlacesMissing =
    draft.coverageMode === "places" &&
    !draftHasPendingPlaces &&
    !draft.places.some(
      (place) => place.selectionRole === "root_whole" || place.selectionRole === "root_partial",
    );

  const draftEditor = (
    <div className="min-w-0">
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-11">
        <label className="grid min-w-0 gap-1 xl:col-span-4">
          <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Nombre</span>
          <input
            value={draft.name}
            onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            placeholder="Ej. Ruta norte"
            disabled={!canManage}
            className="h-9 min-w-0 rounded-lg border border-black bg-surface-card px-3 text-sm font-bold text-white disabled:opacity-60"
          />
        </label>
        <label className="grid min-w-0 gap-1 xl:col-span-3">
          <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Zona</span>
          <input
            value={draft.zoneName}
            onChange={(event) => setDraft({ ...draft, zoneName: event.target.value })}
            placeholder="Opcional"
            disabled={!canManage}
            className="h-9 min-w-0 rounded-lg border border-black bg-surface-card px-3 text-sm font-bold text-white disabled:opacity-60"
          />
        </label>
        <label className="grid min-w-0 gap-1 xl:col-span-4">
          <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">Cobertura</span>
          <select
            value={draft.coverageMode}
            onChange={(event) => {
              const coverageMode = event.target.value as RouteDraft["coverageMode"];
              setDraft({ ...draft, coverageMode });
              if (coverageMode === "places") setSubrouteCoverageOpen(true);
            }}
            disabled={!canManage}
            className="h-9 min-w-0 rounded-lg border border-black bg-surface-card px-2 text-xs font-bold text-white disabled:opacity-60"
          >
            <option value="day_only">Por día y aprobación</option>
            <option value="places">Por ciudad / zona</option>
          </select>
        </label>
      </div>

      {draft.coverageMode === "places" ? (
        <div className="mt-4 grid gap-2 border-t border-black/70 pt-3">
          <button
            type="button"
            className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-full border border-black bg-surface-inset px-3 py-1.5 text-left outline-none transition hover:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-sky-400"
            aria-expanded={subrouteCoverageOpen}
            aria-controls="subroute-coverage-content"
            onClick={() => setSubrouteCoverageOpen((current) => !current)}
          >
            <MapPin className="h-3.5 w-3.5 shrink-0 text-sky-300" aria-hidden />
            <span className="flex min-w-0 items-center gap-2">
              <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-slate-400">Cobertura</span>
              <span className="min-w-0 truncate text-[11px] font-bold text-slate-300">Ciudades y zonas atendidas por esta subruta</span>
            </span>
            <span className="shrink-0 text-[11px] font-black text-emerald-300">
              {subrouteCoverageOpen ? "Ocultar" : "Ver"}
            </span>
          </button>
          {subrouteCoverageOpen ? (
            <div id="subroute-coverage-content" className="grid gap-2">
              <div className="flex justify-end">
                <CoverageSurfaceTabs
                  active={draftCoverageTab}
                  onChange={setDraftCoverageTab}
                  zonesPanelId="subroute-coverage-zones"
                  mapPanelId="subroute-coverage-map"
                  pendingCount={
                    pendingCoveragePlaces?.scope === "draft" ? pendingCoveragePlaces.places.length : 0
                  }
                />
              </div>
              {draftCoverageTab === "map" ? (
            <div
              id="subroute-coverage-map"
              role="tabpanel"
              aria-labelledby="subroute-coverage-map-tab"
              className="min-h-0 min-w-0 overflow-x-hidden"
            >
              <GeographicRouteCoverageMap
                places={draft.places}
                previewPlaces={pendingCoveragePlaces?.scope === "draft" ? pendingCoveragePlaces.places : []}
                fitPreview={pendingCoveragePlaces?.scope === "draft" ? pendingCoveragePlaces.fitPreview : false}
                color={draft.color}
                label="subruta"
                canPickPlaces={canManage}
                highlightedPlaceId={draftHighlightPlaceId}
                onSelectPlace={(place) => selectCoveragePlaceFromMap("draft", place)}
                onSelectPlaces={(places, options) => selectCoveragePlacesFromMap("draft", places, options)}
              />
              {pendingCoveragePlaces?.scope === "draft" ? (
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
              id="subroute-coverage-zones"
              role="tabpanel"
              aria-labelledby="subroute-coverage-zones-tab"
              className="min-w-0"
            >
              <GeographicRoutePlacesEditor
                places={draft.places}
                onChange={(next) => setDraft((current) => ({
                  ...current,
                  places: typeof next === "function" ? next(current.places) : next,
                }))}
                canManage={canManage}
                compact
                defaultColor={draft.color}
                highlightedPlaceId={draftHighlightPlaceId}
                onHighlightPlaceId={setDraftHighlightPlaceId}
                onProposePlace={(place) => proposeCoveragePlace("draft", place, { fitPreview: true })}
              />
              {draftPlacesMissing ? (
                <p
                  role="status"
                  className="mt-2 rounded-md border border-rose-700/70 bg-rose-950/40 px-3 py-2 text-[12px] font-bold text-rose-100"
                >
                  Selecciona al menos una zona para poder guardar los cambios.
                </p>
              ) : null}
            </div>
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 border-t border-black/70">
        <button
          type="button"
          className="inline-flex min-w-0 max-w-full items-center gap-2 rounded-full border border-black bg-surface-inset px-3 py-1.5 text-left transition hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
          aria-expanded={subrouteSchedulesOpen}
          onClick={() => setSubrouteSchedulesOpen((current) => !current)}
        >
          <Clock3 className="h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden />
          <span className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-slate-400">Horarios</span>
            <span className="min-w-0 truncate text-[11px] font-bold text-slate-300">
              {draftScheduleSummary || "Sin horarios"}
            </span>
          </span>
          <span className="shrink-0 text-[11px] font-black text-emerald-300">
            {subrouteSchedulesOpen ? "Ocultar" : canManage ? "Editar" : "Ver"}
          </span>
        </button>
        {subrouteSchedulesOpen ? (
          <div className="grid gap-2 pb-2">
            {canManage ? (
              <div className="flex justify-end">
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
                <div className="grid gap-2 sm:grid-cols-[minmax(0,6.5rem)_minmax(0,6.5rem)_minmax(0,6.5rem)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <select value={schedule.weekday} onChange={(event) => setDraft({ ...draft, schedules: draft.schedules.map((item, itemIndex) => itemIndex === index ? { ...item, weekday: Number(event.target.value) } : item) })} className="h-9 min-w-0 rounded-md border border-black bg-surface-card px-2 text-xs font-bold text-white" disabled={!canManage}>{logisticsWeekdayKeys.map((day, weekday) => <option key={day} value={weekday}>{logisticsWeekdayLabels[weekday]}</option>)}</select>
                  <input type="time" value={schedule.startTime} onChange={(event) => setDraft({ ...draft, schedules: draft.schedules.map((item, itemIndex) => itemIndex === index ? { ...item, startTime: event.target.value } : item) })} className="h-9 min-w-0 rounded-md border border-black bg-surface-card px-2 text-xs font-bold text-white" disabled={!canManage} />
                  <input type="time" value={schedule.estimatedEndTime} disabled={!canManage || !schedule.estimatedEndTime} onChange={(event) => setDraft({ ...draft, schedules: draft.schedules.map((item, itemIndex) => itemIndex === index ? { ...item, estimatedEndTime: event.target.value } : item) })} className="h-9 min-w-0 rounded-md border border-black bg-surface-card px-2 text-xs font-bold text-white disabled:opacity-40" />
                  <input type="number" min={1} value={schedule.maxStops} onChange={(event) => setDraft({ ...draft, schedules: draft.schedules.map((item, itemIndex) => itemIndex === index ? { ...item, maxStops: event.target.value } : item) })} placeholder="Máx. paradas" aria-label="Máximo de paradas" title="Máximo de paradas" className="logistics-capacity-input h-9 w-full min-w-0 appearance-none rounded-md border border-black bg-surface-card px-2 text-xs font-bold text-white" disabled={!canManage} />
                  <input type="number" min={1} value={schedule.maxBoxes} onChange={(event) => setDraft({ ...draft, schedules: draft.schedules.map((item, itemIndex) => itemIndex === index ? { ...item, maxBoxes: event.target.value } : item) })} placeholder="Máx. cajas" aria-label="Máximo de cajas" title="Máximo de cajas" className="logistics-capacity-input h-9 w-full min-w-0 appearance-none rounded-md border border-black bg-surface-card px-2 text-xs font-bold text-white" disabled={!canManage} />
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
        ) : null}
      </div>

      <div className="-mx-3 -mb-3 mt-2 flex flex-wrap items-center justify-end gap-2 border-t border-black/70 bg-black/10 px-3 py-3">
        {draftPlacesMissing ? (
          <p className="mr-auto text-[11px] font-bold text-rose-200">
            Selecciona al menos una zona para poder guardar los cambios
          </p>
        ) : subrouteDirty ? (
          <p className="mr-auto text-[11px] font-bold text-amber-200">Cambios sin guardar</p>
        ) : null}
        {canManage ? (
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
        )}
      </div>
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
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-white">Subrutas</h3>
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
          {canManage && selectedDayEnabled ? (
            <button
              type="button"
              className={`${primaryButtonClass} h-9 px-3 text-xs`}
              onClick={beginNewSubroute}
            >
              <Plus className="h-4 w-4" />
              Nueva subruta
            </button>
          ) : null}
        </div>

        {showForm && !draft.id ? (
          <div className="mb-3 min-w-0 rounded-lg border border-black bg-surface-card px-3 py-3">{draftEditor}</div>
        ) : null}

        {selectedDayRoutes.length ? (
          <div className="grid gap-2">
            {selectedDayRoutes.map((route) => {
              const selectedDaySchedules = route.schedules.filter((item) => item.weekday === selectedWeekday && item.isActive);
              const expanded = showForm && draft.id === route.id;
              const visiblePlaces = (route.places || []).filter((place) => place.selectionRole !== "child_included").length;
              const coverageSummary = route.coverageMode === "places"
                ? `${visiblePlaces} ${visiblePlaces === 1 ? "lugar" : "lugares"}`
                : "Sin cobertura configurada";
              return (
                <article key={route.id} className={`overflow-hidden rounded-xl border bg-surface-card transition-colors ${expanded ? "border-emerald-700/70" : "border-black hover:border-slate-700"}`}>
                  <div className={`flex items-center gap-2 px-3 py-2.5 ${expanded ? "bg-emerald-400/[0.04]" : ""}`}>
                    {canManage ? (
                      <label
                        className="relative h-10 w-4 shrink-0 cursor-pointer rounded-full outline-none transition-transform hover:scale-110 focus-within:ring-2 focus-within:ring-sky-400 focus-within:ring-offset-2 focus-within:ring-offset-surface-card"
                        title={`Cambiar color de ${route.name}`}
                      >
                        <span
                          className="absolute inset-x-1 inset-y-0 rounded-full"
                          style={{ backgroundColor: expanded ? draft.color : route.color }}
                          aria-hidden
                        />
                        <input
                          type="color"
                          value={expanded ? draft.color : route.color}
                          aria-label={`Cambiar color de ${route.name}`}
                          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                          onChange={(event) => changeSubrouteColor(route, event.target.value)}
                        />
                      </label>
                    ) : (
                      <span className="h-10 w-2 shrink-0 rounded-full" style={{ backgroundColor: route.color }} aria-hidden />
                    )}
                    <button
                      type="button"
                      className="group flex min-w-0 flex-1 items-center gap-3 rounded-lg px-1 py-1.5 text-left transition hover:bg-white/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
                      aria-expanded={expanded}
                      aria-controls={`subroute-editor-${route.id}`}
                      onClick={() => toggleSubrouteEditor(route)}
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-black text-white">{route.name}</span>
                        <span className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] font-bold text-slate-400">
                          <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5 text-slate-500" />{selectedDaySchedules.map(scheduleSummary).join(" · ") || "Sin horario"}</span>
                          <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-slate-500" />{coverageSummary}</span>
                        </span>
                      </span>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black transition ${expanded ? "bg-emerald-400/15 text-emerald-200" : "bg-surface-inset text-slate-400 group-hover:text-slate-200"}`}>
                        {expanded ? "Editando" : "Abrir"}
                      </span>
                    </button>
                    {expanded ? (
                      <CompactInfoDisclosure
                        compact
                        align="right"
                        ariaLabel={`Información para configurar ${route.name}`}
                        title="Configuración de la subruta"
                      >
                        Identidad, cobertura y horario en una sola vista.
                      </CompactInfoDisclosure>
                    ) : null}
                    {canManage ? (
                      <button
                        type="button"
                        className={`${secondaryButtonClass} h-8 w-8 shrink-0 p-0 text-rose-200`}
                        aria-label={`Archivar ${route.name}`}
                        disabled={busy === `archive:${route.id}`}
                        onClick={() => void archiveRoute(route)}
                      >
                        {busy === `archive:${route.id}` ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
                      </button>
                    ) : null}
                  </div>
                  {expanded ? (
                    <div id={`subroute-editor-${route.id}`} className="min-w-0 overflow-x-hidden border-t border-black px-3 py-3">
                      {draftEditor}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        ) : null}
      </section>

    </div>
  );
}
