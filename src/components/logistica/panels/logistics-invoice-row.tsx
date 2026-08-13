"use client";

import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  ChevronDown,
  Loader2,
  Route,
  Truck,
} from "lucide-react";
import { InvoicePriorityBadge } from "@/components/invoice-priority-badge";
import { InlineSearchPicker } from "@/components/inline-search-picker";
import { ShipmentBoxLinesTrigger } from "@/components/shipment-box-lines-trigger";
import {
  listRowBaseClass,
  listRowHoverClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui-blocks";
import { driverLabel, isLogisticsDateOnDisabledWeekday, logisticsPriorityAwaitingDriver, logisticsPriorityCardClass } from "@/lib/logistics-view";
import { canEditLogisticsTaskFields } from "@/lib/logistics-task-edit";
import { isLogisticsFailedTask } from "@/lib/logistics-reprogram";
import { readShipmentBoxLines } from "@/lib/shipment-display";
import { LOGISTICS_CARD_PICKER_SHELL } from "@/components/logistica/lib/constants";
import { formatLogisticsEntryDate, formatTaskDate } from "@/components/logistica/lib/formatters";
import {
  invoiceActionLabel,
  taskTypeIcon,
} from "@/components/logistica/lib/task-ui";
import type { LogisticsInvoicePanelProps } from "@/components/logistica/panels/logistics-invoice-card";
import { LogisticsTaskRoutePicker } from "@/components/logistica/panels/logistics-task-route-picker";

function formatRouteDay(routeDate: string | null | undefined) {
  if (!routeDate) {
    return "Sin fecha";
  }

  const date = new Date(`${routeDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return "Sin fecha";
  }

  return new Intl.DateTimeFormat("es-MX", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

type LogisticsInvoiceRowProps = LogisticsInvoicePanelProps & {
  expanded: boolean;
  onToggleExpanded: () => void;
};

export function LogisticsInvoiceRow(props: LogisticsInvoiceRowProps) {
  const {
    item,
    addressByTaskId,
    routeByTaskId,
    routeRequestStatusByTaskId,
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
    expanded,
    onToggleExpanded,
  } = props;

  const task = item.currentTask;
  const nextTask = item.nextTask;
  const displayTask = task || nextTask;
  const contextTask = task || nextTask;
  const address = displayTask ? addressByTaskId.get(displayTask.id) : undefined;
  const routeInfo = displayTask ? routeByTaskId.get(displayTask.id) : undefined;
  const routeRequestStatus = displayTask
    ? routeRequestStatusByTaskId?.get(displayTask.id)
    : undefined;
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
  const taskDate = task?.scheduledAt || task?.requestedScheduleAt || null;
  const logisticsEntryDate = displayTask
    ? formatLogisticsEntryDate(displayTask.orderedAt || displayTask.createdAt)
    : null;
  const operationDayUnavailable = isLogisticsDateOnDisabledWeekday({
    scheduledAt: task?.scheduledAt || task?.requestedScheduleAt,
    routeDate: routeInfo?.route.routeDate,
    enabledDays: routeCatalog?.enabledDays,
  });
  const canSelectForRoute =
    task !== null && !operationDayUnavailable && taskCanBeSelectedForRoute(task, routeInfo);
  const priorityAwaitingDriver = logisticsPriorityAwaitingDriver(
    item.shipment.invoice_priority,
    task?.assignedTo,
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
      className={`${listRowBaseClass} px-3 py-2 sm:px-4 ${
        highlighted
          ? "bg-emerald-950/25 ring-1 ring-inset ring-emerald-500/50"
          : listRowHoverClass
        } ${isFailed ? "bg-amber-950/25" : ""} ${operationDayUnavailable ? "bg-amber-950/15" : ""} ${logisticsPriorityCardClass(item.shipment.invoice_priority)} ${expanded ? "bg-surface-list-row-hover/80" : ""}`}
    >
      <div className="flex w-full min-w-0 flex-wrap items-start gap-x-2 lg:gap-x-4">
        <div
          className="min-w-0 flex-1 cursor-pointer rounded-md outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
          role="button"
          tabIndex={0}
          aria-expanded={expanded}
          aria-controls={`logistics-detail-${item.shipment.id}`}
          aria-label={expanded ? `Ocultar detalle de ${item.shipment.code}` : `Ver detalle de ${item.shipment.code}`}
          onClick={onToggleExpanded}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              onToggleExpanded();
            }
          }}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            {canSelectForRoute && !isFailed ? (
              <label
                className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded border border-black bg-surface-inset"
                onClick={(event) => event.stopPropagation()}
              >
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
              <InvoicePriorityBadge variant="chip" pulsing={priorityAwaitingDriver} />
            ) : null}
            <span className="text-sm font-black text-[#f8fafc]">{item.shipment.code}</span>
            <span className="truncate text-sm font-bold text-slate-300">{item.shipment.customer_name}</span>
            <span className="inline-flex items-center gap-1 rounded-md border border-black/70 bg-surface-inset px-1.5 py-0.5 text-[10px] font-black uppercase text-slate-300">
              {taskTypeIcon(item.step.stepType, "h-3 w-3")}
              {invoiceActionLabel(item.step.stepType)}
            </span>
            {logisticsEntryDate ? (
              <span
                className="inline-flex items-center gap-1 rounded-md border border-emerald-700/50 bg-emerald-950/25 px-1.5 py-0.5 text-[10px] font-black text-emerald-200"
                title={`Agregada a Logística el ${logisticsEntryDate}`}
              >
                <CalendarDays className="h-3 w-3 shrink-0" aria-hidden />
                Agregada {logisticsEntryDate}
              </span>
            ) : null}
            {routeInfo ? (
              <span
                className="inline-flex max-w-full items-center gap-1 rounded-md border border-sky-700/60 bg-sky-950/40 px-1.5 py-0.5 text-[10px] font-black text-sky-100"
                title={`Pertenece a ${routeInfo.route.name} · ${formatRouteDay(routeInfo.route.routeDate)}`}
              >
                <Route className="h-3 w-3 shrink-0 text-sky-300" aria-hidden />
                <span className="truncate">
                  {routeInfo.route.name} · {formatRouteDay(routeInfo.route.routeDate)}
                </span>
              </span>
            ) : displayTask ? (
              <span
                className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-black ${
                  routeRequestStatus === "rejected"
                    ? "border-rose-700/70 bg-rose-950/35 text-rose-200"
                    : routeRequestStatus === "deferred"
                      ? "border-amber-700/60 bg-amber-950/30 text-amber-200"
                      : "border-amber-700/60 bg-amber-950/30 text-amber-200"
                }`}
              >
                <Route className="h-3 w-3 shrink-0" aria-hidden />
                {routeRequestStatus === "rejected"
                  ? "Solicitud rechazada"
                  : routeRequestStatus === "deferred"
                    ? "Devuelta a pendiente"
                    : "Ruta pendiente"}
              </span>
            ) : null}
            {isFailed ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-200">
                <AlertTriangle className="h-3 w-3" />
                Fallida
              </span>
            ) : null}
            {operationDayUnavailable ? (
              <span
                className="inline-flex items-center gap-1 rounded-md border border-amber-700/60 bg-amber-950/30 px-1.5 py-0.5 text-[10px] font-black text-amber-200"
                title="El invoice se conserva visible; el día está desactivado y debe reprogramarse o reactivarse antes de asignarlo."
              >
                <AlertTriangle className="h-3 w-3 shrink-0" />
                Día no operativo · visible
              </span>
            ) : null}
            {missingGeo ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-200">
                <AlertTriangle className="h-3 w-3" />
                Falta geo
              </span>
            ) : null}
          </div>
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-bold leading-snug text-slate-400">
            <span className="line-clamp-1 min-w-0 flex-1">
              {address?.address.formattedAddress || displayTask?.notes || "Sin direccion"}
            </span>
            {item.quote ? (
              <span onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
                <ShipmentBoxLinesTrigger
                  lines={readShipmentBoxLines(item.shipment)}
                  variant="inline"
                />
              </span>
            ) : null}
          </div>
        </div>

        {expanded ? (
          <div
            id={`logistics-detail-${item.shipment.id}`}
            className="mt-2.5 flex w-full basis-full flex-wrap items-center gap-1.5 border-t border-black/70 pt-2.5 lg:justify-end"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
          {canManageLogisticsSettings ? (
            <button
              type="button"
              onClick={() => onOpenJournal(item.shipment.id)}
              className={`${secondaryButtonClass} h-8 shrink-0 gap-1 px-2 text-[10px]`}
              title="Abrir Bitácora"
            >
              <BookOpen className="h-3.5 w-3.5 text-emerald-300" />
              Bitácora
            </button>
          ) : null}
          {isFailed && task ? (
            <button
              type="button"
              className={`${primaryButtonClass} h-8 shrink-0 whitespace-nowrap px-2.5 text-[10px]`}
              disabled={busyId === task.id}
              onClick={() => onReprogramTask(task)}
            >
              Reprogramar
            </button>
          ) : null}
          {task && !isFailed ? (
            routeInfo ? (
              <span
                className="inline-flex h-8 max-w-[9rem] items-center gap-1 truncate rounded-md border border-black bg-surface-inset px-2 text-[11px] font-black text-slate-300"
                title="El chofer se asigna a toda la ruta con Asignar (barra superior) o en Rutas"
              >
                <Truck className="h-3.5 w-3.5 shrink-0 text-emerald-300" aria-hidden />
                <span className="truncate">
                  {driverLabel(routeInfo.route.assignedTo || task.assignedTo, memberById)}
                </span>
              </span>
            ) : (
              <InlineSearchPicker
                className="w-[9rem] shrink-0"
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
            )
          ) : (
            <span className="text-[11px] font-black text-slate-400">Primero entrega</span>
          )}
          {task && !isFailed ? (
            <LogisticsTaskRoutePicker
              task={task}
              routeInfo={routeInfo}
              shipmentCode={item.shipment.code}
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
          {task && !isFailed && canEditLogisticsTaskFields(task) && !routeInfo ? (
            <button
              type="button"
              className={`${primaryButtonClass} h-8 shrink-0 whitespace-nowrap px-2.5 text-[10px]`}
              disabled={busyId === `confirm:${task.id}` || !canManageRoutes}
              title="Confirmar fecha, ruta y conductor"
              onClick={() => onConfirmSchedule(task)}
            >
              <CalendarDays className="h-3.5 w-3.5" />
              Programar
            </button>
          ) : null}
          {task && !isFailed && canEditLogisticsTaskFields(task) ? (
            <button
              type="button"
              className={`${secondaryButtonClass} h-8 shrink-0 whitespace-nowrap px-2.5 text-[10px]`}
              title="Cambiar la fecha, hora, bodega o notas"
              onClick={() => onEditTask(task)}
            >
              <CalendarDays className="h-3.5 w-3.5 text-emerald-300" />
              {formatTaskDate(taskDate)}
            </button>
          ) : task ? (
            <span className="inline-flex h-8 items-center gap-1.5 rounded-md border border-black bg-surface-inset px-2 text-[10px] font-black text-slate-300">
              <CalendarDays className="h-3.5 w-3.5 text-emerald-300" />
              {formatTaskDate(taskDate)}
            </span>
          ) : null}
          {task && (busyId === task.id || busyId === `route:${task.id}`) ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-emerald-300" />
          ) : null}
          </div>
        ) : (
          <button
            type="button"
            className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-black bg-surface-inset text-slate-400 transition hover:bg-surface-card-hover hover:text-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300/70"
            aria-label={`Ver detalle de ${item.shipment.code}`}
            aria-controls={`logistics-detail-${item.shipment.id}`}
            aria-expanded={expanded}
            onClick={onToggleExpanded}
          >
            <ChevronDown className="h-4 w-4" aria-hidden />
          </button>
        )}
      </div>
    </article>
  );
}
