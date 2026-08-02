"use client";

import { Check, X } from "lucide-react";
import { addBtnClass, iconBtnClass } from "@/lib/inventory-structure-utils";

type InventorySubcategoryFormProps = {
  compact?: boolean;
  value: string;
  onChange: (value: string) => void;
  onAdd: () => void;
  onCancel: () => void;
};

export function InventorySubcategoryForm({
  compact = false,
  value,
  onChange,
  onAdd,
  onCancel,
}: InventorySubcategoryFormProps) {
  const fieldClass = compact
    ? "h-9 min-w-0 flex-1 bg-transparent px-2 text-xs font-black text-[#f8fafc] outline-none placeholder:text-slate-500"
    : "h-10 min-w-0 flex-1 bg-transparent px-2 text-sm font-black text-[#f8fafc] outline-none placeholder:text-slate-500";

  return (
    <div
      className={`inset-shell flex min-w-[12rem] flex-1 items-center gap-1.5 rounded-lg border border-black bg-[#111827] p-1.5 ${
        compact ? "sm:max-w-xs" : "max-w-md"
      }`}
    >
      <input
        className={fieldClass}
        placeholder="Subcategoría (ej. colores)"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            onAdd();
          }
        }}
        autoFocus
      />
      <button
        type="button"
        onClick={onAdd}
        className={addBtnClass}
        title="Crear subcategoría"
        aria-label="Crear subcategoría"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onCancel}
        className={iconBtnClass}
        title="Cancelar"
        aria-label="Cancelar"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
