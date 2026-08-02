"use client";

import { SaleStepBar } from "@/components/sale/venta-parts";
import { VentaClientStep } from "@/components/sale/venta/venta-client-step";
import { VentaDeliveryStep } from "@/components/sale/venta/venta-delivery-step";
import { VentaFinishStep } from "@/components/sale/venta/venta-finish-step";
import { VentaRecipientBoxSteps } from "@/components/sale/venta/venta-recipient-box-steps";
import type { VentaController } from "@/components/sale/venta/use-venta-controller";

export function VentaSaleFlow({ controller }: { controller: VentaController; }) {
  const {
    mode,
    openStep,
    saleStepBarItems,
  } = controller;

  return mode === "clients" ||
    mode === "sale" ||
    mode === "new-client" ||
    mode === "new-recipient" ? (
    <div className="flex min-h-0 flex-1 flex-col overflow-visible lg:overflow-hidden">
      <div className="shrink-0">
        <SaleStepBar
          steps={saleStepBarItems}
          onOpenStep={openStep}
        />
      </div>
      <VentaClientStep controller={controller} />
      <VentaRecipientBoxSteps controller={controller} />
      <VentaDeliveryStep controller={controller} />
      <VentaFinishStep controller={controller} />
    </div>
  ) : null;
}
