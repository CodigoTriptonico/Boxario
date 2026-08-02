"use client";

import {
  AlertTriangle,
  BookOpen,
  CalendarDays,
  Loader2,
  PackageCheck,
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
import { driverLabel, logisticsPriorityAwaitingDriver, logisticsPriorityCardClass } from "@/lib/logistics-view";
import { canEditLogisticsTaskFields } from "@/lib/logistics-task-edit";
import { isLogisticsFailedTask } from "@/lib/logistics-reprogram";
import { readShipmentBoxLines } from "@/lib/shipment-display";
import { LOGISTICS_CARD_PICKER_SHELL } from "@/components/logistica/lib/constants";
import { formatTaskDate } from "@/components/logistica/lib/formatters";
import {
  invoiceActionLabel,
  invoiceEvidenceLabel,
  taskTypeIcon,
} from "@/components/logistica/lib/task-ui";
import type { LogisticsInvoicePanelProps } from "@/components/logistica/panels/logistics-invoice-card";
import { LogisticsTaskRoutePicker } from "@/components/logistica/panels/logistics-task-route-picker";

export function LogisticsInvoiceRow(props: LogisticsInvoicePanelProps) {
  const {
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
  } = props;

  const task = item.currentTask;
  const nextTask = item.nextTask;
  const displayTask = task || nextTask;
  const address = displayTask ? addressByTaskId.get(displayTask.id) : undefined;
  const routeInfo = task ? routeByTaskId.get(task.id) : undefined;
  const highlighted =
    highlightTaskId === task?.id || Boolean(nextTask && highlightTaskId === nextTask.id);
  const missingGeo = Boolean(displayTask && !address?.hasGeo);
  const canChangeDriver = task ? canChangeTaskDriver(task, routeInfo) : false;
  const isFailed = Boolean(task && isLogisticsFailedTask(task));
  const taskDate = task?.scheduledAt || task?.requestedScheduleAt || null;
  const priorityAwaitingDriver = logisticsPriorityAwaitingDriver(
    item.shipment.invoice_priority,
    task?.assignedTo,
    Boolean(task),
  );
  const invoiceEvidence = invoiceEvidenceLabel(item.shipment);

  return (
    <article
      key={task?.id || item.shipment.id}
      data-logistics-task-id={task?.id || nextTask?.id || item.shipment.id}
      className={`${listRowBaseClass} px-3 py-2 sm:px-4 ${
        highlighted
          ? "bg-emerald-950/25 ring-1 ring-inset ring-emerald-500/50"
          : listRowHoverClass
      } ${isFailed ? "bg-amber-950/25" : ""} ${logisticsPriorityCardClass(item.shipment.invoice_priority)}`}
    >
      <div className="flex w-full min-w-0 flex-col gap-y-2 lg:flex-row lg:items-center lg:gap-x-4">
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            {task && !isFailed && taskCanBeSelectedForRoute(task, routeInfo) ? (
              <label className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded border border-black bg-surface-inset">
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
            {isFailed ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-amber-200">
                <AlertTriangle className="h-3 w-3" />
                Fallida
              </span>
            ) : null}
            {missingGeo ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black text-amber-200">
                <AlertTriangle className="h-3 w-3" />
                Falta geo
              </span>
            ) : null}
            <span className={`inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[10px] font-black ${invoiceEvidence.tone}`}>
              <PackageCheck className="h-3 w-3" />
              {invoiceEvidence.label}
            </span>
          </div>
          <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-bold leading-snug text-slate-400">
            <span className="line-clamp-1 min-w-0 flex-1">
              {address?.address.formattedAddress || displayTask?.notes || "Sin direccion"}
            </span>
            {item.quote ? (
              <ShipmentBoxLinesTrigger
                lines={readShipmentBoxLines(item.shipment)}
                variant="inline"
              />
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5 lg:justify-end">
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
      </div>
    </article>
  );
}
