"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  WarehouseInventoryCorePayload,
  WarehouseInventoryHistoryPayload,
} from "@/app/actions/inventory/types";
import {
  actionErrorMessage,
  fail,
  ok,
  type ActionResult,
} from "@/lib/actions/errors";
import {
  canAccessWarehouse,
  sessionHasPermission,
} from "@/lib/auth/permissions";
import { requireAppSession } from "@/lib/auth/session";
import {
  ASSIGNMENT_SELECT,
  assignmentsFromDb,
  categoriesToConfig,
  categoryIdByNormalizedName,
  movementsFromDb,
  MOVEMENT_SELECT,
  stockRowsToItems,
  type DbAssignmentRow,
  type DbCategory,
  type DbStockRow,
} from "@/lib/inventory-backend";
import { isAgencyInventoryMovement } from "@/lib/inventory-movement-audit";
import {
  mergeOrphanItemsIntoCategoryConfigs,
} from "@/lib/inventory-stock";
import {
  resolveInventoryStockPage,
  type WarehouseInventoryStockQuery,
} from "@/lib/inventory-stock-pagination";
import { normalizeInventoryName } from "@/lib/inventory-tree";
import {
  resolveInventoryItemPhotoUrls,
} from "@/lib/inventory-photos";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createScopedSupabase } from "@/lib/supabase/scoped";

const STOCK_SELECT =
  "id, item_id, warehouse_id, stock, reserved, assigned, unavailable, min_stock, max_stock, avg_cost, inventory_items!inner(id, name, kind, subcategory, size, location, unit, photo_url, sku, barcode, description, inventory_class, preferred_supplier, requires_serial_tracking, requires_lot_tracking, requires_expiry_tracking, is_commercial, is_active, archived_at, category_id, inventory_categories(name))";

async function loadWarehouseInventoryCore(
  supabase: SupabaseClient,
  organizationId: string,
  warehouseId: string,
  options?: WarehouseInventoryStockQuery,
): Promise<ActionResult<WarehouseInventoryCorePayload>> {
  const { limit, offset } = resolveInventoryStockPage(options);
  const search = options?.search?.trim() || "";
  const kind = options?.kind?.trim() || "";
  let categoryId = options?.categoryId?.trim() || "";

  const { data: categories, error: catError } = await supabase
    .from("inventory_categories")
    .select("id, name, tree_data")
    .eq("organization_id", organizationId)
    .order("name");

  if (catError) {
    return fail(catError.message);
  }

  const categoryRows = (categories || []) as DbCategory[];

  if (!categoryId && options?.categoryName?.trim()) {
    categoryId =
      categoryIdByNormalizedName(categoryRows).get(
        normalizeInventoryName(options.categoryName),
      ) || "";
  }

  // Fetch limit+1 to detect hasMore without a separate count query.
  let stockQuery = supabase
    .from("inventory_stock")
    .select(STOCK_SELECT)
    .eq("warehouse_id", warehouseId)
    .eq("organization_id", organizationId)
    .order("name", { ascending: true, foreignTable: "inventory_items" })
    .order("id", { ascending: true })
    .range(offset, offset + limit);

  if (categoryId) {
    stockQuery = stockQuery.eq("inventory_items.category_id", categoryId);
  }

  if (kind) {
    stockQuery = stockQuery.eq("inventory_items.kind", kind);
  }

  if (search) {
    stockQuery = stockQuery.ilike("inventory_items.name", `%${search}%`);
  }

  const { data: stockRows, error: stockError } = await stockQuery;

  if (stockError) {
    return fail(stockError.message);
  }

  const rawRows = (stockRows || []) as unknown as DbStockRow[];
  const hasMore = rawRows.length > limit;
  const pageRows = hasMore ? rawRows.slice(0, limit) : rawRows;

  const categoryConfigs = categoriesToConfig(categoryRows);
  // stockRowsToItems preserves stock/reserved/assigned/unavailable so callers
  // can keep disponible = stock - reserved without recalculating on the server.
  let items = stockRowsToItems(pageRows);

  const admin = createSupabaseAdminClient();
  const photoPaths = items
    .map((item) => item.photoUrl)
    .filter((value): value is string => Boolean(value?.trim()));
  const signedByPath = await resolveInventoryItemPhotoUrls(
    admin,
    photoPaths,
    organizationId,
  );
  items = items.map((item) => ({
    ...item,
    photoUrl: item.photoUrl
      ? signedByPath.get(item.photoUrl) || undefined
      : undefined,
  }));

  // Do not merge the full category tree into `items`: that would re-inflate the
  // payload with zero-stock placeholders and defeat stock pagination. Structure
  // editing uses `categoryConfigs`; stock overlay uses this page of items.

  const syncedCategoryConfigs = mergeOrphanItemsIntoCategoryConfigs(
    categoryConfigs,
    items,
  );

  if (
    JSON.stringify(syncedCategoryConfigs) !==
    JSON.stringify(categoryConfigs)
  ) {
    const categoryIdByName = categoryIdByNormalizedName(categoryRows);

    for (const category of syncedCategoryConfigs) {
      const syncedCategoryId = categoryIdByName.get(
        normalizeInventoryName(category.name),
      );

      if (!syncedCategoryId) {
        continue;
      }

      const { error: healError } = await supabase
        .from("inventory_categories")
        .update({ tree_data: category.items || [] })
        .eq("id", syncedCategoryId);

      if (healError) {
        return fail(healError.message);
      }
    }
  }

  if (options?.debugCounts) {
    console.info(
      "[inventory-stock-page]",
      JSON.stringify({
        warehouseId,
        offset,
        limit,
        items: items.length,
        photoPaths: photoPaths.length,
        hasMore,
      }),
    );
  }

  return ok({
    categoryConfigs: syncedCategoryConfigs,
    items,
    stockPage: { limit, offset, hasMore },
  });
}

