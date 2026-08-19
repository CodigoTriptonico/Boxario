"use client";

import {
  Activity,
  Bell,
  Calendar,
  Clock,
  Clock3,
  DollarSign,
  ExternalLink,
  FileText,
  Loader2,
  MapPin,
  MessageSquare,
  MessageSquareText,
  Navigation,
  Package,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  Truck,
  User,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import {
  createCustomerJournalEntryAction,
  deleteCustomerJournalEntryAction,
  listCustomerJournalTimelineAction,
  updateCustomerJournalEntryAction,
} from "@/app/actions/customer-journal";
import { DateTimeInput } from "@/components/date-time-input";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  CUSTOMER_JOURNAL_CHANNELS,
  CUSTOMER_JOURNAL_OUTCOMES,
  channelLabel,
  formatAddressSnapshot,
  formatTimelineDate,
  outcomeLabel,
  shipmentJournalCategoryLabel,
  type CustomerJournalChannel,
  type CustomerJournalOutcome,
  type CustomerJournalTimelinePayload,
  type CustomerTimelineActivityItem,
  type CustomerTimelineItem,
  type CustomerTimelineJournalItem,
  type CustomerTimelineShipmentItem,
  type ShipmentJournalAssignee,
  type ShipmentJournalCategory,
} from "@/lib/customer-journal";
import { buildExpedienteShipmentDeepLink } from "@/lib/expediente-deep-link";
import { buildSeguimientoShipmentDeepLink } from "@/lib/seguimiento-deep-link";

export type CustomerJournalPanelProps = {
  customerId?: string | null;
  recipientId?: string | null;
  customerName?: string;
  initialShipmentId?: string | null;
  showHeader?: boolean;
  onClose?: () => void;
  onError?: (message: string) => void;
};

type FilterTab = "all" | "shipments" | "notes" | "reminders" | "activity";

