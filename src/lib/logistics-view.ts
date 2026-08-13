import type { LogisticsTaskStatus, LogisticsTaskType, ShipmentRow } from "@/lib/shipment-types";
import { planLeg } from "@/lib/shipment-display/shared";
import { scheduledAtToLocalDateInput } from "@/lib/schedule-date";
import {
  getLogisticsWeekdayIndex,
  resolveRouteDateForTemplate,
} from "@/lib/logistics-route-week";
import { logisticsWeekdayKeys } from "@/lib/logistics-route-catalog";
import { normalizeGenericLogisticsRouteName } from "@/lib/logistics-day-route";

export type { LogisticsTaskWaiting } from "@/lib/logistics-view/timing";
export {
  logisticsActionIconWellClass,
  logisticsPriorityAwaitingDriver,
  logisticsPriorityAwaitingDriverClass,
  logisticsPriorityCardClass,
  logisticsPriorityHeaderClass,
  logisticsScheduleDisplayParts,
  logisticsScheduleProximityClass,
  logisticsTaskWaitingParts,
  logisticsUnroutedTaskCardClass,
  logisticsWaitingToneClass,
} from "@/lib/logistics-view/timing";

const CLOSED_LOGISTICS_STATUSES = new Set(["completed", "cancelled"]);

export type LogisticsInvoiceTaskInput = {
  id: string;
  taskType: LogisticsTaskType;
  status: LogisticsTaskStatus;
  assignedTo: string | null;
};

export type LogisticsInvoiceStep<TTask extends LogisticsInvoiceTaskInput> = {
  stepType: LogisticsTaskType;
  currentTask: TTask | null;
  nextTask: TTask | null;
  emptyBoxDone: boolean;
  pickupReady: boolean;
  canAssignDriver: boolean;
  assignment: "assigned" | "unassigned";
};

export type LogisticsInvoiceStepShipment<TTask extends LogisticsInvoiceTaskInput> = {
  empty_box_delivered_at?: string | null;
  logistics_plan?: Record<string, unknown> | null;
  logisticsTasks: TTask[];
};

const logisticsTaskStatusLabel: Record<LogisticsTaskStatus, string> = {
  pending: "Pendiente",
  scheduled: "Con fecha",
  assigned: "Asignada",
  loaded_to_truck: "En ruta",
  completed: "Completada",
  cancelled: "Cancelada",
};

export function formatLogisticsTaskStatusLabel(
  status: LogisticsTaskStatus,
  assignedTo: string | null,
  memberById: ReadonlyMap<string, string>,
) {
  if (status === "assigned") {
    if (!assignedTo) {
      return "Asignado a sin chofer";
    }

    const driver = memberById.get(assignedTo) || assignedTo;
    return `Asignado a ${driver}`;
  }

  return logisticsTaskStatusLabel[status];
}

export function driverLabel(
  assignedTo: string | null,
  memberById: ReadonlyMap<string, string>,
) {
  if (!assignedTo) {
    return "Sin asignar";
  }

  return memberById.get(assignedTo) || assignedTo;
}

export type DriverPickerOption = {
  value: string;
  label: string;
  searchText: string;
};

export type RoutePickerOption = {
  value: string;
  label: string;
  searchText: string;
};

export function taskRoutePickerDate(taskScheduledAt: string | null, fallbackDate: string) {
  return scheduledAtToLocalDateInput(taskScheduledAt) || fallbackDate;
}

