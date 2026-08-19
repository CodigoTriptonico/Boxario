"use client";

import { ArrowLeft, BookOpen, ChevronRight, ExternalLink, MessageSquareText, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  listCustomerSaleHistoryAction,
  type CustomerSaleHistoryRow,
} from "@/app/actions/sale-customer-history";
import { loadShipmentExpedienteAction } from "@/app/actions/shipment-expediente";
import { finalizeShipmentInvoiceAction } from "@/app/actions/shipments";
import { CustomerJournalDialog, CustomerJournalPanel } from "@/components/customer-journal-dialog";
import { ShipmentCollectDialog } from "@/components/shipment-collect-dialog";
import { historyDateLabel, personFullName, type Sender } from "@/components/sale/venta-parts";
import { senderPhonesLabel } from "@/components/sale/venta/parts-person";
import type { ShipmentStatus } from "@/lib/shipment-types";
import { shipmentStatusDisplayLabel } from "@/lib/shipment-display";
import { buildExpedienteShipmentDeepLink } from "@/lib/expediente-deep-link";
import { buildSeguimientoShipmentDeepLink } from "@/lib/seguimiento-deep-link";
import type { ShipmentExpedientePayload } from "@/lib/shipment-expediente";
import { isPaymentMethod } from "@/lib/payment-methods";
import type { SalePaymentSelection } from "@/lib/sale-payment-choice";
import type { ShipmentCollectMode } from "@/lib/shipment-collect";
import {
  isDefinitiveOfficePaymentClientError,
  isPaymentIdempotencyConflict,
  paymentIdempotencyConflictUserMessage,
} from "@/lib/office-payment-idempotency";
import {
  beginOfficePaymentIntention,
  clearPendingOfficePaymentIntention,
  resolveOfficePaymentIntentionOnOpen,
} from "@/lib/office-payment-pending";
import { resolveShipmentCollectAmount } from "@/lib/shipment-collect";

type SaleCustomerHistoryDrawerProps = {
  open: boolean;
  sender: Sender | null;
  recipientId?: string;
  recipientName?: string;
  initialTab?: "journal" | "shipments";
  onClose: () => void;
};

