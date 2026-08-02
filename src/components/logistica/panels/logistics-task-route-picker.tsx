"use client";

import { InlineSearchPicker } from "@/components/inline-search-picker";
import type { LogisticsRouteCatalog as LogisticsRouteCatalogData } from "@/app/actions/logistics-routes";
import type { LogisticsRouteRow, LogisticsRouteStopRow } from "@/lib/logistics-routing";
import type { LogisticsTaskItem, TaskAddressMeta } from "@/components/logistica/types";
import { LOGISTICS_CARD_PICKER_SHELL } from "@/components/logistica/lib/constants";
import {
  canChangeTaskRoute,
  routePickerOptionsForTask,
  routePickerValueForTask,
} from "@/components/logistica/lib/task-route-picker";

export function LogisticsTaskRoutePicker({
  task,
  routeInfo,
  shipmentCode,
  className = "w-[10rem] shrink-0",
  addressByTaskId,
  assignableRoutes,
  routeCatalog,
  filterAnchorDate,
  memberById,
  busyId,
  canManageRoutes,
  onTaskRouteChange,
}: {
  task: LogisticsTaskItem;
  routeInfo?: { route: LogisticsRouteRow; stop: LogisticsRouteStopRow };
  shipmentCode: string;
  className?: string;
  addressByTaskId: Map<string, TaskAddressMeta>;
  assignableRoutes: LogisticsRouteRow[];
  routeCatalog: LogisticsRouteCatalogData | undefined;
  filterAnchorDate: string;
  memberById: Map<string, string>;
  busyId: string | null;
  canManageRoutes: boolean;
  onTaskRouteChange: (
    task: LogisticsTaskItem,
    nextSelection: string | null,
    routeInfo?: { route: LogisticsRouteRow; stop: LogisticsRouteStopRow },
  ) => void;
}) {
  const hasGeo = Boolean(addressByTaskId.get(task.id)?.hasGeo);

  return (
    <InlineSearchPicker
      className={className}
      minWidthClass="w-full min-w-0"
      shellClassName={LOGISTICS_CARD_PICKER_SHELL}
      value={routePickerValueForTask(routeInfo)}
      onChange={(nextValue) => onTaskRouteChange(task, nextValue || null, routeInfo)}
      options={routePickerOptionsForTask({
        task,
        assignableRoutes,
        routeCatalog,
        filterAnchorDate,
        memberById,
      })}
      placeholder="Sin ruta"
      searchPlaceholder="Buscar ruta…"
      emptyLabel="Sin rutas para ese día"
      ariaLabel={`Ruta de ${shipmentCode}`}
      disabled={!canChangeTaskRoute({ task, routeInfo, hasGeo, canManageRoutes, busyId })}
      formatSelectedLabel={(option) => option?.label || "Sin ruta"}
    />
  );
}
