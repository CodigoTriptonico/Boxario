"use client";

import { useMemo } from "react";
import { deactivateCustomerAction, deleteRecipientAction } from "@/app/actions/customers";
import { listQuickSaleCountries, resolveQuickSaleBoxCatalog } from "@/lib/sale-quick-box-catalog";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { personFullName, recipientIdentityKey, type Recipient, salePersonAddressSummary, type Sender, senderPhoneKey } from "@/components/sale/venta-parts";
import type { VentaCore } from "@/components/sale/venta/use-venta-core";
import type { VentaFoundation } from "@/components/sale/venta/use-venta-foundation";
import type { VentaData } from "@/components/sale/venta/use-venta-data";
import type { VentaFlow } from "@/components/sale/venta/use-venta-flow";
import type { VentaEffects } from "@/components/sale/venta/use-venta-effects";
import type { VentaForms } from "@/components/sale/venta/use-venta-forms";
import type { VentaSelection } from "@/components/sale/venta/use-venta-selection";
import type { VentaInvoices } from "@/components/sale/venta/use-venta-invoices";

type VentaContextActionsContext = VentaCore & VentaFoundation & VentaData & VentaFlow & VentaEffects & VentaForms & VentaSelection & VentaInvoices;

export function useVentaContextActions(context: VentaContextActionsContext) {
  const {
    activeSender,
    activeStep,
    contextMenu,
    countryBoxes,
    createdInvoice,
    deleteConfirm,
    documentEditKind,
    editingCustomerId,
    editingRecipientId,
    notify,
    patchSenderRecipients,
    quickSaleCountry,
    reloadCustomers,
    reloadHistory,
    resetNewClientForm,
    resetNewRecipientForm,
    resetSaleLogistics,
    routePlannerLeg,
    selectedRecipient,
    selectedSender,
    senderList,
    senderQuery,
    setActiveCopyGroup,
    setActiveStep,
    setClientAddressSearch,
    setClientAddressSuggestions,
    setClientAddressValidation,
    setContextMenu,
    setDeleteConfirm,
    setDeleteConfirming,
    setDocumentEditKind,
    setEditingCustomerId,
    setEditingFromFinish,
    setEditingRecipientId,
    setHistoryDrawer,
    setMode,
    setNewClientAddressReference,
    setNewClientCity,
    setNewClientEmails,
    setNewClientFirstName,
    setNewClientHouse,
    setNewClientLastName,
    setNewClientNeighborhood,
    setNewClientPhones,
    setNewClientPostalCode,
    setNewClientState,
    setNewClientStreet,
    setNewRecipientAddressReference,
    setNewRecipientCity,
    setNewRecipientCountry,
    setNewRecipientEmails,
    setNewRecipientFirstName,
    setNewRecipientHouse,
    setNewRecipientLastName,
    setNewRecipientNeighborhood,
    setNewRecipientPhone,
    setNewRecipientPostalCode,
    setNewRecipientState,
    setNewRecipientStreet,
    setQuickEmptyBoxRouteDecision,
    setQuickSaleCountry,
    setQuickSaleCountryPickerOpen,
    setQuickSaleSender,
    setRecipientAddressSearch,
    setRecipientAddressSuggestions,
    setRecipientAddressValidation,
    setRoutePlannerLeg,
    setSelectedBoxLines,
    setSelectedRecipient,
    setSelectedSender,
    setSenderList,
  } = context;

  const quickSaleCountries = useMemo(
    () => listQuickSaleCountries(countryBoxes),
    [countryBoxes],
  );

  const quickSaleBoxCatalog = useMemo(
    () =>
      quickSaleCountry
        ? resolveQuickSaleBoxCatalog(countryBoxes, quickSaleCountry)
        : null,
    [countryBoxes, quickSaleCountry],
  );

  function closeQuickSaleCountryFlow() {
    setQuickSaleSender(null);
    setQuickSaleCountry(null);
    setQuickSaleCountryPickerOpen(false);
    setQuickEmptyBoxRouteDecision(null);
    if (routePlannerLeg === "quickEmptyBox") {
      setRoutePlannerLeg(null);
    }
  }

  function startQuickEmptyBox(sender: Sender) {
    const countries = listQuickSaleCountries(countryBoxes);

    if (!countries.length) {
      notify.error("Configura al menos un país con cajas para usar la venta rápida.");
      return;
    }

    setQuickSaleSender(sender);
    setQuickSaleCountry(null);
    setQuickSaleCountryPickerOpen(true);
    setQuickEmptyBoxRouteDecision(null);
    setContextMenu(null);
    setActiveCopyGroup(null);
  }

  function resolveContextSender() {
    if (!contextMenu || contextMenu.type !== "remitente") {
      return null;
    }

    if (contextMenu.customerId) {
      return (
        senderList.find((sender) => sender.id === contextMenu.customerId) ||
        (selectedSender?.id === contextMenu.customerId ? selectedSender : null) ||
        (createdInvoice?.sender.id === contextMenu.customerId ? createdInvoice.sender : null)
      );
    }

    const senderKey = contextMenu.targetKey.replace(/^sender:/, "");
    return (
      senderList.find((item) => senderPhoneKey(item) === senderKey) ||
      (selectedSender && senderPhoneKey(selectedSender) === senderKey ? selectedSender : null) ||
      (createdInvoice && senderPhoneKey(createdInvoice.sender) === senderKey
        ? createdInvoice.sender
        : null)
    );
  }

  function resolveContextRecipient() {
    if (!contextMenu || contextMenu.type !== "destinatario") {
      return null;
    }

    const recipientPool = [
      ...(activeSender?.recipients || []),
      ...(selectedSender?.recipients || []),
      ...(selectedRecipient ? [selectedRecipient] : []),
      ...(createdInvoice ? [createdInvoice.recipient] : []),
    ];

    if (contextMenu.recipientId) {
      return (
        recipientPool.find((recipient) => recipient.id === contextMenu.recipientId) || null
      );
    }

    const recipientKey = contextMenu.targetKey.replace(/^recipient:/, "");
    return (
      recipientPool.find((recipient) => recipientIdentityKey(recipient) === recipientKey) || null
    );
  }

  function requestDeleteFromContextMenu() {
    if (!contextMenu || contextMenu.type === "caja") {
      return;
    }

    if (contextMenu.type === "remitente") {
      const sender = resolveContextSender();
      if (!sender?.id) {
        return;
      }

      setDeleteConfirm({
        kind: "remitente",
        title: personFullName(sender) || contextMenu.title,
        customerId: sender.id,
      });
      setContextMenu(null);
      setActiveCopyGroup(null);
      return;
    }

    const recipient = resolveContextRecipient();
    if (!recipient?.id || !activeSender?.id) {
      return;
    }

    setDeleteConfirm({
      kind: "destinatario",
      title: personFullName(recipient) || contextMenu.title,
      customerId: activeSender.id,
      recipientId: recipient.id,
    });
    setContextMenu(null);
    setActiveCopyGroup(null);
  }

  async function confirmDeletePerson() {
    if (!deleteConfirm) {
      return;
    }

    setDeleteConfirming(true);

    try {
      if (deleteConfirm.kind === "remitente") {
        if (isSupabaseConfigured() && !deleteConfirm.customerId.startsWith("local")) {
          const result = await deactivateCustomerAction(deleteConfirm.customerId);
          if (!result.ok) {
            notify.error(result.error);
            return;
          }
        }

        setSenderList((current) =>
          current.filter((sender) => sender.id !== deleteConfirm.customerId),
        );

        if (selectedSender?.id === deleteConfirm.customerId) {
          setSelectedSender(null);
          setSelectedRecipient(null);
          setSelectedBoxLines([]);
          resetSaleLogistics();
          setActiveStep("client");
          setMode("sale");
        }

        if (editingCustomerId === deleteConfirm.customerId) {
          resetNewClientForm();
          setMode("sale");
        }

        notify.success("Remitente eliminado");
        void reloadCustomers(senderQuery);
        void reloadHistory();
        setDeleteConfirm(null);
        return;
      }

      if (
        isSupabaseConfigured() &&
        deleteConfirm.recipientId &&
        !deleteConfirm.recipientId.startsWith("local-r-")
      ) {
        const result = await deleteRecipientAction(deleteConfirm.recipientId);
        if (!result.ok) {
          notify.error(result.error);
          return;
        }
      }

      const sender = senderList.find((entry) => entry.id === deleteConfirm.customerId);
      if (sender && deleteConfirm.recipientId) {
        const nextRecipients = sender.recipients.filter(
          (recipient) => recipient.id !== deleteConfirm.recipientId,
        );
        patchSenderRecipients(deleteConfirm.customerId, nextRecipients);
      }

      if (selectedRecipient?.id === deleteConfirm.recipientId) {
        setSelectedRecipient(null);
        setSelectedBoxLines([]);
        resetSaleLogistics();
      }

      if (editingRecipientId === deleteConfirm.recipientId) {
        resetNewRecipientForm();
        setMode("sale");
      }

      notify.success("Destinatario eliminado");
      void reloadHistory();
      setDeleteConfirm(null);
    } finally {
      setDeleteConfirming(false);
    }
  }

  function openRecipientShipmentHistory(recipient: Recipient) {
    setHistoryDrawer({
      sender: selectedSender,
      recipientId: recipient.id.startsWith("local-r-") ? undefined : recipient.id,
      recipientName: personFullName(recipient),
    });
  }

  function openCustomerHistoryFromMenu() {
    if (!contextMenu) {
      return;
    }

    if (contextMenu.type === "remitente") {
      const sender = resolveContextSender();
      if (!sender) {
        return;
      }

      setHistoryDrawer({ sender });
      setContextMenu(null);
      setActiveCopyGroup(null);
      return;
    }

    if (contextMenu.type === "destinatario" && contextMenu.recipientId) {
      setHistoryDrawer({
        sender: selectedSender,
        recipientId: contextMenu.recipientId,
        recipientName: contextMenu.title,
      });
      setContextMenu(null);
      setActiveCopyGroup(null);
    }
  }


  function copyText(value?: string) {
    if (!value) {
      return;
    }

    void navigator.clipboard?.writeText(value);
    notify.success("Copiado");
    setContextMenu(null);
    setActiveCopyGroup(null);
  }

  function copyValue(value?: string) {
    copyText(value);
  }

  function senderAddressSummary(sender: Sender) {
    const summary = salePersonAddressSummary({
      street: sender.street,
      houseNumber: sender.houseNumber,
      neighborhood: sender.neighborhood,
      city: sender.city,
      state: sender.state,
      postalCode: sender.postalCode,
    });

    return summary ? `${summary}, USA` : "USA";
  }

  function recipientAddressSummary(recipient: Recipient) {
    const summary = salePersonAddressSummary({
      street: recipient.street,
      houseNumber: recipient.houseNumber,
      neighborhood: recipient.neighborhood,
      city: recipient.city,
      state: recipient.state,
      postalCode: recipient.postalCode,
    });

    return summary ? `${summary}, ${recipient.country}` : recipient.country;
  }

  function editSender(sender: Sender, options?: { fromFinish?: boolean; }) {
    const fromFinish = Boolean(options?.fromFinish);
    setEditingFromFinish(fromFinish);
    setEditingCustomerId(sender.id || null);
    setNewClientFirstName(sender.firstName);
    setNewClientLastName(sender.lastName);
    setNewClientPhones(sender.phones.length ? sender.phones : [""]);
    setNewClientEmails(sender.emails.length ? sender.emails : sender.email ? [sender.email] : [""]);
    setNewClientStreet(sender.street || "");
    setNewClientHouse(sender.houseNumber || "");
    setNewClientNeighborhood(sender.neighborhood || "");
    setNewClientCity(sender.city || "");
    setNewClientState(sender.state || "");
    setNewClientPostalCode(sender.postalCode || "");
    setNewClientAddressReference(sender.addressReference || "");
    setClientAddressSearch(senderAddressSummary(sender));
    setClientAddressSuggestions([]);
    setClientAddressValidation({
      status: sender.addressVerified ? "valid" : "idle",
      message: sender.addressVerified ? "Direccion cargada" : "Direccion sin verificar",
      formattedAddress: sender.formattedAddress,
      placeId: sender.placeId,
      lat: sender.lat,
      lng: sender.lng,
    });
    setContextMenu(null);
    setActiveCopyGroup(null);

    if (fromFinish) {
      setDocumentEditKind("sender");
      return;
    }

    setDocumentEditKind(null);
    setMode("new-client");
    setActiveStep("client");
  }

  function editRecipient(recipient: Recipient, options?: { fromFinish?: boolean; }) {
    const fromFinish = Boolean(options?.fromFinish);
    setEditingFromFinish(fromFinish);
    setEditingRecipientId(recipient.id || null);
    setNewRecipientFirstName(recipient.firstName);
    setNewRecipientLastName(recipient.lastName);
    setNewRecipientPhone(recipient.phone);
    setNewRecipientEmails(
      recipient.emails.length ? recipient.emails : recipient.email ? [recipient.email] : [""],
    );
    setNewRecipientCountry(recipient.country);
    setNewRecipientStreet(recipient.street || "");
    setNewRecipientHouse(recipient.houseNumber || "");
    setNewRecipientNeighborhood(recipient.neighborhood || "");
    setNewRecipientCity(recipient.city || "");
    setNewRecipientState(recipient.state || "");
    setNewRecipientPostalCode(recipient.postalCode || "");
    setNewRecipientAddressReference(recipient.addressReference || "");
    setRecipientAddressSearch(recipientAddressSummary(recipient));
    setRecipientAddressSuggestions([]);
    setRecipientAddressValidation({
      status: recipient.addressVerified ? "valid" : "idle",
      message: recipient.addressVerified ? "Direccion cargada" : "Direccion sin verificar",
      formattedAddress: recipient.formattedAddress,
      placeId: recipient.placeId,
      lat: recipient.lat,
      lng: recipient.lng,
    });
    setContextMenu(null);
    setActiveCopyGroup(null);

    if (fromFinish) {
      setDocumentEditKind("recipient");
      return;
    }

    setDocumentEditKind(null);
    setMode("new-recipient");
    setActiveStep("recipient");
  }

  function closeDocumentPartyEdit() {
    if (documentEditKind === "sender") {
      resetNewClientForm();
    } else if (documentEditKind === "recipient") {
      resetNewRecipientForm();
    }
    setDocumentEditKind(null);
    setEditingFromFinish(false);
  }

  function editContextTarget() {
    if (!contextMenu) {
      return;
    }

    const fromFinish = activeStep === "finish";

    if (contextMenu.type === "remitente") {
      const sender = resolveContextSender();
      if (!sender) {
        return;
      }

      editSender(sender, { fromFinish });
      return;
    }

    if (contextMenu.type === "destinatario") {
      const recipient = resolveContextRecipient();
      if (!recipient) {
        return;
      }

      if (!selectedSender && (activeSender || createdInvoice?.sender)) {
        setSelectedSender(activeSender || createdInvoice?.sender || null);
      }

      editRecipient(recipient, { fromFinish });
    }
  }

  return {
    quickSaleCountries,
    quickSaleBoxCatalog,
    closeQuickSaleCountryFlow,
    startQuickEmptyBox,
    resolveContextSender,
    requestDeleteFromContextMenu,
    confirmDeletePerson,
    openRecipientShipmentHistory,
    openCustomerHistoryFromMenu,
    copyValue,
    closeDocumentPartyEdit,
    editContextTarget,
  };
}

export type VentaContextActions = ReturnType<typeof useVentaContextActions>;
