"use server";

import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import { requireScopedActionContext } from "@/lib/actions/context";
import { recordActivityHistory } from "@/lib/activity-history";
import { requireAppSession } from "@/lib/auth/session";
import { isSalePersonCardVariantId } from "@/lib/sale-person-card-variants";
import {
  listCustomersForSession,
  listRecipientsForCustomerSession,
  mapCustomerRow,
  mapRecipientRow,
  type CustomerRecipientRow,
  type CustomerWithRecipientsRow,
} from "@/lib/customers/load";
import type { ListCustomersParams } from "@/lib/customers/list-params";
import {
  CUSTOMER_MUTATION_SELECT,
  RECIPIENT_MUTATION_SELECT,
  normalizeCustomerMutation,
  normalizeRecipientMutation,
  type CreateCustomerInput,
  type CreateRecipientInput,
  type UpdateCustomerInput,
  type UpdateRecipientInput,
} from "@/lib/customers/mutations";
import { assertSameOrgCustomerIds } from "@/lib/security/org-scope";
import { customerZoneKeyFromParts } from "@/lib/customer-route-verification";
import { revokeCustomerRouteVerificationsForZoneChange } from "@/lib/customer-route-verifications-mutate";

export type { CustomerRecipientRow, CustomerWithRecipientsRow } from "@/lib/customers/load";

type CustomerDbRow = Parameters<typeof mapCustomerRow>[0];
type RecipientDbRow = Parameters<typeof mapRecipientRow>[0];
type CustomerActionDatabase =
  Awaited<ReturnType<typeof requireScopedActionContext>>["supabase"];

type CoordinateSnapshot = { lat: number; lng: number };

function coordinateSnapshot(latValue: unknown, lngValue: unknown): CoordinateSnapshot | null {
  const lat = Number(latValue);
  const lng = Number(lngValue);
  return Number.isFinite(lat) && lat >= -90 && lat <= 90 && Number.isFinite(lng) && lng >= -180 && lng <= 180
    ? { lat, lng }
    : null;
}

function exactEntranceSnapshot(row: { exact_entrance_lat?: unknown; exact_entrance_lng?: unknown }) {
  return coordinateSnapshot(row.exact_entrance_lat, row.exact_entrance_lng);
}

function sameCoordinate(left: CoordinateSnapshot | null, right: CoordinateSnapshot | null) {
  return left?.lat === right?.lat && left?.lng === right?.lng;
}

function formatCoordinate(point: CoordinateSnapshot | null) {
  return point ? `${point.lat.toFixed(6)}, ${point.lng.toFixed(6)}` : "sin coordenadas";
}

async function customerActionContext() {
  return requireScopedActionContext(["sales.manage", "customers.manage"]);
}

async function recipientCountryId(
  supabase: CustomerActionDatabase,
  organizationId: string,
  countryName: string,
) {
  const { data, error } = await supabase
    .from("pricing_countries")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("name", countryName)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    throw new Error("Crea primero el país destino del destinatario.");
  }

  return data.id;
}

