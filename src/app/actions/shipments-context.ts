import { sessionHasPermission } from "@/lib/auth/permissions";
import { requireAppSession } from "@/lib/auth/session";
import { createScopedSupabase } from "@/lib/supabase/scoped";
import type { PermissionKey } from "@/lib/auth/types";

export async function requireShipmentActionContext(permission: PermissionKey) {
  const session = await requireAppSession();
  if (!sessionHasPermission(session, permission)) {
    throw new Error("FORBIDDEN");
  }

  const supabase = await createScopedSupabase(session);
  if (!supabase) {
    throw new Error("Supabase no configurado");
  }

  return { session, supabase };
}
