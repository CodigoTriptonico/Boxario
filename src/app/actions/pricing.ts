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
import { formatInvoiceReference, invoiceReferenceCityCode, invoiceReferenceCountryCode } from "@/lib/invoice-reference";
import type { InvoiceNumberReservation } from "@/lib/invoice-reservation";

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
            ? `${countryName} no puede eliminarse porque tiene configuraciones relacionadas.`
            : "No puedes quitar un país con destinatarios vinculados.",
        );
      }

      if (/duplicate key|unique .*pricing_countries|already exists/i.test(rpcError.message)) {
        return fail("Ese país ya está registrado.");
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



export async function allocateInvoiceNumberAction(input: {
  country?: string;
  city?: string;
  boxCount?: number;
} = {}): Promise<ActionResult<{ invoiceNumber: string }>> {
  try {
    const session = await requireAppSession();

    if (!sessionHasPermission(session, "sales.manage")) {
      throw new Error("FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const [{ data: seller, error: sellerError }, { data: organization, error: organizationError }] = await Promise.all([
      supabase
      .from("profiles")
      .select("seller_code")
      .eq("id", session.userId)
      .eq("organization_id", session.organizationId)
      .single(),
      supabase
        .from("organizations")
        .select("invoice_company_code")
        .eq("id", session.organizationId)
        .single(),
    ]);

    if (sellerError) {
      return fail(sellerError.message);
    }
    if (organizationError) {
      return fail(organizationError.message);
    }

    const sellerCode = Number(seller.seller_code);
    if (!Number.isInteger(sellerCode) || sellerCode < 1 || sellerCode > 999) {
      return fail("Tu usuario no tiene un codigo de vendedor valido.");
    }
    const companyCode = Number(organization.invoice_company_code);
    if (!Number.isInteger(companyCode) || companyCode < 1) {
      return fail("Tu empresa no tiene un codigo de invoice valido.");
    }

    const { data, error } = await supabase.rpc("next_organization_invoice_number", {
      target_org_id: session.organizationId,
    });

    if (error) {
      return fail(error.message);
    }

    const sequence = Number(data) || 1;
    const invoiceNumber = formatInvoiceReference({
      sequence,
      country: input.country,
      city: input.city,
      sellerCode,
      companyCode,
      boxCount: input.boxCount || 1,
    });

    return ok({ invoiceNumber });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function reserveInvoiceNumberAction(input: {
  reservationToken: string;
  country?: string;
  city?: string;
  boxCount?: number;
}): Promise<ActionResult<InvoiceNumberReservation>> {
  try {
    const session = await requireAppSession();

    if (!sessionHasPermission(session, "sales.manage")) {
      throw new Error("FORBIDDEN");
    }

    const reservationToken = input.reservationToken.trim();
    if (!reservationToken) {
      return fail("No se pudo identificar la reserva del invoice.");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const [{ data: seller, error: sellerError }, { data: organization, error: organizationError }] = await Promise.all([
      supabase
        .from("profiles")
        .select("seller_code")
        .eq("id", session.userId)
        .eq("organization_id", session.organizationId)
        .single(),
      supabase
        .from("organizations")
        .select("invoice_company_code")
        .eq("id", session.organizationId)
        .single(),
    ]);

    if (sellerError) {
      return fail(sellerError.message);
    }
    if (organizationError) {
      return fail(organizationError.message);
    }

    const sellerCode = Number(seller.seller_code);
    if (!Number.isInteger(sellerCode) || sellerCode < 1 || sellerCode > 999) {
      return fail("Tu usuario no tiene un codigo de vendedor valido.");
    }
    const companyCode = Number(organization.invoice_company_code);
    if (!Number.isInteger(companyCode) || companyCode < 1) {
      return fail("Tu empresa no tiene un codigo de invoice valido.");
    }

    const { data, error } = await supabase.rpc("reserve_organization_invoice_number", {
      target_org_id: session.organizationId,
      target_reservation_token: reservationToken,
      target_country_code: invoiceReferenceCountryCode(input.country),
      target_city_code: invoiceReferenceCityCode(input.city),
      target_box_count: Math.max(1, Math.floor(input.boxCount || 1)),
      target_seller_code: sellerCode,
      target_company_code: companyCode,
    });

    if (error) {
      return fail(error.message);
    }

    const reservation = data as Partial<InvoiceNumberReservation> | null;
    if (
      !reservation ||
      typeof reservation.invoiceNumber !== "string" ||
      typeof reservation.reservationToken !== "string" ||
      typeof reservation.expiresAt !== "string"
    ) {
      return fail("No se pudo reservar el numero del invoice.");
    }

    return ok({
      reservationToken: reservation.reservationToken,
      invoiceNumber: reservation.invoiceNumber,
      sequence: Number(reservation.sequence) || 1,
      expiresAt: reservation.expiresAt,
    });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function releaseInvoiceNumberAction(input: {
  reservationToken: string;
}): Promise<ActionResult<{ released: boolean }>> {
  try {
    const session = await requireAppSession();

    if (!sessionHasPermission(session, "sales.manage")) {
      throw new Error("FORBIDDEN");
    }

    const reservationToken = input.reservationToken.trim();
    if (!reservationToken) {
      return ok({ released: false });
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return ok({ released: false });
    }

    const { data, error } = await supabase.rpc("release_organization_invoice_number", {
      target_org_id: session.organizationId,
      target_reservation_token: reservationToken,
    });

    if (error) {
      return fail(error.message);
    }

    return ok({ released: Boolean(data) });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
