import {
  getConductorTruckInventoryAction,
  getConductorRouteArrivalWorkspaceAction,
  listConductorClosedDriverTasksAction,
  listConductorDriverTasksAction,
} from "@/app/actions/conductor-tasks";
import { listRouteMembersAction } from "@/app/actions/shipments";
import { ConductorTareasClient } from "@/components/conductor/conductor-tareas-client";
import { requirePathAccess } from "@/lib/auth/require";
import {
  canPreviewConductorTasks,
  resolveConductorTasksView,
} from "@/lib/conductor-tareas-view";
import type { ConductorDriverTask } from "@/lib/conductor-tasks";
import type { ConductorTruckInventoryView } from "@/app/actions/conductor-tasks";
import type { ConductorRouteArrivalWorkspace } from "@/lib/conductor-route-arrival";
import { isSupabaseConfigured } from "@/lib/supabase/env";

export default async function ConductorTareasPage({
  searchParams,
}: {
  searchParams: Promise<{ conductor?: string; route?: string; date?: string; view?: string }>;
}) {
  const session = await requirePathAccess("/conductor/tareas");
  const {
    conductor: previewDriverId,
    route: requestedRouteId,
    date: requestedScopeDate,
    view: initialWorkspaceView,
  } = await searchParams;
  const roleSlug = session?.roleSlug ?? "vendedor";
  const canPreview = canPreviewConductorTasks(roleSlug);

  let drivers: { id: string; label: string }[] = [];
  let initialTasks: ConductorDriverTask[] = [];
  let initialCompletedTasks: ConductorDriverTask[] = [];
  let initialTruckView: ConductorTruckInventoryView | null = null;
  let initialTruckError = "";
  let initialRouteArrival: ConductorRouteArrivalWorkspace = { routes: [], warehouses: [] };

  if (canPreview && isSupabaseConfigured() && session) {
    const membersResult = await listRouteMembersAction();
    drivers = membersResult.ok ? membersResult.data : [];
  }

  const view = resolveConductorTasksView({
    roleSlug,
    sessionUserId: session?.userId ?? "",
    sessionLabel: session?.fullName || session?.email || "Conductor",
    drivers,
    previewDriverId,
  });

  if (isSupabaseConfigured() && session && view.effectiveDriverId) {
    const [tasksResult, completedResult, truckResult, arrivalResult] = await Promise.all([
      listConductorDriverTasksAction(view.effectiveDriverId, requestedScopeDate),
      listConductorClosedDriverTasksAction(view.effectiveDriverId, requestedScopeDate),
      getConductorTruckInventoryAction(view.effectiveDriverId, requestedRouteId, requestedScopeDate),
      getConductorRouteArrivalWorkspaceAction(view.effectiveDriverId),
    ]);
    initialTasks = tasksResult.ok ? tasksResult.data : [];
    initialCompletedTasks = completedResult.ok ? completedResult.data : [];
    if (truckResult.ok) {
      initialTruckView = truckResult.data;
    } else {
      initialTruckError = truckResult.error;
    }
    initialRouteArrival = arrivalResult.ok ? arrivalResult.data : initialRouteArrival;
  }

  return (
    <ConductorTareasClient
      key={view.effectiveDriverId || "sin-conductor"}
      canPreview={view.canPreview}
      drivers={drivers}
      previewDriverId={view.previewDriverId}
      effectiveDriverId={view.effectiveDriverId}
      effectiveDriverLabel={view.effectiveDriverLabel}
      organizationId={session?.organizationId ?? ""}
      userId={session?.userId ?? ""}
      initialTasks={initialTasks}
      initialCompletedTasks={initialCompletedTasks}
      initialTruckView={initialTruckView}
      initialTruckError={initialTruckError}
      initialWorkspaceView={initialWorkspaceView}
      initialRouteArrival={initialRouteArrival}
      agencyModuleEnabled={session?.agencyModuleEnabled ?? false}
    />
  );
}
