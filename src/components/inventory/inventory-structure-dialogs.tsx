"use client";

import { InventoryBinPlacementDrawer } from "@/components/inventory/inventory-bin-placement-drawer";
import { InventoryItemAdminModal } from "@/components/inventory/inventory-item-admin-modal";
import { InventoryNewItemPopover } from "@/components/inventory/inventory-new-item-popover";
import { InventoryStructureOptionsMenu } from "@/components/inventory/inventory-structure-options-menu";
import type { ItemContextMenu } from "@/lib/inventory-structure-utils";
import type { CategoryConfig, InventoryTreeItem } from "@/lib/inventory-tree";

type InventoryStructureDialogsProps = {
  embedded: boolean;
  showStructureOptions: boolean;
  optionsOpen: boolean;
  structureMenuMode: "create" | "manage";
  structureMenuPosition: { top: number; left: number } | null;
  structureMenuMounted: boolean;
  structurePanelRef: React.RefObject<HTMLDivElement | null>;
  showNewCategoryInput: boolean;
  setShowNewCategoryInput: (value: boolean) => void;
  setOpenSubcategoryInput: (value: string) => void;
  newCategoryName: string;
  setNewCategoryName: (value: string) => void;
  selectedCategoryData: CategoryConfig | null;
  selectedSubcategory: InventoryTreeItem | null;
  addingSubcategoryForSelectedCategory: boolean;
  addCategory: () => void;
  beginAddSubcategory: () => void;
  renderSubcategoryForm: (compact?: boolean) => React.ReactNode;
  editingCategoryName: string;
  setEditingCategoryName: (value: string) => void;
  saveCategory: (name: string) => void;
  showStructureDelete: boolean;
  deleteCategory: (name: string) => void;
  deleteSubcategory: (categoryName: string, subcategoryId: string) => void;
  showNewItemForm: boolean;
  newItemPopoverPosition: { top: number; left: number } | null;
  newItemAnchorRef: React.RefObject<HTMLDivElement | null>;
  newItemPopoverRef: React.RefObject<HTMLDivElement | null>;
  itemPlaceholder: string;
  itemInputKey: string;
  newNameByKey: Record<string, string>;
  setNewNameByKey: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  addItem: () => void;
  setShowNewItemForm: (value: boolean) => void;
  pricingReturnHref?: string | null;
  pricingReturnLabel?: string | null;
  adminOpen: boolean;
  adminContext: ItemContextMenu | null;
  adminSaving: boolean;
  onCloseAdmin: () => void;
  onSaveAdmin: (draft: {
    name: string;
    sku: string;
    unit: string;
    minStock: string;
    isCommercial: boolean;
    isActive: boolean;
  }) => Promise<void>;
  binPlacementOpen: boolean;
  binPlacementContext: ItemContextMenu | null;
  warehouseId?: string;
  warehouseName?: string;
  onCloseBinPlacement: () => void;
};

export function InventoryStructureDialogs({
  embedded,
  showStructureOptions,
  optionsOpen,
  structureMenuMode,
  structureMenuPosition,
  structureMenuMounted,
  structurePanelRef,
  showNewCategoryInput,
  setShowNewCategoryInput,
  setOpenSubcategoryInput,
  newCategoryName,
  setNewCategoryName,
  selectedCategoryData,
  selectedSubcategory,
  addingSubcategoryForSelectedCategory,
  addCategory,
  beginAddSubcategory,
  renderSubcategoryForm,
  editingCategoryName,
  setEditingCategoryName,
  saveCategory,
  showStructureDelete,
  deleteCategory,
  deleteSubcategory,
  showNewItemForm,
  newItemPopoverPosition,
  newItemAnchorRef,
  newItemPopoverRef,
  itemPlaceholder,
  itemInputKey,
  newNameByKey,
  setNewNameByKey,
  addItem,
  setShowNewItemForm,
  pricingReturnHref,
  pricingReturnLabel,
  adminOpen,
  adminContext,
  adminSaving,
  onCloseAdmin,
  onSaveAdmin,
  binPlacementOpen,
  binPlacementContext,
  warehouseId,
  warehouseName,
  onCloseBinPlacement,
}: InventoryStructureDialogsProps) {
  return (
    <>
      <InventoryStructureOptionsMenu
        embedded={embedded}
        showStructureOptions={showStructureOptions}
        optionsOpen={optionsOpen}
        mode={structureMenuMode}
        structureMenuPosition={structureMenuPosition}
        structureMenuMounted={structureMenuMounted}
        structurePanelRef={structurePanelRef}
        showNewCategoryInput={showNewCategoryInput}
        setShowNewCategoryInput={setShowNewCategoryInput}
        setOpenSubcategoryInput={setOpenSubcategoryInput}
        newCategoryName={newCategoryName}
        setNewCategoryName={setNewCategoryName}
        selectedCategoryData={selectedCategoryData}
        selectedSubcategory={selectedSubcategory}
        addingSubcategoryForSelectedCategory={addingSubcategoryForSelectedCategory}
        addCategory={addCategory}
        beginAddSubcategory={beginAddSubcategory}
        renderSubcategoryForm={renderSubcategoryForm}
        editingCategoryName={editingCategoryName}
        setEditingCategoryName={setEditingCategoryName}
        saveCategory={saveCategory}
        showStructureDelete={showStructureDelete}
        deleteCategory={deleteCategory}
        deleteSubcategory={deleteSubcategory}
      />
      <InventoryNewItemPopover
        open={showNewItemForm}
        mounted={structureMenuMounted}
        position={newItemPopoverPosition}
        anchorRef={newItemAnchorRef}
        panelRef={newItemPopoverRef}
        selectedCategoryData={selectedCategoryData}
        selectedSubcategory={selectedSubcategory}
        itemPlaceholder={itemPlaceholder}
        value={newNameByKey[itemInputKey] || ""}
        onChange={(nextValue) =>
          setNewNameByKey((current) => ({
            ...current,
            [itemInputKey]: nextValue,
          }))
        }
        onAdd={addItem}
        onClose={() => setShowNewItemForm(false)}
        pricingReturnHref={pricingReturnHref}
        pricingReturnLabel={pricingReturnLabel}
      />
      <InventoryItemAdminModal
        open={adminOpen}
        context={adminContext}
        saving={adminSaving}
        onClose={onCloseAdmin}
        onSubmit={onSaveAdmin}
      />
      <InventoryBinPlacementDrawer
        open={binPlacementOpen}
        warehouseId={warehouseId}
        warehouseName={warehouseName}
        context={
          binPlacementContext
            ? {
                itemId: binPlacementContext.stockItem.id,
                itemName: binPlacementContext.treeItem.name,
                stockItem: binPlacementContext.stockItem,
              }
            : null
        }
        onClose={onCloseBinPlacement}
      />
    </>
  );
}
