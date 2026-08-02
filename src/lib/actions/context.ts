import { sessionHasPermission } from "@/lib/auth/permissions";
import { requireAppSession } from "@/lib/auth/session";
import type { AppSession, PermissionKey } from "@/lib/auth/types";
import { createScopedSupabase } from "@/lib/supabase/scoped";

export function sessionHasAnyPermission(
  session: AppSession,
  permissions: readonly PermissionKey[],
) {
  return permissions.some((permission) => sessionHasPermission(session, permission));
}

export async function requireScopedActionContext(
  permissions: readonly PermissionKey[],
) {
  const session = await requireAppSession();
  if (!sessionHasAnyPermission(session, permissions)) {
    throw new Error("FORBIDDEN");
  }

  const supabase = await createScopedSupabase(session);
  if (!supabase) {
    throw new Error("Supabase no configurado");
  }

  return { session, supabase };
}
