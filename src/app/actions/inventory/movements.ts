"use server";

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
  movementsFromDb,
  MOVEMENT_SELECT,
} from "@/lib/inventory-backend";
import {
  ensureInventoryLeafState,
  inventoryLeafStateToItem,
} from "@/lib/inventory-leaf-state";
import {
  normalizeReasonCodeForMovementType,
  type InventoryMovementReasonCode,
} from "@/lib/inventory-movement-audit";
import { collectInventorySupplierTagsFromMovements } from "@/lib/inventory-supplier-tags";
import type { InventoryStockItem } from "@/lib/inventory-stock";
import type { InventoryMovement } from "@/lib/inventory-types";
import { recordInventoryMovementAtomic } from "@/lib/security/inventory-movement";
import {
  InvalidQuantityError,
  readNonNegativeIntegerQty,
  readPositiveQty,
} from "@/lib/security/qty";
import { createScopedSupabase } from "@/lib/supabase/scoped";

export async function recordInventoryMovementForLeafAction(input: {
  warehouseId: string;
  category: string;
  kind: string;
  subcategory?: string;
  itemName: string;
  type: "entrada" | "salida" | "ajuste";
  qty: number;
  note?: string;
  supplierName?: string;
  invoiceReference?: string;
  purchaseDate?: string;
  reasonCode?: InventoryMovementReasonCode;
  minStock?: number;
  unitCost?: number | null;
  totalCost?: number | null;
}): Promise<
  ActionResult<{
    item: InventoryStockItem;
    movement: InventoryMovement;
  }>
> {
  try {
    const session = await requireAppSession();
    const canAdjust = sessionHasPermission(
      session,
      "inventory.adjust",
    );
    const canReserve = sessionHasPermission(
      session,
      "inventory.reserve",
    );

    if (
      (input.type === "entrada" || input.type === "ajuste") &&
      !canAdjust
    ) {
      throw new Error("FORBIDDEN");
    }

    if (
      input.type === "salida" &&
      !canReserve &&
      !canAdjust
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
    const { itemName, itemRow } = leafState;
    const qty =
      input.type === "ajuste"
        ? readNonNegativeIntegerQty(input.qty)
        : readPositiveQty(input.qty);
    const entradaEvidence: Record<string, string> = {};

    if (input.type === "entrada") {
      const supplierName = input.supplierName?.trim();
      if (supplierName) {
        entradaEvidence.supplierName = supplierName;
      }

      const invoiceReference = input.invoiceReference?.trim();
      if (invoiceReference) {
        entradaEvidence.invoiceReference = invoiceReference;
      }

      const purchaseDate = input.purchaseDate?.trim();
      if (purchaseDate) {
        entradaEvidence.purchaseDate = purchaseDate;
      }
    }

    const result = await recordInventoryMovementAtomic(supabase, {
      organizationId: session.organizationId,
      warehouseId: input.warehouseId,
      itemId: itemRow.id,
      itemName: itemRow.name || itemName,
      type: input.type,
      qty,
      note: input.note,
      evidence:
        input.type === "entrada" ? entradaEvidence : {},
      reasonCode: normalizeReasonCodeForMovementType(
        input.type,
        input.reasonCode,
      ),
      createdBy: session.userId,
      unitCost:
        input.type === "entrada"
          ? (input.unitCost ?? null)
          : null,
      totalCost:
        input.type === "entrada"
          ? (input.totalCost ?? null)
          : null,
    });

    const { data: movement, error: movError } = await supabase
      .from("inventory_movements")
      .select(MOVEMENT_SELECT)
      .eq("id", result.movementId)
      .single();

    if (movError || !movement) {
      return fail(
        movError?.message ||
          "No se pudo registrar el movimiento",
      );
    }

    return ok({
      item: inventoryLeafStateToItem(
        leafState,
        result.stock,
        result.avgCost,
      ),
      movement: movementsFromDb([movement])[0],
    });
  } catch (error) {
    if (error instanceof InvalidQuantityError) {
      return fail(error.message);
    }

    return fail(actionErrorMessage(error));
  }
}

export async function listInventorySupplierTagsAction(): Promise<
  ActionResult<string[]>
> {
  try {
    const session = await requireAppSession();

    if (!sessionHasPermission(session, "inventory.view")) {
      throw new Error("FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const { data, error } = await supabase
      .from("inventory_movements")
      .select("evidence, created_at")
      .eq("organization_id", session.organizationId)
      .eq("type", "entrada")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      return fail(error.message);
    }

    const tags = collectInventorySupplierTagsFromMovements(
      (data || []).map((row) => ({
        evidence: row.evidence,
      })),
    );

    return ok(tags);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
