"use client";

import { useEffect } from "react";

import {
  boxInvoicesForSale,
  saleBoxCatalogKey,
  type RouteAssignmentRetry,
} from "@/components/sale/venta/shared";
import { reserveInvoiceNumberAction } from "@/app/actions/pricing";
import { requestCustomerRouteAssignmentAction } from "@/app/actions/customer-route-assignments";
import { createShipmentAction } from "@/app/actions/shipments";
import { type QuickEmptyBoxDraft } from "@/components/sale/sale-quick-box-types";
import { saleRouteDecisionTask, saleRouteDecisionTemplateId, type SaleRouteDecision } from "@/lib/sale-route-decision";
import { listCustomerLogisticsChargeHistoryAction } from "@/app/actions/sale-customer-history";
import { billingWithRecordedPayment, disabledLogisticsAdditionalCharge, invoiceAccountingStateForPayment, logisticsAdditionalChargeIsValid, type InvoiceBillingSnapshot } from "@/lib/invoice-billing";
import { emptyCustomerLogisticsChargeHistory } from "@/lib/logistics-charge-history";
import { formatMoneyValue, parseMoneyValue } from "@/lib/logistics-fees";
import { defaultSaleDepositDraft } from "@/lib/sale-deposit-charge";
import { formatInvoiceReference } from "@/lib/invoice-reference";
import { createInvoiceReservationToken } from "@/lib/invoice-reservation";
import { recordRecentSale } from "@/lib/sale-recent-storage";
import {
  EMPTY_BOX_DRIVER_MODE,
  EMPTY_BOX_OFFICE_MODE,
  FULL_BOX_DRIVER_MODE,
} from "@/lib/sale-logistics-modes";
import { defaultSalePaymentSelection, isResolvedSalePaymentChoice, resolveSalePaymentInput, SALE_PAYMENT_UNSET, type SalePaymentChoice } from "@/lib/sale-payment-choice";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import type { CreateLogisticsTaskInput } from "@/lib/shipment-types";
import { personFullName, recipientShipmentSnapshot } from "@/components/sale/venta-parts";
import type { VentaCore } from "@/components/sale/venta/use-venta-core";
import type { VentaFoundation } from "@/components/sale/venta/use-venta-foundation";
import type { VentaData } from "@/components/sale/venta/use-venta-data";
import type { VentaFlow } from "@/components/sale/venta/use-venta-flow";
import type { VentaSelectionBase } from "@/components/sale/venta/use-venta-selection-base";
import type { VentaSelection } from "@/components/sale/venta/use-venta-selection";

type VentaInvoicesContext = VentaCore & VentaFoundation & VentaData & VentaFlow & VentaSelectionBase & VentaSelection;

