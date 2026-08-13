"use client";

import Link from "next/link";
import { PhoneCall, Star } from "lucide-react";
import { CountryFlag } from "@/components/country-flag";
import { ShipmentExpedienteLink } from "@/components/expediente/shipment-expediente-link";
import { ShipmentLogisticsAssignmentBadges } from "@/components/shipment-logistics-assignment-badges";
import { ShipmentProgressSteps } from "@/components/shipment-progress-steps";
import { driverCollectionLabel, shipmentLogisticsCharge } from "@/components/envios/shipment-row-helpers";
import type { EnviosShipmentExcelTableProps } from "@/components/envios/types";
import { secondaryButtonClass } from "@/components/ui-blocks";
import { CUSTOMER_ROUTE_PENDING_APPROVAL_LABEL } from "@/lib/customer-route-verification";
import {
  balanceDueFromShipment,
  quoteFromShipment,
  readShipmentBoxLines,
  shipmentBoxLinesDetailLabel,
  shipmentLogisticsBridgeLabel,
  shipmentLogisticsSteps,
  shipmentOperationalAssignment,
  shipmentStatusDisplayLabel,
  shipmentPaymentProgress,
} from "@/lib/shipment-display";
import { formatMoneyValue } from "@/lib/logistics-fees";
import { buildLogisticaShipmentDeepLink } from "@/lib/logistics-view";
import { buildShipmentTimings } from "@/lib/shipment-timing";

function cellClass(extra = "") {
  return `border-b border-black/70 px-3 py-2 align-middle ${extra}`;
}

function stopRowInteraction(event: React.SyntheticEvent) {
  event.stopPropagation();
}