export function SaleCustomerHistoryDrawer({
  open,
  sender,
  recipientId,
  recipientName,
  initialTab = "journal",
  onClose,
}: SaleCustomerHistoryDrawerProps) {
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState<CustomerSaleHistoryRow[]>([]);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"journal" | "shipments">(initialTab);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (open) {
      setActiveTab(initialTab || "journal");
    }
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) {
      return;
    }

    queueMicrotask(() => {
      setSelectedRowId(null);
    });

    const customerId = sender?.id;
    if (!customerId && !recipientId) {
      queueMicrotask(() => setRows([]));
      return;
    }

    if (customerId?.startsWith("local-")) {
      queueMicrotask(() => {
        setRows([]);
        setError("");
      });
      return;
    }

    let cancelled = false;

    queueMicrotask(() => {
      void (async () => {
        setLoading(true);
        setError("");

        const result = await listCustomerSaleHistoryAction({
          customerId: customerId?.startsWith("local-") ? undefined : customerId,
          recipientId,
        });

        if (cancelled) {
          return;
        }

        setLoading(false);

        if (!result.ok) {
          setError(result.error);
          setRows([]);
          return;
        }

        setRows(result.data);
      })();
    });

    return () => {
      cancelled = true;
    };
  }, [open, recipientId, sender?.id]);

  const selectedRow = useMemo(
    () => rows.find((row) => row.id === selectedRowId) || null,
    [rows, selectedRowId],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (selectedRowId) {
          setSelectedRowId(null);
          return;
        }

        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, open, selectedRowId]);

  if (!mounted || !open) {
    return null;
  }

  const title = recipientId
    ? recipientName || "Destinatario"
    : sender
      ? personFullName(sender)
      : "Cliente";

  const scopeLabel = recipientId
    ? sender
      ? `Envíos de ${personFullName(sender)} a ${recipientName || "este destinatario"}`
      : `Envíos a ${recipientName || "este destinatario"}`
    : sender
      ? `Envíos de ${personFullName(sender)}`
      : "Últimos envíos";

  const customerAddress = sender
    ? [
        [sender.street, sender.houseNumber].filter(Boolean).join(" "),
        sender.neighborhood,
        [sender.city, sender.state, sender.postalCode].filter(Boolean).join(", "),
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

  const modal = (
    <div
      className="app-modal-overlay fixed inset-0 z-[140] flex items-center justify-center bg-black/75 p-2 sm:p-4 backdrop-blur-xs animate-in fade-in duration-150"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="app-modal-content relative flex h-[min(92vh,850px)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-black bg-surface-panel shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
        role="dialog"
        aria-modal="true"
        aria-label={selectedRow ? selectedRow.code : title}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-black px-4 py-3.5 sm:px-6 sm:py-4 bg-surface-panel shrink-0">
          <div className="min-w-0 flex-1">
            {selectedRow ? (
              <button
                type="button"
                onClick={() => setSelectedRowId(null)}
                className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-black uppercase text-emerald-300 transition hover:text-emerald-200"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Volver al listado
              </button>
            ) : (
              <p className="inline-flex items-center gap-1.5 text-xs font-black uppercase text-slate-500">
                <BookOpen className="h-3.5 w-3.5" />
                Libreta de envíos & Bitácora
              </p>
            )}
            <h2 className="truncate text-xl font-black text-[#f8fafc]">
              {selectedRow ? selectedRow.code : title}
            </h2>
            <p className="mt-0.5 text-sm font-bold text-slate-400">
              {selectedRow ? historyDateLabel(selectedRow.createdAt) : scopeLabel}
            </p>
            {!selectedRow && sender ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-bold text-slate-400">
                {senderPhonesLabel(sender) ? (
                  <p className="truncate">☎ {senderPhonesLabel(sender)}</p>
                ) : null}
                {customerAddress ? (
                  <p className="flex items-start gap-1.5 truncate max-w-lg" title={customerAddress}>
                    <span className="shrink-0 text-emerald-300">📍</span>
                    <span className="truncate">{customerAddress}</span>
                  </p>
                ) : null}
                {sender.addressReference ? (
                  <p className="text-slate-500">Ref: {sender.addressReference}</p>
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black bg-surface-card text-slate-300 hover:text-white transition-colors"
              title="Cerrar ventana"
              aria-label="Cerrar ventana"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Barra de Pestañas (Pestañitas) */}
        {!selectedRow && (
          <div className="flex items-center gap-1 border-b border-black bg-[#151c19] px-4 sm:px-6 pt-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab("journal")}
              className={`relative inline-flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-black transition-all ${
                activeTab === "journal"
                  ? "border-emerald-400 text-emerald-300 bg-emerald-950/40 rounded-t-lg"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 rounded-t-lg"
              }`}
            >
              <MessageSquareText className="h-4 w-4 text-emerald-400" />
              <span>Bitácora</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("shipments")}
              className={`relative inline-flex items-center gap-2 border-b-2 px-3 py-2 text-xs font-black transition-all ${
                activeTab === "shipments"
                  ? "border-emerald-400 text-emerald-300 bg-emerald-950/40 rounded-t-lg"
                  : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 rounded-t-lg"
              }`}
            >
              <BookOpen className="h-4 w-4 text-emerald-400" />
              <span>Libreta de envíos</span>
              {!loading && rows.length > 0 ? (
                <span
                  className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                    activeTab === "shipments"
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-slate-800 text-slate-400"
                  }`}
                >
                  {rows.length}
                </span>
              ) : null}
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto bg-[#0d1411]">
          {selectedRow ? (
            <div className="p-4 sm:p-6">
              <SaleHistoryDetailPanel key={selectedRow.id} row={selectedRow} onClose={onClose} />
            </div>
          ) : activeTab === "journal" ? (
            <CustomerJournalPanel
              customerId={sender?.id?.startsWith("local-") ? undefined : sender?.id}
              recipientId={recipientId}
              customerName={title}
              showHeader={false}
              onError={(err) => setError(err)}
            />
          ) : (
            <div className="p-4 sm:p-6">
              {loading ? (
                <p className="text-sm font-bold text-slate-400">Cargando historial...</p>
              ) : null}
              {error ? (
                <p className="rounded-lg border border-rose-700 bg-rose-950/40 px-3 py-2 text-sm font-bold text-rose-200">
                  {error}
                </p>
              ) : null}
              {!loading && !error && !rows.length ? (
                <p className="rounded-xl border border-black bg-surface-inset px-4 py-8 text-center text-sm font-black text-slate-400">
                  Sin envíos registrados
                </p>
              ) : null}
              <div className="grid gap-2.5 sm:grid-cols-2">
                {rows.map((row, index) => (
                  <div
                    key={row.id}
                    className="group rounded-xl border border-black bg-[#242e29] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] transition hover:border-emerald-800/50 hover:bg-[#2a352f]"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedRowId(row.id)}
                      className="w-full p-3.5 text-left"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-black text-[#f8fafc]">{row.code}</p>
                            {index === 0 ? (
                              <span className="rounded-md border border-amber-600/40 bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-black uppercase text-amber-200">
                                Último
                              </span>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-xs font-bold text-slate-400">
                            {historyDateLabel(row.createdAt)}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span
                            className={`rounded-md border px-2 py-0.5 text-[10px] font-black uppercase ${
                              row.saleKind === "empty_box_deposit"
                                ? "border-emerald-600/40 bg-emerald-400/10 text-emerald-200"
                                : "border-black bg-surface-inset text-slate-300"
                            }`}
                          >
                            {row.saleKind === "empty_box_deposit" ? "Caja vacía" : "Envío"}
                          </span>
                          <ChevronRight className="h-4 w-4 text-slate-500 transition group-hover:text-emerald-300" />
                        </div>
                      </div>
                      <div className="mt-2 grid gap-1 text-xs font-bold text-slate-300">
                        <p>
                          {shipmentStatusDisplayLabel(row.status as ShipmentStatus)} · ${row.paid.toFixed(2)}
                        </p>
                        {row.country ? <p className="text-slate-400">País: {row.country}</p> : null}
                      </div>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}

function SaleHistoryDetailPanel({
  row,
  onClose,
}: {
  row: CustomerSaleHistoryRow;
  onClose: () => void;
}) {
  const [details, setDetails] = useState<ShipmentExpedientePayload | null>(null);
  const [financialExpanded, setFinancialExpanded] = useState(false);
  const [collectOpen, setCollectOpen] = useState(false);
  const [collectMode, setCollectMode] = useState<ShipmentCollectMode>("choose");
  const [partialAmount, setPartialAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentSelection>("cash");
  const [paymentNote, setPaymentNote] = useState("");
  const [collecting, setCollecting] = useState(false);
  const collectingRef = useRef(false);
  const clientPaymentIdRef = useRef<string | null>(null);
  const [paymentError, setPaymentError] = useState("");
  const [pendingReconcileHint, setPendingReconcileHint] = useState(false);
  const seguimientoHref = buildSeguimientoShipmentDeepLink({
    code: row.code,
    shipmentId: row.id,
    status: row.status,
  });
  const expedienteHref = buildExpedienteShipmentDeepLink(row.id);
  const logisticsSteps = shipmentLogisticsTimeline(row.deliveryNotes);

  useEffect(() => {
    let cancelled = false;

    void loadShipmentExpedienteAction(row.id).then((result) => {
      if (cancelled) return;
      if (result.ok) {
        setDetails(result.data);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [row.id]);

  const financial = details?.financial || null;
  const collectionTotal = moneyValue(financial?.quotedTotal);
  const collectionBalance = moneyValue(financial?.balanceDue);

  function openCollect() {
    const resolved = resolveOfficePaymentIntentionOnOpen({
      shipmentId: row.id,
      mintId: () =>
        globalThis.crypto?.randomUUID?.() || `pay-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    });
    clientPaymentIdRef.current = resolved.clientPaymentId;
    setPendingReconcileHint(resolved.restored);
    setPaymentError("");
    if (resolved.restored && resolved.pending) {
      setPaymentMethod(resolved.pending.method);
      if (resolved.pending.amount !== null) {
        setCollectMode("partial");
        setPartialAmount(String(resolved.pending.amount));
      } else {
        setCollectMode("choose");
        setPartialAmount("");
      }
    } else {
      setCollectMode("choose");
      setPartialAmount("");
      setPaymentNote("");
    }
    setCollectOpen(true);
  }

  async function confirmCollection() {
    if (collectingRef.current) {
      return;
    }
    if (!isPaymentMethod(paymentMethod)) {
      setPaymentError("Elige un método de pago para registrar el abono.");
      return;
    }
    const amountInput = collectMode === "partial" ? partialAmount : undefined;
    const resolvedAmount = resolveShipmentCollectAmount(amountInput, collectionBalance);
    if (!resolvedAmount.ok) {
      setPaymentError(resolvedAmount.error);
      return;
    }
    if (!clientPaymentIdRef.current) {
      clientPaymentIdRef.current =
        globalThis.crypto?.randomUUID?.() || `pay-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    beginOfficePaymentIntention({
      shipmentId: row.id,
      clientPaymentId: clientPaymentIdRef.current,
      amount: collectMode === "partial" ? resolvedAmount.amount : null,
      method: paymentMethod,
    });

    collectingRef.current = true;
    setCollecting(true);
    setPaymentError("");
    try {
      const result = await finalizeShipmentInvoiceAction({
        shipmentId: row.id,
        amount: collectMode === "partial" ? partialAmount : undefined,
        paymentMethod,
        paymentNote,
        clientPaymentId: clientPaymentIdRef.current,
      });
      if (!result.ok) {
        if (isPaymentIdempotencyConflict(result.error)) {
          clearPendingOfficePaymentIntention(row.id);
          clientPaymentIdRef.current = null;
          setPendingReconcileHint(false);
          setPaymentError(paymentIdempotencyConflictUserMessage());
          return;
        }
        if (isDefinitiveOfficePaymentClientError(result.error)) {
          clearPendingOfficePaymentIntention(row.id);
          clientPaymentIdRef.current = null;
          setPendingReconcileHint(false);
          setPaymentError(result.error);
          return;
        }
        setPendingReconcileHint(true);
        setPaymentError(result.error);
        return;
      }
      clearPendingOfficePaymentIntention(row.id);
      clientPaymentIdRef.current = null;
      setPendingReconcileHint(false);
      const refreshed = await loadShipmentExpedienteAction(row.id);
      if (refreshed.ok) setDetails(refreshed.data);
      setCollectOpen(false);
      setCollectMode("choose");
      setPartialAmount("");
      setPaymentNote("");
    } catch (error) {
      setPendingReconcileHint(true);
      setPaymentError(error instanceof Error ? error.message : "No se pudo completar la operacion");
    } finally {
      collectingRef.current = false;
      setCollecting(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-black bg-[#242e29] p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-[10px] font-black uppercase text-slate-500">Resumen</p>
          <div className="flex flex-wrap gap-2">
            <Link
              href={seguimientoHref}
              onClick={onClose}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-emerald-700/50 bg-emerald-950/35 px-3 text-xs font-black text-emerald-100 transition hover:bg-emerald-900/40"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir en Seguimiento
            </Link>
            <Link
              href={expedienteHref}
              onClick={onClose}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-black bg-surface-inset px-3 text-xs font-black text-slate-200 transition hover:bg-surface-card"
            >
              <ExternalLink className="h-4 w-4" />
              Ver expediente
            </Link>
          </div>
        </div>
        <div className="mt-3 border-t border-black pt-3">
          <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Ruta logística</p>
          <ol className="mt-3">
            {logisticsSteps.map((step, index) => {
              const stateLabel = step.blocked ? "Bloqueado" : step.complete ? "Completado" : "Pendiente";
              const task = step.blocked ? undefined : details?.logistics?.tasks.find((entry) =>
                index === 0 ? entry.taskType === "deliver_empty_box" : entry.taskType === "pickup_full_box",
              );
              const detail = timelineDetail(step.detail);
              const routeLabel = task?.routeLabel || detail.routeLabel;
              const routePending = /pendiente|asignar|sin ruta/i.test(routeLabel || "");
              return <li key={step.title} className={`relative flex gap-3 pb-5 last:pb-0 ${step.blocked ? "border-l-2 border-app-border-divider pl-2" : ""}`}>
                {index < logisticsSteps.length - 1 ? <span className="absolute left-[15px] top-8 h-[calc(100%-20px)] w-px bg-black" aria-hidden="true" /> : null}
                <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-black ${step.complete ? "border-emerald-600/60 bg-emerald-400/15 text-emerald-200" : step.blocked ? "border-slate-700 bg-slate-900/30 text-slate-400" : "border-amber-600/60 bg-amber-400/10 text-amber-200"}`}>{index + 1}</span>
                <div className="min-w-0 pt-0.5"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="font-black text-slate-100">{step.title}</p><span className={`rounded-full px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wide ${step.complete ? "bg-emerald-400/15 text-emerald-300" : step.blocked ? "bg-slate-700/40 text-slate-400" : "bg-amber-400/10 text-amber-200"}`}>{stateLabel}</span></div>{routeLabel || task?.scheduleLabel || detail.scheduleLabel ? <div className="mt-1.5 flex flex-wrap items-center gap-2">{routeLabel ? <span className={`rounded-md border px-2 py-0.5 text-[10px] font-black ${routePending ? "border-amber-700/50 bg-amber-950/30 text-amber-200" : "border-emerald-700/50 bg-emerald-950/30 text-emerald-200"}`}>{routeLabel}</span> : null}{task?.scheduleLabel || detail.scheduleLabel ? <p className="text-xs font-bold leading-relaxed text-slate-400">{task?.scheduleLabel || detail.scheduleLabel}</p> : null}</div> : null}</div>
              </li>;
            })}
          </ol>
        </div>
        {financial ? (
          <div className="mt-3 border-t border-black pt-3">
            <button
              type="button"
              aria-expanded={financialExpanded}
              aria-controls="shipment-financial-details"
              onClick={() => setFinancialExpanded((expanded) => !expanded)}
              className="group flex w-full items-center justify-between gap-3 rounded-lg border border-black bg-[#1c2622] px-3 py-2.5 text-left shadow-inner transition hover:border-emerald-800/60 hover:bg-[#202c27] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70"
            >
              <span className="min-w-0">
                <span className="block text-[10px] font-black uppercase tracking-wider text-slate-500">Finanzas</span>
                <span className="mt-0.5 block text-sm font-black text-emerald-200">
                  {financialExpanded ? "Total, saldo y abono" : `Total del envío · ${financial.quotedTotal}`}
                </span>
              </span>
              <span className="flex shrink-0 items-center gap-1.5 text-[10px] font-black uppercase text-slate-400 group-hover:text-emerald-200">
                {financialExpanded ? "Ocultar" : "Ver detalle"}
                <ChevronRight className={`h-4 w-4 transition-transform ${financialExpanded ? "rotate-90" : ""}`} aria-hidden="true" />
              </span>
            </button>
            {financialExpanded ? (
              <div id="shipment-financial-details" className="mx-auto w-full max-w-sm px-3 pt-3">
                <div className="space-y-1 text-sm">
                  <FinancialSummaryRow label="Total del envío" value={financial.quotedTotal} />
                  {financial.depositRequired ? <FinancialSummaryRow label="Abono" value={financial.depositRequired} emphasis={financial.depositStatus !== "paid"} /> : null}
                  <FinancialSummaryRow label="Saldo pendiente" value={financial.balanceDue} emphasis={collectionBalance > 0} total />
                </div>
                {collectionBalance > 0 ? <button type="button" onClick={() => { openCollect(); setCollectMode("partial"); setPartialAmount(String(collectionBalance)); }} className="mt-3 inline-flex h-10 items-center rounded-lg border border-emerald-700/50 bg-emerald-950/35 px-3 text-xs font-black text-emerald-100">Registrar abono</button> : null}
                <div className="mt-3 border-t border-black/70 pt-3">
                  <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Historial de abonos</p>
                  {financial.payments.length ? <ul className="mt-2 divide-y divide-black/70">{financial.payments.map((payment) => <li key={payment.id} className="flex items-start justify-between gap-3 py-2 text-xs"><span className="min-w-0 font-bold text-slate-300">{payment.method}{payment.note ? <span className="mt-0.5 block text-slate-500">{payment.note}</span> : null}</span><span className="shrink-0 text-right font-black text-emerald-200">${payment.amount.toFixed(2)}<span className="mt-0.5 block text-[10px] text-slate-500">{historyDateLabel(payment.createdAt)}</span></span></li>)}</ul> : <p className="mt-2 text-xs font-bold text-slate-500">Sin abonos registrados.</p>}
                </div>
                {paymentError ? <p className="mt-2 text-xs font-bold text-rose-300">{paymentError}</p> : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
      {financial ? (
        <ShipmentCollectDialog
          open={collectOpen}
          invoiceCode={row.code}
          customerName={row.recipientName || "Cliente"}
          total={collectionTotal}
          deposit={financial.paid}
          depositRequired={moneyValue(financial.depositRequired)}
          balanceDue={collectionBalance}
          mode={collectMode}
          partialAmount={partialAmount}
          paymentMethod={paymentMethod}
          paymentNote={paymentNote}
          confirming={collecting}
          reconcileNotice={
            pendingReconcileHint
              ? "Hay un cobro anterior sin confirmar. Se reutilizará la misma operación al continuar."
              : paymentError || undefined
          }
          onModeChange={setCollectMode}
          onPartialAmountChange={setPartialAmount}
          onPaymentMethodChange={setPaymentMethod}
          onPaymentNoteChange={setPaymentNote}
          onCancel={() => {
            if (!collecting) {
              setCollectOpen(false);
              setPendingReconcileHint(false);
              clientPaymentIdRef.current = null;
            }
          }}
          onConfirm={confirmCollection}
        />
      ) : null}
    </div>
  );
}

function FinancialSummaryRow({ label, value, emphasis = false, total = false }: { label: string; value: string; emphasis?: boolean; total?: boolean }) {
  return <div className={`flex items-baseline justify-between gap-4 py-1 ${total ? "mt-1 border-t border-black/70 pt-2" : ""}`}><p className={`${total ? "font-black text-slate-200" : "font-bold text-slate-400"}`}>{label}</p><p className={`shrink-0 font-black tabular-nums ${emphasis ? "text-amber-200" : "text-emerald-200"}`}>{value}</p></div>;
}

function moneyValue(value?: string | null) {
  return Number(value?.replace(/[^\d.-]/g, "")) || 0;
}

function shipmentLogisticsTimeline(deliveryNotes?: string | null) {
  const lines = deliveryNotes?.split(/\s*\|\s*|\n+/).map((line) => line.trim()).filter(Boolean) || [];
  const emptyBox = lines.find((line) => /^caja vac[ií]a:/i.test(line));
  const fullBox = lines.find((line) => /^caja llena:/i.test(line));

  const emptyComplete = Boolean(emptyBox && !/pendiente|programar|sin fecha/i.test(emptyBox));

  return [
    {
      title: "Entrega de caja vacía",
      detail: timelineScheduleLabel(emptyBox?.replace(/^caja vac[ií]a:\s*/i, "")) || "Sin programación registrada.",
      complete: emptyComplete,
      blocked: false,
    },
    {
      title: "Recolección de caja llena",
      detail: emptyComplete
        ? timelineScheduleLabel(fullBox?.replace(/^caja llena:\s*/i, "")) || "Sin programación registrada."
        : "",
      complete: Boolean(fullBox && !/pendiente|programar|sin fecha/i.test(fullBox)),
      blocked: !emptyComplete,
    },
  ];
}

function timelineScheduleLabel(detail?: string) {
  if (!detail) {
    return "";
  }

  if (/^programar entrega de caja vac[ií]a\s*-\s*/i.test(detail)) {
    return detail.replace(
      /^programar entrega de caja vac[ií]a\s*-\s*/i,
      "Pendiente por entregar · Ruta por asignar · Programada para ",
    );
  }

  return detail.replace(/^programar recolecci[oó]n de caja llena\s*-\s*/i, "Programada para ");
}

function timelineDetail(detail: string) {
  const pending = detail.match(/^Pendiente por entregar\s*·\s*Ruta por asignar\s*·\s*(.+)$/i);
  if (pending) return { routeLabel: "Ruta por asignar", scheduleLabel: pending[1] };
  return { routeLabel: "", scheduleLabel: detail };
}
