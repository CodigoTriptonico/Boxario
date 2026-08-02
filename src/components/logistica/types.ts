import type { LogisticsRouteCatalog as LogisticsRouteCatalogData } from "@/app/actions/logistics-routes";
import type {
  RouteMemberRow,
  ShipmentLogisticsTaskRow,
  ShipmentRow,
} from "@/lib/shipment-types";
import type { LogisticsTaskAddressRow } from "@/lib/logistics-routing";
import type { WarehouseRow } from "@/lib/auth/types";
import type {
  LogisticsRouteRow,
  LogisticsRouteStopRow,
} from "@/lib/logistics-routing";
import type { LogisticsInvoiceStep } from "@/lib/logistics-view";
import type { ShipmentQuote } from "@/lib/shipment-display";

export type LogisticsTaskItem = ShipmentLogisticsTaskRow & {
  shipment: ShipmentRow;
  quote: ShipmentQuote | null;
};

export type LogisticsInvoiceItem = {
  shipment: ShipmentRow;
  quote: ShipmentQuote | null;
  step: LogisticsInvoiceStep<LogisticsTaskItem>;
  currentTask: LogisticsTaskItem | null;
  nextTask: LogisticsTaskItem | null;
};

export type PendingDriverChange = {
  task: LogisticsTaskItem;
  nextAssignedTo: string | null;
  /** When set, the driver change applies to the whole draft route (and syncs its stops). */
  routeId?: string;
};

export type EditingTaskState = {
  task: LogisticsTaskItem;
};

export type ReprogrammingTaskState = {
  task: LogisticsTaskItem;
};

export type ConfirmingScheduleTaskState = {
  task: LogisticsTaskItem;
};

export type PendingRouteConfirm =
  | {
      kind: "cancel";
      route: LogisticsRouteRow;
    }
  | {
      kind: "remove-stop";
      route: LogisticsRouteRow;
      stop: LogisticsRouteStopRow;
      shipmentCode: string;
    }
  | {
      kind: "driver";
      route: LogisticsRouteRow;
      nextAssignedTo: string | null;
    };

export type PendingLiveRouteReason =
  | {
      kind: "assign-selection";
      route: LogisticsRouteRow;
      taskIds: string[];
      changeTypeLabel: string;
      summary: string;
    }
  | {
      kind: "remove-stop";
      route: LogisticsRouteRow;
      stop: LogisticsRouteStopRow;
      shipmentCode: string;
      changeTypeLabel: string;
      summary: string;
    }
  | {
      kind: "reorder";
      route: LogisticsRouteRow;
      stop: LogisticsRouteStopRow;
      orderedStopIds: string[];
      changeTypeLabel: string;
      summary: string;
    };

export type TaskAddressMeta = LogisticsTaskAddressRow & {
  routeId?: string;
  routeName?: string;
};

export type LogisticaClientProps = {
  initialShipments?: ShipmentRow[];
  initialRouteMembers?: RouteMemberRow[];
  initialWarehouses?: WarehouseRow[];
  initialRoutes?: LogisticsRouteRow[];
  initialTaskAddresses?: LogisticsTaskAddressRow[];
  initialRouteCatalog?: LogisticsRouteCatalogData;
  canManageRoutes?: boolean;
  canManageLogisticsSettings?: boolean;
  agencyModuleEnabled?: boolean;
};
