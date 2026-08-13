import type { ReactNode } from "react";
import { formatMoneyValue } from "@/lib/logistics-fees";
import type { ShipmentPaymentProgress as ShipmentPaymentProgressData } from "@/lib/shipment-display";

function barFillClass(status: ShipmentPaymentProgressData["status"]) {
  if (status === "paid" || status === "partial") {
    return "bg-emerald-400";
  }

  if (status === "void") {
    return "bg-slate-600";
  }

  return "bg-surface-inset";
}

export function ShipmentPaymentProgress({
  progress,
  action,
  compact = false,
  summaryRow = false,
}: {
  progress: ShipmentPaymentProgressData;
  action?: ReactNode;
  compact?: boolean;
  summaryRow?: boolean;
}) {
  const fillWidth = progress.status === "void" ? 0 : progress.percentPaid;

  if (compact) {
    return (
      <div className={`w-full min-w-0 border-y border-black/60 ${summaryRow ? "py-1.5" : "py-2"}`}>
        <div className="grid grid-cols-3 gap-2">
          <div className="min-w-0">
            <p className="text-[8px] font-black uppercase leading-none text-slate-500">Total</p>
            <p className="mt-1 whitespace-nowrap text-[11px] font-black tabular-nums text-slate-100">
              {formatMoneyValue(progress.total)}
            </p>
          </div>
          <div className="min-w-0 border-l border-black/50 pl-2">
            <p className="text-[8px] font-black uppercase leading-none text-slate-500">Pagado</p>
            <p className="mt-1 whitespace-nowrap text-[11px] font-black tabular-nums text-emerald-300">
              {formatMoneyValue(progress.paid)}
            </p>
          </div>
          <div className="min-w-0 border-l border-black/50 pl-2">
            <p className="text-[8px] font-black uppercase leading-none text-slate-500">Saldo</p>
            <p className={`mt-1 whitespace-nowrap text-[11px] font-black tabular-nums ${progress.pending > 0 ? "text-amber-200" : "text-emerald-300"}`}>
              {formatMoneyValue(progress.pending)}
            </p>
          </div>
        </div>

        <div
          className={`overflow-hidden rounded-full bg-black/30 ${summaryRow ? "mt-1 h-1" : "mt-1.5 h-1"}`}
        >
          <div
            className={`h-full rounded-full transition-[width] ${barFillClass(progress.status)}`}
            style={{ width: `${fillWidth}%` }}
            role="progressbar"
            aria-valuenow={fillWidth}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${fillWidth}% pagado`}
          />
        </div>
        {!summaryRow ? (
          <div className="mt-1 flex items-center justify-between gap-2 text-[10px] font-black leading-none text-slate-500">
            <span>{progress.statusLabel}</span>
            {action}
          </div>
        ) : (
          <p className="mt-0.5 truncate text-[9px] font-black leading-none text-slate-500">
            {progress.statusLabel}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Pago</p>
        {action}
      </div>

      <p className="text-2xl font-black tabular-nums text-[#f8fafc]">
        {formatMoneyValue(progress.total)}
      </p>

      <div className="mt-3 h-2 overflow-hidden rounded-full border border-black bg-surface-inset">
        <div
          className={`h-full rounded-full transition-[width] ${barFillClass(progress.status)}`}
          style={{ width: `${fillWidth}%` }}
          role="progressbar"
          aria-valuenow={fillWidth}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${fillWidth}% pagado`}
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold">
        <span className="tabular-nums text-emerald-300">
          Pagado {formatMoneyValue(progress.paid)}
        </span>
        {progress.pending > 0 ? (
          <span className="tabular-nums text-amber-200">
            Pendiente {formatMoneyValue(progress.pending)}
          </span>
        ) : null}
      </div>
    </div>
  );
}
