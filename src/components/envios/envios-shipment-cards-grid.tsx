"use client";

import { Package, PhoneCall, Star } from "lucide-react";
import { memo } from "react";
import { CountryName } from "@/components/country-flag";
import { ShipmentExpedienteLink } from "@/components/expediente/shipment-expediente-link";
import { ShipmentContactLogLine } from "@/components/shipment-contact-log-dialog";
import { ShipmentLogisticsAssignmentBadges } from "@/components/shipment-logistics-assignment-badges";
import { ShipmentPaymentProgress } from "@/components/shipment-payment-progress";
import { ShipmentProgressSteps } from "@/components/shipment-progress-steps";
import { listCardShellClass } from "@/components/ui-blocks";
import { driverCollectionLabel, shipmentLogisticsCharge } from "@/components/envios/shipment-row-helpers";
import type { EnviosShipmentCardsGridProps } from "@/components/envios/types";
import { formatMoneyValue } from "@/lib/logistics-fees";
import { paymentMethodLabel } from "@/lib/payment-methods";
import { CUSTOMER_ROUTE_PENDING_APPROVAL_LABEL } from "@/lib/customer-route-verification";
import {
  balanceDueFromShipment,
  enviosActiveLegLogisticsTone,
  enviosActiveLegLogisticsToneClass,
  quoteFromShipment,
  shipmentLogisticsBridgeLabel,
  shipmentLogisticsSteps,
  shipmentOperationalAssignment,
  shipmentPaymentProgress,
} from "@/lib/shipment-display";
import { buildShipmentTimings } from "@/lib/shipment-timing";

