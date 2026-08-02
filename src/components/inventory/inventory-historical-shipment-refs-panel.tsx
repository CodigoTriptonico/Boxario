"use client";

import { useCallback, useState } from "react";
import {
  backfillInventoryShipmentRefsUnambiguousAction,
  listInventoryMovementsMissingShipmentRefsAction,
  type InventoryMissingShipmentRefRow,
} from "@/app/actions/logistics-admin-exception-actions";
import { CompactInfoDisclosure, primaryButtonClass, secondaryButtonClass } from "@/components/ui-blocks";
import { useNotify } from "@/hooks/use-notify";

export function InventoryHistoricalShipmentRefsPanel({
  canAdjust = false,
}: {
  canAdjust?: boolean;
}) {
  const notify = useNotify();
  const [rows, setRows] = useState<InventoryMissingShipmentRefRow[] | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const result = await listInventoryMovementsMissingShipmentRefsAction(100);
    setBusy(false);
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    setRows(result.data);
  }, [notify]);

  async function runBackfill(dryRun: boolean) {
    setBusy(true);
    const result = await backfillInventoryShipmentRefsUnambiguousAction(dryRun);
    setBusy(false);
    if (!result.ok) {
      notify.error(result.error);
      return;
    }
    notify.success(
      dryRun
        ? `Simulacion: ${result.data.linkedCount} enlazables, ${result.data.skipped} dudosos`
        : `Enlazados ${result.data.linkedCount}; omitidos ${result.data.skipped}`,
    );
    await load();
  }

  return (
    <section className="rounded-xl border border-black bg-surface-panel p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-black text-slate-100">Salidas sin referencia exacta de envío</p>
          <p className="mt-1 text-xs font-bold text-slate-400">
            El rollback automatico no usa notas ni ILIKE. Estas filas requieren revision.
          </p>
        </div>
        <CompactInfoDisclosure ariaLabel="Ayuda inventario historico">
          Solo se enlazan movimientos con un codigo de envio inequívoco en la nota. Los ambiguos
          quedan para revision manual y nunca se revierten por coincidencia parcial.
        </CompactInfoDisclosure>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => void load()}
          className={`${secondaryButtonClass} h-10 text-xs disabled:opacity-40`}
        >
          {busy ? "Cargando…" : "Actualizar reporte"}
        </button>
        {canAdjust ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runBackfill(true)}
              className={`${secondaryButtonClass} h-10 text-xs disabled:opacity-40`}
            >
              Simular enlace seguro
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void runBackfill(false)}
              className={`${primaryButtonClass} h-10 text-xs disabled:opacity-40`}
            >
              Enlazar inequívocos
            </button>
          </>
        ) : null}
      </div>

      {rows ? (
        <div className="mt-3 max-h-64 overflow-y-auto">
          {rows.length === 0 ? (
            <p className="text-sm font-bold text-emerald-300">No hay salidas historicas sin referencia.</p>
          ) : (
            <ul className="space-y-2">
              {rows.map((row) => (
                <li
                  key={row.movementId}
                  className="rounded-lg border border-black/70 bg-surface-list-row px-3 py-2 text-xs font-bold text-slate-300"
                >
                  <p className="text-slate-100">
                    {row.itemName} · qty {row.qty} · {row.reviewStatus}
                  </p>
                  <p className="mt-1 break-words text-slate-400">{row.note || "(sin nota)"}</p>
                  {row.linkedShipmentId ? (
                    <p className="mt-1 text-emerald-300">Enlace: {row.linkedShipmentId}</p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </section>
  );
}
