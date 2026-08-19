"use client";

import { CircleAlert, Clock3, MapPinned, Route } from "lucide-react";
import {
  InlineSearchPicker,
  type InlineSearchPickerOption,
} from "@/components/inline-search-picker";
import type { RouteTemplate } from "@/components/logistica/task-schedule/shared";
import { routeScheduleHasAvailabilityMismatch } from "@/lib/logistics-route-schedule";
import { logisticsWeekdayKeys } from "@/lib/logistics-route-catalog";
import { formatTime12Hour } from "@/lib/sale/schedule-time";

export function LogisticsTaskScheduleRouteField({
  dayAsRoute,
  pendingDayRouteMode,
  showAllRoutes,
  routeTemplateId,
  onRouteTemplateChange,
  templateOptions,
  dayTemplateCount,
  matchingTemplateCount,
  namedTemplateCount,
  weekdayLabel,
  selectedTemplate,
  selectedCoverageMatches,
  canOpenCoverageMap,
  onOpenCoverageMap,
  draftTime,
}: {
  dayAsRoute: boolean;
  pendingDayRouteMode: boolean;
  showAllRoutes: boolean;
  routeTemplateId: string;
  onRouteTemplateChange: (value: string) => void;
  templateOptions: InlineSearchPickerOption[];
  dayTemplateCount: number;
  matchingTemplateCount: number | null;
  namedTemplateCount: number;
  weekdayLabel: string;
  selectedTemplate: RouteTemplate | null | undefined;
  selectedCoverageMatches?: boolean;
  canOpenCoverageMap: boolean;
  onOpenCoverageMap: () => void;
  draftTime: string;
}) {
  if (dayAsRoute) return null;

  return (
    <div className="rounded-2xl border border-slate-800 bg-[#16201b] p-4 shadow-xl space-y-3.5">
      {/* 1. Header: Label + Map Action */}
      <div className="flex items-center justify-between gap-2">
        <label className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-200">
          <Route className="h-4 w-4 text-emerald-400" />
          {pendingDayRouteMode ? "Ruta sin fecha" : showAllRoutes ? "Ruta" : "Ruta del día"}
        </label>

        <button
          type="button"
          disabled={!canOpenCoverageMap}
          onClick={onOpenCoverageMap}
          className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-slate-700/80 bg-[#101714] px-2.5 text-[11px] font-bold text-slate-200 transition hover:border-emerald-500/50 hover:bg-[#1a2620] hover:text-white disabled:opacity-40"
          title={
            canOpenCoverageMap
              ? "Comparar la dirección con las coberturas"
              : "No hay coberturas disponibles para mostrar"
          }
        >
          <MapPinned className="h-3.5 w-3.5 text-emerald-400" aria-hidden />
          Ver dirección y coberturas
        </button>
      </div>

      {/* 2. Selector */}
      <InlineSearchPicker
        value={routeTemplateId}
        onChange={onRouteTemplateChange}
        options={templateOptions}
        placeholder={
          pendingDayRouteMode
            ? "Selecciona una ruta (sin fecha)"
            : showAllRoutes
              ? "Selecciona una ruta"
              : dayTemplateCount
                ? `Rutas de ${weekdayLabel}`
                : "No hay rutas ese día"
        }
        searchPlaceholder="Buscar ruta..."
        emptyLabel={
          showAllRoutes
            ? "No hay rutas semanales"
            : `No hay rutas para ${weekdayLabel || "ese día"}`
        }
        ariaLabel="Ruta semanal"
        className="w-full"
        minWidthClass="w-full"
      />

      {/* 3. Integrated Details (Horario & Estado de Cobertura) when a route is selected */}
      {selectedTemplate ? (
        <div className="space-y-2.5 border-t border-slate-800/90 pt-3">
          {/* Horario line */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 font-bold text-slate-200">
              <Clock3 className="h-4 w-4 text-emerald-400 shrink-0" />
              {selectedTemplate.startTime ? (
                <span>
                  Inicio {formatTime12Hour(selectedTemplate.startTime)}
                  {selectedTemplate.estimatedEndTime
                    ? ` · fin estimado ${formatTime12Hour(selectedTemplate.estimatedEndTime)}`
                    : " · hasta terminar la ruta"}
                </span>
              ) : (
                <span className="text-slate-400 font-medium">Horario pendiente de configurar por Logística.</span>
              )}
            </div>

            {!showAllRoutes && weekdayLabel ? (
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Solo {weekdayLabel}
              </span>
            ) : showAllRoutes && !pendingDayRouteMode ? (
              <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Solo {logisticsWeekdayKeys[selectedTemplate.weekday] || "ese día"}
              </span>
            ) : null}
          </div>

          {/* Coverage match info */}
          {matchingTemplateCount === 1 && selectedCoverageMatches === true ? (
            <p className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-400">
              <span className="flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-black">✓</span>
              <span>La dirección coincide con esta cobertura; la ruta se sugirió automáticamente.</span>
            </p>
          ) : null}

          {selectedCoverageMatches === false ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-700/70 bg-amber-950/40 p-2.5 text-[11px] font-bold leading-relaxed text-amber-200" role="alert">
              <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />
              <span>Esta dirección no está dentro de la cobertura de {selectedTemplate.name}. La solicitud quedará pendiente de verificación por Logística.</span>
            </div>
          ) : null}

          {routeScheduleHasAvailabilityMismatch(draftTime, selectedTemplate) ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-700/70 bg-amber-950/40 p-2 text-[11px] font-bold text-amber-200">
              <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-300" aria-hidden />
              <span>La disponibilidad del cliente podría no coincidir con el horario de la ruta. Verifica con Logística antes de confirmar.</span>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Warnings when no routes match */}
      {!showAllRoutes && dayTemplateCount > 0 && matchingTemplateCount === 0 ? (
        <div className="rounded-lg border border-amber-700/70 bg-amber-950/40 p-2.5 text-[11px] font-bold leading-relaxed text-amber-200">
          La dirección no coincide con la cobertura de ninguna ruta. Puedes elegir cualquier ruta disponible de ese día, pero Logística deberá verificar la excepción.
        </div>
      ) : null}

      {!showAllRoutes && namedTemplateCount > 0 && dayTemplateCount === 0 ? (
        <div className="rounded-lg border border-amber-700/70 bg-amber-950/40 p-2.5 text-[11px] font-bold leading-relaxed text-amber-200">
          No hay rutas disponibles para ese horario o capacidad. Puedes continuar sin ruta para enviarla a Tareas.
        </div>
      ) : null}
    </div>
  );
}