export const EnviosShipmentCardsGrid = memo(function EnviosShipmentCardsGrid({
  displayShipments,
  canManageSales,
  canViewShipmentJournal,
  canManageShipmentOwners,
  canEditProgress,
  canUpdateShipmentStatus,
  isHistoryMode,
  salesOwners,
  routeMemberLabelById,
  routeByTaskId,
  busyId,
  progressBusyId,
  priorityBusyId,
  ownerBusyId,
  finalizeCopy,
  onShipmentContextMenu,
  onContactLogOpen,
  onTogglePriority,
  onUpdateSalesOwner,
  onFinalizeOpen,
  onLogisticsPatch,
  onStatusChange,
  onFullBoxReceivedAtOffice,
  onRevertFullBoxOfficeReception,
  onProgramRoute,
  pendingRouteTaskIds,
  onLockedLeg,
  selectionEnabled,
  isShipmentSelected,
  onShipmentRowActivate,
}: EnviosShipmentCardsGridProps) {
  return (
    <div className="grid items-start gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
      {displayShipments.map((row, index) => {
        const quote = quoteFromShipment(row);
        const balanceDue = balanceDueFromShipment(row, quote);
        const canFinalize =
          canManageSales && row.invoice_status === "open" && balanceDue > 0;
        const progressSteps = shipmentLogisticsSteps(row);
        const paymentProgress = shipmentPaymentProgress(row, quote);
        const logisticsCharge = shipmentLogisticsCharge(row);
        const activeStep = progressSteps.find((step) => step.state === "active");
        const logisticsAssignment = shipmentOperationalAssignment(
          row,
          activeStep,
          routeMemberLabelById,
          routeByTaskId,
        );
        const logisticsBridgeLabel = shipmentLogisticsBridgeLabel(
          logisticsAssignment,
          activeStep,
        );
        const timings = buildShipmentTimings(row, progressSteps);
        const latestPayment = row.payments[row.payments.length - 1] || null;
        const isSelected = selectionEnabled && isShipmentSelected(row.id);
        const logisticsToneClass = enviosActiveLegLogisticsToneClass(
          enviosActiveLegLogisticsTone(row),
        );

        return (
          <article
            key={row.id}
            role={selectionEnabled ? "checkbox" : undefined}
            className={`${listCardShellClass} flex cursor-pointer flex-col p-2.5${
              logisticsToneClass ? ` ${logisticsToneClass}` : ""
            }${row.invoice_priority ? " bg-amber-950/15" : ""}${
              isSelected ? " ring-2 ring-emerald-500/70" : ""
            }`}
            onClick={(event) => onShipmentRowActivate(event, row, index)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onShipmentRowActivate(event as unknown as React.MouseEvent, row, index);
              }
            }}
            tabIndex={selectionEnabled ? 0 : undefined}
            aria-checked={selectionEnabled ? isSelected : undefined}
            onContextMenu={(event) => onShipmentContextMenu(event, row)}
          >
            <div className="min-w-0">
              <p className="break-words text-sm font-black text-[#f8fafc] sm:truncate">
                <span>{row.code}</span>
                <span className="text-slate-500"> · </span>
                <span>{row.customer_name}</span>
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                <CountryName
                  name={row.country}
                  size="xs"
                  labelClassName="text-[10px] font-bold text-slate-500"
                />
                {row.carrier ? (
                  <>
                    <span className="text-slate-600" aria-hidden>·</span>
                    <span className="inline-flex min-w-0 items-center gap-1 text-[10px] font-bold text-slate-500">
                      <Package className="h-3 w-3 shrink-0" aria-hidden />
                      <span className="break-words sm:truncate">{row.carrier}</span>
                    </span>
                  </>
                ) : null}
                {canManageShipmentOwners ? (
                  <label
                    className="flex w-full min-w-0 items-center gap-1 sm:w-auto sm:min-w-[9rem] sm:flex-1"
                    onClick={(event) => event.stopPropagation()}
                    onKeyDown={(event) => event.stopPropagation()}
                  >
                    <span className="shrink-0 text-[9px] font-black uppercase text-slate-500">
                      Vendedor
                    </span>
                    <select
                      className="h-6 min-w-0 flex-1 rounded-md border border-black bg-surface-inset px-1.5 text-[10px] font-black text-slate-200 outline-none disabled:opacity-50"
                      value={row.salesOwnerId || ""}
                      disabled={ownerBusyId === row.id}
                      onChange={(event) => void onUpdateSalesOwner(row, event.target.value)}
                      aria-label={`Vendedor de ${row.code}`}
                    >
                      {salesOwners.map((owner) => (
                        <option key={owner.id} value={owner.id}>
                          {owner.label}
                        </option>
                      ))}
                    </select>
                  </label>
                ) : (
                  <p className="break-words text-[10px] font-bold text-slate-500 sm:truncate">
                    Vendedor: {row.salesOwnerName}
                  </p>
                )}
              </div>
            </div>

            <div
              className="mt-2"
              onClick={(event) => event.stopPropagation()}
              onKeyDown={(event) => event.stopPropagation()}
            >
              <ShipmentProgressSteps
                steps={progressSteps}
                timings={timings}
                row={row}
                requestedRouteTaskIds={pendingRouteTaskIds}
                compact
                canEdit={canEditProgress}
                canEditLogistics={!isHistoryMode && canManageSales}
                canEditStatus={!isHistoryMode && canUpdateShipmentStatus}
                saving={progressBusyId === row.id}
                onLogisticsPatch={(patch, audit) =>
                  void onLogisticsPatch(row, patch, audit)
                }
                onStatusChange={(status, audit) =>
                  void onStatusChange(row, status, audit)
                }
                onFullBoxReceivedAtOffice={
                  !isHistoryMode && canManageSales
                    ? (audit) => void onFullBoxReceivedAtOffice(row, audit)
                    : undefined
                }
                onRevertFullBoxOfficeReception={
                  !isHistoryMode && canManageSales
                    ? (audit) => void onRevertFullBoxOfficeReception(row, audit)
                    : undefined
                }
                onProgramRoute={
                  onProgramRoute
                    ? (kind) => onProgramRoute(row, kind)
                    : undefined
                }
                routeByTaskId={routeByTaskId}
                onLockedLeg={onLockedLeg}
              />
            </div>

            <div className="mt-2">
              <ShipmentPaymentProgress compact progress={paymentProgress} />
              {logisticsCharge ? (
                <p className="mt-1.5 rounded-md border border-amber-800/70 bg-amber-950/20 px-2 py-1 text-[10px] font-black text-amber-200">
                  Cargo logístico adicional: {logisticsCharge.amount}
                  {logisticsCharge.adjusted ? " · Tarifa ajustada" : ""}
                </p>
              ) : null}
              {latestPayment ? (
                <p className="mt-1.5 rounded-md border border-black bg-surface-inset px-2 py-1 text-[10px] font-black text-slate-300">
                  Pago: {formatMoneyValue(latestPayment.amount)} ·{" "}
                  {paymentMethodLabel(latestPayment.method)}
                  {latestPayment.note ? ` · ${latestPayment.note}` : ""}
                </p>
              ) : null}
              {driverCollectionLabel(row) ? (
                <p className="mt-1 rounded-md border border-sky-900/70 bg-sky-950/20 px-2 py-1 text-[10px] font-black text-sky-100">
                  {driverCollectionLabel(row)}
                </p>
              ) : null}
              <ShipmentContactLogLine shipment={row} />
            </div>

            <div className="mt-2 border-t border-black pt-2">
              {row.logisticsTasks.some((task) => pendingRouteTaskIds?.has(task.id)) ? (
                <p className="mb-2 text-[10px] font-bold leading-snug text-amber-200">
                  {CUSTOMER_ROUTE_PENDING_APPROVAL_LABEL}
                </p>
              ) : null}
              {logisticsBridgeLabel ? (
                <p className="mb-1.5 text-[10px] font-bold leading-snug text-amber-200">
                  {logisticsBridgeLabel}
                </p>
              ) : null}
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                  {canViewShipmentJournal ? (
                    <button
                      type="button"
                      onClick={() => onContactLogOpen(row.id)}
                      className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-black bg-surface-inset text-emerald-300 hover:bg-surface-card"
                      title="Abrir Bitácora"
                      aria-label={`Abrir Bitácora de ${row.code}`}
                    >
                      <PhoneCall className="h-4 w-4" aria-hidden />
                      {row.contactLogs?.length ? (
                        <span className="absolute -right-1 -top-1 min-w-4 rounded-full border border-black bg-emerald-400 px-1 text-[9px] font-black leading-4 text-slate-950">
                          {row.contactLogs.length}
                        </span>
                      ) : null}
                    </button>
                  ) : null}
                  {canManageSales && !isHistoryMode ? (
                    <button
                      type="button"
                      disabled={priorityBusyId === row.id}
                      onClick={() => void onTogglePriority(row)}
                      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-black bg-surface-inset hover:bg-surface-card disabled:opacity-50 ${
                        row.invoice_priority ? "text-amber-300" : "text-slate-400"
                      }`}
                      title={row.invoice_priority ? "Quitar prioridad" : "Marcar prioridad"}
                      aria-label={
                        row.invoice_priority
                          ? `Quitar prioridad de ${row.code}`
                          : `Marcar prioridad de ${row.code}`
                      }
                    >
                      <Star
                        className={`h-4 w-4 ${row.invoice_priority ? "fill-amber-300" : ""}`}
                        aria-hidden
                      />
                    </button>
                  ) : null}
                  <ShipmentExpedienteLink shipmentId={row.id} shipmentCode={row.code} />
                  <ShipmentLogisticsAssignmentBadges assignment={logisticsAssignment} />
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {canFinalize ? (
                    <button
                      type="button"
                      disabled={busyId === row.id || progressBusyId === row.id || priorityBusyId === row.id}
                      onClick={() => onFinalizeOpen(row)}
                      className="inline-flex h-8 items-center rounded-lg border border-black bg-surface-inset px-3 text-[11px] font-black text-emerald-300 hover:bg-surface-card"
                      title={finalizeCopy.actionTitle}
                    >
                      {finalizeCopy.actionLabel}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
});
