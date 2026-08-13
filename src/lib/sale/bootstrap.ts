import type { AppSession } from "@/lib/auth/types";
import { customerRowToSender, type SaleSender } from "@/lib/customers/mappers";
import { listCustomersForSession } from "@/lib/customers/load";
import type { ListCustomersParams } from "@/lib/customers/list-params";
import { loadPricingConfigForSession } from "@/lib/pricing/load-config";
import {
  saleLogisticsFeesFromRouteConfig,
  salePricingFromConfig,
} from "@/lib/pricing/sale-derivatives";
import type { OrganizationBranding } from "@/lib/organizations/branding";
import { resolveOrganizationBrandingFromSession } from "@/lib/organizations/branding";
import type { PricingPromotionConfig } from "@/lib/pricing-promotions";
import type { InvoiceBillingConfig } from "@/lib/invoice-billing";
import { listSaleShortcutsForSession, type SaleShortcuts } from "@/lib/sale/shortcuts";
import {
  buildSaleBoxStockIndex,
  type SaleBoxStockSnapshot,
} from "@/lib/sale/box-stock";
import {
  scheduleTimeSuggestionsFor,
  type ScheduleTimeSuggestions,
} from "@/lib/sale/schedule-suggestions";
import { createScopedSupabase } from "@/lib/supabase/scoped";

export type VentaBootstrapData = {
  nextInvoiceSequence: number;
  senders: SaleSender[];
  shortcuts: SaleShortcuts;
  countryBoxes: Record<string, string[][]>;
  countryPromotions: PricingPromotionConfig[];
  boxStockByKey: Record<string, SaleBoxStockSnapshot>;
  logisticsFees: InvoiceBillingConfig;
  scheduleSuggestions: {
    delivery: ScheduleTimeSuggestions;
    pickup: ScheduleTimeSuggestions;
    byWeekday: {
      delivery: ScheduleTimeSuggestions[];
      pickup: ScheduleTimeSuggestions[];
    };
  };
  organizationBranding: OrganizationBranding;
};

async function loadNextInvoiceSequenceForSession(session: AppSession) {
  const supabase = await createScopedSupabase(session);
  if (!supabase) {
    return 1;
  }

  const { data, error } = await supabase
    .from("organization_invoice_counters")
    .select("last_number")
    .eq("organization_id", session.organizationId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return Math.max(1, Number(data?.last_number || 0) + 1);
}

async function loadSaleBoxStockForSession(session: AppSession) {
  const supabase = await createScopedSupabase(session);
  if (!supabase) {
    return {};
  }

  const { data, error } = await supabase
    .from("inventory_stock")
    .select("item_id, stock, reserved, min_stock, inventory_items(id, name, kind)")
    .eq("organization_id", session.organizationId);

  if (error) {
    throw new Error(error.message);
  }

  return buildSaleBoxStockIndex(data || []);
}

export async function loadVentaBootstrap(
  session: AppSession,
  customerParams?: ListCustomersParams,
): Promise<VentaBootstrapData> {
  const [customers, shortcuts, pricingConfig, boxStockByKey, nextInvoiceSequence] = await Promise.all([
    listCustomersForSession(session, customerParams),
    listSaleShortcutsForSession(session),
    loadPricingConfigForSession(session),
    loadSaleBoxStockForSession(session),
    loadNextInvoiceSequenceForSession(session),
  ]);

  const salePricing = salePricingFromConfig(
    pricingConfig.countries,
    pricingConfig.promotions,
  );

  return {
    nextInvoiceSequence,
    senders: customers.map(customerRowToSender),
    shortcuts,
    countryBoxes: salePricing.countryBoxes,
    countryPromotions: salePricing.promotions,
    boxStockByKey,
    logisticsFees: saleLogisticsFeesFromRouteConfig(pricingConfig.routeConfig),
    scheduleSuggestions: {
      delivery: scheduleTimeSuggestionsFor(
        pricingConfig.routeConfig.scheduleSuggestions,
        "delivery",
        [],
      ),
      pickup: scheduleTimeSuggestionsFor(
        pricingConfig.routeConfig.scheduleSuggestions,
        "pickup",
        [],
      ),
      byWeekday: {
        delivery: Array.from({ length: 7 }, (_, weekday) =>
          scheduleTimeSuggestionsFor(
            pricingConfig.routeConfig.scheduleSuggestions,
            "delivery",
            [],
            weekday,
          ),
        ),
        pickup: Array.from({ length: 7 }, (_, weekday) =>
          scheduleTimeSuggestionsFor(
            pricingConfig.routeConfig.scheduleSuggestions,
            "pickup",
            [],
            weekday,
          ),
        ),
      },
    },
    organizationBranding: resolveOrganizationBrandingFromSession(session),
  };
}
