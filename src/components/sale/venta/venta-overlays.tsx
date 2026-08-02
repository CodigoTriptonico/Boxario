"use client";

import { ActionConfirmDialog } from "@/components/action-confirm-dialog";
import { SaleContextMenu } from "@/components/sale/sale-context-menu";
import { SaleCustomerHistoryDrawer } from "@/components/sale/sale-customer-history-drawer";
import { SaleQuickEmptyBoxModal } from "@/components/sale/sale-quick-empty-box-modal";
import { SaleQuickCheckoutModal } from "@/components/sale/sale-quick-checkout-modal";
import { SaleQuickCountryPicker } from "@/components/sale/sale-quick-country-picker";
import { SaleInvoiceConfirmDialog } from "@/components/sale/sale-invoice-confirm-dialog";
import { SaleDocumentPartyEditDialog } from "@/components/sale/sale-document-party-edit-dialog";
import { SaleClientForm } from "@/components/sale/sale-client-form";
import { SaleRecipientForm } from "@/components/sale/sale-recipient-form";
import { LogisticsTaskScheduleConfirmPanel } from "@/components/logistica/logistics-task-schedule-confirm-panel";
import type { SalePersonCardVariantId } from "@/components/sale/sale-person-card-variants";
import { SalePersonStylePicker } from "@/components/sale/sale-person-style-picker";
import { configPricesCountryHref } from "@/lib/country-options";
import { saleFinishActionLabel } from "@/lib/invoice-billing";
import { parseMoneyValue } from "@/lib/logistics-fees";
import { EMPTY_BOX_DRIVER_MODE } from "@/lib/sale-logistics-modes";
import { SALE_PAYMENT_UNSET } from "@/lib/sale-payment-choice";
import { personFullName } from "@/components/sale/venta-parts";
import { resolveCountryPromotions } from "@/components/sale/venta/shared";
import type { VentaController } from "@/components/sale/venta/use-venta-controller";

