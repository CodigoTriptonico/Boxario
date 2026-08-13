"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { inputClass } from "@/components/ui-blocks";
import {
  INVENTORY_UNIT_PRESETS,
  normalizeInventoryUnit,
  resolveInventoryItemUnit,
} from "@/lib/inventory-units";
import type { ItemContextMenu } from "@/lib/inventory-structure-utils";

export type InventoryItemAdminDraft = {
  name: string;
  sku: string;
  barcode: string;
  description: string;
  unit: string;
  minStock: string;
  maxStock: string;
  inventoryClass: "consumable" | "sellable" | "reusable" | "asset";
  preferredSupplier: string;
  requiresSerialTracking: boolean;
  requiresLotTracking: boolean;
  requiresExpiryTracking: boolean;
  isCommercial: boolean;
  isActive: boolean;
};

type InventoryItemAdminModalProps = {
  open: boolean;
  context: ItemContextMenu | null;
  saving: boolean;
  onClose: () => void;
  onSubmit: (draft: InventoryItemAdminDraft) => void | Promise<void>;
};

const initialDraft: InventoryItemAdminDraft = {
  name: "",
  sku: "",
  barcode: "",
  description: "",
  unit: "pieza",
  minStock: "2",
  maxStock: "",
  inventoryClass: "consumable",
  preferredSupplier: "",
  requiresSerialTracking: false,
  requiresLotTracking: false,
  requiresExpiryTracking: false,
  isCommercial: false,
  isActive: true,
};