export function buildTaskRoutePickerOptions(input: {
  routes: ReadonlyArray<{
    id: string;
    name: string;
    routeDate: string;
    routeTemplateId?: string | null;
    assignedTo?: string | null;
    status?: string;
  }>;
  templates?: ReadonlyArray<{
    id: string;
    name: string;
    weekday: number;
  }>;
  enabledWeekdays?: ReadonlyArray<string>;
  taskDate: string;
  driverLabelById?: ReadonlyMap<string, string>;
  emptyLabel?: string;
}): RoutePickerOption[] {
  const emptyLabel = input.emptyLabel || "Sin ruta";
  const operationalForDate = input.routes.filter((route) => route.routeDate === input.taskDate);
  const enabledWeekdaySet = new Set(input.enabledWeekdays || []);
  const templateIsEnabled = (templateWeekday: number) =>
    !enabledWeekdaySet.size || enabledWeekdaySet.has(logisticsWeekdayKeys[templateWeekday as 0 | 1 | 2 | 3 | 4 | 5 | 6]);

  const templateOptions = (input.templates || [])
    .filter((template) => templateIsEnabled(template.weekday))
    .filter((template) => {
      const routeDate = resolveRouteDateForTemplate(input.taskDate, template.weekday);
      const covered = input.routes.some(
        (route) =>
          route.routeTemplateId === template.id &&
          route.routeDate === routeDate &&
          route.status === "draft",
      );
      return !covered;
    })
    .map((template) => {
      const weekdayLabel = logisticsWeekdayKeys[template.weekday as 0 | 1 | 2 | 3 | 4 | 5 | 6];
      const routeDate = resolveRouteDateForTemplate(input.taskDate, template.weekday);

      return {
        value: `template:${template.id}`,
        label: `${normalizeGenericLogisticsRouteName(template.name, template.weekday)} (${weekdayLabel})`,
        searchText: `${template.name} ${weekdayLabel} ${routeDate} plantilla semanal`.trim(),
      };
    });

  const routeOptions = operationalForDate.filter((route) => route.status === "draft").map((route) => ({
    value: `route:${route.id}`,
    label: route.name,
    searchText: `${route.name} ${route.routeDate} ${
      route.assignedTo ? input.driverLabelById?.get(route.assignedTo) || "" : ""
    }`.trim(),
  }));

  return [
    { value: "", label: emptyLabel, searchText: `${emptyLabel} sin ruta`.toLowerCase() },
    ...routeOptions,
    ...templateOptions,
  ];
}

export function buildDriverPickerOptions(
  members: ReadonlyArray<{ id: string; label: string }>,
  emptyLabel: string,
): DriverPickerOption[] {
  const emptySearch = `${emptyLabel} sin chofer sin asignar`.toLowerCase();

  return [
    { value: "", label: emptyLabel, searchText: emptySearch },
    ...members.map((member) => ({
      value: member.id,
      label: member.label,
      searchText: member.label,
    })),
  ];
}

/** True when no weekday is selected, or the schedule/route date falls on that weekday. */
export function matchesLogisticsWeekdayFilter(input: {
  weekdayFilter: number | null;
  scheduledAt?: string | null;
  routeDate?: string | null;
}) {
  if (input.weekdayFilter == null || !Number.isInteger(input.weekdayFilter)) {
    return true;
  }

  const weekday = Number(input.weekdayFilter);
  const scheduleDate = scheduledAtToLocalDateInput(input.scheduledAt || null);
  if (scheduleDate && getLogisticsWeekdayIndex(scheduleDate) === weekday) {
    return true;
  }

  const routeDate = String(input.routeDate || "").trim();
  if (routeDate && getLogisticsWeekdayIndex(routeDate) === weekday) {
    return true;
  }

  return false;
}

/** True when a scheduled invoice remains visible but its weekday is disabled. */
export function isLogisticsDateOnDisabledWeekday(input: {
  scheduledAt?: string | null;
  routeDate?: string | null;
  enabledDays?: ReadonlyArray<string>;
}) {
  const enabledDays = input.enabledDays;
  if (!enabledDays) {
    return false;
  }

  const scheduleDate = scheduledAtToLocalDateInput(input.scheduledAt || null);
  const date = scheduleDate || String(input.routeDate || "").trim();
  if (!date) {
    return false;
  }

  const weekday = getLogisticsWeekdayIndex(date);
  const key = logisticsWeekdayKeys[weekday];
  return !key || !enabledDays.includes(key);
}

/** True when no route template is selected, or the task/route uses that template. */
export function matchesLogisticsRouteTemplateFilter(input: {
  routeTemplateIdFilter: string;
  routeTemplateId?: string | null;
}) {
  const filter = String(input.routeTemplateIdFilter || "").trim();
  if (!filter) {
    return true;
  }
  return String(input.routeTemplateId || "").trim() === filter;
}

/**
 * Operational route for the toolbar when Día + Ruta + Fecha are set.
 * Used to assign one driver to every stop on that day's Van Nuys (etc.) run.
 */
export function resolveLogisticsToolbarRoute<
  T extends {
    status: string;
    routeDate: string;
    routeTemplateId?: string | null;
  },
>(input: {
  routes: ReadonlyArray<T>;
  routeTemplateId: string;
  routeDate: string;
}): T | null {
  const templateId = String(input.routeTemplateId || "").trim();
  const routeDate = String(input.routeDate || "").trim();
  if (!templateId || !routeDate) {
    return null;
  }

  return (
    input.routes.find(
      (route) =>
        route.status !== "cancelled" &&
        String(route.routeTemplateId || "").trim() === templateId &&
        String(route.routeDate || "").trim() === routeDate,
    ) || null
  );
}

