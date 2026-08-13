"use client";

import { useState } from "react";
import { actionConfirmButtonClass } from "@/components/action-confirm-dialog";
import { routeStatusLabel } from "@/components/logistica/lib/constants";
import {
  inputClass,
  labelMutedClass,
  secondaryButtonClass,
} from "@/components/ui-blocks";
import { adminCompleteLogisticsTaskExceptionAction } from "@/app/actions/logistics-admin-exception-actions";
import { useNotify } from "@/hooks/use-notify";
import type { LogisticsRouteStatus } from "@/lib/logistics-routing";
import { formatLogisticsTaskStatusLabel } from "@/lib/logistics-view";
import type { LogisticsTaskStatus } from "@/lib/shipment-types";

export type LogisticsAdminTaskExceptionDialogProps = {
  open: boolean;
  taskId: string;
  shipmentCode: string;
  taskStatus: string;
  routeName?: string | null;
  routeStatus?: string | null;
  onCancel: () => void;
  onCompleted: () => void;
};

const emptyMemberById = new Map<string, string>();

function humanTaskStatus(status: string) {
  return formatLogisticsTaskStatusLabel(
    status as LogisticsTaskStatus,
    null,
    emptyMemberById,
  );
}

function humanRouteStatus(status: string | null | undefined) {
  if (!status) {
    return null;
  }

  return routeStatusLabel[status as LogisticsRouteStatus] || status;
}

export function LogisticsAdminTaskExceptionDialog({
  open,
  taskId,
  shipmentCode,
  taskStatus,
  routeName,
  routeStatus,
  onCancel,
  onCompleted,
}: LogisticsAdminTaskExceptionDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <LogisticsAdminTaskExceptionDialogBody
      key={taskId}
      taskId={taskId}
      shipmentCode={shipmentCode}
      taskStatus={taskStatus}
      routeName={routeName}
      routeStatus={routeStatus}
      onCancel={onCancel}
      onCompleted={onCompleted}
    />
  );
}

function LogisticsAdminTaskExceptionDialogBody({
  taskId,
  shipmentCode,
  taskStatus,
  routeName,
  routeStatus,
  onCancel,
  onCompleted,
}: Omit<LogisticsAdminTaskExceptionDialogProps, "open">) {
  const notify = useNotify();
  const [reason, setReason] = useState("");
  const [riskAcknowledged, setRiskAcknowledged] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const routeStatusText = humanRouteStatus(routeStatus);
  const contextSummary = routeName
    ? routeStatusText
      ? `La ruta “${routeName}” está ${routeStatusText.toLowerCase()}. Normalmente la tarea solo se completa cuando la ruta ya está en curso.`
      : `La ruta “${routeName}” no está en curso. Normalmente la tarea solo se completa cuando la ruta ya está en curso.`
    : "Normalmente la tarea solo se completa cuando la ruta ya está en curso.";

  const trimmed = reason.trim();
  const canConfirm = trimmed.length >= 3 && riskAcknowledged && !busy;

  async function confirm() {
    if (!canConfirm) {
      setError(
        !riskAcknowledged
          ? "Debes confirmar que entiendes el riesgo"
          : "Indica un motivo de al menos 3 caracteres",
      );
      return;
    }

    setBusy(true);
    setError(null);
    const result = await adminCompleteLogisticsTaskExceptionAction({
      taskId,
      reason: trimmed,
      riskAcknowledged: true,
    });
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      notify.error(result.error);
      return;
    }

    notify.success("Tarea completada fuera del flujo normal");
    onCompleted();
  }

  return (
    <div className="app-modal-overlay fixed inset-0 z-[150] flex justify-center bg-black/70 p-3 sm:p-4">
      <button
        type="button"
        aria-label="Cerrar completar fuera del flujo"
        className="absolute inset-0"
        onClick={onCancel}
        disabled={busy}
      />
      <div
        className="app-modal-content relative w-full max-w-md rounded-xl border border-amber-800/70 bg-surface-panel p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-task-exception-title"
      >
        <p className={`${labelMutedClass} text-amber-300`}>Solo si hace falta</p>
        <p id="admin-task-exception-title" className="mt-1 text-xl font-black text-[#f8fafc]">
          Completar tarea fuera del flujo normal
        </p>
        <p className="mt-2 text-sm font-bold text-slate-400">
          No uses esto para el día a día del conductor. Queda registrado en auditoría.
        </p>

        <dl className="mt-3 space-y-2 text-sm font-bold text-slate-300">
          <div className="flex gap-2">
            <dt className="shrink-0 text-slate-500">Invoice</dt>
            <dd className="min-w-0 break-words text-slate-100">{shipmentCode}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 text-slate-500">Estado</dt>
            <dd className="min-w-0 break-words text-slate-100">{humanTaskStatus(taskStatus)}</dd>
          </div>
          {routeName ? (
            <div className="flex gap-2">
              <dt className="shrink-0 text-slate-500">Ruta</dt>
              <dd className="min-w-0 break-words text-slate-100">
                {routeName}
                {routeStatusText ? ` · ${routeStatusText}` : ""}
              </dd>
            </div>
          ) : null}
        </dl>

        <p className="mt-3 text-sm font-bold text-amber-100">{contextSummary}</p>

        <div className="mt-3 rounded-lg border border-amber-800/60 bg-amber-950/35 px-3 py-2 text-xs font-bold text-amber-100">
          Riesgo: puede desordenar cobro, custodia o inventario si la tarea no se hizo de verdad.
        </div>

        <label className="mt-4 grid gap-1.5">
          <span className={labelMutedClass}>Motivo obligatorio</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className={`${inputClass} min-h-24 w-full resize-y py-3`}
            placeholder="Por qué hay que completar esta tarea ahora"
            maxLength={500}
            disabled={busy}
            autoFocus
          />
        </label>

        <label className="mt-3 flex min-h-11 items-start gap-3 rounded-lg border border-black bg-surface-inset px-3 py-2">
          <input
            type="checkbox"
            checked={riskAcknowledged}
            onChange={(event) => setRiskAcknowledged(event.target.checked)}
            className="mt-0.5 h-5 w-5 accent-amber-400"
            disabled={busy}
          />
          <span className="text-sm font-bold text-slate-200">
            Entiendo el riesgo y confirmo que hace falta completar la tarea así.
          </span>
        </label>

        {error ? (
          <p role="alert" className="mt-3 text-sm font-black text-rose-200">
            {error}
          </p>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className={`${secondaryButtonClass} h-11 text-sm font-black disabled:opacity-40`}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => void confirm()}
            disabled={!canConfirm}
            className={actionConfirmButtonClass("warning")}
          >
            {busy ? "Aplicando..." : "Completar ahora"}
          </button>
        </div>
      </div>
    </div>
  );
}
