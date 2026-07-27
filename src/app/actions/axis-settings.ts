"use server";

import { revalidatePath } from "next/cache";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import { sessionHasPermission } from "@/lib/auth/permissions";
import { requireAppSession } from "@/lib/auth/session";
import { normalizeMoneyInput } from "@/lib/logistics-fees";
import {
  normalizeScheduleSuggestionConfig,
  type ScheduleSuggestionConfig,
} from "@/lib/sale/schedule-suggestions";
import { createScopedSupabase } from "@/lib/supabase/scoped";

export type SalesAxisSettings = {
  scheduleSuggestions: ScheduleSuggestionConfig;
  minimumDeposit: string;
  pendingAllowed: boolean;
};

export type LogisticsAxisSettings = {
  routeLeadTime: string;
  emptyBoxDeliveryFee: string;
  fullBoxPickupFee: string;
};

export type AxisSettings = {
  sales: SalesAxisSettings;
  logistics: LogisticsAxisSettings;
};

export async function loadAxisSettingsAction(): Promise<ActionResult<AxisSettings>> {
  try {
    const session = await requireAppSession();
    const canRead =
      sessionHasPermission(session, "settings.manage") ||
      sessionHasPermission(session, "sales.manage") ||
      sessionHasPermission(session, "sales.settings.manage") ||
      sessionHasPermission(session, "logistics.settings.manage");

    if (!canRead) {
      throw new Error("FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const { data, error } = await supabase
      .from("organization_route_settings")
      .select(
        "schedule_suggestions, minimum_deposit, pending_allowed, route_lead_time, empty_box_delivery_fee, full_box_pickup_fee",
      )
      .eq("organization_id", session.organizationId)
      .maybeSingle();

    if (error && error.code !== "42P01") {
      return fail(error.message);
    }

    return ok({
      sales: {
        scheduleSuggestions: normalizeScheduleSuggestionConfig(data?.schedule_suggestions),
        minimumDeposit: String(data?.minimum_deposit || "$20"),
        pendingAllowed: data?.pending_allowed ?? true,
      },
      logistics: {
        routeLeadTime: String(data?.route_lead_time || ""),
        emptyBoxDeliveryFee: String(data?.empty_box_delivery_fee || "$0"),
        fullBoxPickupFee: String(data?.full_box_pickup_fee || "$0"),
      },
    });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function saveSalesAxisSettingsAction(
  input: SalesAxisSettings,
): Promise<ActionResult<SalesAxisSettings>> {
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

    const next: SalesAxisSettings = {
      scheduleSuggestions: normalizeScheduleSuggestionConfig(input.scheduleSuggestions),
      minimumDeposit: normalizeMoneyInput(String(input.minimumDeposit || "")),
      pendingAllowed: Boolean(input.pendingAllowed),
    };
    const { error } = await supabase.rpc("save_sales_axis_settings", {
      p_schedule_suggestions: next.scheduleSuggestions,
      p_minimum_deposit: next.minimumDeposit,
      p_pending_allowed: next.pendingAllowed,
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

export async function saveLogisticsAxisSettingsAction(
  input: LogisticsAxisSettings,
): Promise<ActionResult<LogisticsAxisSettings>> {
  try {
    const session = await requireAppSession();
    if (
      !sessionHasPermission(session, "logistics.settings.manage") &&
      !sessionHasPermission(session, "settings.manage")
    ) {
      throw new Error("FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const next: LogisticsAxisSettings = {
      routeLeadTime: String(input.routeLeadTime || "").trim().slice(0, 80),
      emptyBoxDeliveryFee: normalizeMoneyInput(String(input.emptyBoxDeliveryFee || "")),
      fullBoxPickupFee: normalizeMoneyInput(String(input.fullBoxPickupFee || "")),
    };

    const { error } = await supabase.rpc("save_logistics_axis_settings_v3", {
      p_route_lead_time: next.routeLeadTime,
      p_empty_box_delivery_fee: next.emptyBoxDeliveryFee,
      p_full_box_pickup_fee: next.fullBoxPickupFee,
    });

    if (error) {
      return fail(error.message);
    }

    revalidatePath("/logistica");
    revalidatePath("/venta");
    return ok(next);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
