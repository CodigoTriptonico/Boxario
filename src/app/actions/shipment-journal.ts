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
  shipmentJournalCategoryLabel,
  shipmentJournalDueState,
  type ShipmentJournalAssignee,
  type ShipmentJournalCategory,
  type ShipmentJournalEntry,
  type ShipmentJournalReminderState,
} from "@/lib/shipment-journal";
import { createScopedSupabase } from "@/lib/supabase/scoped";

type JournalDbRow = {
  id: string;
  shipment_id: string;
  category: ShipmentJournalCategory;
  body: string;
  details: Record<string, unknown> | null;
  follow_up_at: string | null;
  assigned_to: string | null;
  reminder_status: ShipmentJournalReminderState;
  source: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  revision_count: number;
  deleted_at: string | null;
  delete_reason: string;
};

type ActivityDbRow = {
  id: string;
  action: string;
  title: string;
  description: string;
  actor_id: string | null;
  actor_name: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

function canReadJournal(session: AppSession) {
  return (
    sessionHasPermission(session, "sales.manage") ||
    sessionHasPermission(session, "sales.settings.manage") ||
    sessionHasPermission(session, "logistics.settings.manage") ||
    sessionHasPermission(session, "accounting.view") ||
    sessionHasPermission(session, "audit.immutable.view") ||
    sessionHasPermission(session, "settings.manage")
  );
}

function canManageCategory(session: AppSession, category: ShipmentJournalCategory) {
  void category;
  if (sessionHasPermission(session, "settings.manage")) {
    return true;
  }
  return (
    sessionHasPermission(session, "sales.manage") ||
    sessionHasPermission(session, "logistics.settings.manage") ||
    sessionHasPermission(session, "accounting.post")
  );
}

function canOverrideEntry(session: AppSession, category: ShipmentJournalCategory) {
  if (sessionHasPermission(session, "settings.manage")) {
    return true;
  }
  if (category === "logistics") {
    return sessionHasPermission(session, "logistics.settings.manage");
  }
  if (category === "billing") {
    return sessionHasPermission(session, "accounting.post");
  }
  return sessionHasPermission(session, "sales.settings.manage");
}

async function assertShipmentVisible(
  supabase: NonNullable<Awaited<ReturnType<typeof createScopedSupabase>>>,
  organizationId: string,
  shipmentId: string,
) {
  const { data, error } = await supabase
    .from("shipments")
    .select("id, code")
    .eq("organization_id", organizationId)
    .eq("id", shipmentId)
    .maybeSingle();
  if (error || !data) {
    throw new Error("Invoice no encontrado o sin acceso");
  }
  return data;
}

async function profileLabels(
  supabase: NonNullable<Awaited<ReturnType<typeof createScopedSupabase>>>,
  organizationId: string,
  ids: Array<string | null>,
) {
  const unique = Array.from(new Set(ids.filter(Boolean) as string[]));
  if (!unique.length) {
    return new Map<string, string>();
  }
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, email")
    .eq("organization_id", organizationId)
    .in("id", unique);
  return new Map(
    (data || []).map((profile) => [
      profile.id,
      String(profile.full_name || profile.email || "Usuario"),
    ]),
  );
}

export async function listShipmentJournalAction(
  shipmentId: string,
): Promise<ActionResult<ShipmentJournalEntry[]>> {
  try {
    const session = await requireAppSession();
    if (!canReadJournal(session)) {
      throw new Error("FORBIDDEN");
    }
    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }
    await assertShipmentVisible(supabase, session.organizationId, shipmentId);

    const [journalResult, activityResult] = await Promise.all([
      supabase
        .from("shipment_journal_entries")
        .select("id, shipment_id, category, body, details, follow_up_at, assigned_to, reminder_status, source, created_by, created_at, updated_at, revision_count, deleted_at, delete_reason")
        .eq("organization_id", session.organizationId)
        .eq("shipment_id", shipmentId)
        .order("created_at", { ascending: false })
        .limit(200),
      supabase
        .from("activity_history")
        .select("id, action, title, description, actor_id, actor_name, created_at, metadata")
        .eq("organization_id", session.organizationId)
        .eq("entity_type", "shipment")
        .eq("entity_id", shipmentId)
        .order("created_at", { ascending: false })
        .limit(200),
    ]);

    if (journalResult.error && journalResult.error.code !== "42P01") {
      return fail(journalResult.error.message);
    }
    if (activityResult.error && activityResult.error.code !== "42P01") {
      return fail(activityResult.error.message);
    }

    const journalRows = (journalResult.data || []) as JournalDbRow[];
    const rawActivities = (activityResult.data || []) as ActivityDbRow[];
    const completedDriverTaskIds = new Set(
      rawActivities
        .filter((row) => row.action === "shipment.logistics_task_updated")
        .map((row) => String(row.metadata?.taskId || ""))
        .filter(Boolean),
    );
    const activities = rawActivities.filter((row) => {
      if (
        row.action === "shipment.contact_log_created" ||
        row.action === "shipment.logistics_surcharge_applied" ||
        row.action.startsWith("shipment.journal_")
      ) {
        return false;
      }
      if (
        row.action === "shipment.driver_payment_not_collected" &&
        completedDriverTaskIds.has(String(row.metadata?.taskId || ""))
      ) {
        return false;
      }
      return true;
    });
    const labels = await profileLabels(
      supabase,
      session.organizationId,
      journalRows.flatMap((row) => [row.created_by, row.assigned_to]),
    );

    const manual = journalRows.map<ShipmentJournalEntry>((row) => {
      const owns = row.created_by === session.userId;
      const canOverride = canOverrideEntry(session, row.category);
      return {
        id: row.id,
        shipmentId: row.shipment_id,
        kind: row.source === "manual" || row.source === "legacy_contact" ? "manual" : "system",
        category: row.category,
        title: shipmentJournalCategoryLabel(row.category),
        body: row.body,
        details: row.details || {},
        source: row.source,
        actorId: row.created_by,
        actorName: (row.created_by && labels.get(row.created_by)) || "Sistema",
        assignedTo: row.assigned_to,
        assignedToName: (row.assigned_to && labels.get(row.assigned_to)) || "",
        followUpAt: row.follow_up_at,
        reminderStatus: row.reminder_status,
        dueState: shipmentJournalDueState(row.follow_up_at, row.reminder_status),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        edited: row.revision_count > 0,
        deleted: Boolean(row.deleted_at),
        deleteReason: row.delete_reason || "",
        canEdit:
          (row.source === "manual" || row.source === "legacy_contact") &&
          !row.deleted_at &&
          (owns || canOverride),
        canDelete:
          (row.source === "manual" || row.source === "legacy_contact") &&
          !row.deleted_at &&
          (owns || canOverride),
        canUpdateReminder:
          (row.source === "manual" || row.source === "legacy_contact") &&
          !row.deleted_at &&
          Boolean(row.follow_up_at) &&
          (owns || row.assigned_to === session.userId || canOverride),
      };
    });

    const system = activities.map<ShipmentJournalEntry>((row) => ({
      id: `activity:${row.id}`,
      shipmentId,
      kind: "system",
      category:
        row.action.includes("payment") || row.action.includes("billing") || row.action.includes("charge")
          ? "billing"
          : row.action.includes("logistics") || row.action.includes("route") || row.action.includes("driver")
            ? "logistics"
            : row.action.includes("sale") || row.action.includes("invoice")
              ? "sales"
              : "general",
      title: row.title,
      body: row.description,
      details: row.metadata || {},
      source: row.action,
      actorId: row.actor_id,
      actorName: row.actor_name || "Sistema",
      assignedTo: null,
      assignedToName: "",
      followUpAt: null,
      reminderStatus: "completed",
      dueState: "none",
      createdAt: row.created_at,
      updatedAt: row.created_at,
      edited: false,
      deleted: false,
      deleteReason: "",
      canEdit: false,
      canDelete: false,
      canUpdateReminder: false,
    }));

    return ok(
      [...manual, ...system].sort(
        (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt),
      ),
    );
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function listShipmentJournalAssigneesAction(): Promise<
  ActionResult<ShipmentJournalAssignee[]>
> {
  try {
    const session = await requireAppSession();
    if (!canReadJournal(session)) {
      throw new Error("FORBIDDEN");
    }
    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .eq("organization_id", session.organizationId)
      .eq("is_active", true)
      .order("full_name");
    if (error) {
      return fail(error.message);
    }
    return ok(
      (data || [])
        .map((profile) => ({
          id: profile.id,
          label: String(profile.full_name || profile.email || "Usuario"),
        }))
        .sort((left, right) => {
          if (left.id === session.userId) return -1;
          if (right.id === session.userId) return 1;
          return left.label.localeCompare(right.label, "es");
        }),
    );
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function createShipmentJournalEntryAction(input: {
  shipmentId: string;
  category: ShipmentJournalCategory;
  body?: string;
  details?: Record<string, unknown>;
  followUpAt?: string | null;
  assignedTo?: string | null;
}): Promise<ActionResult<null>> {
  try {
    const session = await requireAppSession();
    const category = readShipmentJournalCategory(input.category);
    if (!canManageCategory(session, category)) {
      throw new Error("FORBIDDEN");
    }
    const body = cleanShipmentJournalBody(input.body);
    const followUp = readShipmentJournalFollowUp(input.followUpAt);
    if (!followUp.ok) {
      return fail(followUp.error);
    }
    if (!body && !followUp.value) {
      return fail("Escribe una nota o agrega un recordatorio");
    }
    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }
    const shipment = await assertShipmentVisible(
      supabase,
      session.organizationId,
      input.shipmentId,
    );
    const assignedTo = followUp.value ? input.assignedTo || session.userId : null;
    if (assignedTo) {
      const { data: assignee } = await supabase
        .from("profiles")
        .select("id")
        .eq("organization_id", session.organizationId)
        .eq("id", assignedTo)
        .eq("is_active", true)
        .maybeSingle();
      if (!assignee) {
        return fail("La persona asignada no pertenece a la organización");
      }
    }

    const { error } = await supabase.from("shipment_journal_entries").insert({
      organization_id: session.organizationId,
      shipment_id: input.shipmentId,
      category,
      body,
      details: input.details || {},
      follow_up_at: followUp.value,
      assigned_to: assignedTo,
      reminder_status: "pending",
      source: "manual",
      created_by: session.userId,
      updated_by: session.userId,
    });
    if (error) {
      return fail(error.message);
    }
    await recordActivityHistory(supabase, session, {
      action: "shipment.journal_entry_created",
      entityType: "shipment",
      entityId: input.shipmentId,
      title: `Bitácora · ${shipment.code}`,
      description: body || "Recordatorio creado",
      metadata: { category, followUpAt: followUp.value, assignedTo },
    });
    revalidatePath("/seguimiento");
    return ok(null);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

async function loadMutableEntry(
  supabase: NonNullable<Awaited<ReturnType<typeof createScopedSupabase>>>,
  session: AppSession,
  entryId: string,
) {
  const { data, error } = await supabase
    .from("shipment_journal_entries")
    .select("id, shipment_id, category, body, details, follow_up_at, assigned_to, reminder_status, source, created_by, revision_count, deleted_at")
    .eq("organization_id", session.organizationId)
    .eq("id", entryId)
    .maybeSingle();
  if (
    error ||
    !data ||
    (data.source !== "manual" && data.source !== "legacy_contact") ||
    data.deleted_at
  ) {
    throw new Error("Entrada no disponible");
  }
  if (data.created_by !== session.userId && !canOverrideEntry(session, data.category)) {
    throw new Error("FORBIDDEN");
  }
  return data;
}

export async function updateShipmentJournalEntryAction(input: {
  entryId: string;
  body?: string;
  followUpAt?: string | null;
  assignedTo?: string | null;
}): Promise<ActionResult<null>> {
  try {
    const session = await requireAppSession();
    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }
    const current = await loadMutableEntry(supabase, session, input.entryId);
    const body = cleanShipmentJournalBody(input.body);
    const followUp = readShipmentJournalFollowUp(input.followUpAt);
    if (!followUp.ok) {
      return fail(followUp.error);
    }
    if (!body && !followUp.value) {
      return fail("Escribe una nota o agrega un recordatorio");
    }
    const assignedTo = followUp.value ? input.assignedTo || session.userId : null;
    if (assignedTo) {
      const { data: assignee } = await supabase
        .from("profiles")
        .select("id")
        .eq("organization_id", session.organizationId)
        .eq("id", assignedTo)
        .eq("is_active", true)
        .maybeSingle();
      if (!assignee) {
        return fail("La persona asignada no pertenece a la organización");
      }
    }
    const next = {
      body,
      follow_up_at: followUp.value,
      assigned_to: assignedTo,
      reminder_status: followUp.value ? "pending" : "cancelled",
    };
    const { error } = await supabase
      .from("shipment_journal_entries")
      .update({
        ...next,
        updated_by: session.userId,
        updated_at: new Date().toISOString(),
        revision_count: Number(current.revision_count || 0) + 1,
      })
      .eq("id", current.id);
    if (error) {
      return fail(error.message);
    }
    await recordActivityHistory(supabase, session, {
      action: "shipment.journal_entry_updated",
      entityType: "shipment",
      entityId: current.shipment_id,
      title: "Entrada de Bitácora editada",
      description: body || "Recordatorio actualizado",
      metadata: {
        entryId: current.id,
        before: {
          body: current.body,
          followUpAt: current.follow_up_at,
          assignedTo: current.assigned_to,
          reminderStatus: current.reminder_status,
        },
        after: {
          body: next.body,
          followUpAt: next.follow_up_at,
          assignedTo: next.assigned_to,
          reminderStatus: next.reminder_status,
        },
      },
    });
    revalidatePath("/seguimiento");
    return ok(null);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function deleteShipmentJournalEntryAction(input: {
  entryId: string;
  reason: string;
}): Promise<ActionResult<null>> {
  try {
    const session = await requireAppSession();
    const reason = String(input.reason || "").trim().slice(0, 500);
    if (!reason) {
      return fail("Escribe la razón para eliminar");
    }
    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }
    const current = await loadMutableEntry(supabase, session, input.entryId);
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("shipment_journal_entries")
      .update({
        deleted_by: session.userId,
        deleted_at: now,
        delete_reason: reason,
        reminder_status: "cancelled",
        updated_by: session.userId,
        updated_at: now,
      })
      .eq("id", current.id);
    if (error) {
      return fail(error.message);
    }
    await recordActivityHistory(supabase, session, {
      action: "shipment.journal_entry_deleted",
      entityType: "shipment",
      entityId: current.shipment_id,
      title: "Entrada de Bitácora eliminada",
      description: reason,
      metadata: {
        entryId: current.id,
        before: {
          body: current.body,
          details: current.details,
          followUpAt: current.follow_up_at,
          assignedTo: current.assigned_to,
        },
        reason,
      },
    });
    revalidatePath("/seguimiento");
    return ok(null);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function updateShipmentJournalReminderAction(input: {
  entryId: string;
  status: "completed" | "cancelled";
}): Promise<ActionResult<null>> {
  try {
    const session = await requireAppSession();
    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }
    const { data: current, error: currentError } = await supabase
      .from("shipment_journal_entries")
      .select("id, shipment_id, category, source, created_by, assigned_to, follow_up_at, deleted_at")
      .eq("organization_id", session.organizationId)
      .eq("id", input.entryId)
      .maybeSingle();
    if (
      currentError ||
      !current ||
      (current.source !== "manual" && current.source !== "legacy_contact") ||
      current.deleted_at ||
      !current.follow_up_at
    ) {
      return fail("Recordatorio no disponible");
    }
    if (
      current.created_by !== session.userId &&
      current.assigned_to !== session.userId &&
      !canOverrideEntry(session, current.category)
    ) {
      throw new Error("FORBIDDEN");
    }
    const { error } = await supabase
      .from("shipment_journal_entries")
      .update({
        reminder_status: input.status,
        updated_by: session.userId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", current.id);
    if (error) {
      return fail(error.message);
    }
    await recordActivityHistory(supabase, session, {
      action: `shipment.journal_reminder_${input.status}`,
      entityType: "shipment",
      entityId: current.shipment_id,
      title: input.status === "completed" ? "Recordatorio completado" : "Recordatorio cancelado",
      metadata: { entryId: current.id },
    });
    revalidatePath("/seguimiento");
    return ok(null);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function listMyShipmentJournalRemindersAction(): Promise<
  ActionResult<ShipmentJournalEntry[]>
> {
  try {
    const session = await requireAppSession();
    if (!canReadJournal(session)) {
      return ok([]);
    }
    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return ok([]);
    }
    const { data, error } = await supabase
      .from("shipment_journal_entries")
      .select("id, shipment_id, category, body, details, follow_up_at, assigned_to, reminder_status, source, created_by, created_at, updated_at, revision_count, deleted_at, delete_reason, shipments(code)")
      .eq("organization_id", session.organizationId)
      .eq("assigned_to", session.userId)
      .eq("reminder_status", "pending")
      .is("deleted_at", null)
      .not("follow_up_at", "is", null)
      .order("follow_up_at", { ascending: true })
      .limit(20);
    if (error) {
      return error.code === "42P01" ? ok([]) : fail(error.message);
    }
    const rows = (data || []) as Array<JournalDbRow & {
      shipments?: { code?: string | null } | Array<{ code?: string | null }> | null;
    }>;
    return ok(rows.map((row) => ({
      id: row.id,
      shipmentId: row.shipment_id,
      kind: "manual",
      category: row.category,
      title: shipmentJournalCategoryLabel(row.category),
      body: row.body,
      details: {
        ...(row.details || {}),
        shipmentCode: Array.isArray(row.shipments)
          ? row.shipments[0]?.code || ""
          : row.shipments?.code || "",
      },
      source: row.source,
      actorId: row.created_by,
      actorName: "",
      assignedTo: row.assigned_to,
      assignedToName: session.fullName || session.email,
      followUpAt: row.follow_up_at,
      reminderStatus: row.reminder_status,
      dueState: shipmentJournalDueState(row.follow_up_at, row.reminder_status),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      edited: row.revision_count > 0,
      deleted: false,
      deleteReason: "",
      canEdit: false,
      canDelete: false,
      canUpdateReminder: true,
    })));
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