/** True when no calendar date is selected, or schedule/route date equals that day. */
export function matchesLogisticsDateFilter(input: {
  dateFilter: string;
  scheduledAt?: string | null;
  routeDate?: string | null;
}) {
  const filter = String(input.dateFilter || "").trim();
  if (!filter) {
    return true;
  }

  const scheduleDate = scheduledAtToLocalDateInput(input.scheduledAt || null);
  if (scheduleDate === filter) {
    return true;
  }

  return String(input.routeDate || "").trim() === filter;
}

/** Route-template options for the logistics toolbar, scoped to a weekday. */
export function buildLogisticsDayRouteFilterOptions(input: {
  weekday: number | null;
  templates: ReadonlyArray<{ id: string; name: string; weekday: number }>;
  enabledWeekdays?: ReadonlyArray<string>;
}): RoutePickerOption[] {
  const empty: RoutePickerOption = {
    value: "",
    label: "Todas las rutas",
    searchText: "todas las rutas",
  };

  if (input.weekday == null || !Number.isInteger(input.weekday)) {
    return [empty];
  }

  const enabledWeekdaySet = new Set(input.enabledWeekdays || []);
  const weekday = Number(input.weekday);
  const weekdayLabel = logisticsWeekdayKeys[weekday as 0 | 1 | 2 | 3 | 4 | 5 | 6] || "";

  const options = input.templates
    .filter((template) => Number(template.weekday) === weekday)
    .filter((template) => {
      if (!enabledWeekdaySet.size) {
        return true;
      }
      return enabledWeekdaySet.has(
        logisticsWeekdayKeys[Number(template.weekday) as 0 | 1 | 2 | 3 | 4 | 5 | 6],
      );
    })
    .map((template) => ({
      value: template.id,
      label: normalizeGenericLogisticsRouteName(template.name, template.weekday),
      searchText: `${template.name} ${weekdayLabel}`.trim(),
    }));

  return [empty, ...options];
}

export function driverChangeDialogCopy(
  currentAssignedTo: string | null,
  nextAssignedTo: string | null,
  options?: { scope?: "task" | "route" },
) {
  const routeScope = options?.scope === "route";

  if (!currentAssignedTo && nextAssignedTo) {
    return {
      title: routeScope ? "Asignar chofer a la ruta" : "Asignar chofer",
      warningMessage: routeScope
        ? "El chofer queda en toda la ruta (todas las paradas de este día)."
        : "Este envío quedará asignado al chofer seleccionado.",
      confirmLabel: "Asignar chofer",
      confirmingLabel: "Asignando...",
    };
  }

  if (currentAssignedTo && !nextAssignedTo) {
    return {
      title: routeScope ? "Quitar chofer de la ruta" : "Quitar chofer",
      warningMessage: routeScope
        ? "La ruta y sus paradas quedan sin chofer."
        : "El envío queda sin chofer.",
      confirmLabel: "Quitar chofer",
      confirmingLabel: "Quitando...",
    };
  }

  return {
    title: routeScope ? "Reemplazar chofer de la ruta" : "Reemplazar chofer",
    warningMessage: routeScope
      ? "Se cambia el chofer de toda la ruta."
      : "Se cambia el chofer asignado a este envío.",
    confirmLabel: "Reemplazar chofer",
    confirmingLabel: "Reemplazando...",
  };
}

export function shouldConfirmDriverChange(
  currentAssignedTo: string | null,
  nextAssignedTo: string | null,
) {
  return currentAssignedTo !== nextAssignedTo;
}

/**
 * When a task is already on a route, the driver lives on the route (draft only).
 * Without a route, the task picker can assign a driver directly.
 */
export function canChangeLogisticsTaskDriver(input: {
  status: LogisticsTaskStatus;
  invoiceAllowsDriver: boolean;
  onRoute: boolean;
  routeStatus?: string | null;
  busy?: boolean;
  canManageRoutes?: boolean;
}) {
  if (input.status === "completed" || input.status === "cancelled") {
    return false;
  }

  if (!input.invoiceAllowsDriver) {
    return false;
  }

  if (input.busy) {
    return false;
  }

  if (input.onRoute) {
    if (!input.canManageRoutes) {
      return false;
    }
    return input.routeStatus === "draft";
  }

  return true;
}

export function shouldConfirmDriverReplacement(
  currentAssignedTo: string | null,
  nextAssignedTo: string | null,
) {
  return shouldConfirmDriverChange(currentAssignedTo, nextAssignedTo);
}

export function routeCancelCopy(routeName: string, stopCount: number) {
  const stopLabel = stopCount === 1 ? "1 parada" : `${stopCount} paradas`;

  return {
    title: "¿Cancelar ruta?",
    message: `Se cancela ${routeName} y se liberan ${stopLabel}. Los envíos quedan sin ruta hasta que los vuelvas a asignar.`,
    confirmLabel: "Cancelar ruta",
    tone: "danger" as const,
  };
}

