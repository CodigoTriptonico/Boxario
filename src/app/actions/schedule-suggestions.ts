"use server";

import { revalidatePath } from "next/cache";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import { sessionHasPermission } from "@/lib/auth/permissions";
import { requireAppSession } from "@/lib/auth/session";
import {
  normalizeScheduleSuggestionConfig,
  type ScheduleSuggestionConfig,
  type ScheduleSuggestionModes,
} from "@/lib/sale/schedule-suggestions";
import { createScopedSupabase } from "@/lib/supabase/scoped";

export async function saveScheduleSuggestionsAction(input: {
  service: "delivery" | "pickup";
  suggestions: ScheduleSuggestionModes;
}): Promise<ActionResult<ScheduleSuggestionConfig>> {
  try {
    const session = await requireAppSession();

    if (
      !sessionHasPermission(session, "sales.settings.manage") &&
      !sessionHasPermission(session, "settings.manage")
    ) {
      throw new Error("FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const { data: current, error: currentError } = await supabase
      .from("organization_route_settings")
      .select("schedule_suggestions, minimum_deposit, pending_allowed")
      .eq("organization_id", session.organizationId)
      .maybeSingle();

    if (currentError) {
      return fail(currentError.message);
    }

    const next = normalizeScheduleSuggestionConfig(current?.schedule_suggestions);
    const suggestions = normalizeScheduleSuggestionConfig({
      [input.service]: input.suggestions,
    })[input.service];
    next[input.service] = suggestions;
    const { error } = await supabase.rpc("save_sales_axis_settings", {
      p_schedule_suggestions: next,
      p_minimum_deposit: current?.minimum_deposit || "$20",
      p_pending_allowed: current?.pending_allowed ?? true,
    });

    if (error) {
      return fail(error.message);
    }

    revalidatePath("/seguimiento");
    revalidatePath("/venta");
    return ok(next);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