async function updatePersonCardStyle(input: {
  table: "customers" | "customer_recipients";
  id: string;
  cardStyle: string;
}): Promise<ActionResult<{ cardStyle: string }>> {
  try {
    const { session, supabase } = await customerActionContext();

    if (!isSalePersonCardVariantId(input.cardStyle)) {
      return fail("Estilo de tarjeta no válido");
    }

    const { data, error } = await supabase
      .from(input.table)
      .update({
        card_style: input.cardStyle,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.id)
      .eq("organization_id", session.organizationId)
      .select("id, card_style")
      .single();

    if (error || !data) {
      return fail(error?.message || "No se pudo actualizar el estilo");
    }

    return ok({ cardStyle: data.card_style || input.cardStyle });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function listCustomersWithRecipientsAction(
  params?: ListCustomersParams,
): Promise<ActionResult<CustomerWithRecipientsRow[]>> {
  try {
    const session = await requireAppSession();
    const data = await listCustomersForSession(session, params);
    return ok(data);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function listRecipientsForCustomerAction(
  customerId: string,
): Promise<ActionResult<CustomerRecipientRow[]>> {
  try {
    const session = await requireAppSession();
    const data = await listRecipientsForCustomerSession(session, customerId);
    return ok(data);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function createCustomerAction(
  input: CreateCustomerInput,
): Promise<ActionResult<CustomerWithRecipientsRow>> {
  try {
    const { session, supabase } = await customerActionContext();
    const normalized = normalizeCustomerMutation(input);
    if (!normalized.ok) {
      return fail(normalized.error);
    }
    const { firstName, lastName, phones, patch } = normalized.value;

    await assertSameOrgCustomerIds(supabase, session.organizationId, [
      input.referredByCustomerId || "",
    ]);

    const { data, error } = await supabase
      .from("customers")
      .insert({
        organization_id: session.organizationId,
        ...patch,
        exact_entrance_confirmed_by: patch.exact_entrance_confirmed_at ? session.userId : null,
        referred_by_customer_id: input.referredByCustomerId || null,
      })
      .select(CUSTOMER_MUTATION_SELECT)
      .single();

    if (error || !data) {
      return fail(error?.message || "No se pudo crear el cliente");
    }

    await recordActivityHistory(supabase, session, {
      action: "customer.created",
      entityType: "customer",
      entityId: data.id,
      title: `Cliente creado: ${firstName} ${lastName}`.trim(),
      description: phones.join(", "),
    });

    return ok({
      ...mapCustomerRow({ ...data, customer_recipients: [] } as CustomerDbRow),
    });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function updateCustomerAction(
  input: UpdateCustomerInput,
): Promise<ActionResult<CustomerWithRecipientsRow>> {
  try {
    const { session, supabase } = await customerActionContext();
    const normalized = normalizeCustomerMutation(input);
    if (!normalized.ok) {
      return fail(normalized.error);
    }
    const { firstName, lastName, phones, patch } = normalized.value;

    const { data: previousCustomer } = await supabase
      .from("customers")
      .select("city, postal_code, lat, lng, exact_entrance_lat, exact_entrance_lng")
      .eq("id", input.customerId)
      .eq("organization_id", session.organizationId)
      .maybeSingle();

    const previousZoneKey = customerZoneKeyFromParts({
      city: String(previousCustomer?.city || ""),
      postalCode: String(previousCustomer?.postal_code || ""),
      lat: previousCustomer?.lat == null ? null : Number(previousCustomer.lat),
      lng: previousCustomer?.lng == null ? null : Number(previousCustomer.lng),
    });

    const { data, error } = await supabase
      .from("customers")
      .update({
        ...patch,
        exact_entrance_confirmed_by: patch.exact_entrance_confirmed_at ? session.userId : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.customerId)
      .eq("organization_id", session.organizationId)
      .select(
        `
        id,
        referred_by_customer_id,
        first_name,
        last_name,
        phones,
        email,
        emails,
        street,
        house_number,
        neighborhood,
        city,
        state,
        postal_code,
        country,
        address_reference,
        card_style,
        place_id,
        formatted_address,
        address_verified,
        lat,
        lng,
        exact_entrance_lat,
        exact_entrance_lng,
        exact_entrance_confirmed_at,
        exact_entrance_note,
        exact_entrance_pano_id,
        exact_entrance_heading,
        exact_entrance_pitch,
        customer_recipients (
          id,
          first_name,
          last_name,
          phone,
          email,
          emails,
          country,
          street,
          house_number,
          neighborhood,
          city,
          state,
          postal_code,
          address_reference,
          card_style,
          place_id,
          formatted_address,
          address_verified,
          lat,
          lng,
          exact_entrance_lat,
          exact_entrance_lng,
          exact_entrance_confirmed_at,
          exact_entrance_note,
          exact_entrance_pano_id,
          exact_entrance_heading,
          exact_entrance_pitch
        )
      `,
      )
      .single();

    if (error || !data) {
      return fail(error?.message || "No se pudo actualizar el cliente");
    }

    const nextZoneKey = customerZoneKeyFromParts({
      city: String(data.city || ""),
      postalCode: String(data.postal_code || ""),
      lat: data.lat == null ? null : Number(data.lat),
      lng: data.lng == null ? null : Number(data.lng),
    });

    try {
      await revokeCustomerRouteVerificationsForZoneChange({
        supabase,
        session,
        customerId: data.id,
        previousZoneKey,
        nextZoneKey,
      });
    } catch (revokeError) {
      return fail(actionErrorMessage(revokeError));
    }

    await recordActivityHistory(supabase, session, {
      action: "customer.updated",
      entityType: "customer",
      entityId: data.id,
      title: `Cliente editado: ${firstName} ${lastName}`.trim(),
      description: phones.join(", "),
    });

    const previousExact = exactEntranceSnapshot(previousCustomer || {});
    const previousAddress = coordinateSnapshot(previousCustomer?.lat, previousCustomer?.lng);
    const nextExact = exactEntranceSnapshot(data);
    const nextAddress = coordinateSnapshot(data.lat, data.lng);
    if (!sameCoordinate(previousExact, nextExact)) {
      await recordActivityHistory(supabase, session, {
        action: "customer.exact_entrance.updated",
        entityType: "customer",
        entityId: data.id,
        title: `Entrada exacta actualizada: ${firstName} ${lastName}`.trim(),
        description: `Pin anterior: ${formatCoordinate(previousExact || previousAddress)} · pin nuevo: ${formatCoordinate(nextExact || nextAddress)}`,
        metadata: {
          source: "sales_contact_form",
          previous: previousExact || previousAddress,
          previousSource: previousExact ? "exact_entrance" : previousAddress ? "address" : null,
          next: nextExact || nextAddress,
          nextSource: nextExact ? "exact_entrance" : nextAddress ? "address" : null,
        },
      });
    }

    return ok(mapCustomerRow(data as CustomerDbRow));
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function updateCustomerCardStyleAction(input: {
  customerId: string;
  cardStyle: string;
}): Promise<ActionResult<{ cardStyle: string }>> {
  return updatePersonCardStyle({
    table: "customers",
    id: input.customerId,
    cardStyle: input.cardStyle,
  });
}

export async function updateRecipientCardStyleAction(input: {
  recipientId: string;
  cardStyle: string;
}): Promise<ActionResult<{ cardStyle: string }>> {
  return updatePersonCardStyle({
    table: "customer_recipients",
    id: input.recipientId,
    cardStyle: input.cardStyle,
  });
}

export async function deactivateCustomerAction(customerId: string): Promise<ActionResult<null>> {
  try {
    const { session, supabase } = await customerActionContext();

    const { data, error } = await supabase
      .from("customers")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", customerId)
      .eq("organization_id", session.organizationId)
      .select("id, first_name, last_name, phones")
      .single();

    if (error || !data) {
      return fail(error?.message || "No se pudo eliminar el cliente");
    }

    await recordActivityHistory(supabase, session, {
      action: "customer.deleted",
      entityType: "customer",
      entityId: data.id,
      title: `Cliente eliminado: ${data.first_name} ${data.last_name}`.trim(),
      description: (data.phones || []).join(", "),
    });

    return ok(null);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function createRecipientAction(
  input: CreateRecipientInput,
): Promise<ActionResult<CustomerRecipientRow>> {
  try {
    const { session, supabase } = await customerActionContext();

    await assertSameOrgCustomerIds(supabase, session.organizationId, [input.customerId]);

    const countryName = input.country.trim();
    const countryId = await recipientCountryId(supabase, session.organizationId, countryName);
    const normalized = normalizeRecipientMutation(input, countryId);
    if (!normalized.ok) {
      return fail(normalized.error);
    }
    const { firstName, lastName, emails, patch } = normalized.value;

    const { data, error } = await supabase
      .from("customer_recipients")
      .insert({
        organization_id: session.organizationId,
        customer_id: input.customerId,
        ...patch,
        exact_entrance_confirmed_by: patch.exact_entrance_confirmed_at ? session.userId : null,
      })
      .select(RECIPIENT_MUTATION_SELECT)
      .single();

    if (error || !data) {
      return fail(error?.message || "No se pudo crear el destinatario");
    }

    await recordActivityHistory(supabase, session, {
      action: "recipient.created",
      entityType: "recipient",
      entityId: data.id,
      title: `Destinatario creado: ${firstName} ${lastName}`.trim(),
      description: [input.country.trim(), input.phone.trim(), emails[0]].filter(Boolean).join(" · "),
      metadata: { customerId: input.customerId },
    });

    return ok(mapRecipientRow(data as RecipientDbRow));
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function updateRecipientAction(
  input: UpdateRecipientInput,
): Promise<ActionResult<CustomerRecipientRow>> {
  try {
    const { session, supabase } = await customerActionContext();
    const countryName = input.country.trim();
    const countryId = await recipientCountryId(supabase, session.organizationId, countryName);
    const normalized = normalizeRecipientMutation(input, countryId);
    if (!normalized.ok) {
      return fail(normalized.error);
    }
    const { firstName, lastName, emails, patch } = normalized.value;

    const { data: previousRecipient } = await supabase
      .from("customer_recipients")
      .select("lat, lng, exact_entrance_lat, exact_entrance_lng")
      .eq("id", input.recipientId)
      .eq("organization_id", session.organizationId)
      .maybeSingle();

    const { data, error } = await supabase
      .from("customer_recipients")
      .update({
        ...patch,
        exact_entrance_confirmed_by: patch.exact_entrance_confirmed_at ? session.userId : null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.recipientId)
      .eq("organization_id", session.organizationId)
      .select(RECIPIENT_MUTATION_SELECT)
      .single();

    if (error || !data) {
      return fail(error?.message || "No se pudo actualizar el destinatario");
    }

    await recordActivityHistory(supabase, session, {
      action: "recipient.updated",
      entityType: "recipient",
      entityId: data.id,
      title: `Destinatario editado: ${firstName} ${lastName}`.trim(),
      description: [input.country.trim(), input.phone.trim(), emails[0]].filter(Boolean).join(" · "),
    });

    const previousExact = exactEntranceSnapshot(previousRecipient || {});
    const previousAddress = coordinateSnapshot(previousRecipient?.lat, previousRecipient?.lng);
    const nextExact = exactEntranceSnapshot(data);
    const nextAddress = coordinateSnapshot(data.lat, data.lng);
    if (!sameCoordinate(previousExact, nextExact)) {
      await recordActivityHistory(supabase, session, {
        action: "recipient.exact_entrance.updated",
        entityType: "recipient",
        entityId: data.id,
        title: `Entrada exacta actualizada: ${firstName} ${lastName}`.trim(),
        description: `Pin anterior: ${formatCoordinate(previousExact || previousAddress)} · pin nuevo: ${formatCoordinate(nextExact || nextAddress)}`,
        metadata: {
          source: "sales_contact_form",
          previous: previousExact || previousAddress,
          previousSource: previousExact ? "exact_entrance" : previousAddress ? "address" : null,
          next: nextExact || nextAddress,
          nextSource: nextExact ? "exact_entrance" : nextAddress ? "address" : null,
        },
      });
    }

    return ok(mapRecipientRow(data as RecipientDbRow));
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function deleteRecipientAction(recipientId: string): Promise<ActionResult<null>> {
  try {
    const { session, supabase } = await customerActionContext();

    const { data, error } = await supabase
      .from("customer_recipients")
      .delete()
      .eq("id", recipientId)
      .eq("organization_id", session.organizationId)
      .select("id, first_name, last_name, phone, country")
      .single();

    if (error || !data) {
      return fail(error?.message || "No se pudo eliminar el destinatario");
    }

    await recordActivityHistory(supabase, session, {
      action: "recipient.deleted",
      entityType: "recipient",
      entityId: data.id,
      title: `Destinatario eliminado: ${data.first_name} ${data.last_name}`.trim(),
      description: `${data.country} · ${data.phone}`,
    });

    return ok(null);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
