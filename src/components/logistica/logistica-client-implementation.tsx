"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSearchParams } from "next/navigation";
import { createOperationalRouteFromBookingsAction } from "@/app/actions/logistics-routes";
import { PageContentPlaceholder } from "@/components/page-loading";
import { SupabaseRequiredBanner } from "@/components/supabase-required-banner";
import { Panel, secondaryButtonClass } from "@/components/ui-blocks";
import { useNotify } from "@/hooks/use-notify";
import { usePageViewLayout } from "@/components/ui/ui-surface-preferences-provider";
import {
  findOpenRouteForBooking,
  findPendingBookingGroupForTask,
} from "@/lib/logistics-route-booking-groups";
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
import { LogisticsRoutesWorkspace } from "@/components/logistica/logistics-routes-workspace";

export function LogisticaClient({
  initialRoutesTab,
  initialShipments,
  initialRouteMembers,
  initialWarehouses,
  initialRoutes,
  initialPendingBookings,
  initialTaskAddresses,
  initialRouteCatalog,
  initialReadError = "",
  canManageRoutes = false,
  canManageLogisticsSettings = false,
  agencyModuleEnabled = false,
}: LogisticaClientProps) {
  const notify = useNotify();
  const { layout: viewLayout } = usePageViewLayout("logistics.tasks");
  const searchParams = useSearchParams();
  // La vista unificada es el punto de entrada de Logística. Se conserva el
  // parámetro histórico para enlaces existentes a configuración.
  const isRoutesView = true;
  const isWideLayout = useWideLogisticsLayout();
  const supabaseReady = isSupabaseConfigured();

  const {
    shipments,
    routeMembers,
    warehouses,
    routes,
    vehicles,
    pendingBookings,
    pendingBookingsLoaded,
    reviewedBookings,
    reviewedBookingsLoaded,
    taskAddresses,
    routeCatalog,
    loaded,
    page,
    hasMore,
    routesLoading,
    refreshing,
    loadError,
    appliedRoutesFiltersKey,
    reloadAll,
    reloadRoutes,
    applyRouteFilters,
    reloadRoutesAndAddresses,
    reloadRouteCatalog,
  } = useLogisticsData({
    initialShipments,
    initialRouteMembers,
    initialWarehouses,
    initialRoutes,
    initialPendingBookings,
    initialTaskAddresses,
    initialRouteCatalog,
    supabaseReady,
    notify,
    // La única superficie activa de /logistica es el workspace de rutas.
    // No hidratar el universo de envíos/tareas que pertenece al tablero legado.
    includeTaskBoardData: !isRoutesView,
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
    assignmentFilter,
    setAssignmentFilter,
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
    routeServerFiltersKey,
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
    pendingBookings,
    reviewedBookings,
    onRouteServerFiltersChange: applyRouteFilters,
  });

  const routesAlignedWithFilters =
    !routesLoading && appliedRoutesFiltersKey === routeServerFiltersKey;
  const taskBoardDataReady =
    routesAlignedWithFilters && pendingBookingsLoaded && reviewedBookingsLoaded;

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

  function openRouteAssignmentFromTask(taskId: string) {
    setSelectedTaskIds([taskId]);
    setRouteAssignmentOpen(true);
  }

  const bookingOperationKeys = useRef(new Map<string, string>());

  function resolveBookingActionForTask(taskId: string) {
    const group = findPendingBookingGroupForTask(pendingBookings, taskId);
    if (!group) {
      return null;
    }

    const openRoute = findOpenRouteForBooking(routes, group.first);
    return {
      label: openRoute ? ("Agregar a ruta abierta" as const) : ("Crear ruta" as const),
    };
  }

  async function createRouteFromTaskBooking(taskId: string) {
    if (!canManageRoutes || busyId) {
      return;
    }

    const group = findPendingBookingGroupForTask(pendingBookings, taskId);
    if (!group) {
      notify.error("Esta tarea no tiene una reserva pendiente");
      return;
    }

    const idempotencyKey =
      bookingOperationKeys.current.get(group.key) || crypto.randomUUID();
    bookingOperationKeys.current.set(group.key, idempotencyKey);
    setBusyId(`booking:${group.key}`);

    const result = await createOperationalRouteFromBookingsAction({
      bookingIds: group.items.map((item) => item.id),
      idempotencyKey,
    });

    setBusyId(null);

    if (!result.ok) {
      notify.error(result.error);
      return;
    }

    bookingOperationKeys.current.delete(group.key);
    setSelectedRouteId(result.data.id);
    await reloadAll();
    notify.success(`Ruta abierta: ${result.data.name}`);
  }

  const routeRequestStatusByTaskId = useMemo(
    () => new Map(reviewedBookings.map((booking) => [booking.taskId, booking.status])),
    [reviewedBookings],
  );

  const invoicePanelProps: Omit<LogisticsInvoicePanelProps, "item"> = {
    addressByTaskId,
    routeByTaskId,
    routeRequestStatusByTaskId,
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
    return <PageContentPlaceholder variant="logistics-routes" />;
  }

  return (
    <Panel
      title="Logistica"
      hideHeader
      clipContent={false}
      className="!border-0 flex min-h-0 w-full flex-col lg:flex-1 lg:overflow-hidden"
      contentClassName="flex min-h-0 w-full min-w-0 flex-1 flex-col p-2 sm:py-3 sm:pl-3 sm:pr-0"
    >
      {!supabaseReady ? (
        <SupabaseRequiredBanner detail="La logistica se lee desde shipments, shipment_logistics_tasks y logistics_routes en Supabase." />
      ) : null}

      {initialReadError || loadError ? (
        <div role="alert" className="mx-3 mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-800/70 bg-rose-950/35 px-3 py-2 text-sm font-bold text-rose-100 sm:mx-4">
          <span>No se pudo actualizar Logística: {initialReadError || loadError}</span>
          <button type="button" className={`${secondaryButtonClass} h-8 border-rose-700/70 px-2.5 text-xs text-rose-100`} onClick={() => void reloadAll()}>
            Reintentar
          </button>
        </div>
      ) : null}
      {refreshing ? <p className="mx-3 mt-2 text-xs font-bold text-slate-400 sm:mx-4">Actualizando datos sin ocultar la información actual…</p> : null}

      {supabaseReady ? (
        isRoutesView ? (
          <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col">
            <div className="flex min-h-0 flex-1">
              <LogisticsRoutesWorkspace
                key={`logistics-workspace-${searchParams.get("panel") || "operations"}-${searchParams.get("tab") || "confirmations"}`}
                initialRoutes={routes}
                initialBookings={pendingBookings}
                routeCatalog={routeCatalog}
                routeMembers={routeMembers}
                canManage={canManageRoutes}
                onCatalogChange={reloadRouteCatalog}
                initialTab={initialRoutesTab}
              />
            </div>
          </div>
        ) : (
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
            assignmentFilter={assignmentFilter}
            setAssignmentFilter={setAssignmentFilter}
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
            visibleInvoiceItems={taskBoardDataReady ? visibleInvoiceItems : []}
            viewLayout={viewLayout === "excel" ? "rows" : viewLayout}
            invoicePanelProps={invoicePanelProps}
            showRouteHistory={showRouteHistory}
            failedFilter={failedFilter}
            resolveBookingActionForTask={resolveBookingActionForTask}
            onAssignTaskFromContext={openRouteAssignmentFromTask}
            onCreateRouteFromBooking={(taskId) => void createRouteFromTaskBooking(taskId)}
            loading={!taskBoardDataReady}
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
        )
      ) : null}

      {routeDetailDrawer ? createPortal(routeDetailDrawer, document.body) : null}

      {!isRoutesView ? <LogisticsClientDialogs
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
      /> : null}
    </Panel>
  );
}
