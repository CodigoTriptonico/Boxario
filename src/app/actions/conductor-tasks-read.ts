"use server";

import { canPreviewConductorTasks } from "@/lib/conductor-tareas-view";
import { buildConductorDriverTasks, type ConductorDriverTask } from "@/lib/conductor-tasks";
import { requireAppSession } from "@/lib/auth/session";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";

import { loadConductorData } from "@/app/actions/conductor-tasks-shared";

async function resolveConductorPreviewDriverId(driverId: string) {
  const session = await requireAppSession();
  const cleanDriverId = driverId.trim();

  if (
    cleanDriverId &&
    !canPreviewConductorTasks(session.roleSlug) &&
    session.userId !== cleanDriverId
  ) {
    throw new Error("FORBIDDEN");
  }

  return cleanDriverId || null;
}

export async function listConductorDriverTasksAction(
  driverId: string,
  scopeDate?: string,
): Promise<ActionResult<ConductorDriverTask[]>> {
  try {
    const cleanDriverId = await resolveConductorPreviewDriverId(driverId);
    if (!cleanDriverId) {
      return ok([]);
    }

    const { tasks } = await loadConductorData(cleanDriverId, scopeDate);
    return ok(tasks);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function listConductorClosedDriverTasksAction(
  driverId: string,
  scopeDate?: string,
): Promise<ActionResult<ConductorDriverTask[]>> {
  try {
    const cleanDriverId = await resolveConductorPreviewDriverId(driverId);
    if (!cleanDriverId) {
      return ok([]);
    }

    const data = await loadConductorData(cleanDriverId, scopeDate);

    return ok(
      buildConductorDriverTasks({
        shipments: data.shipments,
        routes: data.routes,
        taskAddresses: data.taskAddresses,
        vehicles: data.vehicles,
        driverId: cleanDriverId,
        scopeDate: data.scopeDate,
        visibility: "closed",
      }),
    );
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
