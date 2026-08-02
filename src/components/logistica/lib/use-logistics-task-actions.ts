"use client";

import { confirmLogisticsTaskScheduleAction } from "@/app/actions/logistics-routes";
import { updateLogisticsTaskAction } from "@/app/actions/shipments";
import { assignLogisticsRouteDriverAction } from "@/app/actions/logistics-routes";
import {
  canChangeLogisticsTaskDriver,
  shouldConfirmDriverChange,
  type LogisticsInvoiceStep,
} from "@/lib/logistics-view";
import { getLogisticsWeekdayIndex } from "@/lib/logistics-route-week";
import { scheduledAtToLocalDateInput } from "@/lib/schedule-date";
import type { LogisticsRouteRow } from "@/lib/logistics-routing";
import type {
  ConfirmingScheduleTaskState,
  EditingTaskState,
  LogisticsTaskItem,
  PendingDriverChange,
} from "@/components/logistica/types";

type LogisticsNotify = {
  error: (message: string) => void;
  success: (message: string) => void;
};

export function useLogisticsTaskActions({
  notify,
  canManageRoutes,
  busyId,
  setBusyId,
  editingTask,
  setEditingTask,
  confirmingScheduleTask,
  setConfirmingScheduleTask,
  pendingDriverChange,
  setPendingDriverChange,
  invoiceStepByTaskId,
  dateFilter,
  setDateFilter,
  weekdayFilter,
  setWeekdayFilter,
  setRouteTemplateFilter,
  selectWeekdayFilter,
  setSelectedRouteId,
  reloadAll,
  assignRoute,
}: {
  notify: LogisticsNotify;
  canManageRoutes: boolean;
  busyId: string | null;
  setBusyId: (value: string | null) => void;
  editingTask: EditingTaskState | null;
  setEditingTask: (value: EditingTaskState | null) => void;
  confirmingScheduleTask: ConfirmingScheduleTaskState | null;
  setConfirmingScheduleTask: (value: ConfirmingScheduleTaskState | null) => void;
  pendingDriverChange: PendingDriverChange | null;
  setPendingDriverChange: (value: PendingDriverChange | null) => void;
  invoiceStepByTaskId: Map<string, LogisticsInvoiceStep<LogisticsTaskItem>>;
  dateFilter: string;
  setDateFilter: (value: string) => void;
  weekdayFilter: number | null;
  setWeekdayFilter: (value: number | null) => void;
  setRouteTemplateFilter: (value: string) => void;
  selectWeekdayFilter: (next: number | null) => void;
  setSelectedRouteId: (value: string) => void;
  reloadAll: () => Promise<void>;
  assignRoute: (routeId: string, assignedTo: string | null) => Promise<void>;
}) {
  async function changeTask(
    task: LogisticsTaskItem,
    patch: Omit<Parameters<typeof updateLogisticsTaskAction>[0], "taskId">,
  ) {
    setBusyId(task.id);
    const result = await updateLogisticsTaskAction({
      taskId: task.id,
      ...patch,
    });

    if (!result.ok) {
      notify.error(result.error);
      setBusyId(null);
      return false;
    }

    await reloadAll();
    setBusyId(null);
    notify.success("Tarea actualizada");
    return true;
  }

  async function saveTaskEdit(patch: {
    scheduledAt: string | null;
    warehouseId: string | null;
    notes: string;
  }) {
    if (!editingTask) {
      return;
    }

    const previousDate = scheduledAtToLocalDateInput(editingTask.task.scheduledAt);
    const saved = await changeTask(editingTask.task, patch);

    if (!saved) {
      return;
    }

    setEditingTask(null);

    const nextDate = scheduledAtToLocalDateInput(patch.scheduledAt);
    if (nextDate && nextDate !== previousDate && dateFilter && dateFilter === previousDate) {
      setDateFilter(nextDate);
      setWeekdayFilter(getLogisticsWeekdayIndex(nextDate));
      setRouteTemplateFilter("");
    } else if (
      nextDate &&
      nextDate !== previousDate &&
      weekdayFilter != null &&
      previousDate &&
      getLogisticsWeekdayIndex(previousDate) === weekdayFilter
    ) {
      selectWeekdayFilter(getLogisticsWeekdayIndex(nextDate));
    }
  }

  async function confirmTaskSchedule(input: {
    scheduledAt: string;
    driverId: string;
    routeTemplateId: string;
  }) {
    if (!confirmingScheduleTask) return;

    const task = confirmingScheduleTask.task;
    setBusyId(`confirm:${task.id}`);
    const result = await confirmLogisticsTaskScheduleAction({
      taskId: task.id,
      ...input,
    });
    setBusyId(null);

    if (!result.ok) {
      notify.error(result.error);
      return;
    }

    setConfirmingScheduleTask(null);
    setSelectedRouteId(result.data.id);
    await reloadAll();
    notify.success("Tarea confirmada y agregada a la ruta");
  }

  async function saveDriverChange(task: LogisticsTaskItem, nextAssignedTo: string | null) {
    setBusyId(task.id);
    const result = await updateLogisticsTaskAction({
      taskId: task.id,
      assignedTo: nextAssignedTo,
    });

    if (!result.ok) {
      notify.error(result.error);
      setBusyId(null);
      return false;
    }

    await reloadAll();
    setBusyId(null);
    notify.success("Chofer actualizado");
    return true;
  }

  function requestDriverChange(
    task: LogisticsTaskItem,
    nextAssignedTo: string | null,
    routeInfo?: { route: LogisticsRouteRow },
  ) {
    if (nextAssignedTo === task.assignedTo) {
      return;
    }

    if (shouldConfirmDriverChange(task.assignedTo, nextAssignedTo)) {
      setPendingDriverChange({
        task,
        nextAssignedTo,
        routeId: routeInfo?.route.id,
      });
      return;
    }

    if (routeInfo) {
      void assignRoute(routeInfo.route.id, nextAssignedTo);
      return;
    }

    void saveDriverChange(task, nextAssignedTo);
  }

  async function confirmDriverChange() {
    if (!pendingDriverChange) {
      return;
    }

    const { task, nextAssignedTo, routeId } = pendingDriverChange;
    if (routeId) {
      setBusyId(`driver:${routeId}`);
      const result = await assignLogisticsRouteDriverAction({ routeId, assignedTo: nextAssignedTo });
      setBusyId(null);

      if (!result.ok) {
        notify.error(result.error);
        return;
      }

      await reloadAll();
      setPendingDriverChange(null);
      notify.success("Chofer de la ruta actualizado");
      return;
    }

    const saved = await saveDriverChange(task, nextAssignedTo);
    if (saved) {
      setPendingDriverChange(null);
    }
  }

  function cancelDriverChange() {
    if (
      busyId === pendingDriverChange?.task.id ||
      (pendingDriverChange?.routeId && busyId === `driver:${pendingDriverChange.routeId}`)
    ) {
      return;
    }

    setPendingDriverChange(null);
  }

  function canChangeTaskDriver(task: LogisticsTaskItem, routeInfo?: { route: LogisticsRouteRow }) {
    const invoiceStep = invoiceStepByTaskId.get(task.id);
    const invoiceAllowsDriver =
      !invoiceStep ||
      (invoiceStep.currentTask?.id === task.id && invoiceStep.canAssignDriver);

    return canChangeLogisticsTaskDriver({
      status: task.status,
      invoiceAllowsDriver,
      onRoute: Boolean(routeInfo),
      routeStatus: routeInfo?.route.status ?? null,
      busy:
        busyId === task.id ||
        Boolean(routeInfo && busyId === `driver:${routeInfo.route.id}`),
      canManageRoutes,
    });
  }

  return {
    saveTaskEdit,
    confirmTaskSchedule,
    requestDriverChange,
    confirmDriverChange,
    cancelDriverChange,
    canChangeTaskDriver,
  };
}
