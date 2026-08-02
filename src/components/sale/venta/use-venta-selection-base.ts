"use client";

import { type Recipient } from "@/components/sale/venta-parts";
import type { VentaCore } from "@/components/sale/venta/use-venta-core";
import type { VentaFlow } from "@/components/sale/venta/use-venta-flow";

type VentaSelectionBaseContext = VentaCore & VentaFlow;

export function useVentaSelectionBase(context: VentaSelectionBaseContext) {
  const {
    localIdCounterRef,
    localIdPrefix,
    resetSaleLogistics,
    setActiveStep,
    setSelectedBoxLines,
    setSelectedPromotionId,
    setSelectedRecipient,
  } = context;

  function nextLocalId(prefix: string) {
    localIdCounterRef.current += 1;
    return `${prefix}-${localIdPrefix}-${localIdCounterRef.current}`;
  }

  function chooseRecipient(recipient: Recipient) {
    setSelectedRecipient(recipient);
    setSelectedBoxLines([]);
    setSelectedPromotionId("");
    resetSaleLogistics();
    setActiveStep("box");
  }

  return {
    nextLocalId,
    chooseRecipient,
  };
}

export type VentaSelectionBase = ReturnType<typeof useVentaSelectionBase>;