export function routeStopRemoveCopy(shipmentCode: string) {
  return {
    title: "¿Quitar parada?",
    message: `Se saca ${shipmentCode} de la ruta. El envío queda sin ruta hasta que lo vuelvas a asignar.`,
    confirmLabel: "Quitar parada",
    tone: "danger" as const,
  };
}

export function routeDriverChangeCopy(
  routeName: string,
  currentAssignedTo: string | null,
  nextAssignedTo: string | null,
  memberById: ReadonlyMap<string, string>,
) {
  const currentLabel = driverLabel(currentAssignedTo, memberById);
  const nextLabel = driverLabel(nextAssignedTo, memberById);

  if (!currentAssignedTo && nextAssignedTo) {
    return {
      title: "¿Asignar chofer a la ruta?",
      message: `${routeName} quedará asignada a ${nextLabel}. Todas las paradas de la ruta heredan ese chofer.`,
      confirmLabel: "Asignar chofer",
      tone: "warning" as const,
    };
  }

  if (currentAssignedTo && !nextAssignedTo) {
    return {
      title: "¿Quitar chofer de la ruta?",
      message: `Se quita ${currentLabel} de ${routeName}. Las paradas quedan sin chofer hasta que asignes otro.`,
      confirmLabel: "Quitar chofer",
      tone: "danger" as const,
    };
  }

  return {
    title: "¿Reemplazar chofer de la ruta?",
    message: `${routeName} pasará de ${currentLabel} a ${nextLabel}.`,
    confirmLabel: "Reemplazar chofer",
    tone: "warning" as const,
  };
}

export function resolveRouteConfirmCopy(
  input:
    | { kind: "cancel"; routeName: string; stopCount: number }
    | { kind: "remove-stop"; shipmentCode: string }
    | {
        kind: "driver";
        routeName: string;
        currentAssignedTo: string | null;
        nextAssignedTo: string | null;
      },
  memberById: ReadonlyMap<string, string>,
) {
  if (input.kind === "cancel") {
    return routeCancelCopy(input.routeName, input.stopCount);
  }

  if (input.kind === "remove-stop") {
    return routeStopRemoveCopy(input.shipmentCode);
  }

  return routeDriverChangeCopy(
    input.routeName,
    input.currentAssignedTo,
    input.nextAssignedTo,
    memberById,
  );
}

export function isClosedLogisticsStatus(status: string) {
  return CLOSED_LOGISTICS_STATUSES.has(status);
}

/** First loaded route that contains any of the shipment logistics tasks. */
export function findLogisticsRouteForShipmentTasks<TRouteInfo>(
  tasks: ReadonlyArray<{ id: string }>,
  routeByTaskId: ReadonlyMap<string, TRouteInfo>,
) {
  for (const task of tasks) {
    const info = routeByTaskId.get(task.id);
    if (info) {
      return info;
    }
  }
  return undefined;
}

function taskByType<TTask extends LogisticsInvoiceTaskInput>(
  tasks: TTask[],
  taskType: LogisticsTaskType,
) {
  return tasks.find((task) => task.taskType === taskType && task.status !== "cancelled") || null;
}

function logisticsEmptyBoxDelivered<TTask extends LogisticsInvoiceTaskInput>(
  shipment: LogisticsInvoiceStepShipment<TTask>,
) {
  const deliveryTask = taskByType(shipment.logisticsTasks, "deliver_empty_box");
  const emptyBox = planLeg(shipment.logistics_plan, "emptyBox");

  return Boolean(
    deliveryTask?.status === "completed" ||
      shipment.empty_box_delivered_at ||
      emptyBox?.handingNow === true,
  );
}

export function resolveLogisticsInvoiceStep<TTask extends LogisticsInvoiceTaskInput>(
  shipment: LogisticsInvoiceStepShipment<TTask>,
): LogisticsInvoiceStep<TTask> | null {
  const deliveryTask = taskByType(shipment.logisticsTasks, "deliver_empty_box");
  const pickupTask = taskByType(shipment.logisticsTasks, "pickup_full_box");
  const emptyBoxDone = logisticsEmptyBoxDelivered(shipment);

  if (deliveryTask && deliveryTask.status !== "completed") {
    return {
      stepType: "deliver_empty_box",
      currentTask: deliveryTask,
      nextTask: pickupTask,
      emptyBoxDone,
      pickupReady: false,
      canAssignDriver: !isClosedLogisticsStatus(deliveryTask.status),
      assignment: deliveryTask.assignedTo ? "assigned" : "unassigned",
    };
  }

  if (pickupTask && !isClosedLogisticsStatus(pickupTask.status)) {
    if (!emptyBoxDone) {
      return {
        stepType: "deliver_empty_box",
        currentTask: null,
        nextTask: pickupTask,
        emptyBoxDone,
        pickupReady: false,
        canAssignDriver: false,
        assignment: "unassigned",
      };
    }

    return {
      stepType: "pickup_full_box",
      currentTask: pickupTask,
      nextTask: null,
      emptyBoxDone,
      pickupReady: true,
      canAssignDriver: true,
      assignment: pickupTask.assignedTo ? "assigned" : "unassigned",
    };
  }

  return null;
}

