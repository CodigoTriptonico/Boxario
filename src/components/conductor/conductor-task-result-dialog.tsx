"use client";

import { Camera, CheckCircle2, Loader2, X, XCircle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { loadAxisSettingsAction } from "@/app/actions/axis-settings";
import { inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui-blocks";
import { formatMoneyValue } from "@/lib/logistics-fees";
import {
  DEFAULT_PAYMENT_METHOD_SETTINGS,
  paymentMethodOptionsFor,
  type PaymentMethod,
  type PaymentMethodSettings,
} from "@/lib/payment-methods";
import type { ConductorPaymentChoice } from "@/lib/conductor-driver-payment";
import { CONDUCTOR_TASK_FAILURE_REASONS } from "@/lib/conductor-truck-inventory";
import type { ConductorDriverTask } from "@/lib/conductor-tasks";

type TaskDialogState = {
  task: ConductorDriverTask;
  result: "completed" | "failed";
};

type ConductorTaskResultDialogProps = {
  dialog: TaskDialogState;
  saving: boolean;
  failureReason: string;
  note: string;
  evidence: File | null;
  invoiceVisible: boolean;
  paymentChoice: ConductorPaymentChoice | null;
  paymentAmount: string;
  paymentMethod: PaymentMethod;
  boxInvoicesLabel: string;
  paymentExpectedAmount: number;
  needsPaymentChoice: boolean;
  dialogNeedsPhoto: boolean;
  onClose: () => void;
  onFailureReasonChange: (reason: string) => void;
  onNoteChange: (note: string) => void;
  onEvidenceChange: (file: File | null) => void;
  onInvoiceVisibleChange: (visible: boolean) => void;
  onPaymentChoiceChange: (choice: ConductorPaymentChoice) => void;
  onPaymentAmountChange: (amount: string) => void;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onSubmit: () => void;
};

export function ConductorTaskResultDialog({
  dialog,
  saving,
  failureReason,
  note,
  evidence,
  invoiceVisible,
  paymentChoice,
  paymentAmount,
  paymentMethod,
  boxInvoicesLabel,
  paymentExpectedAmount,
  needsPaymentChoice,
  dialogNeedsPhoto,
  onClose,
  onFailureReasonChange,
  onNoteChange,
  onEvidenceChange,
  onInvoiceVisibleChange,
  onPaymentChoiceChange,
  onPaymentAmountChange,
  onPaymentMethodChange,
  onSubmit,
}: ConductorTaskResultDialogProps) {
  const [paymentSettings, setPaymentSettings] = useState<PaymentMethodSettings>(
    DEFAULT_PAYMENT_METHOD_SETTINGS,
  );

  useEffect(() => {
    let active = true;
    void loadAxisSettingsAction().then((result) => {
      if (!active || !result.ok) return;
      setPaymentSettings(result.data.sales);
      if (!result.data.sales.driverPaymentMethods.includes(paymentMethod)) {
        onPaymentMethodChange(
          result.data.sales.driverPaymentMethods[0] || result.data.sales.defaultPaymentMethod,
        );
      }
    });
    return () => {
      active = false;
    };
  }, [onPaymentMethodChange, paymentMethod]);

  const driverPaymentOptions = useMemo(
    () => paymentMethodOptionsFor(paymentSettings.driverPaymentMethods),
    [paymentSettings.driverPaymentMethods],
  );
  const paymentReferenceRequired = paymentSettings.referenceRequiredMethods.includes(paymentMethod);

  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/70 p-3 sm:p-4">
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0"
        disabled={saving}
        onClick={onClose}
      />
      <div className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-black bg-surface-panel shadow-2xl">
        <div className="flex items-start gap-3 border-b border-black bg-surface-card-header px-4 py-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-black ${dialog.result === "completed" ? "bg-emerald-400" : "bg-rose-400"} text-slate-950`}>
            {dialog.result === "completed" ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-black text-[#f8fafc]">
              {dialog.result === "completed" ? "Confirmar tarea" : "Cancelar visita"}
            </p>
            <p className="truncate text-xs font-black text-slate-400">
              {dialog.task.shipmentCode} - {dialog.task.senderName}
            </p>
          </div>
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black bg-surface-inset text-slate-300"
            disabled={saving}
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid gap-3 overflow-y-auto p-4">
          {dialog.result === "failed" ? (
            <label className="grid gap-1.5 text-xs font-black text-slate-400">
              Razón
              <select
                className={`${inputClass} text-sm`}
                value={failureReason}
                disabled={saving}
                onChange={(event) => onFailureReasonChange(event.target.value)}
              >
                {CONDUCTOR_TASK_FAILURE_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {reason}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {dialog.result === "completed" ? (
            <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-emerald-500/50 bg-emerald-500/10 p-3 text-sm font-black text-emerald-50">
              <input
                className="mt-0.5 h-5 w-5 accent-emerald-400"
                type="checkbox"
                checked={invoiceVisible}
                disabled={saving}
                onChange={(event) => onInvoiceVisibleChange(event.target.checked)}
              />
              <span>
                Confirmo que la factura de cada caja <span className="font-mono text-emerald-300">{boxInvoicesLabel}</span> esta escrita con marcador y se ve clara en la caja.
              </span>
            </label>
          ) : null}

          <label className="grid gap-1.5 text-xs font-black text-slate-400">
            Foto {dialogNeedsPhoto ? "obligatoria" : "opcional"}
            {dialog.result === "completed" ? (
              <span className="normal-case text-slate-300">La foto debe mostrar el invoice escrito en la caja.</span>
            ) : failureReason === "Invoice no visible" ? (
              <span className="normal-case text-rose-300">Toma una foto para dejar evidencia de que falta el invoice.</span>
            ) : null}
            <span className="flex min-h-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-black bg-surface-inset px-3 py-4 text-center text-sm font-black text-slate-300">
              <Camera className="mb-2 h-6 w-6 text-slate-500" />
              {evidence ? evidence.name : "Tomar o subir foto"}
              <input
                className="sr-only"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                disabled={saving}
                onChange={(event) => onEvidenceChange(event.target.files?.[0] || null)}
              />
            </span>
          </label>

          {needsPaymentChoice ? (
            <div className="grid gap-3 rounded-lg border border-black bg-surface-card p-3">
              <p className="text-xs font-black uppercase text-slate-500">Cobro de depósito</p>
              <p className="text-sm font-black text-slate-200">
                Esperado: {formatMoneyValue(paymentExpectedAmount)}
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  disabled={saving}
                  className={`${paymentChoice === "expected" ? primaryButtonClass : secondaryButtonClass} min-h-12 text-sm`}
                  onClick={() => onPaymentChoiceChange("expected")}
                >
                  Recibí {formatMoneyValue(paymentExpectedAmount)}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  className={`${paymentChoice === "custom" ? primaryButtonClass : secondaryButtonClass} min-h-12 text-sm`}
                  onClick={() => onPaymentChoiceChange("custom")}
                >
                  Recibí otro monto
                </button>
                <button
                  type="button"
                  disabled={saving}
                  className={`${paymentChoice === "none" ? primaryButtonClass : secondaryButtonClass} min-h-12 text-sm`}
                  onClick={() => onPaymentChoiceChange("none")}
                >
                  No recibí dinero
                </button>
              </div>
              {paymentChoice === "none" ? (
                <p className="text-xs font-black text-amber-200">
                  El saldo seguira pendiente. Escribe abajo por que no recibiste dinero.
                </p>
              ) : null}
              {paymentChoice === "custom" ? (
                <label className="grid gap-1.5 text-xs font-black text-slate-400">
                  Monto recibido
                  <input
                    className={inputClass}
                    value={paymentAmount}
                    disabled={saving}
                    inputMode="decimal"
                    placeholder={formatMoneyValue(paymentExpectedAmount)}
                    onChange={(event) => onPaymentAmountChange(event.target.value)}
                  />
                </label>
              ) : null}
              {paymentChoice && paymentChoice !== "none" ? (
                <label className="grid gap-1.5 text-xs font-black text-slate-400">
                  Método
                  <select
                    className={inputClass}
                    value={paymentMethod}
                    disabled={saving}
                    onChange={(event) => onPaymentMethodChange(event.target.value as PaymentMethod)}
                  >
                    {driverPaymentOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          ) : null}

          <label className="grid gap-1.5 text-xs font-black text-slate-400">
            {paymentChoice === "none"
              ? "Motivo de cobro pendiente"
              : paymentReferenceRequired && paymentChoice
              ? "Nota / referencia obligatoria"
              : "Nota"}
            <textarea
              className="min-h-24 rounded-lg border border-black bg-surface-inset px-3 py-2 text-sm font-bold leading-snug text-[#f8fafc] outline-none placeholder:text-slate-500 disabled:opacity-50"
              value={note}
              maxLength={1000}
              disabled={saving}
              placeholder={dialog.result === "completed" ? "Ej. Dejadas en puerta principal." : "Ej. Llame 2 veces, no contestaron."}
              onChange={(event) => onNoteChange(event.target.value)}
            />
          </label>

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              className={`${secondaryButtonClass} h-11 text-sm`}
              disabled={saving}
              onClick={onClose}
            >
              Cerrar
            </button>
            <button
              type="button"
              className={`${primaryButtonClass} h-11 text-sm disabled:cursor-not-allowed disabled:opacity-40`}
              disabled={saving || (dialogNeedsPhoto && !evidence) || (dialog.result === "completed" && !invoiceVisible) || (needsPaymentChoice && !paymentChoice) || (paymentChoice === "none" && note.trim().length < 3) || (paymentReferenceRequired && paymentChoice !== "none" && !note.trim())}
              onClick={onSubmit}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Guardar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
