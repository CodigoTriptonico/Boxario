"use server";

import { requireAppSession } from "@/lib/auth/session";
import { sessionHasPermission } from "@/lib/auth/permissions";
import { createScopedSupabase } from "@/lib/supabase/scoped";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import { isAssignableRouteMemberRole } from "@/lib/route-members";
import { canChangeShipmentSalesOwner, shipmentVisibilityScope } from "@/lib/shipment-visibility";
import { isSalesOwnerRole } from "@/lib/shipment-sales-owner";
import { filterAndPaginateEnviosShipments } from "@/lib/envios-server-pagination";
import type { EnviosClientMode, EnviosReadinessFilter } from "@/lib/shipment-display";
import type { AppSession, RoleSlug } from "@/lib/auth/types";
import type { RouteMemberRow, SalesOwnerRow, ShipmentRow } from "@/lib/shipment-types";
import {
  SHIPMENTS_MAX_PAGE_SIZE,
  SHIPMENTS_PAGE_SIZE,
  clampShipmentsLimit,
  clampShipmentsOffset,
} from "@/lib/shipments-pagination";

import {
  SHIPMENT_SELECT,
  mapShipment,
  type ShipmentDbRow,
} from "@/app/actions/shipments-data";
import { promoteDueScheduledLegsForListedShipments } from "@/app/actions/shipments-state";

type ScopedSupabase = NonNullable<Awaited<ReturnType<typeof createScopedSupabase>>>;

