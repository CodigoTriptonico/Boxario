"use client";

import { Gift, Percent, Plus, Tag } from "lucide-react";
import type { ReactNode } from "react";
import { inputClass, pickerShellClass } from "@/components/ui-blocks";
import type { RuleIntent } from "@/components/config/combo-builder/types";

export const productPickerMinWidth = "min-w-0";
export const compactPickerShellClass = `${pickerShellClass} h-10 min-w-[8.5rem]`;
export const productRowClass =
  "grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-2";
export const productPickerClass = "w-full min-w-0";
export const productPickerShellClass = `${pickerShellClass} h-10 w-full min-w-0`;
const iconButtonClass =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-black transition";
export const iconButtonDangerClass = `${iconButtonClass} bg-surface-inset text-slate-400 hover:border-rose-800/50 hover:text-rose-300`;
const sectionCardClass = "rounded-xl border border-black bg-surface-inset p-3.5";
const stepLabelClass =
  "text-[10px] font-black uppercase tracking-wide text-slate-300";
export const helperTextClass = "text-xs font-bold text-slate-400";
export const summaryTextClass =
  "rounded-lg border border-black bg-surface-card px-3 py-2 text-xs font-bold leading-relaxed text-slate-300";

export const targetOptions = [
  { value: "same_purchase", label: "En esta compra", searchText: "misma compra" },
  { value: "next_unit", label: "Siguiente unidad", searchText: "siguiente" },
];

const intentOptions: {
  id: RuleIntent;
  title: string;
  icon: typeof Percent;
}[] = [
  { id: "discount", title: "Descuento", icon: Percent },
  { id: "free_gift", title: "Regalo", icon: Gift },
  { id: "bundle_price", title: "Paquete", icon: Tag },
];

export function StepSection({
  step,
  label,
  children,
}: {
  step?: number;
  label: string;
  children: ReactNode;
}) {
  return (
    <section className={sectionCardClass}>
      <div className="mb-2.5 flex items-center gap-2 border-b border-black pb-2">
        {step !== undefined ? (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border border-emerald-600/50 bg-emerald-400/15 text-[10px] font-black tabular-nums text-emerald-300">
            {step}
          </span>
        ) : null}
        <span className={stepLabelClass}>{label}</span>
      </div>
      {children}
    </section>
  );
}

export function RowActions({ children }: { children: ReactNode }) {
  return <div className="flex shrink-0 items-center gap-1.5">{children}</div>;
}

export function AddLineButton({
  onClick,
  label,
}: {
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-9 w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-emerald-600/40 bg-surface-inset px-3 text-xs font-black text-emerald-300 transition hover:border-emerald-500 hover:bg-surface-card-hover"
    >
      <Plus className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

export function QtyInput({
  value,
  onChange,
  ariaLabel,
}: {
  value: number;
  onChange: (value: number) => void;
  ariaLabel: string;
}) {
  return (
    <input
      className={`${inputClass} h-10 w-14 shrink-0 px-2 text-center tabular-nums`}
      inputMode="numeric"
      value={value}
      onChange={(event) =>
        onChange(Math.max(Number.parseInt(event.target.value, 10) || 1, 1))
      }
      aria-label={ariaLabel}
    />
  );
}

export function RepeatPills({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (repeat: boolean) => void;
}) {
  const options = [
    { value: false, label: "Una vez por venta" },
    { value: true, label: "Varias veces" },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-1.5">
      {options.map((option) => {
        const active = value === option.value;

        return (
          <button
            key={option.label}
            type="button"
            onClick={() => onChange(option.value)}
            className={`h-10 rounded-lg border px-2 text-xs font-black transition ${
              active
                ? "border-emerald-500/50 bg-emerald-400/15 text-emerald-200"
                : "border-black bg-surface-card text-slate-300 hover:bg-surface-card-hover hover:text-[#f8fafc]"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

export function IntentPills({
  value,
  onChange,
  bundleEligible,
}: {
  value: RuleIntent | null;
  onChange: (intent: RuleIntent) => void;
  bundleEligible: boolean;
}) {
  const visibleOptions = intentOptions.filter(
    (option) => option.id !== "bundle_price" || bundleEligible,
  );

  return (
    <div
      className={`grid gap-1.5 ${bundleEligible ? "grid-cols-3" : "grid-cols-2"}`}
    >
      {visibleOptions.map((option) => {
        const Icon = option.icon;
        const active = value === option.id;

        return (
          <button
            key={option.id}
            type="button"
            onClick={() => onChange(option.id)}
            className={`inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border text-xs font-black transition ${
              active
                ? "border-emerald-500/50 bg-emerald-400/15 text-emerald-200"
                : "border-black bg-surface-card text-slate-300 hover:bg-surface-card-hover hover:text-[#f8fafc]"
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {option.title}
          </button>
        );
      })}
    </div>
  );
}
