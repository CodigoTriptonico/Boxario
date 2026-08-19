"use server";

import { revalidatePath } from "next/cache";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import { recordActivityHistory } from "@/lib/activity-history";
import { sessionHasPermission } from "@/lib/auth/permissions";
import { requireAppSession } from "@/lib/auth/session";
import type { AppSession } from "@/lib/auth/types";
import {
  cleanShipmentJournalBody,
  readShipmentJournalCategory,
  readShipmentJournalFollowUp,
  shipmentJournalDueState,
  type ShipmentJournalAssignee,
  type ShipmentJournalCategory,
} from "@/lib/shipment-journal";
import {
  type CustomerJournalChannel,
  type CustomerJournalOutcome,
  type CustomerJournalTimelinePayload,
  type CustomerProfileHeader,
  type CustomerShipmentOption,
  type CustomerTimelineActivityItem,
  type CustomerTimelineItem,
  type CustomerTimelineJournalItem,
  type CustomerTimelineShipmentItem,
} from "@/lib/customer-journal";
import { shipmentStatusDisplayLabel } from "@/lib/shipment-display";
import { createScopedSupabase } from "@/lib/supabase/scoped";

function canManageCustomerJournal(session: AppSession) {
  return (
    sessionHasPermission(session, "sales.manage") ||
    sessionHasPermission(session, "customers.manage") ||
    sessionHasPermission(session, "sales.settings.manage") ||
    sessionHasPermission(session, "logistics.settings.manage") ||
    sessionHasPermission(session, "settings.manage")
  );
}

function canOverrideCustomerJournalEntry(session: AppSession) {
  return (
    sessionHasPermission(session, "settings.manage") ||
    sessionHasPermission(session, "sales.settings.manage")
  );
}

