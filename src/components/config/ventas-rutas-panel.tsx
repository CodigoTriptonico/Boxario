"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listLogisticsRouteCatalogAction,
} from "@/app/actions/logistics-routes";
import type { LogisticsRouteCatalog } from "@/app/actions/logistics-routes";
import { listRouteMembersAction } from "@/app/actions/shipments";
import { GeographicRouteCatalog } from "@/components/logistica/geographic-route-catalog";
import { LogisticsRouteCatalogPlaceholder } from "@/components/page-loading";
import type { RouteMemberRow } from "@/lib/shipment-types";

export function VentasRutasPanel({
  canManage = false,
  onCatalogChange,
}: {
  canManage?: boolean;
  onCatalogChange?: () => void | Promise<void>;
}) {
  const [catalog, setCatalog] = useState<LogisticsRouteCatalog | null>(null);
  const [routeMembers, setRouteMembers] = useState<RouteMemberRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setLoadError(null);

      const [catalogResult, membersResult] = await Promise.all([
        listLogisticsRouteCatalogAction(),
        listRouteMembersAction(),
      ]);

      if (cancelled) {
        return;
      }

      if (!catalogResult.ok) {
        setLoadError(catalogResult.error);
        setLoading(false);
        return;
      }

      setCatalog(catalogResult.data);
      setRouteMembers(membersResult.ok ? membersResult.data : []);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [reloadToken]);

  const reloadCatalog = useCallback(() => {
    setReloadToken((value) => value + 1);
    void onCatalogChange?.();
  }, [onCatalogChange]);

  if (loading && !catalog) {
    return <LogisticsRouteCatalogPlaceholder withTopPadding={false} />;
  }

  if (!catalog) {
    return (
      <div className="flex min-h-0 flex-1 flex-col gap-3" role="alert">
        <p className="rounded-lg border border-amber-700 bg-amber-950/40 px-3 py-2 text-sm font-bold text-amber-200">
          {loadError || "No se pudo cargar el calendario de rutas."}
        </p>
        <button
          type="button"
          className="h-10 w-fit rounded-lg border border-amber-700/70 bg-amber-950/50 px-3 text-sm font-black text-amber-100 hover:bg-amber-900/50"
          onClick={reloadCatalog}
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col">
      {loadError ? (
        <div className="mb-2 flex shrink-0 items-center justify-between gap-3 rounded-lg border border-amber-700 bg-amber-950/40 px-3 py-2 text-sm font-bold text-amber-100" role="alert">
          <span className="min-w-0 break-words">{loadError}</span>
          <button
            type="button"
            className="h-8 shrink-0 rounded-md border border-amber-700/70 px-2 text-xs font-black hover:bg-amber-900/50"
            onClick={reloadCatalog}
          >
            Reintentar
          </button>
        </div>
      ) : null}
      <GeographicRouteCatalog
        catalog={catalog}
        canManage={canManage}
        routeMembers={routeMembers}
        onCatalogChange={reloadCatalog}
      />
    </div>
  );
}
