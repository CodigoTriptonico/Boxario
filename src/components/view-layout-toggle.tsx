"use client";

import { LayoutGrid, Rows3, Table2 } from "lucide-react";
import type { ViewLayout } from "@/lib/view-layout";

type ViewLayoutToggleProps = {
  layout: ViewLayout;
  onChange: (layout: ViewLayout) => void;
  supportsExcel?: boolean;
  variant?: "default" | "inline" | "sidebar" | "rail";
  className?: string;
};

export function ViewLayoutToggle({
  layout,
  onChange,
  supportsExcel = false,
  variant = "default",
  className = "",
}: ViewLayoutToggleProps) {
  const containerClass =
    variant === "inline"
      ? "inline-flex shrink-0 overflow-hidden rounded-lg border border-app-border-control bg-surface-card"
      : variant === "sidebar" || variant === "rail"
        ? `inline-flex shrink-0 overflow-hidden rounded-lg border border-app-border-control bg-surface-card ${variant === "rail" ? "flex-col" : ""}`
        : "inline-flex shrink-0 overflow-hidden rounded-lg border border-app-border-control bg-surface-inset";
  const options = [
    { id: "rows" as const, label: "Lista", icon: Rows3 },
    { id: "cards" as const, label: "Tarjetas", icon: LayoutGrid },
    ...(supportsExcel ? [{ id: "excel" as const, label: "Tabla", icon: Table2 }] : []),
  ];

  return (
    <div
      className={`${containerClass}${className ? ` ${className}` : ""}`}
      role="group"
      aria-label="Vista del listado"
    >
      {options.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          aria-pressed={layout === id}
          aria-label={`Ver como ${label.toLocaleLowerCase()}`}
          title={label}
          className={`inline-flex h-9 w-9 items-center justify-center text-app-text-secondary transition hover:bg-[#2f3834] hover:text-app-text-primary focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-focus-ring ${layout === id ? "bg-emerald-400 text-slate-950 hover:bg-emerald-300 hover:text-slate-950" : ""}`}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </button>
      ))}
    </div>
  );
}
