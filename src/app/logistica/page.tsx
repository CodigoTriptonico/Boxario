import {
  listLogisticsRouteCatalogAction,
  listLogisticsRoutesAction,
} from "@/app/actions/logistics-routes";
import { listPendingCustomerRouteAssignmentRequestsAction } from "@/app/actions/customer-route-assignments";
import {
  listRouteMembersAction,
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
  const [membersResult, warehousesResult] = await Promise.all([
    listRouteMembersAction(),
    listWarehousesAction(),
  ]);
  const [routesResult, routeCatalogResult, pendingBookingsResult] = await Promise.all([
    listLogisticsRoutesAction(defaultLogisticsRoutesListFilters()),
    listLogisticsRouteCatalogAction(),
    listPendingCustomerRouteAssignmentRequestsAction(),
  ]);
  const initialReadError = [
    membersResult,
    warehousesResult,
    routesResult,
    routeCatalogResult,
    pendingBookingsResult,
  ].find((result) => !result.ok);

  return (
    <LogisticaClient
      initialRouteMembers={membersResult.ok ? membersResult.data : []}
      initialWarehouses={warehousesResult.ok ? warehousesResult.data : []}
      initialRoutes={routesResult.ok ? routesResult.data : []}
      initialPendingBookings={pendingBookingsResult.ok ? pendingBookingsResult.data : []}
      initialRouteCatalog={routeCatalogResult.ok ? routeCatalogResult.data : undefined}
      initialReadError={initialReadError && !initialReadError.ok ? initialReadError.error : undefined}
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