export function InventoryItemAdminModal({
  open,
  context,
  saving,
  onClose,
  onSubmit,
}: InventoryItemAdminModalProps) {
  const [draft, setDraft] = useState<InventoryItemAdminDraft>(initialDraft);

  useEffect(() => {
    if (!open || !context) {
      return;
    }

    queueMicrotask(() => {
      setDraft({
        name: context.treeItem.name,
        sku: context.stockItem.sku || context.stockItem.size || "",
        barcode: context.stockItem.barcode || "",
        description: context.stockItem.description || "",
        unit: resolveInventoryItemUnit(context.stockItem),
        minStock: String(context.stockItem.minStock ?? 2),
        maxStock:
          context.stockItem.maxStock == null ? "" : String(context.stockItem.maxStock),
        inventoryClass: context.stockItem.inventoryClass || "consumable",
        preferredSupplier: context.stockItem.preferredSupplier || "",
        requiresSerialTracking: context.stockItem.requiresSerialTracking ?? false,
        requiresLotTracking: context.stockItem.requiresLotTracking ?? false,
        requiresExpiryTracking: context.stockItem.requiresExpiryTracking ?? false,
        isCommercial: context.stockItem.isCommercial ?? false,
        isActive: context.stockItem.isActive ?? true,
      });
    });
  }, [context, open]);

  if (!open || !context) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[150] flex items-start justify-center overflow-y-auto bg-black/45 p-4 pt-[5dvh]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <form
        className="w-full max-w-2xl rounded-xl border border-black bg-[#17211d] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        onSubmit={(event) => {
          event.preventDefault();
          void onSubmit(draft);
        }}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-3">
          <p className="text-lg font-black text-[#f8fafc]">Editar artículo</p>
          <p className="text-xs font-bold text-slate-500">
            {context.categoryName}
            {context.subcategoryName ? ` · ${context.subcategoryName}` : ""}
          </p>
        </div>

        <label className="grid gap-1.5 text-xs font-black uppercase text-slate-400">
          Nombre
          <input
            className={`${inputClass} h-10 text-sm normal-case`}
            value={draft.name}
            onChange={(event) =>
              setDraft((current) => ({ ...current, name: event.target.value }))
            }
            required
            autoFocus
          />
        </label>

        <label className="mt-3 grid gap-1.5 text-xs font-black uppercase text-slate-400">
          Descripción
          <textarea
            className={`${inputClass} min-h-20 resize-y py-2 text-sm normal-case`}
            value={draft.description}
            onChange={(event) =>
              setDraft((current) => ({ ...current, description: event.target.value }))
            }
            placeholder="Qué es, para qué se usa o cómo identificarlo"
          />
        </label>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-black uppercase text-slate-400">
            SKU
            <input
              className={`${inputClass} h-10 text-sm normal-case`}
              value={draft.sku}
              onChange={(event) =>
                setDraft((current) => ({ ...current, sku: event.target.value }))
              }
              placeholder="Código interno"
            />
          </label>
          <label className="grid gap-1.5 text-xs font-black uppercase text-slate-400">
            Código de barras
            <input
              className={`${inputClass} h-10 text-sm normal-case`}
              value={draft.barcode}
              onChange={(event) =>
                setDraft((current) => ({ ...current, barcode: event.target.value }))
              }
              placeholder="Escanea o escribe el código"
            />
          </label>
        </div>

        <div className="my-4 border-t border-white/10" />

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-black uppercase text-slate-400">
            Clase de inventario
            <select
              className={`${inputClass} h-10 text-sm normal-case`}
              value={draft.inventoryClass}
              onChange={(event) => {
                const inventoryClass = event.target
                  .value as InventoryItemAdminDraft["inventoryClass"];
                setDraft((current) => ({
                  ...current,
                  inventoryClass,
                  isCommercial:
                    inventoryClass === "sellable" ? true : current.isCommercial,
                }));
              }}
            >
              <option value="consumable">Consumible</option>
              <option value="sellable">Producto para vender</option>
              <option value="reusable">Reutilizable</option>
              <option value="asset">Activo</option>
            </select>
          </label>
          <label className="grid gap-1.5 text-xs font-black uppercase text-slate-400">
            Proveedor habitual
            <input
              className={`${inputClass} h-10 text-sm normal-case`}
              value={draft.preferredSupplier}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  preferredSupplier: event.target.value,
                }))
              }
              placeholder="Opcional"
            />
          </label>
        </div>

        <div className="mt-3">
          <p className="text-xs font-black uppercase text-slate-400">Unidad</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {INVENTORY_UNIT_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setDraft((current) => ({ ...current, unit: preset }))}
                className={`rounded-lg border px-2.5 py-1.5 text-xs font-black capitalize ${
                  normalizeInventoryUnit(draft.unit) === preset
                    ? "border-emerald-500 bg-emerald-400/10 text-emerald-200"
                    : "border-black bg-surface-inset text-slate-300"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1.5 text-xs font-black uppercase text-slate-400">
            Stock mínimo
            <input
              className={`${inputClass} h-10 text-sm`}
              type="number"
              min={0}
              step={1}
              value={draft.minStock}
              onChange={(event) =>
                setDraft((current) => ({ ...current, minStock: event.target.value }))
              }
            />
          </label>
          <label className="grid gap-1.5 text-xs font-black uppercase text-slate-400">
            Stock máximo
            <input
              className={`${inputClass} h-10 text-sm`}
              type="number"
              min={0}
              step={1}
              value={draft.maxStock}
              onChange={(event) =>
                setDraft((current) => ({ ...current, maxStock: event.target.value }))
              }
              placeholder="Sin límite"
            />
          </label>
        </div>

        <div className="mt-4 border-t border-white/10 pt-3">
          <p className="text-xs font-black uppercase text-slate-400">
            Trazabilidad requerida
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {([
              ["requiresSerialTracking", "Número de serie"],
              ["requiresLotTracking", "Lote"],
              ["requiresExpiryTracking", "Vencimiento"],
            ] as const).map(([key, label]) => (
              <label
                key={key}
                className="flex items-center gap-2 text-sm font-black text-slate-200"
              >
                <input
                  type="checkbox"
                  checked={draft[key]}
                  onChange={(event) =>
                    setDraft((current) => ({ ...current, [key]: event.target.checked }))
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-4 grid gap-2 border-t border-white/10 pt-3 sm:grid-cols-2">
          <label className="flex items-center gap-2 text-sm font-black text-slate-200">
            <input
              type="checkbox"
              checked={draft.isCommercial}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  isCommercial: event.target.checked,
                }))
              }
            />
            Disponible para venta
          </label>
          <label className="flex items-center gap-2 text-sm font-black text-slate-200">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(event) =>
                setDraft((current) => ({ ...current, isActive: event.target.checked }))
              }
            />
            Artículo activo
          </label>
        </div>

        <p className="mt-3 text-xs font-bold text-slate-500">
          El stock actual, historial, costos y asignaciones solo cambian mediante
          operaciones auditables.
        </p>

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-black bg-surface-inset px-3 text-sm font-black text-slate-300"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving || !draft.name.trim()}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-400 px-4 text-sm font-black text-slate-950 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Guardar
          </button>
        </div>
      </form>
    </div>
  );
}
