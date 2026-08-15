"use client";

import { flowPageShellWideClass } from "@/components/flow-form-styles";
import type { VentaController } from "@/components/sale/venta/use-venta-controller";
import { VentaHistoryView } from "@/components/sale/venta/venta-history-view";
import { VentaSaleFlow } from "@/components/sale/venta/venta-sale-flow";

export function VentaMainShell({ controller }: { controller: VentaController; }) {
  const {
    activeStep,
    boundedPersonListLayout,
    openSaleContextFromEvent,
    quickSaleDraft,
    showQuickCheckout,
    setActiveCopyGroup,
    setContextMenu,
  } = controller;
  const boundedSaleFlow =
    boundedPersonListLayout ||
    activeStep === "box" ||
    activeStep === "delivery" ||
    (activeStep === "finish" && showQuickCheckout && quickSaleDraft);

  return (
    <div
      className={boundedSaleFlow ? "flex min-h-0 flex-1 flex-col lg:overflow-hidden" : "pb-6"}
      onContextMenuCapture={openSaleContextFromEvent}
      onClick={() => {
        setContextMenu(null);
        setActiveCopyGroup(null);
      }}
    >
      <div className={`min-w-0 ${flowPageShellWideClass}`}>
        <VentaSaleFlow controller={controller} />
        <VentaHistoryView controller={controller} />
      </div>
    </div>
  );
}
