"use client";

import {
  ArrowDownToLine,
  Loader2,
  PackageCheck,
} from "lucide-react";
import { primaryButtonClass } from "@/components/ui-blocks";
import {
  sumRouteDeliveryOnTruck,
  sumRouteDeliveryPending,
  type ConductorRouteDeliveryBoardLine,
  type ConductorTruckInventoryLine,
  type ConductorTruckOnTruckLine,
} from "@/lib/conductor-truck-inventory";

function TruckLoadInline({
  line,
  loadQuantities,
  onQuantityChange,
  busyKey,
  onLoad,
}: {
  line: ConductorTruckInventoryLine;
  loadQuantities: Record<string, string>;
  onQuantityChange: (lineKey: string, value: string) => void;
  busyKey: string;
  onLoad: (lineKey: string, qty: number) => void;
}) {
  const maxPartialQty = Math.min(line.shortageQty, line.stockQty);
  const selectedQty = Math.floor(Number(loadQuantities[line.key]) || maxPartialQty);
  const partialQty = Math.min(Math.max(selectedQty, 1), Math.max(maxPartialQty, 1));
  const remainingQty = Math.max(line.shortageQty - partialQty, 0);
  const isPartialSelection = remainingQty > 0;
  const canRecordPartial = Boolean(line.itemId && line.warehouseId && maxPartialQty > 0);
  const partialQtyIsValid = partialQty > 0 && partialQty <= maxPartialQty;
  const lineBusy = busyKey === `load:${line.key}`;

  return (
    <div className="grid gap-3 border-t border-black/60 pt-3">
      <input
        type="range"
        min="1"
        max={Math.max(maxPartialQty, 1)}
        step="1"
        value={loadQuantities[line.key] ?? String(maxPartialQty)}
        onChange={(event) => onQuantityChange(line.key, event.target.value)}
        className="h-3 w-full cursor-pointer accent-emerald-400 disabled:cursor-not-allowed disabled:opacity-40"
        aria-label={`Cantidad subida de ${line.label}`}
        disabled={!canRecordPartial || lineBusy}
      />

      <div className="flex flex-wrap items-end gap-x-2 gap-y-1">
        <span className="text-3xl font-black tabular-nums text-emerald-300">{partialQty}</span>
        {isPartialSelection ? (
          <span className="pb-1 text-xs font-bold text-slate-400">
            cajas · quedan <span className="font-black text-rose-200">{remainingQty}</span> pendientes
          </span>
        ) : (
          <span className="pb-1 text-xs font-bold text-slate-400">cajas a subir</span>
        )}
      </div>

      <button
        type="button"
        className={`${primaryButtonClass} h-10 text-xs disabled:cursor-not-allowed disabled:opacity-40`}
        disabled={!canRecordPartial || !partialQtyIsValid || lineBusy}
        onClick={() => onLoad(line.key, partialQty)}
      >
        {lineBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}
        Subir al camión
      </button>
      {!canRecordPartial ? (
        <p className="text-xs font-bold text-rose-300">No hay cajas disponibles para subir ahora.</p>
      ) : null}
    </div>
  );
}

