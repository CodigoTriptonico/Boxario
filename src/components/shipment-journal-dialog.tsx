"use client";

import {
  Bell,
  CalendarClock,
  Check,
  Clock3,
  ExternalLink,
  Loader2,
  Pencil,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  createShipmentJournalEntryAction,
  deleteShipmentJournalEntryAction,
  listShipmentJournalAction,
  listShipmentJournalAssigneesAction,
  updateShipmentJournalEntryAction,
  updateShipmentJournalReminderAction,
} from "@/app/actions/shipment-journal";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui-blocks";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  SHIPMENT_JOURNAL_CATEGORIES,
  shipmentJournalCategoryLabel,
  type ShipmentJournalAssignee,
  type ShipmentJournalCategory,
  type ShipmentJournalEntry,
} from "@/lib/shipment-journal";

type ShipmentIdentity = {
  id: string;
  code: string;
  customer_name: string;
};

function dateTimeLocalValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function evidenceUrl(details: Record<string, unknown>) {
  for (const key of ["evidenceUrl", "photoUrl", "evidence_url"]) {
    const value = details[key];
    if (typeof value === "string" && value) return value;
  }
  return "";
}

function dueBadge(entry: ShipmentJournalEntry) {
  if (entry.reminderStatus === "completed") return "Completado";
  if (entry.reminderStatus === "cancelled") return "Cancelado";
  if (entry.dueState === "overdue") return "Vencido";
  if (entry.dueState === "today") return "Hoy";
  if (entry.dueState === "pending") return "Pendiente";
  return "";
}

