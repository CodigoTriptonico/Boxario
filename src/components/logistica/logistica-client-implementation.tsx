"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { PageLoading } from "@/components/page-loading";
import { SupabaseRequiredBanner } from "@/components/supabase-required-banner";
import { Panel, secondaryButtonClass } from "@/components/ui-blocks";
import { useNotify } from "@/hooks/use-notify";
import { usePageViewLayout } from "@/components/ui/ui-surface-preferences-provider";
import { buildDriverPickerOptions, resolveRouteConfirmCopy } from "@/lib/logistics-view";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { LogisticsTaskItem, LogisticaClientProps } from "@/components/logistica/types";
import type {
  ConfirmingScheduleTaskState,
  EditingTaskState,
  PendingDriverChange,
  PendingLiveRouteReason,
  PendingRouteConfirm,
  ReprogrammingTaskState,
} from "@/components/logistica/types";
import { useWideLogisticsLayout } from "@/components/logistica/lib/use-wide-logistics-layout";
import { useLogisticsTaskData } from "@/components/logistica/lib/use-logistics-task-data";
import { useLogisticsData } from "@/components/logistica/lib/use-logistics-data";
import { useLogisticsFilters } from "@/components/logistica/lib/use-logistics-filters";
import { useLogisticsRouteActions } from "@/components/logistica/lib/use-logistics-route-actions";
import { useLogisticsTaskActions } from "@/components/logistica/lib/use-logistics-task-actions";
import {
  type LogisticsInvoicePanelProps,
} from "@/components/logistica/panels/logistics-invoice-card";
import {
  LogisticsRouteDetailDrawer,
  LogisticsRouteDetailPanel,
} from "@/components/logistica/panels/logistics-route-detail-panel";
import { LogisticsClientDialogs } from "@/components/logistica/panels/logistics-client-dialogs";
import { LogisticsToolbar } from "@/components/logistica/panels/logistics-toolbar";
import { LogisticsTasksBoard } from "@/components/logistica/panels/logistics-tasks-board";
import { LogisticsRoutesView } from "@/components/logistica/panels/logistics-routes-view";