export async function listCustomerJournalTimelineAction(input: {
  customerId?: string;
  recipientId?: string;
}): Promise<ActionResult<CustomerJournalTimelinePayload>> {
  try {
    const session = await requireAppSession();

    if (!canManageCustomerJournal(session)) {
      throw new Error("FORBIDDEN");
    }

    const customerId = input.customerId?.trim();
    const recipientId = input.recipientId?.trim();

    if (!customerId && !recipientId) {
      return fail("Se requiere el identificador de cliente o destinatario");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    // 1. Fetch customer details
    let customerHeader: CustomerProfileHeader = {
      id: customerId || recipientId || "",
      firstName: "Cliente",
      lastName: "",
      fullName: "Cliente",
      phones: [],
      emails: [],
      street: "",
      houseNumber: "",
      neighborhood: "",
      city: "",
      state: "",
      postalCode: "",
      addressReference: "",
      exactEntranceNote: "",
      exactEntranceLat: null,
      exactEntranceLng: null,
    };

    if (customerId && !customerId.startsWith("local-")) {
      const { data: customerRow } = await supabase
        .from("customers")
        .select(
          `id, first_name, last_name, phones, email, emails,
           street, house_number, neighborhood, city, state, postal_code,
           address_reference, exact_entrance_lat, exact_entrance_lng, exact_entrance_note`
        )
        .eq("organization_id", session.organizationId)
        .eq("id", customerId)
        .maybeSingle();

      if (customerRow) {
        const rawPhones = Array.isArray(customerRow.phones)
          ? (customerRow.phones as string[])
          : [];
        const rawEmails = Array.isArray(customerRow.emails)
          ? (customerRow.emails as string[])
          : customerRow.email
            ? [customerRow.email]
            : [];
        const fullName = [customerRow.first_name, customerRow.last_name]
          .filter(Boolean)
          .join(" ")
          .trim();

        customerHeader = {
          id: customerRow.id,
          firstName: customerRow.first_name || "",
          lastName: customerRow.last_name || "",
          fullName: fullName || "Cliente",
          phones: rawPhones,
          emails: rawEmails,
          street: customerRow.street || "",
          houseNumber: customerRow.house_number || "",
          neighborhood: customerRow.neighborhood || "",
          city: customerRow.city || "",
          state: customerRow.state || "",
          postalCode: customerRow.postal_code || "",
          addressReference: customerRow.address_reference || "",
          exactEntranceNote: customerRow.exact_entrance_note || "",
          exactEntranceLat: customerRow.exact_entrance_lat,
          exactEntranceLng: customerRow.exact_entrance_lng,
        };
      }
    } else if (recipientId && !recipientId.startsWith("local-")) {
      const { data: recipientRow } = await supabase
        .from("recipients")
        .select(
          `id, first_name, last_name, phone, email, emails,
           street, house_number, neighborhood, city, state, postal_code,
           address_reference, exact_entrance_lat, exact_entrance_lng, exact_entrance_note, country`
        )
        .eq("organization_id", session.organizationId)
        .eq("id", recipientId)
        .maybeSingle();

      if (recipientRow) {
        const rawPhones = recipientRow.phone ? [recipientRow.phone] : [];
        const rawEmails = Array.isArray(recipientRow.emails)
          ? (recipientRow.emails as string[])
          : recipientRow.email
            ? [recipientRow.email]
            : [];
        const fullName = [recipientRow.first_name, recipientRow.last_name]
          .filter(Boolean)
          .join(" ")
          .trim();

        customerHeader = {
          id: recipientRow.id,
          firstName: recipientRow.first_name || "",
          lastName: recipientRow.last_name || "",
          fullName: fullName || "Destinatario",
          phones: rawPhones,
          emails: rawEmails,
          street: recipientRow.street || "",
          houseNumber: recipientRow.house_number || "",
          neighborhood: recipientRow.neighborhood || "",
          city: recipientRow.city || "",
          state: recipientRow.state || "",
          postalCode: recipientRow.postal_code || "",
          addressReference: recipientRow.address_reference || "",
          exactEntranceNote: recipientRow.exact_entrance_note || "",
          exactEntranceLat: recipientRow.exact_entrance_lat,
          exactEntranceLng: recipientRow.exact_entrance_lng,
        };
      }
    }

    // 2. Fetch all shipments associated with customer or recipient
    let shipmentQuery = supabase
      .from("shipments")
      .select(
        `id, code, created_at, status, country, carrier, total_amount, paid_amount, sale_kind,
         notes, origin_address, destination_address, recipient_id, recipient_snapshot`
      )
      .eq("organization_id", session.organizationId)
      .order("created_at", { ascending: false });

    if (customerId && !customerId.startsWith("local-")) {
      shipmentQuery = shipmentQuery.eq("customer_id", customerId);
    } else if (recipientId && !recipientId.startsWith("local-")) {
      shipmentQuery = shipmentQuery.eq("recipient_id", recipientId);
    }

    const { data: shipmentRows } = await shipmentQuery;
    const shipmentsList = shipmentRows || [];
    const shipmentIds = shipmentsList.map((s) => s.id);
    const shipmentCodeMap = new Map<string, string>();
    shipmentsList.forEach((s) => shipmentCodeMap.set(s.id, s.code));

    const shipmentOptions: CustomerShipmentOption[] = shipmentsList.map((s) => {
      const snap = s.recipient_snapshot as { firstName?: string; lastName?: string } | null;
      const recName = snap ? [snap.firstName, snap.lastName].filter(Boolean).join(" ").trim() : null;
      return {
        id: s.id,
        code: s.code,
        createdAt: s.created_at,
        status: s.status,
        statusLabel: shipmentStatusDisplayLabel(s.status),
        recipientName: recName,
      };
    });

    // 3. Fetch journal entries (customer level + shipments level)
    let journalEntries: CustomerTimelineJournalItem[] = [];
    if (
      (customerId && !customerId.startsWith("local-")) ||
      shipmentIds.length > 0
    ) {
      let journalQuery = supabase
        .from("shipment_journal_entries")
        .select(
          `id, customer_id, shipment_id, category, body, details,
           follow_up_at, assigned_to, reminder_status, source,
           created_by, created_at, updated_at, deleted_at, delete_reason,
           creator_profile:profiles!shipment_journal_entries_created_by_fkey(full_name),
           assignee_profile:profiles!shipment_journal_entries_assigned_to_fkey(full_name)`
        )
        .eq("organization_id", session.organizationId)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (customerId && shipmentIds.length > 0) {
        journalQuery = journalQuery.or(
          `customer_id.eq.${customerId},shipment_id.in.(${shipmentIds.map((id) => `"${id}"`).join(",")})`
        );
      } else if (customerId) {
        journalQuery = journalQuery.eq("customer_id", customerId);
      } else if (shipmentIds.length > 0) {
        journalQuery = journalQuery.in("shipment_id", shipmentIds);
      }

      const { data: rawJournals } = await journalQuery;

      journalEntries = (rawJournals || []).map((row) => {
        const details = (row.details as Record<string, unknown>) || {};
        const channel = (details.channel as CustomerJournalChannel) || null;
        const outcome = (details.outcome as CustomerJournalOutcome) || null;
        const isOwner = row.created_by === session.userId;
        const canOverride = canOverrideCustomerJournalEntry(session);
        const dueState = shipmentJournalDueState(row.follow_up_at, row.reminder_status as any);
        const creatorProfile = Array.isArray(row.creator_profile)
          ? row.creator_profile[0]
          : row.creator_profile;
        const assigneeProfile = Array.isArray(row.assignee_profile)
          ? row.assignee_profile[0]
          : row.assignee_profile;

        return {
          kind: "journal_entry",
          id: row.id,
          customerId: row.customer_id || customerId || "",
          shipmentId: row.shipment_id || null,
          shipmentCode: row.shipment_id ? shipmentCodeMap.get(row.shipment_id) || null : null,
          entryKind: (row.source === "manual" ? "manual" : "system") as "manual" | "system",
          category: (row.category || "customer") as ShipmentJournalCategory,
          channel,
          outcome,
          title: "",
          body: row.body || "",
          details,
          followUpAt: row.follow_up_at,
          assignedTo: row.assigned_to,
          assignedToName: assigneeProfile?.full_name || "",
          reminderStatus: (row.reminder_status || "pending") as any,
          dueState,
          actorId: row.created_by,
          actorName: creatorProfile?.full_name || "Equipo",
          createdAt: row.created_at,
          updatedAt: row.updated_at,
          edited: row.created_at !== row.updated_at,
          canEdit: isOwner || canOverride,
          canDelete: isOwner || canOverride,
        };
      });
    }

    // 4. Fetch activity history (customer + shipments)
    let activityItems: CustomerTimelineActivityItem[] = [];
    if (
      (customerId && !customerId.startsWith("local-")) ||
      shipmentIds.length > 0
    ) {
      let activityQuery = supabase
        .from("activity_history")
        .select("id, action, title, description, actor_id, actor_name, created_at, metadata")
        .eq("organization_id", session.organizationId)
        .order("created_at", { ascending: false })
        .limit(60);

      if (customerId && shipmentIds.length > 0) {
        activityQuery = activityQuery.or(
          `and(entity_type.eq.customer,entity_id.eq.${customerId}),and(entity_type.eq.shipment,entity_id.in.(${shipmentIds.map((id) => `"${id}"`).join(",")}))`
        );
      } else if (customerId) {
        activityQuery = activityQuery.eq("entity_type", "customer").eq("entity_id", customerId);
      } else if (shipmentIds.length > 0) {
        activityQuery = activityQuery.eq("entity_type", "shipment").in("entity_id", shipmentIds);
      }

      const { data: rawActivities } = await activityQuery;
      activityItems = (rawActivities || []).map((a) => ({
        kind: "activity",
        id: a.id,
        action: a.action,
        title: a.title || a.action,
        description: a.description || "",
        actorId: a.actor_id,
        actorName: a.actor_name || "Sistema",
        createdAt: a.created_at,
        metadata: a.metadata as Record<string, unknown> | null,
      }));
    }

    // 5. Build shipment timeline items
    const shipmentTimelineItems: CustomerTimelineShipmentItem[] = shipmentsList.map((s) => {
      const snap = s.recipient_snapshot as { firstName?: string; lastName?: string } | null;
      const recName = snap ? [snap.firstName, snap.lastName].filter(Boolean).join(" ").trim() : null;
      const origin = (s.origin_address as any) || {};
      const destination = (s.destination_address as any) || {};

      return {
        kind: "shipment",
        id: s.id,
        code: s.code,
        createdAt: s.created_at,
        status: s.status,
        statusLabel: shipmentStatusDisplayLabel(s.status),
        country: s.country || "USA",
        carrier: s.carrier || "",
        paid: Number(s.paid_amount ?? s.total_amount ?? 0),
        saleKind: s.sale_kind === "empty_box_deposit" ? "empty_box_deposit" : "full",
        deliveryNotes: s.notes || "",
        recipientId: s.recipient_id,
        recipientName: recName,
        originAddress: {
          street: origin.street,
          houseNumber: origin.houseNumber || origin.house_number,
          neighborhood: origin.neighborhood,
          city: origin.city,
          state: origin.state,
          postalCode: origin.postalCode || origin.postal_code,
          country: origin.country || "USA",
          addressReference: origin.addressReference || origin.address_reference,
          exactEntranceNote: origin.exactEntranceNote || origin.exact_entrance_note,
          lat: origin.lat,
          lng: origin.lng,
        },
        destinationAddress: {
          street: destination.street,
          houseNumber: destination.houseNumber || destination.house_number,
          neighborhood: destination.neighborhood,
          city: destination.city,
          state: destination.state,
          postalCode: destination.postalCode || destination.postal_code,
          country: destination.country,
          addressReference: destination.addressReference || destination.address_reference,
          lat: destination.lat,
          lng: destination.lng,
        },
      };
    });

    // 6. Fetch internal assignees
    const { data: assigneesData } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("organization_id", session.organizationId)
      .order("full_name", { ascending: true });

    const assignees: ShipmentJournalAssignee[] = (assigneesData || []).map((p) => ({
      id: p.id,
      label: p.full_name?.trim() || p.email?.trim() || "Usuario",
    }));

    // 7. Merge and sort all items chronologically (newest first)
    const allTimelineItems: CustomerTimelineItem[] = [
      ...journalEntries,
      ...shipmentTimelineItems,
      ...activityItems,
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return ok({
      customer: customerHeader,
      timeline: allTimelineItems,
      shipments: shipmentOptions,
      assignees,
    });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function createCustomerJournalEntryAction(input: {
  customerId: string;
  shipmentId?: string | null;
  category?: ShipmentJournalCategory;
  body: string;
  channel?: CustomerJournalChannel;
  outcome?: CustomerJournalOutcome;
  followUpAt?: string | null;
  assignedTo?: string | null;
}): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireAppSession();

    if (!canManageCustomerJournal(session)) {
      throw new Error("FORBIDDEN");
    }

    const customerId = input.customerId?.trim();
    if (!customerId) {
      return fail("Cliente no especificado");
    }

    const body = cleanShipmentJournalBody(input.body);
    const category = readShipmentJournalCategory(input.category || "customer");
    const followUpAt = readShipmentJournalFollowUp(input.followUpAt);
    const assignedTo = input.assignedTo?.trim() || null;
    const shipmentId = input.shipmentId?.trim() || null;

    if (!body && !followUpAt) {
      return fail("Escribe una nota o programa un recordatorio");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const details: Record<string, unknown> = {};
    if (input.channel) details.channel = input.channel;
    if (input.outcome) details.outcome = input.outcome;

    const { data: inserted, error } = await supabase
      .from("shipment_journal_entries")
      .insert({
        organization_id: session.organizationId,
        customer_id: customerId.startsWith("local-") ? null : customerId,
        shipment_id: shipmentId,
        category,
        body,
        details,
        follow_up_at: followUpAt,
        assigned_to: assignedTo,
        reminder_status: followUpAt ? "pending" : "completed",
        source: "manual",
        created_by: session.userId,
        updated_by: session.userId,
      })
      .select("id")
      .single();

    if (error || !inserted) {
      throw new Error(error?.message || "No fue posible crear la entrada de bitácora");
    }

    await recordActivityHistory(supabase, session, {
      entityType: "customer",
      entityId: customerId,
      action: "customer.journal_entry_created",
      title: "Nota registrada en bitácora",
      description: body || (followUpAt ? `Recordatorio programado para ${followUpAt}` : "Nota añadida"),
      metadata: {
        entryId: inserted.id,
        category,
        shipmentId,
        channel: input.channel,
        outcome: input.outcome,
      },
    });

    revalidatePath("/envios");
    revalidatePath("/logistica");

    return ok({ id: inserted.id });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function updateCustomerJournalEntryAction(input: {
  entryId: string;
  body: string;
  category?: ShipmentJournalCategory;
  channel?: CustomerJournalChannel;
  outcome?: CustomerJournalOutcome;
  followUpAt?: string | null;
  assignedTo?: string | null;
  reminderStatus?: "pending" | "completed" | "cancelled";
}): Promise<ActionResult<void>> {
  try {
    const session = await requireAppSession();

    if (!canManageCustomerJournal(session)) {
      throw new Error("FORBIDDEN");
    }

    const entryId = input.entryId?.trim();
    if (!entryId) return fail("Identificador de entrada no especificado");

    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");

    const { data: existing, error: findError } = await supabase
      .from("shipment_journal_entries")
      .select("id, created_by, category, details, customer_id, shipment_id")
      .eq("organization_id", session.organizationId)
      .eq("id", entryId)
      .is("deleted_at", null)
      .maybeSingle();

    if (findError || !existing) return fail("Entrada no encontrada o eliminada");

    const isOwner = existing.created_by === session.userId;
    if (!isOwner && !canOverrideCustomerJournalEntry(session)) {
      throw new Error("FORBIDDEN");
    }

    const body = cleanShipmentJournalBody(input.body);
    const category = readShipmentJournalCategory(input.category || (existing.category as any));
    const followUpAt = readShipmentJournalFollowUp(input.followUpAt);
    const assignedTo = input.assignedTo === undefined ? undefined : input.assignedTo?.trim() || null;

    const currentDetails = (existing.details as Record<string, unknown>) || {};
    const details = {
      ...currentDetails,
      ...(input.channel ? { channel: input.channel } : {}),
      ...(input.outcome ? { outcome: input.outcome } : {}),
    };

    const updatePayload: Record<string, unknown> = {
      body,
      category,
      details,
      updated_by: session.userId,
      updated_at: new Date().toISOString(),
    };

    if (input.followUpAt !== undefined) updatePayload.follow_up_at = followUpAt;
    if (assignedTo !== undefined) updatePayload.assigned_to = assignedTo;
    if (input.reminderStatus) updatePayload.reminder_status = input.reminderStatus;

    const { error: updateError } = await supabase
      .from("shipment_journal_entries")
      .update(updatePayload)
      .eq("organization_id", session.organizationId)
      .eq("id", entryId);

    if (updateError) throw new Error(updateError.message);

    revalidatePath("/envios");
    revalidatePath("/logistica");

    return ok(undefined);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function deleteCustomerJournalEntryAction(input: {
  entryId: string;
  reason: string;
}): Promise<ActionResult<void>> {
  try {
    const session = await requireAppSession();

    if (!canManageCustomerJournal(session)) {
      throw new Error("FORBIDDEN");
    }

    const entryId = input.entryId?.trim();
    const reason = input.reason?.trim();

    if (!entryId) return fail("Entrada no especificada");
    if (!reason) return fail("Indica el motivo de la eliminación");

    const supabase = await createScopedSupabase(session);
    if (!supabase) return fail("Supabase no configurado");

    const { data: existing, error: findError } = await supabase
      .from("shipment_journal_entries")
      .select("id, created_by, customer_id, shipment_id")
      .eq("organization_id", session.organizationId)
      .eq("id", entryId)
      .is("deleted_at", null)
      .maybeSingle();

    if (findError || !existing) return fail("Entrada no encontrada");

    const isOwner = existing.created_by === session.userId;
    if (!isOwner && !canOverrideCustomerJournalEntry(session)) {
      throw new Error("FORBIDDEN");
    }

    const { error: deleteError } = await supabase
      .from("shipment_journal_entries")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: session.userId,
        delete_reason: reason,
        updated_at: new Date().toISOString(),
      })
      .eq("organization_id", session.organizationId)
      .eq("id", entryId);

    if (deleteError) throw new Error(deleteError.message);

    revalidatePath("/envios");
    revalidatePath("/logistica");

    return ok(undefined);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
