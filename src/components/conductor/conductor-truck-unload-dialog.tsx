"use client";

import { ArrowDownToLine, Loader2, X } from "lucide-react";
import { primaryButtonClass, secondaryButtonClass } from "@/components/ui-blocks";
import {
  CONDUCTOR_TRUCK_RETURN_REASONS,
  isConductorTruckVehicleChangeReason,
  type ConductorTruckOnTruckLine,
} from "@/lib/conductor-truck-inventory";

type UnloadDialogState = {
  line: ConductorTruckOnTruckLine;
};

type ConductorTruckUnloadDialogProps = {
  unloadDialog: UnloadDialogState;
  busyKey: string;
  unloadQty: string;
  unloadReason: string;
  unloadNote: string;
  unloadTargetVehicleId: string;
  unloadVehicleReady: boolean;
  transferVehicles: Array<{ id: string; label: string }>;
  onClose: () => void;
  onUnloadQtyChange: (qty: string) => void;
  onUnloadReasonChange: (reason: string) => void;
  onUnloadNoteChange: (note: string) => void;
  onUnloadTargetVehicleIdChange: (vehicleId: string) => void;
  onConfirm: () => void;
};

export function ConductorTruckUnloadDialog({
  unloadDialog,
  busyKey,
  unloadQty,
  unloadReason,
  unloadNote,
  unloadTargetVehicleId,
  unloadVehicleReady,
  transferVehicles,
  onClose,
  onUnloadQtyChange,
  onUnloadReasonChange,
  onUnloadNoteChange,
  onUnloadTargetVehicleIdChange,
  onConfirm,
}: ConductorTruckUnloadDialogProps) {
  const unloadNeedsVehicle = isConductorTruckVehicleChangeReason(unloadReason);

  return (
    <div className="fixed inset-0 z-[160] flex items-end justify-center bg-black/70 p-3 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Cerrar baja de caja"
        className="absolute inset-0"
        disabled={Boolean(busyKey)}
        onClick={onClose}
      />
      <section
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-black bg-surface-panel shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="truck-unload-title"
      >
        <header className="flex items-start gap-3 border-b border-black bg-surface-card-header px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-black bg-sky-400 text-slate-950">
            <ArrowDownToLine className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="truck-unload-title" className="text-lg font-black text-[#f8fafc]">
              Bajar a bodega
            </h2>
            <p className="mt-0.5 truncate text-xs font-bold text-slate-400">
              {unloadDialog.line.label} ·{" "}
              {unloadDialog.line.origin === "extra" ? "caja extra" : "caja de ruta"}
            </p>
          </div>
          <button
            type="button"
            aria-label="Cerrar"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black bg-surface-inset text-slate-300 hover:bg-surface-card disabled:opacity-40"
            disabled={Boolean(busyKey)}
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="grid gap-4 overflow-y-auto p-4">
          <div className="grid gap-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-bold text-slate-400">Cuántas bajas</p>
              <label className="flex items-center gap-1.5 text-sm font-black tabular-nums text-[#f8fafc]">
                <input
                  type="number"
                  min="1"
                  max={Math.max(unloadDialog.line.maxReturnQty, 1)}
                  step="1"
                  value={unloadQty}
                  onChange={(event) => onUnloadQtyChange(event.target.value)}
                  className="h-8 w-14 rounded-md border border-black bg-surface-inset px-1 text-center text-sm font-black tabular-nums text-[#f8fafc] outline-none focus:border-sky-400 disabled:opacity-40"
                  aria-label={`Cantidad a bajar de ${unloadDialog.line.label}`}
                  disabled={Boolean(busyKey)}
                />
                de {unloadDialog.line.maxReturnQty}
              </label>
            </div>
            <input
              type="range"
              min="1"
              max={Math.max(unloadDialog.line.maxReturnQty, 1)}
              step="1"
              value={unloadQty}
              onChange={(event) => onUnloadQtyChange(event.target.value)}
              className="h-3 w-full cursor-pointer accent-sky-400 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label={`Cantidad a bajar de ${unloadDialog.line.label}`}
              disabled={Boolean(busyKey)}
            />
          </div>

          <div className="grid gap-2">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">Motivo de la baja</p>
            <div className="flex flex-wrap gap-2">
              {CONDUCTOR_TRUCK_RETURN_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  className={`rounded-full border px-3 py-1.5 text-xs font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-300 ${
                    unloadReason === reason
                      ? "border-sky-400 bg-sky-950/45 text-sky-100"
                      : "border-black bg-surface-inset text-slate-300 hover:bg-surface-card"
                  }`}
                  disabled={Boolean(busyKey)}
                  onClick={() => onUnloadReasonChange(reason)}
                >
                  {reason}
                </button>
              ))}
            </div>
          </div>

          {unloadNeedsVehicle ? (
            <label className="grid gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                ¿A qué vehículo van las cajas?
              </span>
              {transferVehicles.length ? (
                <select
                  value={unloadTargetVehicleId}
                  onChange={(event) => onUnloadTargetVehicleIdChange(event.target.value)}
                  className="h-11 rounded-lg border border-black bg-surface-inset px-3 text-sm font-black text-[#f8fafc] outline-none focus:border-sky-400 disabled:opacity-40"
                  aria-label="Vehículo destino"
                  disabled={Boolean(busyKey)}
                >
                  <option value="">Elegir vehículo</option>
                  {transferVehicles.map((vehicle) => (
                    <option key={vehicle.id} value={vehicle.id}>
                      {vehicle.label}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="rounded-lg border border-amber-700/60 bg-amber-950/25 px-3 py-2 text-xs font-bold text-amber-100">
                  No hay otro vehículo activo disponible. Elige otro motivo o avisa a logística.
                </p>
              )}
            </label>
          ) : null}

          <label className="grid gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">
              Nota para auditoría (opcional)
            </span>
            <textarea
              value={unloadNote}
              onChange={(event) => onUnloadNoteChange(event.target.value)}
              rows={3}
              maxLength={280}
              placeholder="Ej. cliente canceló, caja mojada, etc."
              className="resize-none rounded-lg border border-black bg-surface-inset px-3 py-2 text-sm font-bold text-[#f8fafc] outline-none focus:border-sky-400 disabled:opacity-40"
              disabled={Boolean(busyKey)}
            />
          </label>
        </div>

        <footer className="grid gap-2 border-t border-black bg-surface-card-header px-4 py-3 sm:grid-cols-2">
          <button
            type="button"
            className={`${secondaryButtonClass} h-10 text-xs`}
            disabled={Boolean(busyKey)}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button
            type="button"
            className={`${primaryButtonClass} h-10 text-xs disabled:cursor-not-allowed disabled:opacity-40`}
            disabled={
              Boolean(busyKey) ||
              Math.floor(Number(unloadQty) || 0) <= 0 ||
              Math.floor(Number(unloadQty) || 0) > unloadDialog.line.maxReturnQty ||
              !unloadVehicleReady
            }
            onClick={onConfirm}
          >
            {busyKey === `return:${unloadDialog.line.lineKey}` ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ArrowDownToLine className="h-4 w-4" />
            )}
            Confirmar baja
          </button>
        </footer>
      </section>
    </div>
  );
}
