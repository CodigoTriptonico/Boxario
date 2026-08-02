"use client";

import { useMemo, useState } from "react";
import { finalizeShipmentInvoiceAction, updateShipmentInvoicePriorityAction } from "@/app/actions/shipments";
import type { ShipmentRow } from "@/lib/shipment-types";
import { useNotify } from "@/hooks/use-notify";
import {
  DEFAULT_PAYMENT_METHOD,
  type PaymentMethod,
} from "@/lib/payment-methods";
import { collectShipmentInvoiceCopy } from "@/lib/shipment-invoice-copy";
import {
  resolveShipmentCollectAmount,
  shipmentCollectSuccessMessage,
  type ShipmentCollectMode,
} from "@/lib/shipment-collect";
import {
  balanceDueFromShipment,
  depositFromShipment,
  quoteFromShipment,
  totalFromShipment,
} from "@/lib/shipment-display";

type UseEnviosBillingOptions = {
  canManageSales: boolean;
  setShipments: React.Dispatch<React.SetStateAction<ShipmentRow[]>>;
};

export function useEnviosBilling({ canManageSales, setShipments }: UseEnviosBillingOptions) {
  const notify = useNotify();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [priorityBusyId, setPriorityBusyId] = useState<string | null>(null);
  const [finalizeTarget, setFinalizeTarget] = useState<ShipmentRow | null>(null);
  const [finalizeCollectMode, setFinalizeCollectMode] = useState<ShipmentCollectMode>("choose");
  const [finalizePartialAmount, setFinalizePartialAmount] = useState("");
  const [finalizePaymentMethod, setFinalizePaymentMethod] =
    useState<PaymentMethod>(DEFAULT_PAYMENT_METHOD);
  const [finalizePaymentNote, setFinalizePaymentNote] = useState("");

  const finalizeQuote = finalizeTarget ? quoteFromShipment(finalizeTarget) : null;
  const finalizeBalance = finalizeTarget
    ? balanceDueFromShipment(finalizeTarget, finalizeQuote)
    : 0;
  const finalizeTotal = finalizeTarget
    ? totalFromShipment(finalizeTarget, finalizeQuote)
    : 0;
  const finalizeDeposit = finalizeTarget ? depositFromShipment(finalizeTarget) : 0;
  const finalizeCopy = useMemo(
    () => collectShipmentInvoiceCopy(finalizeBalance),
    [finalizeBalance],
  );

  function openFinalize(row: ShipmentRow) {
    setFinalizePaymentMethod(DEFAULT_PAYMENT_METHOD);
    setFinalizePaymentNote("");
    setFinalizeCollectMode("choose");
    setFinalizePartialAmount("");
    setFinalizeTarget(row);
  }

  function closeFinalize() {
    if (busyId !== finalizeTarget?.id) {
      setFinalizeTarget(null);
      setFinalizeCollectMode("choose");
      setFinalizePartialAmount("");
    }
  }

  async function finalizeInvoice(row: ShipmentRow) {
    const quote = quoteFromShipment(row);
    const balanceDue = balanceDueFromShipment(row, quote);
    const amountInput =
      finalizeCollectMode === "partial" ? finalizePartialAmount : undefined;
    const resolved = resolveShipmentCollectAmount(amountInput, balanceDue);

    if (!resolved.ok) {
      notify.error(resolved.error);
      return;
    }

    setBusyId(row.id);

    try {
      const result = await finalizeShipmentInvoiceAction({
        shipmentId: row.id,
        amount:
          finalizeCollectMode === "partial"
            ? finalizePartialAmount
            : undefined,
        cost: quote?.cost,
        paymentMethod: finalizePaymentMethod,
        paymentNote: finalizePaymentNote,
      });

      if (!result.ok) {
        notify.error(result.error);
        return;
      }

      setShipments((current) =>
        current.map((entry) => (entry.id === row.id ? result.data : entry)),
      );
      setFinalizeTarget(null);
      setFinalizeCollectMode("choose");
      setFinalizePartialAmount("");
      notify.success(
        shipmentCollectSuccessMessage(row.code, resolved.amount, resolved.isFullPayment),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function toggleInvoicePriority(row: ShipmentRow) {
    if (!canManageSales) {
      return;
    }

    const nextPriority = !row.invoice_priority;
    setPriorityBusyId(row.id);

    try {
      const result = await updateShipmentInvoicePriorityAction({
        shipmentId: row.id,
        priority: nextPriority,
      });

      if (!result.ok) {
        notify.error(result.error);
        return;
      }

      setShipments((current) =>
        current.map((entry) => (entry.id === row.id ? result.data : entry)),
      );
      notify.success(nextPriority ? "Invoice en prioridad" : "Prioridad quitada");
    } finally {
      setPriorityBusyId(null);
    }
  }

  return {
    busyId,
    priorityBusyId,
    finalizeTarget,
    finalizeCollectMode,
    finalizePartialAmount,
    finalizePaymentMethod,
    finalizePaymentNote,
    finalizeTotal,
    finalizeDeposit,
    finalizeBalance,
    finalizeCopy,
    setFinalizeCollectMode,
    setFinalizePartialAmount,
    setFinalizePaymentMethod,
    setFinalizePaymentNote,
    openFinalize,
    closeFinalize,
    finalizeInvoice,
    toggleInvoicePriority,
  };
}
