"use client";

import type { LogisticsRouteCatalog as LogisticsRouteCatalogData } from "@/app/actions/logistics-routes";
import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  Loader2,
  Pencil,
  Phone,
  Route,
  Truck,
} from "lucide-react";
import { CountryName } from "@/components/country-flag";
import { InvoicePriorityBadge } from "@/components/invoice-priority-badge";
import { InlineSearchPicker } from "@/components/inline-search-picker";
import { ShipmentBoxLinesTrigger } from "@/components/shipment-box-lines-trigger";
import {
  listCardShellClass,
  primaryButtonClass,
  secondaryButtonClass,
  textMutedClass,
} from "@/components/ui-blocks";
import { driverLabel, isLogisticsDateOnDisabledWeekday, logisticsActionIconWellClass, logisticsPriorityAwaitingDriver, logisticsPriorityCardClass, logisticsPriorityHeaderClass } from "@/lib/logistics-view";
import { canEditLogisticsTaskFields } from "@/lib/logistics-task-edit";
import { isLogisticsFailedTask } from "@/lib/logistics-reprogram";
import { readShipmentBoxLines } from "@/lib/shipment-display";
import type { LogisticsRouteRow, LogisticsRouteStopRow } from "@/lib/logistics-routing";
import type { LogisticsInvoiceItem, LogisticsTaskItem, TaskAddressMeta } from "@/components/logistica/types";
import type { MouseEvent as ReactMouseEvent } from "react";
import { LOGISTICS_CARD_PICKER_SHELL } from "@/components/logistica/lib/constants";
import {
  invoiceActionFieldClass,
  invoiceActionLabel,
  invoiceDriverFieldClass,
  taskTypeIcon,
} from "@/components/logistica/lib/task-ui";
import { LogisticsTaskWaitingBanner } from "@/components/logistica/panels/logistics-task-waiting-banner";
import { LogisticsTaskRoutePicker } from "@/components/logistica/panels/logistics-task-route-picker";
import { formatLogisticsEntryDate } from "@/components/logistica/lib/formatters";

export type LogisticsInvoicePanelProps = {
  item: LogisticsInvoiceItem;
  addressByTaskId: Map<string, TaskAddressMeta>;
  routeByTaskId: Map<string, { route: LogisticsRouteRow; stop: LogisticsRouteStopRow }>;
  routeRequestStatusByTaskId?: Map<string, string>;
  highlightTaskId: string | null;
  selectedTaskIds: string[];
  memberById: Map<string, string>;
  taskDriverPickerOptions: Array<{ value: string; label: string; searchText?: string }>;
  busyId: string | null;
  canManageRoutes: boolean;
  canManageLogisticsSettings: boolean;
  taskCanBeSelectedForRoute: (task: LogisticsTaskItem, routeInfo?: { route: LogisticsRouteRow }) => boolean;
  onToggleTaskSelection: (task: LogisticsTaskItem, routeInfo?: { route: LogisticsRouteRow }) => void;
  onRequestDriverChange: (task: LogisticsTaskItem, nextAssignedTo: string | null) => void;
  onReprogramTask: (task: LogisticsTaskItem) => void;
  onConfirmSchedule: (task: LogisticsTaskItem) => void;
  onEditTask: (task: LogisticsTaskItem) => void;
  onOpenJournal: (shipmentId: string) => void;
  canChangeTaskDriver: (task: LogisticsTaskItem, routeInfo?: { route: LogisticsRouteRow }) => boolean;
  assignableRoutes: LogisticsRouteRow[];
  routeCatalog: LogisticsRouteCatalogData | undefined;
  filterAnchorDate: string;
  onTaskRouteChange: (
    task: LogisticsTaskItem,
    nextSelection: string | null,
    routeInfo?: { route: LogisticsRouteRow; stop: LogisticsRouteStopRow },
  ) => void;
  onOpenTaskContextMenu?: (
    event: ReactMouseEvent<HTMLElement>,
    task: LogisticsTaskItem,
    canAssign: boolean,
    disabledReason: string,
  ) => void;
};

