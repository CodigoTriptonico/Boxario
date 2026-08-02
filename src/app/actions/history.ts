"use server";

import { requireScopedActionContext } from "@/lib/actions/context";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import type { ActivityHistoryRow } from "@/lib/activity-history-types";
import type { DbActivityHistory } from "@/lib/db";

export type { ActivityHistoryRow } from "@/lib/activity-history-types";

type ActivityHistoryDbRow = Pick<
  DbActivityHistory,
  | "id"
  | "action"
  | "entity_type"
  | "entity_id"
  | "title"
  | "description"
  | "actor_name"
  | "created_at"
  | "metadata"
>;

const ACTIVITY_HISTORY_SELECT =
  "id, action, entity_type, entity_id, title, description, actor_name, created_at, metadata";

function mapActivityHistoryRow(row: ActivityHistoryDbRow): ActivityHistoryRow {
  return {
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    title: row.title,
    description: row.description,
    actorName: row.actor_name,
    createdAt: row.created_at,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
  };
}

async function listActivityHistory(input: {
  limit: number;
  maxLimit: number;
  shipmentId?: string;
}): Promise<ActionResult<ActivityHistoryRow[]>> {
  try {
    const { session, supabase } = await requireScopedActionContext([
      "sales.manage",
      "customers.manage",
      "routes.view",
      "routes.update_status",
      "settings.manage",
      "audit.immutable.view",
    ]);

    let query = supabase
      .from("activity_history")
      .select(ACTIVITY_HISTORY_SELECT)
      .eq("organization_id", session.organizationId);

    if (input.shipmentId) {
      query = query.eq("entity_type", "shipment").eq("entity_id", input.shipmentId);
    }

    const { data, error } = await query
      .order("created_at", { ascending: false })
      .limit(Math.min(Math.max(input.limit, 1), input.maxLimit));

    if (error) {
      if (error.code === "42P01") {
        return ok([]);
      }
      return fail(error.message);
    }

    return ok(((data || []) as ActivityHistoryDbRow[]).map(mapActivityHistoryRow));
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function listActivityHistoryAction(
  limit = 80,
): Promise<ActionResult<ActivityHistoryRow[]>> {
  return listActivityHistory({ limit, maxLimit: 200 });
}

export async function listShipmentActivityHistoryAction(
  shipmentId: string,
  limit = 40,
): Promise<ActionResult<ActivityHistoryRow[]>> {
  return listActivityHistory({ shipmentId, limit, maxLimit: 100 });
}
