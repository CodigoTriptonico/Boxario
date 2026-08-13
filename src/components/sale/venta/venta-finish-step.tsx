"use client";

import Link from "next/link";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui-blocks";
import { flowStepBodyClass, flowPersonListShellClass } from "@/components/flow-form-styles";
import { PromotionSelector } from "@/components/sale/promotion-selector";
import { saleFinishActionLabel } from "@/lib/invoice-billing";
import { parseMoneyValue } from "@/lib/logistics-fees";
import { defaultSalePaymentSelection, SALE_PAYMENT_UNSET } from "@/lib/sale-payment-choice";
import { SaleBoxLabel, SaleInvoicePaper } from "@/components/sale/venta-parts";
import { SaleFinishDocToolbar, salePrintTargetId } from "@/components/sale/venta/shared";
import type { VentaController } from "@/components/sale/venta/use-venta-controller";

export function VentaFinishStep({ controller }: { controller: VentaController; }) {
  const {
    activeStep,
    createdInvoice,
    creatingOpenInvoice,
    finishDocTab,
    finishPreviewBoxInvoices,
    finishRef,
    invoiceBilling,
    invoiceBillingForPayment,
    logisticsPlanReady,
    logisticsFees,
    nextInvoiceNumber,
    notify,
    organizationBranding,
    payNowDraft,
    payNowDraftTouched,
    retryRouteAssignment,
    routeAssignmentRetries,
    selectedBox,
    selectedPromotionId,
    selectedRecipient,
    selectedSender,
    setFinishDocTab,
    setInvoiceConfirmOpen,
    setInvoicePaymentMethod,
    setInvoicePaymentNote,
    setPayNowDraft,
    setPayNowDraftTouched,
    setSelectedPromotionId,
    setStockMessage,
    startNewSale,
    stepShellClass,
  } = controller;

  return (
    selectedSender && selectedRecipient && selectedBox && activeStep === "finish" ? (
      <div
        ref={finishRef}
        className={`${flowPersonListShellClass} ${createdInvoice || logisticsPlanReady ? stepShellClass("finish") : ""
          } !overflow-y-auto`}
      >
        <div className={flowStepBodyClass}>
          {createdInvoice ? (
            <div className="flex w-full flex-col items-center gap-3">
              <div className="no-print flex w-full max-w-[210mm] items-center justify-between gap-3 rounded-lg border border-emerald-500/25 bg-emerald-950/20 px-3 py-2">
                <p className="min-w-0 truncate text-xs font-black text-emerald-300">
                  Invoice {createdInvoice.invoiceNumber} creado
                </p>
                <span className="shrink-0 rounded-md bg-emerald-400/15 px-2 py-0.5 font-mono text-[10px] font-black text-emerald-200">
                  Listo
                </span>
              </div>
              {routeAssignmentRetries.length ? (
                <div
                  className="no-print w-full max-w-[210mm] rounded-lg border border-amber-700/70 bg-amber-950/25 px-4 py-3"
                  role="alert"
                >
                  <p className="text-sm font-black text-amber-100">
                    La venta y el invoice quedaron guardados. Falta completar el envío a Logística.
                  </p>
                  {routeAssignmentRetries.map((retry) =>
                    retry.error ? (
                      <p
                        key={`${retry.taskId}:${retry.routeTemplateId}:error`}
                        className="mt-1 text-xs font-bold text-amber-200"
                      >
                        {retry.label}: {retry.error}
                      </p>
                    ) : null,
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {routeAssignmentRetries.map((retry) => (
                      <button
                        key={`${retry.taskId}:${retry.routeTemplateId}`}
                        type="button"
                        onClick={() => void retryRouteAssignment(retry)}
                        className="h-9 rounded-md border border-black bg-amber-300 px-3 text-xs font-black text-slate-950 hover:bg-amber-200"
                      >
                        Reintentar {retry.label.toLowerCase()}
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}
              <div id="sale-print-documents" className="grid w-full gap-3">
                <SaleFinishDocToolbar
                  value={finishDocTab}
                  onChange={setFinishDocTab}
                  labelCount={createdInvoice.boxInvoices.length}
                  printTargetId={
                    finishDocTab === "invoice"
                      ? salePrintTargetId(createdInvoice.invoiceNumber)
                      : createdInvoice.boxInvoices.map((boxInvoice) =>
                        salePrintTargetId(boxInvoice.invoiceNumber),
                      )
                  }
                  printLabel={
                    finishDocTab === "invoice"
                      ? `factura ${createdInvoice.invoiceNumber}`
                      : createdInvoice.boxInvoices.length > 1
                        ? "etiquetas de cajas"
                        : `etiqueta ${createdInvoice.boxInvoices[0]?.invoiceNumber || ""}`
                  }
                  printActionLabel="Imprimir"
                  onShare={() =>
                    notify.info(
                      "Compartir por mensaje o WhatsApp estará disponible próximamente.",
                    )
                  }
                />
                <div
                  id={salePrintTargetId(createdInvoice.invoiceNumber)}
                  data-sale-print-document={createdInvoice.invoiceNumber}
                  className={`sale-document-shell grid w-full gap-2 ${finishDocTab === "invoice" ? "" : "hidden"
                    }`}
                >
                  <SaleInvoicePaper
                    branding={organizationBranding}
                    invoiceNumber={createdInvoice.invoiceNumber}
                    trackingToken={createdInvoice.trackingToken}
                    sender={createdInvoice.sender}
                    recipient={createdInvoice.recipient}
                    box={createdInvoice.box}
                    serviceOperation={createdInvoice.serviceOperation}
                    billing={createdInvoice.billing}
                  />
                </div>
                {createdInvoice.boxInvoices.map((boxInvoice) => {
                  const targetId = salePrintTargetId(boxInvoice.invoiceNumber);
                  return (
                    <div
                      key={boxInvoice.invoiceNumber}
                      id={targetId}
                      data-sale-print-document={boxInvoice.invoiceNumber}
                      data-sale-print-group="labels"
                      className={`sale-document-shell grid w-full gap-2 ${finishDocTab === "labels" ? "" : "hidden"
                        }`}
                    >
                      <SaleBoxLabel
                        branding={organizationBranding}
                        invoiceNumber={boxInvoice.invoiceNumber}
                        parentInvoiceNumber={createdInvoice.invoiceNumber}
                        position={boxInvoice.position}
                        boxCount={createdInvoice.boxInvoices.length}
                        sender={createdInvoice.sender}
                        recipient={createdInvoice.recipient}
                        box={boxInvoice.box}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="no-print grid w-full max-w-[210mm] gap-3 sm:grid-cols-2">
                <Link
                  href="/seguimiento"
                  className={`${secondaryButtonClass} flex h-11 items-center justify-center text-sm font-black`}
                >
                  Ver en Seguimiento
                </Link>
                <button
                  type="button"
                  onClick={startNewSale}
                  className={`${primaryButtonClass} h-11 text-sm font-black`}
                >
                  Nueva venta
                </button>
              </div>
            </div>
          ) : logisticsPlanReady ? (
            <div className="flex w-full flex-col items-center gap-3">
              <div id="sale-print-documents" className="grid w-full gap-3">
                <SaleFinishDocToolbar
                  value={finishDocTab}
                  onChange={setFinishDocTab}
                  labelCount={finishPreviewBoxInvoices.length}
                  printTargetId={
                    finishDocTab === "invoice"
                      ? salePrintTargetId(nextInvoiceNumber)
                      : finishPreviewBoxInvoices.map((boxInvoice) =>
                        salePrintTargetId(boxInvoice.invoiceNumber),
                      )
                  }
                  printLabel={
                    finishDocTab === "invoice"
                      ? `factura ${nextInvoiceNumber}`
                      : finishPreviewBoxInvoices.length > 1
                        ? "etiquetas de cajas"
                        : `etiqueta ${finishPreviewBoxInvoices[0]?.invoiceNumber || ""}`
                  }
                  printActionLabel="Imprimir"
                  onShare={() =>
                    notify.info(
                      "Compartir por mensaje o WhatsApp estará disponible próximamente.",
                    )
                  }
                />
                <div
                  id={salePrintTargetId(nextInvoiceNumber)}
                  data-sale-print-document={nextInvoiceNumber}
                  className={`sale-document-shell grid w-full gap-2 ${finishDocTab === "invoice" ? "" : "hidden"
                    }`}
                >
                  <SaleInvoicePaper
                    branding={organizationBranding}
                    invoiceNumber={nextInvoiceNumber}
                    sender={selectedSender}
                    recipient={selectedRecipient}
                    box={selectedBox}
                    serviceOperation="deliver_empty_box"
                    billing={invoiceBilling}
                    payNowDraft={payNowDraft}
                    payNowDraftTouched={payNowDraftTouched}
                    onPayNowDraftChange={(value) => {
                      setPayNowDraftTouched(true);
                      const nextValue = value.replace(/[^\d]/g, "");
                      setPayNowDraft(nextValue);
                      setInvoicePaymentMethod(nextValue && Number(nextValue) > 0
                        ? SALE_PAYMENT_UNSET
                        : "pending");
                      setInvoicePaymentNote("");
                    }}
                    onInitialPaymentWaivedChange={(waived) => {
                      setPayNowDraft(waived ? "0" : "");
                      setPayNowDraftTouched(waived);
                      setInvoicePaymentMethod(waived ? "pending" : SALE_PAYMENT_UNSET);
                      setInvoicePaymentNote("");
                    }}
                  />
                </div>
                {finishPreviewBoxInvoices.map((boxInvoice) => {
                  const targetId = salePrintTargetId(boxInvoice.invoiceNumber);
                  return (
                    <div
                      key={boxInvoice.invoiceNumber}
                      id={targetId}
                      data-sale-print-document={boxInvoice.invoiceNumber}
                      data-sale-print-group="labels"
                      className={`sale-document-shell grid w-full gap-2 ${finishDocTab === "labels" ? "" : "hidden"
                        }`}
                    >
                      <SaleBoxLabel
                        branding={organizationBranding}
                        invoiceNumber={boxInvoice.invoiceNumber}
                        parentInvoiceNumber={nextInvoiceNumber}
                        position={boxInvoice.position}
                        boxCount={invoiceBilling?.boxCount || 1}
                        sender={selectedSender}
                        recipient={selectedRecipient}
                        box={boxInvoice.box}
                      />
                    </div>
                  );
                })}
              </div>
              {invoiceBilling && invoiceBilling.promotionCandidates.length > 1 ? (
                <div className="no-print w-full max-w-[210mm]">
                  <PromotionSelector
                    candidates={invoiceBilling.promotionCandidates}
                    selectedPromotionId={selectedPromotionId}
                    onChange={setSelectedPromotionId}
                  />
                </div>
              ) : null}
              <div className="no-print w-full max-w-[210mm]">
                <button
                  type="button"
                  onClick={() => {
                    setInvoicePaymentMethod(
                      invoiceBilling && parseMoneyValue(invoiceBilling.payNow) > 0
                        ? defaultSalePaymentSelection(logisticsFees.defaultPaymentMethod)
                        : "pending",
                    );
                    setInvoicePaymentNote("");
                    setStockMessage("");
                    setInvoiceConfirmOpen(true);
                  }}
                  disabled={
                    creatingOpenInvoice || !invoiceBilling || invoiceBilling.promotionSelectionRequired
                  }
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-emerald-400 text-sm font-black text-slate-950 disabled:opacity-40"
                >
                  {creatingOpenInvoice
                    ? saleFinishActionLabel(invoiceBillingForPayment, { creating: true })
                    : invoiceBilling?.promotionSelectionRequired
                      ? "Elige promocion"
                      : invoiceBilling && parseMoneyValue(invoiceBilling.payNow) === 0
                        ? "Crear invoice"
                        : saleFinishActionLabel(invoiceBillingForPayment, { phase: "setup" })}
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-black bg-surface-card p-5 text-center">
              <div>
                <p className="text-xs font-black uppercase text-slate-400">
                  Pendiente
                </p>
                <p className="mt-2 text-xl font-black">
                  Completa opciones del envio
                </p>
                <p className="mt-2 text-sm font-bold text-slate-300">
                  La factura aparece aqui cuando termines este paso.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    ) : null
  );
}
