"use server";

import { requireAppSession } from "@/lib/auth/session";
import { createScopedSupabase } from "@/lib/supabase/scoped";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import { CONDUCTOR_ROUTE_NOTIFICATIONS_PAGE_SIZE } from "@/lib/conductor-route-notifications";
import type { DbLogisticsRouteNotification } from "@/lib/db";

export type LogisticsRouteNotification = {
  id: string;
  routeId: string;
  changeType: string;
  stopId: string | null;
  summary: string;
  actorName: string;
  createdAt: string;
  readAt: string | null;
};

type NotificationListOptions = {
  limit?: number;
  offset?: number;
  unreadOnly?: boolean;
};

type NotificationSelectRow = Pick<
  DbLogisticsRouteNotification,
  | "id"
  | "route_id"
  | "change_type"
  | "stop_id"
  | "summary"
  | "actor_name"
  | "created_at"
  | "read_at"
>;

function mapNotification(row: NotificationSelectRow): LogisticsRouteNotification {
  return {
    id: row.id,
    routeId: row.route_id,
    changeType: row.change_type,
    stopId: row.stop_id,
    summary: row.summary || "",
    actorName: row.actor_name || "",
    createdAt: row.created_at,
    readAt: row.read_at,
  };
}

export async function listConductorRouteNotificationsAction(
  options?: NotificationListOptions,
): Promise<ActionResult<LogisticsRouteNotification[]>> {
  try {
    const session = await requireAppSession();
    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");

    const limit = Math.min(
      Math.max(options?.limit ?? CONDUCTOR_ROUTE_NOTIFICATIONS_PAGE_SIZE, 1),
      100,
    );
    const offset = Math.max(options?.offset ?? 0, 0);

    let query = supabase
      .from("logistics_route_notifications")
      .select("id, route_id, change_type, stop_id, summary, actor_name, created_at, read_at")
      .eq("organization_id", session.organizationId)
      .eq("recipient_id", session.userId)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + limit - 1);

    if (options?.unreadOnly) {
      query = query.is("read_at", null);
    }

    const { data, error } = await query;

    if (error) {
      if (error.code === "42P01") return ok([]);
      return fail(error.message);
    }

    return ok(((data || []) as NotificationSelectRow[]).map(mapNotification));
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function countConductorRouteUnreadNotificationsAction(): Promise<
  ActionResult<number>
> {
  try {
    const session = await requireAppSession();
    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");

    const { count, error } = await supabase
      .from("logistics_route_notifications")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", session.organizationId)
      .eq("recipient_id", session.userId)
      .is("read_at", null);

    if (error) {
      if (error.code === "42P01") return ok(0);
      return fail(error.message);
    }

    return ok(count ?? 0);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function markConductorRouteNotificationReadAction(
  notificationId: string,
): Promise<ActionResult<null>> {
  try {
    const session = await requireAppSession();
    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");

    const { error } = await supabase
      .from("logistics_route_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId)
      .eq("organization_id", session.organizationId)
      .eq("recipient_id", session.userId)
      .is("read_at", null);

    if (error) return fail(error.message);
    return ok(null);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
