"use client";

import {
  ArrowRightLeft,
  ClipboardList,
  History,
  LocateFixed,
  PackageSearch,
  Truck,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { InventoryTrackingTab } from "@/components/inventory/inventory-tracking-drawer";
import { INVENTORY_WAREHOUSES_HREF } from "@/lib/inventory-structure-utils";

export type InventoryWorkspaceView = "articles" | "trucks" | InventoryTrackingTab;

type WorkspaceItem = {
  id: InventoryWorkspaceView;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  badge?: number;
};

export function InventoryWorkspaceNav({
  activeView,
  assignmentCount,
  movementCount,
  transferHint = false,
  onSelectView,
}: {
  activeView: InventoryWorkspaceView;
  assignmentCount: number;
  movementCount: number;
  transferHint?: boolean;
  onSelectView: (view: InventoryWorkspaceView) => void;
}) {
  const items: WorkspaceItem[] = [
    {
      id: "articles",
      label: "Artículos",
      shortLabel: "Artículos",
      icon: PackageSearch,
    },
    {
      id: "custody",
      label: "Resumen y ubicaciones",
      shortLabel: "Dónde están",
      icon: LocateFixed,
    },
    {
      id: "transfers",
      label: "Transferencias",
      shortLabel: "Transferencias",
      icon: ArrowRightLeft,
      badge: transferHint ? 1 : undefined,
    },
    {
      id: "assignments",
      label: "Asignaciones a empleados",
      shortLabel: "Asignaciones",
      icon: ClipboardList,
      badge: assignmentCount || undefined,
    },
    {
      id: "history",
      label: "Historial de movimientos",
      shortLabel: "Movimientos",
      icon: History,
      badge: movementCount || undefined,
    },
    {
      id: "trucks",
      label: "Inventario en camiones",
      shortLabel: "Camiones",
      icon: Truck,
    },
  ];

  return (
    <nav
      aria-label="Áreas de inventario"
      className="flex min-w-0 max-w-full flex-wrap items-center gap-1"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const active = activeView === item.id;

        return (
          <button
            key={item.id}
            type="button"
            aria-pressed={active}
            title={item.label}
            onClick={() => onSelectView(item.id)}
            className={`relative inline-flex h-9 min-w-0 items-center gap-1.5 rounded-lg border px-2 text-[11px] font-black transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
              active
                ? "border-emerald-500/60 bg-emerald-400 text-slate-950"
                : "border-black bg-[#141a18] text-slate-300 hover:bg-[#243029] hover:text-white"
            }`}
          >
            <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
            <span className="truncate">{item.shortLabel}</span>
            {item.badge ? (
              <span
                className={`rounded-md px-1.5 py-0.5 text-[9px] tabular-nums ${
                  active
                    ? "bg-slate-950/15 text-slate-950"
                    : "bg-surface-inset text-slate-300"
                }`}
              >
                {item.badge > 99 ? "99+" : item.badge}
              </span>
            ) : null}
          </button>
        );
      })}

      <span className="mx-0.5 hidden h-6 w-px bg-black/80 sm:block" aria-hidden />

      <Link
        href={INVENTORY_WAREHOUSES_HREF}
        title="Bodegas, zonas y estantes"
        className="inline-flex h-9 min-w-0 items-center gap-1.5 rounded-lg border border-black bg-[#141a18] px-2 text-[11px] font-black text-slate-300 transition hover:bg-[#243029] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
      >
        <Warehouse className="h-3.5 w-3.5 shrink-0" aria-hidden />
        <span className="truncate">Bodegas</span>
      </Link>
    </nav>
  );
}
