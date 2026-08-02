"use client";

import { useState } from "react";
import {
  actionConfirmButtonClass,
  type ActionConfirmTone,
} from "@/components/action-confirm-dialog";
import {
  inputClass,
  labelMutedClass,
  secondaryButtonClass,
} from "@/components/ui-blocks";

export type LiveRouteChangeReasonDialogProps = {
  open: boolean;
  changeTypeLabel: string;
  routeName: string;
  stopLabel?: string | null;
  summary: string;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: ActionConfirmTone;
  confirming?: boolean;
  error?: string | null;
  onCancel: () => void;
  onConfirm: (reason: string) => void;
};

export function LiveRouteChangeReasonDialog({
  open,
  changeTypeLabel,
  routeName,
  stopLabel,
  summary,
  confirmLabel = "Confirmar cambio",
  cancelLabel = "Cancelar",
  tone = "warning",
  confirming = false,
  error = null,
  onCancel,
  onConfirm,
}: LiveRouteChangeReasonDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <LiveRouteChangeReasonDialogBody
      key={`${changeTypeLabel}:${routeName}:${summary}`}
      changeTypeLabel={changeTypeLabel}
      routeName={routeName}
      stopLabel={stopLabel}
      summary={summary}
      confirmLabel={confirmLabel}
      cancelLabel={cancelLabel}
      tone={tone}
      confirming={confirming}
      error={error}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}

function LiveRouteChangeReasonDialogBody({
  changeTypeLabel,
  routeName,
  stopLabel,
  summary,
  confirmLabel,
  cancelLabel,
  tone,
  confirming,
  error,
  onCancel,
  onConfirm,
}: Omit<LiveRouteChangeReasonDialogProps, "open">) {
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();
  const canConfirm = trimmed.length >= 3 && !confirming;

  return (
    <div className="app-modal-overlay fixed inset-0 z-[145] flex justify-center bg-black/70 p-3 sm:p-4">
      <button
        type="button"
        aria-label="Cerrar motivo de cambio"
        className="absolute inset-0"
        onClick={onCancel}
        disabled={confirming}
      />
      <div
        id="live-route-change-reason-dialog"
        className="app-modal-content relative w-full max-w-md rounded-xl border border-black bg-surface-panel p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="live-route-change-reason-title"
      >
        <p className={labelMutedClass}>Ruta en curso</p>
        <p
          id="live-route-change-reason-title"
          className="mt-1 text-xl font-black text-[#f8fafc]"
        >
          Motivo obligatorio
        </p>

        <dl className="mt-3 space-y-2 text-sm font-bold text-slate-300">
          <div className="flex gap-2">
            <dt className="shrink-0 text-slate-500">Tipo</dt>
            <dd className="min-w-0 break-words text-slate-100">{changeTypeLabel}</dd>
          </div>
          <div className="flex gap-2">
            <dt className="shrink-0 text-slate-500">Ruta</dt>
            <dd className="min-w-0 break-words text-slate-100">{routeName}</dd>
          </div>
          {stopLabel ? (
            <div className="flex gap-2">
              <dt className="shrink-0 text-slate-500">Parada</dt>
              <dd className="min-w-0 break-words text-slate-100">{stopLabel}</dd>
            </div>
          ) : null}
          <div className="flex gap-2">
            <dt className="shrink-0 text-slate-500">Cambio</dt>
            <dd className="min-w-0 break-words text-slate-100">{summary}</dd>
          </div>
        </dl>

        <label className="mt-4 grid gap-1.5">
          <span className={labelMutedClass}>Motivo</span>
          <textarea
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className={`${inputClass} min-h-24 w-full resize-y py-3`}
            placeholder="Describe por qué se modifica la ruta activa"
            maxLength={500}
            disabled={confirming}
            autoFocus
          />
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
            disabled={confirming}
            className={`${secondaryButtonClass} h-11 text-sm font-black disabled:opacity-40`}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(trimmed)}
            disabled={!canConfirm}
            className={actionConfirmButtonClass(tone)}
          >
            {confirming ? "Guardando..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
