"use client";

import { Calculator, ChevronLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { loadAxisSettingsAction } from "@/app/actions/axis-settings";
import { SalePaymentMethodField } from "@/components/sale/sale-payment-method-field";
import {
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
} from "@/components/ui-blocks";
import { formatMoneyValue, moneyInputDisplayValue, normalizeMoneyInput } from "@/lib/logistics-fees";
import type { SalePaymentSelection } from "@/lib/sale-payment-choice";
import {
  DEFAULT_PAYMENT_METHOD_SETTINGS,
  isPaymentMethod,
  type PaymentMethodSettings,
} from "@/lib/payment-methods";
import {
  shipmentCollectCopy,
  type ShipmentCollectMode,
} from "@/lib/shipment-collect";

type ShipmentCollectDialogProps = {
  open: boolean;
  invoiceCode: string;
  customerName: string;
  total: number;
  deposit: number;
  depositRequired?: number;
  balanceDue: number;
  mode: ShipmentCollectMode;
  partialAmount: string;
  paymentMethod: SalePaymentSelection;
  paymentNote?: string;
  confirming?: boolean;
  /** Shown when a previous send may have committed and must be reconciled. */
  reconcileNotice?: string;
  onModeChange: (mode: ShipmentCollectMode) => void;
  onPartialAmountChange: (value: string) => void;
  onPaymentMethodChange: (method: SalePaymentSelection) => void;
  onPaymentNoteChange?: (note: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function ShipmentCollectDialog({
  open,
  invoiceCode,
  customerName,
  total,
  deposit,
  depositRequired = 0,
  balanceDue,
  mode,
  partialAmount,
  paymentMethod,
  paymentNote = "",
  confirming = false,
  reconcileNotice = "",
  onModeChange,
  onPartialAmountChange,
  onPaymentMethodChange,
  onPaymentNoteChange,
  onCancel,
  onConfirm,
}: ShipmentCollectDialogProps) {
  const [paymentSettings, setPaymentSettings] = useState<PaymentMethodSettings>(
    DEFAULT_PAYMENT_METHOD_SETTINGS,
  );

  useEffect(() => {
    if (!open) return;
    let active = true;
    void loadAxisSettingsAction().then((result) => {
      if (!active || !result.ok) return;
      setPaymentSettings(result.data.sales);
      if (
        isPaymentMethod(paymentMethod) &&
        !result.data.sales.acceptedPaymentMethods.includes(paymentMethod)
      ) {
        onPaymentMethodChange(result.data.sales.defaultPaymentMethod);
      }
    });
    return () => {
      active = false;
    };
  }, [open, onPaymentMethodChange, paymentMethod]);

  if (!open) {
    return null;
  }

  const copy = shipmentCollectCopy(balanceDue, mode);
  const partialAmountValue = parseMoneyValueSafe(partialAmount);
  const projectedBalance = Math.max(balanceDue - partialAmountValue, 0);
  const canConfirmPartial = partialAmountValue > 0 && partialAmountValue <= balanceDue;

  return (
    <div className="fixed inset-0 z-[140] flex items-center justify-center bg-black/70 p-4">
      <div
        className="w-full max-w-md rounded-xl border border-black bg-surface-panel p-5 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shipment-collect-title"
      >
        <div className="flex items-start gap-2">
          {mode !== "choose" ? (
            <button
              type="button"
              onClick={() => onModeChange("choose")}
              disabled={confirming}
              className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-black bg-surface-inset text-slate-300 hover:bg-surface-card disabled:opacity-40"
              aria-label="Volver"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : null}
          <div className="min-w-0 flex-1">
            <p id="shipment-collect-title" className="text-xl font-black text-[#f8fafc]">
              {copy.title}
            </p>
            <p className="mt-1 text-sm font-bold text-slate-400">
              {invoiceCode} · {customerName}
            </p>
            {reconcileNotice ? (
              <p className="mt-2 text-xs font-bold text-amber-200" role="status">
                {reconcileNotice}
              </p>
            ) : null}
          </div>
        </div>

        {mode === "choose" ? (
          <>
            <dl className="mt-4 divide-y divide-black/70 border-y border-black/70 text-sm">
              <div className="flex items-center justify-between gap-3 py-2">
                <dt className="font-bold text-slate-400">Total</dt>
                <dd className="font-black tabular-nums text-[#f8fafc]">{formatMoneyValue(total)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2">
                <dt className="font-bold text-slate-400">Pagado</dt>
                <dd className="font-black tabular-nums text-emerald-300">{formatMoneyValue(deposit)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2">
                <dt className="font-bold text-slate-400">Pendiente {depositRequired > 0 ? <span className="text-[10px] text-slate-500">· Mínimo de depósito {formatMoneyValue(depositRequired)}</span> : null}</dt>
                <dd className="font-black tabular-nums text-amber-300">{formatMoneyValue(balanceDue)}</dd>
              </div>
            </dl>

            <div className="mt-4 grid gap-2">
              <button
                type="button"
                onClick={() => onModeChange("full")}
                disabled={confirming}
                className={`${secondaryButtonClass} h-auto min-h-11 flex-col items-start gap-0.5 px-4 py-3 text-left disabled:opacity-40`}
              >
                <span className="block text-sm font-black text-[#f8fafc]">{copy.fullOptionLabel}</span>
                <span className="mt-0.5 block text-xs font-bold text-slate-400">
                  {copy.fullOptionDetail}
                </span>
              </button>
              <button
                type="button"
                onClick={() => onModeChange("partial")}
                disabled={confirming}
                className={`${secondaryButtonClass} h-auto min-h-11 flex-col items-start gap-0.5 px-4 py-3 text-left disabled:opacity-40`}
              >
                <span className="block text-sm font-black text-[#f8fafc]">{copy.partialOptionLabel}</span>
                <span className="mt-0.5 block text-xs font-bold text-slate-400">
                  {copy.partialOptionDetail}
                </span>
              </button>
            </div>

            <button
              type="button"
              onClick={onCancel}
              disabled={confirming}
              className={`${secondaryButtonClass} mt-4 h-11 w-full text-sm font-black disabled:opacity-40`}
            >
              Cancelar
            </button>
          </>
        ) : (
          <>
            <dl className="mt-4 divide-y divide-black/70 border-y border-black/70 text-sm">
              <div className="flex items-center justify-between gap-3 py-2">
                <dt className="font-bold text-slate-400">Total</dt>
                <dd className="font-black tabular-nums text-[#f8fafc]">{formatMoneyValue(total)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 py-2">
                <dt className="font-bold text-slate-400">Pagado</dt>
                <dd className="font-black tabular-nums text-emerald-300">{formatMoneyValue(deposit)}</dd>
              </div>
              {mode === "full" ? (
                <div className="flex items-center justify-between gap-3 py-2">
                  <dt className="font-bold text-slate-400">{copy.pendingLineLabel}</dt>
                  <dd className="font-black tabular-nums text-amber-300">
                    {formatMoneyValue(balanceDue)}
                  </dd>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-3 py-2">
                    <dt className="font-bold text-slate-400">Pendiente {depositRequired > 0 ? <span className="text-[10px] text-slate-500">· Mínimo de depósito {formatMoneyValue(depositRequired)}</span> : null}</dt>
                    <dd className="font-black tabular-nums text-amber-300">
                      {formatMoneyValue(balanceDue)}
                    </dd>
                  </div>
                  {partialAmountValue > 0 ? (
                    <div className="flex items-center justify-between gap-3 py-2">
                      <dt className="font-bold text-slate-400">{copy.pendingLineLabel}</dt>
                      <dd className="font-black tabular-nums text-[#f8fafc]">
                        {formatMoneyValue(projectedBalance)}
                      </dd>
                    </div>
                  ) : null}
                </>
              )}
            </dl>

            {mode === "partial" ? (
              <label className="mt-4 grid gap-1.5 text-xs font-black uppercase text-slate-400">
                {copy.amountLabel}
                <div className="flex items-center gap-1">
                  <span className="text-sm font-black text-slate-300">$</span>
                  <input
                    className={`${inputClass} h-11 flex-1 text-sm tabular-nums`}
                    inputMode="decimal"
                    placeholder={moneyInputDisplayValue(formatMoneyValue(balanceDue)) || "0"}
                    value={moneyInputDisplayValue(partialAmount)}
                    disabled={confirming}
                    onChange={(event) =>
                      onPartialAmountChange(normalizeMoneyInput(event.target.value))
                    }
                    autoFocus
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onPartialAmountChange(formatMoneyValue(balanceDue))}
                  disabled={confirming}
                  className="w-fit text-left normal-case text-xs font-black text-emerald-300 hover:text-emerald-200 disabled:opacity-40"
                >
                  Liquidar saldo: {formatMoneyValue(balanceDue)}
                </button>
                <span className="normal-case text-xs font-bold text-slate-500">
                  Máximo permitido: {formatMoneyValue(balanceDue)}
                </span>
                {paymentMethod === "cash" && partialAmountValue > 0 ? <CashChangeCalculator paymentAmount={partialAmountValue} /> : null}
              </label>
            ) : null}

            <SalePaymentMethodField
              className="mt-4"
              value={paymentMethod}
              note={paymentNote}
              hideDepositStatus
              disabled={confirming}
              paymentSettings={paymentSettings}
              onChange={onPaymentMethodChange}
              onNoteChange={onPaymentNoteChange}
            />


            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={confirming}
                className={`${secondaryButtonClass} h-11 text-sm font-black disabled:opacity-40`}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={confirming || (mode === "partial" && !canConfirmPartial) || (isPaymentMethod(paymentMethod) && paymentSettings.referenceRequiredMethods.includes(paymentMethod) && !paymentNote.trim())}
                className={`${primaryButtonClass} h-11 text-sm font-black disabled:opacity-40`}
              >
                {confirming ? copy.confirmingLabel : copy.confirmLabel}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function parseMoneyValueSafe(value: string) {
  return Number(value.replace(/[^\d.-]/g, "")) || 0;
}

function CashChangeCalculator({ paymentAmount }: { paymentAmount: number }) {
  const [received, setReceived] = useState("");
  const receivedAmount = parseMoneyValueSafe(received);
  const difference = receivedAmount - paymentAmount;

  return <div className="mt-3 rounded-lg border border-black bg-surface-inset p-3 normal-case"><p className="inline-flex items-center gap-1.5 text-xs font-black text-emerald-300"><Calculator className="h-4 w-4" />Efectivo y cambio</p><label className="mt-2 grid gap-1.5 text-xs font-black uppercase text-slate-400">Efectivo que entrega el cliente<div className="flex items-center gap-1"><span className="text-sm font-black text-slate-300">$</span><input className={`${inputClass} h-10 flex-1 text-sm tabular-nums`} inputMode="decimal" value={moneyInputDisplayValue(received)} onChange={(event) => setReceived(normalizeMoneyInput(event.target.value))} placeholder="0" autoFocus /></div></label><div className="mt-2 flex flex-wrap gap-2">{[20, 50, 100].map((bill) => <button key={bill} type="button" onClick={() => setReceived(String(receivedAmount + bill))} className="rounded-md border border-black bg-surface-card px-2 py-1 text-xs font-black text-slate-300">+${bill}</button>)}</div>{receivedAmount > 0 ? <p className={`mt-3 text-sm font-black ${difference > 0 ? "text-amber-200" : difference < 0 ? "text-rose-300" : "text-emerald-300"}`}>{difference > 0 ? `Devuelve ${formatMoneyValue(difference)}` : difference < 0 ? `Faltan ${formatMoneyValue(Math.abs(difference))}` : "Pago exacto"}</p> : <p className="mt-3 text-xs font-bold text-slate-500">Ingresa el efectivo para calcular el cambio.</p>}</div>;
}