export function LogisticsInvoiceCard({
  item,
  addressByTaskId,
  routeByTaskId,
  highlightTaskId,
  selectedTaskIds,
  memberById,
  taskDriverPickerOptions,
  busyId,
  canManageRoutes,
  canManageLogisticsSettings,
  taskCanBeSelectedForRoute,
  onToggleTaskSelection,
  onRequestDriverChange,
  onReprogramTask,
  onConfirmSchedule,
  onEditTask,
  onOpenJournal,
  canChangeTaskDriver,
  assignableRoutes,
  routeCatalog,
  filterAnchorDate,
  onTaskRouteChange,
  onOpenTaskContextMenu,
}: LogisticsInvoicePanelProps) {
  const task = item.currentTask;
  const nextTask = item.nextTask;
  const displayTask = task || nextTask;
  const contextTask = task || nextTask;
  const address = displayTask ? addressByTaskId.get(displayTask.id) : undefined;
  const routeInfo = task ? routeByTaskId.get(task.id) : undefined;
  const contextDisabledReason = routeInfo
    ? `Esta tarea ya está asignada a la ruta ${routeInfo.route.name}.`
    : contextTask?.status === "completed"
      ? "Esta tarea ya fue completada."
      : contextTask?.status === "cancelled"
        ? "Esta tarea fue cancelada."
        : "Esta tarea no cumple las condiciones para asignarse a una ruta.";
  const highlighted =
    highlightTaskId === task?.id || Boolean(nextTask && highlightTaskId === nextTask.id);
  const missingGeo = Boolean(displayTask && !address?.hasGeo);
  const canChangeDriver = task ? canChangeTaskDriver(task, routeInfo) : false;
  const isFailed = Boolean(task && isLogisticsFailedTask(task));
  const routePendingDay = Boolean(task && !task.scheduledAt && task.requestedScheduleAt);
  const operationDayUnavailable = isLogisticsDateOnDisabledWeekday({
    scheduledAt: task?.scheduledAt || task?.requestedScheduleAt,
    routeDate: routeInfo?.route.routeDate,
    enabledDays: routeCatalog?.enabledDays,
  });
  const canSelectForRoute =
    task !== null && !operationDayUnavailable && taskCanBeSelectedForRoute(task, routeInfo);
  const logisticsEntryDate = displayTask
    ? formatLogisticsEntryDate(displayTask.orderedAt || displayTask.createdAt)
    : null;
  const priorityCardClass = logisticsPriorityCardClass(item.shipment.invoice_priority);
  const priorityHeaderClass = logisticsPriorityHeaderClass(item.shipment.invoice_priority);
  const effectiveDriverId = routeInfo?.route.assignedTo || task?.assignedTo || null;
  const priorityAwaitingDriver = logisticsPriorityAwaitingDriver(
    item.shipment.invoice_priority,
    effectiveDriverId,
    Boolean(task),
  );
  return (
    <article
      key={task?.id || item.shipment.id}
      data-logistics-task-id={task?.id || nextTask?.id || item.shipment.id}
    onContextMenu={
      contextTask && onOpenTaskContextMenu
          ? (event) =>
              onOpenTaskContextMenu(
                event,
                contextTask,
                taskCanBeSelectedForRoute(contextTask, routeInfo),
                contextDisabledReason,
              )
          : undefined
      }
      className={`${listCardShellClass} shadow-[0_6px_18px_rgba(0,0,0,0.18)] ${priorityCardClass} ${isFailed ? "border-amber-700/70" : ""} ${operationDayUnavailable ? "border-amber-700/60" : ""} ${highlighted ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#1a2320]" : ""}`}
    >
      <div className={`relative border-b border-black px-3 py-2.5 ${priorityHeaderClass}`}>
        {canSelectForRoute && !isFailed ? (
          <label className="absolute left-2 top-2 z-10 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md border border-black bg-surface-inset">
            <input
              type="checkbox"
              className="h-5 w-5 accent-emerald-400"
              checked={selectedTaskIds.includes(task.id)}
              onChange={() => onToggleTaskSelection(task, routeInfo)}
              aria-label={`Seleccionar ${item.shipment.code} para asignar a ruta`}
            />
          </label>
        ) : null}
        {item.shipment.invoice_priority ? (
          <div className="absolute right-2 top-2 z-10">
            <InvoicePriorityBadge variant="chip" pulsing={priorityAwaitingDriver} />
          </div>
        ) : null}
        <div className={`mx-auto min-w-0 text-center ${item.shipment.invoice_priority ? "pr-14" : ""}`}>
          <p className="break-words text-base font-black text-[#f8fafc] sm:truncate">
            <span className="break-all sm:truncate">{item.shipment.code}</span>
          </p>
          <p className="break-words text-xs font-black text-slate-300 sm:truncate">
            {item.shipment.customer_name}
          </p>
          {item.shipment.customerPhone ? (
            <p className="mt-0.5 inline-flex max-w-full flex-wrap items-center justify-center gap-1 text-[11px] font-black text-slate-400 sm:flex-nowrap sm:truncate">
              <Phone className="h-3 w-3 shrink-0" />
              <span className="break-words sm:truncate">{item.shipment.customerPhone}</span>
            </p>
          ) : null}
          {canManageLogisticsSettings ? (
            <button
              type="button"
              onClick={() => onOpenJournal(item.shipment.id)}
              className="mt-1 inline-flex h-7 items-center gap-1 rounded-md border border-black bg-surface-inset px-2 text-[10px] font-black text-emerald-300"
            >
              <BookOpen className="h-3.5 w-3.5" />
              Bitácora
            </button>
          ) : null}
          <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5">
            <CountryName name={item.shipment.country} size="xs" labelClassName={textMutedClass} />
            {missingGeo ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-700/70 bg-amber-400/15 px-2 py-0.5 text-[10px] font-black text-amber-100">
                <AlertTriangle className="h-3 w-3" />
                Falta geo
              </span>
            ) : null}
            {routePendingDay ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-200">
                <Route className="h-3 w-3" />
                Ruta pendiente
              </span>
            ) : null}
            {operationDayUnavailable ? (
              <span
                className="inline-flex items-center gap-1 rounded-md border border-amber-700/60 bg-amber-950/30 px-1.5 py-0.5 text-[10px] font-black text-amber-200"
                title="El invoice se conserva visible; el día está desactivado y debe reprogramarse o reactivarse antes de asignarlo."
              >
                <AlertTriangle className="h-3 w-3" />
                Día no operativo · visible
              </span>
            ) : null}
            {logisticsEntryDate ? (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-200"
                title={`Agregada a Logística el ${logisticsEntryDate}`}
              >
                <CalendarDays className="h-3 w-3" aria-hidden />
                Agregada a Logística · {logisticsEntryDate}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-3 p-3">
        <p
          className={`line-clamp-2 rounded-md border px-2 py-1 text-xs font-bold leading-snug ${
            missingGeo
              ? "border-amber-700 bg-amber-400/15 text-amber-100"
              : "border-black bg-surface-inset text-slate-300"
          }`}
        >
          {address?.address.formattedAddress || displayTask?.notes || "Sin direccion"}
        </p>

        <LogisticsTaskWaitingBanner
          taskType={task?.taskType ?? item.step.stepType}
          orderedAt={task?.orderedAt}
          createdAt={task?.createdAt}
        />

        <div className="grid gap-2 sm:grid-cols-2">
          <div
            className={`relative flex items-center gap-2.5 rounded-md border px-2 py-2 ${invoiceActionFieldClass()}`}
          >
            <span
              className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border ${logisticsActionIconWellClass(item.step.stepType)}`}
              aria-hidden
            >
              {taskTypeIcon(item.step.stepType, "h-5 w-5")}
            </span>
            <div className="min-w-0">
              <span className="pointer-events-none block text-[10px] font-black uppercase text-app-text-muted">
                Accion
              </span>
              <span className="pointer-events-none block truncate text-sm font-black">
                {invoiceActionLabel(item.step.stepType)}
              </span>
            </div>
          </div>

          <div
            className={`relative grid gap-1 rounded-md border px-2 py-2 ${invoiceDriverFieldClass(effectiveDriverId, Boolean(task))}`}
          >
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-black uppercase ${
                  task && !effectiveDriverId ? "text-rose-400" : "text-app-text-secondary"
              }`}
            >
              <Truck className="h-3.5 w-3.5" />
              Chofer
            </span>
            {task && isFailed ? (
              <button
                type="button"
                className={`${primaryButtonClass} h-9 w-full text-xs`}
                disabled={busyId === task.id}
                onClick={() => onReprogramTask(task)}
              >
                Reprogramar
              </button>
            ) : task && routeInfo ? (
              <p
                className="truncate text-sm font-black"
                title="El chofer se asigna a toda la ruta con Asignar (barra superior) o en Rutas"
              >
                {driverLabel(routeInfo.route.assignedTo || task.assignedTo, memberById)}
              </p>
            ) : task ? (
              <InlineSearchPicker
                className="w-full min-w-0"
                minWidthClass="w-full min-w-0"
                shellClassName={LOGISTICS_CARD_PICKER_SHELL}
                value={task.assignedTo || ""}
                onChange={(nextValue) => onRequestDriverChange(task, nextValue || null)}
                options={taskDriverPickerOptions}
                placeholder="Sin chofer"
                searchPlaceholder="Buscar chofer…"
                emptyLabel="Sin conductores"
                ariaLabel={`Chofer de ${item.shipment.code}`}
                disabled={!canChangeDriver}
                formatSelectedLabel={(option) => option?.label || "Sin chofer"}
              />
            ) : (
              <span className="truncate text-sm font-black">Primero entrega</span>
            )}
            {task && busyId === task.id ? (
              <Loader2 className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 animate-spin text-emerald-300" />
            ) : null}
          </div>
        </div>

        {task && !isFailed ? (
          <div className="relative grid gap-1 rounded-md border border-black bg-surface-inset px-2 py-2">
            <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-slate-500">
              <Route className="h-3.5 w-3.5" />
              Ruta
            </span>
            {task && !isFailed ? (
              <LogisticsTaskRoutePicker
                task={task}
                routeInfo={routeInfo}
                shipmentCode={item.shipment.code}
                className="w-full shrink-0"
                addressByTaskId={addressByTaskId}
                assignableRoutes={assignableRoutes}
                routeCatalog={routeCatalog}
                filterAnchorDate={filterAnchorDate}
                memberById={memberById}
                busyId={busyId}
                canManageRoutes={canManageRoutes}
                onTaskRouteChange={onTaskRouteChange}
              />
            ) : null}
            {busyId === `route:${task.id}` ? (
              <Loader2 className="pointer-events-none absolute right-2 top-2 h-3.5 w-3.5 animate-spin text-emerald-300" />
            ) : null}
          </div>
        ) : null}

        {task && !isFailed && canEditLogisticsTaskFields(task) && !routeInfo ? (
          <button
            type="button"
            className={`${primaryButtonClass} h-9 w-full text-xs`}
            disabled={busyId === `confirm:${task.id}` || !canManageRoutes}
            onClick={() => onConfirmSchedule(task)}
          >
            <CalendarDays className="h-4 w-4" />
            Confirmar y programar
          </button>
        ) : null}

        {task && !isFailed && canEditLogisticsTaskFields(task) ? (
          <button
            type="button"
            className={`${secondaryButtonClass} h-9 w-full text-xs`}
            disabled={busyId === task.id}
            onClick={() => onEditTask(task)}
          >
            <Pencil className="h-4 w-4" />
            Programar y editar
          </button>
        ) : null}

        {item.quote ? (
          <ShipmentBoxLinesTrigger
            lines={readShipmentBoxLines(item.shipment)}
            variant="card"
          />
        ) : null}
      </div>
    </article>
  );
}
