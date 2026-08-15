"use client";

import { useCallback, useEffect, useState } from "react";
import {
  updateCustomerAction,
  updateRecipientAction,
} from "@/app/actions/customers";
import {
  openExactEntranceBrowserWindow,
  SaleExactEntranceWindow,
  type ExactEntranceDraft,
  type MapAddressFields,
  type MapResolvedAddress,
} from "@/components/sale/sale-exact-entrance-step";
import type { Recipient, Sender } from "@/components/sale/venta/parts-types";
import {
  customerRowToSender,
  recipientRowToSaleRecipient,
} from "@/lib/customers/mappers";

export type SalePersonAddressMapTarget =
  | { kind: "sender"; person: Sender }
  | { kind: "recipient"; person: Recipient; senderId: string };

type SalePersonAddressMapProps = {
  onSaved: (
    target: SalePersonAddressMapTarget,
    person: Sender | Recipient,
  ) => void | Promise<void>;
};

function hasCoordinates(lat: number | null | undefined, lng: number | null | undefined) {
  return typeof lat === "number" && Number.isFinite(lat) &&
    typeof lng === "number" && Number.isFinite(lng);
}

function entranceFromPerson(person: Sender | Recipient): ExactEntranceDraft | null {
  if (!hasCoordinates(person.exactEntranceLat, person.exactEntranceLng)) {
    return null;
  }
  return {
    lat: person.exactEntranceLat!,
    lng: person.exactEntranceLng!,
    note: person.exactEntranceNote || "",
    panoId: person.exactEntrancePanoId || undefined,
    heading: person.exactEntranceHeading,
    pitch: person.exactEntrancePitch,
  };
}

function addressLocationFromPerson(person: Sender | Recipient) {
  return hasCoordinates(person.lat, person.lng)
    ? { lat: person.lat!, lng: person.lng! }
    : null;
}

function mapAddressFields(person: Sender | Recipient, addressReference: string): MapAddressFields {
  return {
    street: person.street || "",
    houseNumber: person.houseNumber || "",
    neighborhood: person.neighborhood || "",
    city: person.city || "",
    state: person.state || "",
    postalCode: person.postalCode || "",
    country: "country" in person ? person.country || "" : "USA",
    addressReference,
  };
}

function exactFields(draft: ExactEntranceDraft) {
  return {
    exactEntranceLat: draft.lat,
    exactEntranceLng: draft.lng,
    exactEntranceNote: draft.note,
    exactEntrancePanoId: draft.panoId || "",
    exactEntranceHeading: draft.heading ?? null,
    exactEntrancePitch: draft.pitch ?? null,
  };
}

