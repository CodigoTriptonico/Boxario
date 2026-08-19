"use server";

import { canPreviewConductorTasks } from "@/lib/conductor-tareas-view";
import { buildConductorDriverTasks, type ConductorDriverTask } from "@/lib/conductor-tasks";
import { requireAppSession } from "@/lib/auth/session";
import { createScopedSupabase } from "@/lib/supabase/scoped";
import type { Database } from "@/lib/db";
import { takeOperationalPage } from "@/lib/operational-pagination";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";

import { loadConductorData } from "@/app/actions/conductor-tasks-shared";

type ConductorTaskPageRpcRow = Database["public"]["Functions"]["list_conductor_operational_task_page"]["Returns"][number];

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

export type ConductorOperationalTaskListItem = {
  taskId: string;
  shipmentId: string;
  taskType: string;
  taskStatus: string;
  scheduledAt: string | null;
  assignedTo: string | null;
  routeId: string | null;
  routeName: string | null;
  routeDate: string | null;
  stopOrder: number | null;
  vehicleId: string | null;
  sortAt: string;
};

export async function listConductorOperationalTaskPageAction(input: {
  driverId: string;
  scopeDate: string;
  visibility?: "open" | "closed";
  cursor?: { sortAt: string; id: string } | null;
  limit?: number;
}): Promise<ActionResult<{ items: ConductorOperationalTaskListItem[]; nextCursor: { sortAt: string; id: string } | null }>> {
  try {
    const cleanDriverId = await resolveConductorPreviewDriverId(input.driverId);
    if (!cleanDriverId) return ok({ items: [], nextCursor: null });
    const session = await requireAppSession();
    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");
    const limit = Math.max(1, Math.min(Number.isInteger(input.limit) ? Number(input.limit) : 100, 100));
    const { data, error } = await supabase.rpc("list_conductor_operational_task_page", {
      p_driver_id: cleanDriverId,
      p_scope_date: input.scopeDate,
      p_visibility: input.visibility || "open",
      p_cursor_sort_at: input.cursor?.sortAt || null,
      p_cursor_id: input.cursor?.id || null,
      p_limit: limit + 1,
    });
    if (error) throw new Error(error.message);
    const rows = (data || []) as ConductorTaskPageRpcRow[];
    const page = takeOperationalPage(rows, limit);
    const items = page.items.map((row) => ({
      taskId: row.task_id,
      shipmentId: row.shipment_id,
      taskType: row.task_type,
      taskStatus: row.task_status,
      scheduledAt: row.scheduled_at,
      assignedTo: row.assigned_to,
      routeId: row.route_id,
      routeName: row.route_name,
      routeDate: row.route_date,
      stopOrder: row.stop_order,
      vehicleId: row.vehicle_id,
      sortAt: row.sort_at,
    }));
    const last = items.at(-1);
    return ok({
      items,
      nextCursor: page.hasMore && last ? { sortAt: last.sortAt, id: last.taskId } : null,
    });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
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
