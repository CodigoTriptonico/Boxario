"use client";

import { History, X } from "lucide-react";
import type { LogisticsRouteCatalog } from "@/app/actions/logistics-routes";
import type { RouteMemberRow, ShipmentRow } from "@/lib/shipment-types";
import { EstadisticasAuditoriaPanel } from "@/components/estadisticas/auditoria-panel";
import { LogisticsTaskScheduleConfirmPanel } from "@/components/logistica/logistics-task-schedule-confirm-panel";
import { ShipmentCollectDialog } from "@/components/shipment-collect-dialog";
import { ShipmentJournalDialog } from "@/components/shipment-journal-dialog";
import { EnviosShipmentContextMenu, type EnviosShipmentMenuState } from "@/components/envios-shipment-context-menu";
import { isPaymentMethod, type PaymentMethod } from "@/lib/payment-methods";
import type { ShipmentCollectMode } from "@/lib/shipment-collect";
import {
  EMPTY_BOX_LEG_LABELS,
  FULL_BOX_LEG_LABELS,
} from "@/lib/shipment-leg-labels";
import type { RouteProgramTarget } from "@/components/envios/types";

type EnviosClientDialogsProps = {
  billing: {
    finalizeTarget: ShipmentRow | null;
    finalizeTotal: number;
    finalizeDeposit: number;
    finalizeBalance: number;
    finalizeCollectMode: ShipmentCollectMode;
    finalizePartialAmount: string;
    finalizePaymentMethod: PaymentMethod;
    finalizePaymentNote: string;
    busyId: string | null;
    pendingReconcileHint?: boolean;
    setFinalizeCollectMode: (mode: ShipmentCollectMode) => void;
    setFinalizePartialAmount: (value: string) => void;
    setFinalizePaymentMethod: (method: PaymentMethod) => void;
    setFinalizePaymentNote: (value: string) => void;
    closeFinalize: () => void;
    finalizeInvoice: (row: ShipmentRow) => Promise<void>;
  };
  logistics: {
    routeProgramTarget: RouteProgramTarget | null;
    routeProgramSaving: boolean;
    routeProgramContext: {
      assignedRoute?: {
        routeName: string;
        assignedTo: string | null;
        routeTemplateId: string | null;
      };
      scheduledAt: string;
      hasExistingProgramming: boolean;
      actionCopy: { title: string };
    } | null;
    routeCatalog: LogisticsRouteCatalog | null;
    routeMembers: RouteMemberRow[];
    closeProgramRoute: () => void;
    confirmProgramRoute: (input: {
      scheduledAt: string;
      driverId: string;
      routeTemplateId: string;
    }) => Promise<void>;
    confirmPendingRoute: () => Promise<void>;
  };
  contactLogTarget: ShipmentRow | null;
  onContactLogClose: () => void;
  onNotifyError: (message: string) => void;
  shipmentMenu: EnviosShipmentMenuState;
  onShipmentMenuClose: () => void;
  onOpenAudit: (shipmentId: string) => void;
  unified: boolean;
  selectedAuditShipmentId: string | null;
  canAccessAuditoria: boolean;
  onCloseAudit: () => void;
};

