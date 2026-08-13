"use server";

import { revalidatePath } from "next/cache";
import { requireScopedActionContext } from "@/lib/actions/context";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import { normalizeMoneyInput } from "@/lib/logistics-fees";
import { DEFAULT_MINIMUM_DEPOSIT } from "@/lib/invoice-billing";
import {
  normalizeScheduleSuggestionConfig,
  type ScheduleSuggestionConfig,
} from "@/lib/sale/schedule-suggestions";
import {
  isLogisticsWeekdayKey,
  logisticsWeekdayKeys,
  type LogisticsWeekdayKey,
} from "@/lib/logistics-route-catalog";
import {
  normalizePaymentMethodSettings,
  type PaymentMethodSettings,
} from "@/lib/payment-methods";

export type SalesAxisSettings = PaymentMethodSettings & {
  scheduleSuggestions: ScheduleSuggestionConfig;
  minimumDeposit: string;
  pickupIncludedDays: number;
  latePickupFee: string;
  pendingAllowed: boolean;
  enabledDays: LogisticsWeekdayKey[];
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
    const { session, supabase } = await requireScopedActionContext([
      "settings.manage",
      "sales.manage",
      "sales.settings.manage",
      "logistics.settings.manage",
      "routes.update_status",
    ]);

    const { data, error } = await supabase
      .from("organization_route_settings")
      .select(
        "schedule_suggestions, minimum_deposit, pickup_included_days, late_pickup_fee, pending_allowed, delivery_days, pickup_days, route_lead_time, empty_box_delivery_fee, full_box_pickup_fee, accepted_payment_methods, driver_payment_methods, default_payment_method, payment_reference_required_methods",
      )
      .eq("organization_id", session.organizationId)
      .maybeSingle();

    if (error && error.code !== "42P01") {
      return fail(error.message);
    }

    const configuredDays = new Set(
      [...(data?.delivery_days || []), ...(data?.pickup_days || [])].filter(isLogisticsWeekdayKey),
    );

    return ok({
      sales: {
        scheduleSuggestions: normalizeScheduleSuggestionConfig(data?.schedule_suggestions),
        minimumDeposit: String(data?.minimum_deposit || DEFAULT_MINIMUM_DEPOSIT),
        pickupIncludedDays: Math.max(Number(data?.pickup_included_days) || 30, 1),
        latePickupFee: String(data?.late_pickup_fee || "$0"),
        pendingAllowed: data?.pending_allowed ?? true,
        enabledDays: logisticsWeekdayKeys.filter((day) => configuredDays.has(day)),
        ...normalizePaymentMethodSettings({
          acceptedPaymentMethods: data?.accepted_payment_methods,
          driverPaymentMethods: data?.driver_payment_methods,
          defaultPaymentMethod: data?.default_payment_method,
          referenceRequiredMethods: data?.payment_reference_required_methods,
        }),
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
    const { supabase } = await requireScopedActionContext([
      "sales.settings.manage",
      "settings.manage",
    ]);

    const next: SalesAxisSettings = {
      scheduleSuggestions: normalizeScheduleSuggestionConfig(input.scheduleSuggestions),
      minimumDeposit: normalizeMoneyInput(String(input.minimumDeposit || "")),
      pickupIncludedDays: Math.min(
        Math.max(Math.floor(Number(input.pickupIncludedDays) || 30), 1),
        3650,
      ),
      latePickupFee: normalizeMoneyInput(String(input.latePickupFee || "")),
      pendingAllowed: Boolean(input.pendingAllowed),
      enabledDays: input.enabledDays || [],
      ...normalizePaymentMethodSettings(input),
    };
    const { error } = await supabase.rpc("save_sales_axis_settings_v3", {
      p_schedule_suggestions: next.scheduleSuggestions,
      p_minimum_deposit: next.minimumDeposit,
      p_pickup_included_days: next.pickupIncludedDays,
      p_late_pickup_fee: next.latePickupFee,
      p_pending_allowed: next.pendingAllowed,
      p_accepted_payment_methods: next.acceptedPaymentMethods,
      p_driver_payment_methods: next.driverPaymentMethods,
      p_default_payment_method: next.defaultPaymentMethod,
      p_reference_required_methods: next.referenceRequiredMethods,
    });

    if (error) {
      return fail(error.message);
    }

    revalidatePath("/seguimiento");
    revalidatePath("/configuracion");
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
    const { supabase } = await requireScopedActionContext([
      "logistics.settings.manage",
      "settings.manage",
    ]);

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
