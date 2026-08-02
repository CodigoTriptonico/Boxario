import type { SupabaseClient } from "@supabase/supabase-js";
import type { AppSession } from "@/lib/auth/types";

export type ActivityHistoryInput = {
  action: string;
  entityType: string;
  entityId?: string | null;
  title: string;
  description?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Operational activity journal write path.
 * Authenticated JWT callers: actor/org derived in SQL from auth.uid().
 * Service-role server callers: pass session actor/org (never exposed to browsers).
 * Distinct from immutable_audit_events (compliance ledger).
 */
export async function recordActivityHistory(
  supabase: SupabaseClient,
  session: AppSession,
  input: ActivityHistoryInput,
) {
  const { error } = await supabase.rpc("record_activity_history", {
    p_action: input.action,
    p_entity_type: input.entityType,
    p_entity_id: input.entityId || null,
    p_title: input.title,
    p_description: input.description || "",
    p_metadata: input.metadata || {},
    p_organization_id: session.organizationId,
    p_actor_id: session.userId,
    p_actor_name: session.fullName || session.email,
  });

  if (error && error.code !== "42P01" && error.code !== "PGRST202") {
    throw new Error(error.message);
  }
}
