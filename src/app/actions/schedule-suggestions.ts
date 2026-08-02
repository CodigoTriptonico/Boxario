"use server";

import { revalidatePath } from "next/cache";
import { requireScopedActionContext } from "@/lib/actions/context";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import {
  isScheduleSuggestionModeKey,
  normalizeScheduleSuggestionConfig,
  setSharedScheduleSuggestionModeEnabledForWeekday,
  setSharedScheduleSuggestionModesForWeekday,
  setScheduleSuggestionModeEnabledForWeekday,
  setScheduleSuggestionModesForWeekday,
  type ScheduleSuggestionConfig,
  type ScheduleSuggestionModeKey,
  type ScheduleSuggestionService,
  type ScheduleSuggestionModes,
} from "@/lib/sale/schedule-suggestions";
import { DEFAULT_MINIMUM_DEPOSIT } from "@/lib/invoice-billing";

type ScheduleSuggestionTarget = ScheduleSuggestionService | "shared";

type ScheduleSuggestionUpdate = {
  service: ScheduleSuggestionTarget;
  weekday: number;
  update: (config: ScheduleSuggestionConfig) => ScheduleSuggestionConfig;
};

async function persistScheduleSuggestionUpdate(
  input: ScheduleSuggestionUpdate,
): Promise<ActionResult<ScheduleSuggestionConfig>> {
  try {
    const { session, supabase } = await requireScopedActionContext([
      "sales.settings.manage",
      "settings.manage",
    ]);

    const { data: current, error: currentError } = await supabase
      .from("organization_route_settings")
      .select("schedule_suggestions, minimum_deposit, pending_allowed")
      .eq("organization_id", session.organizationId)
      .maybeSingle();

    if (currentError) {
      return fail(currentError.message);
    }

    if (!Number.isInteger(input.weekday) || input.weekday < 0 || input.weekday > 6) {
      return fail("Día de ruta inválido");
    }

    const next = normalizeScheduleSuggestionConfig(current?.schedule_suggestions);
    const updated = input.update(next);
    const { error } = await supabase.rpc("save_sales_axis_settings", {
      p_schedule_suggestions: updated,
      p_minimum_deposit: current?.minimum_deposit || DEFAULT_MINIMUM_DEPOSIT,
      p_pending_allowed: current?.pending_allowed ?? true,
    });

    if (error) {
      return fail(error.message);
    }

    revalidatePath("/seguimiento");
    revalidatePath("/venta");
    return ok(updated);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function saveScheduleSuggestionsAction(input: {
  service: ScheduleSuggestionTarget;
  weekday: number;
  suggestions: ScheduleSuggestionModes;
}): Promise<ActionResult<ScheduleSuggestionConfig>> {
  return persistScheduleSuggestionUpdate({
    service: input.service,
    weekday: input.weekday,
    update: (config) =>
      input.service === "shared"
        ? setSharedScheduleSuggestionModesForWeekday(config, input.weekday, input.suggestions)
        : setScheduleSuggestionModesForWeekday(
            config,
            input.weekday,
            input.service,
            input.suggestions,
          ),
  });
}

export async function setScheduleSuggestionModeEnabledAction(input: {
  service: ScheduleSuggestionTarget;
  weekday: number;
  mode: ScheduleSuggestionModeKey;
  enabled: boolean;
}): Promise<ActionResult<ScheduleSuggestionConfig>> {
  if (!isScheduleSuggestionModeKey(input.mode)) {
    return fail("Modalidad horaria inválida");
  }

  if (typeof input.enabled !== "boolean") {
    return fail("Estado de modalidad horaria inválido");
  }

  return persistScheduleSuggestionUpdate({
    service: input.service,
    weekday: input.weekday,
    update: (config) =>
      input.service === "shared"
        ? setSharedScheduleSuggestionModeEnabledForWeekday(
            config,
            input.weekday,
            input.mode,
            input.enabled,
          )
        : setScheduleSuggestionModeEnabledForWeekday(
            config,
            input.weekday,
            input.service,
            input.mode,
            input.enabled,
          ),
  });
}
