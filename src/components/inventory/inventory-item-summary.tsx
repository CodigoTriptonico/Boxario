"use client";

import { MoreHorizontal } from "lucide-react";
import type { MouseEvent } from "react";
import type { InventoryStockItem } from "@/lib/inventory-stock";

const inventoryClassLabel = {
  consumable: "Consumible",
  sellable: "Para vender",
  reusable: "Reutilizable",
  asset: "Activo",
} as const;

export function InventoryItemMeta({ item, className }: { item: InventoryStockItem; className: string }) {
  const meta = [
    item.inventoryClass ? inventoryClassLabel[item.inventoryClass] : "",
    item.sku ? `SKU ${item.sku}` : "",
  ].filter(Boolean);

  return meta.length ? <p className={className}>{meta.join(" · ")}</p> : null;
}

export function InventoryItemOperationsButton({
  itemName,
  compact = false,
  onOperate,
}: {
  itemName: string;
  compact?: boolean;
  onOperate: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      aria-label={`Abrir operaciones de ${itemName}`}
      title={`Operar ${itemName}`}
      onClick={onOperate}
      className={
        compact
          ? "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black bg-[#111827]/70 text-slate-300 transition hover:bg-[#243029] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
          : "absolute right-2 top-2 z-10 inline-flex h-9 w-9 items-center justify-center rounded-lg border border-black bg-[#111827]/90 text-slate-300 shadow-sm transition hover:bg-[#243029] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50"
      }
    >
      <MoreHorizontal className="h-4 w-4" aria-hidden />
    </button>
  );
}