async function loadWarehouseInventoryHistory(
  supabase: SupabaseClient,
  organizationId: string,
  warehouseId: string,
  agencyModuleEnabled: boolean,
): Promise<ActionResult<WarehouseInventoryHistoryPayload>> {
  const [
    { data: movementRows, error: movError },
    { data: assignmentRows, error: assignError },
  ] = await Promise.all([
    supabase
      .from("inventory_movements")
      .select(MOVEMENT_SELECT)
      .eq("warehouse_id", warehouseId)
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("inventory_assignments")
      .select(ASSIGNMENT_SELECT)
      .eq("warehouse_id", warehouseId)
      .eq("organization_id", organizationId)
      .eq("status", "open")
      .order("assigned_at", { ascending: false }),
  ]);

  if (movError) {
    return fail(movError.message);
  }

  if (assignError) {
    return fail(assignError.message);
  }

  const movements = movementsFromDb(movementRows || []);

  return ok({
    movements: agencyModuleEnabled
      ? movements
      : movements.filter(
          (movement) => !isAgencyInventoryMovement(movement),
        ),
    assignments: assignmentsFromDb(
      (assignmentRows || []) as DbAssignmentRow[],
    ),
  });
}

async function requireInventoryWarehouseAccess(warehouseId: string) {
  const session = await requireAppSession();

  if (!sessionHasPermission(session, "inventory.view")) {
    throw new Error("FORBIDDEN");
  }

  if (!canAccessWarehouse(session, warehouseId)) {
    throw new Error("FORBIDDEN");
  }

  const supabase = await createScopedSupabase(session);
  if (!supabase) {
    return {
      session,
      supabase: null as SupabaseClient | null,
    };
  }

  return { session, supabase };
}

export async function loadWarehouseInventoryCoreAction(
  warehouseId: string,
  options?: WarehouseInventoryStockQuery,
): Promise<ActionResult<WarehouseInventoryCorePayload>> {
  try {
    const { session, supabase } =
      await requireInventoryWarehouseAccess(warehouseId);

    if (!supabase) {
      return fail("Supabase no configurado");
    }

    return loadWarehouseInventoryCore(
      supabase,
      session.organizationId,
      warehouseId,
      options,
    );
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function loadWarehouseInventoryHistoryAction(
  warehouseId: string,
): Promise<ActionResult<WarehouseInventoryHistoryPayload>> {
  try {
    const { session, supabase } =
      await requireInventoryWarehouseAccess(warehouseId);

    if (!supabase) {
      return fail("Supabase no configurado");
    }

    return loadWarehouseInventoryHistory(
      supabase,
      session.organizationId,
      warehouseId,
      session.agencyModuleEnabled,
    );
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
