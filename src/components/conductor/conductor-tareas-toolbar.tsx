"use client";

import {
  AlertTriangle,
  CheckCircle2,
  ListTodo,
  RefreshCw,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { InlineSearchPicker } from "@/components/inline-search-picker";
import { secondaryButtonClass } from "@/components/ui-blocks";
import type { LogisticsTaskType } from "@/lib/logistics-routing";
import { CompactInfoDisclosure } from "@/components/conductor/conductor-task-items";

type TaskListMode = "pending" | "completed";

type ConductorTareasToolbarProps = {
  canPreview: boolean;
  effectiveDriverLabel: string;
  previewDriverId: string | null;
  previewOptions: ReturnType<typeof import("@/lib/conductor-tareas-view").buildConductorPreviewPickerOptions>;
  onPreviewDriverChange: (nextDriverId: string) => void;
  selectedPendingBoxes: number;
  completedOutcomeSummary: { successBoxes: number; failedBoxes: number };
  operationScope: "domicilios" | "agencias";
  onOperationScopeChange: (scope: "domicilios" | "agencias") => void;
  agencyModuleEnabled: boolean;
  taskFilter: LogisticsTaskType;
  onTaskFilterChange: (filter: LogisticsTaskType) => void;
  pendingSummary: { deliverCount: number; pickupCount: number };
  listMode: TaskListMode;
  onListModeChange: (mode: TaskListMode) => void;
  pendingCount: number;
  completedCount: number;
  offlineSnapshot: { needsAttentionCount: number; syncingCount: number };
  online: boolean;
  hasSyncActivity: boolean;
  offlineGlobalLabel: string;
  onRetryAllSync: () => void;
};

export function ConductorTareasToolbar({
  canPreview,
  effectiveDriverLabel,
  previewDriverId,
  previewOptions,
  onPreviewDriverChange,
  selectedPendingBoxes,
  completedOutcomeSummary,
  operationScope,
  onOperationScopeChange,
  agencyModuleEnabled,
  taskFilter,
  onTaskFilterChange,
  pendingSummary,
  listMode,
  onListModeChange,
  pendingCount,
  completedCount,
  offlineSnapshot,
  online,
  hasSyncActivity,
  offlineGlobalLabel,
  onRetryAllSync,
}: ConductorTareasToolbarProps) {
  return (
    <section className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-black bg-surface-card-header p-2 shadow-[0_6px_18px_rgba(0,0,0,0.12)]">
      {canPreview ? (
        <div className="flex h-10 min-w-0 items-center gap-2 rounded-md border border-sky-800/70 bg-sky-950/25 pl-2">
          <p className="shrink-0 text-xs font-black uppercase tracking-wide text-sky-300">Admin</p>
          <CompactInfoDisclosure ariaLabel="Ver detalle de vista administrativa" tone="sky">
            Vista del conductor. Puedes completar tareas en su nombre; queda registrado como admin.
          </CompactInfoDisclosure>
          <InlineSearchPicker
            value={previewDriverId || ""}
            onChange={onPreviewDriverChange}
            options={previewOptions}
            placeholder="Conductor"
            searchPlaceholder="Buscar conductor"
            emptyLabel="Sin conductores"
            ariaLabel="Conductor a previsualizar"
            minWidthClass="min-w-[11rem] sm:min-w-[14rem]"
            disabled={!previewOptions.length}
          />
        </div>
      ) : (
        <div className="flex h-10 min-w-0 items-center gap-2 px-1.5">
          <p className="shrink-0 text-xs font-black uppercase tracking-wide text-slate-500">Ruta</p>
          <h1 className="max-w-48 truncate text-sm font-black tracking-tight text-[#f8fafc]">{effectiveDriverLabel}</h1>
        </div>
      )}

      <div className="flex h-10 min-w-0 overflow-hidden rounded-md border border-black">
        <div className="flex min-w-0 items-center gap-1.5 bg-surface-card px-2">
          <p className="text-xs font-black text-slate-400">Faltan</p>
          <p className="text-base font-black tabular-nums text-[#f8fafc]">{selectedPendingBoxes}</p>
        </div>
        <div className="flex min-w-0 items-center gap-1.5 border-l border-black bg-emerald-950/25 px-2">
          <p className="text-xs font-black text-emerald-300">Listas</p>
          <p className="text-base font-black tabular-nums text-emerald-200">{completedOutcomeSummary.successBoxes}</p>
        </div>
        <div className="flex min-w-0 items-center gap-1.5 border-l border-black bg-rose-950/25 px-2">
          <p className="text-xs font-black text-rose-300">No se pudo</p>
          <p className="text-base font-black tabular-nums text-rose-200">{completedOutcomeSummary.failedBoxes}</p>
        </div>
      </div>
      <Link href="/seguimiento/excepciones" className={`${secondaryButtonClass} h-10 text-xs`}>
        <AlertTriangle className="h-4 w-4" /> Excepciones
      </Link>

      <div className="flex h-10 min-w-0 overflow-hidden rounded-md border border-black" role="group" aria-label="Cambiar origen de tareas">
        <button type="button" className={`flex-1 text-xs font-black ${operationScope === "domicilios" ? "bg-emerald-950/35 text-emerald-100" : "bg-surface-card text-slate-300"}`} onClick={() => onOperationScopeChange("domicilios")}>Domicilios</button>
        {agencyModuleEnabled ? <button type="button" className={`flex-1 border-l border-black text-xs font-black ${operationScope === "agencias" ? "bg-emerald-950/35 text-emerald-100" : "bg-surface-card text-slate-300"}`} onClick={() => onOperationScopeChange("agencias")}>Agencias</button> : null}
      </div>

      {operationScope === "domicilios" ? <><div className="flex h-10 min-w-0 overflow-hidden rounded-md border border-black" role="group" aria-label="Filtrar tareas por tipo">
        <button
          type="button"
          aria-pressed={taskFilter === "deliver_empty_box"}
          className={`flex min-w-0 items-center gap-1.5 px-2.5 text-left text-xs font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 ${
            taskFilter === "deliver_empty_box"
              ? "bg-emerald-950/35 text-emerald-100"
              : "bg-surface-card text-slate-300 hover:bg-surface-inset"
          }`}
          onClick={() => onTaskFilterChange("deliver_empty_box")}
        >
          <span className="truncate text-xs font-black text-emerald-200">Por dejar</span>
          <span className="shrink-0 tabular-nums text-emerald-200">{pendingSummary.deliverCount}</span>
          <span className="sr-only">cajas por hacer</span>
        </button>
        <button
          type="button"
          aria-pressed={taskFilter === "pickup_full_box"}
          className={`flex min-w-0 items-center gap-1.5 border-l border-black px-2.5 text-left text-xs font-black transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 ${
            taskFilter === "pickup_full_box"
              ? "bg-amber-950/30 text-amber-100"
              : "bg-surface-card text-slate-300 hover:bg-surface-inset"
          }`}
          onClick={() => onTaskFilterChange("pickup_full_box")}
        >
          <span className="truncate text-xs font-black text-amber-200">Por recoger</span>
          <span className="shrink-0 tabular-nums text-amber-200">{pendingSummary.pickupCount}</span>
          <span className="sr-only">cajas por hacer</span>
        </button>
      </div>

      <div className="flex h-10 min-w-0 overflow-hidden rounded-md border border-black bg-surface-inset" role="tablist" aria-label="Vista de tareas">
          <button
            type="button"
            role="tab"
            aria-selected={listMode === "pending"}
            className={`flex min-w-0 items-center justify-center gap-1.5 px-3 text-sm font-black transition ${
              listMode === "pending"
                ? "bg-emerald-950/50 text-emerald-100"
                : "bg-surface-card text-slate-300 hover:bg-surface-inset"
            }`}
            onClick={() => onListModeChange("pending")}
          >
            <ListTodo className="h-4 w-4 shrink-0" />
            En ruta
            <span className="rounded-full border border-black bg-surface-inset px-1.5 py-0.5 text-xs font-black tabular-nums text-slate-300">{pendingCount}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={listMode === "completed"}
            className={`flex min-w-0 items-center justify-center gap-1.5 border-l border-black px-3 text-sm font-black transition ${
              listMode === "completed"
                ? "bg-sky-950/50 text-sky-100"
                : "bg-surface-card text-slate-300 hover:bg-surface-inset"
            }`}
            onClick={() => onListModeChange("completed")}
          >
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Resueltas
            <span className="rounded-full border border-black bg-surface-inset px-1.5 py-0.5 text-xs font-black tabular-nums text-slate-300">{completedCount}</span>
          </button>
      </div>

      <button
        type="button"
        className={`flex h-10 min-w-0 items-center gap-1.5 rounded-md border border-black px-2.5 text-xs font-black ${
          offlineSnapshot.needsAttentionCount > 0
            ? "bg-rose-950/35 text-rose-200"
            : hasSyncActivity
              ? "bg-amber-950/30 text-amber-200"
              : "bg-emerald-950/25 text-emerald-200"
        }`}
        aria-live="polite"
        disabled={offlineSnapshot.needsAttentionCount === 0}
        title={offlineSnapshot.needsAttentionCount > 0 ? "Reintentar sincronización" : undefined}
        onClick={onRetryAllSync}
      >
        {!online ? (
          <WifiOff className="h-4 w-4 shrink-0" />
        ) : hasSyncActivity ? (
          <RefreshCw className={`h-4 w-4 shrink-0 ${offlineSnapshot.syncingCount > 0 ? "animate-spin" : ""}`} />
        ) : (
          <CheckCircle2 className="h-4 w-4 shrink-0" />
        )}
        <span className="truncate">{offlineGlobalLabel}</span>
      </button>
      </> : null}
    </section>
  );
}
