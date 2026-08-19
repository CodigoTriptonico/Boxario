"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Archive, ArrowLeft, CalendarDays, ChevronDown, Clock3, Compass, List, Loader2, Map as MapIcon, MapPinned, Plus, Route, X } from "lucide-react";
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
import { usePageViewLayout } from "@/components/ui/ui-surface-preferences-provider";
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

type ScheduleChipData = Pick<ScheduleDraft, "weekday" | "startTime" | "estimatedEndTime"> & {
  id?: string;
  isActive?: boolean;
};

function ScheduleDayChip({
  schedule,
  open,
  pinned,
  onOpen,
  onToggle,
  onClose,
}: {
  schedule: ScheduleChipData;
  open: boolean;
  pinned: boolean;
  onOpen: () => void;
  onToggle: () => void;
  onClose: () => void;
}) {
  const day = logisticsWeekdayLabels[schedule.weekday] || "Día";
  const window = schedule.estimatedEndTime
    ? `${formatTime12Hour(schedule.startTime)}–${formatTime12Hour(schedule.estimatedEndTime)}`
    : `${formatTime12Hour(schedule.startTime)} · hasta terminar`;

  return (
    <div
      className="relative"
      onMouseEnter={onOpen}
      onMouseLeave={() => {
        if (!pinned) onClose();
      }}
      onFocus={onOpen}
      onBlur={() => {
        if (!pinned) onClose();
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-label={`${day}: ${window}`}
        title={`${day}: ${window}`}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
        className="inline-flex min-h-8 items-center rounded-lg border border-emerald-500/35 bg-emerald-950/45 px-2.5 text-[10px] font-black text-emerald-100 transition hover:border-emerald-400 hover:bg-emerald-900/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
      >
        {day}
      </button>
      <div
        role="tooltip"
        className={`pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-max max-w-52 -translate-x-1/2 rounded-lg border border-slate-600 bg-[#0f1412] px-2.5 py-2 text-[10px] font-bold text-slate-200 shadow-xl transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
      >
        <span className="block text-emerald-200">{day}</span>
        <span className="block">{window}</span>
        <span className="mt-0.5 block text-[9px] font-black uppercase tracking-wide text-slate-500">
          {schedule.isActive ? "Activo" : "Inactivo"}
        </span>
      </div>
    </div>
  );
}

function ScheduleDayChips({ schedules }: { schedules: ScheduleChipData[] }) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [pinnedKey, setPinnedKey] = useState<string | null>(null);

  if (!schedules.length) return <span className="text-[10px] font-bold text-slate-500">Sin horario</span>;

  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
      {schedules.map((schedule, index) => {
        const key = `${schedule.id || schedule.weekday}:${index}`;
        return (
          <ScheduleDayChip
            key={key}
            schedule={schedule}
            open={openKey === key}
            pinned={pinnedKey === key}
            onOpen={() => setOpenKey(key)}
            onClose={() => setOpenKey((current) => (current === key ? pinnedKey : current))}
            onToggle={() => {
              const nextPinned = pinnedKey === key ? null : key;
              setPinnedKey(nextPinned);
              setOpenKey(nextPinned || null);
            }}
          />
        );
      })}
    </div>
  );
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

function draftCoverageCountLabel(draft: RouteDraft) {
  const count = draft.places.filter(
    (place) => place.selectionRole === "root_whole" || place.selectionRole === "root_partial",
  ).length;
  if (!count) return "Sin cobertura";
  return `${count} ${count === 1 ? "ciudad" : "ciudades"}`;
}

function draftCoverageChangeLabel(before: RouteDraft, after: RouteDraft) {
  const roots = (draft: RouteDraft) =>
    draft.places.filter(
      (place) => place.selectionRole === "root_whole" || place.selectionRole === "root_partial",
    );
  const beforeNames = new Set(roots(before).map((place) => place.displayName));
  const afterNames = new Set(roots(after).map((place) => place.displayName));
  const removed = [...beforeNames].filter((name) => !afterNames.has(name));
  const added = [...afterNames].filter((name) => !beforeNames.has(name));
  const compactNames = (names: string[]) => {
    if (names.length <= 2) return names.join(" y ");
    return `${names.slice(0, 2).join(", ")} +${names.length - 2}`;
  };
  const details = [
    removed.length ? `Quitaste ${compactNames(removed)}` : "",
    added.length ? `Agregaste ${compactNames(added)}` : "",
  ].filter(Boolean);
  if (details.length) return details.join(" · ");
  return `Actualizaste zonas · ${draftCoverageCountLabel(before)} → ${draftCoverageCountLabel(after)}`;
}

function draftSchedulesLabel(draft: RouteDraft) {
  const active = draft.schedules.filter((schedule) => schedule.isActive).map(scheduleSummary);
  const inactiveCount = draft.schedules.filter((schedule) => !schedule.isActive).length;
  if (!active.length) return inactiveCount ? "ningún día activo" : "sin horarios";
  return `${active.join(" · ")}${inactiveCount ? ` · ${inactiveCount} inactivo${inactiveCount === 1 ? "" : "s"}` : ""}`;
}

type RouteChangeDetail = { label: string; value: string };

function subrouteChangeDetails(current: RouteDraft, baseline: RouteDraft | null) {
  if (!baseline) return [] as RouteChangeDetail[];
  const changes: RouteChangeDetail[] = [];
  const displayValue = (value: string) => value.trim() || "vacío";

  if (current.name !== baseline.name) {
    changes.push({ label: "Nombre", value: `${displayValue(baseline.name)} → ${displayValue(current.name)}` });
  }
  if (current.zoneName !== baseline.zoneName) {
    changes.push({ label: "Zona", value: `${displayValue(baseline.zoneName)} → ${displayValue(current.zoneName)}` });
  }
  if (current.color !== baseline.color) {
    changes.push({ label: "Color", value: `${baseline.color} → ${current.color}` });
  }
  if (
    current.coverageMode !== baseline.coverageMode ||
    coveragePlacesSnapshotKey(current.places) !== coveragePlacesSnapshotKey(baseline.places)
  ) {
    changes.push({ label: "Cobertura", value: draftCoverageChangeLabel(baseline, current) });
  }
  if (coverageDraftSnapshotKey(current).split("::").at(-1) !== coverageDraftSnapshotKey(baseline).split("::").at(-1)) {
    changes.push({ label: "Horarios y días", value: `${draftSchedulesLabel(baseline)} → ${draftSchedulesLabel(current)}` });
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
  const { layout: routeViewLayout } = usePageViewLayout("logistics.routeCatalog");
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
  const [subrouteCoverageTab, setSubrouteCoverageTab] = useState<CoverageSurfaceTab>("zones");
  const [addingScheduleDay, setAddingScheduleDay] = useState(false);
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
  const driverOptions = useMemo(
    () => routeMembers.map((m) => ({ id: m.id, label: m.label })),
    [routeMembers],
  );

  // The route is the primary catalog entity. Day schedules are edited inside it.
  const selectedDayRoutes = activeRoutes;
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
    const pendingSubroute = pendingCoveragePlaces?.scope === "subroute" ? pendingCoveragePlaces : null;
    const placesToSave = pendingSubroute
      ? applyPendingPlacesToCoverage(
          draft.places,
          pendingSubroute.places,
          pendingSubroute.batchColor,
          draft.color,
        )
      : draft.places;
    const coverageModeToSave: RouteDraft["coverageMode"] = placesToSave.length ? "places" : "day_only";
    if (coverageModeToSave === "places") {
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
      coverageMode: coverageModeToSave,
      postalCodes: [],
      places: coverageModeToSave === "places" ? placesToSave : [],
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
      notify.success(
        pendingSubroute
          ? `${draft.id ? "Ruta actualizada" : "Ruta creada"}; se agregaron ${pendingSubroute.places.length === 1 ? "1 zona" : `${pendingSubroute.places.length} zonas`}`
          : draft.id
            ? "Ruta actualizada"
            : "Ruta creada",
      );
      const savedDraft = {
        ...draft,
        id: draft.id || result.data.id,
        coverageMode: coverageModeToSave,
        places: placesToSave,
      };
      setDraft(savedDraft);
      setSubrouteBaselineKey(coverageDraftSnapshotKey(savedDraft));
      setSubrouteBaselineDraft(savedDraft);
      setShowForm(true);
      if (pendingSubroute) setPendingCoveragePlaces(null);
      setSubrouteHighlightPlaceId(null);
      onCatalogChange();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "No se pudo guardar la ruta");
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

  function addScheduleForWeekday(weekday: number) {
    if (!canManage) return;
    const dayLabel = logisticsWeekdayLabels[weekday];
    if (draft.schedules.some((schedule) => schedule.weekday === weekday && schedule.isActive)) {
      notify.error(`${dayLabel} ya tiene un horario activo en esta ruta`);
      return;
    }

    const source = draft.schedules.find((schedule) => schedule.isActive) || draft.schedules[0];
    if (!source) return;
    const inactiveExistingIndex = draft.schedules.findIndex(
      (schedule) => schedule.weekday === weekday && !schedule.isActive,
    );
    const copied: ScheduleDraft = {
      ...source,
      id: inactiveExistingIndex >= 0 ? draft.schedules[inactiveExistingIndex]?.id : undefined,
      weekday,
      isActive: true,
      reservedStops: inactiveExistingIndex >= 0 ? draft.schedules[inactiveExistingIndex]?.reservedStops : 0,
    };
    const schedules = inactiveExistingIndex >= 0
      ? draft.schedules.map((schedule, index) => (index === inactiveExistingIndex ? copied : schedule))
      : [...draft.schedules, copied];
    setDraft({ ...draft, schedules });
    setAddingScheduleDay(false);
    notify.success(`${dayLabel} se activará copiando el horario de ${logisticsWeekdayLabels[source.weekday]}`);
  }

  function toggleScheduleActive(scheduleIndex: number) {
    const schedule = draft.schedules[scheduleIndex];
    if (!schedule) return;
    setDraft({
      ...draft,
      schedules: draft.schedules.map((item, index) =>
        index === scheduleIndex ? { ...item, isActive: !item.isActive } : item,
      ),
    });
    notify.success(`${logisticsWeekdayLabels[schedule.weekday]} quedará ${schedule.isActive ? "inactivo" : "activo"} al guardar`);
  }

  async function archiveRoute(route: LogisticsRouteDefinitionRow) {
    const reason = window.prompt(`Motivo para archivar “${route.name}”:`)?.trim() || "";
    if (!reason) return;
    if (!window.confirm("Las reservas futuras no convertidas volverán a Tareas. Las rutas ya creadas no cambiarán. ¿Continuar?")) return;
    setBusy(`archive:${route.id}`);
    try {
      const result = await archiveGeographicRouteDefinitionAction({ routeDefinitionId: route.id, reason });
      if (!result.ok) return notify.error(result.error);
      notify.success("Ruta archivada");
      onCatalogChange();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : "No se pudo archivar la ruta");
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
    setAddingScheduleDay(false);
    setShowForm(true);
  }

  function resetSubrouteEditor() {
    setShowForm(false);
    setSubrouteEditorTab("schedules");
    setSubrouteHighlightPlaceId(null);
    setSubrouteBaselineKey("");
    setSubrouteBaselineDraft(null);
    setAddingScheduleDay(false);
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
    loadSubrouteDraft(emptyDraft(selectedWeekday), "schedules");
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
      loadSubrouteDraft(emptyDraft(selectedWeekday), "schedules");
      return;
    }
    const nextDraft = routeToDraft(pending.route);
    loadSubrouteDraft(
      pending.action === "color" ? { ...nextDraft, color: pending.color } : nextDraft,
      pending.action === "open" ? pending.tab : "schedules",
    );
  }

  const isCoverageMode = showForm && subrouteEditorTab === "coverage";
  const pendingSubrouteCount = pendingCoveragePlaces?.scope === "subroute"
    ? pendingCoveragePlaces.places.length
    : 0;
  const subrouteDirty =
    showForm && Boolean(subrouteBaselineKey) && coverageDraftSnapshotKey(draft) !== subrouteBaselineKey;
  const subrouteChangeDetailsList = subrouteChangeDetails(draft, subrouteBaselineDraft);

  const draftEditor = (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-3.5">
      {/* Top Header Strip: Tabs on left, Actions (Cancelar / Guardar) on right */}
      <div className="flex h-11 items-center justify-between gap-2.5 border-b border-slate-800/90 pb-2 shrink-0">
        {/* Tabs Switcher */}
        <div
          className="flex items-center gap-1.5 rounded-xl border border-slate-800 bg-[#0f1412] p-1 shrink-0"
          role="tablist"
          aria-label="Secciones de la ruta"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subrouteEditorTab === "schedules"}
            aria-controls="subroute-schedules-panel"
            onClick={() => setSubrouteEditorTab("schedules")}
            className={`inline-flex h-7 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-black transition ${
              subrouteEditorTab === "schedules"
                ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40 shadow-sm"
                : "text-slate-400 hover:bg-[#1e2723] hover:text-slate-200"
            }`}
          >
            <Clock3 className="h-3.5 w-3.5" aria-hidden />
            Horarios
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                subrouteEditorTab === "schedules"
                  ? "bg-emerald-400/30 text-emerald-200"
                  : "bg-[#1e2723] text-slate-400"
              }`}
            >
              {draft.schedules.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={subrouteEditorTab === "coverage"}
            aria-controls="subroute-coverage-panel"
            onClick={() => setSubrouteEditorTab("coverage")}
            className={`inline-flex h-7 items-center justify-center gap-1.5 rounded-lg px-2.5 text-xs font-black transition ${
              subrouteEditorTab === "coverage"
                ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40 shadow-sm"
                : "text-slate-400 hover:bg-[#1e2723] hover:text-slate-200"
            }`}
          >
            <MapPinned className="h-3.5 w-3.5" aria-hidden />
            Cobertura
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none ${
                subrouteEditorTab === "coverage"
                  ? "bg-emerald-400/30 text-emerald-200"
                  : "bg-[#1e2723] text-slate-400"
              }`}
            >
              {draft.places.filter((place) => place.selectionRole !== "child_included").length}
            </span>
          </button>
        </div>

        {/* Action buttons (Cancelar / Guardar) and Dirty Indicator */}
        <div className="flex items-center gap-1.5 shrink-0">
          {subrouteDirty ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-950/60 px-2 py-0.5 text-[10px] font-bold text-amber-200 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
              Sin guardar
            </span>
          ) : null}
          {canManage ? (
            <>
              <button
                type="button"
                className={`${secondaryButtonClass} h-7 !border-slate-700 !bg-[#1e2723] px-2.5 text-xs hover:!bg-[#283830]`}
                onClick={closeSubrouteForm}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={`${primaryButtonClass} h-7 px-3 text-xs`}
                disabled={busy === "save"}
                onClick={() => void saveRoute()}
              >
                {busy === "save" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {pendingSubrouteCount > 0
                  ? `Guardar · incluir ${pendingSubrouteCount} ${pendingSubrouteCount === 1 ? "zona" : "zonas"}`
                  : "Guardar"}
              </button>
            </>
          ) : (
            <button
              type="button"
              className={`${secondaryButtonClass} h-7 !border-slate-700 !bg-[#1e2723] px-2.5 text-xs hover:!bg-[#283830]`}
              onClick={closeSubrouteForm}
            >
              Cerrar
            </button>
          )}
        </div>
      </div>

      {/* Tab Panel: Schedules + Route Details */}
      {subrouteEditorTab === "schedules" ? (
        <div id="subroute-schedules-panel" role="tabpanel" className="flex flex-1 min-h-0 flex-col gap-3 overflow-y-auto pr-1">
          {/* Section 1: Route Identity Card */}
          <div className="rounded-xl border border-slate-700/80 bg-[#1e2723] p-3.5 shadow-md space-y-3">
            <div className="flex items-center justify-between border-b border-slate-700/70 pb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-300">
                Datos de la ruta
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-slate-400">Color:</span>
                {canManage ? (
                  <label
                    className="relative flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-full border border-black/60 shadow-md transition hover:scale-110"
                    style={{ backgroundColor: draft.color }}
                    title="Cambiar color de la ruta"
                  >
                    <input
                      type="color"
                      value={draft.color}
                      disabled={!canManage}
                      aria-label="Color de la ruta"
                      className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                      onChange={(event) => setDraft({ ...draft, color: event.target.value })}
                    />
                  </label>
                ) : (
                  <span
                    className="h-5 w-5 shrink-0 rounded-full border border-black/60 shadow-md"
                    style={{ backgroundColor: draft.color }}
                    aria-hidden
                  />
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1">
                <span className="text-[11px] font-bold text-slate-300">Nombre de la ruta</span>
                <input
                  value={draft.name}
                  onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                  placeholder="Ej. Ruta Norte, Ruta Sur..."
                  disabled={!canManage}
                  className="h-9 w-full rounded-lg border border-slate-700 bg-[#0f1412] px-2.5 text-xs font-bold capitalize text-white placeholder:text-slate-500 hover:border-slate-600 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 disabled:opacity-60"
                />
              </label>

              <label className="grid gap-1">
                <span className="text-[11px] font-bold text-slate-300">Zona o sector (opcional)</span>
                <input
                  value={draft.zoneName}
                  onChange={(event) => setDraft({ ...draft, zoneName: event.target.value })}
                  placeholder="Ej. Santa Clarita, Valle de San Fernando..."
                  disabled={!canManage}
                  className="h-9 w-full rounded-lg border border-slate-700 bg-[#0f1412] px-2.5 text-xs font-bold text-white placeholder:text-slate-500 hover:border-slate-600 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 disabled:opacity-60"
                />
              </label>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/90 pb-1">
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-slate-300">Horarios por día</p>
              <p className="mt-1 text-[11px] font-medium text-slate-500">Abre una sección para editar sus horas y conductor.</p>
            </div>
            {canManage ? (
              <button
                type="button"
                className={`${secondaryButtonClass} h-8 px-2.5 text-[11px] !border-slate-700 !bg-[#1e2723] hover:!bg-[#283830]`}
                onClick={() => setAddingScheduleDay((current) => !current)}
                aria-expanded={addingScheduleDay}
              >
                <Plus className="h-3.5 w-3.5 text-emerald-400" /> Agregar día
              </button>
            ) : null}
          </div>
          {addingScheduleDay ? (
            <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-2">
              <span className="mr-1 text-[10px] font-black uppercase tracking-wide text-emerald-200">Copiar horario en:</span>
              {logisticsWeekdayKeys.map((day, weekday) => {
                const alreadyActive = draft.schedules.some((schedule) => schedule.weekday === weekday && schedule.isActive);
                return (
                  <button
                    key={day}
                    type="button"
                    disabled={alreadyActive}
                    onClick={() => addScheduleForWeekday(weekday)}
                    className="inline-flex h-7 min-w-9 items-center justify-center rounded-md border border-slate-700 bg-[#0f1412] px-2 text-[10px] font-black text-slate-300 transition hover:border-emerald-400 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-35"
                    title={alreadyActive ? `${logisticsWeekdayLabels[weekday]} ya está activo` : `Activar ${logisticsWeekdayLabels[weekday]}`}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          ) : null}
          <div className="grid gap-2.5">
            {draft.schedules.map((schedule, index) => (
              <details
                key={`${draft.id || "new"}:${schedule.id || index}`}
                className={`overflow-hidden rounded-xl border border-slate-700/80 bg-[#1e2723] shadow-md transition hover:border-slate-600 ${schedule.isActive ? "" : "opacity-70"}`}
              >
                <summary className="flex cursor-pointer list-none items-center gap-2 px-3.5 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400">
                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" />
                  <span className={`rounded-md border px-2 py-1 text-[10px] font-black ${schedule.isActive ? "border-emerald-500/50 bg-emerald-950/50 text-emerald-200" : "border-slate-700 bg-[#0f1412] text-slate-500"}`}>
                    {logisticsWeekdayLabels[schedule.weekday]}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-300">{scheduleSummary(schedule)}</span>
                  <span className="shrink-0 text-[10px] font-black uppercase tracking-wide text-slate-500">{schedule.isActive ? "Activo" : "Inactivo"}</span>
                </summary>
                <div className="grid gap-2.5 border-t border-slate-800/90 p-3.5 sm:grid-cols-[minmax(0,8rem)_minmax(0,8rem)_minmax(0,14rem)] sm:items-end">

                  <label className="grid gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-300">Salida</span>
                    <TimePickerInput
                      value={schedule.startTime}
                      onChange={(value) =>
                        setDraft({
                          ...draft,
                          schedules: draft.schedules.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, startTime: value } : item,
                          ),
                        })
                      }
                      disabled={!canManage}
                      ariaLabel={`Hora de salida del ${logisticsWeekdayLabels[schedule.weekday] || "día"}`}
                      className="w-full"
                    />
                  </label>

                  <div className="grid gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-300">Fin estimado</span>
                    <TimePickerInput
                      value={schedule.estimatedEndTime || ""}
                      onChange={(value) =>
                        setDraft({
                          ...draft,
                          schedules: draft.schedules.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, estimatedEndTime: value }
                              : item,
                          ),
                        })
                      }
                      disabled={!canManage || !schedule.estimatedEndTime}
                      ariaLabel={`Hora final estimada del ${logisticsWeekdayLabels[schedule.weekday] || "día"}`}
                      className="w-full"
                    />
                    <label className="mt-0.5 flex items-center gap-1.5 text-[9px] font-black text-slate-400">
                      <input
                        type="checkbox"
                        checked={!schedule.estimatedEndTime}
                        disabled={!canManage}
                        onChange={(event) =>
                          setDraft({
                            ...draft,
                            schedules: draft.schedules.map((item, itemIndex) =>
                              itemIndex === index
                                ? { ...item, estimatedEndTime: event.target.checked ? "" : item.estimatedEndTime }
                                : item,
                            ),
                          })
                        }
                        className="h-3.5 w-3.5 accent-emerald-400"
                      />
                      Sin hora de fin · hasta terminar
                    </label>
                  </div>

                  <label className="grid gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wide text-slate-300">
                      Conductor habitual
                    </span>
                    <select
                      value={schedule.defaultDriverId || ""}
                      onChange={(event) =>
                        setDraft({
                          ...draft,
                          schedules: draft.schedules.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, defaultDriverId: event.target.value }
                              : item,
                          ),
                        })
                      }
                      className="h-9 w-full max-w-56 min-w-0 rounded-lg border border-slate-700 bg-[#0f1412] px-2.5 text-xs font-bold text-white focus:border-emerald-400"
                      disabled={!canManage}
                    >
                      <option value="">Sin conductor asignado</option>
                      {driverOptions.map((driver) => (
                        <option key={driver.id} value={driver.id}>
                          {driver.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex items-center justify-between gap-2 sm:col-span-3">
                    <span className="text-[10px] font-medium text-slate-500">Los cambios se aplican al guardar la ruta.</span>
                    {canManage ? (
                      <button
                        type="button"
                        className="h-8 rounded-md border border-slate-700 bg-[#0f1412] px-2.5 text-[10px] font-black text-slate-300 hover:border-amber-400 hover:text-amber-200"
                        onClick={() => toggleScheduleActive(index)}
                      >
                        {schedule.isActive ? "Desactivar este día" : "Reactivar este día"}
                      </button>
                    ) : null}
                  </div>
                </div>
              </details>
            ))}
          </div>

        </div>
      ) : (
        /* Tab Panel 3: Coverage (Full Height Map) coverageContext="route" */
        <div id="subroute-coverage-panel" role="tabpanel" className="flex flex-1 min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-slate-700/80 bg-[#0f1412] p-1">
          <GeographicRouteCoverageMap
            places={draft.places}
            previewPlaces={pendingCoveragePlaces?.scope === "subroute" ? pendingCoveragePlaces.places : []}
            fitPreview={pendingCoveragePlaces?.scope === "subroute" ? pendingCoveragePlaces.fitPreview : false}
            color={draft.color}
            label={draft.name || "ruta"}
            canPickPlaces={canManage}
            fillHeight
            resizable={false}
            highlightedPlaceId={subrouteHighlightPlaceId}
            onSelectPlace={(place) => selectCoveragePlaceFromMap("subroute", place)}
            onSelectPlaces={(places, options) => selectCoveragePlacesFromMap("subroute", places, options)}
          />
          {pendingCoveragePlaces?.scope === "subroute" ? (
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
      )}
    </div>
  );

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2.5">
      <style>{`.logistics-capacity-input { -moz-appearance: textfield; } .logistics-capacity-input::-webkit-outer-spin-button, .logistics-capacity-input::-webkit-inner-spin-button { -webkit-appearance: none; appearance: none; margin: 0; }`}</style>

      {/* 1. DÍAS MAESTROS: retained in the data model for compatibility, intentionally not rendered here. */}
      {false && <section className="shrink-0 rounded-2xl border border-slate-800 bg-[#121815]/95 p-3 shadow-lg">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-black text-white">Días maestros</h3>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {logisticsWeekdayKeys.map((day, weekday) => {
            const enabled = catalog.enabledDays.includes(day);
            const label = logisticsWeekdayLabels[weekday] || day;
            const selected = selectedWeekday === weekday;
            const routeCount = activeRoutes.filter((r) =>
              r.schedules.some((s) => s.weekday === weekday && s.isActive),
            ).length;

            return (
              <div
                key={day}
                className={`flex h-11 min-w-0 items-center justify-between rounded-xl border px-2.5 transition-all ${
                  selected
                    ? "border-emerald-400 bg-emerald-950/60 ring-1 ring-emerald-400/50 shadow-md"
                    : "border-slate-700/80 bg-[#1e2723] hover:border-slate-500 hover:bg-[#27342e] shadow-sm"
                }`}
              >
                <button
                  type="button"
                  aria-label={`Seleccionar ${label}; ${enabled ? "activo" : "inactivo"}`}
                  aria-pressed={selected}
                  onClick={() => {
                    setPendingCoveragePlaces(null);
                    setDayCoverageTab("zones");
                    setSelectedWeekday(weekday);
                  }}
                  className="flex h-full min-w-0 flex-1 flex-col justify-center text-left outline-none"
                >
                  <span
                    className={`truncate text-xs font-black ${
                      selected ? "text-white" : "text-slate-200"
                    }`}
                  >
                    {label}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {enabled ? (routeCount > 0 ? `${routeCount} ${routeCount === 1 ? "ruta" : "rutas"}` : "Directa") : "Inactivo"}
                  </span>
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
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-[10px] font-black transition disabled:cursor-not-allowed disabled:opacity-50 2xl:w-auto 2xl:px-2 ${
                    enabled
                      ? "bg-emerald-500/20 text-emerald-300 ring-1 ring-emerald-400/40"
                      : "border border-slate-700/70 bg-[#0f1412] text-slate-400"
                  }`}
                >
                  {busy === `day:${weekday}` ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <span
                      aria-hidden
                      className={`h-2 w-2 rounded-full ${
                        enabled ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]" : "bg-slate-500"
                      }`}
                    />
                  )}
                  <span className="hidden 2xl:inline 2xl:ml-1.5">{enabled ? "Activo" : "Inactivo"}</span>
                </button>
              </div>
            );
          })}
        </div>

        {dayIsRoute ? (
          <div className="mt-3.5 grid gap-3">
            <div className="max-w-sm">
              {!showDayScheduleEditor && weekdaySchedule?.startTime ? (
                <button
                  type="button"
                  disabled={!canManage}
                  onClick={() => canManage && beginDaySchedule(selectedWeekday)}
                  className="group flex w-full items-center gap-2.5 rounded-xl border border-slate-700/80 bg-[#1e2723] px-3.5 py-2 text-left shadow-sm transition hover:border-emerald-500/70 hover:bg-[#27342e] disabled:cursor-default"
                >
                  <Clock3 className="h-4 w-4 text-emerald-400" />
                  <span className="truncate text-xs font-black text-white">
                    {formatTime12Hour(weekdaySchedule?.startTime || "")}
                    {weekdaySchedule?.estimatedEndTime
                      ? `–${formatTime12Hour(weekdaySchedule?.estimatedEndTime || "")}`
                      : " · hasta terminar"}
                  </span>
                  {canManage ? (
                    <span className="ml-auto shrink-0 text-[10px] font-black text-emerald-300 opacity-80 group-hover:opacity-100">
                      Editar
                    </span>
                  ) : null}
                </button>
              ) : canManage ? (
                <div className="rounded-xl border border-slate-700/80 bg-[#1e2723] p-3.5 shadow-md">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-300">Horario</p>
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
                      <span className="text-[9px] font-black uppercase text-slate-400">Inicio</span>
                      <TimePickerInput
                        value={dayScheduleStart}
                        ariaLabel={`Inicio del horario de ${selectedWeekdayLabel}`}
                        onChange={setDayScheduleStart}
                        disabled={busy === `schedule:${selectedWeekday}`}
                        shellClassName="!h-9 !min-h-9 !px-2 !bg-[#0f1412] !border-slate-700"
                      />
                    </label>
                    <label className="grid min-w-0 flex-1 gap-1">
                      <span className="text-[9px] font-black uppercase text-slate-400">Fin</span>
                      <TimePickerInput
                        value={dayScheduleEnd}
                        ariaLabel={`Fin del horario de ${selectedWeekdayLabel}`}
                        onChange={setDayScheduleEnd}
                        disabled={dayWithoutEnd || busy === `schedule:${selectedWeekday}`}
                        shellClassName="!h-9 !min-h-9 !px-2 !bg-[#0f1412] !border-slate-700"
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
                  <label className="mt-2 flex items-center gap-2 px-0.5 text-[10px] font-bold text-slate-300">
                    <input
                      type="checkbox"
                      checked={dayWithoutEnd}
                      onChange={(event) => {
                        setDayWithoutEnd(event.target.checked);
                        if (event.target.checked) setDayScheduleEnd("");
                      }}
                      className="h-3.5 w-3.5 rounded accent-emerald-400"
                    />
                    Sin hora de fin · hasta terminar
                  </label>
                </div>
              ) : (
                <p className="text-xs font-bold text-slate-400">Sin horario configurado.</p>
              )}
            </div>

            {dayIsRoute ? (
              <div className="w-full min-w-0 overflow-x-hidden rounded-2xl border border-slate-700/80 bg-[#1e2723] p-3.5 shadow-md">
                <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-300">
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
                        <p className="text-[11px] font-bold text-slate-400">Cambios sin guardar…</p>
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
                      pendingCoveragePlaces?.scope === "day" ? pendingCoveragePlaces!.places.length : 0
                    }
                  />
                  {dayCoverageTab === "map" ? (
                    <div
                      id="day-coverage-map"
                      role="tabpanel"
                      aria-labelledby="day-coverage-map-tab"
                      className="min-h-0 min-w-0 overflow-visible rounded-xl border border-slate-700/80 bg-[#0f1412] p-1"
                    >
                      <GeographicRouteCoverageMap
                        places={dayPlaces}
                        previewPlaces={pendingCoveragePlaces?.scope === "day" ? pendingCoveragePlaces!.places : []}
                        fitPreview={pendingCoveragePlaces?.scope === "day" ? pendingCoveragePlaces!.fitPreview : false}
                        color={systemDayRoute?.color || "#10b981"}
                        label="ruta del día"
                        canPickPlaces={canManage}
                        highlightedPlaceId={dayHighlightPlaceId}
                        onSelectPlace={(place) => selectCoveragePlaceFromMap("day", place)}
                        onSelectPlaces={(places, options) => selectCoveragePlacesFromMap("day", places, options)}
                      />
                      {pendingCoveragePlaces?.scope === "day" ? (
                        <PendingCoverageAction
                        places={pendingCoveragePlaces!.places}
                        batchColor={pendingCoveragePlaces!.batchColor}
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
                      className="min-w-0 rounded-xl border border-slate-700/80 bg-[#1e2723] p-3"
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
      </section>}

      {/* 2. RUTAS MASTER-DETAIL */}
      <section className="flex flex-1 min-h-0 flex-col pb-1">
        {/* Master - Detail Grid */}
        <div className="grid flex-1 min-h-0 overflow-hidden rounded-2xl border border-slate-800 bg-[#121815]/95 shadow-2xl lg:grid-cols-[minmax(16rem,0.32fr)_minmax(0,0.68fr)]">
          {/* Left: Master Subroute List / Zones List during Coverage Mode */}
          <nav
            aria-label="Rutas y zonas de cobertura"
            className="flex flex-col h-full min-h-0 border-b border-slate-800 bg-[#141b18] lg:border-b-0 lg:border-r"
          >
            <div className="flex h-11 items-center justify-between border-b border-slate-800 bg-[#0f1412] px-3.5 shrink-0">
              {isCoverageMode ? (
                <>
                  <button
                    type="button"
                    onClick={() => setSubrouteEditorTab("schedules")}
                    className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-slate-700/80 bg-[#1e2723] px-2.5 text-xs font-bold text-slate-200 transition hover:border-slate-500 hover:bg-[#283830] hover:text-white"
                    title="Volver a la lista de rutas"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 text-emerald-400" />
                    <span className="text-[11px]">Rutas</span>
                  </button>

                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-300">
                      Zonas
                    </span>
                    <span className="rounded-full border border-emerald-500/40 bg-emerald-950/80 px-2 py-0.5 text-[10px] font-black text-emerald-300 ring-1 ring-emerald-500/30">
                      {draft.places.filter((p) => p.selectionRole !== "child_included").length}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-300">
                      Rutas
                    </span>
                    <span className="rounded-full border border-slate-700/80 bg-[#1e2723] px-2 py-0.5 text-[10px] font-black text-slate-200">
                      {selectedDayRoutes.length}
                    </span>
                  </div>
                  {canManage ? (
                    <button
                      type="button"
                      className={`${primaryButtonClass} h-7 px-2.5 text-[11px]`}
                      onClick={beginNewSubroute}
                    >
                      <Plus className="h-3.5 w-3.5" /> Nueva ruta
                    </button>
                  ) : null}
                </>
              )}
            </div>

            <div className={`flex-1 min-h-0 overflow-y-auto p-2.5 ${routeViewLayout === "cards" ? "space-y-2" : "divide-y divide-slate-800/80"}`}>
              {isCoverageMode ? (
                <div className="flex flex-col gap-2.5">
                  {/* Top Active Route Card (Identical Style) */}
                  <div className="rounded-xl border border-emerald-400 bg-emerald-950/60 ring-1 ring-emerald-400/50 shadow-lg transition-all duration-300 ease-in-out">
                    <div className="flex w-full flex-col gap-2.5 p-3.5 text-left rounded-xl">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {canManage ? (
                            <label
                              className="relative flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full border border-black/60 shadow-sm transition hover:scale-110"
                              style={{ backgroundColor: draft.color }}
                              title={`Cambiar color de ${draft.name || "la ruta"}`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <input
                                type="color"
                                value={draft.color}
                                disabled={!canManage}
                                aria-label={`Cambiar color de ${draft.name || "la ruta"}`}
                                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                onChange={(event) => setDraft({ ...draft, color: event.target.value })}
                              />
                            </label>
                          ) : (
                            <span
                              className="h-4 w-4 shrink-0 rounded-full border border-black/60 shadow-sm"
                              style={{ backgroundColor: draft.color }}
                              aria-hidden
                            />
                          )}
                          <span className="truncate text-sm font-black capitalize text-white">
                            {draft.name || "Nueva ruta"}
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {draft.zoneName ? (
                            <span className="rounded-md border border-slate-700/80 bg-[#0f1412] px-2 py-0.5 text-[10px] font-black text-slate-200">
                              {draft.zoneName}
                            </span>
                          ) : null}

                          {canManage && draft.id ? (
                            <button
                              type="button"
                              className="grid h-6 w-6 place-items-center rounded-md border border-slate-700/80 bg-[#0f1412] text-slate-400 opacity-60 transition hover:opacity-100 hover:border-rose-600 hover:bg-rose-950/50 hover:text-rose-200"
                              title={`Archivar ${draft.name}`}
                              aria-label={`Archivar ${draft.name}`}
                              disabled={busy === `archive:${draft.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                const route = selectedDayRoutes.find((r) => r.id === draft.id);
                                if (route) void archiveRoute(route);
                              }}
                            >
                              {busy === `archive:${draft.id}` ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Archive className="h-3 w-3" />
                              )}
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex min-w-0 items-start gap-1.5 text-[11px] font-bold text-slate-300">
                        <Clock3 className="h-3.5 w-3.5 text-emerald-400/90" />
                        <ScheduleDayChips schedules={draft.schedules.filter((item) => item.isActive)} />
                      </div>
                    </div>
                  </div>

                  {/* Places / Zones Editor */}
                  <div className="pt-0.5">
                    <GeographicRoutePlacesEditor
                      places={draft.places}
                      onChange={updateDraftCoverage}
                      canManage={canManage}
                      defaultColor={draft.color}
                      highlightedPlaceId={subrouteHighlightPlaceId}
                      onHighlightPlaceId={setSubrouteHighlightPlaceId}
                      onProposePlace={(place) => proposeCoveragePlace("subroute", place, { fitPreview: true })}
                      compact
                    />
                  </div>
                </div>
              ) : selectedDayRoutes.length ? (
                selectedDayRoutes.map((route) => {
                  const activeSchedules = route.schedules.filter((item) => item.isActive);
                  const selected = showForm && draft.id === route.id;
                  const activeColor = selected ? draft.color : route.color;

                  return (
                    <div
                      key={route.id}
                      className={`${routeViewLayout === "cards" ? "group relative rounded-xl border shadow-md" : "group relative border-b border-slate-800/80"} transition-all duration-300 ease-in-out ${
                        selected
                          ? "border-emerald-400 bg-emerald-950/60 ring-1 ring-emerald-400/50 shadow-lg"
                          : routeViewLayout === "cards"
                            ? "border-slate-700/80 bg-[#1e2723] hover:border-slate-500 hover:bg-[#27342e]"
                            : "bg-transparent hover:bg-[#1e2723]"
                      }`}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        aria-pressed={selected}
                        onClick={() => toggleSubrouteEditor(route)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            toggleSubrouteEditor(route);
                          }
                        }}
                        className="flex w-full cursor-pointer flex-col gap-2.5 p-3.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 rounded-xl"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            {canManage ? (
                              <label
                                className="relative flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full border border-black/60 shadow-sm transition hover:scale-110"
                                style={{ backgroundColor: activeColor }}
                                title={`Cambiar color de ${route.name}`}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <input
                                  type="color"
                                  value={activeColor}
                                  aria-label={`Cambiar color de ${route.name}`}
                                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                                  onChange={(event) => changeSubrouteColor(route, event.target.value)}
                                />
                              </label>
                            ) : (
                              <span
                                className="h-4 w-4 shrink-0 rounded-full border border-black/60 shadow-sm"
                                style={{ backgroundColor: activeColor }}
                                aria-hidden
                              />
                            )}
                            <span className="truncate text-sm font-black capitalize text-white">
                              {route.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {route.zoneName ? (
                              <span className="rounded-md border border-slate-700/80 bg-[#0f1412] px-2 py-0.5 text-[10px] font-black text-slate-200">
                                {route.zoneName}
                              </span>
                            ) : null}

                            {canManage ? (
                              <button
                                type="button"
                                className="grid h-6 w-6 place-items-center rounded-md border border-slate-700/80 bg-[#0f1412] text-slate-400 opacity-60 transition hover:opacity-100 hover:border-rose-600 hover:bg-rose-950/50 hover:text-rose-200"
                                title={`Archivar ${route.name}`}
                                aria-label={`Archivar ${route.name}`}
                                disabled={busy === `archive:${route.id}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  void archiveRoute(route);
                                }}
                              >
                                {busy === `archive:${route.id}` ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Archive className="h-3 w-3" />
                                )}
                              </button>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex min-w-0 items-start gap-1.5 text-[11px] font-bold text-slate-300">
                          <Clock3 className="h-3.5 w-3.5 text-emerald-400/90" />
                          <ScheduleDayChips schedules={activeSchedules} />
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center">
                  <Compass className="h-8 w-8 text-slate-500 mb-2" />
                  <p className="text-xs font-bold text-slate-300">
                    Aún no hay rutas configuradas.
                  </p>
                  {canManage ? (
                    <button
                      type="button"
                      className={`${secondaryButtonClass} mt-3 h-8 gap-1.5 !border-slate-700 !bg-[#1e2723] px-3 text-xs hover:!bg-[#283830]`}
                      onClick={beginNewSubroute}
                    >
                      <Plus className="h-3.5 w-3.5 text-emerald-400" />
                      Crear ruta
                    </button>
                  ) : null}
                </div>
              )}
            </div>
          </nav>

          {/* Right: Subroute Detail Editor */}
          <div
            id={showForm && draft.id ? `subroute-editor-${draft.id}` : "subroute-new-editor"}
            className="flex h-full min-h-0 min-w-0 flex-col bg-[#161e1a] p-3.5 sm:p-4"
          >
            {showForm ? (
              draftEditor
            ) : (
              <div className="grid h-full min-h-[14rem] place-items-center p-6 text-center">
                <div className="max-w-sm">
                  <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl border border-slate-700/80 bg-[#1e2723] text-emerald-400 shadow-md">
                    <Route className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-black text-white">Selecciona una ruta</h4>
                  <p className="mt-1.5 text-xs font-medium leading-relaxed text-slate-300">
                    Elige una ruta del listado para editar sus horarios y cobertura.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <ActionConfirmDialog
        open={Boolean(pendingSubrouteDiscard)}
        title="Cambios sin guardar"
        message="La ruta abierta tiene cambios que todavía no se han guardado. Si continúas, se descartarán:"
        details={
          <div className="grid gap-2">
            {(subrouteChangeDetailsList.length
              ? subrouteChangeDetailsList
              : [{ label: "Ruta", value: "Cambios pendientes de revisar" }]
            ).map((change) => (
              <div key={`${change.label}:${change.value}`} className="flex items-center justify-between gap-3 rounded-lg border border-slate-700/80 bg-surface-inset px-3 py-2.5">
                <p className="shrink-0 text-[10px] font-black uppercase tracking-wide text-amber-200">{change.label}</p>
                <p className="min-w-0 truncate text-right text-xs font-bold text-slate-200" title={change.value}>{change.value}</p>
              </div>
            ))}
          </div>
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
