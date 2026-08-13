"use server";

import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import { requireScopedActionContext } from "@/lib/actions/context";
import { normalizeStatisticsDashboardInput } from "@/lib/statistics/input";
import { parseStatisticsDashboard } from "@/lib/statistics/parse";
import type { StatisticsDashboard, StatisticsDashboardInput } from "@/lib/statistics/types";

export async function getStatisticsDashboardAction(
  input: StatisticsDashboardInput,
): Promise<ActionResult<StatisticsDashboard>> {
  try {
    const { supabase } = await requireScopedActionContext([
      "audit.immutable.view",
      "sales.manage",
      "routes.view",
      "logistics.settings.manage",
      "inventory.view",
      "accounting.view",
      "agency.view",
      "agency.sales.view",
      "agency.account.view",
    ]);
    const normalized = normalizeStatisticsDashboardInput(input);
    const { data, error } = await supabase.rpc("load_statistics_dashboard_v2", {
      period_from: normalized.from,
      period_to: normalized.to,
      comparison_from: normalized.compareFrom,
      comparison_to: normalized.compareTo,
      requested_filters: normalized.filters,
    });
    if (error) throw new Error(error.message);
    return ok(parseStatisticsDashboard(data));
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
