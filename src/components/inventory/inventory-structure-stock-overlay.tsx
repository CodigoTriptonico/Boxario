"use client";

import { InventoryItemContextMenu } from "@/components/inventory/inventory-item-context-menu";
import type { useInventoryItemLeafActions } from "@/components/inventory/use-inventory-item-leaf-actions";
import type { useInventoryMovements } from "@/components/inventory/use-inventory-movements";
import type { ItemContextMenu, MovementDraft } from "@/lib/inventory-structure-utils";
import type { InventoryAssignment, InventoryMovement } from "@/lib/inventory-types";

type InventoryStructureStockOverlayProps = {
  itemContextMenu: ItemContextMenu | null;
  setItemContextMenu: (value: ItemContextMenu | null) => void;
  movementDraft: ReturnType<typeof useInventoryMovements>["movementDraft"];
  setMovementDraft: ReturnType<typeof useInventoryMovements>["setMovementDraft"];
  supplierTags: string[];
  onRememberSupplierTag: ReturnType<typeof useInventoryMovements>["rememberSupplierTag"];
  stockError: string;
  stockSaving: boolean;
  warehouseId?: string;
  warehouseName?: string;
  showStructureOptions: boolean;
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
  onSubmitMovement: ReturnType<typeof useInventoryMovements>["submitMovement"];
  onArchiveItem: (categoryName: string, itemId: string) => void;
  leafActions: ReturnType<typeof useInventoryItemLeafActions>;
  showCommercialPricing: boolean;
  onBeginEditItem: (itemId: string, itemName: string) => void;
  onOpenBinPlacement: (context: ItemContextMenu) => void;
};

export function InventoryStructureStockOverlay({
  itemContextMenu,
  setItemContextMenu,
  movementDraft,
  setMovementDraft,
  supplierTags,
  onRememberSupplierTag,
  stockError,
  stockSaving,
  warehouseId,
  warehouseName,
  showStructureOptions,
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
  leafActions,
  showCommercialPricing,
  onBeginEditItem,
  onOpenBinPlacement,
}: InventoryStructureStockOverlayProps) {
  return (
    <InventoryItemContextMenu
      itemContextMenu={itemContextMenu}
      setItemContextMenu={setItemContextMenu}
      movementDraft={movementDraft}
      setMovementDraft={setMovementDraft}
      supplierTags={supplierTags}
      onRememberSupplierTag={onRememberSupplierTag}
      stockError={stockError}
      stockSaving={stockSaving}
      warehouseId={warehouseId}
      warehouseName={warehouseName}
      structureMenuActionsEnabled={showStructureOptions}
      contextMenuAssignments={contextMenuAssignments}
      itemHistoryContext={itemHistoryContext}
      setItemHistoryContext={setItemHistoryContext}
      itemHistoryMovements={itemHistoryMovements}
      structureMenuMounted={structureMenuMounted}
      assignments={assignments}
      onManageProductCountries={onManageProductCountries}
      onAssignItem={onAssignItem}
      onViewItemAssignments={onViewItemAssignments}
      onBeginMovement={onBeginMovement}
      onOpenItemHistory={onOpenItemHistory}
      onSubmitMovement={onSubmitMovement}
      onArchiveItem={onArchiveItem}
      onOpenItemAdmin={leafActions.setAdminContext}
      showCommercialPricing={showCommercialPricing}
      onBeginEditItem={onBeginEditItem}
      onUploadItemPhoto={async (ctx, file) => {
        await leafActions.handleUploadItemPhoto(ctx, file);
        setItemContextMenu(null);
      }}
      onClearItemPhoto={async (ctx) => {
        await leafActions.handleClearItemPhoto(ctx);
        setItemContextMenu(null);
      }}
      photoUploading={leafActions.photoUploading}
      onUpdateItemUnit={leafActions.handleUpdateItemUnit}
      unitSaving={leafActions.unitSaving}
      onOpenBinPlacement={onOpenBinPlacement}
    />
  );
}