export function useVentaInvoices(context: VentaInvoicesContext) {
  const {
    creatingOpenInvoice,
    currentDriverTaskCount,
    currentLogisticsSummary,
    createdInvoice,
    emptyBoxAdditionalCharge,
    emptyBoxMode,
    emptyBoxRouteDecision,
    emptyBoxScheduleAt,
    emptyBoxScheduleMode,
    fullBoxAdditionalCharge,
    fullBoxMode,
    fullBoxRouteDecision,
    fullBoxScheduleAt,
    fullBoxScheduleMode,
    invoiceBilling,
    invoicePaymentMethod,
    invoicePaymentNote,
    invoiceReservation,
    invoiceReservationToken,
    logisticsFees,
    logisticsNotes,
    logisticsPlanReady,
    nextInvoiceNumber,
    notify,
    quickEmptyBoxAdditionalCharge,
    quickInvoiceBilling,
    quickPaymentMethod,
    quickPaymentNote,
    quickSaleCountry,
    quickSaleSender,
    quickSaleDraft,
    quickCheckoutCompleted,
    releaseInvoiceReservation,
    reloadHistory,
    reloadSaleShortcuts,
    selectedBox,
    selectedBoxCount,
    selectedBoxLines,
    selectedBoxTotalCost,
    selectedCartSummary,
    selectedRecipient,
    selectedSender,
    sellerCode,
    companyCode,
    setActiveCopyGroup,
    setActiveStep,
    setContextMenu,
    setCreatedInvoice,
    setCreatingOpenInvoice,
    setCreatingQuickInvoice,
    setCustomerLogisticsChargeHistory,
    setFinishDocTab,
    setInvoiceConfirmOpen,
    setInvoicePaymentMethod,
    setInvoicePaymentNote,
    setInvoiceReservation,
    setInvoiceReservationToken,
    setInvoiceSequence,
    setQuickCheckoutCompleted,
    setQuickEmptyBoxRouteDecision,
    setQuickInvoiceNumber,
    setQuickPayNowDraft,
    setQuickPayNowDraftTouched,
    setQuickPaymentMethod,
    setQuickPaymentNote,
    setQuickSaleCountry,
    setQuickSaleCountryPickerOpen,
    setQuickSaleDraft,
    setQuickSaleAdvancing,
    setQuickSaleSender,
    setQuickSelectedPromotionId,
    setQuickEmptyBoxDeliveredAt,
    setQuickTrackingToken,
    setRouteAssignmentRetries,
    setShowQuickCheckout,
    setStockMessage,
  } = context;

  async function reserveInvoiceNumber(country: string | undefined, city: string | undefined, boxCount: number) {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const reservationToken = invoiceReservationToken || createInvoiceReservationToken();
    const result = await reserveInvoiceNumberAction({
      reservationToken,
      country,
      city,
      boxCount,
    });

    if (!result.ok) {
      setStockMessage(result.error);
      notify.error(result.error);
      return null;
    }

    setInvoiceReservationToken(reservationToken);
    setInvoiceReservation(result.data);
    setInvoiceSequence(result.data.sequence);
    return result.data;
  }

  useEffect(() => {
    if (
      !invoiceReservation ||
      !invoiceReservationToken ||
      createdInvoice ||
      quickCheckoutCompleted ||
      !isSupabaseConfigured()
    ) {
      return;
    }

    const country = quickSaleDraft?.country || selectedRecipient?.country;
    const city = quickSaleDraft?.sender.city || selectedRecipient?.city;
    const boxCount = quickSaleDraft?.boxCount || selectedBoxCount;
    if (!country || boxCount < 1) {
      return;
    }

    const renew = () => {
      void reserveInvoiceNumberAction({
        reservationToken: invoiceReservationToken,
        country,
        city,
        boxCount,
      }).then((result) => {
        if (result.ok) {
          setInvoiceReservation(result.data);
          setInvoiceSequence(result.data.sequence);
        }
      });
    };

    const interval = window.setInterval(renew, 5 * 60 * 1000);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        renew();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [
    createdInvoice,
    invoiceReservation,
    invoiceReservationToken,
    quickCheckoutCompleted,
    quickSaleDraft,
    selectedBoxCount,
    selectedRecipient,
    setInvoiceReservation,
    setInvoiceSequence,
  ]);

  async function refreshCustomerLogisticsChargeHistory(customerId?: string | null) {
    const id = String(customerId || "").trim();
    if (!id || id.startsWith("local-") || !isSupabaseConfigured()) {
      setCustomerLogisticsChargeHistory(emptyCustomerLogisticsChargeHistory());
      return;
    }

    const result = await listCustomerLogisticsChargeHistoryAction({ customerId: id });
    if (!result.ok) {
      return;
    }
    setCustomerLogisticsChargeHistory(result.data);
  }

  function buildLogisticsPlan(billingSnapshot: InvoiceBillingSnapshot | null = invoiceBilling) {
    const boxLines = selectedBoxLines.map((line) => ({
      label: line.box[0],
      paid: line.box[1] || "0",
      cost: line.box[2] || "0",
      carrier: line.box[3] || "",
      time: line.box[4] || "",
      catalogKey: saleBoxCatalogKey(line.box),
      quantity: line.quantity,
    }));

    return {
      box: selectedBox
        ? {
          label: selectedBox[0],
          paid: selectedBox[1] || "0",
          cost: selectedBox[2] || "0",
          carrier: selectedBox[3] || "",
          time: selectedBox[4] || "",
        }
        : null,
      boxLines,
      boxCount: selectedBoxCount,
      emptyBox: {
        label: "empty_box",
        mode: emptyBoxMode,
        handingNow: emptyBoxMode === EMPTY_BOX_OFFICE_MODE ? true : null,
        scheduleMode: emptyBoxScheduleMode || null,
        scheduleAt: emptyBoxScheduleAt || null,
        driverTaskNeeded: emptyBoxMode === EMPTY_BOX_DRIVER_MODE,
        driverTaskOrdered: Boolean(emptyBoxRouteDecision),
        driverTaskType: emptyBoxMode === EMPTY_BOX_DRIVER_MODE ? "deliver_empty_box" : null,
        routeDecision: emptyBoxRouteDecision?.kind || null,
        requestedRouteDate: emptyBoxRouteDecision?.routeDate || null,
        routeTemplateId: saleRouteDecisionTemplateId(emptyBoxRouteDecision),
      },
      fullBox: fullBoxMode
        ? {
          label: "full_box",
          mode: fullBoxMode,
          scheduleMode: fullBoxScheduleMode || null,
          scheduleAt: fullBoxScheduleAt || null,
          driverTaskNeeded: fullBoxMode === FULL_BOX_DRIVER_MODE,
          driverTaskOrdered: Boolean(fullBoxRouteDecision),
          driverTaskType: fullBoxMode === FULL_BOX_DRIVER_MODE ? "pickup_full_box" : null,
          routeDecision: fullBoxRouteDecision?.kind || null,
          requestedRouteDate: fullBoxRouteDecision?.routeDate || null,
          routeTemplateId: saleRouteDecisionTemplateId(fullBoxRouteDecision),
        }
        : {
          label: "full_box",
          mode: "",
          deferred: true,
          scheduleMode: null,
          scheduleAt: null,
          driverTaskNeeded: false,
          driverTaskType: null,
        },
      driverTaskCount: currentDriverTaskCount,
      feeAdjustments: {
        emptyBoxDelivery: emptyBoxAdditionalCharge,
        fullBoxPickup: fullBoxAdditionalCharge,
      },
      fees: billingSnapshot
        ? {
          emptyBoxDelivery: billingSnapshot.emptyBoxDelivery,
          fullBoxPickup: billingSnapshot.fullBoxPickup,
          total: billingSnapshot.logisticsSubtotal,
        }
        : {
          emptyBoxDelivery: "$0",
          fullBoxPickup: "$0",
          total: "$0",
        },
      billing: billingSnapshot,
      notes: logisticsNotes.trim(),
      summary: currentLogisticsSummary,
    };
  }

  function buildSaleLogisticsTasks(): CreateLogisticsTaskInput[] {
    const tasks: CreateLogisticsTaskInput[] = [];

    if (emptyBoxMode === EMPTY_BOX_DRIVER_MODE && emptyBoxRouteDecision) {
      tasks.push({
        taskType: "deliver_empty_box",
        status: emptyBoxRouteDecision.kind === "selected" ? "scheduled" : "pending",
        scheduledAt:
          emptyBoxRouteDecision.kind === "selected"
            ? emptyBoxRouteDecision.scheduledAt
            : null,
        requestedRouteDate:
          emptyBoxRouteDecision.kind === "pending"
            ? emptyBoxRouteDecision.routeDate
            : null,
        notes: [
          logisticsNotes.trim(),
          emptyBoxRouteDecision.kind === "route_preferred"
            ? `Ruta sugerida: ${emptyBoxRouteDecision.routeLabel}`
            : "",
        ]
          .filter(Boolean)
          .join(" · "),
      });
    }

    if (fullBoxMode === FULL_BOX_DRIVER_MODE && fullBoxRouteDecision) {
      tasks.push({
        taskType: "pickup_full_box",
        status: fullBoxRouteDecision.kind === "selected" ? "scheduled" : "pending",
        scheduledAt:
          fullBoxRouteDecision.kind === "selected"
            ? fullBoxRouteDecision.scheduledAt
            : null,
        requestedRouteDate:
          fullBoxRouteDecision.kind === "pending"
            ? fullBoxRouteDecision.routeDate
            : null,
        notes: [
          logisticsNotes.trim(),
          fullBoxRouteDecision.kind === "route_preferred"
            ? `Ruta sugerida: ${fullBoxRouteDecision.routeLabel}`
            : "",
        ]
          .filter(Boolean)
          .join(" · "),
      });
    }

    return tasks;
  }

  async function createOpenInvoice() {
    if (
      !selectedSender ||
      !selectedRecipient ||
      !selectedBox ||
      !logisticsPlanReady ||
      !invoiceBilling ||
      invoiceBilling.promotionSelectionRequired ||
      !isResolvedSalePaymentChoice(invoicePaymentMethod) ||
      creatingOpenInvoice
    ) {
      if (!creatingOpenInvoice) {
        setStockMessage("Completa los datos de la venta antes de crear el invoice.");
      }
      return;
    }

    setStockMessage("");

    if (!isSupabaseConfigured()) {
      setStockMessage("Configura Supabase en .env.local para crear invoices abiertos.");
      return;
    }

    setCreatingOpenInvoice(true);

    try {
      const reservation = await reserveInvoiceNumber(selectedRecipient.country, selectedRecipient.city, selectedBoxCount);

      if (!reservation) {
        return;
      }

      const invoice = reservation.invoiceNumber;

      const payment = resolveSalePaymentInput({
        choice: invoicePaymentMethod as SalePaymentChoice,
        payNow: invoiceBilling.payNow,
        paymentNote: invoicePaymentNote,
      });
      const recordedBilling = billingWithRecordedPayment(invoiceBilling, payment.paid);
      const invoiceState = invoiceAccountingStateForPayment(invoiceBilling, payment.paid);

      const shipmentResult = await createShipmentAction({
        invoiceNumber: invoice,
        customerId: selectedSender.id.startsWith("local-") ? undefined : selectedSender.id,
        recipientId: selectedRecipient.id.startsWith("local-r-") ? undefined : selectedRecipient.id,
        customerName: personFullName(selectedSender),
        country: selectedRecipient.country,
        carrier:
          selectedBoxLines.length > 1
            ? selectedCartSummary
            : selectedBox[3] || selectedCartSummary || "Sin carrier",
        paid: payment.paid,
        cost: selectedBoxTotalCost(),
        saleKind: "full",
        invoiceStatus: invoiceState.invoiceStatus,
        accountingStatus: invoiceState.accountingStatus,
        deliveryNotes: currentLogisticsSummary,
        logisticsPlan: buildLogisticsPlan(recordedBilling),
        paymentMethod: payment.paymentMethod,
        paymentNote: payment.paymentNote,
        logisticsTasks: buildSaleLogisticsTasks(),
        recipientSnapshot: recipientShipmentSnapshot(selectedRecipient),
      });

      if (!shipmentResult.ok) {
        setStockMessage(shipmentResult.error);
        await releaseInvoiceReservation();
        return;
      }

      const selectedRouteLegs: Array<{
        taskType: "deliver_empty_box" | "pickup_full_box";
        decision: Extract<SaleRouteDecision, { kind: "selected"; }>;
        label: string;
      }> = [
          ...(emptyBoxRouteDecision?.kind === "selected"
            ? [{ taskType: "deliver_empty_box" as const, decision: emptyBoxRouteDecision, label: "Entrega" }]
            : []),
          ...(fullBoxRouteDecision?.kind === "selected"
            ? [{ taskType: "pickup_full_box" as const, decision: fullBoxRouteDecision, label: "Recolección" }]
            : []),
        ];
      const retries: RouteAssignmentRetry[] = [];

      for (const routeLeg of selectedRouteLegs) {
        const task = shipmentResult.data.logisticsTasks.find(
          (candidate) => candidate.taskType === routeLeg.taskType,
        );

        if (!task) {
          retries.push({
            shipmentId: shipmentResult.data.id,
            taskId: "",
            routeTemplateId: routeLeg.decision.routeTemplateId,
            scheduledAt: routeLeg.decision.scheduledAt,
            label: routeLeg.label,
            error: `No se creó la tarea de ${routeLeg.label.toLowerCase()}.`,
          });
          continue;
        }

        const routeResult = await requestCustomerRouteAssignmentAction({
          shipmentId: shipmentResult.data.id,
          taskId: task.id,
          routeTemplateId: routeLeg.decision.routeTemplateId,
          scheduledAt: routeLeg.decision.scheduledAt,
        });

        if (!routeResult.ok) {
          retries.push({
            shipmentId: shipmentResult.data.id,
            taskId: task.id,
            routeTemplateId: routeLeg.decision.routeTemplateId,
            scheduledAt: routeLeg.decision.scheduledAt,
            label: routeLeg.label,
            error: routeResult.error,
          });
        }
      }

      setRouteAssignmentRetries(retries);

      recordRecentSale(selectedSender.id, selectedRecipient.id || undefined);
      void reloadHistory();
      void reloadSaleShortcuts();
      void refreshCustomerLogisticsChargeHistory(selectedSender.id);

      setCreatedInvoice({
        shipmentId: shipmentResult.data.id,
        invoiceNumber: invoice,
        trackingToken: shipmentResult.data.publicTrackingToken,
        sender: selectedSender,
        recipient: selectedRecipient,
        box: selectedBox,
        boxInvoices: boxInvoicesForSale(invoice, selectedBoxLines),
        serviceOperation: "deliver_empty_box",
        billing: recordedBilling,
        emptyBoxDeliveredAt: shipmentResult.data.empty_box_delivered_at,
      });
      setFinishDocTab("invoice");
      setInvoiceConfirmOpen(false);
      setInvoicePaymentMethod(SALE_PAYMENT_UNSET);
      setInvoicePaymentNote("");
      if (retries.length) {
        setStockMessage("");
        notify.success(`Invoice ${invoice} creado. La ruta quedó pendiente; revisa el detalle.`);
      } else {
        setStockMessage("");
        notify.success(`Invoice ${invoice} creado.`);
      }
    } catch (error) {
      await releaseInvoiceReservation();
      const message = error instanceof Error ? error.message : "No se pudo crear el invoice.";
      setStockMessage(message);
      notify.error(message);
    } finally {
      setCreatingOpenInvoice(false);
    }
  }

  async function retryRouteAssignment(retry: RouteAssignmentRetry) {
    if (!retry.taskId) {
      setStockMessage("El invoice no tiene la tarea de ruta esperada. Revísalo en Logística.");
      return;
    }

    const result = await requestCustomerRouteAssignmentAction({
      shipmentId: retry.shipmentId,
      taskId: retry.taskId,
      routeTemplateId: retry.routeTemplateId,
      scheduledAt: retry.scheduledAt,
    });

    if (!result.ok) {
      setStockMessage(result.error);
      notify.error(result.error);
      return;
    }

    setRouteAssignmentRetries((current) =>
      current.filter((candidate) => candidate.taskId !== retry.taskId),
    );
    setStockMessage("");
    notify.success(
      result.data.outcome === "template_confirmed"
        ? `${retry.label}: confirmada dentro de la plantilla.`
        : `${retry.label}: enviada a Logística para aprobar.`,
    );
  }

  async function proceedQuickEmptyBox(draft: QuickEmptyBoxDraft): Promise<boolean> {
    setQuickSaleDraft(draft);
    setQuickEmptyBoxRouteDecision(null);
    setQuickSelectedPromotionId("");
    setQuickPayNowDraft(draft.payNowAmount);
    setQuickPayNowDraftTouched(true);
    setQuickPaymentMethod(
      draft.depositPaid
        ? defaultSalePaymentSelection(logisticsFees.defaultPaymentMethod)
        : "pending",
    );
    setQuickPaymentNote("");
    setQuickSaleSender(draft.sender);
    setQuickSaleCountry(draft.country);
    setQuickSaleCountryPickerOpen(false);
    setContextMenu(null);
    setActiveCopyGroup(null);
    setStockMessage("");

    if (isSupabaseConfigured()) {
      const reservation = await reserveInvoiceNumber(draft.country, draft.sender.city, draft.boxCount);
      if (!reservation) {
        return false;
      }
      setQuickInvoiceNumber(reservation.invoiceNumber);
    } else {
      const previewSequence = Number(nextInvoiceNumber.match(/(\d+)$/)?.[1] || 1);
      setQuickInvoiceNumber(formatInvoiceReference({
        sequence: previewSequence,
        country: draft.country,
        city: draft.sender.city,
        sellerCode,
        companyCode,
        boxCount: draft.boxCount,
      }));
    }

    setShowQuickCheckout(true);
    return true;
  }

  async function proceedQuickSaleFromSelectedBox() {
    if (!quickSaleSender || !quickSaleCountry || !selectedBox || selectedBoxCount < 1) {
      return;
    }

    setQuickSaleAdvancing(true);

    try {
      const quotedTotal = selectedBoxLines.reduce(
        (total, line) => total + parseMoneyValue(line.box[1] || "$0") * line.quantity,
        0,
      );
      const opened = await proceedQuickEmptyBox({
        sender: quickSaleSender,
        country: quickSaleCountry,
        box: selectedBox,
        boxLines: selectedBoxLines.map((line) => ({
          ...line,
          box: [...line.box],
        })),
        boxCount: selectedBoxCount,
        depositPaid: true,
        paymentMode: "deposit",
        payNowAmount: defaultSaleDepositDraft(
          logisticsFees.minimumDeposit,
          quotedTotal,
          selectedBoxCount,
        ),
        emptyBoxMode: EMPTY_BOX_OFFICE_MODE,
        emptyBoxScheduleMode: "",
        emptyBoxScheduleAt: "",
        deliverySummary: "Cliente recoge caja vacía en oficina",
        routeDecision: null,
      });

      if (opened) {
        setActiveStep("finish");
      }
    } finally {
      setQuickSaleAdvancing(false);
    }
  }

  async function confirmQuickEmptyBoxCharge(): Promise<boolean> {
    if (!logisticsAdditionalChargeIsValid(quickEmptyBoxAdditionalCharge)) {
      notify.error("Indica el importe y la razón del cargo logístico adicional");
      return false;
    }
    if (
      !quickSaleDraft ||
      !quickInvoiceBilling ||
      quickInvoiceBilling.promotionSelectionRequired ||
      !isResolvedSalePaymentChoice(quickPaymentMethod)
    ) {
      return false;
    }

    setStockMessage("");

    if (!isSupabaseConfigured()) {
      setStockMessage("Configura Supabase en .env.local para crear invoices abiertos.");
      return false;
    }

    setCreatingQuickInvoice(true);

    try {
      const reservation = await reserveInvoiceNumber(quickSaleDraft.country, quickSaleDraft.sender.city, quickSaleDraft.boxCount);

      if (!reservation) {
        return false;
      }

      const invoice = reservation.invoiceNumber;
      setQuickInvoiceNumber(invoice);

      const payment = resolveSalePaymentInput({
        choice: quickPaymentMethod as SalePaymentChoice,
        payNow: quickInvoiceBilling.payNow,
        paymentNote: quickPaymentNote,
      });
      const recordedBilling = billingWithRecordedPayment(quickInvoiceBilling, payment.paid);
      const invoiceState = invoiceAccountingStateForPayment(quickInvoiceBilling, payment.paid);

      const shipmentResult = await createShipmentAction({
        invoiceNumber: invoice,
        customerId: quickSaleDraft.sender.id.startsWith("local-")
          ? undefined
          : quickSaleDraft.sender.id,
        customerName: personFullName(quickSaleDraft.sender),
        country: quickSaleDraft.country,
        carrier:
          quickSaleDraft.boxLines.length > 1
            ? quickSaleDraft.boxLines.map((line) => line.box[0]).join(" + ")
            : quickSaleDraft.box[3] || "Deposito caja vacia",
        paid: payment.paid,
        cost: formatMoneyValue(
          quickSaleDraft.boxLines.reduce(
            (total, line) => total + parseMoneyValue(line.box[2] || "$0") * line.quantity,
            0,
          ),
        ),
        saleKind: "empty_box_deposit",
        invoiceStatus: invoiceState.invoiceStatus,
        accountingStatus: invoiceState.accountingStatus,
        deliveryNotes: quickSaleDraft.deliverySummary,
        paymentMethod: payment.paymentMethod,
        paymentNote: payment.paymentNote,
        logisticsPlan: {
          box: {
            label: quickSaleDraft.box[0],
            paid: quickSaleDraft.box[1] || "0",
            cost: quickSaleDraft.box[2] || "0",
            carrier: quickSaleDraft.box[3] || "",
            time: quickSaleDraft.box[4] || "",
          },
          boxLines: quickSaleDraft.boxLines.map((line) => ({
            label: line.box[0],
            paid: line.box[1] || "0",
            cost: line.box[2] || "0",
            carrier: line.box[3] || "",
            time: line.box[4] || "",
            catalogKey: saleBoxCatalogKey(line.box),
            quantity: line.quantity,
          })),
          boxCount: quickSaleDraft.boxCount,
          emptyBox: {
            label: "empty_box",
            mode: quickSaleDraft.emptyBoxMode,
            handingNow:
              quickSaleDraft.emptyBoxMode === EMPTY_BOX_OFFICE_MODE ? true : null,
            scheduleMode: quickSaleDraft.emptyBoxScheduleMode || null,
            scheduleAt: quickSaleDraft.emptyBoxScheduleAt || null,
            driverTaskNeeded: quickSaleDraft.emptyBoxMode === EMPTY_BOX_DRIVER_MODE,
            driverTaskOrdered: Boolean(quickSaleDraft.routeDecision),
            driverTaskType:
              quickSaleDraft.emptyBoxMode === EMPTY_BOX_DRIVER_MODE ? "deliver_empty_box" : null,
            routeDecision: quickSaleDraft.routeDecision?.kind || null,
            requestedRouteDate: quickSaleDraft.routeDecision?.routeDate || null,
            routeTemplateId: saleRouteDecisionTemplateId(quickSaleDraft.routeDecision),
          },
          fullBox: null,
          driverTaskCount: quickSaleDraft.emptyBoxMode === EMPTY_BOX_DRIVER_MODE ? 1 : 0,
          feeAdjustments: {
            emptyBoxDelivery: quickEmptyBoxAdditionalCharge,
            fullBoxPickup: disabledLogisticsAdditionalCharge(),
          },
          fees: {
            emptyBoxDelivery: recordedBilling.emptyBoxDelivery,
            fullBoxPickup: recordedBilling.fullBoxPickup,
            total: recordedBilling.logisticsSubtotal,
          },
          billing: recordedBilling,
          notes:
            quickSaleDraft.routeDecision?.kind === "route_preferred"
              ? `Ruta sugerida: ${quickSaleDraft.routeDecision.routeLabel}`
              : "",
          summary: quickSaleDraft.deliverySummary,
        },
        logisticsTasks: quickSaleDraft.routeDecision
          ? [
            {
              ...saleRouteDecisionTask(quickSaleDraft.routeDecision),
              notes:
                quickSaleDraft.routeDecision.kind === "route_preferred"
                  ? `Ruta sugerida: ${quickSaleDraft.routeDecision.routeLabel}`
                  : undefined,
            },
          ]
          : [],
      });

      if (!shipmentResult.ok) {
        setStockMessage(shipmentResult.error);
        await releaseInvoiceReservation();
        return false;
      }

      let routeNeedsRetry = false;
      if (quickSaleDraft.routeDecision?.kind === "selected") {
        const task = shipmentResult.data.logisticsTasks.find(
          (candidate) => candidate.taskType === "deliver_empty_box",
        );
        const retry: RouteAssignmentRetry = {
          shipmentId: shipmentResult.data.id,
          taskId: task?.id || "",
          routeTemplateId: quickSaleDraft.routeDecision.routeTemplateId,
          scheduledAt: quickSaleDraft.routeDecision.scheduledAt,
          label: "Entrega",
          error: undefined,
        };
        const routeResult = task
          ? await requestCustomerRouteAssignmentAction({
            shipmentId: shipmentResult.data.id,
            taskId: task.id,
            routeTemplateId: quickSaleDraft.routeDecision.routeTemplateId,
            scheduledAt: quickSaleDraft.routeDecision.scheduledAt,
          })
          : { ok: false as const, error: "No se creó la tarea de entrega" };

        if (!routeResult.ok) {
          routeNeedsRetry = true;
          retry.error = routeResult.error;
          setRouteAssignmentRetries((current) => [
            ...current.filter((candidate) => candidate.taskId !== retry.taskId),
            retry,
          ]);
          setStockMessage(
            `Invoice ${invoice} creado, pero la ruta necesita reintento. ${routeResult.error}`,
          );
        }
      }

      const completionWarnings = [
        routeNeedsRetry ? "La ruta necesita reintento." : "",
      ].filter(Boolean);

      if (quickSaleDraft.sender.id) {
        recordRecentSale(quickSaleDraft.sender.id);
      }

      void reloadHistory();
      void reloadSaleShortcuts();
      void refreshCustomerLogisticsChargeHistory(quickSaleDraft.sender.id);

      setQuickCheckoutCompleted(true);
      setQuickTrackingToken(shipmentResult.data.publicTrackingToken || "");
      setQuickEmptyBoxDeliveredAt(shipmentResult.data.empty_box_delivered_at);
      setQuickPaymentMethod(SALE_PAYMENT_UNSET);
      setQuickPaymentNote("");
      if (completionWarnings.length) {
        setStockMessage(routeNeedsRetry ? completionWarnings.join(" ") : "");
        notify.success(`Invoice ${invoice} creado.`);
        if (routeNeedsRetry) {
          notify.error("La ruta necesita reintento.");
        }
      } else {
        setStockMessage("");
        notify.success(`Invoice ${invoice} creado.`);
      }
      return true;
    } finally {
      setCreatingQuickInvoice(false);
    }
  }

  return {
    buildLogisticsPlan,
    buildSaleLogisticsTasks,
    createOpenInvoice,
    retryRouteAssignment,
    proceedQuickEmptyBox,
    proceedQuickSaleFromSelectedBox,
    confirmQuickEmptyBoxCharge,
  };
}

export type VentaInvoices = ReturnType<typeof useVentaInvoices>;
