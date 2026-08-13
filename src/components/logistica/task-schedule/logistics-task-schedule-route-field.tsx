"use client";

import { CircleAlert, MapPinned, Route } from "lucide-react";
import {
  InlineSearchPicker,
  type InlineSearchPickerOption,
} from "@/components/inline-search-picker";
import type { RouteTemplate } from "@/components/logistica/task-schedule/shared";
import { routeScheduleHasAvailabilityMismatch } from "@/lib/logistics-route-schedule";
import { logisticsWeekdayKeys } from "@/lib/logistics-route-catalog";
import { formatTime12Hour } from "@/lib/sale/schedule-time";
import { secondaryButtonClass } from "@/components/ui-blocks";

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
    <div className="grid gap-1">
      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-slate-500">
        <Route className="h-3.5 w-3.5" />{" "}
        {pendingDayRouteMode ? "Ruta sin fecha" : showAllRoutes ? "Ruta" : "Ruta del día"}
      </span>
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
          showAllRoutes ? "No hay rutas semanales" : `No hay rutas para ${weekdayLabel || "ese día"}`
        }
        ariaLabel="Ruta semanal"
        className="w-full"
        minWidthClass="w-full"
      />
      <button
        type="button"
        disabled={!canOpenCoverageMap}
        onClick={onOpenCoverageMap}
        className={`${secondaryButtonClass} mt-1 h-9 w-fit px-3 text-xs disabled:opacity-40`}
        title={canOpenCoverageMap ? "Comparar la dirección con las coberturas" : "No hay coberturas disponibles para mostrar"}
      >
        <MapPinned className="h-3.5 w-3.5" aria-hidden />
        Ver dirección y coberturas
      </button>
      {!showAllRoutes && dayTemplateCount > 0 && matchingTemplateCount === 0 ? (
        <p className="rounded-lg border border-amber-700/70 bg-amber-950/30 px-3 py-2 text-[11px] font-bold text-amber-100">
          La dirección no coincide con la cobertura de ninguna ruta. Puedes elegir cualquier ruta disponible de ese día, pero Logística deberá verificar la excepción.
        </p>
      ) : null}
      {!showAllRoutes && namedTemplateCount > 0 && dayTemplateCount === 0 ? (
        <p className="rounded-lg border border-amber-700/70 bg-amber-950/30 px-3 py-2 text-[11px] font-bold text-amber-100">
          No hay rutas disponibles para ese horario o capacidad. Puedes continuar sin ruta para enviarla a Tareas.
        </p>
      ) : null}
      {matchingTemplateCount === 1 && selectedCoverageMatches === true ? (
        <p className="text-[11px] font-bold text-emerald-300">
          La dirección coincide con esta cobertura; la ruta se sugirió automáticamente.
        </p>
      ) : null}
      {selectedTemplate && selectedCoverageMatches === false ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-700/70 bg-amber-950/30 px-3 py-2.5" role="alert">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
          <p className="text-[11px] font-bold leading-4 text-amber-200">
            Esta dirección no está dentro de la cobertura de {selectedTemplate.name}. La solicitud quedará pendiente de verificación por Logística.
          </p>
        </div>
      ) : null}
      {selectedTemplate ? (
        selectedTemplate.startTime ? (
          <div className="rounded-lg border border-black/70 bg-surface-inset px-3 py-2">
            <p className="text-[10px] font-black uppercase text-slate-500">Horario de la ruta</p>
            <p className="mt-1 text-sm font-black text-emerald-100">
              Inicio {formatTime12Hour(selectedTemplate.startTime)}
              {selectedTemplate.estimatedEndTime
                ? ` · fin estimado ${formatTime12Hour(selectedTemplate.estimatedEndTime)}`
                : " · hasta terminar la ruta"}
            </p>
          </div>
        ) : (
          <p className="rounded-lg border border-black/70 bg-surface-inset px-3 py-2 text-[11px] font-bold text-slate-400">
            Horario de la ruta pendiente de configurar por Logística.
          </p>
        )
      ) : null}
      {selectedTemplate && routeScheduleHasAvailabilityMismatch(draftTime, selectedTemplate) ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-700/70 bg-amber-950/30 px-3 py-2.5" role="alert">
          <CircleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden />
          <p className="text-[11px] font-bold leading-4 text-amber-200">
            La disponibilidad del cliente podría no coincidir con el horario de la ruta. Verifica con Logística antes de confirmar.
          </p>
        </div>
      ) : null}
      {pendingDayRouteMode ? (
        <span className="text-[11px] font-bold text-slate-500">
          Elige la ruta ahora. Logística define el día y la hora.
        </span>
      ) : !showAllRoutes && weekdayLabel ? (
        <span className="text-[11px] font-bold text-slate-500">
          Solo aparecen rutas de {weekdayLabel}.
        </span>
      ) : null}
      {showAllRoutes && !pendingDayRouteMode && selectedTemplate ? (
        <span className="text-[11px] font-bold text-slate-500">
          Solo se pueden elegir fechas de {logisticsWeekdayKeys[selectedTemplate.weekday] || "ese día"}.
        </span>
      ) : null}
    </div>
  );
}
