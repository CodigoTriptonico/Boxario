"use client";

import { useCallback, useEffect, useState } from "react";
import {
  listLogisticsRouteCatalogAction,
} from "@/app/actions/logistics-routes";
import type { LogisticsRouteCatalog } from "@/app/actions/logistics-routes";
import { listRouteMembersAction } from "@/app/actions/shipments";
import { GeographicRouteCatalog } from "@/components/logistica/geographic-route-catalog";
import { PageLoading } from "@/components/page-loading";
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
        setCatalog(null);
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
    return <PageLoading inline />;
  }

  if (loadError || !catalog) {
    return (
      <p className="rounded-lg border border-amber-700 bg-amber-950/40 px-3 py-2 text-sm font-bold text-amber-200">
        {loadError || "No se pudo cargar el calendario de rutas."}
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      <p className="text-xs font-semibold text-slate-400">
        Selecciona un día para preparar sus horarios; usa su estado Activo/Inactivo para cambiar
        la disponibilidad. Logística usa este calendario al confirmar tareas.
      </p>
      <GeographicRouteCatalog
        catalog={catalog}
        canManage={canManage}
        routeMembers={routeMembers}
        onCatalogChange={reloadCatalog}
      />
    </div>
  );
}
