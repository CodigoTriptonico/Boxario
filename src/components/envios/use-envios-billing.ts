"use client";

import { useMemo, useRef, useState } from "react";
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
  isDefinitiveOfficePaymentClientError,
  isPaymentIdempotencyConflict,
  paymentIdempotencyConflictUserMessage,
} from "@/lib/office-payment-idempotency";
import {
  beginOfficePaymentIntention,
  clearPendingOfficePaymentIntention,
  resolveOfficePaymentIntentionOnOpen,
} from "@/lib/office-payment-pending";
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

function newClientPaymentId() {
  return globalThis.crypto?.randomUUID?.() || `pay-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function useEnviosBilling({ canManageSales, setShipments }: UseEnviosBillingOptions) {
  const notify = useNotify();
  const [busyId, setBusyId] = useState<string | null>(null);
  const busyRef = useRef(false);
  const [priorityBusyId, setPriorityBusyId] = useState<string | null>(null);
  const [finalizeTarget, setFinalizeTarget] = useState<ShipmentRow | null>(null);
  const [finalizeCollectMode, setFinalizeCollectMode] = useState<ShipmentCollectMode>("choose");
  const [finalizePartialAmount, setFinalizePartialAmount] = useState("");
  const [finalizePaymentMethod, setFinalizePaymentMethod] =
    useState<PaymentMethod>(DEFAULT_PAYMENT_METHOD);
  const [finalizePaymentNote, setFinalizePaymentNote] = useState("");
  const clientPaymentIdRef = useRef<string | null>(null);
  const [pendingReconcileHint, setPendingReconcileHint] = useState(false);

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
    const resolved = resolveOfficePaymentIntentionOnOpen({
      shipmentId: row.id,
      mintId: newClientPaymentId,
    });
    clientPaymentIdRef.current = resolved.clientPaymentId;
    setPendingReconcileHint(resolved.restored);
    setFinalizePaymentNote("");
    if (resolved.restored && resolved.pending) {
      setFinalizePaymentMethod(resolved.pending.method);
      if (resolved.pending.amount !== null) {
        setFinalizeCollectMode("partial");
        setFinalizePartialAmount(String(resolved.pending.amount));
      } else {
        setFinalizeCollectMode("choose");
        setFinalizePartialAmount("");
      }
    } else {
      setFinalizePaymentMethod(DEFAULT_PAYMENT_METHOD);
      setFinalizeCollectMode("choose");
      setFinalizePartialAmount("");
    }
    setFinalizeTarget(row);
  }

  function closeFinalize() {
    if (busyId === finalizeTarget?.id) {
      return;
    }
    // Keep ambiguous pending intentions in storage; only drop the in-memory ref.
    setFinalizeTarget(null);
    setFinalizeCollectMode("choose");
    setFinalizePartialAmount("");
    setPendingReconcileHint(false);
    clientPaymentIdRef.current = null;
  }

  async function finalizeInvoice(row: ShipmentRow) {
    if (busyRef.current) {
      return;
    }

    const quote = quoteFromShipment(row);
    const balanceDue = balanceDueFromShipment(row, quote);
    const amountInput =
      finalizeCollectMode === "partial" ? finalizePartialAmount : undefined;
    const resolved = resolveShipmentCollectAmount(amountInput, balanceDue);

    if (!resolved.ok) {
      // Definitive client-side validation before send — do not persist.
      notify.error(resolved.error);
      return;
    }

    if (!clientPaymentIdRef.current) {
      clientPaymentIdRef.current = newClientPaymentId();
    }

    // Persist before await so close/reopen after timeout keeps the same intention.
    beginOfficePaymentIntention({
      shipmentId: row.id,
      clientPaymentId: clientPaymentIdRef.current,
      amount: finalizeCollectMode === "partial" ? resolved.amount : null,
      method: finalizePaymentMethod,
    });

    busyRef.current = true;
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
        clientPaymentId: clientPaymentIdRef.current,
      });

      if (!result.ok) {
        if (isPaymentIdempotencyConflict(result.error)) {
          clearPendingOfficePaymentIntention(row.id);
          clientPaymentIdRef.current = null;
          setPendingReconcileHint(false);
          notify.error(paymentIdempotencyConflictUserMessage());
          return;
        }
        if (isDefinitiveOfficePaymentClientError(result.error)) {
          clearPendingOfficePaymentIntention(row.id);
          clientPaymentIdRef.current = null;
          setPendingReconcileHint(false);
          notify.error(result.error);
          return;
        }
        // Ambiguous / network-like failures keep the persisted key for reopen/replay.
        setPendingReconcileHint(true);
        notify.error(result.error);
        return;
      }

      clearPendingOfficePaymentIntention(row.id);
      clientPaymentIdRef.current = null;
      setPendingReconcileHint(false);
      setShipments((current) =>
        current.map((entry) => (entry.id === row.id ? result.data : entry)),
      );
      setFinalizeTarget(null);
      setFinalizeCollectMode("choose");
      setFinalizePartialAmount("");
      notify.success(
        shipmentCollectSuccessMessage(row.code, resolved.amount, resolved.isFullPayment),
      );
    } catch (error) {
      // Thrown / network failure: keep persisted intention.
      setPendingReconcileHint(true);
      notify.error(error instanceof Error ? error.message : "No se pudo completar la operacion");
    } finally {
      busyRef.current = false;
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
    pendingReconcileHint,
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
