"use client";

import { useRef, type RefObject } from "react";
import type { VentaBootstrapData } from "@/app/actions/sale-bootstrap";
import type { SaleStep } from "@/components/sale/venta-parts";
import {
  afterLayoutPaint,
  saleScrollTopOffset,
  smoothScrollToY,
} from "@/components/sale/venta/shared";
import type { VentaCore } from "@/components/sale/venta/use-venta-core";

export function useVentaFoundation(core: VentaCore, initialData?: VentaBootstrapData) {
  const {
    clientRef,
    recipientsRef,
    boxesRef,
    deliveryRef,
    finishRef,
    setNewClientFirstName,
    setNewClientLastName,
    setNewClientPhones,
    setNewClientEmails,
    setNewClientStreet,
    setNewClientHouse,
    setNewClientNeighborhood,
    setNewClientCity,
    setNewClientState,
    setNewClientPostalCode,
    setNewClientAddressReference,
    setNewClientReferredByCustomerId,
    setClientAddressSearch,
    setClientAddressSuggestions,
    setClientAddressSearching,
    setClientAddressValidation,
    setEditingCustomerId,
    setNewRecipientFirstName,
    setNewRecipientLastName,
    setNewRecipientPhone,
    setNewRecipientEmails,
    setNewRecipientCountry,
    setNewRecipientStreet,
    setNewRecipientHouse,
    setNewRecipientNeighborhood,
    setNewRecipientCity,
    setNewRecipientState,
    setNewRecipientPostalCode,
    setNewRecipientAddressReference,
    setRecipientAddressSearch,
    setRecipientAddressSuggestions,
    setRecipientAddressSearching,
    setRecipientAddressValidation,
    setEditingRecipientId,
    contextMenu,
  } = core;

  function scrollToNext(ref: RefObject<HTMLDivElement | null>, force = false) {
    afterLayoutPaint(() => {
      const element = ref.current;
      if (!element) {
        return;
      }

      const rect = element.getBoundingClientRect();
      const topOffset = saleScrollTopOffset();
      const isVisible = rect.top >= topOffset && rect.bottom <= window.innerHeight - 24;

      if (force || !isVisible) {
        smoothScrollToY(window.scrollY + rect.top - topOffset);
      }
    });
  }

  function scrollToStep(step: SaleStep, force = false) {
    const refs: Record<SaleStep, RefObject<HTMLDivElement | null>> = {
      client: clientRef,
      recipient: recipientsRef,
      box: boxesRef,
      delivery: deliveryRef,
      finish: finishRef,
    };

    scrollToNext(refs[step], force);
  }


  function resetNewClientForm() {
    setNewClientFirstName("");
    setNewClientLastName("");
    setNewClientPhones([""]);
    setNewClientEmails([""]);
    setNewClientStreet("");
    setNewClientHouse("");
    setNewClientNeighborhood("");
    setNewClientCity("");
    setNewClientState("");
    setNewClientPostalCode("");
    setNewClientAddressReference("");
    setNewClientReferredByCustomerId("");
    setClientAddressSearch("");
    setClientAddressSuggestions([]);
    setClientAddressSearching(false);
    setClientAddressValidation({ status: "idle", message: "" });
    setEditingCustomerId(null);
  }


  const senderCatalogCountRef = useRef(initialData?.senders?.length ?? 0);

  function resetNewRecipientForm() {
    setNewRecipientFirstName("");
    setNewRecipientLastName("");
    setNewRecipientPhone("");
    setNewRecipientEmails([""]);
    setNewRecipientCountry("");
    setNewRecipientStreet("");
    setNewRecipientHouse("");
    setNewRecipientNeighborhood("");
    setNewRecipientCity("");
    setNewRecipientState("");
    setNewRecipientPostalCode("");
    setNewRecipientAddressReference("");
    setRecipientAddressSearch("");
    setRecipientAddressSuggestions([]);
    setRecipientAddressSearching(false);
    setRecipientAddressValidation({ status: "idle", message: "" });
    setEditingRecipientId(null);
  }


  function fullAddress() {
    if (!contextMenu) {
      return "";
    }

    return [
      contextMenu.address.street,
      contextMenu.address.houseNumber,
      contextMenu.address.neighborhood,
      contextMenu.address.city,
      contextMenu.address.state,
      contextMenu.address.postalCode,
      contextMenu.address.country,
    ]
      .filter(Boolean)
      .join(", ");
  }

  return {
    scrollToStep,
    resetNewClientForm,
    resetNewRecipientForm,
    senderCatalogCountRef,
    fullAddress,
  };
}

export type VentaFoundation = ReturnType<typeof useVentaFoundation>;
