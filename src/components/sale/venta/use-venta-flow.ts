"use client";

import { useCallback } from "react";
import {
  listCustomersWithRecipientsAction,
  listRecipientsForCustomerAction,
  updateCustomerCardStyleAction,
  updateRecipientCardStyleAction,
} from "@/app/actions/customers";
import { allocateInvoiceNumberAction } from "@/app/actions/pricing";
import { listSaleShortcutsAction } from "@/app/actions/sale-shortcuts";
import { syncShipmentPartyAction } from "@/app/actions/shipments";
import type { SalePersonCardVariantId } from "@/components/sale/sale-person-card-variants";
import {
  personFullName,
  recipientShipmentSnapshot,
  senderPhoneKey,
  type Recipient,
  type Sender,
} from "@/components/sale/venta-parts";
import { customerRowToSender, recipientRowToSaleRecipient } from "@/lib/customers/mappers";
import { disabledLogisticsAdditionalCharge } from "@/lib/invoice-billing";
import {
  mergeSaleShortcuts,
  readRecentSaleShortcuts,
} from "@/lib/sale-recent-storage";
import { SALE_PAYMENT_UNSET } from "@/lib/sale-payment-choice";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { VentaCore } from "@/components/sale/venta/use-venta-core";
import type { VentaData } from "@/components/sale/venta/use-venta-data";
import type { VentaFoundation } from "@/components/sale/venta/use-venta-foundation";

type VentaFlowContext = VentaCore & VentaData & VentaFoundation;

