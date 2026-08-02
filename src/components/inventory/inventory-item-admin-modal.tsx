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
  unit: string;
  minStock: string;
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

export function InventoryItemAdminModal({
  open,
  context,
  saving,
  onClose,
  onSubmit,
}: InventoryItemAdminModalProps) {
  const [draft, setDraft] = useState<InventoryItemAdminDraft>({
    name: "",
    sku: "",
    unit: "pieza",
    minStock: "2",
    isCommercial: false,
    isActive: true,
  });

  useEffect(() => {
    if (!open || !context) {
      return;
    }

    queueMicrotask(() => {
      setDraft({
        name: context.treeItem.name,
        sku: context.stockItem.sku || context.stockItem.size || "",
        unit: resolveInventoryItemUnit(context.stockItem),
        minStock: String(context.stockItem.minStock ?? 2),
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
      className="fixed inset-0 z-[150] flex items-start justify-center overflow-y-auto bg-black/45 p-4 pt-[8dvh]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <form
        className="w-full max-w-md rounded-xl border border-black bg-[#17211d] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
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
            className={`${inputClass} h-10 text-sm`}
            value={draft.name}
            onChange={(event) =>
              setDraft((current) => ({ ...current, name: event.target.value }))
            }
            required
            autoFocus
          />
        </label>

        <label className="mt-3 grid gap-1.5 text-xs font-black uppercase text-slate-400">
          SKU o código
          <input
            className={`${inputClass} h-10 text-sm`}
            value={draft.sku}
            onChange={(event) =>
              setDraft((current) => ({ ...current, sku: event.target.value }))
            }
            placeholder="Opcional"
          />
        </label>

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

        <label className="mt-3 grid gap-1.5 text-xs font-black uppercase text-slate-400">
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

        <label className="mt-3 flex items-center gap-2 text-sm font-black text-slate-200">
          <input
            type="checkbox"
            checked={draft.isCommercial}
            onChange={(event) =>
              setDraft((current) => ({ ...current, isCommercial: event.target.checked }))
            }
          />
          Artículo comercial
        </label>

        <label className="mt-2 flex items-center gap-2 text-sm font-black text-slate-200">
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(event) =>
              setDraft((current) => ({ ...current, isActive: event.target.checked }))
            }
          />
          Activo
        </label>

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
