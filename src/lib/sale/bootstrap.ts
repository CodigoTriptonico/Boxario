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
  scheduleTimeSuggestionsFor,
  type ScheduleTimeSuggestions,
} from "@/lib/sale/schedule-suggestions";

export type VentaBootstrapData = {
  senders: SaleSender[];
  shortcuts: SaleShortcuts;
  countryBoxes: Record<string, string[][]>;
  countryPromotions: PricingPromotionConfig[];
  logisticsFees: InvoiceBillingConfig;
  scheduleSuggestions: {
    delivery: ScheduleTimeSuggestions;
    pickup: ScheduleTimeSuggestions;
  };
  organizationBranding: OrganizationBranding;
};

export async function loadVentaBootstrap(
  session: AppSession,
  customerParams?: ListCustomersParams,
): Promise<VentaBootstrapData> {
  const [customers, shortcuts, pricingConfig] = await Promise.all([
    listCustomersForSession(session, customerParams),
    listSaleShortcutsForSession(session),
    loadPricingConfigForSession(session),
  ]);

  const salePricing = salePricingFromConfig(
    pricingConfig.countries,
    pricingConfig.promotions,
  );

  return {
    senders: customers.map(customerRowToSender),
    shortcuts,
    countryBoxes: salePricing.countryBoxes,
    countryPromotions: salePricing.promotions,
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
    },
    organizationBranding: resolveOrganizationBrandingFromSession(session),
  };
}