export function useSalePersonAddressMap({ onSaved }: SalePersonAddressMapProps) {
  const [target, setTarget] = useState<SalePersonAddressMapTarget | null>(null);
  const [hostWindow, setHostWindow] = useState<Window | null>(null);
  const [resolvedAddress, setResolvedAddress] = useState<MapResolvedAddress | null>(null);
  const [addressReference, setAddressReference] = useState("");
  const [mapError, setMapError] = useState("");

  useEffect(() => () => {
    if (hostWindow && !hostWindow.closed) hostWindow.close();
  }, [hostWindow]);

  const openTarget = useCallback((nextTarget: SalePersonAddressMapTarget) => {
    if (hostWindow && !hostWindow.closed) hostWindow.close();
    const popup = openExactEntranceBrowserWindow();
    if (!popup) {
      setMapError("Chrome bloqueó la ventana del mapa. Permite ventanas emergentes para Boxario.");
      return;
    }
    setMapError("");
    setResolvedAddress(null);
    setAddressReference(nextTarget.person.addressReference || "");
    setTarget(nextTarget);
    setHostWindow(popup);
  }, [hostWindow]);

  const openSender = useCallback((sender: Sender) => {
    openTarget({ kind: "sender", person: sender });
  }, [openTarget]);

  const openRecipient = useCallback((recipient: Recipient, senderId: string) => {
    openTarget({ kind: "recipient", person: recipient, senderId });
  }, [openTarget]);

  const close = useCallback(() => {
    if (hostWindow && !hostWindow.closed) hostWindow.close();
    setTarget(null);
    setHostWindow(null);
    setResolvedAddress(null);
  }, [hostWindow]);

  const confirm = useCallback(async (draft: ExactEntranceDraft) => {
    if (!target) return;
    const person = target.person;
    const resolved = resolvedAddress;
    const address = {
      street: resolved?.street ?? person.street,
      houseNumber: resolved?.houseNumber ?? person.houseNumber,
      neighborhood: resolved?.neighborhood ?? person.neighborhood,
      city: resolved?.city ?? person.city,
      state: resolved?.state ?? person.state ?? "",
      postalCode: resolved?.postalCode ?? person.postalCode,
      addressReference,
      placeId: resolved?.placeId ?? person.placeId,
      formattedAddress: resolved?.formattedAddress ?? person.formattedAddress,
      addressVerified: resolved ? true : person.addressVerified,
      lat: resolved?.lat ?? person.lat,
      lng: resolved?.lng ?? person.lng,
    };
    const exact = exactFields(draft);

    if (
      (target.kind === "sender" && target.person.id.startsWith("local-")) ||
      (target.kind === "recipient" && target.person.id.startsWith("local-r-"))
    ) {
      const nextPerson = {
        ...person,
        ...address,
        ...exact,
        exactEntranceConfirmedAt: new Date().toISOString(),
      };
      await onSaved(target, nextPerson);
      return;
    }

    if (target.kind === "sender") {
      const result = await updateCustomerAction({
        customerId: person.id,
        firstName: person.firstName,
        lastName: person.lastName,
        phones: target.person.phones,
        email: person.email || person.emails[0] || "",
        emails: person.emails,
        street: address.street,
        houseNumber: address.houseNumber || "-",
        neighborhood: address.neighborhood || "-",
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        addressReference: address.addressReference,
        country: "USA",
        placeId: address.placeId,
        formattedAddress: address.formattedAddress,
        addressVerified: address.addressVerified,
        lat: address.lat,
        lng: address.lng,
        ...exact,
      });
      if (!result.ok) throw new Error(result.error);
      await onSaved(target, customerRowToSender(result.data));
      return;
    }

    const result = await updateRecipientAction({
      recipientId: person.id,
      firstName: person.firstName,
      lastName: person.lastName,
      phone: target.person.phone,
      email: person.email || person.emails[0] || "",
      emails: person.emails,
      country: target.person.country,
      street: address.street,
      houseNumber: address.houseNumber || "-",
      neighborhood: address.neighborhood || "-",
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      addressReference: address.addressReference,
      placeId: address.placeId,
      formattedAddress: address.formattedAddress,
      addressVerified: address.addressVerified,
      lat: address.lat,
      lng: address.lng,
      ...exact,
    });
    if (!result.ok) throw new Error(result.error);
    await onSaved(target, recipientRowToSaleRecipient(result.data));
  }, [addressReference, onSaved, resolvedAddress, target]);

  const addressMap = target && hostWindow ? (
    <SaleExactEntranceWindow
      open
      personLabel={`${target.person.firstName} ${target.person.lastName}`.trim()}
      country={target.kind === "recipient" ? target.person.country : "USA"}
      addressFields={mapAddressFields(target.person, addressReference)}
      addressLocation={addressLocationFromPerson(target.person)}
      initialEntrance={entranceFromPerson(target.person)}
      hostWindow={hostWindow}
      onClose={close}
      onAddressResolved={(address) => {
        setResolvedAddress(address);
        if (address.addressReference !== undefined) {
          setAddressReference(address.addressReference);
        }
      }}
      onAddressReferenceChange={setAddressReference}
      onConfirm={confirm}
    />
  ) : null;

  return {
    openSender,
    openRecipient,
    addressMap,
    mapError,
  };
}
