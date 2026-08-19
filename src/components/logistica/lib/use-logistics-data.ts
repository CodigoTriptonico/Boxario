"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LogisticsRouteCatalog as LogisticsRouteCatalogData } from "@/app/actions/logistics-routes";
import {
  listLogisticsRouteCatalogAction,
  listLogisticsRoutesAction,
  listLogisticsTaskAddressesAction,
} from "@/app/actions/logistics-routes";
import {
  listPendingCustomerRouteAssignmentRequestsAction,
  listReviewedCustomerRouteAssignmentRequestsAction,
} from "@/app/actions/customer-route-assignments";
import type { CustomerRouteAssignmentRequestRow } from "@/app/actions/customer-route-assignments/types";
import { listAllShipmentsForRouteBoardAction, listRouteMembersAction } from "@/app/actions/shipments";
import { listWarehousesAction } from "@/app/actions/warehouses";
import { listLogisticsVehiclesAction } from "@/app/actions/logistics-fleet";
import type { RouteMemberRow, ShipmentRow } from "@/lib/shipment-types";
import type { LogisticsRouteRow, LogisticsTaskAddressRow } from "@/lib/logistics-routing";
import type { WarehouseRow } from "@/lib/auth/types";
import type { LogisticsVehicleRow } from "@/lib/logistics-fleet";
import { LOGISTICS_LIVE_REFRESH_MS, shouldRunLogisticsLiveRefresh } from "@/lib/logistics-live-refresh";
import {
  LOGISTICS_ROUTES_PAGE_SIZE,
  defaultLogisticsRoutesListFilters,
  logisticsRoutesListFiltersKey,
  type ListLogisticsRoutesOptions,
} from "@/lib/logistics-routes-pagination";

type LogisticsNotify = {
  error: (message: string) => void;
};

