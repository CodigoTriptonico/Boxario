"use client";

import type { LucideIcon } from "lucide-react";

export type AppTabDefinition<T extends string = string> = {
  id: T;
  label: string;
  icon: LucideIcon;
  badge?: string | number;
};

type AppTabsProps<T extends string> = {
  tabs: AppTabDefinition<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: "default" | "compact";
  ariaLabel?: string;
  fitMobile?: boolean;
};

function tabButtonClass(active: boolean, compact: boolean, fitMobile: boolean) {
  return [
    "inline-flex items-center gap-2.5 rounded-xl border font-black transition",
    compact
      ? fitMobile ? "min-h-10 min-w-0 w-full justify-center gap-1 px-1 sm:w-auto sm:justify-start sm:gap-2.5 sm:px-3" : "min-h-10 px-3"
      : "min-h-12 px-4",
    active
      ? "border-emerald-600 bg-emerald-400/12 text-[#f8fafc] shadow-[inset_0_1px_0_rgba(52,211,153,0.12)]"
      : "border-app-border-control bg-surface-card text-app-text-secondary hover:border-app-border-control hover:bg-surface-card-hover hover:text-app-text-primary",
  ].join(" ");
}

function tabIconWellClass(active: boolean, compact: boolean, fitMobile: boolean) {
  return [
    "flex shrink-0 items-center justify-center rounded-lg border",
    compact ? fitMobile ? "hidden h-8 w-8 sm:flex" : "h-8 w-8" : "h-9 w-9",
    active
      ? "border-emerald-600 bg-emerald-400 text-slate-950"
      : "border-app-border-control bg-surface-inset text-app-text-secondary",
  ].join(" ");
}

function hasBadge(badge: string | number | undefined) {
  if (badge == null || badge === "") {
    return false;
  }

  if (typeof badge === "number") {
    return badge > 0;
  }

  return true;
}

export function AppTabs<T extends string>({
  tabs,
  value,
  onChange,
  className = "",
  size = "default",
  ariaLabel,
  fitMobile = false,
}: AppTabsProps<T>) {
  const compact = size === "compact";
  const labelClass = compact ? fitMobile ? "whitespace-nowrap text-xs sm:text-sm" : "text-sm" : "text-base";
  const mobileGridClass = tabs.length >= 3 ? "grid-cols-3" : tabs.length === 2 ? "grid-cols-2" : "grid-cols-1";

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`${fitMobile ? `grid ${mobileGridClass} gap-1.5 sm:flex sm:flex-wrap sm:gap-2.5` : "flex flex-wrap gap-2.5"} ${className}`.trim()}
    >
      {tabs.map((tab) => {
        const active = tab.id === value;
        const Icon = tab.icon;

        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={tabButtonClass(active, compact, fitMobile)}
            onClick={() => onChange(tab.id)}
          >
            <span className={tabIconWellClass(active, compact, fitMobile)}>
              <Icon className="h-4 w-4" aria-hidden />
            </span>
            <span className={`${labelClass} font-black`}>{tab.label}</span>
            {hasBadge(tab.badge) ? (
              <span
                className={`shrink-0 rounded-md border border-app-border-control py-0.5 font-black tabular-nums ${fitMobile ? "px-1 text-[9px] sm:px-1.5 sm:text-[10px]" : "px-1.5 text-[10px]"} ${
                  active ? "bg-emerald-400 text-slate-950" : "bg-surface-inset text-slate-400"
                }`}
              >
                {tab.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
