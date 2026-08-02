import { canAccessWarehouse } from "@/lib/auth/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { AppSession } from "@/lib/auth/types";

import { asRecord } from "@/app/actions/shipments-data";

export async function resolveTaskWarehouse(session: AppSession, warehouseId?: string | null) {
  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Supabase service role no configurado");
  }

  if (warehouseId) {
    if (!canAccessWarehouse(session, warehouseId)) {
      throw new Error("No tienes acceso a esta bodega");
    }
    return { admin, warehouseId };
  }

  if (session.preferredWarehouseId && canAccessWarehouse(session, session.preferredWarehouseId)) {
    return { admin, warehouseId: session.preferredWarehouseId };
  }

  const { data: warehouse } = await admin
    .from("warehouses")
    .select("id")
    .eq("organization_id", session.organizationId)
    .eq("is_active", true)
    .order("is_default", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!warehouse?.id) {
    throw new Error("No hay bodega activa");
  }

  return { admin, warehouseId: warehouse.id as string };
}

function readEmptyBoxHandingNow(plan: Record<string, unknown>) {
  const emptyBox = asRecord(plan.emptyBox);
  return emptyBox.handingNow === true;
}

function emptyBoxStockAlreadyDeducted(plan: Record<string, unknown>) {
  const emptyBox = asRecord(plan.emptyBox);
  return Boolean(emptyBox.stockDeductedAt);
}

export function shouldDeductCounterHandingStock(plan: Record<string, unknown>) {
  if (!readEmptyBoxHandingNow(plan) || emptyBoxStockAlreadyDeducted(plan)) {
    return false;
  }

  const emptyBox = asRecord(plan.emptyBox);
  return String(emptyBox.mode || "") === "Cliente recoge caja vacia en oficina";
}