export function RouteDeliverySection({
  boardLines,
  loadQuantities,
  onQuantityChange,
  busyKey,
  onLoad,
  onUnload,
}: {
  boardLines: ConductorRouteDeliveryBoardLine[];
  loadQuantities: Record<string, string>;
  onQuantityChange: (lineKey: string, value: string) => void;
  busyKey: string;
  onLoad: (lineKey: string, qty: number) => void;
  onUnload: (line: ConductorTruckOnTruckLine) => void;
}) {
  const onTruckTotal = sumRouteDeliveryOnTruck(boardLines);
  const pendingTotal = sumRouteDeliveryPending(boardLines);
  const requiredTotal = boardLines.reduce((sum, line) => sum + line.requiredQty, 0);

  return (
    <section
      id="route-delivery-board"
      className="overflow-hidden rounded-xl border border-black bg-surface-card"
    >
      <header className="flex items-center justify-between gap-3 border-b border-black bg-surface-card-header px-4 py-3">
        <p className="text-sm font-black text-[#f8fafc]">Cajas de ruta (por dejar)</p>
        <div className="flex items-center gap-2">
          {pendingTotal > 0 ? (
            <span className="rounded-md border border-rose-800/70 bg-rose-950/35 px-2 py-1 text-xs font-black tabular-nums text-rose-200">
              {pendingTotal} por subir
            </span>
          ) : null}
          <span className="rounded-md border border-emerald-700/60 bg-emerald-950/30 px-2 py-1 text-xs font-black tabular-nums text-emerald-200">
            {onTruckTotal}/{requiredTotal}
          </span>
        </div>
      </header>
      {boardLines.length ? (
        <div className={`grid gap-2 p-3 ${boardLines.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
          {boardLines.map((boardLine) => {
            const lineBusy = busyKey === `return:${boardLine.key}`;
            const isPending = boardLine.pendingQty > 0;
            const isLoaded = boardLine.onTruckQty > 0;
            const unloadLine: ConductorTruckOnTruckLine = {
              key: `route:${boardLine.key}`,
              lineKey: boardLine.key,
              label: boardLine.label,
              qty: boardLine.onTruckQty,
              maxReturnQty: boardLine.onTruckQty,
              itemId: boardLine.line.itemId,
              warehouseId: boardLine.line.warehouseId,
              catalogKey: boardLine.line.catalogKey,
              origin: "route",
            };

            return (
              <article
                key={boardLine.key}
                className={`flex flex-col gap-3 rounded-lg border px-4 py-3 ${
                  isPending && !isLoaded
                    ? "border-app-border-divider bg-surface-card/40"
                    : isPending
                      ? "border-black bg-surface-inset"
                      : "border-black bg-surface-inset"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p
                    className={`min-w-0 truncate text-base font-black ${
                      isPending && !isLoaded ? "text-slate-400" : "text-[#f8fafc]"
                    }`}
                  >
                    {boardLine.label}
                  </p>
                  {isLoaded ? (
                    <p className="shrink-0 text-right">
                      <span className="text-2xl font-black tabular-nums text-emerald-300">{boardLine.onTruckQty}</span>
                      <span className="ml-1 text-xs font-bold text-slate-400">en camión</span>
                    </p>
                  ) : null}
                </div>

                {isLoaded ? (
                  <button
                    type="button"
                    className="inline-flex h-9 items-center justify-center gap-1.5 self-start rounded-md border border-black bg-surface-card px-2.5 text-[11px] font-black text-slate-200 transition hover:bg-surface-inset disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={Boolean(busyKey)}
                    onClick={() => onUnload(unloadLine)}
                  >
                    {lineBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowDownToLine className="h-3.5 w-3.5" />}
                    Bajar a bodega
                  </button>
                ) : null}

                {isPending ? (
                  <TruckLoadInline
                    line={boardLine.line}
                    loadQuantities={loadQuantities}
                    onQuantityChange={onQuantityChange}
                    busyKey={busyKey}
                    onLoad={onLoad}
                  />
                ) : null}
              </article>
            );
          })}
        </div>
      ) : (
        <p className="px-4 py-6 text-sm font-bold text-slate-400">Sin cajas de ruta para hoy.</p>
      )}
    </section>
  );
}

export function TruckOnTruckSection({
  title,
  total,
  tone,
  emptyText,
  lines,
  busyKey,
  onUnload,
}: {
  title: string;
  total: number;
  tone: "emerald" | "sky";
  emptyText: string;
  lines: ConductorTruckOnTruckLine[];
  busyKey: string;
  onUnload: (line: ConductorTruckOnTruckLine) => void;
}) {
  const badgeClass =
    tone === "emerald"
      ? "border-emerald-700/60 bg-emerald-950/30 text-emerald-200"
      : "border-sky-700/60 bg-sky-950/30 text-sky-200";
  const qtyClass = tone === "emerald" ? "text-emerald-300" : "text-sky-300";

  return (
    <section className="overflow-hidden rounded-xl border border-black bg-surface-card">
      <header className="flex items-center justify-between gap-3 border-b border-black bg-surface-card-header px-4 py-3">
        <p className="text-sm font-black text-[#f8fafc]">{title}</p>
        <span className={`rounded-md border px-2 py-1 text-xs font-black tabular-nums ${badgeClass}`}>
          {total}
        </span>
      </header>
      {lines.length ? (
        <div className={`grid gap-2 p-3 ${lines.length > 1 ? "sm:grid-cols-2" : "grid-cols-1"}`}>
          {lines.map((line) => {
            const lineBusy = busyKey === `return:${line.lineKey}`;

            return (
              <article
                key={line.key}
                className="flex flex-col gap-2 rounded-lg border border-black bg-surface-inset px-4 py-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="min-w-0 truncate text-base font-black text-[#f8fafc]">{line.label}</p>
                  <p className="shrink-0 text-right">
                    <span className={`text-2xl font-black tabular-nums ${qtyClass}`}>{line.qty}</span>
                    <span className="ml-1 text-xs font-bold text-slate-400">cajas</span>
                  </p>
                </div>
                <button
                  type="button"
                  className="inline-flex h-9 items-center justify-center gap-1.5 self-start rounded-md border border-black bg-surface-inset px-2.5 text-[11px] font-black text-slate-200 transition hover:bg-surface-card disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={Boolean(busyKey)}
                  onClick={() => onUnload(line)}
                >
                  {lineBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ArrowDownToLine className="h-3.5 w-3.5" />}
                  Bajar a bodega
                </button>
              </article>
            );
          })}
        </div>
      ) : (
        <p className="px-4 py-6 text-sm font-bold text-slate-400">{emptyText}</p>
      )}
    </section>
  );
}
