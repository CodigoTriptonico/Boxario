"use client";

import { SupabaseRequiredBanner } from "@/components/supabase-required-banner";
import { flowPersonListShellClass, flowPersonFormShellClass } from "@/components/flow-form-styles";
import { SaleClientForm } from "@/components/sale/sale-client-form";
import { SaleSenderList } from "@/components/sale/sale-sender-list";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { personFullName, senderPhoneKey } from "@/components/sale/venta-parts";
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
    setActiveStep,
    setCardStylePicker,
    setClientAddressSearch,
    setClientAddressSuggestions,
    setClientAddressValidation,
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
    setSenderQuery,
    startQuickEmptyBox,
    touchClientAddressField,
    updateClientEmail,
    updateClientPhone,
    viewLayout,
  } = controller;

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
            }}
          />
        ) : (
          <div
            className={`flex min-h-0 flex-1 flex-col overflow-hidden${customersLoading ? " pointer-events-none opacity-60 transition-opacity" : ""
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
              onQueryChange={setSenderQuery}
              onNewClient={() => {
                resetNewClientForm();
                setMode("new-client");
                setActiveStep("client");
              }}
              onChoose={chooseSender}
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
      </div>
    ) : null
  );
}
