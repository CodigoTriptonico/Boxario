"use client";

import { createElement, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import { useContextNav } from "@/hooks/use-context-nav";
import { useSetShellConfig } from "@/components/app-frame";
import { FULL_BOX_DEFERRED_SUMMARY } from "@/lib/sale-logistics-modes";
import { personFullName, type SaleStep, type SaleStepBarItem, saleSteps, quickSaleSteps, senderPhonesLabel } from "@/components/sale/venta-parts";
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
  const setShellConfig = useSetShellConfig();
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
    logisticsPlanReady,
    maxUnlockedStepIndex,
    mode,
    nextInvoiceNumber,
    quickEmptyBoxRouteDecision,
    quickCheckoutCompleted,
    quickSaleActive,
    quickSaleAdvancing,
    quickSaleBoxSelectionChanged,
    quickSaleCountry,
    quickSaleDraft,
    cancelQuickSale,
    continueFromLogistics,
    resetNewClientForm,
    resetNewRecipientForm,
    releaseInvoiceReservation,
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
    openStep,
    proceedQuickSaleFromSelectedBox,
  } = context;

  useEffect(() => {
    if (!quickSaleActive || quickCheckoutCompleted) {
      return;
    }

    setShellConfig({
      headerAction: createElement(
        "button",
        {
          type: "button",
          onClick: cancelQuickSale,
          title: "Cancelar venta rápida",
          "aria-label": "Cancelar venta rápida",
          className: "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-emerald-700/40 bg-emerald-400/10 text-emerald-300 transition hover:bg-emerald-400/15 hover:text-emerald-200 active:scale-[0.98]",
        },
        createElement(X, { className: "h-4 w-4", strokeWidth: 2.5, "aria-hidden": true }),
      ),
    });

    return () => setShellConfig({ headerAction: undefined });
  }, [cancelQuickSale, quickCheckoutCompleted, quickSaleActive, setShellConfig]);

  function openSaleStep(step: SaleStep) {
    if (
      quickSaleActive &&
      step === "finish" &&
      quickSaleDraft &&
      quickSaleBoxSelectionChanged
    ) {
      if (!quickSaleAdvancing) {
        void proceedQuickSaleFromSelectedBox();
      }
      return;
    }

    if (step === "finish" && !quickSaleActive && !createdInvoice) {
      void continueFromLogistics();
      return;
    }

    if (activeStep === "finish" && step !== "finish" && !createdInvoice && !quickSaleActive) {
      void releaseInvoiceReservation();
    }

    openStep(step);
  }

  const ventaNavTitle = useMemo(() => {
    if (quickSaleActive && !quickCheckoutCompleted) {
      return "Venta rápida";
    }

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
  }, [editingCustomerId, editingRecipientId, mode, quickCheckoutCompleted, quickSaleActive]);

  function handleVentaNavBack() {
    if (quickSaleActive && !quickCheckoutCompleted) {
      cancelQuickSale();
      return;
    }

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

    const activeFlowSteps = quickSaleActive ? quickSaleSteps : saleSteps;
    const activeStepIndex = activeFlowSteps.findIndex((step) => step.id === activeStep);
    const previousStep = activeFlowSteps[activeStepIndex - 1];

    if (previousStep) {
      if (activeStep === "finish" && !createdInvoice && !quickSaleActive) {
        void releaseInvoiceReservation();
      }
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
    const activeFlowSteps = quickSaleActive ? quickSaleSteps : saleSteps;
    return activeFlowSteps.map((step, visibleIndex) => {
      const isActive = activeStep === step.id;
      const isDone = visibleIndex < completedStepIndex;
      const isUnlocked =
        visibleIndex <= maxUnlockedStepIndex ||
        (quickSaleActive &&
          step.id === "finish" &&
          quickSaleBoxSelectionChanged &&
          !quickSaleAdvancing);

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
                ? `${selectedBoxCount} producto${selectedBoxCount === 1 ? "" : "s"}`
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
                : quickSaleDraft
                  ? quickCheckoutCompleted
                    ? "Listo"
                    : "Revisar invoice"
                  : createdInvoice
                    ? "Listo"
                  : logisticsPlanReady
                    ? "Crear invoice"
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
                ? selectedCartSummary
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
            : step.id === "box"
              ? (quickSaleActive ? quickSaleCountry : selectedRecipient?.country) || ""
              : "";

      const subtitle =
        step.id === "box" && selectedBoxLines.length === 1
          ? selectedBox?.[4] || ""
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
        index: visibleIndex,
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
    quickCheckoutCompleted,
    quickSaleDraft,
    quickSaleActive,
    quickSaleAdvancing,
    quickSaleBoxSelectionChanged,
    quickSaleCountry,
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
    openStep: openSaleStep,
    saleStepBarItems,
    boundedPersonListLayout,
    routePlannerDecision,
    routePlannerTaskLabel,
    cancelQuickSale,
  };
}
