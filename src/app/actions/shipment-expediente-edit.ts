"use server";

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  normalizeCustomerMutation,
  normalizeRecipientMutation,
} from "@/lib/customers/mutations";
import { actionErrorMessage, ActionError, fail, ok, type ActionResult } from "@/lib/actions/errors";
import { requireScopedActionContext } from "@/lib/actions/context";
import { recordActivityHistory } from "@/lib/activity-history";
import { normalizePersonName, normalizePersonNameSnapshot } from "@/lib/person-name";
import type { ShipmentExpedienteEditData } from "@/lib/shipment-expediente";

type EditPartyInput = ShipmentExpedienteEditData["sender"];

export type UpdateShipmentExpedienteInput = {
  shipmentId: string;
  sender: EditPartyInput;
  recipient: EditPartyInput | null;
  country: string;
  carrier: string;
  deliveryNotes: string;
};

function databaseClient(value: unknown) {
  return value as SupabaseClient;
}

function clean(value: unknown) {
  return String(value || "").trim();
}

function addressKey(party: EditPartyInput | null | undefined) {
  if (!party) return "";
  return [
    party.street,
    party.houseNumber,
    party.neighborhood,
    party.city,
    party.state,
    party.postalCode,
    party.country,
  ]
    .map(clean)
    .join("|")
    .toLowerCase();
}

function recipientSnapshot(party: EditPartyInput) {
  return normalizePersonNameSnapshot({
    firstName: party.firstName,
    lastName: party.lastName,
    phone: party.phone,
    emails: party.emails,
    email: party.emails[0] || "",
    country: party.country,
    street: party.street,
    houseNumber: party.houseNumber,
    neighborhood: party.neighborhood,
    city: party.city,
    state: party.state,
    postalCode: party.postalCode,
    addressReference: party.addressReference,
    addressVerified: false,
  });
}

async function shipmentIsConfirmed(
  database: SupabaseClient,
  organizationId: string,
  shipmentId: string,
) {
  const [{ data: shipment }, { data: tasks, error: taskError }, { data: requests, error: requestError }] = await Promise.all([
    database
      .from("shipments")
      .select("status")
      .eq("id", shipmentId)
      .eq("organization_id", organizationId)
      .maybeSingle(),
    database
      .from("shipment_logistics_tasks")
      .select("id, schedule_confirmation_status, status")
      .eq("shipment_id", shipmentId)
      .eq("organization_id", organizationId)
      .neq("status", "cancelled"),
    database
      .from("customer_route_assignment_requests")
      .select("id, task_id, status")
      .eq("shipment_id", shipmentId)
      .eq("organization_id", organizationId)
      .in("status", ["pending_approval", "template_confirmed", "routed"]),
  ]);

  const taskIds = ((tasks || []) as Array<{ id: string }>).map((task) => task.id);
  const { data: stops, error: stopError } = taskIds.length
    ? await database
        .from("logistics_route_stops")
        .select("id, task_id")
        .eq("organization_id", organizationId)
        .in("task_id", taskIds)
    : { data: [], error: null };

  if (taskError || requestError || stopError) {
    throw new Error(taskError?.message || requestError?.message || stopError?.message || "No se pudo verificar el estado logístico");
  }

  const status = String(shipment?.status || "");
  const reachedOffice = ["En oficina", "Pickup", "Enviado", "Entregado"].includes(status);
  const taskConfirmed = (tasks || []).some(
    (task) => String(task.schedule_confirmation_status || "") === "confirmed",
  );

  return {
    confirmed: reachedOffice || taskConfirmed || Boolean((requests || []).some((request) => ["template_confirmed", "routed"].includes(String(request.status)))) || Boolean((stops || []).length),
    tasks: (tasks || []) as Array<{ id: string; schedule_confirmation_status?: string | null; status: string }>,
    requests: (requests || []) as Array<{ id: string; task_id: string; status: string }>,
  };
}

