"use client";

import {
  formatValidatedAddress,
  resolveCountryBoxes,
} from "@/components/sale/venta/shared";
import { createCustomerAction, createRecipientAction, updateCustomerAction, updateRecipientAction } from "@/app/actions/customers";
import { customerRowToSender } from "@/lib/customers/mappers";
import { configPricesCountryHref } from "@/lib/country-options";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { normalizePhoneList, type Recipient, type Sender } from "@/components/sale/venta-parts";
import type { VentaCore } from "@/components/sale/venta/use-venta-core";
import type { VentaFoundation } from "@/components/sale/venta/use-venta-foundation";
import type { VentaData } from "@/components/sale/venta/use-venta-data";
import type { VentaFlow } from "@/components/sale/venta/use-venta-flow";
import type { VentaSelectionBase } from "@/components/sale/venta/use-venta-selection-base";
import type { VentaEffects } from "@/components/sale/venta/use-venta-effects";
import type { ExactEntranceDraft } from "@/components/sale/sale-exact-entrance-step";

type VentaFormsContext = VentaCore & VentaFoundation & VentaData & VentaFlow & VentaSelectionBase & VentaEffects;

export function useVentaForms(context: VentaFormsContext) {
  const {
    activeSender,
    chooseRecipient,
    chooseSender,
    clientAddressValidation,
    countryBoxes,
    defaultRecipientCardStyle,
    defaultSenderCardStyle,
    duplicateClient,
    duplicateRecipient,
    editingCustomerId,
    editingFromFinish,
    editingRecipientId,
    finishClientSave,
    newClientAddressReference,
    newClientCity,
    newClientEmailList,
    newClientFirstName,
    newClientHouse,
    newClientLastName,
    newClientNeighborhood,
    newClientPhones,
    newClientPostalCode,
    newClientReferredByCustomerId,
    newClientState,
    newClientStreet,
    newRecipientAddressReference,
    newRecipientCity,
    newRecipientCountry,
    newRecipientEmailList,
    newRecipientFirstName,
    newRecipientHouse,
    newRecipientLastName,
    newRecipientNeighborhood,
    newRecipientPhone,
    newRecipientPostalCode,
    newRecipientState,
    newRecipientStreet,
    nextLocalId,
    recipientAddressValidation,
    reloadHistory,
    resetNewClientForm,
    resetNewRecipientForm,
    resetSaleLogistics,
    router,
    selectedSender,
    senderList,
    setActiveStep,
    setClientAddressValidation,
    setCreatedInvoice,
    setCustomersError,
    setCustomersSaving,
    setDocumentEditKind,
    setEditingFromFinish,
    setMode,
    setNewClientEmails,
    setNewClientPhones,
    setNewClientReferredByCustomerId,
    setNewRecipientEmails,
    setRecipientAddressValidation,
    setSelectedBoxLines,
    setSelectedRecipient,
    setSelectedSender,
    setSenderList,
    syncCreatedInvoiceParty,
  } = context;

  function updateClientPhone(index: number, value: string) {
    setNewClientPhones((current) =>
      current.map((phone, phoneIndex) => (phoneIndex === index ? value : phone)),
    );
  }

  function addClientPhone() {
    setNewClientPhones((current) => [...current, ""]);
  }

  function removeClientPhone(index: number) {
    setNewClientPhones((current) => (current.length <= 1 ? [""] : current.filter((_, i) => i !== index)));
  }

  function updateClientEmail(index: number, value: string) {
    setNewClientEmails((current) =>
      current.map((email, emailIndex) => (emailIndex === index ? value : email)),
    );
  }

  function addClientEmail() {
    setNewClientEmails((current) => [...current, ""]);
  }

  function removeClientEmail(index: number) {
    setNewClientEmails((current) => (current.length <= 1 ? [""] : current.filter((_, i) => i !== index)));
  }

  function updateRecipientEmail(index: number, value: string) {
    setNewRecipientEmails((current) =>
      current.map((email, emailIndex) => (emailIndex === index ? value : email)),
    );
  }

  function addRecipientEmail() {
    setNewRecipientEmails((current) => [...current, ""]);
  }

  function removeRecipientEmail(index: number) {
    setNewRecipientEmails((current) =>
      current.length <= 1 ? [""] : current.filter((_, i) => i !== index),
    );
  }

  function addReferralClient(sender: Sender) {
    resetNewClientForm();
    setNewClientReferredByCustomerId(sender.id);
    setMode("new-client");
    setActiveStep("client");
  }

  async function createClient(options?: {
    skipAddressVerification?: boolean;
    exactEntrance?: ExactEntranceDraft | null;
  }) {
    const phones = normalizePhoneList(newClientPhones);

    if (!phones.length) {
      return;
    }

    if (duplicateClient) {
      if (editingCustomerId) {
        return;
      }

      void chooseSender(duplicateClient);
      setMode("sale");
      return;
    }

    if (
      !newClientFirstName.trim() ||
      !newClientLastName.trim() ||
      !newClientStreet.trim() ||
      !newClientCity.trim() ||
      !newClientState.trim() ||
      !newClientPostalCode.trim()
    ) {
      return;
    }

    if (!options?.skipAddressVerification && clientAddressValidation.status !== "valid") {
      setClientAddressValidation({
        status: "invalid",
        message: "Primero valida direccion en Google",
      });
      return;
    }

    const typedClientAddress = formatValidatedAddress(
      {
        street: newClientStreet.trim(),
        houseNumber: newClientHouse.trim(),
        city: newClientCity.trim(),
        state: newClientState.trim(),
        postalCode: newClientPostalCode.trim(),
        country: "USA",
      },
      newClientHouse,
    );

    const payload = {
      firstName: newClientFirstName.trim(),
      lastName: newClientLastName.trim(),
      phones,
      email: newClientEmailList[0] || "",
      emails: newClientEmailList,
      street: newClientStreet.trim(),
      houseNumber: newClientHouse.trim() || "-",
      neighborhood: newClientNeighborhood.trim() || "-",
      city: newClientCity.trim(),
      state: newClientState.trim(),
      postalCode: newClientPostalCode.trim(),
      addressReference: newClientAddressReference.trim(),
      country: "USA",
      referredByCustomerId: editingCustomerId ? "" : newClientReferredByCustomerId,
      placeId: options?.skipAddressVerification ? "" : clientAddressValidation.placeId || "",
      formattedAddress: clientAddressValidation.formattedAddress || typedClientAddress || "",
      addressVerified: !options?.skipAddressVerification && clientAddressValidation.status === "valid",
      lat: options?.skipAddressVerification ? null : clientAddressValidation.lat ?? null,
      lng: options?.skipAddressVerification ? null : clientAddressValidation.lng ?? null,
      exactEntranceLat: options?.exactEntrance?.lat ?? null,
      exactEntranceLng: options?.exactEntrance?.lng ?? null,
      exactEntranceNote: options?.exactEntrance?.note || "",
      exactEntrancePanoId: options?.exactEntrance?.panoId || "",
      exactEntranceHeading: options?.exactEntrance?.heading ?? null,
      exactEntrancePitch: options?.exactEntrance?.pitch ?? null,
      exactEntranceConfirmedAt: options?.exactEntrance ? new Date().toISOString() : "",
    };

    if (isSupabaseConfigured()) {
      setCustomersSaving(true);
      setCustomersError("");

      const result = editingCustomerId
        ? await updateCustomerAction({
          customerId: editingCustomerId,
          firstName: payload.firstName,
          lastName: payload.lastName,
          phones: payload.phones,
          email: payload.email,
          emails: payload.emails,
          street: payload.street,
          houseNumber: payload.houseNumber,
          neighborhood: payload.neighborhood,
          city: payload.city,
          state: payload.state,
          postalCode: payload.postalCode,
          addressReference: payload.addressReference,
          country: payload.country,
          placeId: payload.placeId,
          formattedAddress: payload.formattedAddress,
          addressVerified: payload.addressVerified,
          lat: payload.lat,
          lng: payload.lng,
          exactEntranceLat: payload.exactEntranceLat,
          exactEntranceLng: payload.exactEntranceLng,
          exactEntranceNote: payload.exactEntranceNote,
          exactEntrancePanoId: payload.exactEntrancePanoId,
          exactEntranceHeading: payload.exactEntranceHeading,
          exactEntrancePitch: payload.exactEntrancePitch,
        })
        : await createCustomerAction(payload);

      setCustomersSaving(false);

      if (!result.ok) {
        setCustomersError(result.error);
        return;
      }

      const nextSender = customerRowToSender(result.data);
      setSenderList((current) =>
        editingCustomerId
          ? current.map((sender) => (sender.id === nextSender.id ? nextSender : sender))
          : [nextSender, ...current],
      );
      void reloadHistory();
      finishClientSave(nextSender, !editingCustomerId);
      return;
    }

    const nextSender: Sender = {
      id: nextLocalId("local"),
      ...payload,
      referredByCustomerId: payload.referredByCustomerId,
      createdAt:
        (editingCustomerId
          ? senderList.find((sender) => sender.id === editingCustomerId)?.createdAt
          : undefined) || new Date().toISOString(),
      cardStyle:
        (editingCustomerId
          ? senderList.find((sender) => sender.id === editingCustomerId)?.cardStyle
          : undefined) || defaultSenderCardStyle,
      recipients: editingCustomerId
        ? senderList.find((sender) => sender.id === editingCustomerId)?.recipients || []
        : [],
    };

    setSenderList((current) =>
      editingCustomerId
        ? current.map((sender) => (sender.id === editingCustomerId ? nextSender : sender))
        : [nextSender, ...current],
    );
    finishClientSave(nextSender, !editingCustomerId);
  }

  async function createRecipient(options?: {
    skipAddressVerification?: boolean;
    exactEntrance?: ExactEntranceDraft | null;
  }) {
    if (
      !selectedSender ||
      !newRecipientFirstName.trim() ||
      !newRecipientLastName.trim() ||
      !newRecipientPhone.trim() ||
      !newRecipientCountry
    ) {
      return;
    }

    if (duplicateRecipient && !editingRecipientId) {
      chooseRecipient(duplicateRecipient);
      setMode("sale");
      return;
    }

    if (!options?.skipAddressVerification && recipientAddressValidation.status !== "valid") {
      setRecipientAddressValidation({
        status: "invalid",
        message: "Primero valida direccion en Google",
      });
      return;
    }

    const recipientPayload = {
      firstName: newRecipientFirstName.trim(),
      lastName: newRecipientLastName.trim(),
      phone: newRecipientPhone.trim(),
      email: newRecipientEmailList[0] || "",
      emails: newRecipientEmailList,
      country: newRecipientCountry,
      street: newRecipientStreet.trim(),
      houseNumber: newRecipientHouse.trim(),
      neighborhood: newRecipientNeighborhood.trim(),
      city: newRecipientCity.trim(),
      state: newRecipientState.trim(),
      postalCode: newRecipientPostalCode.trim(),
      addressReference: newRecipientAddressReference.trim(),
      placeId: options?.skipAddressVerification ? "" : recipientAddressValidation.placeId || "",
      formattedAddress:
        recipientAddressValidation.formattedAddress ||
        formatValidatedAddress(
          {
            street: newRecipientStreet.trim(),
            houseNumber: newRecipientHouse.trim(),
            city: newRecipientCity.trim(),
            state: newRecipientState.trim(),
            postalCode: newRecipientPostalCode.trim(),
            country: newRecipientCountry,
          },
          newRecipientHouse,
        ) ||
        "",
      addressVerified:
        !options?.skipAddressVerification && recipientAddressValidation.status === "valid",
      lat: options?.skipAddressVerification ? null : recipientAddressValidation.lat ?? null,
      lng: options?.skipAddressVerification ? null : recipientAddressValidation.lng ?? null,
      exactEntranceLat: options?.exactEntrance?.lat ?? null,
      exactEntranceLng: options?.exactEntrance?.lng ?? null,
      exactEntranceNote: options?.exactEntrance?.note || "",
      exactEntrancePanoId: options?.exactEntrance?.panoId || "",
      exactEntranceHeading: options?.exactEntrance?.heading ?? null,
      exactEntrancePitch: options?.exactEntrance?.pitch ?? null,
      exactEntranceConfirmedAt: options?.exactEntrance ? new Date().toISOString() : "",
    };

    let nextRecipient: Recipient;

    if (
      isSupabaseConfigured() &&
      selectedSender.id &&
      !selectedSender.id.startsWith("local-")
    ) {
      setCustomersSaving(true);
      setCustomersError("");

      const result = editingRecipientId
        ? await updateRecipientAction({
          recipientId: editingRecipientId,
          ...recipientPayload,
        })
        : await createRecipientAction({
          customerId: selectedSender.id,
          ...recipientPayload,
        });

      setCustomersSaving(false);

      if (!result.ok) {
        setCustomersError(result.error);
        return;
      }

      nextRecipient = {
        id: result.data.id,
        firstName: result.data.firstName,
        lastName: result.data.lastName,
        phone: result.data.phone,
        email: result.data.email,
        emails: result.data.emails,
        country: result.data.country,
        street: result.data.street,
        houseNumber: result.data.houseNumber,
        neighborhood: result.data.neighborhood,
        city: result.data.city,
        state: result.data.state,
        postalCode: result.data.postalCode,
        addressReference: result.data.addressReference,
        cardStyle: result.data.cardStyle,
        placeId: result.data.placeId,
        formattedAddress: result.data.formattedAddress,
        addressVerified: result.data.addressVerified,
        lat: result.data.lat,
        lng: result.data.lng,
        exactEntranceLat: result.data.exactEntranceLat,
        exactEntranceLng: result.data.exactEntranceLng,
        exactEntranceConfirmedAt: result.data.exactEntranceConfirmedAt,
        exactEntranceNote: result.data.exactEntranceNote,
        exactEntrancePanoId: result.data.exactEntrancePanoId,
        exactEntranceHeading: result.data.exactEntranceHeading,
        exactEntrancePitch: result.data.exactEntrancePitch,
        createdAt: result.data.createdAt,
      };
    } else {
      nextRecipient = {
        id: editingRecipientId || nextLocalId("local-r"),
        ...recipientPayload,
        createdAt:
          (editingRecipientId
            ? activeSender?.recipients.find((recipient) => recipient.id === editingRecipientId)
              ?.createdAt
            : undefined) || new Date().toISOString(),
        cardStyle:
          (editingRecipientId
            ? activeSender?.recipients.find((recipient) => recipient.id === editingRecipientId)
              ?.cardStyle
            : undefined) || defaultRecipientCardStyle,
      };
    }

    const senderRecipients = activeSender?.recipients ?? selectedSender.recipients;
    const nextSender = {
      ...selectedSender,
      recipients: editingRecipientId
        ? senderRecipients.map((recipient) =>
          recipient.id === editingRecipientId ? nextRecipient : recipient,
        )
        : [nextRecipient, ...senderRecipients],
    };

    setSenderList((current) =>
      current.map((sender) => (sender.id === selectedSender.id ? nextSender : sender)),
    );
    finishRecipientSave(nextSender, nextRecipient, !editingRecipientId);
    void reloadHistory();
  }

  function finishRecipientSave(
    nextSender: Sender,
    nextRecipient: Recipient,
    isNew: boolean,
  ) {
    const returnToFinish = editingFromFinish && !isNew;
    resetNewRecipientForm();
    setSelectedSender(nextSender);
    setMode("sale");
    setEditingFromFinish(false);

    if (returnToFinish) {
      setSelectedRecipient(nextRecipient);
      setCreatedInvoice((current) =>
        current
          ? {
            ...current,
            sender: nextSender,
            recipient: nextRecipient,
          }
          : null,
      );
      setDocumentEditKind(null);
      void syncCreatedInvoiceParty({ recipient: nextRecipient });
      return;
    }

    if (!isNew) {
      chooseRecipient(nextRecipient);
      return;
    }

    const boxes = resolveCountryBoxes(countryBoxes, nextRecipient.country);
    if (boxes.length === 0) {
      setSelectedRecipient(nextRecipient);
      setSelectedBoxLines([]);
      resetSaleLogistics();
      setActiveStep("box");
      router.push(configPricesCountryHref(nextRecipient.country));
      return;
    }

    chooseRecipient(nextRecipient);
  }

  return {
    updateClientPhone,
    addClientPhone,
    removeClientPhone,
    updateClientEmail,
    addClientEmail,
    removeClientEmail,
    updateRecipientEmail,
    addRecipientEmail,
    removeRecipientEmail,
    addReferralClient,
    createClient,
    createRecipient,
  };
}

export type VentaForms = ReturnType<typeof useVentaForms>;
