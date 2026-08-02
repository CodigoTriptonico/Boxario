"use client";

import {
  ArrowDown,
  ArrowUp,
  Boxes,
  CheckCircle2,
  Loader2,
  Pencil,
  Trash2,
  Truck,
  X,
} from "lucide-react";
import { InvoicePriorityBadge } from "@/components/invoice-priority-badge";
import { LogisticsTaskStatusBadge } from "@/components/logistica/logistics-task-status-badge";
import { InlineSearchPicker } from "@/components/inline-search-picker";
import { secondaryButtonClass } from "@/components/ui-blocks";
import { logisticsPriorityAwaitingDriver } from "@/lib/logistics-view";
import { canEditLogisticsTaskFields } from "@/lib/logistics-task-edit";
import { estimateRouteStopEtaMinutes, formatEtaMinutes } from "@/lib/logistics-eta";
import type { RouteMemberRow } from "@/lib/shipment-types";
import type { LogisticsRouteRow, LogisticsRouteStopRow } from "@/lib/logistics-routing";
import type { LogisticsTaskItem } from "@/components/logistica/types";
import { routeStatusLabel, taskTypeShortLabel } from "@/components/logistica/lib/constants";
import { formatSchedule } from "@/components/logistica/lib/formatters";
import { routeStatusClass, statusBadgeClass, taskTypeIcon } from "@/components/logistica/lib/task-ui";

export type LogisticsRouteDetailPanelProps = {
  selectedRoute: LogisticsRouteRow | null;
  taskById: Map<string, LogisticsTaskItem>;
  highlightTaskId: string | null;
  memberById: Map<string, string>;
  routeMembers: RouteMemberRow[];
  routeDriverPickerOptions: Array<{ value: string; label: string; searchText?: string }>;
  routeVehiclePickerOptions: Array<{ value: string; label: string; searchText?: string }>;
  busyId: string | null;
  scrollClass?: string;
  showTitle?: boolean;
  onRouteDriverChange: (nextAssignedTo: string | null) => void;
  onPublishRoute: (route: LogisticsRouteRow) => void;
  onRequestCancelRoute: (route: LogisticsRouteRow) => void;
  onAssignRouteVehicle: (routeId: string, vehicleId: string | null) => void;
  onMoveStop: (stop: LogisticsRouteStopRow, direction: -1 | 1) => void;
  onRequestRemoveStop: (route: LogisticsRouteRow, stop: LogisticsRouteStopRow) => void;
  onRequestDriverChange: (
    task: LogisticsTaskItem,
    nextAssignedTo: string | null,
    routeInfo: { route: LogisticsRouteRow },
  ) => void;
  onEditTask: (task: LogisticsTaskItem) => void;
  canChangeTaskDriver: (task: LogisticsTaskItem, routeInfo?: { route: LogisticsRouteRow }) => boolean;
};

