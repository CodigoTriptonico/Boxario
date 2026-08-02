"use client";

import { useMemo } from "react";
import { useContextNav } from "@/hooks/use-context-nav";
import { saleFinishActionLabel } from "@/lib/invoice-billing";
import { FULL_BOX_DEFERRED_SUMMARY } from "@/lib/sale-logistics-modes";
import { personFullName, type SaleStepBarItem, saleSteps, senderPhonesLabel } from "@/components/sale/venta-parts";
import type { VentaCore } from "@/components/sale/venta/use-venta-core";
import type { VentaFoundation } from "@/components/sale/venta/use-venta-foundation";
import type { VentaData } from "@/components/sale/venta/use-venta-data";
import type { VentaFlow } from "@/components/sale/venta/use-venta-flow";
import type { VentaEffects } from "@/components/sale/venta/use-venta-effects";
import type { VentaForms } from "@/components/sale/venta/use-venta-forms";
import type { VentaSelection } from "@/components/sale/venta/use-venta-selection";
import type { VentaInvoices } from "@/components/sale/venta/use-venta-invoices";
import type { VentaContextActions } from "@/components/sale/venta/use-venta-context-actions";

type VentaNavigationContext = VentaCore & VentaFoundation & VentaData & VentaFlow & VentaEffects & VentaForms & VentaSelection & VentaInvoices & VentaContextActions;

export function useVentaNavigation(context: VentaNavigationContext) {
  const {
    activeStep,
    completedStepIndex,
    createdInvoice,
    currentDriverTaskCount,
    currentLogisticsDetails,
    editingCustomerId,
    editingRecipientId,
    emptyBoxComplete,
    emptyBoxRouteDecision,
    fullBoxMode,
    fullBoxRouteDecision,
    invoiceBillingForPayment,
    logisticsPlanReady,
    maxUnlockedStepIndex,
    mode,
    nextInvoiceNumber,
    quickEmptyBoxRouteDecision,
    resetNewClientForm,
    resetNewRecipientForm,
    routePlannerLeg,
    scrollToStep,
    selectedBox,
    selectedBoxCount,
    selectedBoxLines,
    selectedCartSummary,
    selectedRecipient,
    selectedSender,
    setActiveStep,
    setEditingFromFinish,
    setMode,
  } = context;

  const ventaNavTitle = useMemo(() => {
    if (mode === "new-client") {
      return editingCustomerId ? "Editar remitente" : "Nuevo remitente";
    }

    if (mode === "new-recipient") {
      return editingRecipientId ? "Editar destinatario" : "Nuevo destinatario";
    }

    if (mode === "history") {
      return "Historial";
    }

    return null;
  }, [editingCustomerId, editingRecipientId, mode]);

  function handleVentaNavBack() {
    if (mode === "new-client") {
      resetNewClientForm();
      setEditingFromFinish(false);
      setMode("sale");
      return;
    }

    if (mode === "new-recipient") {
      resetNewRecipientForm();
      setEditingFromFinish(false);
      setMode("sale");
      return;
    }

    if (mode === "history") {
      setMode("sale");
      return;
    }

    const activeStepIndex = saleSteps.findIndex((step) => step.id === activeStep);
    const previousStep = saleSteps[activeStepIndex - 1];

    if (previousStep) {
      setActiveStep(previousStep.id);
      scrollToStep(previousStep.id);
    }
  }

  useContextNav({
    title: ventaNavTitle ?? "Nueva venta",
    onBack: handleVentaNavBack,
    enabled: ventaNavTitle !== null || activeStep !== "client",
  });

  const saleStepBarItems = useMemo((): SaleStepBarItem[] => {
    return saleSteps.map((step, index) => {
      const isActive = activeStep === step.id;
      const isDone = index < completedStepIndex;
      const isUnlocked = index <= maxUnlockedStepIndex;

      const value =
        step.id === "client"
          ? selectedSender
            ? personFullName(selectedSender)
            : "Seleccionar"
          : step.id === "recipient"
            ? selectedRecipient
              ? personFullName(selectedRecipient)
              : "Seleccionar"
            : step.id === "box"
              ? selectedBoxLines.length
                ? selectedCartSummary
                : "Seleccionar"
              : step.id === "delivery"
                ? logisticsPlanReady
                  ? currentDriverTaskCount
                    ? `${currentDriverTaskCount} tarea chofer`
                    : fullBoxMode
                      ? "Sin chofer"
                      : FULL_BOX_DEFERRED_SUMMARY
                  : emptyBoxComplete
                    ? fullBoxMode
                      ? "Pendiente"
                      : FULL_BOX_DEFERRED_SUMMARY
                    : "Pendiente"
                : createdInvoice
                  ? "Listo"
                  : logisticsPlanReady
                    ? saleFinishActionLabel(invoiceBillingForPayment, { phase: "setup" })
                    : "Pendiente";

      const detail =
        step.id === "client"
          ? selectedSender
            ? senderPhonesLabel(selectedSender)
            : ""
          : step.id === "recipient"
            ? selectedRecipient
              ? selectedRecipient.phone.trim()
              : ""
            : step.id === "box"
              ? selectedBoxLines.length
                ? `${selectedBoxCount} producto${selectedBoxCount === 1 ? "" : "s"}`
                : ""
              : step.id === "delivery"
                ? logisticsPlanReady || emptyBoxComplete
                  ? undefined
                  : "Logistica"
                : createdInvoice
                  ? createdInvoice.invoiceNumber
                  : logisticsPlanReady
                    ? nextInvoiceNumber
                    : "";

      const country =
        step.id === "client" && selectedSender
          ? "USA"
          : step.id === "recipient" && selectedRecipient
            ? selectedRecipient.country
            : "";

      const subtitle =
        step.id === "box" && selectedBoxLines.length
          ? selectedBoxLines.length === 1
            ? selectedBox?.[4] || ""
            : "Carrito mixto"
          : "";

      return {
        id: step.id,
        label: step.label,
        compactLabel: step.compactLabel,
        value,
        subtitle: subtitle || undefined,
        detail: detail || undefined,
        detailRows:
          step.id === "delivery" && (logisticsPlanReady || emptyBoxComplete)
            ? currentLogisticsDetails
            : undefined,
        country: country || undefined,
        isActive,
        isDone,
        isUnlocked,
        index,
      };
    });
  }, [
    activeStep,
    completedStepIndex,
    maxUnlockedStepIndex,
    selectedSender,
    selectedRecipient,
    selectedBox,
    selectedBoxLines,
    selectedBoxCount,
    selectedCartSummary,
    createdInvoice,
    logisticsPlanReady,
    emptyBoxComplete,
    fullBoxMode,
    currentDriverTaskCount,
    currentLogisticsDetails,
    nextInvoiceNumber,
    invoiceBillingForPayment,
  ]);

  const boundedPersonListLayout =
    (mode === "clients" ||
      mode === "sale" ||
      mode === "new-client" ||
      mode === "new-recipient") &&
    (activeStep === "client" ||
      activeStep === "recipient" ||
      mode === "new-client" ||
      mode === "new-recipient");

  const routePlannerDecision =
    routePlannerLeg === "emptyBox"
      ? emptyBoxRouteDecision
      : routePlannerLeg === "fullBox"
        ? fullBoxRouteDecision
        : quickEmptyBoxRouteDecision;
  const routePlannerTaskLabel =
    routePlannerLeg === "fullBox" ? "Recoger caja llena" : "Dejar caja vacía";

  return {
    saleStepBarItems,
    boundedPersonListLayout,
    routePlannerDecision,
    routePlannerTaskLabel,
  };
}
