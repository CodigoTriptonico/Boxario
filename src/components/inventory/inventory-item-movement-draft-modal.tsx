"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import { createPortal } from "react-dom";
import { DateInput } from "@/components/date-input";
import { inputClass } from "@/components/ui-blocks";
import {
  formatInventoryAdjustmentDelta,
  manualMovementReasonOptionsForType,
  movementReasonDetailPlaceholder,
  movementReasonRequiresDetail,
} from "@/lib/inventory-movement-audit";
import { syncEntryCostFields } from "@/lib/inventory-entry-cost";
import type { MovementDraft } from "@/lib/inventory-structure-utils";
import {
  isInventorySupplierTagSelected,
  normalizeInventorySupplierName,
} from "@/lib/inventory-supplier-tags";
import {
  formatInventoryStockLabel,
  resolveInventoryItemUnit,
} from "@/lib/inventory-units";

const movementFieldClass = `${inputClass} box-border block h-10 w-full min-w-0 max-w-full text-sm`;

type InventoryItemMovementDraftModalProps = {
  movementDraft: MovementDraft;
  mounted: boolean;
  setMovementDraft: React.Dispatch<React.SetStateAction<MovementDraft | null>>;
  visibleSupplierTags: string[];
  movementReasonOptions: ReturnType<typeof manualMovementReasonOptionsForType>;
  salidaAvailable: number;
  salidaQty: number;
  adjustmentDelta: number;
  todayIso: string;
  stockError: string;
  stockSaving: boolean;
  onSubmitMovement: () => void | Promise<void>;
  onRememberSupplierTag?: (name: string) => void;
};

