"use client";

import { ChevronRight, Plus, Search } from "lucide-react";
import Link from "next/link";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui-blocks";
import { flowStepBodyClass, flowPersonListShellClass, flowPersonFormShellClass, flowPersonListSectionClass, flowPersonFormSectionClass, flowPersonToolbarSearchShellClass } from "@/components/flow-form-styles";
import { InlineSearchCombobox } from "@/components/inline-search-picker";
import { SaleRecipientForm } from "@/components/sale/sale-recipient-form";
import { SaleBoxPicker } from "@/components/sale/sale-box-picker";
import { SaleRecipientList } from "@/components/sale/sale-recipient-list";
import { SalePersonListSortControl } from "@/components/sale/sale-person-list-sort-control";
import { SalePersonListToolbar } from "@/components/sale/sale-person-list-toolbar";
import { configPricesCountryHref } from "@/lib/country-options";
import { inventarioHrefWithReturn } from "@/lib/inventario-return";
import { ONBOARDING_TARGETS } from "@/lib/onboarding/coach-targets";
import { CountryName } from "@/components/country-flag";
import { boxCardClass, personFullName, recipientIdentityKey } from "@/components/sale/venta-parts";
import { resolveCountryPromotions, saleCartLineId } from "@/components/sale/venta/shared";
import type { VentaController } from "@/components/sale/venta/use-venta-controller";
import { SALE_RECIPIENT_SORT_OPTIONS } from "@/lib/sale-person-list-sort";