export function EnviosClientDialogs({
  billing,
  logistics,
  contactLogTarget,
  onContactLogClose,
  onNotifyError,
  shipmentMenu,
  onShipmentMenuClose,
  onOpenAudit,
  unified,
  selectedAuditShipmentId,
  canAccessAuditoria,
  onCloseAudit,
}: EnviosClientDialogsProps) {
  const {
    finalizeTarget,
    finalizeTotal,
    finalizeDeposit,
    finalizeBalance,
    finalizeCollectMode,
    finalizePartialAmount,
    finalizePaymentMethod,
    finalizePaymentNote,
    busyId,
    pendingReconcileHint,
    setFinalizeCollectMode,
    setFinalizePartialAmount,
    setFinalizePaymentMethod,
    setFinalizePaymentNote,
    closeFinalize,
    finalizeInvoice,
  } = billing;

  const {
    routeProgramTarget,
    routeProgramSaving,
    routeProgramContext,
    routeCatalog,
    routeMembers,
    closeProgramRoute,
    confirmProgramRoute,
    confirmPendingRoute,
  } = logistics;

  return (
    <>
      <ShipmentCollectDialog
        open={Boolean(finalizeTarget)}
        invoiceCode={finalizeTarget?.code || ""}
        customerName={finalizeTarget?.customer_name || ""}
        total={finalizeTotal}
        deposit={finalizeDeposit}
        balanceDue={finalizeBalance}
        mode={finalizeCollectMode}
        partialAmount={finalizePartialAmount}
        paymentMethod={finalizePaymentMethod}
        paymentNote={finalizePaymentNote}
        confirming={busyId === finalizeTarget?.id}
        reconcileNotice={
          pendingReconcileHint
            ? "Hay un cobro anterior sin confirmar. Se reutilizará la misma operación al continuar."
            : undefined
        }
        onModeChange={setFinalizeCollectMode}
        onPartialAmountChange={setFinalizePartialAmount}
        onPaymentMethodChange={(method) => {
          if (isPaymentMethod(method)) {
            setFinalizePaymentMethod(method);
          }
        }}
        onPaymentNoteChange={setFinalizePaymentNote}
        onCancel={closeFinalize}
        onConfirm={() => {
          if (finalizeTarget) {
            void finalizeInvoice(finalizeTarget);
          }
        }}
      />

      {routeProgramTarget && routeCatalog ? (
        <LogisticsTaskScheduleConfirmPanel
          open
          shipmentCode={routeProgramTarget.row.code}
          customerName={routeProgramTarget.row.customer_name}
          taskTypeLabel={
            routeProgramTarget.kind === "empty_box" ? "Dejar caja vacía" : "Recoger caja llena"
          }
          scheduledAt={routeProgramContext?.scheduledAt || null}
          initialRouteTemplateId={routeProgramContext?.assignedRoute?.routeTemplateId || null}
          templates={routeCatalog.templates}
          scheduleSuggestionsByWeekday={
            routeProgramTarget.kind === "full_box"
              ? routeCatalog.scheduleSuggestionsByWeekday?.pickup
              : routeCatalog.scheduleSuggestionsByWeekday?.delivery
          }
          enabledDays={routeCatalog.enabledDays}
          defaultDriverByWeekday={routeCatalog.defaultDriverByWeekday}
          weekdayScheduleByWeekday={routeCatalog.weekdayScheduleByWeekday}
          routeMembers={routeMembers}
          saving={routeProgramSaving}
          title={routeProgramContext?.actionCopy.title}
          confirmLabel={
            routeProgramContext?.hasExistingProgramming
              ? "Guardar cambios"
              : "Enviar a logística"
          }
          selectionOrder="date-first"
          showDriverPicker={false}
          allowPendingRoute
          pendingRouteLabel={
            routeProgramTarget.kind === "empty_box"
              ? EMPTY_BOX_LEG_LABELS.pendingRoute
              : FULL_BOX_LEG_LABELS.pendingRoute
          }
          onCancel={closeProgramRoute}
          onConfirm={(input) => void confirmProgramRoute(input)}
          onConfirmPendingRoute={() => void confirmPendingRoute()}
        />
      ) : null}

      {contactLogTarget ? (
        <ShipmentJournalDialog
          key={contactLogTarget.id}
          open
          shipment={contactLogTarget}
          onClose={onContactLogClose}
          onError={onNotifyError}
        />
      ) : null}

      <EnviosShipmentContextMenu
        menu={shipmentMenu}
        onClose={onShipmentMenuClose}
        onOpenAudit={onOpenAudit}
      />

      {unified && selectedAuditShipmentId && canAccessAuditoria ? (
        <div
          className="fixed inset-0 z-40 flex items-stretch justify-end bg-slate-950/70 p-2 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Auditoría del envío"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              onCloseAudit();
            }
          }}
        >
          <div className="flex h-full w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-black bg-surface-panel shadow-2xl">
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-black bg-surface-card-header px-4 py-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-700/60 bg-emerald-950/40 text-emerald-300">
                  <History className="h-4 w-4" aria-hidden />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-wide text-emerald-300">Auditoría</p>
                  <p className="truncate text-sm font-black text-[#f8fafc]">
                    Reconstrucción del invoice y sus movimientos
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onCloseAudit}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black bg-surface-inset text-slate-300 hover:bg-surface-card hover:text-[#f8fafc]"
                aria-label="Cerrar auditoría"
                title="Cerrar auditoría"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
              <EstadisticasAuditoriaPanel selectedShipmentId={selectedAuditShipmentId} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
