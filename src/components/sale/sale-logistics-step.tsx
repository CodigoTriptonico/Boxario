"use client";

import {
  Building2,
  DollarSign,
  Truck,
} from "lucide-react";
import type { LogisticsAdditionalCharge } from "@/lib/invoice-billing";
import {
  logisticsAdditionalChargeRequiresReason,
} from "@/lib/invoice-billing";
import {
  moneyInputDisplayValue,
  normalizeMoneyInput,
} from "@/lib/logistics-fees";
import {
  deliveryModeCardClass,
  deliveryModeIconClass,
  deliverySummary,
  EMPTY_BOX_DRIVER_MODE,
  EMPTY_BOX_OFFICE_MODE,
  FULL_BOX_DEFERRED_SUMMARY,
  FULL_BOX_DRIVER_MODE,
  FULL_BOX_OFFICE_MODE,
  fullBoxSummaryLine,
  logisticsLegComplete,
} from "@/components/sale/venta-parts";

type SaleLogisticsStepProps = {
  emptyBoxMode: string;
  emptyBoxScheduleMode: string;
  emptyBoxScheduleAt: string;
  fullBoxMode: string;
  fullBoxScheduleMode: string;
  fullBoxScheduleAt: string;
  emptyBoxRouteSummary: string;
  fullBoxRouteSummary: string;
  onSelectEmptyBoxMode: (mode: string) => void;
  onSelectFullBoxMode: (mode: string) => void;
  fullBoxPickupExpanded: boolean;
  onExpandFullBoxPickup: () => void;
  onDeferFullBoxPickup: () => void;
  emptyBoxCharge: LogisticsAdditionalCharge;
  fullBoxCharge: LogisticsAdditionalCharge;
  emptyBoxChargeSuggestion: string;
  fullBoxChargeSuggestion: string;
  onEmptyBoxChargeChange: (charge: LogisticsAdditionalCharge) => void;
  onFullBoxChargeChange: (charge: LogisticsAdditionalCharge) => void;
};

function AdditionalChargeEditor({
  label,
  suggestion,
  value,
  onChange,
}: {
  label: string;
  suggestion: string;
  value: LogisticsAdditionalCharge;
  onChange: (value: LogisticsAdditionalCharge) => void;
}) {
  const reasonRequired = logisticsAdditionalChargeRequiresReason(value, suggestion);
  return (
    <section className="rounded-xl border border-black bg-surface-card p-3">
      <label className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <DollarSign className="h-4 w-4 shrink-0 text-amber-300" />
          <span>
            <span className="block text-sm font-black text-white">Cargo adicional · {label}</span>
            <span className="block text-[11px] font-semibold text-slate-400">Sugerido {suggestion}; el servicio normal está incluido.</span>
          </span>
        </span>
        <input
          type="checkbox"
          checked={value.enabled}
          onChange={(event) =>
            onChange({
              ...value,
              enabled: event.target.checked,
              amount: event.target.checked ? suggestion : "$0",
              reason: "",
            })
          }
          className="h-5 w-5 accent-emerald-400"
        />
      </label>
      {value.enabled ? (
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <label className="flex h-10 items-center rounded-lg border border-black bg-surface-inset px-3">
            <span className="mr-1 text-slate-400">$</span>
            <input
              inputMode="decimal"
              value={moneyInputDisplayValue(value.amount)}
              onChange={(event) => onChange({ ...value, amount: normalizeMoneyInput(event.target.value) })}
              className="min-w-0 flex-1 bg-transparent text-sm font-black text-white outline-none"
              aria-label={`Importe adicional por ${label}`}
            />
          </label>
          {reasonRequired ? (
            <input
              value={value.reason}
              onChange={(event) => onChange({ ...value, reason: event.target.value })}
              placeholder="Razón del ajuste (obligatoria)"
              maxLength={500}
              className="h-10 rounded-lg border border-amber-700/70 bg-surface-inset px-3 text-sm font-bold text-white outline-none placeholder:text-amber-200/60"
            />
          ) : (
            <p className="self-center text-xs font-semibold text-emerald-300">Se usará la sugerencia de Logística.</p>
          )}
        </div>
      ) : null}
    </section>
  );
}

