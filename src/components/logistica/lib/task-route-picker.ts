import { buildTaskRoutePickerOptions, taskRoutePickerDate } from "@/lib/logistics-view";
import { canEditLogisticsTaskFields } from "@/lib/logistics-task-edit";
import type { LogisticsRouteCatalog as LogisticsRouteCatalogData } from "@/app/actions/logistics-routes";
import type { LogisticsRouteRow, LogisticsRouteStopRow } from "@/lib/logistics-routing";
import type { LogisticsTaskItem } from "@/components/logistica/types";

export function parseRoutePickerValue(value: string) {
  if (!value) {
    return null;
  }

  if (value.startsWith("template:")) {
    return { routeTemplateId: value.slice("template:".length) };
  }

  if (value.startsWith("route:")) {
    return { routeId: value.slice("route:".length) };
  }

  return { routeId: value };
}

export function routePickerValueForTask(routeInfo?: { route: LogisticsRouteRow }) {
  return routeInfo ? `route:${routeInfo.route.id}` : "";
}

export function routePickerOptionsForTask({
  task,
  assignableRoutes,
  routeCatalog,
  filterAnchorDate,
  memberById,
}: {
  task: LogisticsTaskItem;
  assignableRoutes: LogisticsRouteRow[];
  routeCatalog: LogisticsRouteCatalogData | undefined;
  filterAnchorDate: string;
  memberById: Map<string, string>;
}) {
  return buildTaskRoutePickerOptions({
    routes: assignableRoutes.map((route) => ({
      id: route.id,
      name: route.name,
      routeDate: route.routeDate,
      routeTemplateId: route.routeTemplateId,
      assignedTo: route.assignedTo,
      status: route.status,
    })),
    templates: routeCatalog?.templates || [],
    enabledWeekdays: routeCatalog?.enabledDays || [],
    taskDate: taskRoutePickerDate(task.scheduledAt || task.requestedScheduleAt || null, filterAnchorDate),
    driverLabelById: memberById,
  });
}

export function canChangeTaskRoute({
  task,
  routeInfo,
  hasGeo,
  canManageRoutes,
  busyId,
}: {
  task: LogisticsTaskItem;
  routeInfo?: { route: LogisticsRouteRow; stop: LogisticsRouteStopRow };
  hasGeo: boolean;
  canManageRoutes: boolean;
  busyId: string | null;
}) {
  if (!canManageRoutes || !canEditLogisticsTaskFields(task)) {
    return false;
  }

  if (task.status === "completed" || task.status === "cancelled") {
    return false;
  }

  if (routeInfo && routeInfo.route.status !== "draft") {
    return false;
  }

  if (!routeInfo && !hasGeo) {
    return false;
  }

  if (busyId === task.id || busyId === `route:${task.id}`) {
    return false;
  }

  return true;
}
