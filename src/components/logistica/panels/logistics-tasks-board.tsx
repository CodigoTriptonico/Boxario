"use client";

import { useEffect, useRef, useState } from "react";
import { ClipboardList, PackagePlus, Route } from "lucide-react";
import { AgencyLogisticsPanel } from "@/components/logistica/agency-logistics-panel";
import { PageLoading } from "@/components/page-loading";
import {
  panelListStackClass,
  panelListScrollClass,
} from "@/components/ui-blocks";
import { LOGISTICS_INVOICE_CARD_GRID_CLASS } from "@/components/logistica/lib/constants";
import {
  LogisticsInvoiceCard,
  type LogisticsInvoicePanelProps,
} from "@/components/logistica/panels/logistics-invoice-card";
import { LogisticsInvoiceRow } from "@/components/logistica/panels/logistics-invoice-row";
import type { LogisticsInvoiceItem, LogisticsTaskItem } from "@/components/logistica/types";

type LogisticsTaskBookingAction = {
  label: "Crear ruta" | "Agregar a ruta abierta";
};

type LogisticsTaskContextMenu = {
  taskId: string;
  shipmentCode: string;
  canAssign: boolean;
  bookingAction: LogisticsTaskBookingAction | null;
  disabledReason: string | null;
  x: number;
  y: number;
} | null;

