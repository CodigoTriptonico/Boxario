"use client";

import Link from "next/link";
import { Package, PhoneCall, Star } from "lucide-react";
import { memo } from "react";
import { CountryFlag } from "@/components/country-flag";
import { ShipmentExpedienteLink } from "@/components/expediente/shipment-expediente-link";
import { ShipmentContactLogLine } from "@/components/shipment-contact-log-dialog";
import { ShipmentLogisticsAssignmentBadges } from "@/components/shipment-logistics-assignment-badges";
import { ShipmentMilestoneAgeTrigger } from "@/components/shipment-milestone-age-strip";
import { ShipmentProgressSteps } from "@/components/shipment-progress-steps";
import { listRowBaseClass, listRowHoverClass } from "@/components/ui-blocks";
import { driverCollectionLabel, shipmentLogisticsCharge } from "@/components/envios/shipment-row-helpers";
import type { EnviosShipmentRowsListProps } from "@/components/envios/types";
import { formatMoneyValue } from "@/lib/logistics-fees";
import { paymentMethodLabel } from "@/lib/payment-methods";
import { buildLogisticaShipmentDeepLink } from "@/lib/logistics-view";
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
import { buildShipmentMilestoneAges, buildShipmentTimingInsightPanel, buildShipmentTimings } from "@/lib/shipment-timing";

