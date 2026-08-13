"use client";

import { useEffect, useMemo, useState } from "react";
import { listLogisticsRouteCatalogAction, listLogisticsRoutesAction } from "@/app/actions/logistics-routes";
import { listPendingCustomerRouteAssignmentTaskIdsAction, requestCustomerRouteAssignmentAction } from "@/app/actions/customer-route-assignments";
import {
  markFullBoxReceivedAtOfficeAction,
  revertFullBoxOfficeReceptionAction,
  updateShipmentLogisticsPlanAction,
  updateShipmentStatusAction,
} from "@/app/actions/shipments";
import type { LogisticsRouteCatalog } from "@/app/actions/logistics-routes";
import type { ShipmentRow, ShipmentStatus } from "@/lib/shipment-types";
import { useNotify } from "@/hooks/use-notify";
import type { ShipmentAuditContext } from "@/lib/shipment-audit";
import type { LogisticsRouteRow } from "@/lib/logistics-routing";
import { LOGISTICS_ROUTES_PAGE_SIZE } from "@/lib/logistics-routes-pagination";
import {
  editorStateToUpdateInput,
  shipmentLogisticsEditorState,
  type ShipmentLogisticsEditorState,
} from "@/lib/shipment-logistics-edit";
import {
  EMPTY_BOX_DRIVER_MODE,
  FULL_BOX_DRIVER_MODE,
} from "@/components/sale/venta-parts";
import { logisticsLegRouteActionCopy } from "@/lib/shipment-leg-labels";
import { isoToPlanScheduleAt } from "@/lib/shipment-schedule-history";
import type { RouteProgramTarget } from "@/components/envios/types";

type UseEnviosLogisticsOptions = {
  canManageSales: boolean;
  canUpdateShipmentStatus: boolean;
  page: number;
  routeCatalog: LogisticsRouteCatalog | null;
  setRouteCatalog: React.Dispatch<React.SetStateAction<LogisticsRouteCatalog | null>>;
  routes: LogisticsRouteRow[];
  setRoutes: React.Dispatch<React.SetStateAction<LogisticsRouteRow[]>>;
  setPendingRouteTaskIds: React.Dispatch<React.SetStateAction<string[]>>;
  setShipments: React.Dispatch<React.SetStateAction<ShipmentRow[]>>;
  reloadShipmentsPage: (targetPage?: number) => Promise<{ ok: boolean }>;
  routeByTaskId: (taskId: string) => {
    routeName: string;
    assignedTo: string | null;
    routeTemplateId: string | null;
  } | undefined;
};