export function useLogisticsData({
  initialShipments,
  initialRouteMembers,
  initialWarehouses,
  initialRoutes,
  initialPendingBookings,
  initialTaskAddresses,
  initialRouteCatalog,
  supabaseReady,
  notify,
  includeTaskBoardData = true,
}: {
  initialShipments?: ShipmentRow[];
  initialRouteMembers?: RouteMemberRow[];
  initialWarehouses?: WarehouseRow[];
  initialRoutes?: LogisticsRouteRow[];
  initialPendingBookings?: CustomerRouteAssignmentRequestRow[];
  initialTaskAddresses?: LogisticsTaskAddressRow[];
  initialRouteCatalog?: LogisticsRouteCatalogData;
  supabaseReady: boolean;
  notify: LogisticsNotify;
  /** The route workspace must not hydrate the shipment task universe it does not render. */
  includeTaskBoardData?: boolean;
}) {
  const [shipments, setShipments] = useState<ShipmentRow[]>(initialShipments || []);
  const [routeMembers, setRouteMembers] = useState<RouteMemberRow[]>(initialRouteMembers || []);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>(initialWarehouses || []);
  const [routes, setRoutes] = useState<LogisticsRouteRow[]>(initialRoutes || []);
  const [vehicles, setVehicles] = useState<LogisticsVehicleRow[]>([]);
  const [pendingBookings, setPendingBookings] = useState<CustomerRouteAssignmentRequestRow[]>(
    initialPendingBookings || [],
  );
  const [pendingBookingsLoaded, setPendingBookingsLoaded] = useState(
    !supabaseReady || initialPendingBookings !== undefined,
  );
  const [reviewedBookings, setReviewedBookings] = useState<CustomerRouteAssignmentRequestRow[]>([]);
  const [reviewedBookingsLoaded, setReviewedBookingsLoaded] = useState(!supabaseReady);
  const [taskAddresses, setTaskAddresses] = useState<LogisticsTaskAddressRow[]>(
    initialTaskAddresses || [],
  );
  const [routeCatalog, setRouteCatalog] = useState<LogisticsRouteCatalogData | undefined>(
    initialRouteCatalog,
  );
  const [loaded, setLoaded] = useState(
    !supabaseReady ||
      Boolean(
        initialShipments &&
          initialRouteMembers &&
          initialWarehouses &&
          initialRoutes &&
          initialTaskAddresses,
      ),
  );
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(
    Boolean(initialRoutes && initialRoutes.length === LOGISTICS_ROUTES_PAGE_SIZE),
  );
  const [routesLoading, setRoutesLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState("");
  const bootstrapRouteFilters = defaultLogisticsRoutesListFilters();
  const initialAppliedRoutesFiltersKey = initialRoutes
    ? logisticsRoutesListFiltersKey(bootstrapRouteFilters)
    : "";
  const routeFiltersRef = useRef<ListLogisticsRoutesOptions>(bootstrapRouteFilters);
  const skipInitialRouteFiltersRef = useRef(Boolean(initialRoutes));
  const appliedRoutesFiltersKeyRef = useRef(initialAppliedRoutesFiltersKey);
  const [appliedRoutesFiltersKey, setAppliedRoutesFiltersKey] = useState(
    initialAppliedRoutesFiltersKey,
  );
  const pageRef = useRef(0);

  const markRoutesFiltersApplied = useCallback((filters: ListLogisticsRoutesOptions) => {
    const key = logisticsRoutesListFiltersKey(filters);
    appliedRoutesFiltersKeyRef.current = key;
    setAppliedRoutesFiltersKey(key);
  }, []);

  const reloadShipmentsAndAddresses = useCallback(async () => {
    if (!includeTaskBoardData) {
      return null;
    }
    const shipmentsResult = await listAllShipmentsForRouteBoardAction();
    if (!shipmentsResult.ok) {
      setLoadError(shipmentsResult.error);
      notify.error(shipmentsResult.error);
      return null;
    }

    setShipments(shipmentsResult.data);
    const addressesResult = await listLogisticsTaskAddressesAction({
      shipments: shipmentsResult.data,
    });
    if (addressesResult.ok) {
      setTaskAddresses(addressesResult.data);
    } else {
      setLoadError(addressesResult.error);
      notify.error(addressesResult.error);
    }
    return shipmentsResult.data;
  }, [includeTaskBoardData, notify]);

  const reloadShipments = useCallback(async () => {
    await reloadShipmentsAndAddresses();
  }, [reloadShipmentsAndAddresses]);

  const reloadRoutes = useCallback(
    async (options?: ListLogisticsRoutesOptions, targetPage?: number) => {
      if (options) {
        routeFiltersRef.current = options;
      }

      const pageToLoad = targetPage ?? pageRef.current;
      setRoutesLoading(true);
      try {
        const routesResult = await listLogisticsRoutesAction({
          ...routeFiltersRef.current,
          limit: LOGISTICS_ROUTES_PAGE_SIZE,
          offset: pageToLoad * LOGISTICS_ROUTES_PAGE_SIZE,
        });

        if (routesResult.ok) {
          setRoutes(routesResult.data);
          setHasMore(routesResult.data.length === LOGISTICS_ROUTES_PAGE_SIZE);
          markRoutesFiltersApplied(routeFiltersRef.current);
          if (targetPage != null) {
            pageRef.current = targetPage;
            setPage(targetPage);
          }
          setLoadError("");
        } else {
          setLoadError(routesResult.error);
          notify.error(routesResult.error);
        }

        return routesResult;
      } finally {
        setRoutesLoading(false);
      }
    },
    [markRoutesFiltersApplied, notify],
  );

  const applyRouteFilters = useCallback(
    (filters: ListLogisticsRoutesOptions) => {
      routeFiltersRef.current = filters;
      const nextKey = logisticsRoutesListFiltersKey(filters);
      if (skipInitialRouteFiltersRef.current) {
        skipInitialRouteFiltersRef.current = false;
        // SSR loads today's active routes; only skip when the UI already matches that scope.
        if (nextKey === appliedRoutesFiltersKeyRef.current) {
          return;
        }
      }
      void reloadRoutes(filters, 0);
    },
    [reloadRoutes],
  );

  const reloadRoutesAndAddresses = useCallback(async () => {
    await reloadRoutes(undefined, pageRef.current);
    await reloadShipmentsAndAddresses();
  }, [reloadRoutes, reloadShipmentsAndAddresses]);

  const reloadRouteCatalog = useCallback(async () => {
    const result = await listLogisticsRouteCatalogAction();
    if (result.ok) {
      setRouteCatalog(result.data);
    }
  }, []);

  const reloadPendingBookings = useCallback(async () => {
    const result = await listPendingCustomerRouteAssignmentRequestsAction();
    if (result.ok) {
      setPendingBookings(result.data);
    } else {
      notify.error(result.error);
    }
    setPendingBookingsLoaded(true);
  }, [notify]);

  const reloadReviewedBookings = useCallback(async () => {
    const result = await listReviewedCustomerRouteAssignmentRequestsAction();
    if (result.ok) {
      setReviewedBookings(result.data);
    } else {
      notify.error(result.error);
    }
    setReviewedBookingsLoaded(true);
  }, [notify]);

  const reloadAll = useCallback(async () => {
    setRefreshing(true);
    try {
    const vehiclesResult = await listLogisticsVehiclesAction();
    if (vehiclesResult.ok) {
      setVehicles(vehiclesResult.data);
    }
    const [routesResult] = await Promise.all([
      listLogisticsRoutesAction({
        ...routeFiltersRef.current,
        limit: LOGISTICS_ROUTES_PAGE_SIZE,
        offset: pageRef.current * LOGISTICS_ROUTES_PAGE_SIZE,
      }),
      reloadShipmentsAndAddresses(),
      reloadRouteCatalog(),
      reloadPendingBookings(),
      reloadReviewedBookings(),
    ]);
    if (routesResult.ok) {
      setRoutes(routesResult.data);
      setHasMore(routesResult.data.length === LOGISTICS_ROUTES_PAGE_SIZE);
      markRoutesFiltersApplied(routeFiltersRef.current);
      setLoadError("");
    } else {
      setLoadError(routesResult.error);
      notify.error(routesResult.error);
    }
    } finally {
      setRefreshing(false);
    }
  }, [
    markRoutesFiltersApplied,
    notify,
    reloadPendingBookings,
    reloadReviewedBookings,
    reloadRouteCatalog,
    reloadShipmentsAndAddresses,
  ]);

  useEffect(() => {
    queueMicrotask(() => {
      void reloadRouteCatalog();
    });
  }, [reloadRouteCatalog]);

  useEffect(() => {
    if (
      !supabaseReady ||
      (initialShipments &&
        initialRouteMembers &&
        initialWarehouses &&
        initialRoutes &&
        initialTaskAddresses)
    ) {
      return;
    }

    queueMicrotask(() => {
      void (async () => {
        const shipmentsResult = includeTaskBoardData
          ? await listAllShipmentsForRouteBoardAction()
          : null;
        const shipments = shipmentsResult?.ok ? shipmentsResult.data : [];
        if (shipmentsResult && !shipmentsResult.ok) {
          notify.error(shipmentsResult.error);
        }

        const [
          membersResult,
          warehousesResult,
          routesResult,
          addressesResult,
          vehiclesResult,
          catalogResult,
          bookingsResult,
          reviewedBookingsResult,
        ] = await Promise.all([
          listRouteMembersAction(),
          listWarehousesAction(),
          listLogisticsRoutesAction({
            ...routeFiltersRef.current,
            limit: LOGISTICS_ROUTES_PAGE_SIZE,
            offset: 0,
          }),
          includeTaskBoardData
            ? listLogisticsTaskAddressesAction({ shipments })
            : Promise.resolve(null),
          listLogisticsVehiclesAction(),
          listLogisticsRouteCatalogAction(),
          listPendingCustomerRouteAssignmentRequestsAction(),
          listReviewedCustomerRouteAssignmentRequestsAction(),
        ]);

        if (membersResult.ok) {
          setRouteMembers(membersResult.data);
        }

        if (warehousesResult.ok) {
          setWarehouses(warehousesResult.data);
        }

        if (routesResult.ok) {
          setRoutes(routesResult.data);
          setHasMore(routesResult.data.length === LOGISTICS_ROUTES_PAGE_SIZE);
          markRoutesFiltersApplied(routeFiltersRef.current);
        }

        if (addressesResult?.ok) {
          setTaskAddresses(addressesResult.data);
        }

        if (vehiclesResult.ok) {
          setVehicles(vehiclesResult.data);
        }

        if (catalogResult.ok) {
          setRouteCatalog(catalogResult.data);
        }

        if (bookingsResult.ok) {
          setPendingBookings(bookingsResult.data);
        }
        setPendingBookingsLoaded(true);
        if (reviewedBookingsResult.ok) {
          setReviewedBookings(reviewedBookingsResult.data);
        }
        setReviewedBookingsLoaded(true);

        setLoaded(true);
      })();
    });
  }, [
    includeTaskBoardData,
    initialRouteMembers,
    initialRoutes,
    initialShipments,
    initialTaskAddresses,
    initialWarehouses,
    markRoutesFiltersApplied,
    notify,
    supabaseReady,
  ]);

  useEffect(() => {
    if (!supabaseReady) {
      return;
    }

    if (
      !(
        initialShipments &&
        initialRouteMembers &&
        initialWarehouses &&
        initialRoutes &&
        initialTaskAddresses
      )
    ) {
      return;
    }

    queueMicrotask(() => {
      void Promise.all([reloadPendingBookings(), reloadReviewedBookings()]);
    });
  }, [
    initialRouteMembers,
    initialRoutes,
    initialShipments,
    initialTaskAddresses,
    initialWarehouses,
    reloadPendingBookings,
    reloadReviewedBookings,
    supabaseReady,
  ]);

  useEffect(() => {
    if (!loaded || !supabaseReady) {
      return;
    }

    const refresh = () => {
      if (shouldRunLogisticsLiveRefresh()) {
        void reloadAll();
      }
    };

    const interval = window.setInterval(refresh, LOGISTICS_LIVE_REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [loaded, notify, reloadAll, supabaseReady]);

  return {
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
    setPage,
    reloadRoutes,
    applyRouteFilters,
    reloadShipments,
    reloadRoutesAndAddresses,
    reloadRouteCatalog,
    reloadAll,
  };
}
