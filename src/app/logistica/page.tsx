import {
  listLogisticsRouteCatalogAction,
  listLogisticsRoutesAction,
  listLogisticsTaskAddressesAction,
} from "@/app/actions/logistics-routes";
import {
  listRouteMembersAction,
  listShipmentsAction,
} from "@/app/actions/shipments";
import { listWarehousesAction } from "@/app/actions/warehouses";
import { LogisticaClient } from "@/components/logistica-client";
import { requirePathAccess } from "@/lib/auth/require";
import { sessionHasPermission } from "@/lib/auth/permissions";
import { defaultLogisticsRoutesListFilters } from "@/lib/logistics-routes-pagination";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { redirect } from "next/navigation";

export default async function LogisticaPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const session = await requirePathAccess("/logistica");
  const { view } = await searchParams;
  if (view === "configuracion") {
    redirect("/configuracion?view=prices&panel=operativos");
  }

  if (!isSupabaseConfigured() || !session) {
    return <LogisticaClient />;
  }

  const canManageLogisticsSettings =
    sessionHasPermission(session, "logistics.settings.manage") ||
    sessionHasPermission(session, "settings.manage");
  const [shipmentsResult, membersResult, warehousesResult] = await Promise.all([
    listShipmentsAction(),
    listRouteMembersAction(),
    listWarehousesAction(),
  ]);
  const shipments = shipmentsResult.ok ? shipmentsResult.data : [];
  // Reutiliza envíos ya cargados: evita el segundo listShipmentsAction de addresses.
  const [routesResult, taskAddressesResult, routeCatalogResult] = await Promise.all([
    listLogisticsRoutesAction(defaultLogisticsRoutesListFilters()),
    listLogisticsTaskAddressesAction({ shipments }),
    listLogisticsRouteCatalogAction(),
  ]);

  return (
    <LogisticaClient
      initialShipments={shipments}
      initialRouteMembers={membersResult.ok ? membersResult.data : []}
      initialWarehouses={warehousesResult.ok ? warehousesResult.data : []}
      initialRoutes={routesResult.ok ? routesResult.data : []}
      initialTaskAddresses={taskAddressesResult.ok ? taskAddressesResult.data : []}
      initialRouteCatalog={routeCatalogResult.ok ? routeCatalogResult.data : undefined}
      canManageRoutes={sessionHasPermission(session, "routes.update_status")}
      canManageLogisticsSettings={canManageLogisticsSettings}
      agencyModuleEnabled={session.agencyModuleEnabled}
    />
  );
}
