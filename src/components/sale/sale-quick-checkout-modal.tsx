"use client";

import Link from "next/link";
import { Printer, X } from "lucide-react";
import { InvoiceQrCode } from "@/components/sale/invoice-qr-code";
import type { QuickEmptyBoxDraft } from "@/components/sale/sale-quick-empty-box-modal";
import { PromotionSelector } from "@/components/sale/promotion-selector";
import {
  personFullName,
  SaleInvoicePaper,
  senderPhonesLabel,
} from "@/components/sale/venta-parts";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui-blocks";
import type { OrganizationBranding } from "@/lib/organizations/branding";
import { saleFinishActionLabel, type InvoiceBillingSnapshot } from "@/lib/invoice-billing";
import {
  logisticsAdditionalChargeRequiresReason,
  type LogisticsAdditionalCharge,
} from "@/lib/invoice-billing";
import { moneyInputDisplayValue, normalizeMoneyInput } from "@/lib/logistics-fees";
import type { SalePaymentSelection } from "@/lib/sale-payment-choice";
import { SaleInvoiceConfirmDialog } from "@/components/sale/sale-invoice-confirm-dialog";
import { useState } from "react";

type SaleQuickCheckoutModalProps = {
  branding?: OrganizationBranding | null;
  invoiceNumber: string;
  trackingToken?: string;
  draft: QuickEmptyBoxDraft;
  billing: InvoiceBillingSnapshot | null;
  billingForPayment: InvoiceBillingSnapshot | null;
  selectedPromotionId: string;
  onPromotionChange: (promotionId: string) => void;
  payNowDraft: string;
  payNowDraftTouched?: boolean;
  onPayNowDraftChange: (value: string) => void;
  paymentMethod: SalePaymentSelection;
  paymentNote: string;
  onPaymentMethodChange: (method: SalePaymentSelection) => void;
  onPaymentNoteChange: (note: string) => void;
  completed?: boolean;
  stockMessage: string;
  onClose: () => void;
  onPrint: () => void;
  onConfirmCharge: () => boolean | Promise<boolean>;
  onStartNewSale: () => void;
  confirming?: boolean;
  logisticsCharge: LogisticsAdditionalCharge | null;
  logisticsChargeSuggestion: string;
  onLogisticsChargeChange: (charge: LogisticsAdditionalCharge) => void;
};

