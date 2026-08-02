"use client";

import { ChevronRight } from "lucide-react";
import { primaryButtonClass } from "@/components/ui-blocks";
import { flowStepBodyClass, flowPersonListShellClass } from "@/components/flow-form-styles";
import { SaleLogisticsStep } from "@/components/sale/sale-logistics-step";
import { saleRouteDecisionSummary } from "@/lib/sale-route-decision";
import type { VentaController } from "@/components/sale/venta/use-venta-controller";

export function VentaDeliveryStep({ controller }: { controller: VentaController; }) {
  const {
    activeStep,
    continueFromLogistics,
    deferFullBoxPickup,
    deliveryRef,
    emptyBoxAdditionalCharge,
    emptyBoxMode,
    emptyBoxRouteDecision,
    emptyBoxScheduleAt,
    emptyBoxScheduleMode,
    expandFullBoxPickup,
    fullBoxAdditionalCharge,
    fullBoxMode,
    fullBoxPickupExpanded,
    fullBoxRouteDecision,
    fullBoxScheduleAt,
    fullBoxScheduleMode,
    logisticsContinueHint,
    logisticsFees,
    logisticsPlanReady,
    selectEmptyBoxMode,
    selectFullBoxMode,
    selectedBox,
    selectedRecipient,
    selectedSender,
    setEmptyBoxAdditionalCharge,
    setFullBoxAdditionalCharge,
    stepShellClass,
  } = controller;

  return (
    selectedSender && selectedRecipient && selectedBox && activeStep === "delivery" ? (
      <div
        ref={deliveryRef}
        className={`${flowPersonListShellClass} ${stepShellClass("delivery")}`}
      >
        <div className={`${flowStepBodyClass} flex min-h-0 flex-1 flex-col !space-y-0`}>
          <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-1 py-2 sm:px-1.5">
            <SaleLogisticsStep
              emptyBoxMode={emptyBoxMode}
              emptyBoxScheduleMode={emptyBoxScheduleMode}
              emptyBoxScheduleAt={emptyBoxScheduleAt}
              fullBoxMode={fullBoxMode}
              fullBoxScheduleMode={fullBoxScheduleMode}
              fullBoxScheduleAt={fullBoxScheduleAt}
              emptyBoxRouteSummary={saleRouteDecisionSummary(emptyBoxRouteDecision)}
              fullBoxRouteSummary={saleRouteDecisionSummary(fullBoxRouteDecision)}
              onSelectEmptyBoxMode={selectEmptyBoxMode}
              onSelectFullBoxMode={selectFullBoxMode}
              fullBoxPickupExpanded={fullBoxPickupExpanded}
              onExpandFullBoxPickup={expandFullBoxPickup}
              onDeferFullBoxPickup={deferFullBoxPickup}
              emptyBoxCharge={emptyBoxAdditionalCharge}
              fullBoxCharge={fullBoxAdditionalCharge}
              emptyBoxChargeSuggestion={logisticsFees.emptyBoxDeliveryFee}
              fullBoxChargeSuggestion={logisticsFees.fullBoxPickupFee}
              onEmptyBoxChargeChange={setEmptyBoxAdditionalCharge}
              onFullBoxChargeChange={setFullBoxAdditionalCharge}
            />
          </div>
          <div className="flex shrink-0 justify-center border-t border-black/80 pt-4">
            <div className="flex w-full max-w-md flex-col items-center gap-2">
              <button
                type="button"
                disabled={!logisticsPlanReady}
                onClick={continueFromLogistics}
                className={`${primaryButtonClass} flex h-12 w-full items-center justify-center gap-2 text-sm disabled:cursor-not-allowed disabled:opacity-35`}
              >
                Siguiente
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
              {!logisticsPlanReady ? (
                <p className="text-center text-xs font-bold text-slate-500">
                  {logisticsContinueHint}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    ) : null
  );
}
