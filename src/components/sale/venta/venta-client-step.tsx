"use client";

import { useCallback } from "react";
import { SupabaseRequiredBanner } from "@/components/supabase-required-banner";
import { flowPersonListShellClass, flowPersonFormShellClass } from "@/components/flow-form-styles";
import { SaleClientForm } from "@/components/sale/sale-client-form";
import { SaleSenderList } from "@/components/sale/sale-sender-list";
import {
  useSalePersonAddressMap,
  type SalePersonAddressMapTarget,
} from "@/components/sale/sale-person-address-map";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { personFullName, senderPhoneKey } from "@/components/sale/venta-parts";
import type { Sender } from "@/components/sale/venta/parts-types";
import type { VentaController } from "@/components/sale/venta/use-venta-controller";

export function VentaClientStep({ controller }: { controller: VentaController; }) {
  const {
    activeStep,
    addClientEmail,
    addClientPhone,
    chooseSender,
    clientAddressSearch,
    clientAddressSearching,
    clientAddressSuggestions,
    clientAddressValidation,
    clientRef,
    contextPersonClass,
    createClient,
    customersError,
    customersLoading,
    duplicateClient,
    editingCustomerId,
    filteredSenders,
    mode,
    newClientAddressReference,
    newClientCity,
    newClientEmails,
    newClientFirstName,
    newClientHouse,
    newClientLastName,
    newClientNeighborhood,
    newClientPhoneList,
    newClientPhones,
    newClientPostalCode,
    newClientState,
    newClientStreet,
    openContextMenu,
    removeClientEmail,
    removeClientPhone,
    resetNewClientForm,
    selectAddressSuggestion,
    selectedSender,
    senderCatalogCountRef,
    senderQuery,
    senderSortMode,
    setSenderSortMode,
    setActiveStep,
    setCardStylePicker,
    setClientAddressSearch,
    setClientAddressSuggestions,
    setClientAddressValidation,
    setHistoryDrawer,
    setMode,
    setNewClientAddressReference,
    setNewClientCity,
    setNewClientFirstName,
    setNewClientHouse,
    setNewClientLastName,
    setNewClientNeighborhood,
    setNewClientPostalCode,
    setNewClientState,
    setNewClientStreet,
    setSelectedSender,
    setSenderList,
    setSenderQuery,
    startQuickEmptyBox,
    touchClientAddressField,
    updateClientEmail,
    updateClientPhone,
    viewLayout,
  } = controller;

  const handleAddressMapSaved = useCallback((target: SalePersonAddressMapTarget, person: Sender | unknown) => {
    if (target.kind !== "sender") return;
    const nextSender = person as Sender;
    setSenderList((current) =>
      current.map((sender) => (sender.id === nextSender.id ? nextSender : sender)),
    );
    setSelectedSender((current) =>
      current?.id === nextSender.id ? nextSender : current,
    );
  }, [setSelectedSender, setSenderList]);
  const addressMap = useSalePersonAddressMap({ onSaved: handleAddressMapSaved });

  return (
    mode === "new-client" || !selectedSender || activeStep === "client" ? (
      <div
        ref={clientRef}
        className={mode === "new-client" ? flowPersonFormShellClass : flowPersonListShellClass}
      >
        {!isSupabaseConfigured() ? (
          <div className="mb-3">
            <SupabaseRequiredBanner detail="Los remitentes no se guardaran hasta configurar Supabase." />
          </div>
        ) : null}
        {customersError ? (
          <p className="mb-3 rounded-lg border border-rose-700 bg-rose-950/40 px-3 py-2 text-sm font-bold text-rose-200">
            {customersError}
          </p>
        ) : null}
        {mode === "new-client" ? (
          <SaleClientForm
            form={{
              firstName: newClientFirstName,
              lastName: newClientLastName,
              phones: newClientPhones,
              phoneList: newClientPhoneList,
              emails: newClientEmails,
              street: newClientStreet,
              house: newClientHouse,
              neighborhood: newClientNeighborhood,
              city: newClientCity,
              state: newClientState,
              postalCode: newClientPostalCode,
              addressReference: newClientAddressReference,
              setFirstName: setNewClientFirstName,
              setLastName: setNewClientLastName,
              setStreet: setNewClientStreet,
              setHouse: setNewClientHouse,
              setNeighborhood: setNewClientNeighborhood,
              setCity: setNewClientCity,
              setState: setNewClientState,
              setPostalCode: setNewClientPostalCode,
              setAddressReference: setNewClientAddressReference,
            }}
            address={{
              search: clientAddressSearch,
              suggestions: clientAddressSuggestions,
              searching: clientAddressSearching,
              validation: clientAddressValidation,
              setSearch: setClientAddressSearch,
              setSuggestions: setClientAddressSuggestions,
              setValidation: setClientAddressValidation,
              onSelectSuggestion: (suggestion) => selectAddressSuggestion("client", suggestion),
              touchField: touchClientAddressField,
            }}
            actions={{
              onCancel: () => {
                resetNewClientForm();
                setMode("sale");
              },
              onSubmit: createClient,
              onAddEmail: addClientEmail,
              onUpdateEmail: updateClientEmail,
              onRemoveEmail: removeClientEmail,
              onAddPhone: addClientPhone,
              onUpdatePhone: updateClientPhone,
              onRemovePhone: removeClientPhone,
            }}
            meta={{
              editingCustomerId,
              duplicateClient: duplicateClient ?? null,
              initialExactEntrance: (() => {
                const sender =
                  selectedSender?.id === editingCustomerId
                    ? selectedSender
                    : filteredSenders.find((item) => item.id === editingCustomerId);
                return sender?.exactEntranceLat != null && sender.exactEntranceLng != null
                  ? {
                      lat: sender.exactEntranceLat,
                      lng: sender.exactEntranceLng,
                      note: sender.exactEntranceNote,
                      panoId: sender.exactEntrancePanoId || undefined,
                      heading: sender.exactEntranceHeading,
                      pitch: sender.exactEntrancePitch,
                    }
                  : null;
              })(),
            }}
          />
        ) : (
          <div
            className={`flex min-h-0 flex-1 flex-col overflow-hidden${
              customersLoading && filteredSenders.length === 0
                ? " saturate-[0.8] transition-[filter]"
                : ""
            }`}
            aria-busy={customersLoading}
          >
            <SaleSenderList
              query={senderQuery}
              matchingSenders={filteredSenders}
              senders={filteredSenders}
              totalCount={
                // Catalog size is intentionally a non-rendering snapshot.
                // eslint-disable-next-line react-hooks/refs
                senderQuery.trim() ? senderCatalogCountRef.current : undefined
              }
              searchActive={Boolean(senderQuery.trim())}
              viewLayout={viewLayout}
              sortMode={senderSortMode}
              onSortModeChange={setSenderSortMode}
              onQueryChange={setSenderQuery}
              onNewClient={() => {
                resetNewClientForm();
                setMode("new-client");
                setActiveStep("client");
              }}
              onChoose={chooseSender}
              onAddressClick={addressMap.openSender}
              onJournalClick={(sender) => setHistoryDrawer({ sender, initialTab: "journal" })}
              onQuickEmptyBox={startQuickEmptyBox}
              onIconClick={(event, sender) => {
                const rect = event.currentTarget.getBoundingClientRect();
                setCardStylePicker({
                  kind: "sender",
                  cardStyle: sender.cardStyle,
                  sender,
                  x: rect.left,
                  y: rect.bottom + 8,
                });
              }}
              getCardClass={(sender) =>
                contextPersonClass(
                  "remitente",
                  `sender:${senderPhoneKey(sender)}`,
                  false,
                )
              }
              onOpenContextMenu={(event, sender) =>
                openContextMenu(
                  event,
                  personFullName(sender),
                  "remitente",
                  `sender:${senderPhoneKey(sender)}`,
                  sender.phones,
                  {
                    street: sender.street,
                    houseNumber: sender.houseNumber,
                    neighborhood: sender.neighborhood,
                    city: sender.city,
                    state: sender.state,
                    postalCode: sender.postalCode,
                    addressReference: sender.addressReference,
                    country: "USA",
                  },
                  sender.firstName,
                  sender.lastName,
                  sender.id.startsWith("local-") ? undefined : sender.id,
                )
              }
            />
          </div>
        )}
        {addressMap.mapError ? (
          <p role="alert" className="mt-2 rounded-lg border border-amber-600/70 bg-amber-950/30 px-3 py-2 text-xs font-bold text-amber-100">
            {addressMap.mapError}
          </p>
        ) : null}
        {addressMap.addressMap}
      </div>
    ) : null
  );
}
