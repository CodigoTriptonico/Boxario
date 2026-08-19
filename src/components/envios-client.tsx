"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  type LogisticsRouteCatalog,
} from "@/app/actions/logistics-routes";
import {
  listRouteMembersAction,
  listSalesOwnersAction,
  listEnviosShipmentsPageAction,
} from "@/app/actions/shipments";
import type {
  RouteMemberRow,
  SalesOwnerRow,
  ShipmentRow,
} from "@/lib/shipment-types";
import { EnviosBulkSelectionBar } from "@/components/envios/envios-bulk-selection-bar";
import { EnviosClientDialogs } from "@/components/envios/envios-client-dialogs";
import { EnviosFiltersToolbar } from "@/components/envios/envios-filters-toolbar";
import { EnviosShipmentsPanel } from "@/components/envios/envios-shipments-panel";
import { EnviosWorkspaceTabs } from "@/components/envios/envios-workspace-tabs";
import { useEnviosBilling } from "@/components/envios/use-envios-billing";
import { useEnviosBulkOwners } from "@/components/envios/use-envios-bulk-owners";
import { useEnviosLogistics } from "@/components/envios/use-envios-logistics";
import type { EnviosShipmentMenuState } from "@/components/envios-shipment-context-menu";
import { PageLoading } from "@/components/page-loading";
import { SupabaseRequiredBanner } from "@/components/supabase-required-banner";
import {
  Panel,
  secondaryButtonClass,
} from "@/components/ui-blocks";
import { usePageViewLayout } from "@/components/ui/ui-surface-preferences-provider";
import { useNotify } from "@/hooks/use-notify";
import { useEnviosShipmentSelection } from "@/hooks/use-envios-shipment-selection";
import { countryNamesPickerOptions } from "@/components/country-picker-options";
import {
  canApplyEnviosBulkReadiness,
} from "@/lib/envios-bulk-readiness";
import {
  ENVIOS_STATUS_FILTER_OPTIONS,
  filterShipmentsForEnviosMode,
  sortShipmentsByArrivalOrder,
  type EnviosClientMode,
  type EnviosReadinessFilter,
} from "@/lib/shipment-display";
import { ENVIOS_SHIPMENTS_PAGE_SIZE } from "@/lib/envios-pagination";
import {
  applyEnviosFiltersToSearchParams,
  resolveEnviosFiltersOnLoad,
  writeEnviosFiltersToSession,
  type EnviosPersistedFilters,
} from "@/lib/envios-filter-persistence";
import { LOGISTICS_ROUTES_PAGE_SIZE } from "@/lib/logistics-routes-pagination";
import type { LogisticsRouteRow } from "@/lib/logistics-routing";
import { listLogisticsRoutesAction } from "@/app/actions/logistics-routes";
import { isSupabaseConfigured } from "@/lib/supabase/env";

type EnviosClientProps = {
  mode?: EnviosClientMode;
  unified?: boolean;
  initialShipments?: ShipmentRow[];
  initialRouteMembers?: RouteMemberRow[];
  initialSalesOwners?: SalesOwnerRow[];
  initialRoutes?: LogisticsRouteRow[];
  initialRouteCatalog?: LogisticsRouteCatalog | null;
  initialPendingRouteTaskIds?: string[];
  initialRoleSlug?: string;
  canManageSales?: boolean;
  canManageSalesSettings?: boolean;
  canViewShipmentJournal?: boolean;
  canUpdateShipmentStatus?: boolean;
  canManageShipmentOwners?: boolean;
  canAccessAuditoria?: boolean;
};