export function useVentaFlow(context: VentaFlowContext) {
  const {
    setEmptyBoxMode,
    setEmptyBoxScheduleMode,
    setEmptyBoxScheduleAt,
    setFullBoxMode,
    setFullBoxScheduleMode,
    setFullBoxScheduleAt,
    setEmptyBoxRouteDecision,
    setFullBoxRouteDecision,
    setRoutePlannerLeg,
    setRouteAssignmentRetries,
    setFullBoxPickupExpanded,
    setLogisticsNotes,
    setEmptyBoxAdditionalCharge,
    setFullBoxAdditionalCharge,
    setCreatedInvoice,
    setFinishDocTab,
    setSelectedSender,
    setSelectedRecipient,
    setSelectedBoxLines,
    setActiveStep,
    setPayNowDraft,
    setPayNowDraftTouched,
    setInvoicePaymentMethod,
    setInvoicePaymentNote,
    setSelectedPromotionId,
    setStockMessage,
    setInvoiceSequence,
    setShowQuickCheckout,
    setQuickSaleDraft,
    setQuickEmptyBoxAdditionalCharge,
    setQuickInvoiceNumber,
    setQuickTrackingToken,
    setQuickPayNowDraft,
    setQuickPayNowDraftTouched,
    setQuickPaymentMethod,
    setQuickPaymentNote,
    setQuickCheckoutCompleted,
    setQuickSelectedPromotionId,
    setSenderList,
    setQuickSaleSender,
    senderList,
    notify,
    selectedSender,
    setRecipientQuery,
    resetNewClientForm,
    createdInvoice,
    reloadHistory,
    editingFromFinish,
    setEditingFromFinish,
    setDocumentEditKind,
    setMode,
    resetNewRecipientForm,
    setCustomersLoading,
    setCustomersError,
    senderQuery,
    setSaleShortcuts,
  } = context;

  function resetSaleLogistics() {
    setEmptyBoxMode("");
    setEmptyBoxScheduleMode("");
    setEmptyBoxScheduleAt("");
    setFullBoxMode("");
    setFullBoxScheduleMode("");
    setFullBoxScheduleAt("");
    setEmptyBoxRouteDecision(null);
    setFullBoxRouteDecision(null);
    setRoutePlannerLeg(null);
    setRouteAssignmentRetries([]);
    setFullBoxPickupExpanded(false);
    setLogisticsNotes("");
    setEmptyBoxAdditionalCharge(disabledLogisticsAdditionalCharge());
    setFullBoxAdditionalCharge(disabledLogisticsAdditionalCharge());
  }

  function expandFullBoxPickup() {
    setFullBoxPickupExpanded(true);
  }

  function deferFullBoxPickup() {
    setFullBoxMode("");
    setFullBoxScheduleMode("");
    setFullBoxScheduleAt("");
    setFullBoxRouteDecision(null);
    setFullBoxPickupExpanded(false);
  }

  function startNewSale() {
    setCreatedInvoice(null);
    setFinishDocTab("invoice");
    setSelectedSender(null);
    setSelectedRecipient(null);
    setSelectedBoxLines([]);
    resetSaleLogistics();
    setActiveStep("client");
    setPayNowDraft("");
    setPayNowDraftTouched(false);
    setInvoicePaymentMethod(SALE_PAYMENT_UNSET);
    setInvoicePaymentNote("");
    setSelectedPromotionId("");
    setStockMessage("");
    setInvoiceSequence((current) => current + 1);
  }

  function closeQuickCheckout() {
    setShowQuickCheckout(false);
    setQuickSaleDraft(null);
    setQuickEmptyBoxAdditionalCharge(disabledLogisticsAdditionalCharge());
    setQuickInvoiceNumber("");
    setQuickTrackingToken("");
    setQuickPayNowDraft("");
    setQuickPayNowDraftTouched(false);
    setQuickPaymentMethod(SALE_PAYMENT_UNSET);
    setQuickPaymentNote("");
    setQuickCheckoutCompleted(false);
    setQuickSelectedPromotionId("");
  }

  async function finishQuickCheckoutNewSale() {
    if (isSupabaseConfigured()) {
      const nextInvoice = await allocateInvoiceNumberAction();
      if (nextInvoice.ok) {
        const match = nextInvoice.data.invoiceNumber.match(/(\d+)$/);
        if (match) {
          setInvoiceSequence(Number(match[1]));
        }
      }
    } else {
      setInvoiceSequence((current) => current + 1);
    }

    closeQuickCheckout();
  }

  const patchSenderRecipients = useCallback(
    (senderId: string, recipients: Recipient[]) => {
      setSenderList((current) =>
        current.map((sender) => (sender.id === senderId ? { ...sender, recipients } : sender)),
      );
      setSelectedSender((current) =>
        current?.id === senderId ? { ...current, recipients } : current,
      );
      setQuickSaleSender((current) =>
        current?.id === senderId ? { ...current, recipients } : current,
      );
    },
    [setQuickSaleSender, setSelectedSender, setSenderList],
  );

  const ensureSenderRecipients = useCallback(
    async (sender: Sender) => {
      if (!sender.id || sender.id.startsWith("local-")) {
        return sender;
      }

      const latest = senderList.find((entry) => entry.id === sender.id) ?? sender;
      if (latest.recipients.length > 0) {
        return latest;
      }

      const result = await listRecipientsForCustomerAction(sender.id);
      if (!result.ok) {
        notify.error(result.error);
        return latest;
      }

      if (result.data.length === 0) {
        return latest;
      }

      const recipients = result.data.map(recipientRowToSaleRecipient);
      patchSenderRecipients(sender.id, recipients);
      return { ...latest, recipients };
    },
    [notify, patchSenderRecipients, senderList],
  );

  function chooseSender(sender: Sender) {
    const resolved = senderList.find((entry) => entry.id === sender.id) ?? sender;
    const isSameSender =
      selectedSender !== null && senderPhoneKey(selectedSender) === senderPhoneKey(resolved);

    if (isSameSender) {
      setSelectedSender(null);
      setSelectedRecipient(null);
      setSelectedBoxLines([]);
      resetSaleLogistics();
      setActiveStep("client");
      return;
    }

    // El remitente desbloquea el paso 2 de inmediato. La carga de destinatarios
    // es opcional para mostrar la siguiente pantalla y se hidrata en segundo plano
    // mediante el efecto que observa `activeSender`.
    setSelectedSender(resolved);
    setSelectedRecipient(null);
    setSelectedBoxLines([]);
    resetSaleLogistics();
    setRecipientQuery("");
    setActiveStep("recipient");
  }

  function patchSenderCardStyle(senderId: string, cardStyle: string) {
    setSenderList((current) =>
      current.map((sender) =>
        sender.id === senderId ? { ...sender, cardStyle } : sender,
      ),
    );
    setSelectedSender((current) =>
      current?.id === senderId ? { ...current, cardStyle } : current,
    );
    setQuickSaleSender((current) =>
      current?.id === senderId ? { ...current, cardStyle } : current,
    );
  }


  async function syncCreatedInvoiceParty(options: {
    sender?: Sender;
    recipient?: Recipient;
  }) {
    const shipmentId = createdInvoice?.shipmentId;
    if (!shipmentId || !isSupabaseConfigured()) {
      return;
    }

    const result = await syncShipmentPartyAction({
      shipmentId,
      customerName: options.sender ? personFullName(options.sender) : undefined,
      recipientSnapshot: options.recipient
        ? recipientShipmentSnapshot(options.recipient)
        : undefined,
    });

    if (!result.ok) {
      notify.error(result.error);
      return;
    }

    notify.success("Corrección guardada en el envío.");
    void reloadHistory();
  }

  function finishClientSave(nextSender: Sender, isNew: boolean) {
    const returnToFinish = editingFromFinish && !isNew;
    resetNewClientForm();
    setEditingFromFinish(false);

    if (returnToFinish) {
      setSelectedSender((current) => {
        if (!current || current.id !== nextSender.id) {
          return {
            ...nextSender,
            recipients: nextSender.recipients.length
              ? nextSender.recipients
              : current?.recipients || [],
          };
        }

        return {
          ...nextSender,
          recipients: nextSender.recipients.length ? nextSender.recipients : current.recipients,
        };
      });
      setCreatedInvoice((current) =>
        current
          ? {
            ...current,
            sender: {
              ...nextSender,
              recipients: nextSender.recipients.length
                ? nextSender.recipients
                : current.sender.recipients,
            },
          }
          : null,
      );
      setDocumentEditKind(null);
      setMode("sale");
      void syncCreatedInvoiceParty({ sender: nextSender });
      return;
    }

    if (isNew) {
      setSelectedSender(nextSender);
      setSelectedRecipient(null);
      setSelectedBoxLines([]);
      resetSaleLogistics();
      setRecipientQuery("");
      resetNewRecipientForm();
      setActiveStep("recipient");
      setMode("new-recipient");
      return;
    }

    setSelectedSender(null);
    setSelectedRecipient(null);
    setSelectedBoxLines([]);
    resetSaleLogistics();
    setActiveStep("client");
    setMode("sale");
  }

  const reloadCustomers = useCallback(async (query = "", options?: { showLoading?: boolean; }) => {
    if (!isSupabaseConfigured()) {
      setCustomersLoading(false);
      return;
    }

    const trimmedQuery = query.trim();
    const showLoading = options?.showLoading ?? Boolean(trimmedQuery);

    if (showLoading) {
      setCustomersLoading(true);
    }
    setCustomersError("");

    try {
      const result = await listCustomersWithRecipientsAction({
        query: trimmedQuery || undefined,
      });

      if (!result.ok) {
        setCustomersError(result.error);
        return;
      }

      const mapped = result.data.map(customerRowToSender);
      setSenderList(mapped);
      setSelectedSender((current) => {
        if (!current) {
          return current;
        }

        return mapped.find((sender) => sender.id === current.id) ?? current;
      });
    } catch (error) {
      setCustomersError(
        error instanceof Error ? error.message : "No se pudieron cargar los remitentes.",
      );
    } finally {
      if (showLoading) {
        setCustomersLoading(false);
      }
    }
  }, [
    setCustomersError,
    setCustomersLoading,
    setSelectedSender,
    setSenderList,
  ]);

  async function saveSenderCardStyle(sender: Sender, cardStyle: SalePersonCardVariantId) {
    patchSenderCardStyle(sender.id, cardStyle);

    if (!isSupabaseConfigured() || sender.id.startsWith("local-")) {
      return;
    }

    const result = await updateCustomerCardStyleAction({
      customerId: sender.id,
      cardStyle,
    });

    if (!result.ok) {
      notify.error(result.error);
      void reloadCustomers(senderQuery, { showLoading: false });
    }
  }

  function patchRecipientCardStyle(recipientId: string, cardStyle: string) {
    const patchRecipients = (recipients: Recipient[]) =>
      recipients.map((recipient) =>
        recipient.id === recipientId ? { ...recipient, cardStyle } : recipient,
      );

    setSenderList((current) =>
      current.map((sender) => ({
        ...sender,
        recipients: patchRecipients(sender.recipients),
      })),
    );
    setSelectedSender((current) =>
      current ? { ...current, recipients: patchRecipients(current.recipients) } : current,
    );
    setSelectedRecipient((current) =>
      current?.id === recipientId ? { ...current, cardStyle } : current,
    );
  }

  async function saveRecipientCardStyle(recipient: Recipient, cardStyle: SalePersonCardVariantId) {
    patchRecipientCardStyle(recipient.id, cardStyle);

    if (!isSupabaseConfigured() || recipient.id.startsWith("local-r-")) {
      return;
    }

    const result = await updateRecipientCardStyleAction({
      recipientId: recipient.id,
      cardStyle,
    });

    if (!result.ok) {
      notify.error(result.error);
      void reloadCustomers(senderQuery, { showLoading: false });
    }
  }

  const reloadSaleShortcuts = useCallback(async () => {
    let shortcuts = readRecentSaleShortcuts();

    if (isSupabaseConfigured()) {
      const result = await listSaleShortcutsAction();
      if (result.ok) {
        shortcuts = mergeSaleShortcuts(result.data, shortcuts);
      }
    }

    setSaleShortcuts(shortcuts);
  }, [setSaleShortcuts]);
  return {
    resetSaleLogistics,
    expandFullBoxPickup,
    deferFullBoxPickup,
    startNewSale,
    closeQuickCheckout,
    finishQuickCheckoutNewSale,
    patchSenderRecipients,
    ensureSenderRecipients,
    chooseSender,
    syncCreatedInvoiceParty,
    finishClientSave,
    reloadCustomers,
    saveSenderCardStyle,
    saveRecipientCardStyle,
    reloadSaleShortcuts,
  };
}

export type VentaFlow = ReturnType<typeof useVentaFlow>;
