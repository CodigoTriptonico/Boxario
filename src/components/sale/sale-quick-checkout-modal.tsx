"use client";

import Link from "next/link";
import type { QuickEmptyBoxDraft } from "@/components/sale/sale-quick-box-types";
import { PromotionSelector } from "@/components/sale/promotion-selector";
import { SaleBoxLabel, SaleInvoicePaper } from "@/components/sale/venta-parts";
import { SaleFinishDocToolbar, salePrintTargetId } from "@/components/sale/venta/shared";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui-blocks";
import { printableBoxInvoiceCodes } from "@/lib/invoice-child-codes";
import type { OrganizationBranding } from "@/lib/organizations/branding";
import { SaleAdditionalChargeEditor } from "@/components/sale/sale-additional-charge-editor";
import { saleFinishActionLabel, type InvoiceBillingSnapshot } from "@/lib/invoice-billing";
import type { LogisticsAdditionalCharge } from "@/lib/invoice-billing";
import type { CustomerLogisticsChargeLegHistory } from "@/lib/logistics-charge-history";
import { parseMoneyValue } from "@/lib/logistics-fees";
import {
  defaultSalePaymentSelection,
  type SalePaymentSelection,
} from "@/lib/sale-payment-choice";
import { SaleInvoiceConfirmDialog } from "@/components/sale/sale-invoice-confirm-dialog";
import { useState } from "react";
import type { PaymentMethodSettings } from "@/lib/payment-methods";

type SaleQuickCheckoutModalProps = {
  embedded?: boolean;
  branding?: OrganizationBranding | null;
  invoiceNumber: string;
  trackingToken?: string;
  emptyBoxDeliveredAt?: string | null;
  draft: QuickEmptyBoxDraft;
  billing: InvoiceBillingSnapshot | null;
  billingForPayment: InvoiceBillingSnapshot | null;
  selectedPromotionId: string;
  onPromotionChange: (promotionId: string) => void;
  payNowDraft: string;
  payNowDraftTouched?: boolean;
  onPayNowDraftChange: (value: string) => void;
  onInitialPaymentWaivedChange: (waived: boolean) => void;
  paymentMethod: SalePaymentSelection;
  paymentNote: string;
  onPaymentMethodChange: (method: SalePaymentSelection) => void;
  onPaymentNoteChange: (note: string) => void;
  completed?: boolean;
  stockMessage: string;
  onClose: () => void;
  onShare: () => void;
  onConfirmCharge: () => boolean | Promise<boolean>;
  onStartNewSale: () => void;
  confirming?: boolean;
  logisticsCharge: LogisticsAdditionalCharge | null;
  logisticsChargeHistory?: CustomerLogisticsChargeLegHistory;
  onLogisticsChargeChange: (charge: LogisticsAdditionalCharge) => void;
  paymentSettings?: Partial<PaymentMethodSettings>;
};

