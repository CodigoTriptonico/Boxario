"use server";

import {
  actionErrorMessage,
  fail,
  ok,
  type ActionResult,
} from "@/lib/actions/errors";
import { sessionHasPermission } from "@/lib/auth/permissions";
import { requireAppSession } from "@/lib/auth/session";
import { ensureInventoryLeafState } from "@/lib/inventory-leaf-state";
import {
  buildInventoryItemPhotoPath,
  INVENTORY_ITEM_PHOTO_BUCKET,
  resolveInventoryItemPhotoUrl,
  validateInventoryItemPhoto,
} from "@/lib/inventory-photos";
import { normalizeInventoryUnit } from "@/lib/inventory-units";
import { decodeAndSanitizeImage } from "@/lib/security/safe-image";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createScopedSupabase } from "@/lib/supabase/scoped";

function isPersistedInventoryItemId(itemId: string) {
  return (
    Boolean(itemId) &&
    !itemId.startsWith("inv-") &&
    !itemId.startsWith("virtual-")
  );
}

export async function uploadInventoryItemPhotoAction(
  formData: FormData,
): Promise<
  ActionResult<{ path: string; previewUrl: string }>
> {
  try {
    const session = await requireAppSession();

    if (
      !sessionHasPermission(session, "inventory.adjust") &&
      !sessionHasPermission(session, "sales.manage")
    ) {
      return fail("Sin permiso para actualizar inventario");
    }

    const admin = createSupabaseAdminClient();

    if (!admin) {
      return fail("Supabase no configurado");
    }

    const file = formData.get("photo");

    if (!(file instanceof File) || !file.name) {
      return fail("Foto requerida");
    }

    const validation = validateInventoryItemPhoto(file);

    if (!validation.ok) {
      return fail(validation.error);
    }

    const safeImage = await decodeAndSanitizeImage(file, {
      maxBytes: 4 * 1024 * 1024,
    });
    const path = buildInventoryItemPhotoPath(
      session.organizationId,
      `photo.${safeImage.extension}`,
    );
    const { error } = await admin.storage
      .from(INVENTORY_ITEM_PHOTO_BUCKET)
      .upload(path, safeImage.bytes, {
        contentType: safeImage.contentType,
        upsert: false,
      });

    if (error) {
      return fail(error.message);
    }

    const previewUrl = await resolveInventoryItemPhotoUrl(
      admin,
      path,
      session.organizationId,
    );
    const itemId = String(formData.get("itemId") || "").trim();

    if (isPersistedInventoryItemId(itemId)) {
      const { error: updateError } = await admin
        .from("inventory_items")
        .update({ photo_url: path })
        .eq("id", itemId)
        .eq("organization_id", session.organizationId);

      if (updateError) {
        return fail(updateError.message);
      }
    }

    return ok({ path, previewUrl });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function clearInventoryItemPhotoAction(
  itemId: string,
): Promise<ActionResult<null>> {
  try {
    const session = await requireAppSession();

    if (
      !sessionHasPermission(session, "inventory.adjust") &&
      !sessionHasPermission(session, "sales.manage")
    ) {
      return fail("Sin permiso para actualizar inventario");
    }

    if (!isPersistedInventoryItemId(itemId)) {
      return ok(null);
    }

    const admin = createSupabaseAdminClient();

    if (!admin) {
      return fail("Supabase no configurado");
    }

    const { error } = await admin
      .from("inventory_items")
      .update({ photo_url: "" })
      .eq("id", itemId)
      .eq("organization_id", session.organizationId);

    if (error) {
      return fail(error.message);
    }

    return ok(null);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function updateInventoryItemUnitAction(input: {
  itemId: string;
  unit: string;
  warehouseId?: string;
  category?: string;
  kind?: string;
  subcategory?: string;
  itemName?: string;
}): Promise<ActionResult<{ unit: string; itemId: string }>> {
  try {
    const session = await requireAppSession();

    if (
      !sessionHasPermission(session, "inventory.adjust") &&
      !sessionHasPermission(session, "sales.manage")
    ) {
      return fail("Sin permiso para actualizar inventario");
    }

    const unit = normalizeInventoryUnit(input.unit);

    if (!unit) {
      return fail("Unidad de medida requerida");
    }

    const supabase = await createScopedSupabase(session);

    if (!supabase) {
      return fail("Supabase no configurado");
    }

    let itemId = input.itemId.trim();

    if (!isPersistedInventoryItemId(itemId)) {
      if (
        !input.warehouseId ||
        !input.category?.trim() ||
        !input.kind?.trim()
      ) {
        return ok({ unit, itemId });
      }

      const leafResult = await ensureInventoryLeafState(
        supabase,
        session.organizationId,
        {
          warehouseId: input.warehouseId,
          category: input.category,
          kind: input.kind,
          subcategory: input.subcategory,
          itemName: input.itemName || input.kind,
        },
      );

      if (!leafResult.ok) {
        return fail(leafResult.error);
      }

      itemId = leafResult.data.itemRow.id;
    }

    const { error } = await supabase
      .from("inventory_items")
      .update({ unit })
      .eq("id", itemId)
      .eq("organization_id", session.organizationId);

    if (error) {
      return fail(error.message);
    }

    return ok({ unit, itemId });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function updateInventoryItemMetadataAction(input: {
  itemId: string;
  warehouseId?: string;
  category?: string;
  kind?: string;
  subcategory?: string;
  itemName?: string;
  name?: string;
  sku?: string;
  unit?: string;
  minStock?: number;
  isCommercial?: boolean;
  isActive?: boolean;
}): Promise<ActionResult<{ itemId: string }>> {
  try {
    const session = await requireAppSession();

    if (
      !sessionHasPermission(session, "inventory.adjust") &&
      !sessionHasPermission(session, "settings.manage") &&
      !sessionHasPermission(session, "warehouses.manage")
    ) {
      return fail("Sin permiso para actualizar inventario");
    }

    const supabase = await createScopedSupabase(session);

    if (!supabase) {
      return fail("Supabase no configurado");
    }

    let itemId = input.itemId.trim();

    if (!isPersistedInventoryItemId(itemId)) {
      if (
        !input.warehouseId ||
        !input.category?.trim() ||
        !input.kind?.trim()
      ) {
        return fail("Item no persistido");
      }

      const leafResult = await ensureInventoryLeafState(
        supabase,
        session.organizationId,
        {
          warehouseId: input.warehouseId,
          category: input.category,
          kind: input.kind,
          subcategory: input.subcategory,
          itemName: input.itemName || input.kind,
          minStock: input.minStock,
        },
      );

      if (!leafResult.ok) {
        return fail(leafResult.error);
      }

      itemId = leafResult.data.itemRow.id;
    }

    const itemPatch: Record<string, unknown> = {};

    if (input.name?.trim()) {
      itemPatch.name = input.name.trim();
    }

    if (input.sku !== undefined) {
      itemPatch.sku = input.sku.trim() || null;
    }

    if (input.unit !== undefined) {
      const unit = normalizeInventoryUnit(input.unit);
      if (!unit) {
        return fail("Unidad de medida requerida");
      }
      itemPatch.unit = unit;
    }

    if (input.isCommercial !== undefined) {
      itemPatch.is_commercial = input.isCommercial;
    }

    if (input.isActive !== undefined) {
      itemPatch.is_active = input.isActive;
    }

    if (Object.keys(itemPatch).length) {
      const { error } = await supabase
        .from("inventory_items")
        .update(itemPatch)
        .eq("id", itemId)
        .eq("organization_id", session.organizationId);

      if (error) {
        return fail(error.message);
      }
    }

    if (
      input.minStock !== undefined &&
      input.warehouseId
    ) {
      const { error } = await supabase
        .from("inventory_stock")
        .update({
          min_stock: Math.max(0, input.minStock),
        })
        .eq("item_id", itemId)
        .eq("warehouse_id", input.warehouseId)
        .eq("organization_id", session.organizationId);

      if (error) {
        return fail(error.message);
      }
    }

    return ok({ itemId });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
