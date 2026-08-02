"use client";

import { Loader2, PlusCircle, Route } from "lucide-react";
import type { LogisticsRouteCatalog as LogisticsRouteCatalogData } from "@/app/actions/logistics-routes";
import { ActionConfirmDialog, type ActionConfirmTone } from "@/components/action-confirm-dialog";
import { LogisticsDriverChangeDialog } from "@/components/logistica/logistics-driver-change-dialog";
import { LiveRouteChangeReasonDialog } from "@/components/logistica/live-route-change-reason-dialog";
import { LogisticsAdminTaskExceptionDialog } from "@/components/logistica/logistics-admin-task-exception-dialog";
import { LogisticsTaskEditPanel } from "@/components/logistica/logistics-task-edit-panel";
import { LogisticsTaskReprogramPanel } from "@/components/logistica/logistics-task-reprogram-panel";
import { LogisticsTaskScheduleConfirmPanel } from "@/components/logistica/logistics-task-schedule-confirm-panel";
import { ShipmentJournalDialog } from "@/components/shipment-journal-dialog";
import { secondaryButtonClass } from "@/components/ui-blocks";
import type { RouteMemberRow, ShipmentRow } from "@/lib/shipment-types";
import type { LogisticsRouteRow } from "@/lib/logistics-routing";
import type { WarehouseRow } from "@/lib/auth/types";
import { scheduledAtToLocalDateInput } from "@/lib/schedule-date";
import type {
  ConfirmingScheduleTaskState,
  EditingTaskState,
  LogisticsTaskItem,
  PendingDriverChange,
  PendingLiveRouteReason,
  PendingRouteConfirm,
  ReprogrammingTaskState,
} from "@/components/logistica/types";
import { taskTypeLabel } from "@/components/logistica/lib/constants";
import { formatTaskDate } from "@/components/logistica/lib/formatters";

type RouteConfirmCopy = {
  title: string;
  message: string;
  confirmLabel?: string;
  tone?: ActionConfirmTone;
};

export type LogisticsClientDialogsProps = {
  busyId: string | null;
  canManageRoutes: boolean;
  routeMembers: RouteMemberRow[];
  warehouses: WarehouseRow[];
  routeCatalog: LogisticsRouteCatalogData | undefined;
  memberById: Map<string, string>;
  routeByTaskId: Map<string, { route: LogisticsRouteRow }>;
  journalShipment: ShipmentRow | null;
  reprogrammingTask: ReprogrammingTaskState | null;
  editingTask: EditingTaskState | null;
  adminExceptionTask: LogisticsTaskItem | null;
  confirmingScheduleTask: ConfirmingScheduleTaskState | null;
  pendingDriverChange: PendingDriverChange | null;
  pendingRouteConfirm: PendingRouteConfirm | null;
  pendingRouteDialogCopy: RouteConfirmCopy | null;
  pendingLiveRouteReason: PendingLiveRouteReason | null;
  liveRouteReasonError: string | null;
  liveRouteReasonBusy: boolean;
  routeAssignmentOpen: boolean;
  selectedTasks: LogisticsTaskItem[];
  assignableRoutes: LogisticsRouteRow[];
  onCloseJournal: () => void;
  onJournalError: (message: string) => void;
  onCloseReprogram: () => void;
  onReprogramSaved: () => Promise<void>;
  onCloseEdit: () => void;
  onSaveEdit: (patch: {
    scheduledAt: string | null;
    warehouseId: string | null;
    notes: string;
  }) => Promise<void>;
  onRequestAdminException: (task: LogisticsTaskItem) => void;
  onCloseAdminException: () => void;
  onAdminExceptionCompleted: () => Promise<void>;
  onCloseConfirmSchedule: () => void;
  onConfirmSchedule: (input: {
    scheduledAt: string;
    driverId: string;
    routeTemplateId: string;
  }) => Promise<void>;
  onCancelDriverChange: () => void;
  onConfirmDriverChange: () => void;
  onCancelPendingRouteAction: () => void;
  onConfirmPendingRouteAction: () => void;
  onCancelLiveRouteReason: () => void;
  onConfirmLiveRouteReason: (reason: string) => void;
  onCloseRouteAssignment: () => void;
  onAssignSelectedTasksToRoute: (route: LogisticsRouteRow) => void;
};

