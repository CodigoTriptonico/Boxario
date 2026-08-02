"use client";

import { Check, Plus, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { primaryButtonClass } from "@/components/ui-blocks";
import { ONBOARDING_TARGETS } from "@/lib/onboarding/coach-targets";
import { INVENTORY_HREF } from "@/lib/inventory-structure-utils";

type InventoryStructureEmptyStateProps = {
  showStructureOptions: boolean;
  showNewCategoryInput: boolean;
  setShowNewCategoryInput: (open: boolean) => void;
  newCategoryName: string;
  setNewCategoryName: (name: string) => void;
  onAddCategory: () => void;
  onOpenStructureOptions: (opts?: { addCategory?: boolean }) => void;
  emptyCategoryFormRef: React.RefObject<HTMLDivElement | null>;
};

export function InventoryStructureEmptyState({
  showStructureOptions,
  showNewCategoryInput,
  setShowNewCategoryInput,
  newCategoryName,
  setNewCategoryName,
  onAddCategory,
  onOpenStructureOptions,
  emptyCategoryFormRef,
}: InventoryStructureEmptyStateProps) {
  return (
    <section className="rounded-xl border border-dashed border-slate-600/60 p-5">
      <div className="mx-auto flex min-h-[22rem] max-w-xl flex-col items-center justify-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-400 text-slate-950">
          <Sparkles className="h-7 w-7" />
        </span>
        <h2 className="mt-4 text-3xl font-black text-[#f8fafc]">Inventario</h2>
        <p className="mt-1 text-sm font-bold text-slate-400">Crea una categoría para empezar.</p>

        {showStructureOptions ? (
          showNewCategoryInput ? (
            <div
              ref={emptyCategoryFormRef}
              className="inset-shell mt-5 flex w-full max-w-md items-center gap-2 rounded-xl bg-[#111827] p-2"
            >
              <input
                className="h-10 min-w-0 flex-1 bg-transparent px-2 text-sm font-black text-[#f8fafc] outline-none placeholder:text-slate-500"
                placeholder="Nueva categoría"
                value={newCategoryName}
                onChange={(event) => setNewCategoryName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    onAddCategory();
                  }
                }}
                autoFocus
              />
              <button
                type="button"
                onClick={onAddCategory}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-400 text-slate-950 hover:brightness-110"
                title="Crear categoría"
                aria-label="Crear categoría"
              >
                <Check className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewCategoryInput(false);
                  setNewCategoryName("");
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-400 hover:bg-surface-card-hover hover:text-[#f8fafc]"
                title="Cancelar"
                aria-label="Cancelar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => onOpenStructureOptions({ addCategory: true })}
                className={primaryButtonClass}
                data-onboarding-target={ONBOARDING_TARGETS.INVENTORY_ADD_CATEGORY}
              >
                <Plus className="h-3.5 w-3.5" />
                Agregar categoría
              </button>
            </div>
          )
        ) : (
          <Link href={INVENTORY_HREF} className={`${primaryButtonClass} mt-5`}>
            Ir a inventario
          </Link>
        )}
      </div>
    </section>
  );
}