export function CustomerJournalPanel({
  customerId,
  recipientId,
  customerName,
  initialShipmentId,
  showHeader = true,
  onClose,
  onError,
}: CustomerJournalPanelProps) {
  const [data, setData] = useState<CustomerJournalTimelinePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filterTab, setFilterTab] = useState<FilterTab>("all");
  const [selectedShipmentFilter, setSelectedShipmentFilter] = useState<string>(
    initialShipmentId || "all"
  );

  // Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [body, setBody] = useState("");
  const [category, setCategory] = useState<ShipmentJournalCategory>("customer");
  const [channel, setChannel] = useState<CustomerJournalChannel>("call");
  const [outcome, setOutcome] = useState<CustomerJournalOutcome>("answered");
  const [formShipmentId, setFormShipmentId] = useState<string>(initialShipmentId || "");
  const [followUpAt, setFollowUpAt] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [hasReminder, setHasReminder] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState<CustomerTimelineJournalItem | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  async function loadTimeline() {
    if (!customerId && !recipientId) return;
    setLoading(true);
    const result = await listCustomerJournalTimelineAction({
      customerId: customerId || undefined,
      recipientId: recipientId || undefined,
    });
    setLoading(false);

    if (!result.ok) {
      if (onError) onError(result.error);
      return;
    }

    setData(result.data);
  }

  useEffect(() => {
    void loadTimeline();
    if (initialShipmentId) {
      setSelectedShipmentFilter(initialShipmentId);
      setFormShipmentId(initialShipmentId);
    }
  }, [customerId, recipientId, initialShipmentId]);

  // Filtered timeline items
  const filteredTimeline = useMemo(() => {
    if (!data) return [];
    return data.timeline.filter((item) => {
      // 1. Shipment filter
      if (selectedShipmentFilter !== "all") {
        if (item.kind === "shipment" && item.id !== selectedShipmentFilter) return false;
        if (item.kind === "journal_entry" && item.shipmentId !== selectedShipmentFilter) return false;
        if (item.kind === "activity") {
          const meta = item.metadata as { shipmentId?: string } | null;
          if (meta?.shipmentId && meta.shipmentId !== selectedShipmentFilter) return false;
        }
      }

      // 2. Tab filter
      if (filterTab === "shipments") return item.kind === "shipment";
      if (filterTab === "notes") return item.kind === "journal_entry";
      if (filterTab === "reminders") {
        return item.kind === "journal_entry" && Boolean(item.followUpAt);
      }
      if (filterTab === "activity") return item.kind === "activity";

      return true;
    });
  }, [data, filterTab, selectedShipmentFilter]);

  async function handleCreateEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!customerId && !recipientId) return;
    if (!body.trim() && !followUpAt) return;

    setSaving(true);
    const result = await createCustomerJournalEntryAction({
      customerId: customerId || recipientId || "",
      shipmentId: formShipmentId || null,
      category,
      channel,
      outcome,
      body: body.trim(),
      followUpAt: hasReminder && followUpAt ? followUpAt : null,
      assignedTo: hasReminder && assignedTo ? assignedTo : null,
    });
    setSaving(false);

    if (!result.ok) {
      if (onError) onError(result.error);
      return;
    }

    // Reset form
    setBody("");
    setFollowUpAt("");
    setAssignedTo("");
    setHasReminder(false);
    setShowAddForm(false);
    void loadTimeline();
  }

  async function handleDeleteEntry() {
    if (!deleteTarget || !deleteReason.trim()) return;
    setSaving(true);
    const result = await deleteCustomerJournalEntryAction({
      entryId: deleteTarget.id,
      reason: deleteReason.trim(),
    });
    setSaving(false);

    if (!result.ok) {
      if (onError) onError(result.error);
      return;
    }

    setDeleteTarget(null);
    setDeleteReason("");
    void loadTimeline();
  }

  const customer = data?.customer;

  return (
    <div className="flex flex-col h-full w-full min-h-0 bg-[#0d1411] text-slate-100 relative">
      {showHeader && (
        <header className="shrink-0 border-b border-slate-800/80 bg-[#080e0b] px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-black text-base shadow-inner">
                <User className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="truncate text-base sm:text-lg font-black text-slate-100">
                    {customer?.fullName || customerName || "Cliente"}
                  </h2>
                  <span className="rounded-full border border-emerald-500/30 bg-emerald-950/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                    Bitácora del Cliente
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap mt-0.5">
                  {customer?.phones && customer.phones.length > 0 ? (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3 text-emerald-400" />
                      <span>{customer.phones.join(", ")}</span>
                    </span>
                  ) : null}
                  {customer?.street ? (
                    <span className="flex items-center gap-1 truncate max-w-sm" title={`${customer.street} ${customer.houseNumber || ""}`}>
                      <MapPin className="h-3 w-3 text-emerald-400 shrink-0" />
                      <span className="truncate">
                        {customer.street} {customer.houseNumber || ""} · {customer.city}, {customer.state}
                      </span>
                    </span>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => void loadTimeline()}
                disabled={loading}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800 hover:text-slate-200 transition-colors disabled:opacity-50"
                title="Recargar bitácora"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800 hover:text-slate-100 transition-colors"
                title="Cerrar bitácora"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notas permanentes o referencias del cliente si existen */}
          {(customer?.addressReference || customer?.exactEntranceNote) ? (
            <div className="mt-2.5 flex items-center gap-2 rounded-lg border border-slate-800/80 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-300">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 shrink-0">Ref:</span>
              <span className="truncate text-slate-300">
                {customer.addressReference || customer.exactEntranceNote}
              </span>
            </div>
          ) : null}
        </header>
      )}

      {/* Barra de Filtros y Acción Nueva Entrada */}
      <section className="shrink-0 flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 bg-[#0a100d] px-4 py-2 sm:px-6" aria-label="Filtros de bitácora">
        {/* Tabs de Filtro */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0">
          {([
            ["all", "Todo"],
            ["shipments", "Envíos & Direcciones"],
            ["notes", "Seguimiento & Llamadas"],
            ["reminders", "Recordatorios"],
            ["activity", "Cambios & Auditoría"],
          ] as const).map(([tabKey, label]) => {
            const active = filterTab === tabKey;
            return (
              <button
                key={tabKey}
                type="button"
                onClick={() => setFilterTab(tabKey)}
                className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all whitespace-nowrap active:scale-95 ${
                  active
                    ? "bg-emerald-500 text-slate-950 shadow-sm"
                    : "text-slate-400 hover:bg-slate-800/80 hover:text-slate-200"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Filtro por Envío Específico + Botón Nueva Nota */}
        <div className="flex items-center gap-2">
          {data?.shipments && data.shipments.length > 0 ? (
            <div className="relative flex items-center">
              <select
                value={selectedShipmentFilter}
                onChange={(e) => setSelectedShipmentFilter(e.target.value)}
                className="h-8 rounded-lg border border-slate-800 bg-slate-900 px-2.5 text-xs font-semibold text-slate-200 outline-none hover:border-slate-700 transition-colors"
                title="Filtrar por envío específico"
              >
                <option value="all">Todos los envíos ({data.shipments.length})</option>
                {data.shipments.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} · {s.statusLabel} {s.recipientName ? `(a ${s.recipientName})` : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {!showHeader && (
            <button
              type="button"
              onClick={() => void loadTimeline()}
              disabled={loading}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 text-slate-400 hover:border-slate-700 hover:bg-slate-800 hover:text-slate-200 transition-colors disabled:opacity-50"
              title="Recargar bitácora"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowAddForm((v) => !v)}
            className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-all active:scale-95 ${
              showAddForm
                ? "border border-slate-700 bg-slate-800 text-slate-200"
                : "bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-sm"
            }`}
          >
            {showAddForm ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            <span>{showAddForm ? "Cerrar formulario" : "Nueva nota / llamada"}</span>
          </button>
        </div>
      </section>

        {/* Formulario Desplegable para Agregar Entrada */}
        {showAddForm && (
          <section className="shrink-0 border-b border-slate-800 bg-[#0b120f] p-4 sm:p-5 animate-in fade-in slide-in-from-top-2 duration-150">
            <form onSubmit={handleCreateEntry} className="mx-auto max-w-3xl space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <MessageSquareText className="h-4 w-4" />
                  <span>Registrar seguimiento o llamada para este cliente</span>
                </span>

                {/* Selector de Envío Opcional */}
                {data?.shipments && data.shipments.length > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-medium text-slate-400">Vincular a:</span>
                    <select
                      value={formShipmentId}
                      onChange={(e) => setFormShipmentId(e.target.value)}
                      className="h-7 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs font-semibold text-slate-200 outline-none"
                    >
                      <option value="">General del cliente (sin envío específico)</option>
                      {data.shipments.map((s) => (
                        <option key={s.id} value={s.id}>
                          Envío {s.code} · {s.statusLabel}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>

              {/* Canales y Resultados */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Canal:
                  </label>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as CustomerJournalChannel)}
                    className="w-full h-8 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs font-semibold text-slate-200 outline-none"
                  >
                    {CUSTOMER_JOURNAL_CHANNELS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Resultado:
                  </label>
                  <select
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value as CustomerJournalOutcome)}
                    className="w-full h-8 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs font-semibold text-slate-200 outline-none"
                  >
                    {CUSTOMER_JOURNAL_OUTCOMES.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Categoría:
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ShipmentJournalCategory)}
                    className="w-full h-8 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs font-semibold text-slate-200 outline-none"
                  >
                    <option value="customer">Atención al cliente</option>
                    <option value="sales">Venta comercial</option>
                    <option value="logistics">Operaciones / Recolección</option>
                    <option value="billing">Cobranza / Pago</option>
                    <option value="general">Nota general</option>
                  </select>
                </div>
              </div>

              {/* Mensaje / Nota */}
              <div>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={2}
                  maxLength={2000}
                  placeholder="Escribe el detalle de la conversación, acuerdo, notas de dirección o indicaciones..."
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-xs font-medium text-slate-100 placeholder:text-slate-500 outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400/30 transition-all resize-none shadow-inner"
                />
              </div>

              {/* Recordatorio / Tarea pendiente */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-slate-800/60">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasReminder}
                    onChange={(e) => setHasReminder(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-400"
                  />
                  <span>Programar fecha de próximo contacto / seguimiento</span>
                </label>

                {hasReminder && (
                  <div className="flex flex-wrap items-center gap-2">
                    <DateTimeInput
                      value={followUpAt}
                      onChange={setFollowUpAt}
                      ariaLabel="Fecha y hora de seguimiento"
                      className="h-8 rounded-lg border border-slate-700 bg-slate-900 text-xs"
                    />

                    {data?.assignees && data.assignees.length > 0 ? (
                      <select
                        value={assignedTo}
                        onChange={(e) => setAssignedTo(e.target.value)}
                        className="h-8 rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs text-slate-200 outline-none"
                      >
                        <option value="">Asignar a mí</option>
                        {data.assignees.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.label}
                          </option>
                        ))}
                      </select>
                    ) : null}
                  </div>
                )}

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="h-8 rounded-lg border border-slate-700 px-3 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving || (!body.trim() && !followUpAt)}
                    className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 px-4 text-xs font-bold text-slate-950 shadow-md shadow-emerald-950/40 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95"
                  >
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    <span>{saving ? "Guardando..." : "Guardar en bitácora"}</span>
                  </button>
                </div>
              </div>
            </form>
          </section>
        )}

        {/* Línea de Tiempo Central */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-[#0a100d]">
          {loading && !data ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2 text-slate-400">
              <Loader2 className="h-6 w-6 animate-spin text-emerald-400" />
              <span className="text-xs font-medium">Cargando bitácora integral del cliente...</span>
            </div>
          ) : filteredTimeline.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 gap-2 text-slate-500 border border-dashed border-slate-800 rounded-xl p-8">
              <MessageSquare className="h-8 w-8 text-slate-600 stroke-[1.5]" />
              <p className="text-xs font-semibold text-slate-400 text-center">
                {selectedShipmentFilter !== "all"
                  ? "No hay entradas registradas para el envío seleccionado."
                  : "Aún no hay notas ni envíos registrados en la bitácora de este cliente."}
              </p>
              <button
                type="button"
                onClick={() => setShowAddForm(true)}
                className="mt-1 inline-flex items-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-950/30 px-3 py-1 text-xs font-bold text-emerald-300 hover:bg-emerald-900/40 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Agregar primera nota</span>
              </button>
            </div>
          ) : (
            filteredTimeline.map((item) => {
              if (item.kind === "shipment") {
                return <CustomerTimelineShipmentCard key={`shipment-${item.id}`} item={item} />;
              }
              if (item.kind === "journal_entry") {
                return (
                  <CustomerTimelineJournalCard
                    key={`entry-${item.id}`}
                    item={item}
                    onDelete={() => setDeleteTarget(item)}
                  />
                );
              }
              if (item.kind === "activity") {
                return <CustomerTimelineActivityCard key={`activity-${item.id}`} item={item} />;
              }
              return null;
            })
          )}
        </div>

        {/* Modal de confirmación para eliminar */}
        {deleteTarget && (
          <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-xl border border-rose-800/60 bg-[#0e1613] p-5 space-y-3 shadow-2xl">
              <h3 className="text-sm font-bold text-rose-300">Eliminar nota de bitácora</h3>
              <p className="text-xs text-slate-300">
                Indica el motivo de la eliminación para conservar la auditoría:
              </p>
              <textarea
                value={deleteReason}
                onChange={(e) => setDeleteReason(e.target.value)}
                rows={2}
                maxLength={300}
                placeholder="Ej. Nota duplicada, error de captura..."
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-2.5 text-xs text-slate-100 outline-none focus:border-rose-500 resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDeleteTarget(null);
                    setDeleteReason("");
                  }}
                  className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={saving || !deleteReason.trim()}
                  onClick={handleDeleteEntry}
                  className="rounded-lg bg-rose-600 hover:bg-rose-500 px-4 py-1.5 text-xs font-bold text-white shadow disabled:opacity-40"
                >
                  {saving ? "Eliminando..." : "Confirmar eliminación"}
                </button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}

export function CustomerJournalDialog({
  open,
  customerId,
  recipientId,
  customerName,
  initialShipmentId,
  onClose,
  onError,
}: {
  open: boolean;
  customerId?: string | null;
  recipientId?: string | null;
  customerName?: string;
  initialShipmentId?: string | null;
  onClose: () => void;
  onError?: (message: string) => void;
}) {
  const mounted = useHydrated();
  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="relative flex flex-col h-[92vh] w-full max-w-4xl rounded-2xl border border-slate-800 bg-[#0d1411] text-slate-100 shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-label={`Bitácora de ${customerName || "Cliente"}`}
      >
        <CustomerJournalPanel
          customerId={customerId}
          recipientId={recipientId}
          customerName={customerName}
          initialShipmentId={initialShipmentId}
          showHeader={true}
          onClose={onClose}
          onError={onError}
        />
      </div>
    </div>,
    document.body
  );
}

function getActivityActionKind(action: string, title: string) {
  const lower = `${action} ${title}`.toLowerCase();

  if (lower.includes("creado") || lower.includes("created")) {
    return {
      label: "Registro de Cliente",
      icon: <UserPlus className="h-4 w-4 text-emerald-300" />,
      iconBg: "border-emerald-500/40 bg-emerald-950/60",
      badgeBg: "border-emerald-500/30 bg-emerald-950/40 text-emerald-300",
    };
  }

  if (lower.includes("actualiz") || lower.includes("updated") || lower.includes("edit")) {
    return {
      label: "Modificación de Datos",
      icon: <UserCheck className="h-4 w-4 text-teal-300" />,
      iconBg: "border-teal-500/40 bg-teal-950/60",
      badgeBg: "border-teal-500/30 bg-teal-950/40 text-teal-300",
    };
  }

  if (lower.includes("direcc") || lower.includes("pin") || lower.includes("entrance") || lower.includes("acceso") || lower.includes("mapa")) {
    return {
      label: "Ubicación Exacta",
      icon: <MapPin className="h-4 w-4 text-amber-300" />,
      iconBg: "border-amber-500/40 bg-amber-950/60",
      badgeBg: "border-amber-500/30 bg-amber-950/40 text-amber-300",
    };
  }

  if (lower.includes("envio") || lower.includes("shipment") || lower.includes("caja")) {
    return {
      label: "Envío & Logística",
      icon: <Package className="h-4 w-4 text-sky-300" />,
      iconBg: "border-sky-500/40 bg-sky-950/60",
      badgeBg: "border-sky-500/30 bg-sky-950/40 text-sky-300",
    };
  }

  if (lower.includes("pago") || lower.includes("payment") || lower.includes("cobro") || lower.includes("invoice")) {
    return {
      label: "Cobro & Factura",
      icon: <DollarSign className="h-4 w-4 text-emerald-300" />,
      iconBg: "border-emerald-500/40 bg-emerald-950/60",
      badgeBg: "border-emerald-500/30 bg-emerald-950/40 text-emerald-300",
    };
  }

  if (lower.includes("ruta") || lower.includes("driver") || lower.includes("conductor")) {
    return {
      label: "Ruta & Conductor",
      icon: <Truck className="h-4 w-4 text-sky-300" />,
      iconBg: "border-sky-500/40 bg-sky-950/60",
      badgeBg: "border-sky-500/30 bg-sky-950/40 text-sky-300",
    };
  }

  return {
    label: "Auditoría de Sistema",
    icon: <Activity className="h-4 w-4 text-slate-300" />,
    iconBg: "border-slate-700 bg-slate-800",
    badgeBg: "border-slate-700 bg-slate-800 text-slate-300",
  };
}

function isPhoneLike(str: string) {
  return /^[+\d\s().-]{7,}$/.test(str.trim());
}

function CustomerTimelineShipmentCard({ item }: { item: CustomerTimelineShipmentItem }) {
  const formatted = formatTimelineDate(item.createdAt);

  return (
    <article className="rounded-xl border border-emerald-500/30 bg-[#0c1410] p-4 shadow-md transition-all hover:border-emerald-500/50 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2.5 flex-wrap">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20 text-emerald-300 font-bold shadow-inner">
            <Package className="h-4 w-4" />
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-black text-sm text-slate-100">Envío {item.code}</span>
              <span className="rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
                {item.statusLabel}
              </span>
              <span className="rounded-md border border-emerald-600/40 bg-emerald-950/40 px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-300">
                {item.saleKind === "empty_box_deposit" ? "Caja vacía" : "Envío"}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Destino: <strong className="text-slate-200">{item.country}</strong> {item.carrier ? `· Transportista: ${item.carrier}` : ""}
            </p>
          </div>
        </div>

        {/* Date, Day, Hour Badge */}
        <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-800/80 bg-slate-900/80 px-3 py-1.5 text-right shadow-inner">
          <Calendar className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <div className="text-[11px] leading-tight">
            <div className="font-bold text-slate-200">
              <span className="text-emerald-400 font-black">{formatted.dayOfWeek}</span>, {formatted.date}
            </div>
            <div className="text-[10px] font-medium text-slate-400 flex items-center justify-end gap-1 mt-0.5">
              <Clock3 className="h-2.5 w-2.5 text-slate-500" />
              <span>{formatted.time}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            <MapPin className="h-3 w-3" />
            <span>Dirección de Recolección (Origen)</span>
          </div>
          <p className="font-medium text-slate-200 leading-snug">{formatAddressSnapshot(item.originAddress)}</p>
          {item.originAddress?.addressReference ? (
            <p className="text-[11px] text-slate-400 italic">Ref: {item.originAddress.addressReference}</p>
          ) : null}
          {item.originAddress?.exactEntranceNote ? (
            <p className="text-[11px] text-amber-300/90 font-medium">📍 Pin exacto: {item.originAddress.exactEntranceNote}</p>
          ) : null}
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 space-y-1.5">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-teal-400">
            <Navigation className="h-3 w-3" />
            <span>Dirección de Entrega (Destino: {item.country})</span>
          </div>
          <p className="font-medium text-slate-200 leading-snug">{formatAddressSnapshot(item.destinationAddress)}</p>
          {item.recipientName ? (
            <p className="text-[11px] text-slate-300 font-semibold">Destinatario: {item.recipientName}</p>
          ) : null}
          {item.destinationAddress?.addressReference ? (
            <p className="text-[11px] text-slate-400 italic">Ref: {item.destinationAddress.addressReference}</p>
          ) : null}
        </div>
      </div>

      {item.deliveryNotes ? (
        <p className="text-[11px] text-slate-400 border-t border-slate-800/50 pt-2">
          <strong className="text-slate-300">Instrucciones de entrega:</strong> {item.deliveryNotes}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/70 pt-2 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-400">
            Total pagado: <strong className="text-emerald-300 font-black">${item.paid.toFixed(2)}</strong>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={buildExpedienteShipmentDeepLink(item.id)}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 hover:text-emerald-300 hover:underline"
          >
            <span>Ver expediente</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
          <Link
            href={buildSeguimientoShipmentDeepLink({ code: item.code, shipmentId: item.id, status: item.status })}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-300 hover:text-white hover:underline"
          >
            <span>Seguimiento</span>
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </article>
  );
}

function CustomerTimelineJournalCard({
  item,
  onDelete,
}: {
  item: CustomerTimelineJournalItem;
  onDelete: () => void;
}) {
  const formatted = formatTimelineDate(item.createdAt);
  const followUpFormatted = item.followUpAt ? formatTimelineDate(item.followUpAt) : null;

  return (
    <article className="rounded-xl border border-slate-800 bg-[#0d1411] p-3.5 sm:p-4 shadow-sm hover:border-slate-700/80 transition-all space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {item.channel ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-950/50 px-2.5 py-1 text-[11px] font-bold text-emerald-300 shadow-xs">
              {item.channel === "call" ? <Phone className="h-3 w-3" /> : item.channel === "whatsapp" ? <MessageSquare className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
              <span>{channelLabel(item.channel)}</span>
            </span>
          ) : null}
          {item.outcome ? (
            <span className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300">
              {outcomeLabel(item.outcome)}
            </span>
          ) : null}
          <span className="rounded-md border border-slate-800 bg-slate-900/60 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
            {shipmentJournalCategoryLabel(item.category)}
          </span>
          {item.shipmentCode ? (
            <span className="rounded-md border border-teal-500/30 bg-teal-950/40 px-2 py-0.5 text-[10px] font-bold text-teal-300 flex items-center gap-1">
              <Package className="h-3 w-3 text-teal-400" />
              <span>Envío {item.shipmentCode}</span>
            </span>
          ) : null}
        </div>

        {/* Date, Day, Hour Badge */}
        <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-800/80 bg-slate-900/80 px-3 py-1.5 text-right shadow-inner">
          <Calendar className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <div className="text-[11px] leading-tight">
            <div className="font-bold text-slate-200">
              <span className="text-emerald-400 font-black">{formatted.dayOfWeek}</span>, {formatted.date}
            </div>
            <div className="text-[10px] font-medium text-slate-400 flex items-center justify-end gap-1 mt-0.5">
              <Clock3 className="h-2.5 w-2.5 text-slate-500" />
              <span>{formatted.time}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-slate-800/80 bg-[#070c09] p-3 text-xs text-slate-100 whitespace-pre-wrap leading-relaxed">
        {item.body}
      </div>

      {item.followUpAt && followUpFormatted ? (
        <div className="flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-950/25 px-3 py-2 text-xs text-amber-300">
          <Clock3 className="h-4 w-4 shrink-0 text-amber-400 animate-pulse" />
          <div className="flex-1 min-w-0">
            <span className="font-bold">Próximo seguimiento: </span>
            <span>{followUpFormatted.dayOfWeek}, {followUpFormatted.date} · {followUpFormatted.time}</span>
            {item.assignedToName ? (
              <span className="ml-2 font-medium text-amber-200/90">
                · Asignado a: <strong className="text-amber-100">{item.assignedToName}</strong>
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2 border-t border-slate-800/70 pt-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-500 font-medium">Creado por:</span>
          <span className="inline-flex items-center gap-1 font-bold text-slate-200 bg-slate-900/60 border border-slate-800 px-2 py-0.5 rounded-md">
            <User className="h-3 w-3 text-emerald-400" />
            <span>{item.actorName || "Operador"}</span>
          </span>
          {item.edited ? <span className="text-[10px] text-slate-500 italic">(editado)</span> : null}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 hidden sm:inline" title={formatted.full}>
            {formatted.full}
          </span>
          {item.canDelete ? (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex items-center gap-1 rounded-md border border-slate-800 px-2 py-0.5 text-[11px] text-slate-400 hover:border-rose-900/50 hover:bg-rose-950/40 hover:text-rose-300 transition-colors"
              title="Eliminar entrada"
            >
              <Trash2 className="h-3 w-3" />
              <span>Eliminar</span>
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

function CustomerTimelineActivityCard({ item }: { item: CustomerTimelineActivityItem }) {
  const formatted = formatTimelineDate(item.createdAt);
  const actionKind = getActivityActionKind(item.action, item.title);

  return (
    <article className="rounded-xl border border-slate-800 bg-[#0d1411] p-3.5 sm:p-4 shadow-sm hover:border-slate-700/80 transition-all space-y-2.5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border shadow-sm ${actionKind.iconBg}`}>
            {actionKind.icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs sm:text-sm font-black text-slate-100 leading-snug">
                {item.title}
              </h4>
              <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${actionKind.badgeBg}`}>
                {actionKind.label}
              </span>
            </div>
            {item.description ? (
              <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                {isPhoneLike(item.description) ? (
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900/80 px-2 py-0.5 font-bold text-emerald-300">
                    <Phone className="h-3 w-3 text-emerald-400" />
                    <span>{item.description}</span>
                  </span>
                ) : (
                  <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">{item.description}</p>
                )}
              </div>
            ) : null}
          </div>
        </div>

        {/* Date, Day, Hour Badge */}
        <div className="flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-800/80 bg-slate-900/80 px-3 py-1.5 text-right shadow-inner">
          <Calendar className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <div className="text-[11px] leading-tight">
            <div className="font-bold text-slate-200">
              <span className="text-emerald-400 font-black">{formatted.dayOfWeek}</span>, {formatted.date}
            </div>
            <div className="text-[10px] font-medium text-slate-400 flex items-center justify-end gap-1 mt-0.5">
              <Clock3 className="h-2.5 w-2.5 text-slate-500" />
              <span>{formatted.time}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-800/70 pt-2 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-500 font-medium">Creado por:</span>
          <span className="inline-flex items-center gap-1 font-bold text-slate-200 bg-slate-900/60 border border-slate-800 px-2 py-0.5 rounded-md">
            <User className="h-3 w-3 text-emerald-400" />
            <span>{item.actorName || "Sistema automático"}</span>
          </span>
        </div>
        <span className="text-[10px] text-slate-500 hidden sm:inline" title={formatted.full}>
          {formatted.full}
        </span>
      </div>
    </article>
  );
}


