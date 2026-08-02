"use client";

import { ChevronDown, History, MapPin, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { InventoryMovementsSidePanel } from "@/components/inventory-movements-panel";
import { InventoryItemMovementDraftModal } from "@/components/inventory/inventory-item-movement-draft-modal";
import { InventoryItemUnitEditorModal } from "@/components/inventory/inventory-item-unit-editor-modal";
import type { InventoryAssignment, InventoryMovement } from "@/lib/inventory-types";
import {
  computeInventoryAdjustmentDelta,
  manualMovementReasonOptionsForType,
} from "@/lib/inventory-movement-audit";
import { formatInventoryStockStatusLine, sumOpenAssignmentQty } from "@/lib/inventory-item-display";
import type { ItemContextMenu, MovementDraft } from "@/lib/inventory-structure-utils";
import {
  filterInventorySupplierTags,
} from "@/lib/inventory-supplier-tags";
import {
  formatInventoryAvailableLabel,
} from "@/lib/inventory-units";

const INVENTORY_ITEM_CONTEXT_MENU_ATTR = "data-inventory-item-context-menu";

export type InventoryItemContextMenuProps = {
  itemContextMenu: ItemContextMenu | null;
  setItemContextMenu: (value: ItemContextMenu | null) => void;
  movementDraft: MovementDraft | null;
  setMovementDraft: React.Dispatch<React.SetStateAction<MovementDraft | null>>;
  supplierTags?: string[];
  onRememberSupplierTag?: (name: string) => void;
  stockError: string;
  stockSaving: boolean;
  warehouseId?: string;
  warehouseName?: string;
  structureMenuActionsEnabled: boolean;
  contextMenuAssignments: InventoryAssignment[];
  itemHistoryContext: ItemContextMenu | null;
  setItemHistoryContext: (value: ItemContextMenu | null) => void;
  itemHistoryMovements: InventoryMovement[];
  structureMenuMounted: boolean;
  assignments: InventoryAssignment[];
  onManageProductCountries?: (context: ItemContextMenu) => void;
  onAssignItem?: (context: ItemContextMenu) => void;
  onViewItemAssignments?: (itemId: string) => void;
  onBeginMovement: (type: MovementDraft["type"]) => void;
  onOpenItemHistory: () => void;
  onSubmitMovement: () => void | Promise<void>;
  onArchiveItem: (categoryName: string, itemId: string) => void;
  onOpenItemAdmin?: (context: ItemContextMenu) => void;
  showCommercialPricing?: boolean;
  onBeginEditItem: (itemId: string, itemName: string) => void;
  onUploadItemPhoto?: (context: ItemContextMenu, file: File) => void | Promise<void>;
  onClearItemPhoto?: (context: ItemContextMenu) => void | Promise<void>;
  photoUploading?: boolean;
  onUpdateItemUnit?: (
    context: ItemContextMenu,
    unit: string,
  ) => boolean | Promise<boolean>;
  unitSaving?: boolean;
  onOpenBinPlacement?: (context: ItemContextMenu) => void;
};

export function InventoryItemContextMenu({
  itemContextMenu,
  setItemContextMenu,
  movementDraft,
  setMovementDraft,
  supplierTags = [],
  onRememberSupplierTag,
  stockError,
  stockSaving,
  warehouseId,
  warehouseName,
  structureMenuActionsEnabled,
  contextMenuAssignments,
  itemHistoryContext,
  setItemHistoryContext,
  itemHistoryMovements,
  structureMenuMounted,
  assignments,
  onManageProductCountries,
  onAssignItem,
  onViewItemAssignments,
  onBeginMovement,
  onOpenItemHistory,
  onSubmitMovement,
  onArchiveItem,
  onOpenItemAdmin,
  showCommercialPricing = false,
  onBeginEditItem,
  onUpdateItemUnit,
  unitSaving = false,
  onOpenBinPlacement,
}: InventoryItemContextMenuProps) {
  const [mounted, setMounted] = useState(false);
  const [unitEditor, setUnitEditor] = useState<{
    context: ItemContextMenu;
    value: string;
  } | null>(null);
  const visibleSupplierTags =
    movementDraft?.type === "entrada"
      ? filterInventorySupplierTags(supplierTags, movementDraft.supplierName || "")
      : [];
  const movementReasonOptions = movementDraft
    ? manualMovementReasonOptionsForType(movementDraft.type)
    : [];
  const assignedQtyOpen = sumOpenAssignmentQty(contextMenuAssignments);
  const salidaQty = movementDraft?.type === "salida" ? Number(movementDraft.qty || 0) : 0;
  const salidaAvailable = movementDraft
    ? Math.max(
        0,
        Number(movementDraft.context.stockItem.stock) -
          Number(movementDraft.context.stockItem.reserved || 0),
      )
    : 0;
  const adjustmentDelta =
    movementDraft?.type === "ajuste"
      ? computeInventoryAdjustmentDelta(
          movementDraft.context.stockItem.stock,
          Number(movementDraft.qty || 0),
        )
      : 0;
  const todayIso = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  useEffect(() => {
    if (!itemContextMenu) {
      return;
    }

    const closeMenu = () => setItemContextMenu(null);

    const closeMenuOnPointerDown = (event: Event) => {
      if (event instanceof PointerEvent && event.button === 2) {
        return;
      }

      const target = event.target;

      if (
        target instanceof Element &&
        target.closest(`[${INVENTORY_ITEM_CONTEXT_MENU_ATTR}]`)
      ) {
        return;
      }

      closeMenu();
    };

    window.addEventListener("pointerdown", closeMenuOnPointerDown);

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }

    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("pointerdown", closeMenuOnPointerDown);
      window.removeEventListener("keydown", handleKey);
    };
  }, [itemContextMenu, setItemContextMenu]);

  const contextMenuPanel =
    itemContextMenu && mounted ? (
      <div
        data-inventory-item-context-menu
        className="fixed z-[145] w-56 rounded-lg border border-black bg-[#17211d] p-1.5 shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
        style={{ left: itemContextMenu.x, top: itemContextMenu.y }}
        onPointerDown={(event) => event.stopPropagation()}
        onContextMenu={(event) => event.preventDefault()}
      >
          <div className="border-b border-white/10 px-2 py-2">
            <p className="truncate text-sm font-black text-[#f8fafc]">
              {itemContextMenu.treeItem.name}
            </p>
            <p className="text-xs font-bold text-slate-400">
              {formatInventoryStockStatusLine(itemContextMenu.stockItem)}
            </p>
            {itemContextMenu.primaryLocation ? (
              <p className="mt-1 flex items-center gap-1 truncate text-[10px] font-black text-cyan-300">
                <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate">{itemContextMenu.primaryLocation}</span>
              </p>
            ) : null}
          </div>
          <div className="grid grid-cols-3 gap-1 p-1">
            <button
              type="button"
              onClick={() => onBeginMovement("entrada")}
              className="flex h-12 flex-col items-center justify-center rounded-md bg-emerald-400/10 text-xs font-black text-emerald-200 transition hover:bg-emerald-400/20"
            >
              <span className="text-base leading-none">+</span>
              Entrada
            </button>
            <button
              type="button"
              onClick={() => onBeginMovement("salida")}
              disabled={itemContextMenu.stockItem.stock <= 0}
              className="flex h-12 flex-col items-center justify-center rounded-md text-xs font-black text-slate-200 transition hover:bg-surface-card-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="text-base leading-none">−</span>
              Salida
            </button>
            <button
              type="button"
              onClick={() => onBeginMovement("ajuste")}
              className="flex h-12 flex-col items-center justify-center rounded-md text-xs font-black text-slate-200 transition hover:bg-surface-card-hover"
            >
              <span className="text-sm leading-none">±</span>
              Ajuste
            </button>
          </div>
          <details className="group mt-1 border-t border-white/10 pt-1">
            <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-md px-2 text-sm font-black text-slate-300 transition hover:bg-surface-card-hover hover:text-white [&::-webkit-details-marker]:hidden">
              <Settings2 className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
              <span className="flex-1">Más opciones</span>
              <ChevronDown
                className="h-4 w-4 text-slate-500 transition-transform group-open:rotate-180"
                aria-hidden
              />
            </summary>
            <div className="mt-1 max-h-72 overflow-y-auto border-t border-white/5 pt-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {warehouseId && onOpenBinPlacement ? (
            <button
              type="button"
              onClick={() => {
                if (itemContextMenu) {
                  onOpenBinPlacement(itemContextMenu);
                  setItemContextMenu(null);
                }
              }}
              className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-black text-slate-200 hover:bg-surface-card-hover"
            >
              <MapPin className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              Ubicación en bodega
            </button>
          ) : null}
          {warehouseId ? (
            <button
              type="button"
              onClick={onOpenItemHistory}
              className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-left text-sm font-black text-slate-200 hover:bg-surface-card-hover"
            >
              <History className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
              Historial
            </button>
          ) : null}
          {warehouseId && showCommercialPricing && onManageProductCountries ? (
            <button
              type="button"
              onClick={() => {
                if (itemContextMenu) {
                  onManageProductCountries(itemContextMenu);
                  setItemContextMenu(null);
                }
              }}
              className="flex h-9 w-full items-center rounded-md px-2 text-left text-sm font-black text-emerald-200 hover:bg-emerald-400/10"
            >
              Precios de venta
            </button>
          ) : null}
          {warehouseId && onAssignItem ? (
            <button
              type="button"
              onClick={() => {
                if (itemContextMenu) {
                  onAssignItem(itemContextMenu);
                  setItemContextMenu(null);
                }
              }}
              disabled={itemContextMenu.stockItem.stock <= 0}
              className="flex h-9 w-full items-center rounded-md px-2 text-left text-sm font-black text-sky-200 hover:bg-sky-400/10 disabled:opacity-40"
            >
              Asignar a empleado
            </button>
          ) : null}
          {warehouseId && onViewItemAssignments && assignedQtyOpen > 0 ? (
            <button
              type="button"
              onClick={() => {
                const itemId = itemContextMenu.stockItem.id;
                onViewItemAssignments(
                  itemId.startsWith("virtual-") || itemId.startsWith("inv-")
                    ? contextMenuAssignments[0]?.itemId || itemId
                    : itemId,
                );
                setItemContextMenu(null);
              }}
              className="flex h-9 w-full items-center rounded-md px-2 text-left text-sm font-black text-slate-200 hover:bg-surface-card-hover"
            >
              {assignedQtyOpen}{" "}
              {formatInventoryAvailableLabel(assignedQtyOpen)} asignadas
            </button>
          ) : null}
          <div className="my-1 border-t border-white/10" />
          {structureMenuActionsEnabled ? (
            <>
              <p className="px-2 py-1 text-[10px] font-black uppercase tracking-wide text-slate-500">
                Administración
              </p>
              <button
                type="button"
                onClick={() => {
                  if (onOpenItemAdmin && itemContextMenu) {
                    onOpenItemAdmin(itemContextMenu);
                    setItemContextMenu(null);
                    return;
                  }

                  onBeginEditItem(
                    itemContextMenu.treeItem.id,
                    itemContextMenu.treeItem.name,
                  );
                  setItemContextMenu(null);
                }}
                className="flex h-9 w-full items-center rounded-md px-2 text-left text-sm font-black text-slate-200 hover:bg-surface-card-hover"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => {
                  onArchiveItem(
                    itemContextMenu.categoryName,
                    itemContextMenu.treeItem.id,
                  );
                  setItemContextMenu(null);
                }}
                className="flex h-9 w-full items-center rounded-md px-2 text-left text-sm font-black text-rose-200 hover:bg-rose-500/10"
              >
                Archivar artículo
              </button>
            </>
          ) : null}
            </div>
          </details>
      </div>
    ) : null;

  return (
    <>
      {contextMenuPanel ? createPortal(contextMenuPanel, document.body) : null}

      {movementDraft ? (
        <InventoryItemMovementDraftModal
          movementDraft={movementDraft}
          mounted={mounted}
          setMovementDraft={setMovementDraft}
          visibleSupplierTags={visibleSupplierTags}
          movementReasonOptions={movementReasonOptions}
          salidaAvailable={salidaAvailable}
          salidaQty={salidaQty}
          adjustmentDelta={adjustmentDelta}
          todayIso={todayIso}
          stockError={stockError}
          stockSaving={stockSaving}
          onSubmitMovement={onSubmitMovement}
          onRememberSupplierTag={onRememberSupplierTag}
        />
      ) : null}

      {unitEditor ? (
        <InventoryItemUnitEditorModal
          unitEditor={unitEditor}
          mounted={mounted}
          unitSaving={unitSaving}
          onUpdateItemUnit={onUpdateItemUnit}
          onValueChange={(value) =>
            setUnitEditor((current) => (current ? { ...current, value } : current))
          }
          onClose={() => setUnitEditor(null)}
        />
      ) : null}

      {structureMenuMounted && itemHistoryContext
        ? createPortal(
            <InventoryMovementsSidePanel
              open
              onClose={() => setItemHistoryContext(null)}
              warehouseId={warehouseId || ""}
              movements={itemHistoryMovements}
              assignments={assignments}
              warehouseName={warehouseName}
              title="Historial"
              subtitle={itemHistoryContext.treeItem.name}
              emptyHint={`Aún no hay movimientos para ${itemHistoryContext.treeItem.name}.`}
              titleId="inventory-item-movements-title"
              zIndexClass="z-[140]"
              fixedItemId={
                itemHistoryContext.stockItem.id.startsWith("virtual-") ||
                itemHistoryContext.stockItem.id.startsWith("inv-")
                  ? undefined
                  : itemHistoryContext.stockItem.id
              }
            />,
            document.body,
          )
        : null}
    </>
  );
}