export async function updateShipmentExpedienteAction(
  input: UpdateShipmentExpedienteInput,
): Promise<ActionResult<{ shipmentId: string }>> {
  try {
    const { session, supabase } = await requireScopedActionContext(["sales.manage"]);
    const database = databaseClient(supabase);
    const shipmentId = clean(input.shipmentId);
    if (!shipmentId) return fail("Invoice no encontrado");

    const { data: current, error: currentError } = await database
      .from("shipments")
      .select("id, code, customer_id, recipient_id, customer_name, country, carrier, delivery_notes, recipient_snapshot")
      .eq("id", shipmentId)
      .eq("organization_id", session.organizationId)
      .maybeSingle();
    if (currentError || !current) return fail(currentError?.message || "Invoice no encontrado");

    const lifecycle = await shipmentIsConfirmed(database, session.organizationId, shipmentId);
    if (lifecycle.confirmed) {
      throw new ActionError("CONFLICT", "Este envío ya fue confirmado por Logística y quedó bloqueado para edición.");
    }

    const sender = input.sender;
    const senderNormalized = normalizeCustomerMutation({
      firstName: sender.firstName,
      lastName: sender.lastName,
      phones: sender.phones,
      emails: sender.emails,
      street: sender.street,
      houseNumber: sender.houseNumber,
      neighborhood: sender.neighborhood,
      city: sender.city,
      state: sender.state,
      postalCode: sender.postalCode,
      country: sender.country || "USA",
      addressReference: sender.addressReference,
      addressVerified: false,
    });
    if (!senderNormalized.ok) return fail(senderNormalized.error);

    const [{ data: currentCustomer }, { data: currentRecipient }] = await Promise.all([
      current.customer_id
        ? database
            .from("customers")
            .select("street, house_number, neighborhood, city, state, postal_code, country, address_reference")
            .eq("id", current.customer_id)
            .eq("organization_id", session.organizationId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      current.recipient_id
        ? database
            .from("customer_recipients")
            .select("id")
            .eq("id", current.recipient_id)
            .eq("organization_id", session.organizationId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    if (current.customer_id) {
      const { error } = await database
        .from("customers")
        .update({ ...senderNormalized.value.patch, updated_at: new Date().toISOString() })
        .eq("id", current.customer_id)
        .eq("organization_id", session.organizationId);
      if (error) throw new Error(error.message);
    }

    let nextRecipientSnapshot = current.recipient_snapshot as Record<string, unknown> | null;
    if (input.recipient) {
      const recipient = input.recipient;
      const { data: countryRow, error: countryError } = await database
        .from("pricing_countries")
        .select("id")
        .eq("organization_id", session.organizationId)
        .eq("name", clean(recipient.country || input.country))
        .maybeSingle();
      if (countryError || !countryRow) return fail(countryError?.message || "Crea primero el país destino del destinatario.");

      const recipientNormalized = normalizeRecipientMutation(
        {
          firstName: recipient.firstName,
          lastName: recipient.lastName,
          phone: recipient.phone,
          emails: recipient.emails,
          country: recipient.country || input.country,
          street: recipient.street,
          houseNumber: recipient.houseNumber,
          neighborhood: recipient.neighborhood,
          city: recipient.city,
          state: recipient.state,
          postalCode: recipient.postalCode,
          addressReference: recipient.addressReference,
          addressVerified: false,
        },
        countryRow.id,
      );
      if (!recipientNormalized.ok) return fail(recipientNormalized.error);

      if (currentRecipient?.id) {
        const { error } = await database
          .from("customer_recipients")
          .update({ ...recipientNormalized.value.patch, updated_at: new Date().toISOString() })
          .eq("id", currentRecipient.id)
          .eq("organization_id", session.organizationId);
        if (error) throw new Error(error.message);
      }
      nextRecipientSnapshot = recipientSnapshot(recipient);
    }

    const nextCountry = clean(input.country || input.recipient?.country || current.country);
    const { error: shipmentError } = await database
      .from("shipments")
      .update({
        customer_name: normalizePersonName(`${sender.firstName} ${sender.lastName}`),
        country: nextCountry,
        carrier: clean(input.carrier) || current.carrier,
        delivery_notes: clean(input.deliveryNotes),
        recipient_snapshot: nextRecipientSnapshot,
        updated_at: new Date().toISOString(),
      })
      .eq("id", shipmentId)
      .eq("organization_id", session.organizationId);
    if (shipmentError) throw new Error(shipmentError.message);

    const senderAddressChanged = addressKey({
      ...sender,
      country: sender.country || "USA",
    }) !== addressKey(currentCustomer ? {
      firstName: "",
      lastName: "",
      phones: [],
      phone: "",
      emails: [],
      country: currentCustomer.country || "USA",
      street: currentCustomer.street || "",
      houseNumber: currentCustomer.house_number || "",
      neighborhood: currentCustomer.neighborhood || "",
      city: currentCustomer.city || "",
      state: currentCustomer.state || "",
      postalCode: currentCustomer.postal_code || "",
      addressReference: currentCustomer.address_reference || "",
    } : null);

    if (senderAddressChanged && lifecycle.requests.length) {
      const nowIso = new Date().toISOString();
      const requestIds = lifecycle.requests.map((request) => request.id);
      const taskIds = lifecycle.requests.map((request) => request.task_id);
      const { error: requestError } = await database
        .from("customer_route_assignment_requests")
        .update({
          status: "deferred",
          review_note: "La dirección fue actualizada por Ventas; Logística debe volver a evaluar la ruta.",
          reviewed_by: session.userId,
          reviewed_at: nowIso,
          updated_at: nowIso,
        })
        .eq("organization_id", session.organizationId)
        .in("id", requestIds)
        .in("status", ["pending_approval", "template_confirmed"]);
      if (requestError) throw new Error(requestError.message);

      const { error: taskError } = await database
        .from("shipment_logistics_tasks")
        .update({
          scheduled_at: null,
          requested_schedule_at: null,
          schedule_confirmation_status: "pending",
          schedule_confirmed_at: null,
          schedule_confirmed_by: null,
          status: "pending",
          assigned_to: null,
          assigned_at: null,
          updated_at: nowIso,
        })
        .eq("organization_id", session.organizationId)
        .in("id", taskIds);
      if (taskError) throw new Error(taskError.message);

      await recordActivityHistory(supabase, session, {
        action: "customer.route_assignment.deferred",
        entityType: "shipment",
        entityId: shipmentId,
        title: `Ruta devuelta a evaluación · ${current.code}`,
        description: "La dirección del remitente cambió antes de iniciar la operación.",
        metadata: { requestIds, taskIds, source: "shipment.expediente_edit" },
      });
    }

    await recordActivityHistory(supabase, session, {
      action: "shipment.edited",
      entityType: "shipment",
      entityId: shipmentId,
      title: `Envío editado · ${current.code}`,
      description: "Se actualizaron los datos comerciales y de contacto desde el expediente.",
      metadata: {
        source: "shipment.expediente",
        senderAddressChanged,
        hasRecipient: Boolean(input.recipient),
      },
    });

    return ok({ shipmentId });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
