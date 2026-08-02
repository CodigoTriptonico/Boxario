"use client";

import { SaleHeaderCartPanel } from "@/components/sale/sale-cart-panel";
import type { VentaController } from "@/components/sale/venta/use-venta-controller";
import { VentaMainShell } from "@/components/sale/venta/venta-main-shell";
import { VentaOverlays } from "@/components/sale/venta/venta-overlays";

export function VentaView({ controller }: { controller: VentaController; }) {
  const {
    adjustSelectedBoxCount,
    boxCartOpen,
    cartPanelLines,
    invoiceBilling,
    removeSelectedBoxLine,
    selectedPromotionId,
    setBoxCartOpen,
    setSelectedPromotionId,
    showSaleHeaderCart,
    updateSelectedBoxCount,
  } = controller;

  return (
    <>
      {showSaleHeaderCart && boxCartOpen ? (
        <SaleHeaderCartPanel
          lines={cartPanelLines}
          billing={invoiceBilling}
          selectedPromotionId={selectedPromotionId}
          onPromotionChange={setSelectedPromotionId}
          onAdjustQuantity={adjustSelectedBoxCount}
          onUpdateQuantity={updateSelectedBoxCount}
          onRemoveLine={removeSelectedBoxLine}
          onClose={() => setBoxCartOpen(false)}
          emptyHint="Toca una caja para agregarla al carrito."
        />
      ) : null}
      <VentaMainShell controller={controller} />
      <VentaOverlays controller={controller} />
    </>
  );
}