export function LogisticaClient({
  initialShipments,
  initialRouteMembers,
  initialWarehouses,
  initialRoutes,
  initialTaskAddresses,
  initialRouteCatalog,
  canManageRoutes = false,
  canManageLogisticsSettings = false,
  agencyModuleEnabled = false,
}: LogisticaClientProps) {
  const notify = useNotify();
  const { layout: viewLayout } = usePageViewLayout("logistics.tasks");
  const searchParams = useSearchParams();
  const isRoutesView = searchParams.get("view") === "rutas";
  const isWideLayout = useWideLogisticsLayout();
  const supabaseReady = isSupabaseConfigured();

  const {
    shipments,
    routeMembers,
    warehouses,
    routes,
    vehicles,
    taskAddresses,
    routeCatalog,
    loaded,
    page,
    hasMore,
    routesLoading,
    reloadAll,
    reloadRouteCatalog,
    reloadRoutes,
    applyRouteFilters,
    reloadRoutesAndAddresses,
  } = useLogisticsData({
    initialShipments,
    initialRouteMembers,
    initialWarehouses,
    initialRoutes,
    initialTaskAddresses,
    initialRouteCatalog,
    supabaseReady,
    notify,
  });

  const {
    routeByTaskId,
    addressByTaskId,
    allTasks,
    calendarDayTones,
    weekdayTones,
    taskById,
    invoiceItems,
    invoiceStepByTaskId,
    zoneOptions,
  } = useLogisticsTaskData({ shipments, routes, taskAddresses });

  const {
    query,
    setQuery,
    weekdayFilter,
    setWeekdayFilter,
    routeTemplateFilter,
    setRouteTemplateFilter,
    dateFilter,
    setDateFilter,
    typeFilter,
    setTypeFilter,
    driverFilter,
    setDriverFilter,
    zoneFilter,
    setZoneFilter,
    failedFilter,
    setFailedFilter,
    filtersOpen,
    setFiltersOpen,
    operationScope,
    setOperationScope,
    showRouteHistory,
    setShowRouteHistory,
    selectedRouteId,
    setSelectedRouteId,
    highlightTaskId,
    selectedTaskIds,
    setSelectedTaskIds,
    routeAssignmentOpen,
    setRouteAssignmentOpen,
    memberById,
    filterDriverPickerOptions,
    weekdayFilterOptions,
    filterRoutePickerOptions,
    filterAnchorDate,
    toolbarRoute,
    selectWeekdayFilter,
    taskSearchOptions,
    visibleInvoiceItems,
    selectedRoute,
    hasFilters,
    selectedTasks,
    assignableRoutes,
    failedTasks,
    taskCanBeSelectedForRoute,
    toggleTaskSelection,
    availableFilterWeekdays,
    defaultWeekdayFilter,
  } = useLogisticsFilters({
    routes,
    routeCatalog,
    routeMembers,
    loaded,
    searchParams,
    allTasks,
    routeByTaskId,
    addressByTaskId,
    invoiceItems,
    onRouteServerFiltersChange: applyRouteFilters,
  });

  const [routeDetailDrawerOpen, setRouteDetailDrawerOpen] = useState(false);
  const [journalShipmentId, setJournalShipmentId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDriverChange, setPendingDriverChange] = useState<PendingDriverChange | null>(null);
  const [editingTask, setEditingTask] = useState<EditingTaskState | null>(null);
  const [reprogrammingTask, setReprogrammingTask] = useState<ReprogrammingTaskState | null>(null);
  const [confirmingScheduleTask, setConfirmingScheduleTask] = useState<ConfirmingScheduleTaskState | null>(null);
  const [pendingRouteConfirm, setPendingRouteConfirm] = useState<PendingRouteConfirm | null>(null);
  const [pendingLiveRouteReason, setPendingLiveRouteReason] =
    useState<PendingLiveRouteReason | null>(null);
  const [liveRouteReasonError, setLiveRouteReasonError] = useState<string | null>(null);
  const [liveRouteReasonBusy, setLiveRouteReasonBusy] = useState(false);
  const [adminExceptionTask, setAdminExceptionTask] = useState<LogisticsTaskItem | null>(null);
  const journalShipment = useMemo(
    () => shipments.find((shipment) => shipment.id === journalShipmentId) || null,
    [journalShipmentId, shipments],
  );

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (isWideLayout) {
        setRouteDetailDrawerOpen(false);
        return;
      }

      if (selectedRouteId) {
        setRouteDetailDrawerOpen(true);
      }
    });

    return () => window.cancelAnimationFrame(frame);
  }, [isWideLayout, selectedRouteId]);

  const taskDriverPickerOptions = useMemo(
    () => buildDriverPickerOptions(routeMembers, "Sin asignar"),
    [routeMembers],
  );

  const routeDriverPickerOptions = useMemo(
    () => buildDriverPickerOptions(routeMembers, "Sin chofer"),
    [routeMembers],
  );

  const routeVehiclePickerOptions = useMemo(
    () =>
      vehicles
        .filter((vehicle) => vehicle.isActive)
        .map((vehicle) => ({
          value: vehicle.id,
          label: vehicle.plate ? `${vehicle.name} · ${vehicle.plate}` : vehicle.name,
          searchText: `${vehicle.name} ${vehicle.plate}`,
        })),
    [vehicles],
  );

  const pendingRouteDialogCopy = useMemo(() => {
    if (!pendingRouteConfirm) {
      return null;
    }

    if (pendingRouteConfirm.kind === "cancel") {
      return resolveRouteConfirmCopy(
        {
          kind: "cancel",
          routeName: pendingRouteConfirm.route.name,
          stopCount: pendingRouteConfirm.route.stops.length,
        },
        memberById,
      );
    }

    if (pendingRouteConfirm.kind === "remove-stop") {
      return resolveRouteConfirmCopy(
        {
          kind: "remove-stop",
          shipmentCode: pendingRouteConfirm.shipmentCode,
        },
        memberById,
      );
    }

    return resolveRouteConfirmCopy(
      {
        kind: "driver",
        routeName: pendingRouteConfirm.route.name,
        currentAssignedTo: pendingRouteConfirm.route.assignedTo,
        nextAssignedTo: pendingRouteConfirm.nextAssignedTo,
      },
      memberById,
    );
  }, [memberById, pendingRouteConfirm]);

  const {
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
  } = useLogisticsRouteActions({
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
  });

  const {
    saveTaskEdit,
    confirmTaskSchedule,
    requestDriverChange,
    confirmDriverChange,
    cancelDriverChange,
    canChangeTaskDriver,
  } = useLogisticsTaskActions({
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
  });

  function closeRouteDetailDrawer() {
    setRouteDetailDrawerOpen(false);
  }

  const invoicePanelProps: Omit<LogisticsInvoicePanelProps, "item"> = {
    addressByTaskId,
    routeByTaskId,
    highlightTaskId,
    selectedTaskIds,
    memberById,
    taskDriverPickerOptions,
    busyId,
    canManageRoutes,
    canManageLogisticsSettings,
    taskCanBeSelectedForRoute,
    onToggleTaskSelection: toggleTaskSelection,
    onRequestDriverChange: requestDriverChange,
    onReprogramTask: (task) => setReprogrammingTask({ task }),
    onConfirmSchedule: (task) => setConfirmingScheduleTask({ task }),
    onEditTask: (task) => setEditingTask({ task }),
    onOpenJournal: setJournalShipmentId,
    canChangeTaskDriver,
    assignableRoutes,
    routeCatalog,
    filterAnchorDate,
    onTaskRouteChange: requestTaskRouteChange,
  };

  const routeDetailPanelProps = {
    selectedRoute,
    taskById,
    highlightTaskId,
    memberById,
    routeMembers,
    routeDriverPickerOptions,
    routeVehiclePickerOptions,
    busyId,
    onRouteDriverChange: requestRouteDriverChange,
    onPublishRoute: publishRoute,
    onRequestCancelRoute: requestCancelRoute,
    onAssignRouteVehicle: assignRouteVehicle,
    onMoveStop: moveStop,
    onRequestRemoveStop: requestRemoveStop,
    onRequestDriverChange: requestDriverChange,
    onEditTask: (task: LogisticsTaskItem) => setEditingTask({ task }),
    canChangeTaskDriver,
  };

  const routeDetailDrawer =
    typeof document !== "undefined" && routeDetailDrawerOpen && selectedRoute && !isWideLayout ? (
      <LogisticsRouteDetailDrawer
        open
        selectedRoute={selectedRoute}
        onClose={closeRouteDetailDrawer}
      >
        <LogisticsRouteDetailPanel
          {...routeDetailPanelProps}
          scrollClass="h-full max-h-none"
          showTitle={false}
        />
      </LogisticsRouteDetailDrawer>
    ) : null;

  if (!loaded) {
    return <PageLoading inline />;
  }

  if (isRoutesView) {
    return (
      <LogisticsRoutesView
        supabaseReady={supabaseReady}
        routeCatalog={routeCatalog}
        canManageRoutes={canManageRoutes}
        routeMembers={routeMembers}
        onCatalogChange={() => void reloadRouteCatalog()}
      />
    );
  }

  return (
    <Panel
      title="Logistica"
      hideHeader
      clipContent={false}
      className="flex min-h-0 w-full flex-col lg:flex-1 lg:overflow-hidden"
      contentClassName="flex min-h-0 w-full min-w-0 flex-1 flex-col p-3 sm:p-4"
    >
      {!supabaseReady ? (
        <SupabaseRequiredBanner detail="La logistica se lee desde shipments, shipment_logistics_tasks y logistics_routes en Supabase." />
      ) : null}

      {supabaseReady ? (
        <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
          <LogisticsToolbar
            agencyModuleEnabled={agencyModuleEnabled}
            operationScope={operationScope}
            setOperationScope={setOperationScope}
            showRouteHistory={showRouteHistory}
            setShowRouteHistory={setShowRouteHistory}
            query={query}
            setQuery={setQuery}
            taskSearchOptions={taskSearchOptions}
            invoiceItems={invoiceItems}
            weekdayFilter={weekdayFilter}
            weekdayFilterOptions={weekdayFilterOptions}
            weekdayTones={weekdayTones}
            selectWeekdayFilter={selectWeekdayFilter}
            routeTemplateFilter={routeTemplateFilter}
            setRouteTemplateFilter={setRouteTemplateFilter}
            filterRoutePickerOptions={filterRoutePickerOptions}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            filterAnchorDate={filterAnchorDate}
            calendarDayTones={calendarDayTones}
            availableFilterWeekdays={availableFilterWeekdays}
            defaultWeekdayFilter={defaultWeekdayFilter}
            typeFilter={typeFilter}
            setTypeFilter={setTypeFilter}
            toolbarRoute={toolbarRoute}
            canManageRoutes={canManageRoutes}
            requestToolbarRouteDriverChange={requestToolbarRouteDriverChange}
            routeDriverPickerOptions={routeDriverPickerOptions}
            busyId={busyId}
            selectedTasksCount={selectedTasks.length}
            setRouteAssignmentOpen={setRouteAssignmentOpen}
            filtersOpen={filtersOpen}
            setFiltersOpen={setFiltersOpen}
            hasFilters={hasFilters}
            driverFilter={driverFilter}
            setDriverFilter={setDriverFilter}
            filterDriverPickerOptions={filterDriverPickerOptions}
            zoneFilter={zoneFilter}
            setZoneFilter={setZoneFilter}
            zoneOptions={zoneOptions}
            failedFilter={failedFilter}
            setFailedFilter={setFailedFilter}
            failedTasksCount={failedTasks.length}
          />

          <LogisticsTasksBoard
            agencyModuleEnabled={agencyModuleEnabled}
            operationScope={operationScope}
            canManageRoutes={canManageRoutes}
            routeCatalog={routeCatalog}
            routeMembers={routeMembers}
            visibleInvoiceItems={visibleInvoiceItems}
            viewLayout={viewLayout}
            invoicePanelProps={invoicePanelProps}
            showRouteHistory={showRouteHistory}
            failedFilter={failedFilter}
          />

          {page > 0 || hasMore ? (
            <div className="mt-3 flex shrink-0 items-center justify-between gap-2 border-t border-black pt-3">
              <button
                type="button"
                className={`${secondaryButtonClass} h-9 px-3 text-xs font-black disabled:opacity-40`}
                disabled={page === 0 || routesLoading}
                onClick={() => void reloadRoutes(undefined, Math.max(0, page - 1))}
              >
                Anterior
              </button>
              <p className="text-xs font-bold text-slate-400">
                {routesLoading
                  ? "Cargando…"
                  : `Página ${page + 1}${hasMore ? "" : " · última"}`}
              </p>
              <button
                type="button"
                className={`${secondaryButtonClass} h-9 px-3 text-xs font-black disabled:opacity-40`}
                disabled={!hasMore || routesLoading}
                onClick={() => {
                  if (hasMore && !routesLoading) {
                    void reloadRoutes(undefined, page + 1);
                  }
                }}
              >
                Siguiente
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {routeDetailDrawer ? createPortal(routeDetailDrawer, document.body) : null}

      <LogisticsClientDialogs
        busyId={busyId}
        canManageRoutes={canManageRoutes}
        routeMembers={routeMembers}
        warehouses={warehouses}
        routeCatalog={routeCatalog}
        memberById={memberById}
        routeByTaskId={routeByTaskId}
        journalShipment={journalShipment}
        reprogrammingTask={reprogrammingTask}
        editingTask={editingTask}
        adminExceptionTask={adminExceptionTask}
        confirmingScheduleTask={confirmingScheduleTask}
        pendingDriverChange={pendingDriverChange}
        pendingRouteConfirm={pendingRouteConfirm}
        pendingRouteDialogCopy={pendingRouteDialogCopy}
        pendingLiveRouteReason={pendingLiveRouteReason}
        liveRouteReasonError={liveRouteReasonError}
        liveRouteReasonBusy={liveRouteReasonBusy}
        routeAssignmentOpen={routeAssignmentOpen}
        selectedTasks={selectedTasks}
        assignableRoutes={assignableRoutes}
        onCloseJournal={() => setJournalShipmentId(null)}
        onJournalError={(message) => notify.error(message)}
        onCloseReprogram={() => setReprogrammingTask(null)}
        onReprogramSaved={async () => {
          setReprogrammingTask(null);
          await reloadAll();
          notify.success("Tarea reprogramada");
        }}
        onCloseEdit={() => setEditingTask(null)}
        onSaveEdit={saveTaskEdit}
        onRequestAdminException={(task) => {
          setAdminExceptionTask(task);
          setEditingTask(null);
        }}
        onCloseAdminException={() => setAdminExceptionTask(null)}
        onAdminExceptionCompleted={async () => {
          setAdminExceptionTask(null);
          await reloadAll();
        }}
        onCloseConfirmSchedule={() => setConfirmingScheduleTask(null)}
        onConfirmSchedule={confirmTaskSchedule}
        onCancelDriverChange={cancelDriverChange}
        onConfirmDriverChange={() => void confirmDriverChange()}
        onCancelPendingRouteAction={cancelPendingRouteAction}
        onConfirmPendingRouteAction={() => void confirmPendingRouteAction()}
        onCancelLiveRouteReason={() => {
          if (liveRouteReasonBusy) {
            return;
          }
          setPendingLiveRouteReason(null);
          setLiveRouteReasonError(null);
        }}
        onConfirmLiveRouteReason={(reason) => void confirmLiveRouteReason(reason)}
        onCloseRouteAssignment={() => setRouteAssignmentOpen(false)}
        onAssignSelectedTasksToRoute={assignSelectedTasksToRoute}
      />
    </Panel>
  );
}