export function LogisticsClientDialogs({
  busyId,
  canManageRoutes,
  routeMembers,
  warehouses,
  routeCatalog,
  memberById,
  routeByTaskId,
  journalShipment,
  reprogrammingTask,
  editingTask,
  adminExceptionTask,
  confirmingScheduleTask,
  pendingDriverChange,
  pendingRouteConfirm,
  pendingRouteDialogCopy,
  pendingLiveRouteReason,
  liveRouteReasonError,
  liveRouteReasonBusy,
  routeAssignmentOpen,
  selectedTasks,
  assignableRoutes,
  onCloseJournal,
  onJournalError,
  onCloseReprogram,
  onReprogramSaved,
  onCloseEdit,
  onSaveEdit,
  onRequestAdminException,
  onCloseAdminException,
  onAdminExceptionCompleted,
  onCloseConfirmSchedule,
  onConfirmSchedule,
  onCancelDriverChange,
  onConfirmDriverChange,
  onCancelPendingRouteAction,
  onConfirmPendingRouteAction,
  onCancelLiveRouteReason,
  onConfirmLiveRouteReason,
  onCloseRouteAssignment,
  onAssignSelectedTasksToRoute,
}: LogisticsClientDialogsProps) {
  return (
    <>
      {routeAssignmentOpen ? (
        <div className="fixed inset-0 z-[145] flex items-center justify-center bg-black/70 p-4">
          <button
            type="button"
            className="absolute inset-0"
            aria-label="Cerrar asignación de ruta"
            onClick={onCloseRouteAssignment}
          />
          <section className="relative w-full max-w-lg overflow-hidden rounded-xl border border-black bg-surface-panel shadow-2xl">
            <header className="border-b border-black bg-surface-card-header px-4 py-3">
              <p className="text-lg font-black text-[#f8fafc]">Asignar a ruta</p>
              <p className="mt-0.5 text-sm font-bold text-slate-400">
                {selectedTasks.length} invoices seleccionadas. Elige la ruta operativa para agregarlas.
              </p>
            </header>
            <div className="grid max-h-[55dvh] gap-2 overflow-y-auto p-3">
              {assignableRoutes.length ? (
                assignableRoutes.map((route) => (
                  <button
                    key={route.id}
                    type="button"
                    className="flex items-center justify-between gap-3 rounded-lg border border-black bg-surface-card px-3 py-3 text-left transition hover:bg-surface-card-hover disabled:opacity-50"
                    disabled={busyId === `assign-selection:${route.id}`}
                    onClick={() => void onAssignSelectedTasksToRoute(route)}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-black text-[#f8fafc]">{route.name}</span>
                      <span className="mt-0.5 block text-xs font-bold text-slate-500">
                        {formatTaskDate(route.routeDate)} · {route.stops.length} paradas
                      </span>
                    </span>
                    {busyId === `assign-selection:${route.id}` ? (
                      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-emerald-300" />
                    ) : (
                      <PlusCircle className="h-4 w-4 shrink-0 text-emerald-300" />
                    )}
                  </button>
                ))
              ) : (
                <div className="rounded-lg border border-dashed border-black bg-surface-inset p-5 text-center">
                  <Route className="mx-auto h-7 w-7 text-slate-600" />
                  <p className="mt-2 text-sm font-black text-slate-300">Sin rutas abiertas</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">
                    Crea o abre una ruta operativa antes de asignar estas tareas.
                  </p>
                </div>
              )}
            </div>
            <footer className="border-t border-black p-3">
              <button type="button" className={`${secondaryButtonClass} h-9 px-3 text-xs`} onClick={onCloseRouteAssignment}>
                Cancelar
              </button>
            </footer>
          </section>
        </div>
      ) : null}

      {journalShipment ? (
        <ShipmentJournalDialog
          key={journalShipment.id}
          open
          shipment={journalShipment}
          onClose={onCloseJournal}
          onError={onJournalError}
        />
      ) : null}

      {reprogrammingTask ? (
        <LogisticsTaskReprogramPanel
          key={reprogrammingTask.task.id}
          open
          shipmentCode={reprogrammingTask.task.shipment.code}
          customerName={reprogrammingTask.task.shipment.customer_name}
          taskTypeLabel={taskTypeLabel[reprogrammingTask.task.taskType]}
          task={reprogrammingTask.task}
          warehouses={warehouses}
          routeMembers={routeMembers}
          onCancel={onCloseReprogram}
          onSaved={onReprogramSaved}
        />
      ) : null}

      {editingTask ? (
        <LogisticsTaskEditPanel
          key={editingTask.task.id}
          open
          shipmentCode={editingTask.task.shipment.code}
          customerName={editingTask.task.shipment.customer_name}
          taskTypeLabel={taskTypeLabel[editingTask.task.taskType]}
          task={editingTask.task}
          warehouses={warehouses}
          saving={busyId === editingTask.task.id}
          showAdminException={
            canManageRoutes &&
            editingTask.task.status !== "completed" &&
            editingTask.task.status !== "cancelled" &&
            Boolean(routeByTaskId.get(editingTask.task.id)) &&
            routeByTaskId.get(editingTask.task.id)?.route.status !== "in_progress"
          }
          onRequestAdminException={() => onRequestAdminException(editingTask.task)}
          onCancel={onCloseEdit}
          onSave={onSaveEdit}
        />
      ) : null}

      <LogisticsAdminTaskExceptionDialog
        open={Boolean(adminExceptionTask)}
        taskId={adminExceptionTask?.id || ""}
        shipmentCode={adminExceptionTask?.shipment.code || ""}
        taskStatus={adminExceptionTask?.status || ""}
        routeName={
          adminExceptionTask
            ? routeByTaskId.get(adminExceptionTask.id)?.route.name || null
            : null
        }
        routeStatus={
          adminExceptionTask
            ? routeByTaskId.get(adminExceptionTask.id)?.route.status || null
            : null
        }
        onCancel={onCloseAdminException}
        onCompleted={onAdminExceptionCompleted}
      />

      <LogisticsTaskScheduleConfirmPanel
        key={confirmingScheduleTask?.task.id || "no-task"}
        open={Boolean(confirmingScheduleTask)}
        shipmentCode={confirmingScheduleTask?.task.shipment.code || ""}
        customerName={confirmingScheduleTask?.task.shipment.customer_name || ""}
        taskTypeLabel={
          confirmingScheduleTask
            ? taskTypeLabel[confirmingScheduleTask.task.taskType]
            : ""
        }
        scheduledAt={confirmingScheduleTask?.task.scheduledAt || null}
        pendingRouteDate={scheduledAtToLocalDateInput(confirmingScheduleTask?.task.requestedScheduleAt)}
        templates={routeCatalog?.templates || []}
        scheduleSuggestionsByWeekday={
          confirmingScheduleTask?.task.taskType === "pickup_full_box"
            ? routeCatalog?.scheduleSuggestionsByWeekday?.pickup
            : routeCatalog?.scheduleSuggestionsByWeekday?.delivery
        }
        enabledDays={routeCatalog?.enabledDays || []}
        defaultDriverByWeekday={routeCatalog?.defaultDriverByWeekday || Array<string | null>(7).fill(null)}
        weekdayScheduleByWeekday={routeCatalog?.weekdayScheduleByWeekday}
        routeMembers={routeMembers}
        saving={Boolean(confirmingScheduleTask && busyId === `confirm:${confirmingScheduleTask.task.id}`)}
        onCancel={onCloseConfirmSchedule}
        onConfirm={onConfirmSchedule}
      />

      <LogisticsDriverChangeDialog
        open={Boolean(pendingDriverChange)}
        shipmentCode={pendingDriverChange?.task.shipment.code || ""}
        customerName={pendingDriverChange?.task.shipment.customer_name || ""}
        taskTypeLabel={
          pendingDriverChange ? taskTypeLabel[pendingDriverChange.task.taskType] : ""
        }
        currentAssignedTo={pendingDriverChange?.task.assignedTo || null}
        nextAssignedTo={pendingDriverChange?.nextAssignedTo ?? null}
        memberById={memberById}
        routeScope={Boolean(pendingDriverChange?.routeId)}
        confirming={
          pendingDriverChange
            ? busyId === pendingDriverChange.task.id ||
              Boolean(
                pendingDriverChange.routeId &&
                  busyId === `driver:${pendingDriverChange.routeId}`,
              )
            : false
        }
        onCancel={onCancelDriverChange}
        onConfirm={onConfirmDriverChange}
      />

      <ActionConfirmDialog
        open={Boolean(pendingRouteConfirm && pendingRouteDialogCopy)}
        dialogId="logistics-route-confirm"
        title={pendingRouteDialogCopy?.title || ""}
        message={pendingRouteDialogCopy?.message || ""}
        confirmLabel={pendingRouteDialogCopy?.confirmLabel}
        tone={pendingRouteDialogCopy?.tone}
        confirming={
          pendingRouteConfirm?.kind === "cancel"
            ? busyId === `cancel:${pendingRouteConfirm.route.id}`
            : pendingRouteConfirm?.kind === "remove-stop"
              ? busyId === `remove:${pendingRouteConfirm.stop.id}`
              : pendingRouteConfirm?.kind === "driver"
                ? busyId === `driver:${pendingRouteConfirm.route.id}`
                : false
        }
        onCancel={onCancelPendingRouteAction}
        onConfirm={onConfirmPendingRouteAction}
      />

      <LiveRouteChangeReasonDialog
        open={Boolean(pendingLiveRouteReason)}
        changeTypeLabel={pendingLiveRouteReason?.changeTypeLabel || ""}
        routeName={pendingLiveRouteReason?.route.name || ""}
        stopLabel={
          pendingLiveRouteReason?.kind === "remove-stop"
            ? pendingLiveRouteReason.shipmentCode
            : pendingLiveRouteReason?.kind === "reorder"
              ? pendingLiveRouteReason.stop.address.name || pendingLiveRouteReason.stop.taskId
              : null
        }
        summary={pendingLiveRouteReason?.summary || ""}
        confirming={liveRouteReasonBusy}
        error={liveRouteReasonError}
        onCancel={onCancelLiveRouteReason}
        onConfirm={onConfirmLiveRouteReason}
      />
    </>
  );
}
