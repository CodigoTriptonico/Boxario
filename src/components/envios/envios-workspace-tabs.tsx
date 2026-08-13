"use client";

import type { EnviosClientMode } from "@/lib/shipment-display";

export function EnviosWorkspaceTabs({
  activeMode,
  trackingCount,
  historyCount,
  onModeChange,
}: {
  activeMode: EnviosClientMode;
  trackingCount: number;
  historyCount: number;
  onModeChange: (mode: EnviosClientMode) => void;
}) {
  return (
    <div className="flex shrink-0">
      <div className="flex shrink-0 rounded-lg border border-black bg-surface-inset p-0.5" role="tablist" aria-label="Vista de envíos">
        {([
          ["tracking", "En curso", trackingCount],
          ["history", "Entregados", historyCount],
        ] as const).map(([mode, label, count]) => {
          const selected = activeMode === mode;

          return (
            <button
              key={mode}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => onModeChange(mode)}
              className={`flex h-8 items-center gap-2 rounded-md px-2.5 text-xs font-black transition ${
                selected
                  ? "bg-emerald-400 text-slate-950"
                  : "text-slate-400 hover:bg-surface-card hover:text-[#f8fafc]"
              }`}
            >
              <span>{label}</span>
                  <span className={`tabular-nums ${selected ? "text-slate-950" : "text-app-text-muted"}`}>{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
