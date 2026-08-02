import { useMemo } from "react";
import type { LogisticsTaskAddressRow } from "@/lib/logistics-routing";
import type { LogisticsRouteRow, LogisticsRouteStopRow } from "@/lib/logistics-routing";
import type { ShipmentRow } from "@/lib/shipment-types";
import { buildLogisticsCalendarDayTones, buildLogisticsWeekdayTones } from "@/lib/logistics-calendar-day-tones";
import { resolveLogisticsInvoiceStep, type LogisticsInvoiceStep } from "@/lib/logistics-view";
import { quoteFromShipment } from "@/lib/shipment-display";
import type { LogisticsInvoiceItem, LogisticsTaskItem, TaskAddressMeta } from "@/components/logistica/types";
import { taskSortValue } from "@/components/logistica/lib/task-ui";

export function useLogisticsTaskData({
  shipments,
  routes,
  taskAddresses,
}: {
  shipments: ShipmentRow[];
  routes: LogisticsRouteRow[];
  taskAddresses: LogisticsTaskAddressRow[];
}) {
  const routeByTaskId = useMemo(() => {
    const map = new Map<string, { route: LogisticsRouteRow; stop: LogisticsRouteStopRow }>();

    routes.forEach((route) => {
      if (route.status === "cancelled") {
        return;
      }

      route.stops.forEach((stop) => {
        map.set(stop.taskId, { route, stop });
      });
    });

    return map;
  }, [routes]);

  const addressByTaskId = useMemo(() => {
    const map = new Map<string, TaskAddressMeta>();

    taskAddresses.forEach((address) => {
      const routeInfo = routeByTaskId.get(address.taskId);
      map.set(address.taskId, {
        ...address,
        routeId: routeInfo?.route.id,
        routeName: routeInfo?.route.name,
      });
    });

    return map;
  }, [routeByTaskId, taskAddresses]);

  const allTasks = useMemo<LogisticsTaskItem[]>(() => {
    return shipments
      .flatMap((shipment) => {
        const quote = quoteFromShipment(shipment);
        return shipment.logisticsTasks.map((task) => ({
          ...task,
          shipment,
          quote,
        }));
      })
      .sort((a, b) => taskSortValue(a) - taskSortValue(b));
  }, [shipments]);

  const calendarDayTones = useMemo(
    () =>
      buildLogisticsCalendarDayTones(
        allTasks.map((task) => ({
          scheduledAt: task.scheduledAt || task.requestedScheduleAt || null,
          status: task.status,
          assignedTo: task.assignedTo,
        })),
      ),
    [allTasks],
  );

  const weekdayTones = useMemo(
    () =>
      buildLogisticsWeekdayTones(
        allTasks.map((task) => ({
          scheduledAt: task.scheduledAt || task.requestedScheduleAt || null,
          status: task.status,
          assignedTo: task.assignedTo,
        })),
      ),
    [allTasks],
  );

  const taskById = useMemo(() => {
    return new Map(allTasks.map((task) => [task.id, task]));
  }, [allTasks]);

  const invoiceItems = useMemo<LogisticsInvoiceItem[]>(() => {
    return shipments
      .map((shipment) => {
        const quote = quoteFromShipment(shipment);
        const tasks = shipment.logisticsTasks.map((task) => ({
          ...task,
          shipment,
          quote,
        }));
        const step = resolveLogisticsInvoiceStep({
          empty_box_delivered_at: shipment.empty_box_delivered_at,
          logistics_plan: shipment.logistics_plan,
          logisticsTasks: tasks,
        });

        if (!step) {
          return null;
        }

        return {
          shipment,
          quote,
          step,
          currentTask: step.currentTask,
          nextTask: step.nextTask,
        };
      })
      .filter((item): item is LogisticsInvoiceItem => Boolean(item));
  }, [shipments]);

  const invoiceStepByTaskId = useMemo(() => {
    const map = new Map<string, LogisticsInvoiceStep<LogisticsTaskItem>>();

    invoiceItems.forEach((item) => {
      if (item.currentTask) {
        map.set(item.currentTask.id, item.step);
      }
      if (item.nextTask) {
        map.set(item.nextTask.id, item.step);
      }
    });

    return map;
  }, [invoiceItems]);

  const zoneOptions = useMemo(() => {
    const zones = new Map<string, string>();
    taskAddresses.forEach((address) => zones.set(address.zoneKey, address.zoneLabel));
    return Array.from(zones.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [taskAddresses]);

  return {
    routeByTaskId,
    addressByTaskId,
    allTasks,
    calendarDayTones,
    weekdayTones,
    taskById,
    invoiceItems,
    invoiceStepByTaskId,
    zoneOptions,
  };
}