export function LogisticsRouteDetailPanel({
  selectedRoute,
  taskById,
  highlightTaskId,
  memberById,
  routeMembers,
  routeDriverPickerOptions,
  routeVehiclePickerOptions,
  busyId,
  scrollClass = "max-h-[70vh]",
  showTitle = true,
  onRouteDriverChange,
  onPublishRoute,
  onRequestCancelRoute,
  onAssignRouteVehicle,
  onMoveStop,
  onRequestRemoveStop,
  onRequestDriverChange,
  onEditTask,
  canChangeTaskDriver,
}: LogisticsRouteDetailPanelProps) {
  return (
    <>
      <div className="border-b border-black bg-surface-card-header px-3 py-3">
        {showTitle ? (
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-base font-black text-[#f8fafc]">
                {selectedRoute?.name || "Detalle ruta"}
              </p>
              <p className="mt-0.5 truncate text-xs font-bold text-slate-500">
                {selectedRoute
                  ? `${selectedRoute.routeDate} · ${selectedRoute.stops.length} paradas`
                  : "Selecciona una ruta"}
              </p>
            </div>
            {selectedRoute ? (
              <span
                className={`rounded-md border px-2 py-1 text-[11px] font-black ${routeStatusClass(selectedRoute.status)}`}
              >
                {routeStatusLabel[selectedRoute.status]}
              </span>
            ) : null}
          </div>
        ) : null}

        {selectedRoute ? (
          <div className={`grid gap-2 ${showTitle ? "mt-3" : ""}`}>
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
              <InlineSearchPicker
                className="w-full min-w-0"
                minWidthClass="w-full min-w-0"
                compact={false}
                value={selectedRoute.assignedTo || ""}
                onChange={(nextValue) => onRouteDriverChange(nextValue || null)}
                options={routeDriverPickerOptions}
                placeholder="Sin chofer"
                searchPlaceholder="Buscar chofer…"
                emptyLabel="Sin conductores"
                ariaLabel="Chofer de ruta"
                disabled={busyId === `driver:${selectedRoute.id}`}
                leadingIcon={<Truck className="h-4 w-4 text-emerald-300" aria-hidden />}
              />
              {selectedRoute.status === "draft" ? (
                <button
                  type="button"
                  className={`${secondaryButtonClass} h-11 justify-center text-emerald-200 disabled:opacity-50`}
                  disabled={busyId === `publish:${selectedRoute.id}`}
                  onClick={() => void onPublishRoute(selectedRoute)}
                >
                  {busyId === `publish:${selectedRoute.id}` ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                  Publicar
                </button>
              ) : null}
              <button
                type="button"
                className={`${secondaryButtonClass} h-11 justify-center text-rose-200 disabled:opacity-50`}
                disabled={
                  busyId === `cancel:${selectedRoute.id}` ||
                  (selectedRoute.status !== "draft" && selectedRoute.status !== "planned")
                }
                onClick={() => onRequestCancelRoute(selectedRoute)}
              >
                {busyId === `cancel:${selectedRoute.id}` ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Cancelar
              </button>
            </div>
            {routeVehiclePickerOptions.length ? (
              <InlineSearchPicker
                className="w-full min-w-0"
                minWidthClass="w-full min-w-0"
                compact={false}
                value={selectedRoute.vehicleId || ""}
                onChange={(nextValue) =>
                  void onAssignRouteVehicle(selectedRoute.id, nextValue || null)
                }
                options={routeVehiclePickerOptions}
                placeholder="Sin vehiculo"
                searchPlaceholder="Buscar vehiculo…"
                emptyLabel="Sin vehiculos"
                ariaLabel="Vehiculo de ruta"
                disabled={busyId === `vehicle:${selectedRoute.id}`}
                leadingIcon={<Boxes className="h-4 w-4 text-emerald-300" aria-hidden />}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      <div className={`grid ${scrollClass} gap-3 overflow-y-auto p-3`}>
        {selectedRoute?.stops.length ? (
          selectedRoute.stops.map((stop, index) => {
            const task = taskById.get(stop.taskId);
            const highlighted = highlightTaskId === stop.taskId;

            return (
              <article
                key={stop.id}
                data-logistics-task-id={stop.taskId}
                className={`relative rounded-lg border border-black bg-surface-card p-3 ${
                  highlighted ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#1a2320]" : ""
                }`}
              >
                {task?.shipment.invoice_priority ? (
                  <div className="absolute right-2 top-2 z-10">
                    <InvoicePriorityBadge
                      variant="chip"
                      pulsing={logisticsPriorityAwaitingDriver(
                        task.shipment.invoice_priority,
                        task.assignedTo,
                        true,
                      )}
                    />
                  </div>
                ) : null}
                <div
                  className={`flex items-start justify-between gap-2 ${task?.shipment.invoice_priority ? "pr-14" : ""}`}
                >
                  <div className="flex min-w-0 gap-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-black bg-emerald-400 text-sm font-black text-slate-950">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-[#f8fafc]">
                        {task?.shipment.code || stop.address.name || stop.taskId}
                      </p>
                      <p className="truncate text-xs font-bold text-slate-400">
                        {task?.shipment.customer_name || stop.address.name}
                      </p>
                      {formatEtaMinutes(estimateRouteStopEtaMinutes(index + 1)) ? (
                        <p className="truncate text-[11px] font-bold text-slate-500">
                          ETA ~{formatEtaMinutes(estimateRouteStopEtaMinutes(index + 1))}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-black bg-surface-inset text-slate-300 disabled:opacity-40"
                      disabled={index === 0 || busyId === `reorder:${stop.id}`}
                      onClick={() => void onMoveStop(stop, -1)}
                      aria-label="Subir parada"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-black bg-surface-inset text-slate-300 disabled:opacity-40"
                      disabled={
                        index === selectedRoute.stops.length - 1 ||
                        busyId === `reorder:${stop.id}`
                      }
                      onClick={() => void onMoveStop(stop, 1)}
                      aria-label="Bajar parada"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-black bg-surface-inset text-rose-200 disabled:opacity-40"
                      disabled={busyId === `remove:${stop.id}`}
                      onClick={() => onRequestRemoveStop(selectedRoute, stop)}
                      aria-label="Quitar parada"
                    >
                      {busyId === `remove:${stop.id}` ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 rounded-md border border-black bg-surface-inset px-2 py-1 text-xs font-bold leading-snug text-slate-300">
                  {stop.address.formattedAddress || "Sin direccion"}
                </p>
                {task ? (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-black pt-2">
                    <span className="inline-flex items-center gap-1.5 rounded-md border border-black bg-surface-inset px-2 py-1 text-[11px] font-black text-slate-200">
                      {taskTypeIcon(task.taskType)}
                      {taskTypeShortLabel[task.taskType]}
                    </span>
                    <LogisticsTaskStatusBadge
                      status={task.status}
                      assignedTo={task.assignedTo}
                      memberById={memberById}
                      routeMembers={routeMembers}
                      disabled={!canChangeTaskDriver(task, { route: selectedRoute })}
                      shipmentCode={task.shipment.code}
                      onDriverChangeRequest={(nextAssignedTo) =>
                        onRequestDriverChange(task, nextAssignedTo, { route: selectedRoute })
                      }
                      statusBadgeClass={statusBadgeClass}
                    />
                    <span className="rounded-md border border-black bg-surface-inset px-2 py-1 text-[11px] font-black text-slate-400">
                      {formatSchedule(task.scheduledAt || task.requestedScheduleAt || null)}
                    </span>
                    {canEditLogisticsTaskFields(task) ? (
                      <button
                        type="button"
                        className={`${secondaryButtonClass} h-8 px-2.5 text-[11px]`}
                        disabled={busyId === task.id}
                        onClick={() => onEditTask(task)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Editar
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </article>
            );
          })
        ) : (
          <div className="flex min-h-40 items-center justify-center rounded-lg border border-dashed border-black bg-surface-inset px-4 text-center">
            <div>
              <CheckCircle2 className="mx-auto h-7 w-7 text-slate-600" />
              <p className="mt-2 text-sm font-black text-slate-300">Sin paradas</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export function LogisticsRouteDetailDrawer({
  open,
  selectedRoute,
  onClose,
  children,
}: {
  open: boolean;
  selectedRoute: LogisticsRouteRow;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[135] flex justify-end 2xl:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar detalle de ruta"
        onClick={onClose}
      />
      <aside className="relative flex h-full w-full max-w-lg flex-col border-l border-black bg-[#1a2320] shadow-[-20px_0_50px_rgba(0,0,0,0.45)]">
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-black/70 px-4 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
              Logistica
            </p>
            <h2 className="truncate text-lg font-black text-[#f8fafc]">{selectedRoute.name}</h2>
            <p className="mt-0.5 text-sm font-bold text-slate-400">
              {selectedRoute.routeDate} · {selectedRoute.stops.length} paradas
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black bg-[#111827] text-slate-300"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </aside>
    </div>
  );
}
