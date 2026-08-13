"use client";

import { ArrowUpDown } from "lucide-react";
import type { SalePersonSortMode } from "@/lib/sale-person-list-sort";

type SortOption = {
  value: SalePersonSortMode;
  label: string;
};

type SalePersonListSortControlProps = {
  value: SalePersonSortMode;
  options: readonly SortOption[];
  onChange: (value: SalePersonSortMode) => void;
  ariaLabel: string;
};

export function SalePersonListSortControl({
  value,
  options,
  onChange,
  ariaLabel,
}: SalePersonListSortControlProps) {
  const currentLabel =
    options.find((option) => option.value === value)?.label || ariaLabel;

  return (
    <label
      title={currentLabel}
      className="relative inline-flex h-11 w-11 touch-manipulation shrink-0 items-center justify-center overflow-hidden rounded-lg border border-black/80 bg-surface-card text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_20px_rgba(0,0,0,0.2)] transition hover:text-emerald-200"
    >
      <ArrowUpDown className="pointer-events-none h-4 w-4" aria-hidden />
      <select
        aria-label={`${ariaLabel}: ${currentLabel}`}
        value={value}
        onChange={(event) => onChange(event.target.value as SalePersonSortMode)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-surface-panel text-slate-100">
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
