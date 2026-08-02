"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LogisticsRouteCatalog as LogisticsRouteCatalogData } from "@/app/actions/logistics-routes";
import {
  listLogisticsRouteCatalogAction,
  listLogisticsRoutesAction,
  listLogisticsTaskAddressesAction,
} from "@/app/actions/logistics-routes";
import { listRouteMembersAction, listShipmentsAction } from "@/app/actions/shipments";
import { listWarehousesAction } from "@/app/actions/warehouses";
import { listLogisticsVehiclesAction } from "@/app/actions/logistics-fleet";
import type { RouteMemberRow, ShipmentRow } from "@/lib/shipment-types";
import type { LogisticsRouteRow, LogisticsTaskAddressRow } from "@/lib/logistics-routing";
import type { WarehouseRow } from "@/lib/auth/types";
import type { LogisticsVehicleRow } from "@/lib/logistics-fleet";
import { LOGISTICS_LIVE_REFRESH_MS, shouldRunLogisticsLiveRefresh } from "@/lib/logistics-live-refresh";
import {
  LOGISTICS_ROUTES_PAGE_SIZE,
  type ListLogisticsRoutesOptions,
} from "@/lib/logistics-routes-pagination";

type LogisticsNotify = {
  error: (message: string) => void;
  info: (message: string) => void;
};

export function useLogisticsData({
  initialShipments,
  initialRouteMembers,
  initialWarehouses,
  initialRoutes,
  initialTaskAddresses,
  initialRouteCatalog,
  supabaseReady,
  notify,
}: {
  initialShipments?: ShipmentRow[];
  initialRouteMembers?: RouteMemberRow[];
  initialWarehouses?: WarehouseRow[];
  initialRoutes?: LogisticsRouteRow[];
  initialTaskAddresses?: LogisticsTaskAddressRow[];
  initialRouteCatalog?: LogisticsRouteCatalogData;
  supabaseReady: boolean;
  notify: LogisticsNotify;
}) {
  const [shipments, setShipments] = useState<ShipmentRow[]>(initialShipments || []);
  const [routeMembers, setRouteMembers] = useState<RouteMemberRow[]>(initialRouteMembers || []);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>(initialWarehouses || []);
  const [routes, setRoutes] = useState<LogisticsRouteRow[]>(initialRoutes || []);
  const [vehicles, setVehicles] = useState<LogisticsVehicleRow[]>([]);
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
  const routeFiltersRef = useRef<ListLogisticsRoutesOptions>({ statusMode: "active" });
  const skipInitialRouteFiltersRef = useRef(Boolean(initialRoutes));
  const pageRef = useRef(0);

  const reloadShipmentsAndAddresses = useCallback(async () => {
    const shipmentsResult = await listShipmentsAction();
    if (!shipmentsResult.ok) {
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
      notify.error(addressesResult.error);
    }
    return shipmentsResult.data;
  }, [notify]);

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
          if (targetPage != null) {
            pageRef.current = targetPage;
            setPage(targetPage);
          }
        } else {
          notify.error(routesResult.error);
        }

        return routesResult;
      } finally {
        setRoutesLoading(false);
      }
    },
    [notify],
  );

  const applyRouteFilters = useCallback(
    (filters: ListLogisticsRoutesOptions) => {
      routeFiltersRef.current = filters;
      if (skipInitialRouteFiltersRef.current) {
        skipInitialRouteFiltersRef.current = false;
        return;
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

  const reloadAll = useCallback(async () => {
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
    ]);
    if (routesResult.ok) {
      setRoutes(routesResult.data);
      setHasMore(routesResult.data.length === LOGISTICS_ROUTES_PAGE_SIZE);
    } else {
      notify.error(routesResult.error);
    }
  }, [notify, reloadRouteCatalog, reloadShipmentsAndAddresses]);

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
        const shipmentsResult = await listShipmentsAction();
        const shipments = shipmentsResult.ok ? shipmentsResult.data : [];
        if (shipmentsResult.ok) {
          setShipments(shipments);
        } else {
          notify.error(shipmentsResult.error);
        }

        const [
          membersResult,
          warehousesResult,
          routesResult,
          addressesResult,
          vehiclesResult,
          catalogResult,
        ] = await Promise.all([
          listRouteMembersAction(),
          listWarehousesAction(),
          listLogisticsRoutesAction({
            ...routeFiltersRef.current,
            limit: LOGISTICS_ROUTES_PAGE_SIZE,
            offset: 0,
          }),
          listLogisticsTaskAddressesAction({ shipments }),
          listLogisticsVehiclesAction(),
          listLogisticsRouteCatalogAction(),
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
        }

        if (addressesResult.ok) {
          setTaskAddresses(addressesResult.data);
        }

        if (vehiclesResult.ok) {
          setVehicles(vehiclesResult.data);
        }

        if (catalogResult.ok) {
          setRouteCatalog(catalogResult.data);
        }

        setLoaded(true);
      })();
    });
  }, [
    initialRouteMembers,
    initialRoutes,
    initialShipments,
    initialTaskAddresses,
    initialWarehouses,
    notify,
    supabaseReady,
  ]);

  useEffect(() => {
    if (!loaded || !supabaseReady) {
      return;
    }

    const refresh = () => {
      if (shouldRunLogisticsLiveRefresh()) {
        void reloadAll().then(() => notify.info("Board actualizado"));
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
    taskAddresses,
    routeCatalog,
    loaded,
    page,
    hasMore,
    routesLoading,
    setPage,
    reloadRoutes,
    applyRouteFilters,
    reloadShipments,
    reloadRoutesAndAddresses,
    reloadRouteCatalog,
    reloadAll,
  };
}