export function EnviosClient({
  mode = "tracking",
  unified = false,
  initialShipments,
  initialRouteMembers,
  initialSalesOwners,
  initialRoutes,
  initialRouteCatalog = null,
  initialPendingRouteTaskIds = [],
  initialRoleSlug = "administrador",
  canManageSales = false,
  canManageSalesSettings = false,
  canViewShipmentJournal = false,
  canUpdateShipmentStatus = false,
  canManageShipmentOwners = false,
  canAccessAuditoria = false,
}: EnviosClientProps) {
  const notify = useNotify();
  const router = useRouter();
  const searchParams = useSearchParams();
  const appliedOpenFromUrlRef = useRef<string | null>(null);
  const supabaseReady = isSupabaseConfigured();
  const hasServerBootstrap = initialShipments !== undefined && initialRoutes !== undefined;
  const [shipments, setShipments] = useState<ShipmentRow[]>(initialShipments || []);
  const [page, setPage] = useState(0);
  // El bootstrap del servidor se muestra mientras se valida en segundo plano.
  // Si llega vacío, mantener la carga evita pintar el estado vacío antes de
  // conocer el resultado fresco de la primera consulta.
  const [shipmentsLoading, setShipmentsLoading] = useState(supabaseReady);
  const [shipmentsError, setShipmentsError] = useState("");
  const [serverReadiness, setServerReadiness] = useState({ totalCount: initialShipments?.length || 0, listosCount: 0, pendientesCount: 0 });
  const [hasMore, setHasMore] = useState(
    Boolean(initialShipments && initialShipments.length === ENVIOS_SHIPMENTS_PAGE_SIZE),
  );
  const [routeMembers, setRouteMembers] = useState<RouteMemberRow[]>(initialRouteMembers || []);
  const [salesOwners, setSalesOwners] = useState<SalesOwnerRow[]>(initialSalesOwners || []);
  const [routes, setRoutes] = useState<LogisticsRouteRow[]>(initialRoutes || []);
  const [routeCatalog, setRouteCatalog] = useState<LogisticsRouteCatalog | null>(initialRouteCatalog);
  const [pendingRouteTaskIds, setPendingRouteTaskIds] = useState<string[]>(initialPendingRouteTaskIds);
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [salesOwnerFilter, setSalesOwnerFilter] = useState("");
  const [loaded, setLoaded] = useState(!supabaseReady || hasServerBootstrap);
  const { layout: viewLayout } = usePageViewLayout("shipments.tracking");
  const [readinessFilter, setReadinessFilter] = useState<EnviosReadinessFilter>("all");
  const [filtersHydrated, setFiltersHydrated] = useState(false);
  const [contactLogShipmentId, setContactLogShipmentId] = useState<string | null>(null);
  const [shipmentMenu, setShipmentMenu] = useState<EnviosShipmentMenuState>(null);
  const [expandedShipmentIds, setExpandedShipmentIds] = useState<Set<string>>(() => new Set());
  const isConductor = initialRoleSlug === "conductor";
  const requestedMode = searchParams.get("view");
  const activeMode = unified
    ? requestedMode === "history" || requestedMode === "tracking"
      ? requestedMode
      : mode
    : mode;
  const selectedAuditShipmentId = unified ? searchParams.get("audit") : null;
  const openShipmentIdFromUrl = unified ? searchParams.get("open")?.trim() || null : null;
  const isHistoryMode = activeMode === "history";
  const panelTitle = isHistoryMode ? "Historial de envíos" : "Seguimiento";
  const prevActiveModeRef = useRef(activeMode);
  const prevFilterKeyRef = useRef("");
  const billing = useEnviosBilling({ canManageSales, setShipments });

  useEffect(() => {
    const nextKey = [activeMode, query, country, statusFilter, salesOwnerFilter, readinessFilter].join("\0");
    if (prevActiveModeRef.current === activeMode && prevFilterKeyRef.current === nextKey) {
      return;
    }

    prevActiveModeRef.current = activeMode;
    prevFilterKeyRef.current = nextKey;
    setPage(0);
  }, [activeMode, country, query, readinessFilter, salesOwnerFilter, statusFilter]);
  async function reloadShipmentsPage(targetPage = page) {
    const result = await listEnviosShipmentsPageAction({
      limit: ENVIOS_SHIPMENTS_PAGE_SIZE,
      offset: targetPage * ENVIOS_SHIPMENTS_PAGE_SIZE,
      mode: activeMode,
      query,
      country,
      statusFilter,
      salesOwnerId: salesOwnerFilter,
      readinessFilter,
    });

    if (result.ok) {
      setShipments(result.data.items);
      setServerReadiness(result.data.readiness);
      setHasMore(result.data.hasMore);
      setShipmentsError("");
    } else {
      setShipmentsError(result.error);
    }

    return result;
  }

  const routeByTaskId = useMemo(() => {
    const map = new Map<
      string,
      {
        routeName: string;
        assignedTo: string | null;
        routeTemplateId: string | null;
      }
    >();

    for (const route of routes) {
      if (route.status === "cancelled") {
        continue;
      }

      for (const stop of route.stops) {
        map.set(stop.taskId, {
          routeName: route.name,
          assignedTo: route.assignedTo,
          routeTemplateId: route.routeTemplateId || null,
        });
      }
    }

    return (taskId: string) => map.get(taskId);
  }, [routes]);

  const logistics = useEnviosLogistics({
    canManageSales,
    canUpdateShipmentStatus,
    page,
    routeCatalog,
    setRouteCatalog,
    routes,
    setRoutes,
    setPendingRouteTaskIds,
    setShipments,
    reloadShipmentsPage,
    routeByTaskId,
  });

  useEffect(() => {
    if (!supabaseReady) {
      return;
    }

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setShipmentsLoading(true);
      }
    });

    void (async () => {
      const result = await listEnviosShipmentsPageAction({
        limit: ENVIOS_SHIPMENTS_PAGE_SIZE,
        offset: page * ENVIOS_SHIPMENTS_PAGE_SIZE,
        mode: activeMode,
        query,
        country,
        statusFilter,
        salesOwnerId: salesOwnerFilter,
        readinessFilter,
      });

      if (cancelled) {
        return;
      }

      if (result.ok) {
        setShipments(result.data.items);
        setServerReadiness(result.data.readiness);
        setHasMore(result.data.hasMore);
        setShipmentsError("");
      } else {
        setShipmentsError(result.error);
        notify.error(result.error);
      }

      setShipmentsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [activeMode, country, initialShipments?.length, notify, page, query, readinessFilter, salesOwnerFilter, statusFilter, supabaseReady]);

  useEffect(() => {
    if (!selectedAuditShipmentId) {
      return;
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        const params = new URLSearchParams(window.location.search);
        params.delete("audit");
        const nextQuery = params.toString();
        router.replace(nextQuery ? `/seguimiento?${nextQuery}` : "/seguimiento", { scroll: false });
      }
    }

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [router, selectedAuditShipmentId]);

  function syncSeguimientoFilterUrl(filters: EnviosPersistedFilters) {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    applyEnviosFiltersToSearchParams(params, filters);
    const nextQuery = params.toString();
    const nextUrl = nextQuery ? `/seguimiento?${nextQuery}` : "/seguimiento";
    const currentUrl = `${window.location.pathname}${window.location.search}`;
    if (currentUrl !== nextUrl) {
      window.history.replaceState(window.history.state, "", nextUrl);
    }
  }

  function updateWorkspaceUrl(next: { mode?: EnviosClientMode; audit?: string | null }) {
    const params = new URLSearchParams(
      typeof window !== "undefined" ? window.location.search : searchParams.toString(),
    );

    if (next.mode) {
      if (next.mode === "history") {
        params.set("view", "history");
      } else {
        params.delete("view");
      }
    }

    if (next.audit) {
      params.set("audit", next.audit);
    } else if (next.audit === null) {
      params.delete("audit");
    }

    applyEnviosFiltersToSearchParams(params, {
      query,
      country,
      statusFilter,
      salesOwnerFilter,
      readinessFilter,
    });

    const nextQuery = params.toString();
    router.replace(nextQuery ? `/seguimiento?${nextQuery}` : "/seguimiento", { scroll: false });
  }

  function selectWorkspaceMode(nextMode: EnviosClientMode) {
    updateWorkspaceUrl({ mode: nextMode, audit: null });
  }

  const modeShipments = shipments;

  useEffect(() => {
    let cancelled = false;
    const resolved = resolveEnviosFiltersOnLoad(
      new URLSearchParams(window.location.search),
    );

    queueMicrotask(() => {
      if (cancelled) {
        return;
      }
      setQuery(resolved.query);
      setCountry(resolved.country);
      setStatusFilter(resolved.statusFilter);
      setSalesOwnerFilter(resolved.salesOwnerFilter);
      setReadinessFilter(resolved.readinessFilter);
      writeEnviosFiltersToSession(resolved);
      syncSeguimientoFilterUrl(resolved);
      setFiltersHydrated(true);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!filtersHydrated) {
      return;
    }

    const filters: EnviosPersistedFilters = {
      query,
      country,
      statusFilter,
      salesOwnerFilter,
      readinessFilter,
    };
    writeEnviosFiltersToSession(filters);
    syncSeguimientoFilterUrl(filters);
  }, [country, filtersHydrated, query, readinessFilter, salesOwnerFilter, statusFilter]);

  useEffect(() => {
    if (!openShipmentIdFromUrl || !shipments.length) {
      return;
    }

    if (appliedOpenFromUrlRef.current === openShipmentIdFromUrl) {
      return;
    }

    const target = shipments.find((row) => row.id === openShipmentIdFromUrl);
    if (!target) {
      return;
    }

    appliedOpenFromUrlRef.current = openShipmentIdFromUrl;

    queueMicrotask(() => {
      setQuery((current) => current || target.code);
      setExpandedShipmentIds((current) => {
        const next = new Set(current);
        next.add(target.id);
        return next;
      });
    });
  }, [openShipmentIdFromUrl, shipments]);

  useEffect(() => {
    const shipmentId = appliedOpenFromUrlRef.current;
    if (!shipmentId || !expandedShipmentIds.has(shipmentId)) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      const row = document.querySelector(`[aria-controls="envios-detail-${shipmentId}"]`);
      row?.scrollIntoView({ block: "start", behavior: "smooth" });
    });

    return () => cancelAnimationFrame(frame);
  }, [expandedShipmentIds, openShipmentIdFromUrl]);

  useEffect(() => {
    if (!supabaseReady || (initialRouteMembers && initialSalesOwners && initialRoutes)) {
      return;
    }

    queueMicrotask(() => {
      void (async () => {
        const [membersResult, ownersResult, routesResult] = await Promise.all([
          initialRouteMembers
            ? Promise.resolve({ ok: true as const, data: initialRouteMembers })
            : listRouteMembersAction(),
          initialSalesOwners
            ? Promise.resolve({ ok: true as const, data: initialSalesOwners })
            : canManageShipmentOwners
              ? listSalesOwnersAction()
              : Promise.resolve({ ok: true as const, data: [] }),
          initialRoutes
            ? Promise.resolve({ ok: true as const, data: initialRoutes })
            : listLogisticsRoutesAction({
                statusMode: "active",
                limit: LOGISTICS_ROUTES_PAGE_SIZE,
                offset: 0,
              }),
        ]);

        if (membersResult.ok) {
          setRouteMembers(membersResult.data);
        } else {
          notify.error(membersResult.error);
        }

        if (ownersResult.ok) {
          setSalesOwners(ownersResult.data);
        } else {
          notify.error(ownersResult.error);
        }

        if (routesResult.ok) {
          setRoutes(routesResult.data);
        }

        setLoaded(true);
      })();
    });
  }, [
    canManageShipmentOwners,
    initialRouteMembers,
    initialRoutes,
    initialSalesOwners,
    notify,
    supabaseReady,
  ]);

  const countryFilterKey = useMemo(
    () =>
      [...new Set(modeShipments.map((row) => row.country).filter(Boolean))]
        .sort()
        .join("\0"),
    [modeShipments],
  );

  const countryFilterOptions = useMemo(
    () => countryNamesPickerOptions(countryFilterKey.split("\0").filter(Boolean)),
    [countryFilterKey],
  );

  const statusFilterOptions = useMemo(
    () =>
      ENVIOS_STATUS_FILTER_OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
        children: option.children?.map((child) => ({
          value: child.value,
          label: child.label,
        })),
      })),
    [],
  );
  const routeMemberLabelById = useMemo(() => {
    const labels = new Map<string, string>();
    for (const member of routeMembers) {
      labels.set(member.id, member.label);
    }
    return (memberId: string) => labels.get(memberId);
  }, [routeMembers]);

  const filteredShipments = modeShipments;

  const displayShipments = useMemo(
    () => sortShipmentsByArrivalOrder(filteredShipments),
    [filteredShipments],
  );

  const selectionEnabled = !isHistoryMode && canManageSales;
  const {
    selectedIds: selectedShipmentIds,
    selectedCount: selectedShipmentCount,
    handleRowSelectClick,
    selectAll: selectAllShipments,
    clearSelection: clearShipmentSelection,
    isSelected: isShipmentSelected,
  } = useEnviosShipmentSelection(displayShipments);

  useEffect(() => {
    clearShipmentSelection();
  }, [clearShipmentSelection, page]);

  const selectedShipments = useMemo(
    () => displayShipments.filter((row) => selectedShipmentIds.has(row.id)),
    [displayShipments, selectedShipmentIds],
  );

  const { bulkBusy, ownerBusyId, applyBulkReadiness, updateSalesOwner } = useEnviosBulkOwners({
    canManageShipmentOwners,
    selectionEnabled,
    selectedShipments,
    setShipments,
  });

  const bulkMarkableCount = useMemo(
    () => selectedShipments.filter((row) => canApplyEnviosBulkReadiness(row, "mark")).length,
    [selectedShipments],
  );

  const bulkUnmarkableCount = useMemo(
    () => selectedShipments.filter((row) => canApplyEnviosBulkReadiness(row, "unmark")).length,
    [selectedShipments],
  );

  const contactLogTarget = useMemo(
    () => shipments.find((row) => row.id === contactLogShipmentId) || null,
    [contactLogShipmentId, shipments],
  );

  const pendingRouteTaskIdSet = useMemo(
    () => new Set(pendingRouteTaskIds),
    [pendingRouteTaskIds],
  );

  const canEditProgress = !isHistoryMode && (canManageSales || canUpdateShipmentStatus);
  const showPaginationControls = page > 0 || hasMore;
  const isServerEmptyPage = page > 0 && !shipmentsLoading && shipments.length === 0;

  function openShipmentAudit(shipmentId: string) {
    updateWorkspaceUrl({ audit: shipmentId });
  }

  function closeShipmentAudit() {
    updateWorkspaceUrl({ audit: null });
  }

  function handleShipmentContextMenu(event: React.MouseEvent, row: ShipmentRow) {
    if (!canAccessAuditoria) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    setShipmentMenu({
      shipmentId: row.id,
      shipmentCode: row.code,
      x: event.clientX,
      y: event.clientY,
    });
  }

  function toggleShipmentExpanded(shipmentId: string) {
    setExpandedShipmentIds((current) => {
      const next = new Set(current);
      if (next.has(shipmentId)) {
        next.delete(shipmentId);
      } else {
        next.add(shipmentId);
      }
      return next;
    });
  }

  function handleShipmentRowActivate(
    event: React.MouseEvent,
    row: ShipmentRow,
    index: number,
  ) {
    if (selectionEnabled && handleRowSelectClick(event, index, row.id)) {
      return;
    }

    if (viewLayout === "rows") {
      toggleShipmentExpanded(row.id);
    }
  }

  function goToPreviousPage() {
    setPage((current) => Math.max(0, current - 1));
  }

  function goToNextPage() {
    if (hasMore && !shipmentsLoading) {
      setPage((current) => current + 1);
    }
  }

  if (!loaded) {
    return (
      <Panel
        title={panelTitle}
        hideHeader
        className="flex w-full min-h-0 flex-col lg:flex-1 lg:overflow-hidden"
        contentClassName="flex min-h-0 flex-1 flex-col p-3 sm:p-4"
      >
        <EnviosFiltersToolbar
          workspaceTabs={
            unified ? (
              <EnviosWorkspaceTabs
                activeMode={activeMode}
                trackingCount={0}
                historyCount={0}
                onModeChange={selectWorkspaceMode}
              />
            ) : null
          }
          mode={activeMode}
          readinessFilter={readinessFilter}
          onReadinessFilterChange={setReadinessFilter}
          totalCount={0}
          listosCount={0}
          pendientesCount={0}
          query={query}
          onQueryChange={setQuery}
          canManageShipmentOwners={canManageShipmentOwners}
          salesOwnerFilter={salesOwnerFilter}
          onSalesOwnerFilterChange={setSalesOwnerFilter}
          salesOwners={salesOwners}
          country={country}
          onCountryChange={setCountry}
          countryFilterOptions={[]}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          statusFilterOptions={[...ENVIOS_STATUS_FILTER_OPTIONS]}
          canManageSales={canManageSales}
          canManageSalesSettings={canManageSalesSettings}
          isConductor={isConductor}
        />
        <PageLoading inline seamless />
      </Panel>
    );
  }

  return (
    <Panel
      title={panelTitle}
      hideHeader
      className="flex w-full min-h-0 flex-col lg:flex-1 lg:overflow-hidden"
      contentClassName="flex min-h-0 flex-1 flex-col p-3 sm:p-4"
    >
      {!supabaseReady ? (
        <SupabaseRequiredBanner detail="Los envíos se listan desde Supabase. Sin credenciales no hay datos que mostrar." />
      ) : null}

      {isConductor ? (
        <p className="mb-4 rounded-lg border border-emerald-700/50 bg-emerald-950/30 px-3 py-2 text-sm font-bold text-emerald-200">
          Vista de conductor: envíos asignados a ti. Puedes actualizar el estado del envío.
        </p>
      ) : null}

      {supabaseReady ? (
        <>
          {shipmentsError ? <div role="alert" className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-rose-800/70 bg-rose-950/35 px-3 py-2 text-sm font-bold text-rose-100"><span>No se pudo actualizar los envíos: {shipmentsError}</span><button type="button" className={`${secondaryButtonClass} h-8 border-rose-700/70 px-2.5 text-xs text-rose-100`} onClick={() => void reloadShipmentsPage()}>Reintentar</button></div> : null}
          <EnviosFiltersToolbar
            workspaceTabs={
              unified ? (
                <EnviosWorkspaceTabs
                  activeMode={activeMode}
                  trackingCount={filterShipmentsForEnviosMode(shipments, "tracking").length}
                  historyCount={filterShipmentsForEnviosMode(shipments, "history").length}
                  onModeChange={selectWorkspaceMode}
                />
              ) : null
            }
            mode={activeMode}
            readinessFilter={readinessFilter}
            onReadinessFilterChange={setReadinessFilter}
            totalCount={serverReadiness.totalCount}
            listosCount={serverReadiness.listosCount}
            pendientesCount={serverReadiness.pendientesCount}
            query={query}
            onQueryChange={setQuery}
            canManageShipmentOwners={canManageShipmentOwners}
            salesOwnerFilter={salesOwnerFilter}
            onSalesOwnerFilterChange={setSalesOwnerFilter}
            salesOwners={salesOwners}
            country={country}
            onCountryChange={setCountry}
            countryFilterOptions={countryFilterOptions}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            statusFilterOptions={statusFilterOptions}
            canManageSales={canManageSales}
            canManageSalesSettings={canManageSalesSettings}
            isConductor={isConductor}
          />

          {selectionEnabled && selectedShipmentCount > 0 ? (
            <EnviosBulkSelectionBar
              selectedCount={selectedShipmentCount}
              visibleCount={displayShipments.length}
              markableCount={bulkMarkableCount}
              unmarkableCount={bulkUnmarkableCount}
              busy={bulkBusy}
              onSelectAll={selectAllShipments}
              onClearSelection={clearShipmentSelection}
              onMarkReady={() => void applyBulkReadiness("mark")}
              onUnmarkReady={() => void applyBulkReadiness("unmark")}
            />
          ) : null}

          <EnviosShipmentsPanel
            viewLayout={viewLayout}
            displayShipments={displayShipments}
            shipmentsLoading={shipmentsLoading}
            isServerEmptyPage={isServerEmptyPage}
            isHistoryMode={isHistoryMode}
            canManageSales={canManageSales}
            canViewShipmentJournal={canViewShipmentJournal}
            canManageShipmentOwners={canManageShipmentOwners}
            canEditProgress={canEditProgress}
            canUpdateShipmentStatus={canUpdateShipmentStatus}
            salesOwners={salesOwners}
            routeMemberLabelById={routeMemberLabelById}
            routeByTaskId={routeByTaskId}
            expandedShipmentIds={expandedShipmentIds}
            busyId={billing.busyId}
            progressBusyId={logistics.progressBusyId}
            priorityBusyId={billing.priorityBusyId}
            ownerBusyId={ownerBusyId}
            finalizeCopy={billing.finalizeCopy}
            onShipmentContextMenu={handleShipmentContextMenu}
            onContactLogOpen={setContactLogShipmentId}
            onTogglePriority={billing.toggleInvoicePriority}
            onUpdateSalesOwner={updateSalesOwner}
            onFinalizeOpen={billing.openFinalize}
            onLogisticsPatch={logistics.applyLogisticsPatch}
            onStatusChange={logistics.applyShipmentStatus}
            onFullBoxReceivedAtOffice={logistics.receiveFullBoxAtOffice}
            onRevertFullBoxOfficeReception={logistics.revertFullBoxOfficeReception}
            onProgramRoute={
              canManageSales && !isHistoryMode
                ? logistics.openProgramRoute
                : undefined
            }
            pendingRouteTaskIds={pendingRouteTaskIdSet}
            onLockedLeg={(message) => notify.error(message)}
            selectionEnabled={selectionEnabled}
            isShipmentSelected={isShipmentSelected}
            onShipmentRowActivate={handleShipmentRowActivate}
            showPaginationControls={showPaginationControls}
            page={page}
            hasMore={hasMore}
            onPreviousPage={goToPreviousPage}
            onNextPage={goToNextPage}
          />
        </>
      ) : null}

      <EnviosClientDialogs
        billing={billing}
        logistics={{
          ...logistics,
          routeCatalog,
          routeMembers,
        }}
        contactLogTarget={contactLogTarget}
        onContactLogClose={() => setContactLogShipmentId(null)}
        onNotifyError={(message) => notify.error(message)}
        shipmentMenu={shipmentMenu}
        onShipmentMenuClose={() => setShipmentMenu(null)}
        onOpenAudit={openShipmentAudit}
        unified={unified}
        selectedAuditShipmentId={selectedAuditShipmentId}
        canAccessAuditoria={canAccessAuditoria}
        onCloseAudit={closeShipmentAudit}
      />
    </Panel>
  );
}