export function EnviosShipmentExcelTable({
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
}: EnviosShipmentExcelTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-black bg-surface-card">
      <table className="min-w-[1160px] w-full border-collapse text-left text-xs">
        <caption className="sr-only">Envíos en vista Excel</caption>
        <thead className="sticky top-0 z-10 bg-surface-card-header text-[10px] font-black uppercase tracking-wide text-slate-400">
          <tr>
            <th scope="col" className="border-b border-black px-3 py-2">Invoice</th>
            <th scope="col" className="border-b border-black px-3 py-2">Cliente</th>
            <th scope="col" className="border-b border-black px-3 py-2">Cajas</th>
            <th scope="col" className="border-b border-black px-3 py-2">Proceso</th>
            <th scope="col" className="border-b border-black px-3 py-2">Ruta / conductor</th>
            <th scope="col" className="border-b border-black px-3 py-2 text-right">Total</th>
            <th scope="col" className="border-b border-black px-3 py-2 text-right">Pagado</th>
            <th scope="col" className="border-b border-black px-3 py-2 text-right">Saldo</th>
            <th scope="col" className="border-b border-black px-3 py-2">Vendedor</th>
            <th scope="col" className="border-b border-black px-3 py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {displayShipments.map((row, index) => {
            const quote = quoteFromShipment(row);
            const paymentProgress = shipmentPaymentProgress(row, quote);
            const balanceDue = balanceDueFromShipment(row, quote);
            const canFinalize =
              canManageSales && row.invoice_status === "open" && balanceDue > 0;
            const progressSteps = shipmentLogisticsSteps(row);
            const activeStep = progressSteps.find((step) => step.state === "active");
            const timings = buildShipmentTimings(row, progressSteps);
            const assignment = shipmentOperationalAssignment(
              row,
              activeStep,
              routeMemberLabelById,
              routeByTaskId,
            );
            const logisticsBridgeLabel = shipmentLogisticsBridgeLabel(
              assignment,
              activeStep,
            );
            const routePendingApproval = row.logisticsTasks.some((task) =>
              pendingRouteTaskIds?.has(task.id),
            );
            const logisticsCharge = shipmentLogisticsCharge(row);
            const boxLabel = shipmentBoxLinesDetailLabel(readShipmentBoxLines(row));
            const isSelected = selectionEnabled && isShipmentSelected(row.id);

            return (
              <tr
                key={row.id}
                tabIndex={0}
                aria-selected={isSelected || undefined}
                className={`cursor-pointer text-slate-200 transition hover:bg-surface-list-row-hover/70 focus-visible:bg-surface-list-row-hover/70 focus-visible:outline-none ${
                  isSelected ? "bg-emerald-950/25" : ""
                }${row.invoice_priority ? " bg-amber-950/15" : ""}`}
                onClick={(event) => onShipmentRowActivate(event, row, index)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onShipmentRowActivate(event as unknown as React.MouseEvent, row, index);
                  }
                }}
                onContextMenu={(event) => onShipmentContextMenu(event, row)}
              >
                <td className={cellClass("min-w-[9rem]")}>
                  <Link
                    href={buildLogisticaShipmentDeepLink(row.code)}
                    className="font-black text-[#f8fafc] hover:text-emerald-300"
                  >
                    {row.code}
                  </Link>
                  <p className="mt-1 text-[10px] font-bold text-slate-500">
                    {shipmentStatusDisplayLabel(row.status)}
                  </p>
                </td>
                <td className={cellClass("min-w-[13rem]")}>
                  <p className="font-black text-slate-100">{row.customer_name}</p>
                  <p className="mt-1 flex items-center gap-1 text-[10px] font-bold text-slate-400">
                    <CountryFlag name={row.country} size="xs" className="!h-3 !w-[18px] !rounded-sm" />
                    {row.country}
                    {row.carrier ? <span className="text-slate-600">· {row.carrier}</span> : null}
                  </p>
                </td>
                <td className={cellClass("min-w-[10rem] max-w-[15rem]")}>
                  <p className="font-bold text-slate-200">{boxLabel || "Sin detalle"}</p>
                  {logisticsCharge ? (
                    <p className="mt-1 text-[10px] font-black text-amber-200">
                      Logística {logisticsCharge.amount}
                    </p>
                  ) : null}
                </td>
                <td className={cellClass("min-w-[21rem]")} onClick={stopRowInteraction}>
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
                    onLogisticsPatch={(patch, audit) => void onLogisticsPatch(row, patch, audit)}
                    onStatusChange={(status, audit) => void onStatusChange(row, status, audit)}
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
                      onProgramRoute ? (kind) => onProgramRoute(row, kind) : undefined
                    }
                    routeByTaskId={routeByTaskId}
                    onLockedLeg={onLockedLeg}
                  />
                </td>
                <td className={cellClass("min-w-[15rem]")}>
                  {routePendingApproval ? (
                    <p className="mb-1 text-[10px] font-black text-amber-200">
                      {CUSTOMER_ROUTE_PENDING_APPROVAL_LABEL}
                    </p>
                  ) : null}
                  {logisticsBridgeLabel ? (
                    <p className="mb-1 text-[10px] font-black text-amber-200">
                      {logisticsBridgeLabel}
                    </p>
                  ) : null}
                  <ShipmentLogisticsAssignmentBadges assignment={assignment} />
                  {!assignment && !routePendingApproval ? (
                    <span className="text-[10px] font-bold text-slate-500">Sin ruta operativa</span>
                  ) : null}
                </td>
                <td className={cellClass("whitespace-nowrap text-right font-black tabular-nums text-slate-100")}>
                  {formatMoneyValue(paymentProgress.total)}
                </td>
                <td className={cellClass("whitespace-nowrap text-right font-black tabular-nums text-emerald-300")}>
                  {formatMoneyValue(paymentProgress.paid)}
                  <span className="mt-1 block text-[9px] font-bold text-slate-500">
                    {paymentProgress.statusLabel}
                  </span>
                </td>
                <td className={cellClass(`whitespace-nowrap text-right font-black tabular-nums ${paymentProgress.pending > 0 ? "text-amber-200" : "text-emerald-300"}`)}>
                  {formatMoneyValue(paymentProgress.pending)}
                </td>
                <td className={cellClass("min-w-[11rem]")} onClick={stopRowInteraction} onKeyDown={stopRowInteraction}>
                  {canManageShipmentOwners ? (
                    <select
                      className="h-8 w-full rounded-md border border-black bg-surface-inset px-2 text-[10px] font-black text-slate-200 outline-none disabled:opacity-50"
                      value={row.salesOwnerId || ""}
                      disabled={ownerBusyId === row.id}
                      onChange={(event) => void onUpdateSalesOwner(row, event.target.value)}
                      aria-label={`Vendedor de ${row.code}`}
                    >
                      {salesOwners.map((owner) => (
                        <option key={owner.id} value={owner.id}>{owner.label}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-bold text-slate-400">{row.salesOwnerName}</span>
                  )}
                </td>
                <td className={cellClass("min-w-[13rem]")} onClick={stopRowInteraction} onKeyDown={stopRowInteraction}>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {canViewShipmentJournal ? (
                      <button
                        type="button"
                        className={`${secondaryButtonClass} h-8 w-8 p-0 text-emerald-300`}
                        onClick={() => onContactLogOpen(row.id)}
                        title="Abrir Bitácora"
                        aria-label={`Abrir Bitácora de ${row.code}`}
                      >
                        <PhoneCall className="h-4 w-4" aria-hidden />
                      </button>
                    ) : null}
                    {canManageSales && !isHistoryMode ? (
                      <button
                        type="button"
                        disabled={priorityBusyId === row.id}
                        className={`${secondaryButtonClass} h-8 w-8 p-0 ${row.invoice_priority ? "text-amber-300" : "text-slate-400"}`}
                        onClick={() => void onTogglePriority(row)}
                        title={row.invoice_priority ? "Quitar prioridad" : "Marcar prioridad"}
                        aria-label={row.invoice_priority ? `Quitar prioridad de ${row.code}` : `Marcar prioridad de ${row.code}`}
                      >
                        <Star className={`h-4 w-4 ${row.invoice_priority ? "fill-amber-300" : ""}`} aria-hidden />
                      </button>
                    ) : null}
                    <ShipmentExpedienteLink shipmentId={row.id} shipmentCode={row.code} />
                    {canFinalize ? (
                      <button
                        type="button"
                        disabled={busyId === row.id || progressBusyId === row.id || priorityBusyId === row.id}
                        className={`${secondaryButtonClass} h-8 px-2 text-[10px] text-emerald-300`}
                        onClick={() => onFinalizeOpen(row)}
                        title={finalizeCopy.actionTitle}
                      >
                        {finalizeCopy.actionLabel}
                      </button>
                    ) : null}
                  </div>
                  {driverCollectionLabel(row) ? (
                    <p className="mt-1 text-[10px] font-bold text-sky-200">{driverCollectionLabel(row)}</p>
                  ) : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