export function ShipmentJournalDialog({
  open,
  shipment,
  onClose,
  onError,
}: {
  open: boolean;
  shipment: ShipmentIdentity;
  onClose: () => void;
  onError: (message: string) => void;
}) {
  const mounted = useHydrated();
  const [items, setItems] = useState<ShipmentJournalEntry[]>([]);
  const [assignees, setAssignees] = useState<ShipmentJournalAssignee[]>([]);
  const [category, setCategory] = useState<ShipmentJournalCategory>("customer");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState("");
  const [outcome, setOutcome] = useState("");
  const [followUpAt, setFollowUpAt] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [editing, setEditing] = useState<ShipmentJournalEntry | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ShipmentJournalEntry | null>(null);
  const [deleteReason, setDeleteReason] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const hasReminder = Boolean(followUpAt);
  const submitDisabled = saving || (!body.trim() && !hasReminder);

  async function reload() {
    setLoading(true);
    const result = await listShipmentJournalAction(shipment.id);
    setLoading(false);
    if (!result.ok) {
      onError(result.error);
      return;
    }
    setItems(result.data);
  }

  useEffect(() => {
    if (!open) return;
    queueMicrotask(() => {
      void reload();
      void listShipmentJournalAssigneesAction().then((result) => {
        if (!result.ok) return;
        setAssignees(result.data);
        if (!assignedTo && result.data.length) {
          setAssignedTo(result.data[0].id);
        }
      });
    });
    // shipment.id deliberately resets the dialog for each shipment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, shipment.id]);

  function resetComposer() {
    setEditing(null);
    setBody("");
    setChannel("");
    setOutcome("");
    setFollowUpAt("");
  }

  function beginEdit(entry: ShipmentJournalEntry) {
    setEditing(entry);
    setCategory(entry.category);
    setBody(entry.body);
    setFollowUpAt(dateTimeLocalValue(entry.followUpAt));
    setAssignedTo(entry.assignedTo || "");
    const detailChannel = entry.details.channel;
    const detailOutcome = entry.details.outcome;
    setChannel(typeof detailChannel === "string" ? detailChannel : "");
    setOutcome(typeof detailOutcome === "string" ? detailOutcome : "");
  }

  async function submit() {
    setSaving(true);
    const result = editing
      ? await updateShipmentJournalEntryAction({
          entryId: editing.id,
          body,
          followUpAt: followUpAt || null,
          assignedTo: assignedTo || null,
        })
      : await createShipmentJournalEntryAction({
          shipmentId: shipment.id,
          category,
          body,
          followUpAt: followUpAt || null,
          assignedTo: assignedTo || null,
          details: category === "customer" ? { channel, outcome } : {},
        });
    setSaving(false);
    if (!result.ok) {
      onError(result.error);
      return;
    }
    resetComposer();
    await reload();
  }

  async function remove() {
    if (!deleteTarget) return;
    setSaving(true);
    const result = await deleteShipmentJournalEntryAction({
      entryId: deleteTarget.id,
      reason: deleteReason,
    });
    setSaving(false);
    if (!result.ok) {
      onError(result.error);
      return;
    }
    setDeleteTarget(null);
    setDeleteReason("");
    await reload();
  }

  async function setReminder(entry: ShipmentJournalEntry, status: "completed" | "cancelled") {
    const result = await updateShipmentJournalReminderAction({ entryId: entry.id, status });
    if (!result.ok) {
      onError(result.error);
      return;
    }
    await reload();
  }

  const timeline = useMemo(() => items, [items]);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[240] flex items-end justify-center bg-slate-950/75 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label={`Bitácora de ${shipment.code}`} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div className="flex h-[94dvh] w-full max-w-5xl flex-col overflow-hidden rounded-t-2xl border border-black bg-surface-panel shadow-2xl sm:h-[min(90dvh,52rem)] sm:rounded-2xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-black bg-surface-card-header px-4 py-3">
          <div className="min-w-0">
            <h2 className="truncate text-lg font-black text-white">Bitácora · {shipment.code}</h2>
            <p className="truncate text-sm font-semibold text-slate-400">{shipment.customer_name}</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg border border-black bg-surface-inset text-slate-300" aria-label="Cerrar">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 md:grid-cols-[minmax(18rem,22rem)_minmax(0,1fr)]">
          <aside className="grid content-start gap-3 overflow-y-auto border-b border-black p-3 md:border-b-0 md:border-r">
            <div className="grid grid-cols-5 gap-1 rounded-lg border border-black bg-surface-inset p-1">
              {SHIPMENT_JOURNAL_CATEGORIES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  disabled={Boolean(editing)}
                  onClick={() => setCategory(option.value)}
                  className={`min-w-0 rounded-md px-1 py-2 text-[10px] font-black ${category === option.value ? "bg-emerald-400 text-slate-950" : "text-slate-400"}`}
                  title={option.label}
                >
                  {option.label === "Nota general" ? "General" : option.label}
                </button>
              ))}
            </div>

            {category === "customer" ? (
              <div className="grid grid-cols-2 gap-2">
                <select value={channel} onChange={(event) => setChannel(event.target.value)} className="h-10 min-w-0 rounded-lg border border-black bg-surface-inset px-2 text-sm font-bold text-white">
                  <option value="">Medio opcional</option>
                  <option value="call">Llamada</option>
                  <option value="whatsapp">WhatsApp</option>
                  <option value="sms">SMS</option>
                  <option value="email">Email</option>
                  <option value="other">Otro</option>
                </select>
                <select value={outcome} onChange={(event) => setOutcome(event.target.value)} className="h-10 min-w-0 rounded-lg border border-black bg-surface-inset px-2 text-sm font-bold text-white">
                  <option value="">Resultado opcional</option>
                  <option value="answered">Contestó</option>
                  <option value="no_answer">No contestó</option>
                  <option value="left_message">Mensaje dejado</option>
                  <option value="call_back">Llamar después</option>
                  <option value="wrong_number">Número incorrecto</option>
                </select>
              </div>
            ) : null}

            <textarea
              value={body}
              onChange={(event) => setBody(event.target.value)}
              rows={5}
              maxLength={4000}
              placeholder="Escribe una nota…"
              className="min-h-28 resize-y rounded-lg border border-black bg-surface-inset p-3 text-sm font-semibold text-white outline-none placeholder:text-slate-500"
            />

            <div className="grid gap-2 rounded-lg border border-black bg-surface-card p-3">
              <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-slate-400">
                <Bell className="h-4 w-4" /> Recordatorio opcional
              </span>
              <input type="datetime-local" value={followUpAt} onChange={(event) => setFollowUpAt(event.target.value)} className="h-10 rounded-lg border border-black bg-surface-inset px-2 text-sm font-bold text-white" />
              {hasReminder ? (
                <select value={assignedTo} onChange={(event) => setAssignedTo(event.target.value)} className="h-10 rounded-lg border border-black bg-surface-inset px-2 text-sm font-bold text-white">
                  {assignees.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.label}</option>)}
                </select>
              ) : null}
            </div>

            <div className="flex gap-2">
              {editing ? (
                <button type="button" className={`${secondaryButtonClass} flex-1`} onClick={resetComposer}>Cancelar edición</button>
              ) : null}
              <button type="button" className={`${primaryButtonClass} flex-1 gap-2`} disabled={submitDisabled} onClick={() => void submit()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {editing ? "Guardar cambios" : "Agregar"}
              </button>
            </div>
          </aside>

          <section className="min-h-0 overflow-y-auto p-3 sm:p-4">
            {loading ? (
              <div className="flex h-40 items-center justify-center text-slate-400"><Loader2 className="h-5 w-5 animate-spin" /></div>
            ) : timeline.length ? (
              <div className="grid gap-3">
                {timeline.map((entry) => {
                  const reminderLabel = dueBadge(entry);
                  const evidence = evidenceUrl(entry.details);
                  return (
                    <article key={entry.id} className={`rounded-xl border p-3 ${entry.deleted ? "border-rose-900/70 bg-rose-950/15" : "border-black bg-surface-card"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded-md bg-surface-inset px-2 py-1 text-[10px] font-black uppercase text-emerald-200">{shipmentJournalCategoryLabel(entry.category)}</span>
                            {entry.kind === "system" ? <span className="text-[10px] font-black uppercase text-sky-300">Automática</span> : null}
                            {entry.edited ? <span className="text-[10px] font-black uppercase text-amber-300">Editada</span> : null}
                            {entry.deleted ? <span className="text-[10px] font-black uppercase text-rose-300">Eliminada</span> : null}
                            {reminderLabel ? <span className={`text-[10px] font-black uppercase ${entry.dueState === "overdue" ? "text-rose-300" : entry.dueState === "today" ? "text-amber-300" : "text-slate-400"}`}>{reminderLabel}</span> : null}
                          </div>
                          <h3 className="mt-2 text-sm font-black text-white">{entry.title}</h3>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          {entry.canEdit ? <button type="button" onClick={() => beginEdit(entry)} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-surface-inset hover:text-white" aria-label="Editar"><Pencil className="h-3.5 w-3.5" /></button> : null}
                          {entry.canDelete ? <button type="button" onClick={() => setDeleteTarget(entry)} className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 hover:bg-rose-950/40 hover:text-rose-300" aria-label="Eliminar"><Trash2 className="h-3.5 w-3.5" /></button> : null}
                        </div>
                      </div>
                      <p className={`mt-2 whitespace-pre-wrap text-sm leading-relaxed ${entry.deleted ? "italic text-slate-500 line-through" : "text-slate-200"}`}>{entry.deleted ? "Esta entrada fue eliminada." : entry.body}</p>
                      {entry.deleted && entry.deleteReason ? <p className="mt-1 text-xs font-semibold text-rose-300">Razón: {entry.deleteReason}</p> : null}
                      {evidence ? <a href={evidence} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-xs font-black text-emerald-300 hover:underline">Ver evidencia <ExternalLink className="h-3.5 w-3.5" /></a> : null}
                      {entry.followUpAt ? (
                        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-black bg-surface-inset px-2.5 py-2 text-xs font-bold text-slate-300">
                          <CalendarClock className="h-4 w-4 text-amber-300" />
                          <span>{new Date(entry.followUpAt).toLocaleString("es-US", { dateStyle: "medium", timeStyle: "short" })}</span>
                          {entry.assignedToName ? <span>· {entry.assignedToName}</span> : null}
                          {entry.canUpdateReminder && entry.reminderStatus === "pending" ? (
                            <span className="ml-auto flex gap-1">
                              <button type="button" onClick={() => void setReminder(entry, "completed")} className="inline-flex h-7 items-center gap-1 rounded-md bg-emerald-400 px-2 font-black text-slate-950"><Check className="h-3.5 w-3.5" /> Completar</button>
                              <button type="button" onClick={() => void setReminder(entry, "cancelled")} className="inline-flex h-7 items-center rounded-md border border-black px-2 font-black text-slate-300">Cancelar</button>
                            </span>
                          ) : null}
                        </div>
                      ) : null}
                      <footer className="mt-3 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                        <Clock3 className="h-3.5 w-3.5" />
                        {entry.actorName} · {new Date(entry.createdAt).toLocaleString("es-US", { dateStyle: "medium", timeStyle: "short" })}
                      </footer>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-48 flex-col items-center justify-center text-center text-slate-500">
                <Bell className="mb-2 h-7 w-7" />
                <p className="font-black text-slate-300">Sin actividad todavía</p>
                <p className="text-sm font-semibold">Agrega la primera nota o recordatorio.</p>
              </div>
            )}
          </section>
        </div>
      </div>

      {deleteTarget ? (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-950/80 p-4">
          <div className="w-full max-w-md rounded-xl border border-black bg-surface-card p-4 shadow-2xl">
            <h3 className="text-lg font-black text-white">Eliminar entrada</h3>
            <p className="mt-1 text-sm font-semibold text-slate-400">La entrada seguirá en la Bitácora como eliminada. Escribe la razón.</p>
            <textarea value={deleteReason} onChange={(event) => setDeleteReason(event.target.value)} rows={3} className="mt-3 w-full rounded-lg border border-black bg-surface-inset p-3 text-sm font-semibold text-white outline-none" autoFocus />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" className={secondaryButtonClass} onClick={() => { setDeleteTarget(null); setDeleteReason(""); }}>Cancelar</button>
              <button type="button" className="inline-flex h-10 items-center justify-center rounded-lg bg-rose-500 px-4 font-black text-white disabled:opacity-40" disabled={!deleteReason.trim() || saving} onClick={() => void remove()}>Eliminar</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>,
    document.body,
  );
}
