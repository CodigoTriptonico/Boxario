"use client";

import { Loader2 } from "lucide-react";
import { createPortal } from "react-dom";
import { inputClass } from "@/components/ui-blocks";
import type { ItemContextMenu } from "@/lib/inventory-structure-utils";
import {
  INVENTORY_UNIT_PRESETS,
  normalizeInventoryUnit,
} from "@/lib/inventory-units";

type InventoryItemUnitEditorModalProps = {
  unitEditor: { context: ItemContextMenu; value: string };
  mounted: boolean;
  unitSaving: boolean;
  onUpdateItemUnit?: (
    context: ItemContextMenu,
    unit: string,
  ) => boolean | Promise<boolean>;
  onValueChange: (value: string) => void;
  onClose: () => void;
};

export function InventoryItemUnitEditorModal({
  unitEditor,
  mounted,
  unitSaving,
  onUpdateItemUnit,
  onValueChange,
  onClose,
}: InventoryItemUnitEditorModalProps) {
  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[150] flex items-center justify-center bg-black/45 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <form
        className="w-full max-w-sm rounded-xl border border-black bg-[#17211d] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.5)]"
        onSubmit={(event) => {
          event.preventDefault();

          if (!onUpdateItemUnit) {
            return;
          }

          void (async () => {
            const saved = await onUpdateItemUnit(
              unitEditor.context,
              normalizeInventoryUnit(unitEditor.value),
            );

            if (saved) {
              onClose();
            }
          })();
        }}
      >
        <div className="mb-3">
          <p className="text-lg font-black text-[#f8fafc]">
            Unidad de medida
          </p>
          <p className="truncate text-sm font-bold text-slate-400">
            {unitEditor.context.treeItem.name}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {INVENTORY_UNIT_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => onValueChange(preset)}
              className={`rounded-lg border px-2.5 py-1.5 text-xs font-black capitalize ${
                normalizeInventoryUnit(unitEditor.value) === preset
                  ? "border-emerald-500 bg-emerald-400/10 text-emerald-200"
                  : "border-black bg-surface-inset text-slate-300 hover:bg-surface-card-hover"
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
        <label className="mt-3 grid gap-1.5 text-xs font-black uppercase text-slate-400">
          Personalizada
          <input
            className={`${inputClass} h-10 text-sm`}
            value={unitEditor.value}
            onChange={(event) => onValueChange(event.target.value)}
            placeholder="ej. pieza, rollo, kg"
            maxLength={24}
            autoFocus
          />
        </label>
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg border border-black bg-surface-inset px-3 text-sm font-black text-slate-300 hover:bg-surface-card-hover"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={unitSaving || !normalizeInventoryUnit(unitEditor.value)}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-emerald-400 px-4 text-sm font-black text-slate-950 disabled:opacity-60"
          >
            {unitSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Guardar
          </button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
