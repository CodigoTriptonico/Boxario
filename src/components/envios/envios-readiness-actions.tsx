"use client";

import Link from "next/link";
import { Settings2 } from "lucide-react";
import { primaryButtonClass } from "@/components/ui-blocks";
import type { EnviosClientMode, EnviosReadinessFilter } from "@/lib/shipment-display";

export function EnviosReadinessActions({
  mode,
  readinessFilter,
  onReadinessFilterChange,
  totalCount,
  listosCount,
  pendientesCount,
  canManageSales,
  canManageSalesSettings,
  isConductor,
}: {
  mode: EnviosClientMode;
  readinessFilter: EnviosReadinessFilter;
  onReadinessFilterChange: (value: EnviosReadinessFilter) => void;
  totalCount: number;
  listosCount: number;
  pendientesCount: number;
  canManageSales: boolean;
  canManageSalesSettings: boolean;
  isConductor: boolean;
}) {
  const isHistoryMode = mode === "history";

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap">
      <div className="flex h-9 min-w-0 flex-1 divide-x divide-black overflow-hidden rounded-lg border border-black bg-surface-inset sm:flex-none">
        <button
          type="button"
          aria-pressed={readinessFilter === "all"}
          onClick={() => onReadinessFilterChange("all")}
          className={`flex min-w-0 flex-1 items-center gap-1.5 whitespace-nowrap px-1.5 transition sm:min-w-[4.5rem] sm:flex-none sm:px-2 ${
            readinessFilter === "all"
              ? "bg-emerald-400/15 text-emerald-200"
              : "text-slate-500 hover:bg-surface-card hover:text-slate-300"
          }`}
          title={isHistoryMode ? "Ver todos los entregados" : "Ver todos los envíos"}
        >
          <span className="text-[9px] font-black uppercase leading-none">
            {isHistoryMode ? "entregados" : "total"}
          </span>
          <span className="text-sm font-black tabular-nums leading-none text-[#f8fafc]">
            {totalCount}
          </span>
        </button>
        {!isHistoryMode ? (
          <>
            <button
              type="button"
              aria-pressed={readinessFilter === "listos"}
              onClick={() => onReadinessFilterChange("listos")}
              className={`flex min-w-0 flex-1 items-center gap-1.5 whitespace-nowrap px-1.5 transition sm:min-w-[4.75rem] sm:flex-none sm:px-2 ${
                readinessFilter === "listos"
                  ? "bg-emerald-400/15 text-emerald-200"
                  : "text-slate-500 hover:bg-surface-card hover:text-slate-300"
              }`}
              title="Ver envíos ya marcados para dejar o recoger"
            >
              <span className="text-[9px] font-black uppercase leading-none">Listos</span>
              <span className="text-sm font-black tabular-nums leading-none text-[#f8fafc]">
                {listosCount}
              </span>
            </button>
            <button
              type="button"
              aria-pressed={readinessFilter === "pendientes"}
              onClick={() => onReadinessFilterChange("pendientes")}
              className={`flex min-w-0 flex-1 items-center gap-1.5 whitespace-nowrap px-1.5 transition sm:min-w-[5.5rem] sm:flex-none sm:px-2 ${
                readinessFilter === "pendientes"
                  ? "bg-amber-400/15 text-amber-200"
                  : "text-slate-500 hover:bg-surface-card hover:text-slate-300"
              }`}
              title="Ver envíos pendientes de marcar para dejar o recoger"
            >
              <span className="text-[9px] font-black uppercase leading-none">Pendientes</span>
              <span className="text-sm font-black tabular-nums leading-none text-amber-300">
                {pendientesCount}
              </span>
            </button>
          </>
        ) : null}
      </div>

      {canManageSales && !isConductor && !isHistoryMode ? (
        <Link href="/venta" className={`${primaryButtonClass} h-9 shrink-0 px-2 sm:px-4`}>
          <span className="sm:hidden">Nuevo</span>
          <span className="hidden sm:inline">Nuevo envío</span>
        </Link>
      ) : null}
      {canManageSalesSettings && !isConductor ? (
        <Link
          href="/configuracion?view=prices"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black bg-surface-inset text-slate-300 hover:text-white"
          title="Configuración de ventas"
          aria-label="Configuración de ventas"
        >
          <Settings2 className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}
