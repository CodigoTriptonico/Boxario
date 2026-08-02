"use client";

import type { LogisticsRouteCatalog as LogisticsRouteCatalogData } from "@/app/actions/logistics-routes";
import { LogisticsRouteCatalog } from "@/components/logistica/logistics-route-catalog";
import { LogisticsSectionNav } from "@/components/logistica/logistics-section-nav";
import { SupabaseRequiredBanner } from "@/components/supabase-required-banner";
import { Panel, panelToolbarClass } from "@/components/ui-blocks";
import type { RouteMemberRow } from "@/lib/shipment-types";

export function LogisticsRoutesView({
  supabaseReady,
  routeCatalog,
  canManageRoutes,
  routeMembers,
  onCatalogChange,
}: {
  supabaseReady: boolean;
  routeCatalog: LogisticsRouteCatalogData | undefined;
  canManageRoutes: boolean;
  routeMembers: RouteMemberRow[];
  onCatalogChange: () => void;
}) {
  return (
    <Panel title="Logistica" hideHeader clipContent={false}>
      {!supabaseReady ? (
        <SupabaseRequiredBanner detail="La logistica se lee desde shipments, shipment_logistics_tasks y logistics_routes en Supabase." />
      ) : null}
      {supabaseReady ? (
        <div className="grid w-full min-w-0 gap-4">
          <div className={`${panelToolbarClass} flex flex-wrap items-center justify-between gap-3`}>
            <div className="px-1">
              <p className="text-sm font-black text-[#f8fafc]">Rutas semanales</p>
              <p className="mt-0.5 text-xs font-bold text-slate-500">Disponibilidad y recorridos recurrentes.</p>
            </div>
            <LogisticsSectionNav active="routes" className="ml-auto" />
          </div>
          <LogisticsRouteCatalog
            initialCatalog={routeCatalog}
            canManage={canManageRoutes}
            routeMembers={routeMembers}
            onCatalogChange={onCatalogChange}
          />
        </div>
      ) : null}
    </Panel>
  );
}