export function InventoryItemMovementDraftModal({
  movementDraft,
  mounted,
  setMovementDraft,
  visibleSupplierTags,
  movementReasonOptions,
  salidaAvailable,
  salidaQty,
  adjustmentDelta,
  todayIso,
  stockError,
  stockSaving,
  onSubmitMovement,
  onRememberSupplierTag,
}: InventoryItemMovementDraftModalProps) {
  if (!mounted) {
    return null;
  }

  function commitSupplierName(rawName: string) {
    const normalized = normalizeInventorySupplierName(rawName);

    if (!normalized) {
      return;
    }

    onRememberSupplierTag?.(normalized);
    setMovementDraft((current) =>
      current ? { ...current, supplierName: normalized } : current,
    );
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-start justify-center overflow-y-auto bg-black/45 p-4 pt-[8dvh] sm:pt-[12dvh]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !stockSaving) {
          setMovementDraft(null);
        }
      }}
    >
      <form
        className="box-border flex max-h-[calc(100dvh-10dvh)] w-full min-w-0 max-w-md flex-col overflow-x-hidden overflow-y-auto rounded-xl border border-black bg-[#17211d] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)] [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden sm:max-h-[calc(100dvh-14dvh)]"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmitMovement();
        }}
      >
        <div className="mb-3 shrink-0">
          <p className="text-lg font-black capitalize text-[#f8fafc]">
            {movementDraft.type}
          </p>
          <p className="truncate text-sm font-bold text-slate-400">
            {movementDraft.context.treeItem.name}
          </p>
        </div>
        {movementDraft.type === "ajuste" ? (
          <div className="mb-3 grid gap-2 rounded-lg border border-black/70 bg-black/10 p-3 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="font-bold text-slate-500">Registrado</span>
              <span className="font-black tabular-nums text-slate-200">
                {movementDraft.context.stockItem.stock}
              </span>
            </div>
            <label className="grid gap-1.5 text-xs font-black uppercase text-slate-400">
              Cantidad real contada
              <input
                className={movementFieldClass}
                type="number"
                min={0}
                step="1"
                value={movementDraft.qty}
                onChange={(event) =>
                  setMovementDraft((current) =>
                    current ? { ...current, qty: event.target.value } : current,
                  )
                }
                autoFocus
              />
            </label>
            <div className="flex items-center justify-between gap-3 border-t border-black/50 pt-2">
              <span className="font-bold text-slate-500">Diferencia</span>
              <span
                className={`font-black tabular-nums ${
                  adjustmentDelta < 0
                    ? "text-rose-300"
                    : adjustmentDelta > 0
                      ? "text-emerald-300"
                      : "text-slate-200"
                }`}
              >
                {formatInventoryAdjustmentDelta(adjustmentDelta)}{" "}
                {formatInventoryStockLabel(
                  movementDraft.context.stockItem,
                  Math.abs(adjustmentDelta),
                )}
              </span>
            </div>
          </div>
        ) : (
          <label className="grid min-w-0 shrink-0 gap-1.5 text-xs font-black uppercase text-slate-400">
            Cantidad (
            {resolveInventoryItemUnit(movementDraft.context.stockItem)})
            <input
              className={movementFieldClass}
              type="number"
              min={1}
              step="1"
              value={movementDraft.qty}
              onChange={(event) =>
                setMovementDraft((current) => {
                  if (!current) {
                    return current;
                  }

                  const nextQty = event.target.value;
                  const synced = syncEntryCostFields({
                    qty: nextQty,
                    unitCost: current.unitCost || "",
                    totalCost: current.totalCost || "",
                    anchor: "qty",
                  });

                  return {
                    ...current,
                    qty: nextQty,
                    unitCost: synced.unitCost,
                    totalCost: synced.totalCost,
                  };
                })
              }
              autoFocus
            />
          </label>
        )}
        {movementDraft.type === "salida" ? (
          <div className="mt-3 rounded-lg border border-black/70 bg-black/10 p-3 text-xs font-bold text-slate-300">
            <p>Disponible actualmente: {salidaAvailable}</p>
            <p className="mt-1">Salida: {Number.isFinite(salidaQty) ? salidaQty : 0}</p>
            <p className="mt-1 font-black text-[#f8fafc]">
              Quedará disponible:{" "}
              {Math.max(
                0,
                salidaAvailable - (Number.isFinite(salidaQty) ? salidaQty : 0),
              )}
            </p>
          </div>
        ) : null}
        {movementDraft.type === "entrada" ? (
          <details className="group mt-3 w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-black/70 bg-black/10">
            <summary className="flex h-11 min-w-0 cursor-pointer list-none items-center gap-2 px-3 text-sm font-black text-slate-300 hover:text-white [&::-webkit-details-marker]:hidden">
              <span className="min-w-0 flex-1 truncate">Datos de compra</span>
              <span className="shrink-0 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                Opcional
              </span>
              <ChevronDown
                className="h-4 w-4 shrink-0 text-slate-500 transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="box-border flex min-w-0 flex-col gap-3 border-t border-black/70 p-3">
              <div className="flex min-w-0 flex-col gap-1.5">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-2">
                  <span className="text-xs font-black uppercase text-slate-400">
                    Costo (USD)
                  </span>
                  <span className="inline-flex shrink-0 rounded-md border border-black bg-surface-inset p-0.5">
                    {(["total", "unit"] as const).map((anchor) => (
                      <button
                        key={anchor}
                        type="button"
                        onClick={() =>
                          setMovementDraft((current) =>
                            current ? { ...current, entryCostAnchor: anchor } : current,
                          )
                        }
                        className={`h-7 rounded px-2 text-[10px] font-black uppercase transition ${
                          (movementDraft.entryCostAnchor || "unit") === anchor
                            ? "bg-slate-700 text-white"
                            : "text-slate-500 hover:text-slate-300"
                        }`}
                      >
                        {anchor === "total" ? "Lote" : "Por pieza"}
                      </button>
                    ))}
                  </span>
                </div>
                <span className={`${movementFieldClass} flex items-center gap-1`}>
                  <span className="shrink-0 text-slate-400" aria-hidden>
                    $
                  </span>
                  <input
                    className="min-w-0 flex-1 bg-transparent font-black text-[#f8fafc] outline-none placeholder:font-semibold placeholder:text-slate-500"
                    type="text"
                    inputMode="decimal"
                    aria-label="Costo en dólares"
                    value={
                      (movementDraft.entryCostAnchor || "unit") === "total"
                        ? movementDraft.totalCost || ""
                        : movementDraft.unitCost || ""
                    }
                    onChange={(event) =>
                      setMovementDraft((current) => {
                        if (!current) {
                          return current;
                        }

                        const anchor = current.entryCostAnchor || "unit";
                        const nextCost = event.target.value;
                        const synced = syncEntryCostFields({
                          qty: current.qty,
                          unitCost: anchor === "unit" ? nextCost : current.unitCost || "",
                          totalCost: anchor === "total" ? nextCost : current.totalCost || "",
                          anchor,
                        });

                        return {
                          ...current,
                          unitCost: anchor === "unit" ? nextCost : synced.unitCost,
                          totalCost: anchor === "total" ? nextCost : synced.totalCost,
                        };
                      })
                    }
                    placeholder={
                      (movementDraft.entryCostAnchor || "unit") === "total"
                        ? "Total del lote"
                        : "Costo por pieza"
                    }
                  />
                </span>
              </div>
              <div className="flex min-w-0 flex-col gap-1.5">
                <span className="text-xs font-black uppercase text-slate-400">
                  Proveedor
                </span>
                <input
                  className={movementFieldClass}
                  value={movementDraft.supplierName || ""}
                  onChange={(event) =>
                    setMovementDraft((current) =>
                      current ? { ...current, supplierName: event.target.value } : current,
                    )
                  }
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") {
                      return;
                    }

                    event.preventDefault();
                    commitSupplierName(movementDraft.supplierName || "");
                  }}
                  placeholder="Opcional"
                  aria-label="Proveedor"
                />
                {visibleSupplierTags.length > 0 ? (
                  <div className="flex min-w-0 flex-wrap gap-2">
                    {visibleSupplierTags.map((tag) => {
                      const selected = isInventorySupplierTagSelected(
                        tag,
                        movementDraft.supplierName || "",
                      );

                      return (
                        <button
                          key={tag}
                          type="button"
                          className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${
                            selected
                              ? "border-emerald-500 bg-emerald-950/45 text-emerald-100"
                              : "border-black bg-surface-inset text-slate-300 hover:bg-surface-card"
                          }`}
                          onClick={() => {
                            if (selected) {
                              setMovementDraft((current) =>
                                current ? { ...current, supplierName: "" } : current,
                              );
                              return;
                            }

                            commitSupplierName(tag);
                          }}
                        >
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
              </div>
              <label className="flex min-w-0 flex-col gap-1.5 text-xs font-black uppercase text-slate-400">
                N.º factura o referencia
                <input
                  className={movementFieldClass}
                  value={movementDraft.invoiceReference || ""}
                  onChange={(event) =>
                    setMovementDraft((current) =>
                      current
                        ? { ...current, invoiceReference: event.target.value }
                        : current,
                    )
                  }
                  placeholder="Opcional"
                />
              </label>
              <div className="flex min-w-0 flex-col gap-1.5 text-xs font-black uppercase text-slate-400">
                <span>Fecha de compra</span>
                <DateInput
                  compact={false}
                  value={movementDraft.purchaseDate || todayIso}
                  className="!h-10"
                  ariaLabel="Fecha de compra"
                  onChange={(nextDate) =>
                    setMovementDraft((current) =>
                      current ? { ...current, purchaseDate: nextDate } : current,
                    )
                  }
                />
              </div>
            </div>
          </details>
        ) : null}
        <details className="group mt-2 w-full min-w-0 max-w-full overflow-hidden rounded-lg border border-black/70 bg-black/10">
          <summary className="flex h-11 min-w-0 cursor-pointer list-none items-center gap-2 px-3 text-sm font-black text-slate-300 hover:text-white [&::-webkit-details-marker]:hidden">
            <span className="min-w-0 flex-1 truncate">Motivo y detalle</span>
            <span className="max-w-32 truncate text-[10px] font-bold uppercase tracking-wide text-slate-500">
              {movementReasonOptions.find(
                (option) => option.value === movementDraft.reasonCode,
              )?.label || "Opcional"}
            </span>
            <ChevronDown
              className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>
          <div className="box-border flex min-w-0 flex-col gap-3 border-t border-black/70 p-3">
            <label className="flex min-w-0 flex-col gap-1.5 text-xs font-black uppercase text-slate-400">
              Motivo
              <select
                className={movementFieldClass}
                value={movementDraft.reasonCode}
                onChange={(event) =>
                  setMovementDraft((current) =>
                    current
                      ? {
                          ...current,
                          reasonCode: event.target.value as MovementDraft["reasonCode"],
                        }
                      : current,
                  )
                }
              >
                {movementReasonOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-w-0 flex-col gap-1.5 text-xs font-black uppercase text-slate-400">
              Detalle
              <input
                className={movementFieldClass}
                value={movementDraft.note}
                onChange={(event) =>
                  setMovementDraft((current) =>
                    current ? { ...current, note: event.target.value } : current,
                  )
                }
                placeholder={movementReasonDetailPlaceholder(movementDraft.reasonCode)}
                required={movementReasonRequiresDetail(movementDraft.reasonCode)}
              />
            </label>
          </div>
        </details>
        {stockError ? (
          <p className="mt-3 rounded-lg border border-rose-800 bg-rose-950/30 px-3 py-2 text-sm font-bold text-rose-100">
            {stockError}
          </p>
        ) : null}
        <div className="grid shrink-0 grid-cols-2 gap-3 pt-4">
          <button
            type="button"
            onClick={() => setMovementDraft(null)}
            disabled={stockSaving}
            className="h-12 w-full rounded-lg border border-black bg-surface-inset px-4 text-base font-black text-slate-200 hover:bg-surface-card-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={stockSaving}
            className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 text-base font-black text-slate-950 disabled:opacity-60"
          >
            {stockSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {movementDraft.type === "ajuste" ? "Guardar ajuste" : "Guardar"}
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
