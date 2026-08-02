"use client";

import { SupabaseRequiredBanner } from "@/components/supabase-required-banner";
import { Panel } from "@/components/ui-blocks";
import { flowPanelContentClass, flowPanelFlushClass, flowStepBodyClass } from "@/components/flow-form-styles";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { historyDateLabel } from "@/components/sale/venta-parts";
import type { VentaController } from "@/components/sale/venta/use-venta-controller";

export function VentaHistoryView({ controller }: { controller: VentaController; }) {
  const {
    historyError,
    historyLoading,
    historyRows,
    mode,
  } = controller;

  return (
    mode === "history" ? (
      <>
        <Panel
          hideHeader
          className={flowPanelFlushClass}
          title="Historial"
          contentClassName={flowPanelContentClass}
        >
          <div className={flowStepBodyClass}>
            {!isSupabaseConfigured() ? (
              <SupabaseRequiredBanner detail="El historial se guarda en Supabase." />
            ) : null}
            {historyError ? (
              <p className="rounded-lg border border-rose-700 bg-rose-950/40 px-3 py-2 text-sm font-bold text-rose-200">
                {historyError}
              </p>
            ) : null}
            {!historyLoading && !historyRows.length ? (
              <div className="rounded-xl border border-black bg-surface-card p-4 text-xl font-black">
                Sin movimientos
              </div>
            ) : null}
            <div className="grid gap-3">
              {historyRows.map((row) => (
                <div
                  key={row.id}
                  className="rounded-xl border border-black bg-surface-card p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-black text-[#f8fafc]">{row.title}</p>
                      {row.description ? (
                        <p className="mt-1 text-sm font-bold text-slate-400">{row.description}</p>
                      ) : null}
                    </div>
                    <span className="rounded-lg border border-black bg-surface-inset px-3 py-1 text-xs font-black text-slate-300">
                      {historyDateLabel(row.createdAt)}
                    </span>
                  </div>
                  <p className="mt-3 text-xs font-bold uppercase text-slate-500">
                    {row.actorName} - {row.entityType}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </Panel>
      </>
    ) : null
  );
}
