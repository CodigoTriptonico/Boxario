"use client";

import { SaleQuickCheckoutModal } from "@/components/sale/sale-quick-checkout-modal";
import { SALE_PAYMENT_UNSET } from "@/lib/sale-payment-choice";
import { EMPTY_BOX_DRIVER_MODE } from "@/lib/sale-logistics-modes";
import type { VentaController } from "@/components/sale/venta/use-venta-controller";

export function VentaQuickCheckoutStep({ controller }: { controller: VentaController; }) {
  const {
    cancelQuickSale,
    confirmQuickEmptyBoxCharge,
    creatingQuickInvoice,
    customerLogisticsChargeHistory,
    finishQuickCheckoutNewSale,
    logisticsFees,
    notify,
    organizationBranding,
    quickCheckoutCompleted,
    quickEmptyBoxAdditionalCharge,
    quickInvoiceBilling,
    quickInvoiceBillingForPayment,
    quickInvoiceNumber,
    quickEmptyBoxDeliveredAt,
    quickPayNowDraft,
    quickPayNowDraftTouched,
    quickPaymentMethod,
    quickPaymentNote,
    quickSaleDraft,
    quickSelectedPromotionId,
    quickTrackingToken,
    setQuickEmptyBoxAdditionalCharge,
    setQuickPayNowDraft,
    setQuickPayNowDraftTouched,
    setQuickPaymentMethod,
    setQuickPaymentNote,
    setQuickSelectedPromotionId,
    showQuickCheckout,
    stockMessage,
  } = controller;

  if (!showQuickCheckout || !quickSaleDraft) {
    return null;
  }

  return (
    <SaleQuickCheckoutModal
      embedded
      branding={organizationBranding}
      invoiceNumber={quickInvoiceNumber}
      trackingToken={quickTrackingToken}
      emptyBoxDeliveredAt={quickEmptyBoxDeliveredAt}
      draft={quickSaleDraft}
      billing={quickInvoiceBilling}
      billingForPayment={quickInvoiceBillingForPayment}
      selectedPromotionId={quickSelectedPromotionId}
      onPromotionChange={setQuickSelectedPromotionId}
      payNowDraft={quickPayNowDraft}
      payNowDraftTouched={quickPayNowDraftTouched}
      onPayNowDraftChange={(value) => {
        setQuickPayNowDraftTouched(true);
        const nextValue = value.replace(/[^\d]/g, "");
        setQuickPayNowDraft(nextValue);
        setQuickPaymentMethod(
          nextValue && Number(nextValue) > 0 ? SALE_PAYMENT_UNSET : "pending",
        );
        setQuickPaymentNote("");
      }}
      onInitialPaymentWaivedChange={(waived) => {
        setQuickPayNowDraft(waived ? "0" : "");
        setQuickPayNowDraftTouched(waived);
        setQuickPaymentMethod(waived ? "pending" : SALE_PAYMENT_UNSET);
        setQuickPaymentNote("");
      }}
      paymentMethod={quickPaymentMethod}
      paymentNote={quickPaymentNote}
      onPaymentMethodChange={setQuickPaymentMethod}
      onPaymentNoteChange={setQuickPaymentNote}
      completed={quickCheckoutCompleted}
      stockMessage={stockMessage}
      onClose={cancelQuickSale}
      onShare={() =>
        notify.info("Compartir por mensaje o WhatsApp estará disponible próximamente.")
      }
      onConfirmCharge={() => confirmQuickEmptyBoxCharge()}
      onStartNewSale={() => void finishQuickCheckoutNewSale()}
      confirming={creatingQuickInvoice}
      logisticsCharge={
        quickSaleDraft.emptyBoxMode === EMPTY_BOX_DRIVER_MODE
          ? quickEmptyBoxAdditionalCharge
          : null
      }
      logisticsChargeHistory={customerLogisticsChargeHistory.emptyBoxDelivery}
      onLogisticsChargeChange={setQuickEmptyBoxAdditionalCharge}
      paymentSettings={logisticsFees}
    />
  );
}