export function useEnviosLogistics({
  canManageSales,
  canUpdateShipmentStatus,
  page,
  routeCatalog,
  setRouteCatalog,
  setRoutes,
  setPendingRouteTaskIds,
  setShipments,
  reloadShipmentsPage,
  routeByTaskId,
}: UseEnviosLogisticsOptions) {
  const notify = useNotify();
  const [routeProgramTarget, setRouteProgramTarget] = useState<RouteProgramTarget | null>(null);
  const [routeProgramSaving, setRouteProgramSaving] = useState(false);
  const [progressBusyId, setProgressBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (!routeProgramTarget || routeCatalog || !canManageSales) {
      return;
    }

    void (async () => {
      const result = await listLogisticsRouteCatalogAction();
      if (result.ok) {
        setRouteCatalog(result.data);
      } else {
        notify.error(result.error);
        setRouteProgramTarget(null);
      }
    })();
  }, [canManageSales, notify, routeCatalog, routeProgramTarget, setRouteCatalog]);

  const routeProgramContext = useMemo(() => {
    if (!routeProgramTarget) {
      return null;
    }

    const { row, kind } = routeProgramTarget;
    const isEmpty = kind === "empty_box";
    const taskType = isEmpty ? "deliver_empty_box" : "pickup_full_box";
    const task = row.logisticsTasks.find(
      (candidate) => candidate.taskType === taskType && candidate.status !== "cancelled",
    );
    const assignedRoute = task ? routeByTaskId(task.id) : undefined;
    const editorState = shipmentLogisticsEditorState(row);
    const scheduledAt = isEmpty
      ? editorState.emptyBoxScheduleAt
      : editorState.fullBoxScheduleAt;
    const hasExistingProgramming = Boolean(assignedRoute?.routeName || scheduledAt);
    const routeConfirmed = Boolean(assignedRoute?.routeName);

    return {
      assignedRoute,
      scheduledAt,
      hasExistingProgramming,
      actionCopy: logisticsLegRouteActionCopy(kind, hasExistingProgramming, routeConfirmed),
    };
  }, [routeByTaskId, routeProgramTarget]);

  function openProgramRoute(row: ShipmentRow, kind: "empty_box" | "full_box") {
    setRouteProgramTarget({ row, kind });
  }

  function closeProgramRoute() {
    if (!routeProgramSaving) {
      setRouteProgramTarget(null);
    }
  }

  async function applyLogisticsPatch(
    row: ShipmentRow,
    patch: Partial<ShipmentLogisticsEditorState>,
    audit: ShipmentAuditContext,
  ) {
    if (!canManageSales) {
      return;
    }

    setProgressBusyId(row.id);

    try {
      const nextState = {
        ...shipmentLogisticsEditorState(row),
        ...patch,
      };
      const result = await updateShipmentLogisticsPlanAction({
        shipmentId: row.id,
        ...editorStateToUpdateInput(nextState),
        audit,
      });

      if (!result.ok) {
        notify.error(result.error);
        return;
      }

      setShipments((current) =>
        current.map((entry) => (entry.id === row.id ? result.data : entry)),
      );
      notify.success("Logística actualizada");
    } finally {
      setProgressBusyId(null);
    }
  }

  async function applyShipmentStatus(
    row: ShipmentRow,
    status: ShipmentStatus,
    audit: ShipmentAuditContext,
  ) {
    if (!canUpdateShipmentStatus) {
      return;
    }

    setProgressBusyId(row.id);

    try {
      const result = await updateShipmentStatusAction(row.id, status, audit);

      if (!result.ok) {
        notify.error(result.error);
        return;
      }

      setShipments((current) =>
        current.map((entry) => (entry.id === row.id ? result.data : entry)),
      );
      notify.success("Estado actualizado");
    } finally {
      setProgressBusyId(null);
    }
  }

  async function receiveFullBoxAtOffice(row: ShipmentRow, audit: ShipmentAuditContext) {
    if (!canManageSales) {
      return;
    }

    setProgressBusyId(row.id);

    try {
      const result = await markFullBoxReceivedAtOfficeAction({ shipmentId: row.id, audit });

      if (!result.ok) {
        notify.error(result.error);
        return;
      }

      setShipments((current) =>
        current.map((entry) => (entry.id === row.id ? result.data : entry)),
      );
      notify.success("Caja llena recibida en oficina");
    } finally {
      setProgressBusyId(null);
    }
  }

  async function revertFullBoxOfficeReception(row: ShipmentRow, audit: ShipmentAuditContext) {
    if (!canManageSales) {
      return;
    }

    setProgressBusyId(row.id);

    try {
      const result = await revertFullBoxOfficeReceptionAction({ shipmentId: row.id, audit });

      if (!result.ok) {
        notify.error(result.error);
        return;
      }

      setShipments((current) =>
        current.map((entry) => (entry.id === row.id ? result.data : entry)),
      );
      notify.success("Recepción en oficina revertida");
    } finally {
      setProgressBusyId(null);
    }
  }

  async function confirmProgramRoute(input: {
    scheduledAt: string;
    driverId: string;
    routeTemplateId: string;
  }) {
    if (!routeProgramTarget || !canManageSales) {
      return;
    }

    const { row, kind } = routeProgramTarget;
    const isEmpty = kind === "empty_box";
    const taskType = isEmpty ? "deliver_empty_box" : "pickup_full_box";
    const planScheduleAt = isoToPlanScheduleAt(input.scheduledAt);

    setRouteProgramSaving(true);
    setProgressBusyId(row.id);

    try {
      const nextState: ShipmentLogisticsEditorState = {
        ...shipmentLogisticsEditorState(row),
        ...(isEmpty
          ? {
              emptyBoxMode: EMPTY_BOX_DRIVER_MODE,
              emptyBoxDriverTaskOrdered: true,
              emptyBoxScheduleMode: "scheduled",
              emptyBoxScheduleAt: planScheduleAt,
              emptyBoxHandingNow: false,
            }
          : {
              fullBoxMode: FULL_BOX_DRIVER_MODE,
              fullBoxDriverTaskOrdered: true,
              fullBoxScheduleMode: "scheduled",
              fullBoxScheduleAt: planScheduleAt,
            }),
      };

      const planResult = await updateShipmentLogisticsPlanAction({
        shipmentId: row.id,
        ...editorStateToUpdateInput(nextState),
        audit: {
          interaction: "context_menu",
          source: "envios.program_route",
          stepTitle: isEmpty ? "Dejar" : "Recoger",
          stepKind: kind,
        },
      });

      if (!planResult.ok) {
        notify.error(planResult.error);
        return;
      }

      const task = planResult.data.logisticsTasks.find(
        (entry) =>
          entry.taskType === taskType &&
          entry.status !== "completed" &&
          entry.status !== "cancelled",
      );

      if (!task) {
        notify.error("No se pudo crear la tarea de logística");
        setShipments((current) =>
          current.map((entry) => (entry.id === row.id ? planResult.data : entry)),
        );
        return;
      }

      const assignResult = await requestCustomerRouteAssignmentAction({
        shipmentId: row.id,
        taskId: task.id,
        routeTemplateId: input.routeTemplateId,
        scheduledAt: input.scheduledAt,
        driverId: input.driverId,
      });

      if (!assignResult.ok) {
        notify.error(assignResult.error);
        setShipments((current) =>
          current.map((entry) => (entry.id === row.id ? planResult.data : entry)),
        );
        return;
      }

      const [shipmentsResult, routesResult, pendingResult] = await Promise.all([
        reloadShipmentsPage(page),
        listLogisticsRoutesAction({
          statusMode: "active",
          limit: LOGISTICS_ROUTES_PAGE_SIZE,
          offset: 0,
        }),
        listPendingCustomerRouteAssignmentTaskIdsAction(),
      ]);

      if (!shipmentsResult.ok) {
        setShipments((current) =>
          current.map((entry) => (entry.id === row.id ? planResult.data : entry)),
        );
      }

      if (routesResult.ok) {
        setRoutes(routesResult.data);
      }

      if (pendingResult.ok) {
        setPendingRouteTaskIds(pendingResult.data);
      }

      notify.success("Enviado a logística para aprobar la ruta");
      setRouteProgramTarget(null);
    } finally {
      setRouteProgramSaving(false);
      setProgressBusyId(null);
    }
  }

  async function confirmPendingRoute() {
    if (!routeProgramTarget || !canManageSales) {
      return;
    }

    const { row, kind } = routeProgramTarget;
    const isEmpty = kind === "empty_box";

    setRouteProgramSaving(true);
    setProgressBusyId(row.id);

    try {
      const nextState: ShipmentLogisticsEditorState = {
        ...shipmentLogisticsEditorState(row),
        ...(isEmpty
          ? {
              emptyBoxMode: EMPTY_BOX_DRIVER_MODE,
              emptyBoxDriverTaskOrdered: true,
              emptyBoxScheduleMode: "pending",
              emptyBoxScheduleAt: "",
              emptyBoxHandingNow: false,
            }
          : {
              fullBoxMode: FULL_BOX_DRIVER_MODE,
              fullBoxDriverTaskOrdered: true,
              fullBoxScheduleMode: "pending",
              fullBoxScheduleAt: "",
            }),
      };

      const planResult = await updateShipmentLogisticsPlanAction({
        shipmentId: row.id,
        ...editorStateToUpdateInput(nextState),
        audit: {
          interaction: "context_menu",
          source: "envios.program_route_pending",
          stepTitle: isEmpty ? "Dejar" : "Recoger",
          stepKind: kind,
        },
      });

      if (!planResult.ok) {
        notify.error(planResult.error);
        return;
      }

      setShipments((current) =>
        current.map((entry) => (entry.id === row.id ? planResult.data : entry)),
      );
      notify.success("Listo · pendiente de ruta");
      setRouteProgramTarget(null);
    } finally {
      setRouteProgramSaving(false);
      setProgressBusyId(null);
    }
  }

  return {
    routeProgramTarget,
    routeProgramSaving,
    progressBusyId,
    routeProgramContext,
    openProgramRoute,
    closeProgramRoute,
    applyLogisticsPatch,
    applyShipmentStatus,
    receiveFullBoxAtOffice,
    revertFullBoxOfficeReception,
    confirmProgramRoute,
    confirmPendingRoute,
  };
}
