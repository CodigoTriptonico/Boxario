"use client";

import Link from "next/link";
import { Package } from "lucide-react";
import type { SalesOwnerRow, ShipmentRow } from "@/lib/shipment-types";
import { EnviosShipmentCardsGrid } from "@/components/envios/envios-shipment-cards-grid";
import { EnviosShipmentRowsList } from "@/components/envios/envios-shipment-rows-list";
import { PageLoading } from "@/components/page-loading";
import {
  cardClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui-blocks";
import type { collectShipmentInvoiceCopy } from "@/lib/shipment-invoice-copy";
import type { ShipmentAuditContext } from "@/lib/shipment-audit";
import type { ShipmentLogisticsEditorState } from "@/lib/shipment-logistics-edit";
import type { ShipmentStatus } from "@/lib/shipment-types";
import type { ViewLayout } from "@/lib/view-layout";
import { EnviosShipmentExcelTable } from "@/components/envios/envios-shipment-excel-table";

type EnviosShipmentsPanelProps = {
  viewLayout: ViewLayout;
  displayShipments: ShipmentRow[];
  shipmentsLoading: boolean;
  isServerEmptyPage: boolean;
  isHistoryMode: boolean;
  canManageSales: boolean;
  canViewShipmentJournal: boolean;
  canManageShipmentOwners: boolean;
  canEditProgress: boolean;
  canUpdateShipmentStatus: boolean;
  salesOwners: SalesOwnerRow[];
  routeMemberLabelById: (memberId: string) => string | undefined;
  routeByTaskId: (taskId: string) => {
    routeName: string;
    assignedTo: string | null;
    routeTemplateId: string | null;
  } | undefined;
  expandedShipmentIds: Set<string>;
  busyId: string | null;
  progressBusyId: string | null;
  priorityBusyId: string | null;
  ownerBusyId: string | null;
  finalizeCopy: ReturnType<typeof collectShipmentInvoiceCopy>;
  onShipmentContextMenu: (event: React.MouseEvent, row: ShipmentRow) => void;
  onContactLogOpen: (shipmentId: string) => void;
  onTogglePriority: (row: ShipmentRow) => Promise<void>;
  onUpdateSalesOwner: (row: ShipmentRow, salesOwnerId: string) => Promise<void>;
  onFinalizeOpen: (row: ShipmentRow) => void;
  onLogisticsPatch: (
    row: ShipmentRow,
    patch: Partial<ShipmentLogisticsEditorState>,
    audit: ShipmentAuditContext,
  ) => Promise<void>;
  onStatusChange: (
    row: ShipmentRow,
    status: ShipmentStatus,
    audit: ShipmentAuditContext,
  ) => Promise<void>;
  onFullBoxReceivedAtOffice: (row: ShipmentRow, audit: ShipmentAuditContext) => Promise<void>;
  onRevertFullBoxOfficeReception: (row: ShipmentRow, audit: ShipmentAuditContext) => Promise<void>;
  onProgramRoute?: (row: ShipmentRow, kind: "empty_box" | "full_box") => void;
  pendingRouteTaskIds: Set<string>;
  onLockedLeg: (message: string) => void;
  selectionEnabled: boolean;
  isShipmentSelected: (shipmentId: string) => boolean;
  onShipmentRowActivate: (
    event: React.MouseEvent,
    row: ShipmentRow,
    index: number,
  ) => void;
  showPaginationControls: boolean;
  page: number;
  hasMore: boolean;
  onPreviousPage: () => void;
  onNextPage: () => void;
};

export function EnviosShipmentsPanel({
  viewLayout,
  displayShipments,
  shipmentsLoading,
  isServerEmptyPage,
  isHistoryMode,
  canManageSales,
  canViewShipmentJournal,
  canManageShipmentOwners,
  canEditProgress,
  canUpdateShipmentStatus,
  salesOwners,
  routeMemberLabelById,
  routeByTaskId,
  expandedShipmentIds,
  busyId,
  progressBusyId,
  priorityBusyId,
  ownerBusyId,
  finalizeCopy,
  onShipmentContextMenu,
  onContactLogOpen,
  onTogglePriority,
  onUpdateSalesOwner,
  onFinalizeOpen,
  onLogisticsPatch,
  onStatusChange,
  onFullBoxReceivedAtOffice,
  onRevertFullBoxOfficeReception,
  onProgramRoute,
  pendingRouteTaskIds,
  onLockedLeg,
  selectionEnabled,
  isShipmentSelected,
  onShipmentRowActivate,
  showPaginationControls,
  page,
  hasMore,
  onPreviousPage,
  onNextPage,
}: EnviosShipmentsPanelProps) {
  const emptyState = isServerEmptyPage ? (
    <div className="flex h-full min-h-[14rem] flex-col items-center justify-center px-4 py-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300 ring-1 ring-inset ring-emerald-400/20">
        <Package className="h-7 w-7" aria-hidden />
      </span>
      <p className="mt-4 text-lg font-black text-[#f8fafc]">Sin más envíos</p>
      <p className="mt-1 text-sm font-bold text-slate-400">
        No hay resultados en esta página.
      </p>
      <button
        type="button"
        className={`${secondaryButtonClass} mt-5 inline-flex h-10 items-center px-4 text-sm`}
        onClick={onPreviousPage}
      >
        Volver a la página anterior
      </button>
    </div>
  ) : (
    <div className="flex h-full min-h-[14rem] flex-col items-center justify-center px-4 py-10 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300 ring-1 ring-inset ring-emerald-400/20">
        <Package className="h-7 w-7" aria-hidden />
      </span>
      <p className="mt-4 text-lg font-black text-[#f8fafc]">
        {isHistoryMode ? "Sin envíos entregados" : "Sin envíos"}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-400">
        {isHistoryMode
          ? "No hay entregas que coincidan con estos filtros."
          : "No hay envíos que coincidan con estos filtros."}
      </p>
      {canManageSales && !isHistoryMode ? (
        <Link
          href="/venta"
          className={`${primaryButtonClass} mt-5 inline-flex h-10 items-center px-4`}
        >
          Crear venta
        </Link>
      ) : null}
    </div>
  );

  const listSharedProps = {
    displayShipments,
    canManageSales,
    canViewShipmentJournal,
    canManageShipmentOwners,
    canEditProgress,
    canUpdateShipmentStatus,
    isHistoryMode,
    salesOwners,
    routeMemberLabelById,
    routeByTaskId,
    busyId,
    progressBusyId,
    priorityBusyId,
    finalizeCopy,
    onShipmentContextMenu,
    onContactLogOpen,
    onTogglePriority,
    onFinalizeOpen,
    onLogisticsPatch,
    onStatusChange,
    onFullBoxReceivedAtOffice,
    onRevertFullBoxOfficeReception,
    onProgramRoute,
    pendingRouteTaskIds,
    onLockedLeg,
    selectionEnabled,
    isShipmentSelected,
    onShipmentRowActivate,
  };

  return (
    <>
      <div className="relative min-h-0 flex-1">
        <div className="h-full min-h-0 overflow-y-auto pr-1">
          {shipmentsLoading && !displayShipments.length && !isServerEmptyPage ? (
            <PageLoading inline seamless />
          ) : displayShipments.length ? (
            viewLayout === "rows" ? (
              <EnviosShipmentRowsList
                {...listSharedProps}
                cardClass={cardClass}
                expandedShipmentIds={expandedShipmentIds}
              />
            ) : viewLayout === "excel" ? (
              <EnviosShipmentExcelTable
                {...listSharedProps}
                ownerBusyId={ownerBusyId}
                onUpdateSalesOwner={onUpdateSalesOwner}
              />
            ) : (
              <EnviosShipmentCardsGrid
                {...listSharedProps}
                ownerBusyId={ownerBusyId}
                onUpdateSalesOwner={onUpdateSalesOwner}
              />
            )
          ) : (
            emptyState
          )}
        </div>
        {shipmentsLoading && displayShipments.length > 0 ? (
          <div className="pointer-events-none absolute inset-0 rounded-lg bg-[#121816]/45" aria-hidden />
        ) : null}
      </div>

      {showPaginationControls ? (
        <div className="mt-3 flex shrink-0 items-center justify-between gap-2 border-t border-black pt-3">
          <button
            type="button"
            className={`${secondaryButtonClass} h-9 px-3 text-xs font-black disabled:opacity-40`}
            disabled={page === 0 || shipmentsLoading}
            onClick={onPreviousPage}
          >
            Anterior
          </button>
          <p className="text-xs font-bold text-slate-400">
            {shipmentsLoading
              ? "Cargando…"
              : `Página ${page + 1}${hasMore ? "" : " · última"}`}
          </p>
          <button
            type="button"
            className={`${secondaryButtonClass} h-9 px-3 text-xs font-black disabled:opacity-40`}
            disabled={!hasMore || shipmentsLoading}
            onClick={onNextPage}
          >
            Siguiente
          </button>
        </div>
      ) : null}
    </>
  );
}