export function VentaRecipientBoxSteps({ controller }: { controller: VentaController; }) {
  const {
    activeSender,
    activeStep,
    addRecipientEmail,
    boxesForCountry,
    boxStockByKey,
    boxesRef,
    chooseBox,
    chooseRecipient,
    contextCardClass,
    contextPersonClass,
    continueFromCart,
    countries,
    countryPromotions,
    createRecipient,
    duplicateRecipient,
    editingRecipientId,
    mode,
    newRecipientAddressReference,
    newRecipientCity,
    newRecipientCountry,
    newRecipientEmails,
    newRecipientFirstName,
    newRecipientHouse,
    newRecipientLastName,
    newRecipientNeighborhood,
    newRecipientPhone,
    newRecipientPostalCode,
    newRecipientState,
    newRecipientStreet,
    openContextMenu,
    openRecipientShipmentHistory,
    recipientAddressSearch,
    recipientAddressSearching,
    recipientAddressSuggestions,
    recipientAddressValidation,
    recipientQuery,
    recipientSearchOptions,
    recipientsRef,
    removeBoxFromCart,
    removeRecipientEmail,
    resetNewRecipientForm,
    selectAddressSuggestion,
    selectedBoxCount,
    selectedBoxLines,
    selectedRecipient,
    selectedSender,
    setCardStylePicker,
    setMode,
    setNewRecipientAddressReference,
    setNewRecipientCity,
    setNewRecipientCountry,
    setNewRecipientFirstName,
    setNewRecipientHouse,
    setNewRecipientLastName,
    setNewRecipientNeighborhood,
    setNewRecipientPhone,
    setNewRecipientPostalCode,
    setNewRecipientState,
    setNewRecipientStreet,
    setRecipientAddressSearch,
    setRecipientAddressSuggestions,
    setRecipientAddressValidation,
    setRecipientQuery,
    recipientSortMode,
    setRecipientSortMode,
    sortedFilteredRecipients,
    startRecipientCreation,
    stepShellClass,
    suggestedRecipientId,
    touchRecipientAddressField,
    updateRecipientEmail,
    viewLayout,
  } = controller;

  return (
    selectedSender &&
      (mode === "clients" || mode === "sale" || mode === "new-recipient") &&
      (activeStep === "recipient" ||
        activeStep === "box" ||
        mode === "new-recipient") ? (
      <div
        ref={recipientsRef}
        className={
          activeStep === "recipient" || mode === "new-recipient"
            ? mode === "new-recipient"
              ? flowPersonFormShellClass
              : flowPersonListShellClass
            : `${flowPersonListShellClass} !overflow-visible lg:!overflow-hidden`
        }
      >
        {activeStep === "recipient" || mode === "new-recipient" ? (
          <div
            className={
              mode === "new-recipient" ? flowPersonFormSectionClass : flowPersonListSectionClass
            }
          >
            {mode !== "new-recipient" ? (
              <SalePersonListToolbar
                createIcon={<Plus className="h-4 w-4" />}
                createLabel="Nuevo destinatario"
                createShortLabel="Nuevo"
                createOnboardingTarget={ONBOARDING_TARGETS.VENTA_NEW_RECIPIENT}
                onCreate={startRecipientCreation}
                sortControl={
                  <SalePersonListSortControl
                    value={recipientSortMode}
                    options={SALE_RECIPIENT_SORT_OPTIONS}
                    onChange={setRecipientSortMode}
                    ariaLabel="Ordenar destinatarios"
                  />
                }
                search={
                  <InlineSearchCombobox
                    value={recipientQuery}
                    onChange={setRecipientQuery}
                    options={recipientSearchOptions}
                    placeholder="Buscar"
                    emptyLabel="Sin destinatarios"
                    ariaLabel="Buscar destinatarios"
                    leadingIcon={<Search className="h-4 w-4" aria-hidden />}
                    className="w-full"
                    minWidthClass="min-w-0 w-full"
                    persistent
                    shellClassName={flowPersonToolbarSearchShellClass}
                    onSelectOption={(option) => {
                      if (!activeSender) {
                        return;
                      }

                      const recipient = activeSender.recipients.find(
                        (entry) => recipientIdentityKey(entry) === option.value,
                      );

                      if (recipient) {
                        setRecipientQuery(personFullName(recipient));
                        chooseRecipient(recipient);
                      }
                    }}
                  />
                }
              />
            ) : null}

            {mode === "new-recipient" ? (
              <SaleRecipientForm
                form={{
                  firstName: newRecipientFirstName,
                  lastName: newRecipientLastName,
                  phone: newRecipientPhone,
                  emails: newRecipientEmails,
                  country: newRecipientCountry,
                  street: newRecipientStreet,
                  house: newRecipientHouse,
                  neighborhood: newRecipientNeighborhood,
                  city: newRecipientCity,
                  state: newRecipientState,
                  postalCode: newRecipientPostalCode,
                  addressReference: newRecipientAddressReference,
                  setFirstName: setNewRecipientFirstName,
                  setLastName: setNewRecipientLastName,
                  setPhone: setNewRecipientPhone,
                  setCountry: setNewRecipientCountry,
                  setStreet: setNewRecipientStreet,
                  setHouse: setNewRecipientHouse,
                  setNeighborhood: setNewRecipientNeighborhood,
                  setCity: setNewRecipientCity,
                  setState: setNewRecipientState,
                  setPostalCode: setNewRecipientPostalCode,
                  setAddressReference: setNewRecipientAddressReference,
                }}
                address={{
                  search: recipientAddressSearch,
                  suggestions: recipientAddressSuggestions,
                  searching: recipientAddressSearching,
                  validation: recipientAddressValidation,
                  setSearch: setRecipientAddressSearch,
                  setSuggestions: setRecipientAddressSuggestions,
                  setValidation: setRecipientAddressValidation,
                  onSelectSuggestion: (suggestion) => selectAddressSuggestion("recipient", suggestion),
                  touchField: touchRecipientAddressField,
                }}
                actions={{
                  onCancel: () => {
                    resetNewRecipientForm();
                    setMode("sale");
                  },
                  onSubmit: createRecipient,
                  onAddEmail: addRecipientEmail,
                  onUpdateEmail: updateRecipientEmail,
                  onRemoveEmail: removeRecipientEmail,
                }}
                  meta={{
                    countries,
                    duplicateRecipient: duplicateRecipient ?? null,
                    initialExactEntrance: (() => {
                      const recipient = activeSender?.recipients.find(
                        (item) => item.id === editingRecipientId,
                      );
                      return recipient?.exactEntranceLat != null &&
                        recipient.exactEntranceLng != null
                        ? {
                            lat: recipient.exactEntranceLat,
                            lng: recipient.exactEntranceLng,
                            note: recipient.exactEntranceNote,
                            panoId: recipient.exactEntrancePanoId || undefined,
                            heading: recipient.exactEntranceHeading,
                            pitch: recipient.exactEntrancePitch,
                          }
                        : null;
                    })(),
                  }}
              />
            ) : (
              <SaleRecipientList
                recipients={sortedFilteredRecipients}
                viewLayout={viewLayout}
                suggestedRecipientId={suggestedRecipientId}
                searchActive={Boolean(recipientQuery.trim())}
                onChoose={chooseRecipient}
                onViewShipmentHistory={openRecipientShipmentHistory}
                onIconClick={(event, recipient) => {
                  const rect = event.currentTarget.getBoundingClientRect();
                  setCardStylePicker({
                    kind: "recipient",
                    cardStyle: recipient.cardStyle,
                    recipient,
                    x: rect.left,
                    y: rect.bottom + 8,
                  });
                }}
                getCardClass={(recipient) =>
                  contextPersonClass(
                    "destinatario",
                    `recipient:${recipientIdentityKey(recipient)}`,
                    Boolean(
                      selectedRecipient &&
                      recipientIdentityKey(selectedRecipient) === recipientIdentityKey(recipient),
                    ),
                    selectedRecipient !== null,
                  )
                }
                onOpenContextMenu={(event, recipient) =>
                  openContextMenu(
                    event,
                    personFullName(recipient),
                    "destinatario",
                    `recipient:${recipientIdentityKey(recipient)}`,
                    [recipient.phone],
                    {
                      street: recipient.street,
                      houseNumber: recipient.houseNumber,
                      neighborhood: recipient.neighborhood,
                      city: recipient.city,
                      state: recipient.state,
                      postalCode: recipient.postalCode,
                      addressReference: recipient.addressReference,
                      country: recipient.country,
                    },
                    recipient.firstName,
                    recipient.lastName,
                    undefined,
                    recipient.id.startsWith("local-r-") ? undefined : recipient.id,
                  )
                }
              />
            )}
          </div>
        ) : null}

        {selectedRecipient && activeStep === "box" ? (
          <div
            ref={boxesRef}
            className={`flex min-h-0 flex-1 flex-col ${stepShellClass("box")}`}
          >
            <div className={`${flowStepBodyClass} flex min-h-0 flex-1 flex-col !space-y-0`}>
              {!selectedRecipient ? (
                <p className="text-center text-xl font-black text-slate-400">
                  Selecciona un destinatario.
                </p>
              ) : boxesForCountry.length === 0 ? (
                <section className="rounded-xl border border-dashed border-slate-600/60 p-8">
                  <div className="mx-auto flex max-w-xl flex-col items-center text-center">
                    <Link
                      href={configPricesCountryHref(selectedRecipient.country)}
                      className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-emerald-400/70 bg-emerald-400/15 text-emerald-300 shadow-[0_12px_28px_rgba(16,185,129,0.18)] transition hover:scale-[1.02] hover:bg-emerald-400/25"
                      aria-label={`Configurar productos para ${selectedRecipient.country}`}
                    >
                      <Plus className="h-10 w-10" strokeWidth={2.5} />
                    </Link>
                    <h3 className="mt-5 text-xl font-black text-[#f8fafc]">
                      Aún no hay productos para{" "}
                      <CountryName
                        name={selectedRecipient.country}
                        size="sm"
                        labelClassName="font-black"
                      />
                      .
                    </h3>
                    <p className="mt-2 text-sm font-bold text-slate-400">
                      Configura ítems para este país o créalos primero en Inventario.
                    </p>
                    <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
                      <Link
                        href={configPricesCountryHref(selectedRecipient.country)}
                        className={primaryButtonClass}
                      >
                        <Plus className="h-4 w-4" />
                        Agregar ítems
                      </Link>
                      <Link
                        href={inventarioHrefWithReturn(
                          configPricesCountryHref(selectedRecipient.country),
                        )}
                        className={secondaryButtonClass}
                      >
                        Ir a Inventario
                      </Link>
                    </div>
                  </div>
                </section>
              ) : (
                <>
                  <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                    <SaleBoxPicker
                      boxes={boxesForCountry}
                      viewLayout={viewLayout}
                      boxStockByKey={boxStockByKey}
                      getCartQuantity={(box) => {
                        const cartLine = selectedBoxLines.find(
                          (line) => line.id === saleCartLineId(box),
                        );
                        return cartLine?.quantity ?? null;
                      }}
                      getPromoCount={(box) =>
                        selectedRecipient
                          ? resolveCountryPromotions(
                            countryPromotions,
                            selectedRecipient.country,
                            box,
                          ).length
                          : 0
                      }
                      getCardClass={(box, selected) =>
                        contextCardClass(
                          "caja",
                          `box:${box[0]}`,
                          selected,
                          boxCardClass,
                          selectedBoxLines.length > 0,
                        )
                      }
                      onChoose={chooseBox}
                      onRemove={removeBoxFromCart}
                      firstBoxCoachTarget={ONBOARDING_TARGETS.VENTA_SELECT_PRODUCT}
                    />
                  </div>
                  <div className="flex shrink-0 justify-center border-t border-black/80 pt-4">
                    <div className="flex w-full max-w-md flex-col items-center gap-2">
                      <button
                        type="button"
                        disabled={selectedBoxCount < 1}
                        onClick={continueFromCart}
                        className={`${primaryButtonClass} flex h-12 w-full items-center justify-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-35`}
                      >
                        Siguiente
                        <ChevronRight className="h-4 w-4" aria-hidden />
                      </button>
                      {selectedBoxCount < 1 ? (
                        <p className="text-center text-xs font-bold text-slate-500">
                          Clic izquierdo en una caja para agregar &middot; clic derecho para quitar.
                        </p>
                      ) : null}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        ) : null}
      </div>
    ) : null
  );
}
