import {
  listLogisticsRouteCatalogAction,
  listLogisticsRoutesAction,
  listLogisticsTaskAddressesAction,
} from "@/app/actions/logistics-routes";
import { listPendingCustomerRouteAssignmentRequestsAction } from "@/app/actions/customer-route-assignments";
import {
  listRouteMembersAction,
  listShipmentsAction,
} from "@/app/actions/shipments";
import { listWarehousesAction } from "@/app/actions/warehouses";
import { LogisticaClient } from "@/components/logistica-client";
import { requirePathAccess } from "@/lib/auth/require";
import { sessionHasPermission } from "@/lib/auth/permissions";
import { defaultLogisticsRoutesListFilters } from "@/lib/logistics-routes-pagination";
import { SHIPMENTS_BOARD_LIMIT } from "@/lib/shipments-pagination";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { redirect } from "next/navigation";

export default async function LogisticaPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; panel?: string; tab?: string }>;
}) {
  const session = await requirePathAccess("/logistica");
  const { view, panel, tab } = await searchParams;
  if (view === "configuracion") {
    redirect("/configuracion?view=prices");
  }

  if (!isSupabaseConfigured() || !session) {
    return <LogisticaClient />;
  }

  const canManageLogisticsSettings =
    sessionHasPermission(session, "logistics.settings.manage") ||
    sessionHasPermission(session, "settings.manage");
  const [shipmentsResult, membersResult, warehousesResult] = await Promise.all([
    listShipmentsAction({ limit: SHIPMENTS_BOARD_LIMIT, offset: 0 }),
    listRouteMembersAction(),
    listWarehousesAction(),
  ]);
  const shipments = shipmentsResult.ok ? shipmentsResult.data : [];
  // Reutiliza envíos ya cargados: evita el segundo listShipmentsAction de addresses.
  const [routesResult, taskAddressesResult, routeCatalogResult, pendingBookingsResult] = await Promise.all([
    listLogisticsRoutesAction(defaultLogisticsRoutesListFilters()),
    listLogisticsTaskAddressesAction({ shipments }),
    listLogisticsRouteCatalogAction(),
    listPendingCustomerRouteAssignmentRequestsAction(),
  ]);

  return (
    <LogisticaClient
      initialShipments={shipments}
      initialRouteMembers={membersResult.ok ? membersResult.data : []}
      initialWarehouses={warehousesResult.ok ? warehousesResult.data : []}
      initialRoutes={routesResult.ok ? routesResult.data : []}
      initialPendingBookings={pendingBookingsResult.ok ? pendingBookingsResult.data : []}
      initialTaskAddresses={taskAddressesResult.ok ? taskAddressesResult.data : []}
      initialRouteCatalog={routeCatalogResult.ok ? routeCatalogResult.data : undefined}
      initialView="routes"
      initialRoutesTab={
        view === "rutas" && panel === "configuracion"
          ? "configuration"
          : view === "rutas" && ["confirmations", "templates", "operational", "history"].includes(tab || "")
            ? (tab as "confirmations" | "templates" | "operational" | "history")
            : undefined
      }
      canManageRoutes={sessionHasPermission(session, "routes.update_status")}
      canManageLogisticsSettings={canManageLogisticsSettings}
      agencyModuleEnabled={session.agencyModuleEnabled}
    />
  );
}
