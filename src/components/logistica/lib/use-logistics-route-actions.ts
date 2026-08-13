"use client";

import {
  addLogisticsRouteStopAction,
  addLogisticsRouteStopWithReasonAction,
  assignLogisticsRouteDriverAction,
  assignLogisticsRouteVehicleAction,
  assignLogisticsTaskToRouteFromPickerAction,
  cancelLogisticsRouteAction,
  cancelLogisticsRoutePendingStopAction,
  publishLogisticsRouteAction,
  removeLogisticsRouteStopAction,
  reorderLogisticsRouteStopsAction,
  reorderLogisticsRouteStopsWithReasonAction,
} from "@/app/actions/logistics-routes";
import { taskRoutePickerDate } from "@/lib/logistics-view";
import type { LogisticsRouteRow, LogisticsRouteStopRow } from "@/lib/logistics-routing";
import type { LogisticsTaskItem, PendingLiveRouteReason, PendingRouteConfirm } from "@/components/logistica/types";
import { parseRoutePickerValue } from "@/components/logistica/lib/task-route-picker";

type LogisticsNotify = {
  error: (message: string) => void;
  success: (message: string) => void;
};

export function useLogisticsRouteActions({
  notify,
  allTasks,
  selectedTasks,
  selectedRoute,
  toolbarRoute,
  taskById,
  filterAnchorDate,
  busyId,
  setBusyId,
  setSelectedTaskIds,
  setRouteAssignmentOpen,
  setPendingRouteConfirm,
  setPendingLiveRouteReason,
  setLiveRouteReasonError,
  setLiveRouteReasonBusy,
  setSelectedRouteId,
  setRouteDetailDrawerOpen,
  pendingRouteConfirm,
  pendingLiveRouteReason,
  reloadAll,
  reloadRoutesAndAddresses,
}: {
  notify: LogisticsNotify;
  allTasks: LogisticsTaskItem[];
  selectedTasks: LogisticsTaskItem[];
  selectedRoute: LogisticsRouteRow | null;
  toolbarRoute: LogisticsRouteRow | null;
  taskById: Map<string, LogisticsTaskItem>;
  filterAnchorDate: string;
  busyId: string | null;
  setBusyId: (value: string | null) => void;
  setSelectedTaskIds: (value: string[] | ((current: string[]) => string[])) => void;
  setRouteAssignmentOpen: (value: boolean) => void;
  setPendingRouteConfirm: (value: PendingRouteConfirm | null) => void;
  setPendingLiveRouteReason: (value: PendingLiveRouteReason | null) => void;
  setLiveRouteReasonError: (value: string | null) => void;
  setLiveRouteReasonBusy: (value: boolean) => void;
  setSelectedRouteId: (value: string) => void;
  setRouteDetailDrawerOpen: (value: boolean) => void;
  pendingRouteConfirm: PendingRouteConfirm | null;
  pendingLiveRouteReason: PendingLiveRouteReason | null;
  reloadAll: () => Promise<void>;
  reloadRoutesAndAddresses: () => Promise<void>;
}) {
  async function runAssignSelectedTasksToRoute(
    route: LogisticsRouteRow,
    taskIds: string[],
    reason?: string,
  ) {
    const tasks = allTasks.filter((task) => taskIds.includes(task.id));
    if (!tasks.length) {
      return;
    }

    setBusyId(`assign-selection:${route.id}`);
    const results = await Promise.all(
      tasks.map((task) =>
        route.status === "in_progress" && reason
          ? addLogisticsRouteStopWithReasonAction({
              routeId: route.id,
              taskId: task.id,
              reason,
            })
          : addLogisticsRouteStopAction({ routeId: route.id, taskId: task.id }),
      ),
    );
    setBusyId(null);

    const failed = results.find((result) => !result.ok);
    if (failed && !failed.ok) {
      notify.error(failed.error);
      throw new Error(failed.error);
    }

    await reloadAll();
    setSelectedTaskIds([]);
    setRouteAssignmentOpen(false);
    notify.success(`${tasks.length} tareas asignadas a ${route.name}`);
  }

  async function assignSelectedTasksToRoute(route: LogisticsRouteRow) {
    if (!selectedTasks.length) {
      return;
    }

    const taskIds = selectedTasks.map((task) => task.id);

    if (route.status === "in_progress") {
      setLiveRouteReasonError(null);
      setPendingLiveRouteReason({
        kind: "assign-selection",
        route,
        taskIds,
        changeTypeLabel: "Agregar paradas",
        summary: `Se agregarán ${taskIds.length} parada(s) pendiente(s) a la ruta activa.`,
      });
      return;
    }

    try {
      await runAssignSelectedTasksToRoute(route, taskIds);
    } catch {
      return;
    }
  }

  async function saveTaskRouteChange(
    task: LogisticsTaskItem,
    nextSelection: string,
    routeInfo?: { route: LogisticsRouteRow; stop: LogisticsRouteStopRow },
  ) {
    const parsed = parseRoutePickerValue(nextSelection);

    if (!parsed) {
      return;
    }

    setBusyId(`route:${task.id}`);

    if (routeInfo && routeInfo.route.id !== parsed.routeId) {
      const removeResult = await removeLogisticsRouteStopAction({
        routeId: routeInfo.route.id,
        stopId: routeInfo.stop.id,
      });

      if (!removeResult.ok) {
        notify.error(removeResult.error);
        setBusyId(null);
        return;
      }
    }

    const assignResult = await assignLogisticsTaskToRouteFromPickerAction({
      taskId: task.id,
      routeId: parsed.routeId,
      routeTemplateId: parsed.routeTemplateId,
      routeDate: taskRoutePickerDate(task.scheduledAt || task.requestedScheduleAt || null, filterAnchorDate),
    });
    setBusyId(null);

    if (!assignResult.ok) {
      notify.error(assignResult.error);
      await reloadAll();
      return;
    }

    setSelectedRouteId(assignResult.data.id);
    await reloadAll();
    notify.success(routeInfo ? "Ruta actualizada" : "Tarea asignada a la ruta");
  }

  function requestTaskRouteChange(
    task: LogisticsTaskItem,
    nextSelection: string | null,
    routeInfo?: { route: LogisticsRouteRow; stop: LogisticsRouteStopRow },
  ) {
    const currentSelection = routeInfo ? `route:${routeInfo.route.id}` : "";

    if ((nextSelection || "") === currentSelection) {
      return;
    }

    if (routeInfo && !nextSelection) {
      requestRemoveStop(routeInfo.route, routeInfo.stop);
      return;
    }

    if (!nextSelection) {
      return;
    }

    void saveTaskRouteChange(task, nextSelection, routeInfo);
  }

  async function removeStop(route: LogisticsRouteRow, stop: LogisticsRouteStopRow, reason?: string) {
    setBusyId(`remove:${stop.id}`);
    let result;
    if (route.status === "in_progress") {
      if (!reason || reason.trim().length < 3) {
        setBusyId(null);
        notify.error("Indica un motivo para modificar la ruta en curso");
        return;
      }
      result = await cancelLogisticsRoutePendingStopAction({
        routeId: route.id,
        stopId: stop.id,
        reason,
      });
    } else {
      result = await removeLogisticsRouteStopAction({
        routeId: route.id,
        stopId: stop.id,
      });
    }
    setBusyId(null);

    if (!result.ok) {
      notify.error(result.error);
      throw new Error(result.error);
    }

    await reloadAll();
    notify.success("Parada liberada");
  }

  function requestRemoveStop(route: LogisticsRouteRow, stop: LogisticsRouteStopRow) {
    const task = taskById.get(stop.taskId);
    const shipmentCode = task?.shipment.code || stop.address.name || stop.taskId;

    if (route.status === "in_progress") {
      setLiveRouteReasonError(null);
      setPendingLiveRouteReason({
        kind: "remove-stop",
        route,
        stop,
        shipmentCode,
        changeTypeLabel: "Cancelar parada pendiente",
        summary: `Se cancelará la parada pendiente ${shipmentCode} en la ruta activa.`,
      });
      return;
    }

    setPendingRouteConfirm({
      kind: "remove-stop",
      route,
      stop,
      shipmentCode,
    });
  }

  async function confirmPendingRouteAction() {
    if (!pendingRouteConfirm) {
      return;
    }

    if (pendingRouteConfirm.kind === "cancel") {
      await cancelRoute(pendingRouteConfirm.route);
      setPendingRouteConfirm(null);
      return;
    }

    if (pendingRouteConfirm.kind === "remove-stop") {
      await removeStop(pendingRouteConfirm.route, pendingRouteConfirm.stop);
      setPendingRouteConfirm(null);
      return;
    }

    await assignRoute(pendingRouteConfirm.route.id, pendingRouteConfirm.nextAssignedTo);
    setPendingRouteConfirm(null);
  }

  function cancelPendingRouteAction() {
    if (
      pendingRouteConfirm?.kind === "cancel" &&
      busyId === `cancel:${pendingRouteConfirm.route.id}`
    ) {
      return;
    }

    if (
      pendingRouteConfirm?.kind === "remove-stop" &&
      busyId === `remove:${pendingRouteConfirm.stop.id}`
    ) {
      return;
    }

    if (
      pendingRouteConfirm?.kind === "driver" &&
      busyId === `driver:${pendingRouteConfirm.route.id}`
    ) {
      return;
    }

    setPendingRouteConfirm(null);
  }

  function requestRouteDriverChange(nextAssignedTo: string | null) {
    if (!selectedRoute || nextAssignedTo === (selectedRoute.assignedTo || null)) {
      return;
    }

    setPendingRouteConfirm({
      kind: "driver",
      route: selectedRoute,
      nextAssignedTo,
    });
  }

  function requestToolbarRouteDriverChange(nextAssignedTo: string | null) {
    if (!toolbarRoute || nextAssignedTo === (toolbarRoute.assignedTo || null)) {
      return;
    }

    setSelectedRouteId(toolbarRoute.id);
    setPendingRouteConfirm({
      kind: "driver",
      route: toolbarRoute,
      nextAssignedTo,
    });
  }

  function requestCancelRoute(route: LogisticsRouteRow) {
    setPendingRouteConfirm({ kind: "cancel", route });
  }

  async function moveStop(stop: LogisticsRouteStopRow, direction: -1 | 1) {
    if (!selectedRoute) {
      return;
    }

    const index = selectedRoute.stops.findIndex((entry) => entry.id === stop.id);
    const nextIndex = index + direction;

    if (index < 0 || nextIndex < 0 || nextIndex >= selectedRoute.stops.length) {
      return;
    }

    const stopIds = selectedRoute.stops.map((entry) => entry.id);
    [stopIds[index], stopIds[nextIndex]] = [stopIds[nextIndex], stopIds[index]];

    if (selectedRoute.status === "in_progress") {
      setLiveRouteReasonError(null);
      setPendingLiveRouteReason({
        kind: "reorder",
        route: selectedRoute,
        stop,
        orderedStopIds: stopIds,
        changeTypeLabel: "Reordenar paradas",
        summary: `Se reordenarán las paradas pendientes de ${selectedRoute.name}.`,
      });
      return;
    }

    setBusyId(`reorder:${stop.id}`);
    const result = await reorderLogisticsRouteStopsAction({
      routeId: selectedRoute.id,
      stopIds,
    });
    setBusyId(null);

    if (!result.ok) {
      notify.error(result.error);
      return;
    }

    await reloadRoutesAndAddresses();
  }

  async function confirmLiveRouteReason(reason: string) {
    if (!pendingLiveRouteReason) {
      return;
    }

    const trimmed = reason.trim();
    if (trimmed.length < 3) {
      setLiveRouteReasonError("Indica un motivo para modificar la ruta en curso");
      return;
    }

    setLiveRouteReasonBusy(true);
    setLiveRouteReasonError(null);

    try {
      if (pendingLiveRouteReason.kind === "assign-selection") {
        await runAssignSelectedTasksToRoute(
          pendingLiveRouteReason.route,
          pendingLiveRouteReason.taskIds,
          trimmed,
        );
      } else if (pendingLiveRouteReason.kind === "remove-stop") {
        await removeStop(
          pendingLiveRouteReason.route,
          pendingLiveRouteReason.stop,
          trimmed,
        );
      } else {
        setBusyId(`reorder:${pendingLiveRouteReason.stop.id}`);
        const result = await reorderLogisticsRouteStopsWithReasonAction({
          routeId: pendingLiveRouteReason.route.id,
          orderedStopIds: pendingLiveRouteReason.orderedStopIds,
          reason: trimmed,
        });
        setBusyId(null);
        if (!result.ok) {
          notify.error(result.error);
          throw new Error(result.error);
        }
        await reloadRoutesAndAddresses();
      }

      setPendingLiveRouteReason(null);
    } catch (error) {
      setLiveRouteReasonError(
        error instanceof Error ? error.message : "No se pudo aplicar el cambio",
      );
    } finally {
      setLiveRouteReasonBusy(false);
    }
  }

  async function assignRoute(routeId: string, assignedTo: string | null) {
    setBusyId(`driver:${routeId}`);
    const result = await assignLogisticsRouteDriverAction({ routeId, assignedTo });
    setBusyId(null);

    if (!result.ok) {
      notify.error(result.error);
      return;
    }

    await reloadAll();
    notify.success("Ruta actualizada");
  }

  async function assignRouteVehicle(routeId: string, vehicleId: string | null) {
    setBusyId(`vehicle:${routeId}`);
    const result = await assignLogisticsRouteVehicleAction({ routeId, vehicleId });
    setBusyId(null);

    if (!result.ok) {
      notify.error(result.error);
      return;
    }

    await reloadAll();
    notify.success("Vehiculo actualizado");
  }

  async function cancelRoute(route: LogisticsRouteRow) {
    setBusyId(`cancel:${route.id}`);
    const result = await cancelLogisticsRouteAction({ routeId: route.id });
    setBusyId(null);

    if (!result.ok) {
      notify.error(result.error);
      return;
    }

    setSelectedRouteId("");
    setRouteDetailDrawerOpen(false);
    await reloadAll();
    notify.success("Ruta cancelada");
  }

  async function publishRoute(route: LogisticsRouteRow) {
    setBusyId(`publish:${route.id}`);
    const result = await publishLogisticsRouteAction(route.id);
    setBusyId(null);

    if (!result.ok) {
      notify.error(result.error);
      return;
    }

    await reloadAll();
    notify.success("Ruta cerrada. Ya puedes asignar conductor y vehiculo.");
  }

  return {
    assignSelectedTasksToRoute,
    requestTaskRouteChange,
    requestRemoveStop,
    confirmPendingRouteAction,
    cancelPendingRouteAction,
    requestRouteDriverChange,
    requestToolbarRouteDriverChange,
    requestCancelRoute,
    moveStop,
    confirmLiveRouteReason,
    assignRoute,
    assignRouteVehicle,
    publishRoute,
  };
}
