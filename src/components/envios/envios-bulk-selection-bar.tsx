"use client";

import { memo } from "react";
import type { EnviosBulkSelectionBarProps } from "@/components/envios/types";

export const EnviosBulkSelectionBar = memo(function EnviosBulkSelectionBar({
  selectedCount,
  visibleCount,
  markableCount,
  unmarkableCount,
  busy,
  onSelectAll,
  onClearSelection,
  onMarkReady,
  onUnmarkReady,
}: EnviosBulkSelectionBarProps) {
  return (
    <div className="mb-3 flex shrink-0 flex-wrap items-center gap-2 rounded-xl border border-emerald-700/50 bg-emerald-950/25 px-2.5 py-2">
      <p className="shrink-0 text-[11px] font-black uppercase tracking-wide text-emerald-200">
        {selectedCount} seleccionado{selectedCount === 1 ? "" : "s"}
      </p>

      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          disabled={busy || visibleCount === 0}
          onClick={onSelectAll}
          className="h-8 rounded-lg border border-black bg-surface-inset px-3 text-[11px] font-black uppercase text-slate-200 transition hover:bg-surface-card disabled:cursor-not-allowed disabled:opacity-50"
        >
          Marcar todo
        </button>
        <button
          type="button"
          disabled={busy || markableCount === 0}
          onClick={onMarkReady}
          className="h-8 rounded-lg border border-emerald-700/60 bg-emerald-950/40 px-3 text-[11px] font-black uppercase text-emerald-200 transition hover:bg-emerald-900/40 disabled:cursor-not-allowed disabled:opacity-50"
          title={
            markableCount > 0
              ? `Marcar ${markableCount} envío${markableCount === 1 ? "" : "s"} como listo${markableCount === 1 ? "" : "s"}`
              : "Ningún envío seleccionado se puede marcar"
          }
        >
          Marcar como listos
        </button>
        <button
          type="button"
          disabled={busy || unmarkableCount === 0}
          onClick={onUnmarkReady}
          className="h-8 rounded-lg border border-amber-700/60 bg-amber-950/30 px-3 text-[11px] font-black uppercase text-amber-200 transition hover:bg-amber-900/30 disabled:cursor-not-allowed disabled:opacity-50"
          title={
            unmarkableCount > 0
              ? `Desmarcar ${unmarkableCount} envío${unmarkableCount === 1 ? "" : "s"}`
              : "Ningún envío seleccionado se puede desmarcar"
          }
        >
          Desmarcar como listos
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={onClearSelection}
          className="h-8 rounded-lg border border-black bg-surface-inset px-3 text-[11px] font-black uppercase text-slate-400 transition hover:bg-surface-card hover:text-slate-200 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Limpiar
        </button>
      </div>
    </div>
  );
});