export function VentaOverlays({ controller }: { controller: VentaController; }) {
  const {
    activeCopyGroup,
    addClientEmail,
    addClientPhone,
    addRecipientEmail,
    addReferralClient,
    cardStylePicker,
    clientAddressSearch,
    clientAddressSearching,
    clientAddressSuggestions,
    clientAddressValidation,
    closeDocumentPartyEdit,
    closeQuickCheckout,
    closeQuickSaleCountryFlow,
    confirmDeletePerson,
    confirmQuickEmptyBoxCharge,
    confirmSalePendingDay,
    confirmSalePendingRoute,
    confirmSalePreferredRoute,
    confirmSaleRoute,
    contextMenu,
    copyGroups,
    copyValue,
    countries,
    countryPromotions,
    createClient,
    createOpenInvoice,
    createRecipient,
    createdInvoice,
    creatingOpenInvoice,
    creatingQuickInvoice,
    defaultRecipientCardStyle,
    defaultSenderCardStyle,
    deleteConfirm,
    deleteConfirming,
    documentEditKind,
    duplicateClient,
    duplicateRecipient,
    editContextTarget,
    editingCustomerId,
    editingRecipientId,
    finishQuickCheckoutNewSale,
    fullAddress,
    historyDrawer,
    invoiceBilling,
    invoiceBillingForPayment,
    invoiceConfirmOpen,
    invoicePaymentMethod,
    invoicePaymentNote,
    logisticsFees,
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
    nextInvoiceNumber,
    openCustomerHistoryFromMenu,
    openRoutePlanner,
    organizationBranding,
    proceedQuickEmptyBox,
    quickCheckoutCompleted,
    quickEmptyBoxAdditionalCharge,
    quickEmptyBoxRouteDecision,
    quickInvoiceBilling,
    quickInvoiceBillingForPayment,
    quickInvoiceNumber,
    quickPayNowDraft,
    quickPayNowDraftTouched,
    quickPaymentMethod,
    quickPaymentNote,
    quickSaleBoxCatalog,
    quickSaleCountries,
    quickSaleCountry,
    quickSaleCountryPickerOpen,
    quickSaleDraft,
    quickSaleSender,
    quickSelectedPromotionId,
    quickTrackingToken,
    recipientAddressSearch,
    recipientAddressSearching,
    recipientAddressSuggestions,
    recipientAddressValidation,
    recipientCountryGateOpen,
    removeClientEmail,
    removeClientPhone,
    removeRecipientEmail,
    requestDeleteFromContextMenu,
    resolveContextSender,
    routeCatalog,
    routePlannerDecision,
    routePlannerLeg,
    routePlannerTaskLabel,
    router,
    saveRecipientCardStyle,
    saveSenderCardStyle,
    selectAddressSuggestion,
    selectedSender,
    setActiveCopyGroup,
    setCardStylePicker,
    setClientAddressSearch,
    setClientAddressSuggestions,
    setClientAddressValidation,
    setContextMenu,
    setDeleteConfirm,
    setHistoryDrawer,
    setInvoiceConfirmOpen,
    setInvoicePaymentMethod,
    setInvoicePaymentNote,
    setNewClientAddressReference,
    setNewClientCity,
    setNewClientFirstName,
    setNewClientHouse,
    setNewClientLastName,
    setNewClientNeighborhood,
    setNewClientPostalCode,
    setNewClientState,
    setNewClientStreet,
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
    setQuickEmptyBoxAdditionalCharge,
    setQuickEmptyBoxRouteDecision,
    setQuickPayNowDraft,
    setQuickPayNowDraftTouched,
    setQuickPaymentMethod,
    setQuickPaymentNote,
    setQuickSaleCountry,
    setQuickSaleCountryPickerOpen,
    setQuickSelectedPromotionId,
    setRecipientAddressSearch,
    setRecipientAddressSuggestions,
    setRecipientAddressValidation,
    setRecipientCountryGateOpen,
    setRoutePlannerLeg,
    showQuickCheckout,
    startQuickEmptyBox,
    stockMessage,
    touchClientAddressField,
    touchRecipientAddressField,
    updateClientEmail,
    updateClientPhone,
    updateRecipientEmail,
  } = controller;

  return (
    <>
      {contextMenu ? (
        <SaleContextMenu
          menu={contextMenu}
          activeCopyGroup={activeCopyGroup}
          copyGroups={copyGroups}
          onActiveCopyGroupChange={setActiveCopyGroup}
          onEdit={editContextTarget}
          onCopyValue={(value) => {
            if (value !== undefined) {
              copyValue(value);
              return;
            }

            copyValue(
              [contextMenu.title, ...contextMenu.phones, fullAddress()].filter(Boolean).join("\n"),
            );
          }}
          onAddReferral={
            contextMenu.type === "remitente"
              ? () => {
                const sender = resolveContextSender();
                if (!sender) {
                  return;
                }

                addReferralClient(sender);
                setContextMenu(null);
                setActiveCopyGroup(null);
              }
              : undefined
          }
          onViewHistory={openCustomerHistoryFromMenu}
          onDelete={
            contextMenu.type === "remitente" || contextMenu.type === "destinatario"
              ? requestDeleteFromContextMenu
              : undefined
          }
          onQuickEmptyBox={
            contextMenu.type === "remitente"
              ? () => {
                const sender = resolveContextSender();
                if (!sender) {
                  return;
                }

                startQuickEmptyBox(sender);
              }
              : undefined
          }
        />
      ) : null}

      <SaleDocumentPartyEditDialog
        open={documentEditKind === "sender"}
        title={editingCustomerId ? "Editar remitente" : "Nuevo remitente"}
        subtitle={
          createdInvoice
            ? `Factura ${createdInvoice.invoiceNumber}`
            : personFullName({
              firstName: newClientFirstName,
              lastName: newClientLastName,
            }) || undefined
        }
        onClose={closeDocumentPartyEdit}
      >
        <SaleClientForm
          layout="stack"
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
            onCancel: closeDocumentPartyEdit,
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
      </SaleDocumentPartyEditDialog>

      <SaleDocumentPartyEditDialog
        open={documentEditKind === "recipient"}
        title={editingRecipientId ? "Editar destinatario" : "Nuevo destinatario"}
        subtitle={
          createdInvoice
            ? `Factura ${createdInvoice.invoiceNumber}`
            : personFullName({
              firstName: newRecipientFirstName,
              lastName: newRecipientLastName,
            }) || undefined
        }
        onClose={closeDocumentPartyEdit}
      >
        <SaleRecipientForm
          layout="stack"
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
            onSelectSuggestion: (suggestion) =>
              selectAddressSuggestion("recipient", suggestion),
            touchField: touchRecipientAddressField,
          }}
          actions={{
            onCancel: closeDocumentPartyEdit,
            onSubmit: createRecipient,
            onAddEmail: addRecipientEmail,
            onUpdateEmail: updateRecipientEmail,
            onRemoveEmail: removeRecipientEmail,
          }}
          meta={{
            countries,
            duplicateRecipient: duplicateRecipient ?? null,
          }}
        />
      </SaleDocumentPartyEditDialog>

      {deleteConfirm ? (
        <ActionConfirmDialog
          open
          dialogId={
            deleteConfirm.kind === "remitente"
              ? "delete-sender-confirm"
              : "delete-recipient-confirm"
          }
          title={
            deleteConfirm.kind === "remitente"
              ? "Eliminar remitente"
              : "Eliminar destinatario"
          }
          message={
            deleteConfirm.kind === "remitente"
              ? `¿Eliminar a ${deleteConfirm.title}? Dejara de aparecer en ventas y el cambio quedara registrado en el historial.`
              : `¿Eliminar a ${deleteConfirm.title}? El cambio quedara registrado en el historial.`
          }
          confirmLabel="Eliminar"
          cancelLabel="Cancelar"
          tone="danger"
          confirming={deleteConfirming}
          onCancel={() => {
            if (!deleteConfirming) {
              setDeleteConfirm(null);
            }
          }}
          onConfirm={() => void confirmDeletePerson()}
        />
      ) : null}

      <ActionConfirmDialog
        open={recipientCountryGateOpen}
        dialogId="recipient-country-required"
        title="Primero configura un país"
        message="Cada destinatario debe quedar vinculado a un país destino. Crea el primero antes de registrarlo."
        confirmLabel="Crea un país primero"
        cancelLabel="Volver"
        tone="warning"
        onCancel={() => setRecipientCountryGateOpen(false)}
        onConfirm={() => {
          setRecipientCountryGateOpen(false);
          router.push(configPricesCountryHref());
        }}
      />

      {historyDrawer ? (
        <SaleCustomerHistoryDrawer
          open
          sender={historyDrawer.sender}
          recipientId={historyDrawer.recipientId}
          recipientName={historyDrawer.recipientName}
          onClose={() => setHistoryDrawer(null)}
        />
      ) : null}

      {quickSaleCountryPickerOpen && quickSaleSender ? (
        <SaleQuickCountryPicker
          sender={quickSaleSender}
          countries={quickSaleCountries}
          onClose={closeQuickSaleCountryFlow}
          onSelect={(country) => {
            setQuickSaleCountry(country);
            setQuickSaleCountryPickerOpen(false);
          }}
        />
      ) : null}

      {quickSaleSender && quickSaleCountry && quickSaleBoxCatalog && !quickSaleCountryPickerOpen ? (
        <SaleQuickEmptyBoxModal
          sender={quickSaleSender}
          country={quickSaleBoxCatalog.country}
          boxes={quickSaleBoxCatalog.boxes}
          promotions={resolveCountryPromotions(
            countryPromotions,
            quickSaleBoxCatalog.country,
          )}
          minimumDeposit={logisticsFees.minimumDeposit}
          routeDecision={quickEmptyBoxRouteDecision}
          onClose={closeQuickSaleCountryFlow}
          onClearRoute={() => setQuickEmptyBoxRouteDecision(null)}
          onRequestRoute={() => void openRoutePlanner("quickEmptyBox")}
          onProceed={(draft) => void proceedQuickEmptyBox(draft)}
        />
      ) : null}

      {showQuickCheckout && quickSaleDraft ? (
        <SaleQuickCheckoutModal
          branding={organizationBranding}
          invoiceNumber={quickInvoiceNumber}
          trackingToken={quickTrackingToken}
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
            setQuickPaymentMethod(nextValue && Number(nextValue) > 0
              ? SALE_PAYMENT_UNSET
              : "pending");
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
          onClose={closeQuickCheckout}
          onPrint={() => window.print()}
          onConfirmCharge={() => confirmQuickEmptyBoxCharge()}
          onStartNewSale={() => void finishQuickCheckoutNewSale()}
          confirming={creatingQuickInvoice}
          logisticsCharge={
            quickSaleDraft.emptyBoxMode === EMPTY_BOX_DRIVER_MODE
              ? quickEmptyBoxAdditionalCharge
              : null
          }
          logisticsChargeSuggestion={logisticsFees.emptyBoxDeliveryFee}
          onLogisticsChargeChange={setQuickEmptyBoxAdditionalCharge}
        />
      ) : null}

      {routePlannerLeg && routeCatalog ? (
        <LogisticsTaskScheduleConfirmPanel
          key={`${routePlannerLeg}:${routePlannerDecision?.routeDate || "new"}`}
          open
          shipmentCode={nextInvoiceNumber}
          customerName={
            routePlannerLeg === "quickEmptyBox" && quickSaleSender
              ? personFullName(quickSaleSender)
              : selectedSender
                ? personFullName(selectedSender)
                : "Nueva venta"
          }
          taskTypeLabel={routePlannerTaskLabel}
          scheduledAt={
            routePlannerDecision?.kind === "selected"
              ? routePlannerDecision.scheduledAt
              : null
          }
          pendingRouteDate={
            routePlannerDecision?.kind === "pending"
              ? routePlannerDecision.routeDate
              : null
          }
          templates={routeCatalog.templates}
          scheduleSuggestionsByWeekday={
            routePlannerLeg === "fullBox"
              ? routeCatalog.scheduleSuggestionsByWeekday?.pickup
              : routeCatalog.scheduleSuggestionsByWeekday?.delivery
          }
          enabledDays={routeCatalog.enabledDays}
          defaultDriverByWeekday={routeCatalog.defaultDriverByWeekday}
          weekdayScheduleByWeekday={routeCatalog.weekdayScheduleByWeekday}
          routeMembers={[]}
          title={routePlannerLeg === "fullBox" ? "Aceptar recolección" : "Aceptar entrega"}
          confirmLabel="Aceptar"
          selectionOrder="date-first"
          showDriverPicker={false}
          allowPendingDay={routePlannerLeg === "fullBox"}
          pendingDayLabel="No sé el día"
          allowPendingRoute={
            routePlannerLeg === "fullBox" ||
            routePlannerLeg === "emptyBox" ||
            routePlannerLeg === "quickEmptyBox"
          }
          pendingRouteLabel="No sé la ruta"
          requireExplicitRouteSelection
          onCancel={() => setRoutePlannerLeg(null)}
          onConfirm={(input) => confirmSaleRoute(input)}
          onConfirmPendingDay={
            routePlannerLeg === "fullBox" ? confirmSalePendingDay : undefined
          }
          onConfirmPendingRoute={confirmSalePendingRoute}
          onConfirmPreferredRoute={
            routePlannerLeg === "fullBox" ? confirmSalePreferredRoute : undefined
          }
        />
      ) : null}

      <SaleInvoiceConfirmDialog
        open={invoiceConfirmOpen}
        title={
          invoiceBilling && parseMoneyValue(invoiceBilling.payNow) > 0
            ? "Configurar pago"
            : "Confirmar invoice"
        }
        invoiceLabel={`Factura ${nextInvoiceNumber}`}
        lines={
          invoiceBilling
            ? parseMoneyValue(invoiceBilling.payNow) > 0
              ? [
                { label: "Total", value: invoiceBilling.quotedTotal },
                { label: "Abono", value: `−${invoiceBilling.payNow}` },
                { label: "Saldo pendiente", value: invoiceBilling.balanceDue },
              ]
              : [{ label: "Debe", value: invoiceBilling.balanceDue }]
            : []
        }
        paymentAmount={invoiceBilling?.payNow || "$0"}
        confirmLabel={saleFinishActionLabel(invoiceBillingForPayment)}
        confirming={creatingOpenInvoice}
        errorMessage={stockMessage}
        paymentMethod={invoicePaymentMethod}
        paymentNote={invoicePaymentNote}
        onPaymentMethodChange={setInvoicePaymentMethod}
        onPaymentNoteChange={setInvoicePaymentNote}
        onCancel={() => {
          if (!creatingOpenInvoice) {
            setInvoiceConfirmOpen(false);
          }
        }}
        onConfirm={() => void createOpenInvoice()}
      />

      {cardStylePicker ? (
        <SalePersonStylePicker
          x={cardStylePicker.x}
          y={cardStylePicker.y}
          currentStyle={
            (cardStylePicker.cardStyle as SalePersonCardVariantId) ||
            (cardStylePicker.kind === "sender"
              ? defaultSenderCardStyle
              : defaultRecipientCardStyle)
          }
          onSelect={(styleId) => {
            if (cardStylePicker.kind === "sender" && cardStylePicker.sender) {
              void saveSenderCardStyle(cardStylePicker.sender, styleId);
              return;
            }

            if (cardStylePicker.kind === "recipient" && cardStylePicker.recipient) {
              void saveRecipientCardStyle(cardStylePicker.recipient, styleId);
            }
          }}
          onClose={() => setCardStylePicker(null)}
        />
      ) : null}
    </>
  );
}