export function SaleQuickCheckoutModal({
  embedded = false,
  branding,
  invoiceNumber,
  trackingToken,
  emptyBoxDeliveredAt,
  draft,
  billing,
  billingForPayment,
  selectedPromotionId,
  onPromotionChange,
  payNowDraft,
  payNowDraftTouched = false,
  onPayNowDraftChange,
  onInitialPaymentWaivedChange,
  paymentMethod,
  paymentNote,
  onPaymentMethodChange,
  onPaymentNoteChange,
  completed = false,
  stockMessage,
  onClose,
  onShare,
  onConfirmCharge,
  onStartNewSale,
  confirming = false,
  logisticsCharge,
  logisticsChargeHistory,
  onLogisticsChargeChange,
  paymentSettings,
}: SaleQuickCheckoutModalProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [finishDocTab, setFinishDocTab] = useState<"invoice" | "labels">("invoice");
  const quickBoxes = draft.boxLines.flatMap((line) =>
    Array.from({ length: Math.max(1, Math.floor(line.quantity) || 1) }, () => line.box),
  );
  const quickBoxInvoiceNumbers = invoiceNumber
    ? printableBoxInvoiceCodes(invoiceNumber, quickBoxes.length)
    : [];

  async function handleConfirmCharge() {
    const created = await onConfirmCharge();
    if (created) {
      setConfirmOpen(false);
    }
  }

  return (
    <div
      className={embedded
        ? "flex min-h-0 w-full flex-1 flex-col"
        : "app-modal-overlay no-print fixed inset-0 z-[130] flex justify-center bg-[#163A2A] p-3 sm:p-4"}
    >
      <div
        className={embedded
          ? "flex min-h-0 w-full flex-1 flex-col bg-surface-panel p-2 sm:p-4"
          : "app-modal-content w-full max-w-7xl min-w-0 rounded-xl border border-black bg-surface-panel p-4 shadow-2xl sm:p-5"}
        {...(embedded
          ? {}
          : {
              role: "dialog",
              "aria-modal": true,
              "aria-label": "Checkout de factura",
            })}
      >
        <div id="quick-sale-print-documents" className="grid w-full gap-3">
          {!completed ? (
            <div className="no-print flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="h-9 rounded-lg border border-black bg-surface-inset px-3 text-xs font-black text-slate-200 hover:bg-surface-card"
              >
                Cancelar venta rápida
              </button>
            </div>
          ) : null}
          <SaleFinishDocToolbar
            value={finishDocTab}
            onChange={setFinishDocTab}
            labelCount={quickBoxInvoiceNumbers.length}
            printTargetId={
              finishDocTab === "invoice"
                ? salePrintTargetId(invoiceNumber)
                : quickBoxInvoiceNumbers.map((boxInvoiceNumber) => salePrintTargetId(boxInvoiceNumber))
            }
            printLabel={
              finishDocTab === "invoice"
                ? `factura ${invoiceNumber}`
                : quickBoxInvoiceNumbers.length > 1
                  ? "etiquetas de cajas"
                  : `etiqueta ${quickBoxInvoiceNumbers[0] || ""}`
            }
            printActionLabel="Imprimir"
            onShare={onShare}
          />
          <div
            id={salePrintTargetId(invoiceNumber)}
            data-sale-print-document={invoiceNumber}
            className={`sale-document-shell grid w-full gap-2 ${finishDocTab === "invoice" ? "" : "hidden"}`}
          >
            <SaleInvoicePaper
              branding={branding}
              invoiceNumber={invoiceNumber}
              trackingToken={trackingToken}
              emptyBoxDeliveredAt={emptyBoxDeliveredAt}
              sender={draft.sender}
              box={draft.box}
              serviceOperation="deliver_empty_box"
              serviceSituation="empty_box_handed_off"
              billing={billing}
              payNowDraft={completed ? undefined : payNowDraft}
              payNowDraftTouched={completed ? false : payNowDraftTouched}
              onPayNowDraftChange={completed ? undefined : onPayNowDraftChange}
              onInitialPaymentWaivedChange={
                completed ? undefined : onInitialPaymentWaivedChange
              }
            />
          </div>
          {quickBoxInvoiceNumbers.map((boxInvoiceNumber, index) => (
            <div
              key={boxInvoiceNumber}
              id={salePrintTargetId(boxInvoiceNumber)}
              data-sale-print-document={boxInvoiceNumber}
              data-sale-print-group="labels"
              className={`sale-document-shell grid w-full gap-2 ${finishDocTab === "labels" ? "" : "hidden"}`}
            >
              <SaleBoxLabel
                branding={branding}
                invoiceNumber={boxInvoiceNumber}
                parentInvoiceNumber={invoiceNumber}
                position={index + 1}
                boxCount={quickBoxInvoiceNumbers.length}
                sender={draft.sender}
                box={quickBoxes[index] || draft.box}
              />
            </div>
          ))}
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

        {!completed && logisticsCharge ? (
          <div className="no-print mt-4">
            <SaleAdditionalChargeEditor
              label="entrega"
              value={logisticsCharge}
              history={logisticsChargeHistory}
              onChange={onLogisticsChargeChange}
            />
          </div>
        ) : null}

        {stockMessage && !completed ? (
          <p className="no-print mt-4 rounded-lg border border-amber-700/70 bg-amber-950/25 px-3 py-2 text-center text-sm font-bold text-amber-100" role="alert">
            {stockMessage}
          </p>
        ) : null}

        <div className="no-print mt-5 grid gap-3 border-t border-black pt-4 sm:grid-cols-2">
          {completed ? (
            <>
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
              <button type="button" onClick={onClose} className="h-10 rounded-lg border border-black text-sm font-black">
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  onPaymentNoteChange("");
                  onPaymentMethodChange(
                    billing && parseMoneyValue(billing.payNow) > 0
                      ? defaultSalePaymentSelection(paymentSettings?.defaultPaymentMethod)
                      : "pending",
                  );
                  setConfirmOpen(true);
                }}
                disabled={!billing || billing.promotionSelectionRequired || confirming}
                className="h-10 rounded-lg bg-emerald-400 text-sm font-black text-slate-950 disabled:opacity-40"
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
              ? parseMoneyValue(billing.payNow) > 0
                ? [
                    { label: "Total", value: billing.quotedTotal },
                    { label: "Abono", value: `−${billing.payNow}` },
                    { label: "Saldo pendiente", value: billing.balanceDue },
                  ]
                : [{ label: "Debe", value: billing.balanceDue }]
              : []
          }
          paymentAmount={billing?.payNow || "$0"}
          confirmLabel={saleFinishActionLabel(billingForPayment)}
          confirming={confirming}
          paymentMethod={paymentMethod}
          paymentNote={paymentNote}
          onPaymentMethodChange={onPaymentMethodChange}
          onPaymentNoteChange={onPaymentNoteChange}
          paymentSettings={paymentSettings}
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