export const EnviosShipmentRowsList = memo(function EnviosShipmentRowsList({
  displayShipments,
  cardClass,
  canManageSales,
  canViewShipmentJournal,
  canEditProgress,
  canUpdateShipmentStatus,
  isHistoryMode,
  routeMemberLabelById,
  routeByTaskId,
  expandedShipmentIds,
  busyId,
  progressBusyId,
  priorityBusyId,
  finalizeCopy,
  onShipmentContextMenu,
  onContactLogOpen,
  onTogglePriority,
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
}: EnviosShipmentRowsListProps) {
  return (
    <div className={`${cardClass} overflow-hidden p-2`}>
      <div className="flex flex-col gap-2">
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
          const milestoneAges = buildShipmentMilestoneAges(row, progressSteps);
          const timingInsights = buildShipmentTimingInsightPanel(row, progressSteps);
          const latestPayment = row.payments[row.payments.length - 1] || null;
          const routePendingApproval = row.logisticsTasks.some((task) =>
            pendingRouteTaskIds?.has(task.id),
          );
          const logisticsNotice = routePendingApproval
            ? CUSTOMER_ROUTE_PENDING_APPROVAL_LABEL
            : logisticsBridgeLabel
              ? "Logística avisada"
              : "";
          const isExpanded = expandedShipmentIds.has(row.id);
          const isSelected = selectionEnabled && isShipmentSelected(row.id);
          const logisticsToneClass = enviosActiveLegLogisticsToneClass(
            enviosActiveLegLogisticsTone(row),
          );

          return (
            <article
              key={row.id}
              className={`${listRowBaseClass} px-3 py-1.5 sm:px-4 ${
                logisticsToneClass ? `${logisticsToneClass} ` : ""
              }${row.invoice_priority ? "bg-amber-950/15 " : ""}${
                isSelected ? "bg-emerald-950/25 ring-1 ring-inset ring-emerald-500/60 " : ""
              }${isExpanded ? "bg-surface-list-row-hover/80" : listRowHoverClass}`}
              onContextMenu={(event) => onShipmentContextMenu(event, row)}
            >
              <div
                className="w-full min-w-0 cursor-pointer"
                onClick={(event) => onShipmentRowActivate(event, row, index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onShipmentRowActivate(event as unknown as React.MouseEvent, row, index);
                  }
                }}
                tabIndex={0}
                aria-expanded={isExpanded}
                aria-controls={`envios-detail-${row.id}`}
                aria-label={
                  isExpanded
                    ? `Ocultar detalle de ${row.code}`
                    : `Ver detalle de ${row.code}`
                }
              >
                <div className="flex min-w-0 items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-x-2 sm:gap-x-3">
                    <ShipmentMilestoneAgeTrigger
                      ages={milestoneAges}
                      insights={timingInsights}
                      className="shrink-0 self-center"
                    />
                    <div className="min-w-0 py-0.5">
                      <p className="flex flex-wrap items-baseline gap-x-1.5 text-sm leading-snug">
                        <Link href={buildLogisticaShipmentDeepLink(row.code)} className="font-black tracking-tight text-[#f8fafc] hover:text-emerald-300">
                          {row.code}
                        </Link>
                        <span className="font-bold text-slate-200">{row.customer_name}</span>
                      </p>
                      <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-1 text-[11px] font-bold leading-none">
                        <span className="inline-flex items-center gap-1 text-slate-300">
                          <CountryFlag name={row.country} size="xs" className="!h-3 !w-[18px] !rounded-sm" />
                          <span>{row.country}</span>
                        </span>
                        {row.carrier ? <><span className="text-slate-600" aria-hidden>·</span><span className="inline-flex items-center gap-1 text-slate-400"><Package className="h-3 w-3 shrink-0" aria-hidden /><span className="tabular-nums">{row.carrier}</span></span></> : null}
                      </div>
                    </div>
                  </div>
                  <div className="min-w-[7.5rem] shrink-0 text-right">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">Saldo</p>
                    <p className={`whitespace-nowrap text-sm font-black tabular-nums ${paymentProgress.pending > 0 ? "text-amber-200" : "text-emerald-300"}`}>
                      {formatMoneyValue(paymentProgress.pending)}
                    </p>
                    <p className="text-[9px] font-bold text-slate-500">{paymentProgress.statusLabel}</p>
                  </div>
                </div>

                <div
                  className="mt-2 min-w-0 border-t border-black/50 pt-2"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <ShipmentProgressSteps
                    steps={progressSteps}
                    timings={timings}
                    row={row}
                    requestedRouteTaskIds={pendingRouteTaskIds}
                    compact
                    singleLine
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
              </div>

              {isExpanded ? (
                <div
                  id={`envios-detail-${row.id}`}
                  className="mt-2.5 border-t border-black/70 pt-2.5"
                  onClick={(event) => event.stopPropagation()}
                  onKeyDown={(event) => event.stopPropagation()}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {logisticsNotice ? (
                      <span className="text-[10px] font-black text-amber-200">
                        {logisticsNotice}
                      </span>
                    ) : null}
                    <ShipmentLogisticsAssignmentBadges assignment={logisticsAssignment} />
                  </div>
                  <div className="mt-2 flex flex-wrap items-start justify-between gap-2.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {canViewShipmentJournal ? (
                        <button
                          type="button"
                          onClick={() => onContactLogOpen(row.id)}
                          className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-black bg-surface-inset px-2.5 text-[11px] font-black text-emerald-300 hover:bg-surface-card"
                          title="Abrir Bitácora"
                          aria-label={`Abrir Bitácora de ${row.code}`}
                        >
                          <PhoneCall className="h-4 w-4" aria-hidden />
                          <span>Bitácora</span>
                          {row.contactLogs?.length ? (
                            <span className="min-w-4 rounded-full bg-emerald-400 px-1 text-center text-[9px] font-black leading-4 text-slate-950">
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
                          className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-black bg-surface-inset px-2.5 text-[11px] font-black hover:bg-surface-card disabled:opacity-50 ${
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
                          <span>{row.invoice_priority ? "Prioridad" : "Priorizar"}</span>
                        </button>
                      ) : null}
                      <ShipmentExpedienteLink
                        shipmentId={row.id}
                        shipmentCode={row.code}
                        showLabel
                        className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-black bg-surface-inset px-2.5 text-[11px] font-black text-slate-300 hover:bg-surface-card"
                      />
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

                    <div className="min-w-[16rem] flex-1">
                      {logisticsCharge ? (
                        <p className="rounded-md border border-amber-900/70 bg-amber-950/20 px-2 py-1 text-[10px] font-black text-amber-200">
                          Cargo logístico {logisticsCharge.amount}{logisticsCharge.adjusted ? " · Tarifa ajustada" : ""}
                        </p>
                      ) : null}
                      {latestPayment ? (
                        <p className={`${logisticsCharge ? "mt-1 " : ""}rounded-md border border-black bg-surface-inset px-2 py-1 text-[10px] font-black text-slate-300`}>
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
                  </div>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </div>
  );
});
