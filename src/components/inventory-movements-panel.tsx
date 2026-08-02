"use client";

import {
  ArrowDownLeft,
  ArrowUpRight,
  BarChart3,
  History,
  Image as ImageIcon,
  Loader2,
  SlidersHorizontal,
  UserRound,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { listInventoryMovementsAction } from "@/app/actions/inventory-assignments";
import { DateInput } from "@/components/date-input";
import {
  listOrgMembersForInventoryAction,
  type InventoryMemberRow,
} from "@/app/actions/users";
import {
  InlineSearchPicker,
} from "@/components/inline-search-picker";
import { AppTabs, type AppTabDefinition } from "@/components/app-tabs";
import { InventoryToolbarIconButton } from "@/components/inventory/inventory-toolbar-icon-button";
import type {
  InventoryAssignment,
  InventoryMovement,
  InventoryMovementType,
} from "@/lib/inventory-types";
import { inventoryItemFilterOptions } from "@/lib/inventory-stock";
import type { InventoryStockItem } from "@/lib/inventory-stock";
import { summarizeMovements } from "@/lib/inventory-reports";
import {
  formatInventoryMovementReference,
  formatInventoryMovementTrail,
  inventoryMovementReasonLabel,
  readInventoryMovementEvidencePhotos,
  readInventoryMovementSupplierName,
} from "@/lib/inventory-movement-audit";
import { INVENTORY_MOVEMENTS_PAGE_SIZE } from "@/lib/inventory-movements-pagination";
import { secondaryButtonClass } from "@/components/ui-blocks";

type MovementsTab = "history" | "summary";

const movementsTabs: AppTabDefinition<MovementsTab>[] = [
  { id: "history", label: "Historial", icon: History },
  { id: "summary", label: "Resumen", icon: BarChart3 },
];

type InventoryMovementsDrawerProps = {
  warehouseId: string;
  movements: InventoryMovement[];
  assignments: InventoryAssignment[];
  items?: InventoryStockItem[];
  warehouseName?: string;
  iconOnly?: boolean;
  embedded?: boolean;
  onMovementsChange?: (next: InventoryMovement[]) => void;
  controlledOpen?: boolean;
  onControlledOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
};

const typeLabels: Record<InventoryMovementType, string> = {
  entrada: "Entrada",
  salida: "Salida",
  ajuste: "Ajuste",
  asignacion: "Asignación",
  devolucion: "Devolución",
  consumo: "Consumo",
  dano: "Daño",
  perdida: "Pérdida",
};

const typeTone: Record<InventoryMovementType, string> = {
  entrada: "border-emerald-500/30 bg-emerald-400/10 text-emerald-200",
  salida: "border-rose-500/30 bg-rose-400/10 text-rose-200",
  ajuste: "border-amber-500/30 bg-amber-400/10 text-amber-200",
  asignacion: "border-sky-500/30 bg-sky-400/10 text-sky-200",
  devolucion: "border-emerald-500/30 bg-emerald-400/10 text-emerald-200",
  consumo: "border-amber-500/30 bg-amber-400/10 text-amber-200",
  dano: "border-rose-500/30 bg-rose-400/10 text-rose-200",
  perdida: "border-rose-500/30 bg-rose-400/10 text-rose-200",
};

const TYPE_FILTER_OPTIONS = Object.entries(typeLabels).map(([value, label]) => ({
  value,
  label,
}));

function formatWhen(value: string) {
  try {
    return new Intl.DateTimeFormat("es", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function formatMovementCost(value: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

function MovementTypeIcon({ type }: { type: InventoryMovementType }) {
  if (type === "entrada" || type === "devolucion") {
    return <ArrowDownLeft className="h-4 w-4" aria-hidden />;
  }

  if (type === "salida" || type === "asignacion") {
    return <ArrowUpRight className="h-4 w-4" aria-hidden />;
  }

  return <SlidersHorizontal className="h-4 w-4" aria-hidden />;
}

function MovementList({
  movements,
  warehouseName,
  emptyHint,
}: {
  movements: InventoryMovement[];
  warehouseName?: string;
  emptyHint?: string;
}) {
  if (!movements.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl border border-black bg-[#111827] text-slate-500">
          <History className="h-5 w-5" aria-hidden />
        </span>
        <p className="mt-4 text-base font-black text-[#f8fafc]">Sin movimientos</p>
        <p className="mt-1 max-w-xs text-sm font-bold text-slate-500">
          {emptyHint ||
            (warehouseName
              ? `Los cambios de stock en ${warehouseName} aparecerán aquí.`
              : "Los cambios de stock aparecerán aquí.")}
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-2 p-4">
      {movements.map((movement) => {
        const trail = formatInventoryMovementTrail({
          fromLabel: movement.fromLocationLabel,
          toLabel: movement.toLocationLabel,
        });
        const referenceLabel = formatInventoryMovementReference({
          referenceType: movement.referenceType,
          referenceId: movement.referenceId,
          referenceLabel: movement.toLocationType === "shipment" ? movement.toLocationLabel : null,
        });
        const evidencePhotos = readInventoryMovementEvidencePhotos(movement.evidence);
        const supplierName = readInventoryMovementSupplierName(movement.evidence);

        return (
        <li key={movement.id} className="rounded-xl border border-black bg-[#111827] p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-black text-[#f8fafc]">
                {movement.itemName}
              </p>
              <p className="mt-0.5 text-xs font-bold text-slate-500">
                {formatWhen(movement.createdAt)}
              </p>
              <p className="mt-1 text-[11px] font-black uppercase tracking-wide text-slate-500">
                {inventoryMovementReasonLabel[movement.reasonCode] || movement.reasonCode}
              </p>
              {trail ? (
                <p className="mt-1 text-xs font-bold text-cyan-300">{trail}</p>
              ) : null}
              {referenceLabel ? (
                <p className="mt-1 text-xs font-bold text-violet-300">{referenceLabel}</p>
              ) : null}
              {movement.reversalOfMovementId ? (
                <p className="mt-1 text-[11px] font-bold text-amber-300">
                  Reversa de {movement.reversalOfMovementId.slice(0, 8)}…
                </p>
              ) : null}
              {movement.assigneeName ? (
                <p className="mt-1 flex items-center gap-1 text-xs font-bold text-sky-300">
                  <UserRound className="h-3 w-3" aria-hidden />
                  {movement.assigneeName}
                </p>
              ) : null}
              {movement.createdByName ? (
                <p className="mt-0.5 text-[11px] font-bold text-slate-500">
                  Por {movement.createdByName}
                </p>
              ) : null}
            </div>
            <span
              className={`inline-flex shrink-0 items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-black uppercase ${typeTone[movement.type]}`}
            >
              <MovementTypeIcon type={movement.type} />
              {typeLabels[movement.type]}
            </span>
          </div>
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-black/70 pt-2">
            <span className="text-xs font-bold text-slate-500">Cantidad</span>
            <span className="text-sm font-black tabular-nums text-[#f8fafc]">
              {movement.qty}
            </span>
          </div>
          {supplierName || movement.unitCost != null || movement.totalCost != null ? (
            <dl className="mt-2 grid gap-1 rounded-lg border border-black/70 bg-black/10 px-2.5 py-2 text-xs">
              {supplierName ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-bold text-slate-500">Proveedor</dt>
                  <dd className="text-right font-black text-slate-200">{supplierName}</dd>
                </div>
              ) : null}
              {movement.unitCost != null ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-bold text-slate-500">Costo unitario</dt>
                  <dd className="font-black tabular-nums text-slate-200">
                    {formatMovementCost(movement.unitCost)}
                  </dd>
                </div>
              ) : null}
              {movement.totalCost != null ? (
                <div className="flex items-center justify-between gap-3">
                  <dt className="font-bold text-slate-500">Costo del lote</dt>
                  <dd className="font-black tabular-nums text-slate-200">
                    {formatMovementCost(movement.totalCost)}
                  </dd>
                </div>
              ) : null}
            </dl>
          ) : null}
          {movement.note ? (
            <p className="mt-2 text-xs font-bold leading-relaxed text-slate-400">
              {movement.note}
            </p>
          ) : null}
          {evidencePhotos.length ? (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {evidencePhotos.map((url) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-black bg-surface-inset px-2 py-1 text-[10px] font-black uppercase text-slate-300 hover:text-[#f8fafc]"
                >
                  <ImageIcon className="h-3 w-3" aria-hidden />
                  Evidencia
                </a>
              ))}
            </div>
          ) : null}
        </li>
        );
      })}
    </ul>
  );
}

function MovementSummaryPanel({
  movements,
  assignments,
}: {
  movements: InventoryMovement[];
  assignments: InventoryAssignment[];
}) {
  const rows = useMemo(
    () => summarizeMovements(movements, assignments),
    [assignments, movements],
  );

  if (!rows.length) {
    return (
      <div className="px-4 py-10 text-center text-sm font-bold text-slate-500">
        Sin datos para el periodo filtrado.
      </div>
    );
  }

  return (
    <div className="space-y-2 p-4">
      {rows.map((row) => (
        <article
          key={`${row.assigneeId}-${row.itemId}`}
          className="rounded-xl border border-black bg-[#111827] p-3"
        >
          <p className="text-sm font-black text-[#f8fafc]">{row.assigneeName}</p>
          <p className="truncate text-xs font-bold text-slate-400">{row.itemName}</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-bold">
            <span className="text-sky-300">Abierto: {row.openAssigned}</span>
            <span className="text-emerald-300">Devuelto: {row.returned}</span>
            <span className="text-amber-300">Consumido: {row.consumed}</span>
            <span className="text-rose-300">Daño: {row.damaged}</span>
            <span className="text-rose-300">Perdido: {row.lost}</span>
          </div>
        </article>
      ))}
    </div>
  );
}

type InventoryMovementsSidePanelProps = {
  open: boolean;
  onClose: () => void;
  warehouseId: string;
  movements: InventoryMovement[];
  assignments: InventoryAssignment[];
  items?: InventoryStockItem[];
  warehouseName?: string;
  title?: string;
  subtitle?: string;
  emptyHint?: string;
  titleId?: string;
  zIndexClass?: string;
  fixedItemId?: string;
  embedded?: boolean;
  onMovementsChange?: (next: InventoryMovement[]) => void;
};

export function InventoryMovementsSidePanel({
  open,
  onClose,
  warehouseId,
  movements,
  assignments,
  items = [],
  warehouseName,
  title = "Historial de movimientos",
  subtitle,
  emptyHint,
  titleId = "inventory-movements-title",
  zIndexClass = "z-[130]",
  fixedItemId,
  embedded = false,
  onMovementsChange,
}: InventoryMovementsSidePanelProps) {
  const [tab, setTab] = useState<MovementsTab>("history");
  const [members, setMembers] = useState<InventoryMemberRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState(movements);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(
    () => movements.length === INVENTORY_MOVEMENTS_PAGE_SIZE,
  );
  const [assigneeId, setAssigneeId] = useState("");
  const [createdBy, setCreatedBy] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [selectedItemId, setSelectedItemId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      setRows(movements);
      setHasMore(movements.length === INVENTORY_MOVEMENTS_PAGE_SIZE);
    });
  }, [movements]);

  useEffect(() => {
    if (!open) {
      return;
    }

    queueMicrotask(() => {
      void listOrgMembersForInventoryAction().then((result) => {
        if (result.ok) {
          setMembers(result.data);
        }
      });
    });
  }, [open]);

  const memberOptions = useMemo(
    () =>
      members.map((member) => ({
        value: member.id,
        label: member.full_name || member.email,
      })),
    [members],
  );

  const itemOptions = useMemo(
    () => [{ value: "", label: "Todos los items" }, ...inventoryItemFilterOptions(items)],
    [items],
  );

  const prevWarehouseKeyRef = useRef(`${warehouseId}|${fixedItemId || ""}`);

  useEffect(() => {
    const nextKey = `${warehouseId}|${fixedItemId || ""}`;
    if (prevWarehouseKeyRef.current === nextKey) {
      return;
    }
    prevWarehouseKeyRef.current = nextKey;
    setPage(0);
  }, [fixedItemId, warehouseId]);

  function updateFilter<T>(setter: (value: T) => void) {
    return (value: T) => {
      setPage(0);
      setter(value);
    };
  }

  const reload = useCallback(
    async (targetPage = page) => {
      if (!warehouseId) {
        return;
      }

      setLoading(true);
      const result = await listInventoryMovementsAction({
        warehouseId,
        itemId: fixedItemId || selectedItemId || undefined,
        assigneeId: assigneeId || undefined,
        createdBy: createdBy || undefined,
        type: (typeFilter as InventoryMovementType) || undefined,
        dateFrom: dateFrom ? new Date(dateFrom).toISOString() : undefined,
        dateTo: dateTo ? new Date(`${dateTo}T23:59:59`).toISOString() : undefined,
        limit: INVENTORY_MOVEMENTS_PAGE_SIZE,
        offset: targetPage * INVENTORY_MOVEMENTS_PAGE_SIZE,
      });
      setLoading(false);

      if (!result.ok) {
        return;
      }

      if (targetPage > 0 && result.data.length === 0) {
        setPage((current) => Math.max(0, current - 1));
        return;
      }

      setRows(result.data);
      setHasMore(result.data.length === INVENTORY_MOVEMENTS_PAGE_SIZE);
      onMovementsChange?.(result.data);
    },
    [
      assigneeId,
      createdBy,
      dateFrom,
      dateTo,
      fixedItemId,
      onMovementsChange,
      page,
      selectedItemId,
      typeFilter,
      warehouseId,
    ],
  );

  useEffect(() => {
    if (!open) {
      return;
    }

    queueMicrotask(() => {
      void reload(page);
    });
  }, [open, page, reload]);

  const showPaginationControls = page > 0 || hasMore;

  function goToPreviousPage() {
    setPage((current) => Math.max(0, current - 1));
  }

  function goToNextPage() {
    if (hasMore && !loading) {
      setPage((current) => current + 1);
    }
  }

  useEffect(() => {
    if (!open || embedded) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [embedded, onClose, open]);

  if (!open) {
    return null;
  }

  const panelBody = (
    <>
      {!embedded ? (
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-black/70 px-4 py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
              Inventario
            </p>
            <h2 id={titleId} className="text-lg font-black text-[#f8fafc]">
              {title}
            </h2>
            {subtitle ? (
              <p className="mt-0.5 truncate text-sm font-bold text-slate-400">{subtitle}</p>
            ) : warehouseName ? (
              <p className="mt-0.5 truncate text-sm font-bold text-slate-400">
                {warehouseName}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-black bg-[#111827] text-slate-300 hover:text-[#f8fafc]"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>
      ) : null}

      <div className="shrink-0 border-b border-black/70 px-4 py-3">
        <AppTabs
          tabs={movementsTabs}
          value={tab}
          onChange={setTab}
          size="compact"
          ariaLabel="Vistas del historial"
        />
      </div>

      {tab === "history" ? (
        <div className="shrink-0 space-y-2 border-b border-black/70 p-4">
          <InlineSearchPicker
            value={selectedItemId}
            onChange={updateFilter(setSelectedItemId)}
            options={itemOptions}
            placeholder="Item"
            searchPlaceholder="Buscar item…"
            emptyLabel="Sin items"
            ariaLabel="Filtrar item"
            className="w-full"
            minWidthClass="w-full min-w-0"
          />
          <InlineSearchPicker
            value={assigneeId}
            onChange={updateFilter(setAssigneeId)}
            options={[{ value: "", label: "Empleado (todos)" }, ...memberOptions]}
            placeholder="Empleado"
            searchPlaceholder="Buscar…"
            ariaLabel="Filtrar empleado"
            className="w-full"
            minWidthClass="w-full min-w-0"
          />
          <InlineSearchPicker
            value={createdBy}
            onChange={updateFilter(setCreatedBy)}
            options={[{ value: "", label: "Responsable (todos)" }, ...memberOptions]}
            placeholder="Responsable"
            searchPlaceholder="Buscar…"
            ariaLabel="Filtrar responsable"
            className="w-full"
            minWidthClass="w-full min-w-0"
          />
          <InlineSearchPicker
            value={typeFilter}
            onChange={updateFilter(setTypeFilter)}
            options={[{ value: "", label: "Tipo (todos)" }, ...TYPE_FILTER_OPTIONS]}
            placeholder="Tipo"
            searchPlaceholder="Buscar…"
            ariaLabel="Filtrar tipo"
            className="w-full"
            minWidthClass="w-full min-w-0"
          />
            <div className="grid grid-cols-2 gap-2">
            <div className="grid gap-1 text-[11px] font-black uppercase text-slate-400">
              <span>Desde</span>
              <DateInput
                compact={false}
                value={dateFrom}
                ariaLabel="Fecha desde"
                onChange={updateFilter(setDateFrom)}
              />
            </div>
            <div className="grid gap-1 text-[11px] font-black uppercase text-slate-400">
              <span>Hasta</span>
              <DateInput
                compact={false}
                value={dateTo}
                ariaLabel="Fecha hasta"
                onChange={updateFilter(setDateTo)}
              />
            </div>
          </div>
          <button
            type="button"
            onClick={() => void reload(page)}
            className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-black bg-emerald-400/10 text-sm font-black text-emerald-200"
          >
            Aplicar filtros
          </button>
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
          </div>
        ) : tab === "summary" ? (
          <MovementSummaryPanel movements={rows} assignments={assignments} />
        ) : (
          <MovementList
            movements={rows}
            warehouseName={warehouseName}
            emptyHint={emptyHint}
          />
        )}
      </div>

      {tab === "history" && showPaginationControls ? (
        <div className="flex shrink-0 items-center justify-between gap-2 border-t border-black/70 px-4 py-3">
          <button
            type="button"
            className={`${secondaryButtonClass} h-9 px-3 text-xs font-black disabled:opacity-40`}
            disabled={page === 0 || loading}
            onClick={goToPreviousPage}
          >
            Anterior
          </button>
          <p className="text-xs font-bold text-slate-400">
            {loading
              ? "Cargando…"
              : `Página ${page + 1}${hasMore ? "" : " · última"}`}
          </p>
          <button
            type="button"
            className={`${secondaryButtonClass} h-9 px-3 text-xs font-black disabled:opacity-40`}
            disabled={!hasMore || loading}
            onClick={goToNextPage}
          >
            Siguiente
          </button>
        </div>
      ) : null}
    </>
  );

  if (embedded) {
    return <div className="flex min-h-0 flex-1 flex-col">{panelBody}</div>;
  }

  return (
    <div className={`fixed inset-0 ${zIndexClass} flex justify-end`}>
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Cerrar historial"
        onClick={onClose}
      />
      <aside
        className="relative flex h-full w-full max-w-md flex-col border-l border-black bg-[#1a2320] shadow-[-20px_0_50px_rgba(0,0,0,0.45)]"
        role="dialog"
        aria-modal
        aria-labelledby={titleId}
      >
        {panelBody}
      </aside>
    </div>
  );
}

export function InventoryMovementsDrawer({
  warehouseId,
  movements,
  assignments,
  items = [],
  warehouseName,
  iconOnly = false,
  embedded = false,
  onMovementsChange,
  controlledOpen,
  onControlledOpenChange,
  hideTrigger = false,
}: InventoryMovementsDrawerProps) {
  const [open, setOpen] = useState(false);
  const drawerOpen = embedded ? true : (controlledOpen ?? open);
  const setDrawerOpen = useCallback(
    (next: boolean) => {
      if (controlledOpen === undefined) {
        setOpen(next);
      }

      onControlledOpenChange?.(next);
    },
    [controlledOpen, onControlledOpenChange],
  );
  const [mounted, setMounted] = useState(false);

  const close = useCallback(() => {
    setDrawerOpen(false);
  }, [setDrawerOpen]);

  useEffect(() => {
    queueMicrotask(() => {
      setMounted(true);
    });
  }, []);

  const drawer = mounted ? (
    <InventoryMovementsSidePanel
      open={drawerOpen}
      onClose={close}
      warehouseId={warehouseId}
      movements={movements}
      assignments={assignments}
      items={items}
      warehouseName={warehouseName}
      embedded={embedded}
      onMovementsChange={onMovementsChange}
    />
  ) : null;

  if (embedded) {
    return drawer;
  }

  return (
    <>
      {hideTrigger ? null : iconOnly ? (
        <InventoryToolbarIconButton
          icon={History}
          label="Historial de movimientos"
          badge={movements.length || undefined}
          onClick={() => setDrawerOpen(true)}
          ariaHaspopup="dialog"
          ariaExpanded={drawerOpen}
        />
      ) : (
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-black bg-[#1a2320] px-3 text-xs font-black text-slate-300 transition hover:bg-[#243029] hover:text-[#f8fafc]"
          aria-haspopup="dialog"
          aria-expanded={drawerOpen}
          title="Historial de movimientos"
          aria-label="Historial de movimientos"
        >
          <History className="h-4 w-4 text-slate-400" aria-hidden />
          <span className="hidden sm:inline">Historial</span>
          {movements.length ? (
            <span className="rounded-md border border-black bg-surface-inset px-1.5 py-0.5 text-[10px] font-black tabular-nums text-slate-400">
              {movements.length}
            </span>
          ) : null}
        </button>
      )}
      {drawer ? createPortal(drawer, document.body) : null}
    </>
  );
}
