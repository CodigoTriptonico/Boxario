"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Crosshair, MapPinned, Pin, Route, Search, X } from "lucide-react";
import {
  updateCustomerExactEntranceLocationAction,
  type CompatibleGeographicRoute,
  type CustomerMapLocation,
} from "@/app/actions/logistics-routes";
import { GeographicRouteCoverageMap, type CoverageMapFocusLocation } from "@/components/logistica/geographic-route-coverage-map";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui-blocks";
import { logisticsWeekdayKeys, logisticsWeekdayLabels, type LogisticsWeekdayKey } from "@/lib/logistics-route-catalog";

type RoutePoint = { lat: number; lng: number };

function placeCenter(place: CompatibleGeographicRoute["places"][number]): RoutePoint | null {
  if (Number.isFinite(Number(place.lat)) && Number.isFinite(Number(place.lng))) {
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

function distanceInKm(from: RoutePoint, to: RoutePoint) {
  const toRadians = (value: number) => value * Math.PI / 180;
  const earthRadiusKm = 6371;
  const deltaLat = toRadians(to.lat - from.lat);
  const deltaLng = toRadians(to.lng - from.lng);
  const latitude = toRadians(from.lat);
  const targetLatitude = toRadians(to.lat);
  const haversine = Math.sin(deltaLat / 2) ** 2
    + Math.cos(latitude) * Math.cos(targetLatitude) * Math.sin(deltaLng / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

function routeDistanceInKm(route: CompatibleGeographicRoute, customerLocation: CustomerMapLocation | null) {
  if (!customerLocation) return null;
  const origin = { lat: customerLocation.lat, lng: customerLocation.lng };
  const distances = route.places
    .map(placeCenter)
    .filter((point): point is RoutePoint => point !== null)
    .map((point) => distanceInKm(origin, point));
  return distances.length ? Math.min(...distances) : null;
}

function formatRouteDistance(distance: number | null) {
  if (distance == null) return "Distancia no disponible";
  if (distance < 1) return "Menos de 1 km aprox.";
  return `${Math.round(distance)} km aprox.`;
}

function routeMatchesSearch(route: CompatibleGeographicRoute, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase("es");
  if (!normalizedQuery) return true;
  return [
    route.name,
    route.zoneName,
    logisticsWeekdayLabels[route.weekday] || "",
    route.coverageMatches ? "cubre la dirección" : "fuera de cobertura",
  ].join(" ").toLocaleLowerCase("es").includes(normalizedQuery);
}

function weekdayViewId(weekday: number) {
  return `weekday:${weekday}`;
}

function weekdayFromViewId(viewId: string) {
  if (!viewId.startsWith("weekday:")) return null;
  const weekday = Number(viewId.slice("weekday:".length));
  return Number.isInteger(weekday) && weekday >= 0 && weekday <= 6 ? weekday : null;
}

type LogisticsRouteCoverageContext = "customer" | "route";

export function LogisticsRouteCoveragePreviewDialog({
  open,
  onClose,
  routes,
  enabledWeekdays,
  selectedRouteId,
  customerLocation,
  customerId,
  addressReference,
  exactEntranceNote,
  onAddressReferenceChange,
  onExactEntranceNoteChange,
  exactEntranceNoteEditable = true,
  onCustomerLocationSaved,
  allowRouteViewSelection = true,
  allowExactEntranceEditing = true,
  coverageContext = "customer",
}: {
  open: boolean;
  onClose: () => void;
  routes: CompatibleGeographicRoute[];
  enabledWeekdays?: readonly LogisticsWeekdayKey[];
  selectedRouteId: string;
  customerLocation: CustomerMapLocation | null;
  customerId?: string | null;
  addressReference?: string;
  exactEntranceNote?: string;
  onAddressReferenceChange?: (value: string) => void;
  onExactEntranceNoteChange?: (value: string) => void;
  exactEntranceNoteEditable?: boolean;
  onCustomerLocationSaved?: (location: CustomerMapLocation) => void;
  allowRouteViewSelection?: boolean;
  allowExactEntranceEditing?: boolean;
  coverageContext?: LogisticsRouteCoverageContext;
}) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const defaultRouteViewId = routes.some((route) => route.routeScheduleId === selectedRouteId)
    ? selectedRouteId
    : "all";
  const [routeViewSelection, setRouteViewSelection] = useState<string | null>(null);
  const [routePickerOpen, setRoutePickerOpen] = useState(false);
  const routeViewId = allowRouteViewSelection
    ? routeViewSelection ?? defaultRouteViewId
    : selectedRouteId || defaultRouteViewId;
  const [focusLocationRequest, setFocusLocationRequest] = useState(0);
  const [routeFitRequest, setRouteFitRequest] = useState(0);
  const [draftCustomerLocation, setDraftCustomerLocation] = useState<CustomerMapLocation | null>(customerLocation);
  const [pinDirty, setPinDirty] = useState(false);
  const [pinSaving, setPinSaving] = useState(false);
  const [pinStatus, setPinStatus] = useState("");
  const [notesTab, setNotesTab] = useState<"references" | "driverNote">("references");
  const [routeSearch, setRouteSearch] = useState("");
  const isRouteConfiguration = coverageContext === "route";
  const initialWeekday = routes.find((route) => route.routeScheduleId === selectedRouteId)?.weekday
    ?? routes[0]?.weekday
    ?? null;
  const [weekdayFilter, setWeekdayFilter] = useState<number | null>(initialWeekday);
  const showOperationalNotes = addressReference !== undefined && exactEntranceNote !== undefined;
  const needsPinSave = Boolean(
    draftCustomerLocation && (pinDirty || draftCustomerLocation.source === "address"),
  );
  const routeDistanceById = useMemo(
    () => new Map(routes.map((route) => [route.routeScheduleId, routeDistanceInKm(route, draftCustomerLocation)])),
    [draftCustomerLocation, routes],
  );
  const orderedRoutes = useMemo(
    () => [...routes].sort((left, right) => {
      if (left.coverageMatches !== right.coverageMatches) return left.coverageMatches ? -1 : 1;
      const leftDistance = routeDistanceById.get(left.routeScheduleId) ?? null;
      const rightDistance = routeDistanceById.get(right.routeScheduleId) ?? null;
      if (leftDistance != null && rightDistance != null && leftDistance !== rightDistance) {
        return leftDistance - rightDistance;
      }
      if (leftDistance != null) return -1;
      if (rightDistance != null) return 1;
      if (left.routeScheduleId === selectedRouteId) return -1;
      if (right.routeScheduleId === selectedRouteId) return 1;
      return left.name.localeCompare(right.name, "es");
    }),
    [routeDistanceById, routes, selectedRouteId],
  );
  const routeViewWeekday = weekdayFromViewId(routeViewId);
  const routeViewLabel = routeViewId === "all"
    ? "Todas las rutas"
    : routeViewWeekday != null
      ? `Coberturas del ${logisticsWeekdayLabels[routeViewWeekday] || "día"}`
      : orderedRoutes.find((route) => route.routeScheduleId === routeViewId)?.name || "Seleccionar ruta";
  const activeWeekdays = useMemo(
    () => enabledWeekdays
      ? new Set(enabledWeekdays.map((day) => logisticsWeekdayKeys.indexOf(day)).filter((weekday) => weekday >= 0))
      : new Set(
          routes
            .map((route) => route.weekday)
            .filter((weekday) => Number.isInteger(weekday) && weekday >= 0 && weekday <= 6),
        ),
    [enabledWeekdays, routes],
  );
  const filteredRoutes = useMemo(
    () => orderedRoutes.filter((route) =>
      (weekdayFilter == null || route.weekday === weekdayFilter) && routeMatchesSearch(route, routeSearch),
    ),
    [orderedRoutes, routeSearch, weekdayFilter],
  );
  const routeGroups = useMemo(
    () => logisticsWeekdayLabels.map((label, weekday) => ({
      weekday,
      label,
      routes: filteredRoutes.filter((route) => route.weekday === weekday),
    })).filter((group) => group.routes.length),
    [filteredRoutes],
  );
  const visibleRoutes = useMemo(
    () => {
      const viewWeekday = weekdayFromViewId(routeViewId);
      if (routeViewId === "all") return orderedRoutes;
      if (viewWeekday != null) return orderedRoutes.filter((route) => route.weekday === viewWeekday);
      return orderedRoutes.filter((route) => route.routeScheduleId === routeViewId);
    },
    [orderedRoutes, routeViewId],
  );
  const coveragePlaces = useMemo(() => {
    const byPlaceId = new Map<string, CompatibleGeographicRoute["places"][number]>();
    for (const route of visibleRoutes) {
      for (const place of route.places) {
        if (!byPlaceId.has(place.placeId) || route.coverageMatches) {
          byPlaceId.set(place.placeId, { ...place, color: route.coverageMatches ? "#10b981" : "#64748b" });
        }
      }
    }
    return Array.from(byPlaceId.values());
  }, [visibleRoutes]);

  const handleCoveragePlaceClick = useCallback((placeId: string) => {
    if (!allowRouteViewSelection || (routeViewId !== "all" && weekdayFromViewId(routeViewId) == null)) return;
    const matchingRoute = visibleRoutes.find((route) =>
      route.places.some((place) => place.placeId === placeId),
    );
    if (!matchingRoute) return;
    setRouteViewSelection(matchingRoute.routeScheduleId);
    setRoutePickerOpen(false);
    setRouteFitRequest((current) => current + 1);
  }, [allowRouteViewSelection, routeViewId, visibleRoutes]);

  const handleFocusLocationChange = useCallback((location: CoverageMapFocusLocation) => {
    setDraftCustomerLocation({ ...location, source: location.source || "exact_entrance" });
    setPinDirty(true);
    setPinStatus("Pin movido. Pulsa guardar para registrar la ubicación exacta.");
    setRouteFitRequest(0);
  }, []);

  const savePin = useCallback(async () => {
    if (!draftCustomerLocation || !needsPinSave || pinSaving) return;
    setPinSaving(true);
    setPinStatus("");
    try {
      if (!customerId && !onCustomerLocationSaved) {
        setPinStatus("Guarda el contacto antes de registrar la ubicación exacta.");
        return;
      }
      const result = customerId
        ? await updateCustomerExactEntranceLocationAction({
            customerId,
            lat: draftCustomerLocation.lat,
            lng: draftCustomerLocation.lng,
            source: "logistics_coverage_map",
          })
        : { ok: true as const, data: draftCustomerLocation };
      if (!result.ok) {
        setPinStatus(result.error);
      } else {
        setDraftCustomerLocation(result.data);
        setPinDirty(false);
        setPinStatus(customerId ? "Ubicación exacta guardada y registrada en la bitácora." : "Ubicación exacta lista para guardar con el contacto.");
        onCustomerLocationSaved?.(result.data);
      }
    } catch (error) {
      setPinStatus(error instanceof Error ? error.message : "No se pudo guardar la ubicación exacta.");
    } finally {
      setPinSaving(false);
    }
  }, [customerId, draftCustomerLocation, needsPinSave, onCustomerLocationSaved, pinSaving]);

  function selectRouteView(nextRouteViewId: string) {
    const nextWeekday = weekdayFromViewId(nextRouteViewId);
    if (nextRouteViewId === "all") {
      setWeekdayFilter(null);
    } else if (nextWeekday != null) {
      setWeekdayFilter(nextWeekday);
    } else {
      const nextRoute = orderedRoutes.find((route) => route.routeScheduleId === nextRouteViewId);
      if (nextRoute) setWeekdayFilter(nextRoute.weekday);
    }
    setRouteViewSelection(nextRouteViewId);
    setRouteFitRequest((current) => current + 1);
  }

  function selectRouteViewFromPicker(nextRouteViewId: string) {
    selectRouteView(nextRouteViewId);
    setRoutePickerOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
      previousFocusRef.current?.focus();
    };
  }, [onClose, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[175] flex items-center justify-center bg-black/80 p-3 sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="route-coverage-preview-title"
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-black bg-surface-panel shadow-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-black px-4 py-3 sm:px-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-700 bg-sky-400/15 text-sky-200">
              <MapPinned className="h-4.5 w-4.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 id="route-coverage-preview-title" className="text-sm font-black uppercase text-slate-100">
                {isRouteConfiguration ? "Cobertura de la ruta" : "Dirección y coberturas"}
              </h2>
              <p className="mt-1 break-words text-xs font-bold text-slate-400">
                {draftCustomerLocation?.label || (isRouteConfiguration
                  ? "Cobertura configurada para esta ruta."
                  : "La dirección del cliente no pudo ubicarse en el mapa.")}
              </p>
            </div>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black bg-surface-inset text-slate-300 hover:text-white"
            aria-label="Cerrar mapa de coberturas"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto p-4 sm:p-5">
          <div className="grid gap-2" aria-label="Vistas de rutas">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold text-slate-400">
                {draftCustomerLocation
                  ? "Ordenadas por cobertura y cercanía a la dirección del remitente."
                  : isRouteConfiguration
                    ? "Consulta la cobertura configurada para esta ruta."
                    : "Ordenadas por cobertura y nombre."}
              </p>
              {!isRouteConfiguration ? (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={!draftCustomerLocation}
                    onClick={() => {
                      setRouteFitRequest(0);
                      setFocusLocationRequest((current) => current + 1);
                    }}
                    className={`${secondaryButtonClass} h-9 px-3 text-xs disabled:cursor-not-allowed disabled:opacity-40`}
                    title={draftCustomerLocation ? "Centrar el mapa en la ubicación del cliente" : "No hay una ubicación disponible para centrar el mapa"}
                  >
                    <Crosshair className="h-3.5 w-3.5" aria-hidden />
                    Ir a dirección del cliente
                  </button>
                </div>
              ) : null}
            </div>

            {allowRouteViewSelection ? (
              <div className="grid gap-1.5 rounded-lg border border-black bg-surface-inset p-2" aria-label="Días de logística">
                <p className="px-1 text-[10px] font-black uppercase tracking-wide text-slate-500">Días de logística</p>
                <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7" role="tablist" aria-label="Seleccionar día de logística">
                  {logisticsWeekdayKeys.map((day, weekday) => {
                    const label = logisticsWeekdayLabels[weekday] || day;
                    const enabled = activeWeekdays.has(weekday);
                    const selected = enabled && weekdayFilter === weekday;
                    return (
                      <button
                        key={day}
                        type="button"
                        role="tab"
                        disabled={!enabled}
                        aria-selected={selected}
                        aria-label={`${label}: ${enabled ? "día activo, ver coberturas" : "día inactivo"}`}
                        title={enabled ? `Ver coberturas del ${label}` : `${label} está desactivado en Logística`}
                        onClick={() => selectRouteView(weekdayViewId(weekday))}
                        className={`min-w-0 rounded-md border px-1.5 py-2 text-[11px] font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:border-black disabled:bg-surface-panel disabled:text-slate-600 ${
                          selected
                            ? "border-emerald-300 bg-emerald-400 text-slate-950"
                            : enabled
                              ? "border-black bg-surface-panel text-slate-300 hover:border-emerald-700/70 hover:text-white"
                              : ""
                        }`}
                      >
                        <span className="flex items-center justify-center gap-1.5">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${enabled ? "bg-emerald-400" : "bg-slate-600"}`} aria-hidden />
                          <span className="truncate">{label}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {allowRouteViewSelection ? <details
              open={routePickerOpen}
              onToggle={(event) => setRoutePickerOpen(event.currentTarget.open)}
              className="group relative z-20 w-fit max-w-full rounded-lg border border-black bg-surface-inset"
            >
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-xs font-black text-slate-100 marker:hidden [&::-webkit-details-marker]:hidden">
                <Route className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
                <span className="min-w-0 flex-1 truncate">
                  {routeViewLabel}
                </span>
                <span className="text-[11px] font-bold text-slate-500">{filteredRoutes.length} de {orderedRoutes.length}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <div className="absolute left-0 top-[calc(100%+0.375rem)] z-30 grid max-h-[min(24rem,calc(100dvh-8rem))] w-[min(34rem,calc(100vw-3rem))] max-w-[calc(100vw-3rem)] gap-2 overflow-y-auto rounded-lg border border-black bg-surface-panel p-2 shadow-2xl">
                <p className="px-1 text-[11px] font-bold leading-snug text-slate-500">
                  Cambiar aquí solo cambia la vista del mapa. La ruta operativa se mantiene en el selector exterior.
                </p>
                <label className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" aria-hidden />
                  <span className="sr-only">Buscar ruta</span>
                  <input
                    value={routeSearch}
                    onChange={(event) => setRouteSearch(event.target.value)}
                    placeholder="Buscar ruta por nombre, zona o día..."
                    aria-label="Buscar ruta por nombre, zona o día"
                    className="h-9 w-full rounded-md border border-black bg-surface-panel pl-9 pr-3 text-xs font-bold text-slate-100 outline-none placeholder:text-slate-500 focus:border-sky-400"
                  />
                </label>
                <div className="grid max-h-52 gap-2 overflow-y-auto" role="listbox" aria-label="Rutas disponibles por día">
                  {orderedRoutes.length > 1 ? (
                    <button
                      type="button"
                      role="option"
                      aria-selected={routeViewId === "all"}
                      onClick={() => selectRouteViewFromPicker("all")}
                      className={`flex min-w-0 items-center gap-2 rounded-md border px-3 py-2 text-left text-xs font-black ${routeViewId === "all" ? "border-white/60 bg-white/10 text-white" : "border-black bg-surface-inset text-slate-300 hover:bg-white/10"}`}
                    >
                      <Route className="h-3.5 w-3.5 shrink-0" aria-hidden />
                      Todas las rutas
                    </button>
                  ) : null}
                  {filteredRoutes.length ? routeGroups.map((group) => (
                    <section key={group.weekday} className="grid gap-1.5">
                      <div className="flex items-center gap-2 px-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
                        <span>{weekdayFilter == null ? group.label : `Coberturas del ${group.label}`}</span>
                        <span className="text-slate-600">{group.routes.length}</span>
                      </div>
                      {group.routes.map((route) => {
                        const selected = route.routeScheduleId === selectedRouteId;
                        const active = route.routeScheduleId === routeViewId;
                        const distance = routeDistanceById.get(route.routeScheduleId) ?? null;
                        const covered = route.coverageMatches;
                        return (
                          <button
                            type="button"
                            key={route.routeScheduleId}
                            role="option"
                            aria-selected={active}
                            onClick={() => selectRouteViewFromPicker(route.routeScheduleId)}
                            className={`flex min-w-0 items-center gap-2 rounded-lg border px-3 py-2 text-left text-xs font-bold ${
                              active
                                ? covered ? "border-emerald-300 bg-emerald-400 text-slate-950" : "border-white/60 bg-white/10 text-white"
                                : covered ? "border-emerald-500/70 bg-emerald-950/30 text-slate-100" : "border-black bg-surface-inset text-slate-300"
                            }`}
                          >
                            <span className={`h-3 w-3 shrink-0 rounded-full border border-black/70 ${covered ? "bg-emerald-400" : "bg-slate-500"}`} aria-hidden />
                            <span className="min-w-0 flex-1 truncate font-black">{route.name}</span>
                            <span className={`hidden sm:inline ${active && covered ? "text-slate-950/80" : "text-slate-400"}`}>
                              {covered ? "Cubre la dirección" : route.places.length ? "Fuera de cobertura" : "Sin cobertura configurada"}
                            </span>
                            <span className={`hidden md:inline whitespace-nowrap ${active && covered ? "text-slate-950/70" : "text-slate-400"}`}>
                              {formatRouteDistance(distance)}
                            </span>
                            {selected ? <span className={active && covered ? "text-slate-950/80" : "text-sky-200"}>Seleccionada</span> : active ? <span className={active && covered ? "text-slate-950/80" : "text-sky-200"}>Vista activa</span> : null}
                          </button>
                        );
                      })}
                    </section>
                  )) : (
                    <p className="rounded-lg border border-black bg-surface-inset px-3 py-3 text-xs font-bold text-slate-400">
                      No hay rutas que coincidan con “{routeSearch}”.
                    </p>
                  )}
                </div>
              </div>
            </details> : (
              <button
                type="button"
                onClick={() => selectRouteView(routeViewId)}
                title="Mostrar esta ruta en el mapa"
                aria-label={`Mostrar ${orderedRoutes.find((route) => route.routeScheduleId === routeViewId)?.name || "la ruta seleccionada"} en el mapa`}
                className="inline-flex h-9 w-fit max-w-full min-w-0 items-center gap-2 rounded-lg border border-black bg-surface-inset px-3 text-left text-xs font-black text-slate-100 transition hover:border-emerald-400/70 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
              >
                <Route className="h-4 w-4 shrink-0 text-emerald-300" aria-hidden />
                <span className="min-w-0 flex-1 truncate">
                  {orderedRoutes.find((route) => route.routeScheduleId === routeViewId)?.name || "Ruta seleccionada"}
                </span>
                <span className="shrink-0 text-[11px] font-bold text-slate-500">
                  {isRouteConfiguration
                    ? "Cobertura configurada"
                    : orderedRoutes.find((route) => route.routeScheduleId === routeViewId)?.coverageMatches
                      ? "Cubre la dirección"
                      : "Cobertura por verificar"}
                </span>
              </button>
            )}
          </div>

          {allowExactEntranceEditing && draftCustomerLocation && draftCustomerLocation.source === "address" ? (
            <p className="rounded-lg border border-sky-700/70 bg-sky-950/30 px-3 py-2 text-xs font-bold text-sky-100">
              Se muestra la ubicación aproximada de la dirección del cliente; el pin se creó en esa zona. Muévelo si hace falta y pulsa “Confirmar pin exacto” para guardarlo.
            </p>
          ) : allowExactEntranceEditing && !draftCustomerLocation ? (
            <p className="rounded-lg border border-amber-700/70 bg-amber-950/30 px-3 py-2 text-xs font-bold text-amber-100">
              La dirección está guardada, pero no fue posible obtener una ubicación para mostrar el pin del cliente.
            </p>
          ) : null}

          <GeographicRouteCoverageMap
            places={coveragePlaces}
            color="#10b981"
            label="coberturas disponibles"
            focusLocation={draftCustomerLocation}
            onFocusLocationChange={allowExactEntranceEditing ? handleFocusLocationChange : undefined}
            focusLocationRequest={focusLocationRequest}
            fitCoverageRequest={routeFitRequest}
            onCoveragePlaceClick={allowRouteViewSelection ? handleCoveragePlaceClick : undefined}
            showLocationControl={false}
            resizable={false}
          />

          {showOperationalNotes ? (
            <section className="grid gap-2" aria-label="Referencias e instrucciones">
              <div className="flex gap-1 border-b border-white/10" role="tablist" aria-label="Tipo de nota">
                <button
                  type="button"
                  role="tab"
                  aria-selected={notesTab === "references"}
                  onClick={() => setNotesTab("references")}
                  className={`h-9 rounded-t-md border border-b-0 px-3 text-xs font-black ${notesTab === "references" ? "border-emerald-300 bg-emerald-400 text-slate-950" : "border-black bg-surface-inset text-slate-200"}`}
                >
                  Referencias
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={notesTab === "driverNote"}
                  onClick={() => setNotesTab("driverNote")}
                  className={`h-9 rounded-t-md border border-b-0 px-3 text-xs font-black ${notesTab === "driverNote" ? "border-emerald-300 bg-emerald-400 text-slate-950" : "border-black bg-surface-inset text-slate-200"}`}
                >
                  Nota para el conductor
                </button>
              </div>
              {notesTab === "references" ? (
                <>
                  <textarea
                    role="tabpanel"
                    aria-label="Referencias del domicilio"
                    value={addressReference}
                    onChange={(event) => onAddressReferenceChange?.(event.target.value)}
                    maxLength={500}
                    className="min-h-16 rounded-lg border border-black bg-surface-inset px-3 py-2 text-sm font-bold text-slate-50 outline-none placeholder:text-slate-500 focus:border-emerald-300"
                    placeholder="Ej. segundo piso, casa roja, portón negro..."
                  />
                  <span className="text-[11px] font-bold leading-snug text-slate-500">Indicaciones permanentes para encontrar el domicilio.</span>
                </>
              ) : (
                <>
                  <textarea
                    role="tabpanel"
                    aria-label="Nota para el conductor"
                    value={exactEntranceNote}
                    disabled={!exactEntranceNoteEditable}
                    onChange={(event) => onExactEntranceNoteChange?.(event.target.value)}
                    maxLength={500}
                    className="min-h-16 rounded-lg border border-black bg-surface-inset px-3 py-2 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-emerald-300 disabled:cursor-not-allowed disabled:opacity-40"
                    placeholder="Portón negro, entrada por el callejón, llamar al llegar…"
                  />
                  <span className="text-[11px] font-bold leading-snug text-slate-500">
                    {exactEntranceNoteEditable ? "Instrucciones específicas para la entrada confirmada." : "Confirma primero el pin exacto para agregar instrucciones."}
                  </span>
                </>
              )}
            </section>
          ) : null}
        </div>

        <footer className={`flex shrink-0 flex-wrap items-center gap-2 border-t border-black px-4 py-3 sm:px-5 ${allowExactEntranceEditing ? "justify-between" : "justify-end"}`}>
          {allowExactEntranceEditing ? (
            <div className="min-w-0 flex-1 text-xs font-bold text-slate-300" role="status" aria-live="polite">
              {pinStatus || (draftCustomerLocation?.source === "exact_entrance" ? "Pin exacto confirmado." : "")}
            </div>
          ) : null}
          <div className="flex shrink-0 items-center gap-2">
            {allowExactEntranceEditing ? (
              <button
                type="button"
                onClick={() => void savePin()}
                disabled={!needsPinSave || pinSaving}
                className={`${primaryButtonClass} h-10 px-4 text-xs disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <Pin className="h-3.5 w-3.5" aria-hidden />
                {pinSaving ? "Guardando..." : draftCustomerLocation?.source === "address" ? "Confirmar pin exacto" : "Guardar ubicación exacta"}
              </button>
            ) : null}
            <button type="button" onClick={onClose} className={`${secondaryButtonClass} h-10 px-4 text-xs`}>
              Cerrar
            </button>
          </div>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
