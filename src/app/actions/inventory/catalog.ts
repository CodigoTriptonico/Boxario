"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
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
  categoriesToConfig,
  categoryIdByNormalizedName,
  resolveInventoryLeafItem,
  type DbCategory,
} from "@/lib/inventory-backend";
import {
  ensureInventoryLeafState,
  inventoryLeafStateToItem,
} from "@/lib/inventory-leaf-state";
import {
  normalizeInventoryItemPhotoPath,
} from "@/lib/inventory-photos";
import type { InventoryStockItem } from "@/lib/inventory-stock";
import {
  collectCategoryTreeLeaves,
  inventoryLeafKey,
  mergeOrphanItemsIntoCategoryConfigs,
} from "@/lib/inventory-stock";
import {
  categorySubcategories,
  normalizeInventoryName,
  type CategoryConfig,
} from "@/lib/inventory-tree";
import {
  DEFAULT_INVENTORY_UNIT,
  normalizeInventoryUnit,
} from "@/lib/inventory-units";
import { recordInventoryMovementAtomic } from "@/lib/security/inventory-movement";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createScopedSupabase } from "@/lib/supabase/scoped";

async function saveInventoryCategoriesAction(
  categoryConfigs: CategoryConfig[],
): Promise<ActionResult<null>> {
  try {
    const session = await requireAppSession();

    if (
      !sessionHasPermission(session, "settings.manage") &&
      !sessionHasPermission(session, "warehouses.manage") &&
      !sessionHasPermission(session, "inventory.adjust")
    ) {
      throw new Error("FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const categoryNames = new Set<string>();

    for (const category of categoryConfigs) {
      const categoryKey = normalizeInventoryName(category.name);

      if (!categoryKey) {
        return fail("La categoría no puede estar vacía");
      }

      if (categoryNames.has(categoryKey)) {
        return fail("No se pueden crear categorías duplicadas");
      }

      categoryNames.add(categoryKey);

      const subcategoryNames = new Set<string>();

      for (const subcategory of categorySubcategories(category)) {
        const subcategoryKey = normalizeInventoryName(
          subcategory.name,
        );

        if (!subcategoryKey) {
          return fail("La subcategoría no puede estar vacía");
        }

        if (subcategoryNames.has(subcategoryKey)) {
          return fail(
            `No se pueden crear subcategorías duplicadas en ${category.name}`,
          );
        }

        subcategoryNames.add(subcategoryKey);
      }
    }

    const { data: existing } = await supabase
      .from("inventory_categories")
      .select("id, name")
      .eq("organization_id", session.organizationId);

    if (
      categoryConfigs.length === 0 &&
      (existing || []).length > 0
    ) {
      return fail(
        "No se puede borrar todo el inventario desde un estado vacío",
      );
    }

    const existingByNormalizedName = new Map(
      (existing || []).map((row) => [
        normalizeInventoryName(row.name),
        row,
      ]),
    );
    const incomingNormalizedNames = new Set(
      categoryConfigs.map((category) =>
        normalizeInventoryName(category.name),
      ),
    );
    const toDelete = (existing || []).filter(
      (row) =>
        !incomingNormalizedNames.has(
          normalizeInventoryName(row.name),
        ),
    );

    await assertCategoryDeletionDoesNotBreakHistory(
      supabase,
      session.organizationId,
      toDelete.map((row) => row.id),
    );

    for (const category of categoryConfigs) {
      const payload = {
        organization_id: session.organizationId,
        name: category.name,
        tree_data: category.items || [],
      };
      const existingRow = existingByNormalizedName.get(
        normalizeInventoryName(category.name),
      );

      if (existingRow) {
        const { error } = await supabase
          .from("inventory_categories")
          .update({
            name: category.name,
            tree_data: payload.tree_data,
          })
          .eq("id", existingRow.id);

        if (error) {
          return fail(error.message);
        }
      } else {
        const { error } = await supabase
          .from("inventory_categories")
          .insert(payload);

        if (error) {
          return fail(error.message);
        }
      }
    }

    if (toDelete.length) {
      const { error } = await supabase
        .from("inventory_categories")
        .delete()
        .in(
          "id",
          toDelete.map((row) => row.id),
        );

      if (error) {
        return fail(error.message);
      }
    }

    return ok(null);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

async function ensureLeafInCategoryTree(
  supabase: SupabaseClient,
  organizationId: string,
  categoryName: string,
  kind: string,
  subcategory: string | null,
) {
  const { data: categoryRow, error: categoryError } = await supabase
    .from("inventory_categories")
    .select("id, name, tree_data")
    .eq("organization_id", organizationId)
    .eq("name", categoryName)
    .maybeSingle();

  if (categoryError || !categoryRow) {
    return;
  }

  const categoryConfigs = categoriesToConfig([
    categoryRow as DbCategory,
  ]);
  const syncedCategoryConfigs =
    mergeOrphanItemsIntoCategoryConfigs(categoryConfigs, [
      {
        id: "sync",
        name: kind,
        category: categoryName,
        kind,
        subcategory: subcategory || undefined,
        stock: 0,
        reserved: 0,
        assigned: 0,
        unavailable: 0,
        minStock: 2,
      },
    ]);

  if (
    JSON.stringify(syncedCategoryConfigs) ===
    JSON.stringify(categoryConfigs)
  ) {
    return;
  }

  await supabase
    .from("inventory_categories")
    .update({
      tree_data: syncedCategoryConfigs[0]?.items || [],
    })
    .eq("id", categoryRow.id);
}

async function pruneWarehouseItemsNotInTree(
  supabase: SupabaseClient,
  organizationId: string,
  warehouseId: string,
  categoryConfigs: CategoryConfig[],
) {
  const allowedKeys = new Set(
    categoryConfigs.flatMap((category) =>
      collectCategoryTreeLeaves(category).map((leaf) =>
        inventoryLeafKey(leaf),
      ),
    ),
  );

  const { data: stockRows, error: stockError } = await supabase
    .from("inventory_stock")
    .select(
      "id, item_id, stock, reserved, assigned, unavailable, inventory_items(id, kind, subcategory, inventory_categories(name))",
    )
    .eq("warehouse_id", warehouseId)
    .eq("organization_id", organizationId);

  if (stockError) {
    throw new Error(stockError.message);
  }

  for (const row of stockRows || []) {
    const itemRow = Array.isArray(row.inventory_items)
      ? row.inventory_items[0]
      : row.inventory_items;

    if (!itemRow) {
      continue;
    }

    const categoryRow = Array.isArray(
      itemRow.inventory_categories,
    )
      ? itemRow.inventory_categories[0]
      : itemRow.inventory_categories;
    const key = inventoryLeafKey({
      category: categoryRow?.name || "",
      kind: itemRow.kind,
      subcategory: itemRow.subcategory || undefined,
    });

    if (allowedKeys.has(key)) {
      continue;
    }

    const stock = Number(row.stock ?? 0);
    const reserved = Number(row.reserved ?? 0);
    const assigned = Number(row.assigned ?? 0);
    const unavailable = Number(row.unavailable ?? 0);

    if (
      stock !== 0 ||
      reserved !== 0 ||
      assigned !== 0 ||
      unavailable !== 0
    ) {
      continue;
    }

    const [
      { count: movementCount, error: movementError },
      { count: assignmentCount, error: assignmentError },
    ] = await Promise.all([
      supabase
        .from("inventory_movements")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("item_id", row.item_id),
      supabase
        .from("inventory_assignments")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("item_id", row.item_id),
    ]);

    if (movementError) {
      throw new Error(movementError.message);
    }

    if (assignmentError) {
      throw new Error(assignmentError.message);
    }

    if (
      (movementCount || 0) > 0 ||
      (assignmentCount || 0) > 0
    ) {
      continue;
    }

    await supabase
      .from("inventory_stock")
      .delete()
      .eq("id", row.id);

    // An item with history is a ledger anchor. Keep inventory_items even when
    // its current warehouse stock and catalog leaf were removed.
  }
}

async function assertCategoryDeletionDoesNotBreakHistory(
  supabase: SupabaseClient,
  organizationId: string,
  categoryIds: string[],
) {
  if (!categoryIds.length) {
    return;
  }

  const { data: itemRows, error: itemError } = await supabase
    .from("inventory_items")
    .select("id")
    .eq("organization_id", organizationId)
    .in("category_id", categoryIds);

  if (itemError) {
    throw new Error(itemError.message);
  }

  const itemIds = (itemRows || []).map((row) => row.id);

  if (!itemIds.length) {
    return;
  }

  // A manager may no longer have access to the warehouse where old history
  // lives, so the guard must see the whole organization.
  const auditClient = createSupabaseAdminClient();
  if (!auditClient) {
    throw new Error("Supabase no configurado");
  }
  const [
    { count: movementCount, error: movementError },
    { count: assignmentCount, error: assignmentError },
  ] = await Promise.all([
    auditClient
      .from("inventory_movements")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("item_id", itemIds),
    auditClient
      .from("inventory_assignments")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .in("item_id", itemIds),
  ]);

  if (movementError) {
    throw new Error(movementError.message);
  }

  if (assignmentError) {
    throw new Error(assignmentError.message);
  }

  if (
    (movementCount || 0) > 0 ||
    (assignmentCount || 0) > 0
  ) {
    throw new Error(
      "No se puede eliminar una categoría con historial de movimientos o asignaciones. Conserva la categoría y cambia su estructura.",
    );
  }
}

async function ensureItemsForWarehouse(
  supabase: SupabaseClient,
  organizationId: string,
  warehouseId: string,
  categoryConfigs: CategoryConfig[],
  items: InventoryStockItem[],
  createdBy: string,
) {
  const { data: categories } = await supabase
    .from("inventory_categories")
    .select("id, name")
    .eq("organization_id", organizationId);

  const categoryIdByName = categoryIdByNormalizedName(
    categories || [],
  );

  for (const leaf of categoryConfigs.flatMap((category) =>
    collectCategoryTreeLeaves(category).map((entry) => ({
      ...entry,
      categoryId: categoryIdByName.get(
        normalizeInventoryName(category.name),
      ),
    })),
  )) {
    if (!leaf.categoryId) {
      continue;
    }

    const match = items.find(
      (item) =>
        item.category === leaf.category &&
        item.kind === leaf.kind &&
        (item.subcategory || "") === (leaf.subcategory || ""),
    );

    let itemId = match?.id;
    const stockItem =
      items.find((item) => item.id === match?.id) || match;

    if (
      !itemId ||
      itemId.startsWith("inv-") ||
      itemId.startsWith("virtual-")
    ) {
      const { data: existingItem, error: existingItemError } =
        await resolveInventoryLeafItem(supabase, {
          organizationId,
          categoryId: leaf.categoryId,
          kind: leaf.kind,
          subcategory: leaf.subcategory || null,
          warehouseId,
        });

      if (existingItemError) {
        throw new Error(existingItemError);
      }

      if (existingItem?.id) {
        itemId = existingItem.id;
      } else {
        const { data: inserted, error } = await supabase
          .from("inventory_items")
          .insert({
            organization_id: organizationId,
            category_id: leaf.categoryId,
            name: leaf.name,
            kind: leaf.kind,
            subcategory: leaf.subcategory || null,
            unit:
              normalizeInventoryUnit(stockItem?.unit) ||
              DEFAULT_INVENTORY_UNIT,
            photo_url: stockItem?.photoUrl
              ? normalizeInventoryItemPhotoPath(
                  stockItem.photoUrl,
                  organizationId,
                )
              : "",
          })
          .select("id")
          .single();

        if (error || !inserted) {
          throw new Error(error?.message || "No se pudo crear item");
        }

        itemId = inserted.id;
      }
    }

    if (!itemId) {
      throw new Error("No se pudo resolver item de inventario");
    }

    const photoPath = stockItem?.photoUrl
      ? normalizeInventoryItemPhotoPath(
          stockItem.photoUrl,
          organizationId,
        )
      : "";
    const unit =
      normalizeInventoryUnit(stockItem?.unit) ||
      DEFAULT_INVENTORY_UNIT;
    const itemUpdates: { photo_url?: string; unit: string } = {
      unit,
    };

    if (photoPath) {
      itemUpdates.photo_url = photoPath;
    }

    const { error: itemUpdateError } = await supabase
      .from("inventory_items")
      .update(itemUpdates)
      .eq("id", itemId)
      .eq("organization_id", organizationId);

    if (itemUpdateError) {
      throw new Error(itemUpdateError.message);
    }

    const { data: stockRow } = await supabase
      .from("inventory_stock")
      .select("id, stock")
      .eq("warehouse_id", warehouseId)
      .eq("item_id", itemId)
      .maybeSingle();

    const stockPayload = {
      organization_id: organizationId,
      warehouse_id: warehouseId,
      item_id: itemId,
      stock: 0,
      // Authoritative quantities only change through inventory movement or
      // reservation commands; catalog editing cannot inject a balance.
      reserved: 0,
      min_stock: stockItem?.minStock ?? 2,
    };

    // Paginated stock loads only send the current page. Never treat a missing
    // or virtual leaf as stock=0 — that would wipe reserved/assigned balances.
    const clientOwnsBalance =
      Boolean(stockItem?.id) &&
      !stockItem!.id.startsWith("inv-") &&
      !stockItem!.id.startsWith("virtual-");

    if (stockRow?.id) {
      if (clientOwnsBalance) {
        await supabase
          .from("inventory_stock")
          .update({ min_stock: stockPayload.min_stock })
          .eq("id", stockRow.id);
      }
    } else {
      await supabase.from("inventory_stock").insert(stockPayload);
    }

    if (!clientOwnsBalance) {
      continue;
    }

    const desiredStock = Math.max(
      Number(stockItem?.stock ?? 0) || 0,
      0,
    );
    const currentStock = Number(stockRow?.stock ?? 0) || 0;

    if (desiredStock !== currentStock) {
      const movementType =
        desiredStock > 0 ? "ajuste" : "salida";
      const movementQty =
        desiredStock > 0 ? desiredStock : currentStock;

      if (movementQty > 0) {
        await recordInventoryMovementAtomic(supabase, {
          organizationId,
          warehouseId,
          itemId,
          itemName: stockItem?.name || leaf.name,
          type: movementType,
          qty: movementQty,
          note: `Ajuste manual de inventario - ${stockItem?.name || leaf.name}`,
          createdBy,
        });
      }
    }
  }
}

async function saveWarehouseInventoryState(
  supabase: SupabaseClient,
  organizationId: string,
  warehouseId: string,
  categoryConfigs: CategoryConfig[],
  items: InventoryStockItem[],
  createdBy: string,
  options?: { persistCategories?: boolean },
) {
  const syncedCategoryConfigs =
    mergeOrphanItemsIntoCategoryConfigs(categoryConfigs, items);

  if (options?.persistCategories !== false) {
    const categoriesResult =
      await saveInventoryCategoriesAction(syncedCategoryConfigs);

    if (!categoriesResult.ok) {
      throw new Error(categoriesResult.error);
    }
  }

  await ensureItemsForWarehouse(
    supabase,
    organizationId,
    warehouseId,
    syncedCategoryConfigs,
    items,
    createdBy,
  );

  if (options?.persistCategories !== false) {
    await pruneWarehouseItemsNotInTree(
      supabase,
      organizationId,
      warehouseId,
      syncedCategoryConfigs,
    );
  }
}

export async function saveWarehouseInventoryAction(input: {
  warehouseId: string;
  categoryConfigs: CategoryConfig[];
  items: InventoryStockItem[];
}): Promise<ActionResult<null>> {
  try {
    const session = await requireAppSession();

    if (
      !sessionHasPermission(session, "inventory.adjust") &&
      !sessionHasPermission(session, "inventory.reserve")
    ) {
      throw new Error("FORBIDDEN");
    }

    if (!canAccessWarehouse(session, input.warehouseId)) {
      throw new Error("FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    await saveWarehouseInventoryState(
      supabase,
      session.organizationId,
      input.warehouseId,
      input.categoryConfigs,
      input.items,
      session.userId,
    );

    return ok(null);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function ensureInventoryLeafItemAction(input: {
  warehouseId: string;
  category: string;
  kind: string;
  subcategory?: string;
  itemName: string;
  minStock?: number;
}): Promise<ActionResult<InventoryStockItem>> {
  try {
    const session = await requireAppSession();

    if (
      !sessionHasPermission(session, "inventory.view") &&
      !sessionHasPermission(session, "inventory.assign")
    ) {
      throw new Error("FORBIDDEN");
    }

    if (!canAccessWarehouse(session, input.warehouseId)) {
      throw new Error("FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const leafResult = await ensureInventoryLeafState(
      supabase,
      session.organizationId,
      input,
    );

    if (!leafResult.ok) {
      return fail(leafResult.error);
    }

    const leafState = leafResult.data;
    const { categoryName, kind, subcategory } = leafState;
    await ensureLeafInCategoryTree(
      supabase,
      session.organizationId,
      categoryName,
      kind,
      subcategory,
    );

    return ok(inventoryLeafStateToItem(leafState));
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
