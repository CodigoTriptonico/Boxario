"use server";

import { requireAppSession } from "@/lib/auth/session";
import { sessionHasPermission } from "@/lib/auth/permissions";
import { createScopedSupabase } from "@/lib/supabase/scoped";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import {
  canReadPricingSession,
  canWritePricingSession,
  loadPricingConfigForSession,
} from "@/lib/pricing/load-config";
import {
  saleCountryBoxesFromCountries,
} from "@/lib/pricing/sale-derivatives";
import type { PricingConfigPayload } from "@/lib/pricing/types";
import { buildPricingRpcPayload } from "@/lib/pricing/rpc-payload";

export async function loadPricingConfigAction(): Promise<ActionResult<PricingConfigPayload>> {
  try {
    const session = await requireAppSession();
    const data = await loadPricingConfigForSession(session);
    return ok(data);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function savePricingConfigAction(
  payload: PricingConfigPayload,
): Promise<ActionResult<null>> {
  try {
    const session = await requireAppSession();

    if (!canWritePricingSession(session)) {
      throw new Error("FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const orgId = session.organizationId;
    // Pricing remains a legacy all-in-one RPC, so always replace its route
    // fragment with the latest database value. General pricing edits must not
    // overwrite settings now owned by Ventas and Logística.
    const currentConfig = await loadPricingConfigForSession(session);
    const rpcPayload = buildPricingRpcPayload({
      ...payload,
      routeConfig: currentConfig.routeConfig,
    });

    const { error: rpcError } = await supabase.rpc("replace_pricing_config", {
      target_org_id: orgId,
      payload: rpcPayload,
    });

    if (rpcError) {
      if (rpcError.message.includes("PRICING_COUNTRY_IN_USE")) {
        const countryName = rpcError.message.split(":").slice(1).join(":").trim();
        return fail(
          countryName
            ? `No puedes quitar ${countryName}: tiene destinatarios vinculados.`
            : "No puedes quitar un país con destinatarios vinculados.",
        );
      }

      return fail(rpcError.message);
    }

    return ok(null);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

/** Cajas por pais para venta: [tamano, precio, costo, carrier, tiempo, catalogKey] */
export async function loadSaleCountryBoxesAction(): Promise<
  ActionResult<Record<string, string[][]>>
> {
  try {
    const session = await requireAppSession();

    if (!canReadPricingSession(session)) {
      throw new Error("FORBIDDEN");
    }

    const config = await loadPricingConfigForSession(session);
    return ok(saleCountryBoxesFromCountries(config.countries));
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}



export async function allocateInvoiceNumberAction(): Promise<ActionResult<{ invoiceNumber: string }>> {
  try {
    const session = await requireAppSession();

    if (!sessionHasPermission(session, "sales.manage")) {
      throw new Error("FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const { data, error } = await supabase.rpc("next_organization_invoice_number", {
      target_org_id: session.organizationId,
    });

    if (error) {
      return fail(error.message);
    }

    const sequence = Number(data) || 1;
    const invoiceNumber = `INV-${String(sequence).padStart(6, "0")}`;

    return ok({ invoiceNumber });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