function shipmentListQuery(
  supabase: ScopedSupabase,
  session: AppSession,
  limit: number,
  offset: number,
) {
  return supabase
    .from("shipments")
    .select(SHIPMENT_SELECT)
    .eq("organization_id", session.organizationId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .range(offset, offset + limit - 1);
}

async function mapShipmentListResult(
  supabase: ScopedSupabase,
  session: AppSession,
  result: {
    data: unknown[] | null;
    error: { code?: string; message: string } | null;
  },
): Promise<ActionResult<ShipmentRow[]>> {
  if (result.error) {
    if (result.error.code === "42P01") {
      return ok([]);
    }
    return fail(result.error.message);
  }

  return ok(
    await promoteDueScheduledLegsForListedShipments(
      supabase,
      session,
      ((result.data || []) as ShipmentDbRow[]).map(mapShipment),
    ),
  );
}

async function listProfileAssignments(
  session: AppSession,
  acceptsRole: (role: RoleSlug) => boolean,
): Promise<ActionResult<RouteMemberRow[]>> {
  const supabase = await createScopedSupabase(session);
  if (!supabase) {
    return ok([]);
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, email, full_name, roles(slug, name)")
    .eq("organization_id", session.organizationId)
    .eq("is_active", true)
    .order("full_name");

  if (error) {
    return fail(error.message);
  }

  const profiles = (data || [])
    .map((row) => {
      const roleRow = row.roles as
        | { slug: RoleSlug; name: string }
        | { slug: RoleSlug; name: string }[]
        | null;
      const role = Array.isArray(roleRow) ? roleRow[0] : roleRow;
      return {
        id: row.id as string,
        label: ((row.full_name as string | null) || (row.email as string) || "Usuario").trim(),
        roleSlug: role?.slug || "vendedor",
      };
    })
    .filter((row) => acceptsRole(row.roleSlug));

  return ok(profiles);
}

export async function listShipmentsAction(options?: {
  limit?: number;
  offset?: number;
}): Promise<ActionResult<ShipmentRow[]>> {
  try {
    const session = await requireAppSession();
    const scope = shipmentVisibilityScope(session);

    if (scope === "none") {
      throw new Error("FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const limit = clampShipmentsLimit(options?.limit, SHIPMENTS_MAX_PAGE_SIZE);
    const offset = clampShipmentsOffset(options?.offset);

    let query = shipmentListQuery(supabase, session, limit, offset);

    if (scope === "driver") {
      query = query.eq("assigned_to", session.userId);
    } else if (scope === "sales_owner") {
      query = query.eq("sales_owner_id", session.userId);
    }

    const result = await mapShipmentListResult(supabase, session, await query);
    return result;
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function listShipmentsForRouteBoardAction(options?: {
  limit?: number;
  offset?: number;
}): Promise<ActionResult<ShipmentRow[]>> {
  try {
    const session = await requireAppSession();

    if (!sessionHasPermission(session, "routes.view")) {
      throw new Error("FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const limit = clampShipmentsLimit(options?.limit, SHIPMENTS_MAX_PAGE_SIZE);
    const offset = clampShipmentsOffset(options?.offset);

    const result = await mapShipmentListResult(
      supabase,
      session,
      await shipmentListQuery(supabase, session, limit, offset),
    );
    return result;
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

/**
 * Complete route-board universe. This is deliberately separate from the UI
 * page action: planning cannot silently omit an eligible task merely because
 * it is after a presentation page. Consumers must still apply their own
 * operational filters before showing or mutating a task.
 */
export async function listAllShipmentsForRouteBoardAction(): Promise<ActionResult<ShipmentRow[]>> {
  try {
    const session = await requireAppSession();

    if (!sessionHasPermission(session, "routes.view")) {
      throw new Error("FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const rows: ShipmentRow[] = [];
    const pageSize = SHIPMENTS_MAX_PAGE_SIZE;
    for (let offset = 0; ; offset += pageSize) {
      const result = await mapShipmentListResult(
        supabase,
        session,
        await shipmentListQuery(supabase, session, pageSize, offset),
      );

      if (!result.ok) {
        return result;
      }

      rows.push(...result.data);
      if (result.data.length < pageSize) {
        return ok(rows);
      }
    }
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export type EnviosShipmentsPage = {
  items: ShipmentRow[];
  total: number;
  hasMore: boolean;
  readiness: { totalCount: number; listosCount: number; pendientesCount: number };
};

/**
 * Seguimiento owns the full filtered universe in the server action. The rich
 * status/readiness predicates depend on logistics-plan data, so applying them
 * after a UI-page fetch would make a matching invoice disappear.
 */
export async function listEnviosShipmentsPageAction(input: {
  limit?: number;
  offset?: number;
  mode: EnviosClientMode;
  query?: string;
  country?: string;
  statusFilter?: string;
  salesOwnerId?: string;
  readinessFilter?: EnviosReadinessFilter;
}): Promise<ActionResult<EnviosShipmentsPage>> {
  try {
    const session = await requireAppSession();
    const scope = shipmentVisibilityScope(session);
    if (scope === "none") throw new Error("FORBIDDEN");

    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");

    const pageSize = SHIPMENTS_MAX_PAGE_SIZE;
    const all: ShipmentRow[] = [];
    for (let cursor = 0; ; cursor += pageSize) {
      let query = shipmentListQuery(supabase, session, pageSize, cursor);
      if (scope === "driver") query = query.eq("assigned_to", session.userId);
      else if (scope === "sales_owner") query = query.eq("sales_owner_id", session.userId);
      const result = await mapShipmentListResult(supabase, session, await query);
      if (!result.ok) return result;
      all.push(...result.data);
      if (result.data.length < pageSize) break;
    }

    const limit = clampShipmentsLimit(input.limit, SHIPMENTS_PAGE_SIZE);
    const offset = clampShipmentsOffset(input.offset);
    return ok(filterAndPaginateEnviosShipments({ ...input, rows: all, limit, offset }));
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function listRouteMembersAction(): Promise<ActionResult<RouteMemberRow[]>> {
  try {
    const session = await requireAppSession();

    if (!sessionHasPermission(session, "routes.view") && !sessionHasPermission(session, "sales.manage")) {
      throw new Error("FORBIDDEN");
    }

    const result = await listProfileAssignments(session, isAssignableRouteMemberRole);
    return result;
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function listSalesOwnersAction(): Promise<ActionResult<SalesOwnerRow[]>> {
  try {
    const session = await requireAppSession();

    if (!canChangeShipmentSalesOwner(session)) {
      return ok([]);
    }

    const result = await listProfileAssignments(session, isSalesOwnerRole);
    return result;
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