export function activeLogisticsRouteTaskIds<TTask extends LogisticsInvoiceTaskInput>(
  shipments: Array<LogisticsInvoiceStepShipment<TTask>>,
) {
  const ids = new Set<string>();

  for (const shipment of shipments) {
    const step = resolveLogisticsInvoiceStep(shipment);
    if (step?.currentTask) {
      ids.add(step.currentTask.id);
    }
  }

  return ids;
}

export function splitLogisticsTasksByOpenState<T extends { status: string }>(tasks: T[]) {
  return {
    open: tasks.filter((task) => !isClosedLogisticsStatus(task.status)),
    closed: tasks.filter((task) => isClosedLogisticsStatus(task.status)),
  };
}

export function buildLogisticaShipmentDeepLink(shipmentCode: string) {
  const code = shipmentCode.trim();
  if (!code) {
    return "/logistica";
  }

  return `/logistica?q=${encodeURIComponent(code)}`;
}

export type LogisticsShipmentDeepLinkFocus = {
  query: string;
  routeId: string | null;
  highlightTaskId: string | null;
  clearDateFilter: boolean;
};

export function resolveLogisticsShipmentDeepLink<
  TTask extends { id: string; shipment: { code: string } },
  TRouteInfo extends { route: { id: string } },
>(
  shipmentCode: string,
  tasks: TTask[],
  routeByTaskId: ReadonlyMap<string, TRouteInfo>,
): LogisticsShipmentDeepLinkFocus {
  const query = shipmentCode.trim();
  const normalized = query.toLowerCase();

  if (!normalized) {
    return {
      query: "",
      routeId: null,
      highlightTaskId: null,
      clearDateFilter: false,
    };
  }

  const matching = tasks.filter((task) => task.shipment.code.toLowerCase() === normalized);
  const routed = matching.find((task) => routeByTaskId.has(task.id));
  const routeId = routed ? routeByTaskId.get(routed.id)?.route.id ?? null : null;

  return {
    query,
    routeId,
    highlightTaskId: matching[0]?.id ?? null,
    clearDateFilter: true,
  };
}

function compareShipmentInvoicePriority(
  left: Pick<ShipmentRow, "invoice_priority" | "created_at">,
  right: Pick<ShipmentRow, "invoice_priority" | "created_at">,
) {
  if (left.invoice_priority !== right.invoice_priority) {
    return left.invoice_priority ? -1 : 1;
  }

  return String(right.created_at || "").localeCompare(String(left.created_at || ""));
}

export function sortLogisticsInvoiceItemsByPriority<
  T extends { shipment: Pick<ShipmentRow, "invoice_priority" | "created_at"> },
>(items: T[]) {
  return [...items].sort((left, right) =>
    compareShipmentInvoicePriority(left.shipment, right.shipment),
  );
}

export function prioritizeMissingGeoTasks<T>(tasks: T[], missingGeo: (task: T) => boolean) {
  const missing: T[] = [];
  const ready: T[] = [];

  for (const task of tasks) {
    if (missingGeo(task)) {
      missing.push(task);
    } else {
      ready.push(task);
    }
  }

  return [...missing, ...ready];
}

export function prioritizeLogisticsTasks<T>(
  tasks: T[],
  options: {
    missingGeo: (task: T) => boolean;
    shipment: (task: T) => Pick<ShipmentRow, "invoice_priority" | "created_at">;
  },
) {
  const missing: T[] = [];
  const ready: T[] = [];

  for (const task of tasks) {
    if (options.missingGeo(task)) {
      missing.push(task);
    } else {
      ready.push(task);
    }
  }

  const sortByPriority = (bucket: T[]) =>
    [...bucket].sort((left, right) =>
      compareShipmentInvoicePriority(options.shipment(left), options.shipment(right)),
    );

  return [...sortByPriority(missing), ...sortByPriority(ready)];
}