export function LogisticsTasksBoard({
  agencyModuleEnabled,
  operationScope,
  visibleInvoiceItems,
  viewLayout,
  invoicePanelProps,
  showRouteHistory,
  failedFilter,
  resolveBookingActionForTask,
  onAssignTaskFromContext,
  onCreateRouteFromBooking,
  loading = false,
}: {
  agencyModuleEnabled: boolean;
  operationScope: "domicilios" | "agencias";
  visibleInvoiceItems: LogisticsInvoiceItem[];
  viewLayout: "cards" | "rows";
  invoicePanelProps: Omit<LogisticsInvoicePanelProps, "item">;
  showRouteHistory: boolean;
  failedFilter: boolean;
  resolveBookingActionForTask: (taskId: string) => LogisticsTaskBookingAction | null;
  onAssignTaskFromContext: (taskId: string) => void;
  onCreateRouteFromBooking: (taskId: string) => void;
  loading?: boolean;
}) {
  const [expandedInvoiceIds, setExpandedInvoiceIds] = useState<Set<string>>(() => new Set());
  const [contextMenu, setContextMenu] = useState<LogisticsTaskContextMenu>(null);
  const bookingBusyRef = useRef(false);

  useEffect(() => {
    if (!contextMenu) {
      return;
    }

    function closeOnPointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Node)) {
        return;
      }

      if (document.getElementById("logistics-task-context-menu")?.contains(target)) {
        return;
      }

      setContextMenu(null);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setContextMenu(null);
      }
    }

    window.addEventListener("pointerdown", closeOnPointerDown);
    window.addEventListener("keydown", closeOnEscape);

    return () => {
      window.removeEventListener("pointerdown", closeOnPointerDown);
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [contextMenu]);

  function openTaskContextMenu(
    event: { clientX: number; clientY: number; preventDefault: () => void },
    task: LogisticsTaskItem,
    canAssign: boolean,
    disabledReason: string,
  ) {
    event.preventDefault();
    const menuWidth = 248;
    const bookingAction =
      invoicePanelProps.canManageRoutes ? resolveBookingActionForTask(task.id) : null;
    const canUseAssignment = canAssign && invoicePanelProps.canManageRoutes;
    const menuHeight = bookingAction && canUseAssignment ? 168 : 126;
    setContextMenu({
      taskId: task.id,
      shipmentCode: task.shipment.code,
      canAssign: canUseAssignment,
      bookingAction,
      disabledReason: !invoicePanelProps.canManageRoutes
        ? "No tienes permiso para asignar rutas."
        : canAssign || bookingAction
          ? null
          : disabledReason,
      x: Math.max(8, Math.min(event.clientX, window.innerWidth - menuWidth - 8)),
      y: Math.max(8, Math.min(event.clientY, window.innerHeight - menuHeight - 8)),
    });
  }

  const taskPanelProps = {
    ...invoicePanelProps,
    onOpenTaskContextMenu: openTaskContextMenu,
  };

  function toggleInvoiceExpanded(invoiceId: string) {
    setExpandedInvoiceIds((current) => {
      const next = new Set(current);
      if (next.has(invoiceId)) {
        next.delete(invoiceId);
      } else {
        next.add(invoiceId);
      }
      return next;
    });
  }

  return (
    <div className={`${panelListScrollClass} pt-2 lg:pt-3`}>
      {agencyModuleEnabled && operationScope === "agencias" ? (
        <AgencyLogisticsPanel />
      ) : (
        <div className="grid gap-3">
          {loading ? (
            <PageLoading inline />
          ) : visibleInvoiceItems.length ? (
            viewLayout === "rows" ? (
              <div className={panelListStackClass}>
                {visibleInvoiceItems.map((item) => {
                  const invoiceId = item.currentTask?.id || item.shipment.id;
                  return (
                    <LogisticsInvoiceRow
                      key={invoiceId}
                      item={item}
                      {...taskPanelProps}
                      expanded={expandedInvoiceIds.has(invoiceId)}
                      onToggleExpanded={() => toggleInvoiceExpanded(invoiceId)}
                    />
                  );
                })}
              </div>
            ) : (
              <div className={LOGISTICS_INVOICE_CARD_GRID_CLASS}>
                {visibleInvoiceItems.map((item) => (
                  <LogisticsInvoiceCard
                    key={item.currentTask?.id || item.shipment.id}
                    item={item}
                    {...taskPanelProps}
                  />
                ))}
              </div>
            )
          ) : (
            <div className="flex min-h-[12rem] flex-col items-center justify-center px-4 text-center">
              <ClipboardList className="h-7 w-7 text-slate-600" />
              <p className="mt-2 text-sm font-black text-slate-300">
                {showRouteHistory
                  ? "Sin invoices en historial"
                  : failedFilter
                    ? "Sin tareas fallidas"
                    : "Sin invoices"}
              </p>
            </div>
          )}
        </div>
      )}

      {contextMenu ? (
        <div
          id="logistics-task-context-menu"
          className="fixed z-[160] w-60 overflow-hidden rounded-xl border border-black bg-surface-panel p-2 shadow-2xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onPointerDown={(event) => event.stopPropagation()}
          onContextMenu={(event) => event.preventDefault()}
          onClick={(event) => event.stopPropagation()}
        >
          <div className="border-b border-black px-3 py-2">
            <p className="text-[10px] font-black uppercase text-slate-500">Acciones de tarea</p>
            <p className="truncate text-sm font-black text-[#f8fafc]">{contextMenu.shipmentCode}</p>
          </div>
          {contextMenu.bookingAction || contextMenu.canAssign ? (
            <div className="mt-1 grid gap-0.5">
              {contextMenu.bookingAction ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left hover:border-black hover:bg-surface-card"
                  onClick={() => {
                    if (bookingBusyRef.current) {
                      return;
                    }
                    bookingBusyRef.current = true;
                    onCreateRouteFromBooking(contextMenu.taskId);
                    setContextMenu(null);
                    queueMicrotask(() => {
                      bookingBusyRef.current = false;
                    });
                  }}
                >
                  <PackagePlus className="h-5 w-5 text-amber-300" />
                  <span className="text-sm font-black text-[#f8fafc]">
                    {contextMenu.bookingAction.label}
                  </span>
                </button>
              ) : null}
              {contextMenu.canAssign ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-left hover:border-black hover:bg-surface-card"
                  onClick={() => {
                    onAssignTaskFromContext(contextMenu.taskId);
                    setContextMenu(null);
                  }}
                >
                  <Route className="h-5 w-5 text-emerald-300" />
                  <span className="text-sm font-black text-[#f8fafc]">Asignar a ruta</span>
                </button>
              ) : null}
            </div>
          ) : (
            <p className="px-3 py-2.5 text-xs font-bold leading-snug text-slate-400">
              {contextMenu.disabledReason}
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