export function SaleQuickCheckoutModal({
  branding,
  invoiceNumber,
  trackingToken,
  draft,
  billing,
  billingForPayment,
  selectedPromotionId,
  onPromotionChange,
  payNowDraft,
  payNowDraftTouched = false,
  onPayNowDraftChange,
  paymentMethod,
  paymentNote,
  onPaymentMethodChange,
  onPaymentNoteChange,
  completed = false,
  stockMessage,
  onClose,
  onPrint,
  onConfirmCharge,
  onStartNewSale,
  confirming = false,
  logisticsCharge,
  logisticsChargeSuggestion,
  onLogisticsChargeChange,
}: SaleQuickCheckoutModalProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function handleConfirmCharge() {
    const created = await onConfirmCharge();
    if (created) {
      setConfirmOpen(false);
    }
  }

  return (
    <div className="app-modal-overlay no-print fixed inset-0 z-[130] flex justify-center bg-[#163A2A] p-3 sm:p-4">
      <div className="app-modal-content w-full max-w-4xl rounded-xl border border-black bg-surface-panel p-4 shadow-2xl sm:p-5">
        <div className="mb-5 flex items-start justify-between gap-4 border-b border-black pb-4">
          <div className="min-w-0">
            <p className="text-sm font-black uppercase text-slate-400">
              {completed ? "Invoice creado" : saleFinishActionLabel(billingForPayment)}
            </p>
            <h3 className="text-3xl font-black">Invoice {invoiceNumber}</h3>
            <p className="font-bold text-slate-400">Venta rápida de caja vacía</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-black"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_auto]">
          <div className="grid gap-4">
            <div className="no-print rounded-xl border border-black bg-surface-card p-4">
              <p className="text-xs font-black uppercase text-slate-500">Remitente</p>
              <p className="break-words text-xl font-black">{personFullName(draft.sender)}</p>
              <p className="break-words font-bold text-slate-400">{senderPhonesLabel(draft.sender)}</p>
            </div>

            <div className="flex flex-col items-center gap-4">
              <SaleInvoicePaper
                branding={branding}
                invoiceNumber={invoiceNumber}
                trackingToken={trackingToken}
                sender={draft.sender}
                box={draft.box}
                serviceOperation="deliver_empty_box"
                billing={billing}
                payNowDraft={completed ? undefined : payNowDraft}
                payNowDraftTouched={completed ? false : payNowDraftTouched}
                onPayNowDraftChange={completed ? undefined : onPayNowDraftChange}
              />
              {!completed && billing && billing.promotionCandidates.length > 1 ? (
                <div className="no-print w-full max-w-[210mm]">
                  <PromotionSelector
                    candidates={billing.promotionCandidates}
                    selectedPromotionId={selectedPromotionId}
                    onChange={onPromotionChange}
                  />
                </div>
              ) : null}
            </div>
          </div>

          <div className="no-print rounded-xl border border-black bg-surface-card p-4 text-center text-[#f8fafc]">
            <div className="rounded-lg bg-[#f8fafc] p-3">
              <InvoiceQrCode
                invoiceNumber={invoiceNumber}
                trackingToken={trackingToken}
                size={144}
              />
            </div>
            <p className="mt-3 text-lg font-black">{invoiceNumber}</p>
            <p className="text-sm font-bold text-slate-300">QR del invoice</p>
          </div>
        </div>

        {!completed && logisticsCharge ? (
          <section className="no-print mt-4 rounded-xl border border-black bg-surface-card p-4">
            <label className="flex items-center justify-between gap-3">
              <span>
                <span className="block text-sm font-black text-white">Cargo logístico adicional</span>
                <span className="block text-xs font-semibold text-slate-400">
                  Sugerido {logisticsChargeSuggestion}; la entrega normal está incluida.
                </span>
              </span>
              <input
                type="checkbox"
                checked={logisticsCharge.enabled}
                onChange={(event) =>
                  onLogisticsChargeChange({
                    ...logisticsCharge,
                    enabled: event.target.checked,
                    amount: event.target.checked ? logisticsChargeSuggestion : "$0",
                    reason: "",
                  })
                }
                className="h-5 w-5 accent-emerald-400"
              />
            </label>
            {logisticsCharge.enabled ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className="flex h-10 items-center rounded-lg border border-black bg-surface-inset px-3">
                  <span className="mr-1 text-slate-400">$</span>
                  <input
                    inputMode="decimal"
                    value={moneyInputDisplayValue(logisticsCharge.amount)}
                    onChange={(event) =>
                      onLogisticsChargeChange({
                        ...logisticsCharge,
                        amount: normalizeMoneyInput(event.target.value),
                      })
                    }
                    className="min-w-0 flex-1 bg-transparent font-black text-white outline-none"
                  />
                </label>
                {logisticsAdditionalChargeRequiresReason(
                  logisticsCharge,
                  logisticsChargeSuggestion,
                ) ? (
                  <input
                    value={logisticsCharge.reason}
                    onChange={(event) =>
                      onLogisticsChargeChange({ ...logisticsCharge, reason: event.target.value })
                    }
                    placeholder="Razón del ajuste (obligatoria)"
                    className="h-10 rounded-lg border border-amber-700/70 bg-surface-inset px-3 text-sm font-bold text-white outline-none"
                  />
                ) : (
                  <p className="self-center text-xs font-semibold text-emerald-300">
                    Se usará la sugerencia de Logística.
                  </p>
                )}
              </div>
            ) : null}
          </section>
        ) : null}

        {stockMessage ? (
          <p className="no-print mt-4 rounded-lg border border-amber-700/70 bg-amber-950/25 px-3 py-2 text-center text-sm font-bold text-amber-100" role="alert">
            {stockMessage}
          </p>
        ) : null}

        <div
          className={`no-print mt-5 grid gap-3 border-t border-black pt-4 ${completed ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}
        >
          {completed ? (
            <>
              <button
                type="button"
                onClick={onPrint}
                className={`${secondaryButtonClass} flex h-14 items-center justify-center gap-2 text-lg font-black`}
              >
                <Printer className="h-6 w-6" />
                Imprimir
              </button>
              <Link
                href="/seguimiento"
                className={`${secondaryButtonClass} flex h-14 items-center justify-center text-lg font-black`}
              >
                Ver en Seguimiento
              </Link>
              <button
                type="button"
                onClick={onStartNewSale}
                className={`${primaryButtonClass} h-14 text-lg font-black`}
              >
                Nueva venta
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={onClose} className="h-14 rounded-lg border border-black text-lg font-black">
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onPaymentNoteChange("");
                  setConfirmOpen(true);
                }}
                disabled={!billing || billing.promotionSelectionRequired || confirming}
                className="h-14 rounded-lg bg-emerald-400 text-lg font-black text-slate-950 disabled:opacity-40"
              >
                {billing?.promotionSelectionRequired
                  ? "Elige promocion"
                  : saleFinishActionLabel(billingForPayment)}
              </button>
            </>
          )}
        </div>

        <SaleInvoiceConfirmDialog
          open={confirmOpen}
          title="¿Crear este invoice?"
          invoiceLabel={`Factura ${invoiceNumber}`}
          lines={
            billing
              ? [
                  { label: "Total", value: billing.quotedTotal },
                  { label: "Depósito", value: billing.payNow },
                  { label: "Pendiente", value: billing.balanceDue },
                ]
              : []
          }
          confirmLabel={saleFinishActionLabel(billingForPayment)}
          confirming={confirming}
          paymentMethod={paymentMethod}
          paymentNote={paymentNote}
          onPaymentMethodChange={onPaymentMethodChange}
          onPaymentNoteChange={onPaymentNoteChange}
          onCancel={() => {
            if (!confirming) {
              setConfirmOpen(false);
            }
          }}
          onConfirm={() => void handleConfirmCharge()}
        />
      </div>
    </div>
  );
}
