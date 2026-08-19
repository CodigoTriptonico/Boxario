"use server";

import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import { sessionHasPermission } from "@/lib/auth/permissions";
import { requireAppSession } from "@/lib/auth/session";
import { createScopedSupabase } from "@/lib/supabase/scoped";
import type { Database } from "@/lib/db";
import { takeOperationalPage } from "@/lib/operational-pagination";

type RouteWorkspaceRpcRow = Database["public"]["Functions"]["list_logistics_route_workspace_page"]["Returns"][number];
type TaskBoardRpcRow = Database["public"]["Functions"]["list_logistics_task_board_page"]["Returns"][number];

export type OperationalCursor = {
  createdAt: string;
  id: string;
  routeDate?: string;
  sortAt?: string;
};

export type OperationalPage<T> = {
  items: T[];
  nextCursor: OperationalCursor | null;
};

export type LogisticsRouteWorkspaceListItem = {
  id: string;
  routeDate: string;
  name: string;
  status: string;
  assignedTo: string | null;
  vehicleId: string | null;
  warehouseId: string | null;
  zoneKey: string;
  routeTemplateId: string | null;
  stopCount: number;
  deliveryStopCount: number;
  pickupStopCount: number;
  createdAt: string;
};

export type LogisticsTaskBoardListItem = {
  taskId: string;
  shipmentId: string;
  taskType: string;
  taskStatus: string;
  scheduledAt: string | null;
  assignedTo: string | null;
  shipmentCode: string;
  customerName: string;
  routeId: string | null;
  routeDate: string | null;
  zoneKey: string | null;
  createdAt: string;
};

function pageLimit(value?: number, fallback = 50) {
  return Math.max(1, Math.min(Number.isInteger(value) ? Number(value) : fallback, 100));
}

/**
 * Listing contract for the route workspace.  Detail remains a separate rich
 * route read; this projection is intentionally small and keyset paginated.
 */
export async function listLogisticsRouteWorkspacePageAction(input: {
  scope: "operational" | "history";
  from?: string;
  to?: string;
  assignedTo?: string;
  zoneKey?: string;
  routeTemplateId?: string;
  search?: string;
  cursor?: OperationalCursor | null;
  limit?: number;
}): Promise<ActionResult<OperationalPage<LogisticsRouteWorkspaceListItem>>> {
  try {
    const session = await requireAppSession();
    if (!sessionHasPermission(session, "routes.view") && !sessionHasPermission(session, "sales.manage")) {
      throw new Error("FORBIDDEN");
    }
    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");

    const limit = pageLimit(input.limit);
    const { data, error } = await supabase.rpc("list_logistics_route_workspace_page", {
      target_scope: input.scope,
      target_from: input.from?.trim() || null,
      target_to: input.to?.trim() || null,
      target_assigned_to: input.assignedTo?.trim() || null,
      target_zone_key: input.zoneKey?.trim() || null,
      target_route_template_id: input.routeTemplateId?.trim() || null,
      target_search: input.search?.trim() || null,
      cursor_route_date: input.cursor?.routeDate || null,
      cursor_created_at: input.cursor?.createdAt || null,
      cursor_id: input.cursor?.id || null,
      target_limit: limit + 1,
    });
    if (error) throw new Error(error.message);

    const rows = (data || []) as RouteWorkspaceRpcRow[];
    const page = takeOperationalPage(rows, limit);
    const items = page.items.map((row) => ({
      id: row.id,
      routeDate: row.route_date,
      name: row.name,
      status: row.status,
      assignedTo: row.assigned_to,
      vehicleId: row.vehicle_id,
      warehouseId: row.warehouse_id,
      zoneKey: row.zone_key,
      routeTemplateId: row.route_template_id,
      stopCount: row.stop_count,
      deliveryStopCount: row.delivery_stop_count,
      pickupStopCount: row.pickup_stop_count,
      createdAt: row.created_at,
    }));
    const last = items.at(-1);
    return ok({
      items,
      nextCursor: page.hasMore && last
        ? { routeDate: last.routeDate, createdAt: last.createdAt, id: last.id }
        : null,
    });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

/** Server-side task eligibility/list filters for the logistics board. */
export async function listLogisticsTaskBoardPageAction(input: {
  routeDate?: string;
  taskType?: string;
  assignedTo?: string;
  zoneKey?: string;
  search?: string;
  cursor?: OperationalCursor | null;
  limit?: number;
} = {}): Promise<ActionResult<OperationalPage<LogisticsTaskBoardListItem>>> {
  try {
    const session = await requireAppSession();
    if (!sessionHasPermission(session, "routes.view") && !sessionHasPermission(session, "sales.manage")) {
      throw new Error("FORBIDDEN");
    }
    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");
    const limit = pageLimit(input.limit);
    const { data, error } = await supabase.rpc("list_logistics_task_board_page", {
      p_route_date: input.routeDate?.trim() || null,
      p_task_type: input.taskType?.trim() || null,
      p_assigned_to: input.assignedTo?.trim() || null,
      p_zone_key: input.zoneKey?.trim() || null,
      p_search: input.search?.trim() || null,
      p_cursor_created_at: input.cursor?.createdAt || null,
      p_cursor_id: input.cursor?.id || null,
      p_limit: limit + 1,
    });
    if (error) throw new Error(error.message);
    const rows = (data || []) as TaskBoardRpcRow[];
    const page = takeOperationalPage(rows, limit);
    const items = page.items.map((row) => ({
      taskId: row.task_id,
      shipmentId: row.shipment_id,
      taskType: row.task_type,
      taskStatus: row.task_status,
      scheduledAt: row.scheduled_at,
      assignedTo: row.assigned_to,
      shipmentCode: row.shipment_code,
      customerName: row.customer_name,
      routeId: row.route_id,
      routeDate: row.route_date,
      zoneKey: row.zone_key,
      createdAt: row.created_at,
    }));
    const last = items.at(-1);
    return ok({
      items,
      nextCursor: page.hasMore && last ? { createdAt: last.createdAt, id: last.taskId } : null,
    });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