function StepBadge({
  step,
  complete,
}: {
  step: 1 | 2;
  complete: boolean;
}) {
  return (
    <span
      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-xs font-black shadow-[0_4px_14px_rgba(0,0,0,0.25)] sm:h-9 sm:w-9 sm:text-sm ${
        complete
          ? "border-emerald-600 bg-emerald-400 text-slate-950"
          : "border-black bg-[#3a4842] text-emerald-300"
      }`}
    >
      {step}
    </span>
  );
}

function MovementCard({
  step,
  title,
  hint,
  summary,
  complete,
  mode,
  officeMode,
  driverMode,
  officeLabel,
  driverLabel,
  officeDetail,
  driverDetail,
  onSelectMode,
  showOfficeHandingOption = false,
}: {
  step: 1 | 2;
  title: string;
  hint: string;
  summary: string;
  complete: boolean;
  mode: string;
  officeMode: string;
  driverMode: string;
  officeLabel: string;
  driverLabel: string;
  officeDetail: string;
  driverDetail: string;
  onSelectMode: (mode: string) => void;
  showOfficeHandingOption?: boolean;
}) {
  const officeSelected = mode === officeMode;
  const driverSelected = mode === driverMode;
  const hasSelection = Boolean(mode);
  const compactOfficeSelection = officeSelected && showOfficeHandingOption;

  return (
    <section
      className={`flex min-w-0 flex-col rounded-xl p-[2px] shadow-[0_6px_20px_rgba(0,0,0,0.18)] transition-colors ${
        complete ? "bg-emerald-700/50" : "bg-black"
      }`}
    >
      <div className="flex min-w-0 flex-1 flex-col rounded-[10px] bg-[#3a4842] p-3 sm:p-4">
        <div className="mb-3 flex items-start gap-2.5 sm:mb-4 sm:gap-3">
          <StepBadge step={step} complete={complete} />
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
              {step === 1 ? "Primero" : "Después"}
            </p>
            <h3 className="mt-0.5 text-base font-black leading-snug text-[#f8fafc] sm:text-lg">{title}</h3>
            <p className="mt-1 text-xs font-bold leading-snug text-slate-400 sm:text-sm">{hint}</p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onSelectMode(officeMode)}
            className={`min-h-[4rem] rounded-xl border p-2.5 text-left transition sm:min-h-[4.75rem] sm:p-3 ${deliveryModeCardClass(
              officeSelected,
            )}`}
          >
            <span className="flex items-start gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${deliveryModeIconClass(
                  officeSelected,
                )}`}
              >
                <Building2 className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span
                  className={`block text-sm font-black ${officeSelected ? "text-emerald-50" : "text-[#f8fafc]"}`}
                >
                  {officeLabel}
                </span>
                <span
                  className={`mt-1 block text-xs font-bold leading-snug ${
                    officeSelected ? "text-emerald-100/80" : "text-slate-300"
                  }`}
                >
                  {officeDetail}
                </span>
              </span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectMode(driverMode)}
            className={`min-h-[4rem] rounded-xl border p-2.5 text-left transition sm:min-h-[4.75rem] sm:p-3 ${deliveryModeCardClass(
              driverSelected,
            )}`}
          >
            <span className="flex items-start gap-3">
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${deliveryModeIconClass(
                  driverSelected,
                )}`}
              >
                <Truck className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span
                  className={`block text-sm font-black ${driverSelected ? "text-emerald-50" : "text-[#f8fafc]"}`}
                >
                  {driverLabel}
                </span>
                <span
                  className={`mt-1 block text-xs font-bold leading-snug ${
                    driverSelected ? "text-emerald-100/80" : "text-slate-300"
                  }`}
                >
                  {driverDetail}
                </span>
              </span>
            </span>
          </button>
        </div>

        {!hasSelection ? (
          <p className="mt-3 text-center text-xs font-bold text-slate-500 sm:text-sm">
            Elige una opción para continuar
          </p>
        ) : compactOfficeSelection ? null : officeSelected ? (
          <div className="mt-3">
            <p className="rounded-lg border border-black/70 bg-[#2e3834] px-3 py-2.5 text-sm font-bold text-slate-400">
              Sin ruta de chofer — el cliente se encarga en oficina.
            </p>
          </div>
        ) : null}

        {hasSelection && !compactOfficeSelection ? (
          <div className="mt-auto border-t border-black/70 pt-3">
            <p className="text-[11px] font-black uppercase text-slate-500">Quedó así</p>
            <p className="mt-1 text-sm font-black leading-snug text-emerald-100/90">{summary}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

export function SaleLogisticsStep({
  emptyBoxMode,
  emptyBoxScheduleMode,
  emptyBoxScheduleAt,
  fullBoxMode,
  fullBoxScheduleMode,
  fullBoxScheduleAt,
  emptyBoxRouteSummary,
  fullBoxRouteSummary,
  onSelectEmptyBoxMode,
  onSelectFullBoxMode,
  fullBoxPickupExpanded,
  onExpandFullBoxPickup,
  onDeferFullBoxPickup,
  emptyBoxCharge,
  fullBoxCharge,
  emptyBoxChargeSuggestion,
  fullBoxChargeSuggestion,
  onEmptyBoxChargeChange,
  onFullBoxChargeChange,
}: SaleLogisticsStepProps) {
  const emptySummary =
    emptyBoxMode === EMPTY_BOX_DRIVER_MODE && emptyBoxRouteSummary
      ? emptyBoxRouteSummary
      : deliverySummary(emptyBoxMode, emptyBoxScheduleMode, emptyBoxScheduleAt);
  const fullSummary =
    fullBoxMode === FULL_BOX_DRIVER_MODE && fullBoxRouteSummary
      ? fullBoxRouteSummary
      : fullBoxSummaryLine(fullBoxMode, fullBoxScheduleMode, fullBoxScheduleAt);
  const emptyComplete = logisticsLegComplete(emptyBoxMode, emptyBoxScheduleMode, emptyBoxScheduleAt);
  const fullComplete = logisticsLegComplete(fullBoxMode, fullBoxScheduleMode, fullBoxScheduleAt);

  return (
    <div className="grid w-full gap-3 sm:gap-4">
      <div className="mx-auto w-full max-w-2xl space-y-2.5 sm:space-y-3">
        <MovementCard
          step={1}
          title="Caja vacía sale de oficina"
          hint="¿Cómo sale la caja vacía?"
          summary={emptySummary}
          complete={emptyComplete}
          mode={emptyBoxMode}
          officeMode={EMPTY_BOX_OFFICE_MODE}
          driverMode={EMPTY_BOX_DRIVER_MODE}
          officeLabel="Entrega en oficina"
          driverLabel="Chofer entrega"
          officeDetail="Se entrega ahora en mostrador."
          driverDetail="Fecha obligatoria; la ruta es opcional."
          onSelectMode={onSelectEmptyBoxMode}
          showOfficeHandingOption
        />
        {emptyBoxMode === EMPTY_BOX_DRIVER_MODE ? (
          <AdditionalChargeEditor
            label="entrega"
            suggestion={emptyBoxChargeSuggestion}
            value={emptyBoxCharge}
            onChange={onEmptyBoxChargeChange}
          />
        ) : null}

        {emptyComplete && !fullBoxPickupExpanded ? (
          <p className="px-1 text-center text-xs leading-relaxed text-slate-500">
            <span className="font-bold text-slate-400">
              Caja llena: {FULL_BOX_DEFERRED_SUMMARY}.
            </span>{" "}
            <button
              type="button"
              onClick={onExpandFullBoxPickup}
              title="Programar recolección ahora"
              className="font-black text-slate-400 underline-offset-2 hover:text-slate-300 hover:underline"
            >
              Programar ahora
            </button>
          </p>
        ) : null}

        {fullBoxPickupExpanded ? (
          <div className="space-y-2">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={onDeferFullBoxPickup}
                className="text-[11px] font-black text-slate-500 underline-offset-2 hover:text-slate-300 hover:underline"
              >
                Dejar pendiente
              </button>
            </div>
            <MovementCard
              step={2}
              title="Caja llena vuelve a oficina"
              hint="¿Cómo regresa con el envío?"
              summary={fullSummary}
              complete={fullComplete}
              mode={fullBoxMode}
              officeMode={FULL_BOX_OFFICE_MODE}
              driverMode={FULL_BOX_DRIVER_MODE}
              officeLabel="Cliente trae"
              driverLabel="Chofer recoge"
              officeDetail="La devuelve en la oficina."
              driverDetail="Pasamos a recogerla."
              onSelectMode={onSelectFullBoxMode}
            />
            {fullBoxMode === FULL_BOX_DRIVER_MODE ? (
              <AdditionalChargeEditor
                label="recolección"
                suggestion={fullBoxChargeSuggestion}
                value={fullBoxCharge}
                onChange={onFullBoxChargeChange}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
