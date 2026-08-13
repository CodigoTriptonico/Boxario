"use client";

import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { MapPinned, X } from "lucide-react";
import type { CompatibleGeographicRoute } from "@/app/actions/logistics-routes";
import { GeographicRouteCoverageMap } from "@/components/logistica/geographic-route-coverage-map";
import { secondaryButtonClass } from "@/components/ui-blocks";

export function LogisticsRouteCoveragePreviewDialog({
  open,
  onClose,
  routes,
  selectedRouteId,
  customerLocation,
}: {
  open: boolean;
  onClose: () => void;
  routes: CompatibleGeographicRoute[];
  selectedRouteId: string;
  customerLocation: { lat: number; lng: number; label: string } | null;
}) {
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const orderedRoutes = useMemo(
    () => [...routes].sort((left, right) => {
      if (left.routeScheduleId === selectedRouteId) return -1;
      if (right.routeScheduleId === selectedRouteId) return 1;
      if (left.coverageMatches !== right.coverageMatches) return left.coverageMatches ? -1 : 1;
      return left.name.localeCompare(right.name, "es");
    }),
    [routes, selectedRouteId],
  );
  const coveragePlaces = useMemo(() => {
    const byPlaceId = new Map<string, CompatibleGeographicRoute["places"][number]>();
    for (const route of orderedRoutes) {
      for (const place of route.places) {
        if (!byPlaceId.has(place.placeId)) {
          byPlaceId.set(place.placeId, { ...place, color: route.color });
        }
      }
    }
    return Array.from(byPlaceId.values());
  }, [orderedRoutes]);

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
                Dirección y coberturas
              </h2>
              <p className="mt-1 break-words text-xs font-bold text-slate-400">
                {customerLocation?.label || "La dirección no tiene coordenadas para colocar el pin."}
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
          <div className="flex flex-wrap gap-2" aria-label="Leyenda de rutas">
            {orderedRoutes.map((route) => {
              const selected = route.routeScheduleId === selectedRouteId;
              return (
                <div
                  key={route.routeScheduleId}
                  className={`inline-flex min-w-0 items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-bold ${
                    selected ? "border-white/60 bg-white/10 text-white" : "border-black bg-surface-inset text-slate-300"
                  }`}
                >
                  <span className="h-3 w-3 shrink-0 rounded-full border border-black/70" style={{ backgroundColor: route.color }} aria-hidden />
                  <span className="truncate font-black">{route.name}</span>
                  <span className={route.coverageMatches ? "text-emerald-300" : "text-amber-300"}>
                    {route.coverageMatches ? "Cubre la dirección" : route.places.length ? "Fuera de cobertura" : "Sin cobertura configurada"}
                  </span>
                  {selected ? <span className="text-sky-200">Seleccionada</span> : null}
                </div>
              );
            })}
          </div>

          {!customerLocation ? (
            <p className="rounded-lg border border-amber-700/70 bg-amber-950/30 px-3 py-2 text-xs font-bold text-amber-100">
              Puedes comparar las coberturas, pero falta geolocalizar la dirección para mostrar el pin del cliente.
            </p>
          ) : null}

          <GeographicRouteCoverageMap
            places={coveragePlaces}
            color="#10b981"
            label="coberturas disponibles"
            focusLocation={customerLocation}
            showLocationControl={false}
            resizable={false}
          />
        </div>

        <footer className="flex shrink-0 justify-end border-t border-black px-4 py-3 sm:px-5">
          <button type="button" onClick={onClose} className={`${secondaryButtonClass} h-10 px-4 text-xs`}>
            Cerrar
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}
