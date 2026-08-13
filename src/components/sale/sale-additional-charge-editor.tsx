"use client";

import { DollarSign } from "lucide-react";
import type { LogisticsAdditionalCharge } from "@/lib/invoice-billing";
import {
  isLogisticsChargeReasonTagSelected,
  type CustomerLogisticsChargeLegHistory,
  type CustomerLogisticsChargeSnapshot,
} from "@/lib/logistics-charge-history";
import {
  moneyInputDisplayValue,
  normalizeMoneyInput,
} from "@/lib/logistics-fees";

type SaleAdditionalChargeEditorProps = {
  label: string;
  value: LogisticsAdditionalCharge;
  onChange: (value: LogisticsAdditionalCharge) => void;
  history?: CustomerLogisticsChargeLegHistory;
};

function applyLastCharge(
  enabled: boolean,
  lastCharge: CustomerLogisticsChargeSnapshot | null | undefined,
): LogisticsAdditionalCharge {
  if (!enabled) {
    return { enabled: false, amount: "$0", reason: "" };
  }

  if (lastCharge) {
    return {
      enabled: true,
      amount: lastCharge.amount,
      reason: lastCharge.reason,
    };
  }

  return { enabled: true, amount: "", reason: "" };
}

export function SaleAdditionalChargeEditor({
  label,
  value,
  onChange,
  history,
}: SaleAdditionalChargeEditorProps) {
  const lastCharge = history?.lastCharge ?? null;
  const reasonTags = history?.reasonTags ?? [];

  return (
    <section className="rounded-xl border border-black bg-surface-card p-3">
      <label className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <DollarSign className="h-4 w-4 shrink-0 text-amber-300" />
          <span>
            <span className="block text-sm font-black text-white">Cargo adicional · {label}</span>
            <span className="block text-[11px] font-semibold text-slate-400">
              Opcional. El servicio normal está incluido; captura importe y razón.
            </span>
          </span>
        </span>
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(event) => onChange(applyLastCharge(event.target.checked, lastCharge))}
          className="h-5 w-5 accent-emerald-400"
        />
      </label>

      {value.enabled ? (
        <div className="mt-3 grid gap-2">
          {lastCharge ? (
            <button
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  amount: lastCharge.amount,
                  reason: lastCharge.reason,
                })
              }
              className="rounded-lg border border-emerald-700/50 bg-emerald-950/25 px-3 py-2 text-left text-[11px] font-bold text-emerald-100 transition hover:bg-emerald-950/40"
            >
              Última vez: {lastCharge.amount} · {lastCharge.reason}
            </button>
          ) : null}

          <label className="flex h-10 items-center rounded-lg border border-black bg-surface-inset px-3">
            <span className="mr-1 text-slate-400">$</span>
            <input
              inputMode="decimal"
              value={moneyInputDisplayValue(value.amount)}
              onChange={(event) =>
                onChange({ ...value, amount: normalizeMoneyInput(event.target.value) })
              }
              placeholder="0"
              className="min-w-0 flex-1 bg-transparent text-sm font-black text-white outline-none"
              aria-label={`Importe adicional por ${label}`}
            />
          </label>

          <input
            value={value.reason}
            onChange={(event) => onChange({ ...value, reason: event.target.value })}
            placeholder="Razón del cargo (obligatoria)"
            maxLength={500}
            className="h-10 rounded-lg border border-black bg-surface-inset px-3 text-sm font-bold text-white outline-none placeholder:text-slate-500"
            aria-label={`Razón del cargo adicional por ${label}`}
          />

          {reasonTags.length > 0 ? (
            <div className="flex min-w-0 flex-wrap gap-2">
              {reasonTags.map((tag) => {
                const selected = isLogisticsChargeReasonTagSelected(tag, value.reason);
                const matchesLast =
                  lastCharge &&
                  isLogisticsChargeReasonTagSelected(tag, lastCharge.reason);

                return (
                  <button
                    key={tag}
                    type="button"
                    className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${
                      selected
                        ? "border-emerald-500 bg-emerald-950/45 text-emerald-100"
                        : "border-black bg-surface-inset text-slate-300 hover:bg-surface-card"
                    }`}
                    onClick={() => {
                      if (selected) {
                        onChange({ ...value, reason: "" });
                        return;
                      }

                      onChange({
                        ...value,
                        reason: tag,
                        amount:
                          matchesLast && lastCharge ? lastCharge.amount : value.amount,
                      });
                    }}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
