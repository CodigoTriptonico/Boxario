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
    setActiveCopyGroup,
    setContextMenu,
  } = controller;

  return (
    <div
      className={
        boundedPersonListLayout ||
          activeStep === "box" ||
          activeStep === "delivery"
          ? "flex min-h-0 flex-1 flex-col lg:overflow-hidden"
          : "pb-6"
      }
      onContextMenuCapture={openSaleContextFromEvent}
      onMouseUpCapture={(event) => {
        if (event.button === 2) {
          openSaleContextFromEvent(event);
        }
      }}
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
