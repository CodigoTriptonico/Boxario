"use client";

import { useEffect, useLayoutEffect } from "react";
import { useSetShellConfig } from "@/components/app-frame";
import { InventoryItemGrid } from "@/components/inventory/inventory-item-grid";
import { InventoryStructureCategoryPanel } from "@/components/inventory/inventory-structure-category-panel";
import { InventoryStructureDialogs } from "@/components/inventory/inventory-structure-dialogs";
import { InventoryStructureEmbeddedShell } from "@/components/inventory/inventory-structure-embedded-shell";
import { InventoryStructureEmptyState } from "@/components/inventory/inventory-structure-empty-state";
import { InventoryStructureStockOverlay } from "@/components/inventory/inventory-structure-stock-overlay";
import { InventorySubcategoryForm } from "@/components/inventory/inventory-subcategory-form";
import { useInventoryEmbeddedOptions } from "@/components/inventory/use-inventory-embedded-options";
import { useInventoryItemLeafActions } from "@/components/inventory/use-inventory-item-leaf-actions";
import { useInventoryMovements } from "@/components/inventory/use-inventory-movements";
import { useInventoryStructureContext } from "@/components/inventory/use-inventory-structure-context";
import { useInventoryStructureMenus } from "@/components/inventory/use-inventory-structure-menus";
import { useInventoryStructureSelection } from "@/components/inventory/use-inventory-structure-selection";
import { useInventoryTreeCrud } from "@/components/inventory/use-inventory-tree-crud";
import { usePageViewLayout } from "@/components/ui/ui-surface-preferences-provider";
import { useNotify } from "@/hooks/use-notify";
import type { PricingCountryConfig } from "@/lib/pricing/types";
import type { InventoryStockItem } from "@/lib/inventory-stock";
import type { InventoryAssignment, InventoryMovement } from "@/lib/inventory-types";
import type { ItemContextMenu } from "@/lib/inventory-structure-utils";
import type { CategoryConfig } from "@/lib/inventory-tree";

type InventoryStructureEditorProps = {
  categoryConfigs: CategoryConfig[];
  onCategoryConfigsChange: (next: CategoryConfig[]) => void;
  inventoryItems?: InventoryStockItem[];
  onInventoryItemsChange?: (next: InventoryStockItem[]) => void;
  warehouseId?: string;
  warehouseName?: string;
  movements?: InventoryMovement[];
  assignments?: InventoryAssignment[];
  onMovementRecorded?: (movement: InventoryMovement) => void;
  onAssignItem?: (context: ItemContextMenu) => void;
  onManageProductCountries?: (context: ItemContextMenu) => void;
  onViewItemAssignments?: (itemId: string) => void;
  layout?: "sidebar" | "inline";
  showCategoryCreate?: boolean;
  showStructureDelete?: boolean;
  embedded?: boolean;
  headerSlot?: React.ReactNode;
  toolbarEndSlot?: React.ReactNode;
  footerSlot?: React.ReactNode;
  truckQty?: number;
  truckTabOpen?: boolean;
  onTruckTabChange?: (open: boolean) => void;
  truckPanel?: React.ReactNode;
  pricingReturnHref?: string | null;
  pricingReturnLabel?: string | null;
  pricingCountries?: PricingCountryConfig[];
  /** Fires when the selected category changes so stock can reload for that filter. */
  onSelectedCategoryChange?: (categoryName: string) => void;
};

export function InventoryStructureEditor({
  categoryConfigs,
  onCategoryConfigsChange,
  inventoryItems = [],
  onInventoryItemsChange,
  warehouseId,
  warehouseName,
  movements = [],
  assignments = [],
  onMovementRecorded,
  onAssignItem,
  onManageProductCountries,
  onViewItemAssignments,
  layout = "sidebar",
  showCategoryCreate = false,
  showStructureDelete = false,
  embedded = false,
  headerSlot,
  toolbarEndSlot,
  footerSlot,
  truckQty = 0,
  truckTabOpen = false,
  onTruckTabChange,
  truckPanel,
  pricingReturnHref,
  pricingReturnLabel,
  pricingCountries = [],
  onSelectedCategoryChange,
}: InventoryStructureEditorProps) {
  const setShellConfig = useSetShellConfig();
  const notify = useNotify();
  const {
    movementDraft,
    setMovementDraft,
    supplierTags,
    stockSaving,
    stockError,
    setStockError,
    itemHistoryContext,
    setItemHistoryContext,
    beginMovement: beginMovementDraft,
    openItemHistory: openItemHistoryDraft,
    submitMovement,
    rememberSupplierTag,
  } = useInventoryMovements({
    warehouseId,
    notify,
    inventoryItems,
    onInventoryItemsChange,
    onMovementRecorded,
  });
  const { layout: viewLayout } = usePageViewLayout("inventory.items");

  const showStructureOptions = showCategoryCreate;

  const selection = useInventoryStructureSelection({
    categoryConfigs,
    inventoryItems,
    assignments,
  });

  useEffect(() => {
    onSelectedCategoryChange?.(selection.selectedCategory);
  }, [onSelectedCategoryChange, selection.selectedCategory]);

  const menus = useInventoryStructureMenus({
    categoryConfigs,
    showStructureOptions,
    embedded,
    selectedCategory: selection.selectedCategory,
    selectedCategoryData: selection.selectedCategoryData,
    notify,
    setOpenSubcategoryInput: selection.setOpenSubcategoryInput,
  });

  useEffect(() => {
    if (!menus.structureEditingEnabled) {
      queueMicrotask(() => {
        selection.resetStructureEditing();
      });
    }
    // selection object identity changes; only the reset callback is required.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: resetStructureEditing
  }, [menus.structureEditingEnabled, selection.resetStructureEditing]);

  const leafActions = useInventoryItemLeafActions({
    categoryConfigs,
    onCategoryConfigsChange,
    inventoryItems,
    onInventoryItemsChange,
    warehouseId,
    notify,
  });

  const treeCrud = useInventoryTreeCrud({
    categoryConfigs,
    onCategoryConfigsChange,
    inventoryItems,
    onInventoryItemsChange,
    movements,
    assignments,
    notify,
    selectedCategory: selection.selectedCategory,
    setSelectedCategory: selection.setSelectedCategory,
    selectedSubcategoryId: selection.selectedSubcategoryId,
    setSelectedSubcategoryId: selection.setSelectedSubcategoryId,
    setEmbeddedSubcategoryOpen: selection.setEmbeddedSubcategoryOpen,
    setCategoryQuery: selection.setCategoryQuery,
    setShowNewItemForm: menus.setShowNewItemForm,
    setOpenSubcategoryInput: selection.setOpenSubcategoryInput,
    setItemQuery: selection.setItemQuery,
    categoryNames: selection.categoryNames,
    selectedCategoryData: selection.selectedCategoryData,
    selectedSubcategory: selection.selectedSubcategory,
    selectedItems: selection.selectedItems,
    newNameByKey: selection.newNameByKey,
    setNewNameByKey: selection.setNewNameByKey,
    newCategoryName: selection.newCategoryName,
    setNewCategoryName: selection.setNewCategoryName,
    setShowNewCategoryInput: menus.setShowNewCategoryInput,
    editingCategoryName: selection.editingCategoryName,
    setEditingCategoryName: selection.setEditingCategoryName,
    setEditingCategory: selection.setEditingCategory,
    editingSubcategoryName: selection.editingSubcategoryName,
    setEditingSubcategoryName: selection.setEditingSubcategoryName,
    setEditingSubcategoryId: selection.setEditingSubcategoryId,
    editingItemName: selection.editingItemName,
    setEditingItemName: selection.setEditingItemName,
    setEditingItemId: selection.setEditingItemId,
    setOptionsOpen: menus.setOptionsOpen,
    itemQuery: selection.itemQuery,
    warehouseId,
  });

  const context = useInventoryStructureContext({
    movements,
    assignments,
    pricingCountries,
    itemHistoryContext,
    beginMovementDraft,
    openItemHistoryDraft,
  });

  const embeddedOptions = useInventoryEmbeddedOptions({
    categoryConfigs,
    inventoryItems,
    warehouseId,
    selectedCategoryData: selection.selectedCategoryData,
    subcategories: selection.subcategories,
    selectedSubcategory: selection.selectedSubcategory,
    subcategoryStockItems: treeCrud.subcategoryStockItems,
    embeddedSubcategoryOpen: selection.embeddedSubcategoryOpen,
    selectedSubcategoryId: selection.selectedSubcategoryId,
  });

  const filteredItems = treeCrud.filteredItems(selection.scopedItems, selection.directItems);

  function renderSubcategoryForm(compact = false) {
    if (
      !selection.selectedCategoryData ||
      selection.openSubcategoryInput !== selection.selectedCategory
    ) {
      return null;
    }

    return (
      <InventorySubcategoryForm
        compact={compact}
        value={selection.newNameByKey[selection.selectedCategory] || ""}
        onChange={(nextValue) =>
          selection.setNewNameByKey((current) => ({
            ...current,
            [selection.selectedCategory]: nextValue,
          }))
        }
        onAdd={() => treeCrud.addSubcategory(selection.selectedCategory)}
        onCancel={() => {
          selection.setOpenSubcategoryInput("");
          selection.setNewNameByKey((current) => ({
            ...current,
            [selection.selectedCategory]: "",
          }));
        }}
      />
    );
  }

  useLayoutEffect(() => {
    if (layout !== "sidebar" || embedded) {
      return;
    }

    setShellConfig({
      compactContent: null,
      compactNavLabel: undefined,
      compactNavSettingsHref: undefined,
    });

    return () =>
      setShellConfig({
        compactContent: undefined,
        compactNavLabel: undefined,
        compactNavSettingsHref: undefined,
      });
  }, [embedded, layout, setShellConfig]);

  const stockOverlay = (
    <InventoryStructureStockOverlay
      itemContextMenu={context.itemContextMenu}
      setItemContextMenu={context.setItemContextMenu}
      movementDraft={movementDraft}
      setMovementDraft={setMovementDraft}
      supplierTags={supplierTags}
      onRememberSupplierTag={rememberSupplierTag}
      stockError={stockError}
      stockSaving={stockSaving}
      warehouseId={warehouseId}
      warehouseName={warehouseName}
      showStructureOptions={showStructureOptions}
      contextMenuAssignments={context.contextMenuAssignments}
      itemHistoryContext={itemHistoryContext}
      setItemHistoryContext={setItemHistoryContext}
      itemHistoryMovements={context.itemHistoryMovements}
      structureMenuMounted={menus.structureMenuMounted}
      assignments={assignments}
      onManageProductCountries={onManageProductCountries}
      onAssignItem={onAssignItem}
      onViewItemAssignments={onViewItemAssignments}
      onBeginMovement={context.beginMovement}
      onOpenItemHistory={context.openItemHistory}
      onSubmitMovement={submitMovement}
      onArchiveItem={treeCrud.archiveItem}
      leafActions={leafActions}
      showCommercialPricing={context.showCommercialPricing}
      onBeginEditItem={(itemId, itemName) => {
        selection.setEditingItemId(itemId);
        selection.setEditingItemName(itemName);
      }}
      onOpenBinPlacement={(placementContext) => {
        context.setBinPlacementContext(placementContext);
        context.setBinPlacementOpen(true);
      }}
    />
  );

  if (!categoryConfigs.length) {
    return (
      <InventoryStructureEmptyState
        showStructureOptions={showStructureOptions}
        showNewCategoryInput={menus.showNewCategoryInput}
        setShowNewCategoryInput={menus.setShowNewCategoryInput}
        newCategoryName={selection.newCategoryName}
        setNewCategoryName={selection.setNewCategoryName}
        onAddCategory={treeCrud.addCategory}
        onOpenStructureOptions={menus.openStructureOptions}
        emptyCategoryFormRef={menus.emptyCategoryFormRef}
      />
    );
  }

  const itemsPanel = (
    <InventoryItemGrid
      warehouseId={warehouseId}
      warehouseName={warehouseName}
      embedded={embedded}
      selectedCategoryData={selection.selectedCategoryData}
      selectedSubcategory={selection.selectedSubcategory}
      panelTitle={selection.panelTitle}
      itemQuery={selection.itemQuery}
      setItemQuery={selection.setItemQuery}
      embeddedItemOptions={embeddedOptions.embeddedItemOptions}
      scopedItems={selection.scopedItems}
      filteredItems={filteredItems}
      itemQueryTrimmed={selection.itemQueryTrimmed}
      itemQueryActive={selection.itemQueryActive}
      itemCountLabel={selection.itemCountLabel}
      inventoryItems={inventoryItems}
      editingItemId={selection.editingItemId}
      editingItemName={selection.editingItemName}
      setEditingItemName={selection.setEditingItemName}
      setEditingItemId={selection.setEditingItemId}
      showStructureOptions={showStructureOptions}
      showNewItemForm={menus.showNewItemForm}
      addingSubcategoryForSelectedCategory={selection.addingSubcategoryForSelectedCategory}
      exitSubcategory={treeCrud.exitSubcategory}
      beginAddItem={menus.beginAddItem}
      beginAddSubcategory={menus.beginAddSubcategory}
      beginAddCategory={menus.beginAddCategory}
      onItemContextMenu={(event, item, stockItem, primaryLocation) =>
        treeCrud.openItemContextMenu(
          event,
          item,
          stockItem,
          primaryLocation,
          setStockError,
          context.setItemContextMenu,
        )
      }
      onSaveItem={treeCrud.saveItem}
      viewLayout={viewLayout}
    />
  );

  if (layout === "inline") {
    return (
      <>
        <div className="space-y-4">
          <div className="border-b border-white/10 pb-3">
            <p className="text-2xl font-black text-[#f8fafc]">Inventario</p>
            <p className="text-sm font-bold text-slate-400">
              Categorias, items y stock en una sola vista.
            </p>
          </div>
          <div className="grid gap-6 xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] xl:items-start">
            <InventoryStructureCategoryPanel
              categoryQuery={selection.categoryQuery}
              setCategoryQuery={selection.setCategoryQuery}
              categoryConfigs={categoryConfigs}
              filteredCategories={selection.filteredCategories}
              selectedCategory={selection.selectedCategory}
              selectedSubcategoryId={selection.selectedSubcategoryId}
              editingCategory={selection.editingCategory}
              editingCategoryName={selection.editingCategoryName}
              setEditingCategoryName={selection.setEditingCategoryName}
              setEditingCategory={selection.setEditingCategory}
              openSubcategoryInput={selection.openSubcategoryInput}
              setOpenSubcategoryInput={selection.setOpenSubcategoryInput}
              newNameByKey={selection.newNameByKey}
              setNewNameByKey={selection.setNewNameByKey}
              editingSubcategoryId={selection.editingSubcategoryId}
              editingSubcategoryName={selection.editingSubcategoryName}
              setEditingSubcategoryName={selection.setEditingSubcategoryName}
              setEditingSubcategoryId={selection.setEditingSubcategoryId}
              showStructureOptions={showStructureOptions}
              structureEditingEnabled={menus.structureEditingEnabled}
              optionsOpen={menus.optionsOpen}
              setOptionsOpen={menus.setOptionsOpen}
              optionsSummary={menus.optionsSummary}
              showNewCategoryInput={menus.showNewCategoryInput}
              setShowNewCategoryInput={menus.setShowNewCategoryInput}
              newCategoryName={selection.newCategoryName}
              setNewCategoryName={selection.setNewCategoryName}
              showNewItemForm={menus.showNewItemForm}
              setShowNewItemForm={menus.setShowNewItemForm}
              selectedCategoryData={selection.selectedCategoryData}
              itemInputKey={selection.itemInputKey}
              itemPlaceholder={selection.itemPlaceholder}
              addingSubcategoryForSelectedCategory={selection.addingSubcategoryForSelectedCategory}
              inventoryItems={inventoryItems}
              selectCategory={treeCrud.selectCategory}
              selectSubcategory={treeCrud.selectSubcategory}
              saveCategory={treeCrud.saveCategory}
              deleteCategory={treeCrud.deleteCategory}
              addSubcategory={treeCrud.addSubcategory}
              saveSubcategory={treeCrud.saveSubcategory}
              deleteSubcategory={treeCrud.deleteSubcategory}
              addCategory={treeCrud.addCategory}
              addItem={treeCrud.addItem}
              beginAddItem={menus.beginAddItem}
              beginAddSubcategory={menus.beginAddSubcategory}
              openStructureOptions={menus.openStructureOptions}
              subcategoryStockItems={treeCrud.subcategoryStockItems}
              renderSubcategoryForm={renderSubcategoryForm}
              showStructureDelete={showStructureDelete}
              selectedSubcategory={selection.selectedSubcategory}
            />
            {itemsPanel}
          </div>
        </div>
        {stockOverlay}
      </>
    );
  }

  const sidebarLayout = embedded ? (
    <InventoryStructureEmbeddedShell
      headerSlot={headerSlot}
      footerSlot={footerSlot}
      truckPanel={truckPanel}
      itemsPanel={itemsPanel}
      categoryConfigs={categoryConfigs}
      showStructureOptions={showStructureOptions}
      optionsOpen={menus.optionsOpen}
      truckTabOpen={truckTabOpen}
      truckQty={truckQty}
      onTruckTabChange={onTruckTabChange}
      selectedCategory={selection.selectedCategory}
      selectedCategoryData={selection.selectedCategoryData}
      selectedSubcategoryId={selection.selectedSubcategoryId}
      embeddedCategoryOptions={embeddedOptions.embeddedCategoryOptions}
      embeddedSubcategoryOptions={embeddedOptions.embeddedSubcategoryOptions}
      embeddedItemOptions={embeddedOptions.embeddedItemOptions}
      hasEmbeddedSubcategories={embeddedOptions.hasEmbeddedSubcategories}
      hasSubcategorySelection={embeddedOptions.hasSubcategorySelection}
      showEmbeddedSubcategoryPicker={embeddedOptions.showEmbeddedSubcategoryPicker}
      embeddedSubcategoryOpen={selection.embeddedSubcategoryOpen}
      setEmbeddedSubcategoryOpen={selection.setEmbeddedSubcategoryOpen}
      itemQuery={selection.itemQuery}
      setItemQuery={selection.setItemQuery}
      itemSearchPlaceholder="Buscar…"
      showNewItemForm={menus.showNewItemForm}
      toolbarMenuOpen={menus.toolbarMenuOpen}
      setToolbarMenuOpen={menus.setToolbarMenuOpen}
      toolbarEndSlot={toolbarEndSlot}
      inventoryOverview={selection.inventoryOverview}
      newItemAnchorRef={menus.newItemAnchorRef}
      newItemButtonRef={menus.newItemButtonRef}
      toolbarMenuButtonRef={menus.toolbarMenuButtonRef}
      toolbarMenuRef={menus.toolbarMenuRef}
      onOpenStructureMenu={menus.openStructureMenu}
      onSelectCategory={treeCrud.selectCategory}
      onSelectSubcategory={treeCrud.selectSubcategory}
      onClearSubcategory={() => {
        selection.setSelectedSubcategoryId("");
        selection.setEmbeddedSubcategoryOpen(false);
      }}
      onBeginAddItem={menus.beginAddItem}
      onUpdateNewItemPopoverPosition={menus.updateNewItemPopoverPosition}
      editingCategoryName={selection.editingCategoryName}
      setEditingCategoryName={selection.setEditingCategoryName}
    />
  ) : (
    <div className="grid gap-6 xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)] xl:items-start">
      <InventoryStructureCategoryPanel
        categoryQuery={selection.categoryQuery}
        setCategoryQuery={selection.setCategoryQuery}
        categoryConfigs={categoryConfigs}
        filteredCategories={selection.filteredCategories}
        selectedCategory={selection.selectedCategory}
        selectedSubcategoryId={selection.selectedSubcategoryId}
        editingCategory={selection.editingCategory}
        editingCategoryName={selection.editingCategoryName}
        setEditingCategoryName={selection.setEditingCategoryName}
        setEditingCategory={selection.setEditingCategory}
        openSubcategoryInput={selection.openSubcategoryInput}
        setOpenSubcategoryInput={selection.setOpenSubcategoryInput}
        newNameByKey={selection.newNameByKey}
        setNewNameByKey={selection.setNewNameByKey}
        editingSubcategoryId={selection.editingSubcategoryId}
        editingSubcategoryName={selection.editingSubcategoryName}
        setEditingSubcategoryName={selection.setEditingSubcategoryName}
        setEditingSubcategoryId={selection.setEditingSubcategoryId}
        showStructureOptions={showStructureOptions}
        structureEditingEnabled={menus.structureEditingEnabled}
        optionsOpen={menus.optionsOpen}
        setOptionsOpen={menus.setOptionsOpen}
        optionsSummary={menus.optionsSummary}
        showNewCategoryInput={menus.showNewCategoryInput}
        setShowNewCategoryInput={menus.setShowNewCategoryInput}
        newCategoryName={selection.newCategoryName}
        setNewCategoryName={selection.setNewCategoryName}
        showNewItemForm={menus.showNewItemForm}
        setShowNewItemForm={menus.setShowNewItemForm}
        selectedCategoryData={selection.selectedCategoryData}
        itemInputKey={selection.itemInputKey}
        itemPlaceholder={selection.itemPlaceholder}
        addingSubcategoryForSelectedCategory={selection.addingSubcategoryForSelectedCategory}
        inventoryItems={inventoryItems}
        selectCategory={treeCrud.selectCategory}
        selectSubcategory={treeCrud.selectSubcategory}
        saveCategory={treeCrud.saveCategory}
        deleteCategory={treeCrud.deleteCategory}
        addSubcategory={treeCrud.addSubcategory}
        saveSubcategory={treeCrud.saveSubcategory}
        deleteSubcategory={treeCrud.deleteSubcategory}
        addCategory={treeCrud.addCategory}
        addItem={treeCrud.addItem}
        beginAddItem={menus.beginAddItem}
        beginAddSubcategory={menus.beginAddSubcategory}
        openStructureOptions={menus.openStructureOptions}
        subcategoryStockItems={treeCrud.subcategoryStockItems}
        renderSubcategoryForm={renderSubcategoryForm}
        showStructureDelete={showStructureDelete}
        selectedSubcategory={selection.selectedSubcategory}
      />
      {itemsPanel}
    </div>
  );

  return (
    <>
      {sidebarLayout}
      {stockOverlay}
      <InventoryStructureDialogs
        embedded={embedded}
        showStructureOptions={showStructureOptions}
        optionsOpen={menus.optionsOpen}
        structureMenuMode={menus.structureMenuMode}
        structureMenuPosition={menus.structureMenuPosition}
        structureMenuMounted={menus.structureMenuMounted}
        structurePanelRef={menus.structurePanelRef}
        showNewCategoryInput={menus.showNewCategoryInput}
        setShowNewCategoryInput={menus.setShowNewCategoryInput}
        setOpenSubcategoryInput={selection.setOpenSubcategoryInput}
        newCategoryName={selection.newCategoryName}
        setNewCategoryName={selection.setNewCategoryName}
        selectedCategoryData={selection.selectedCategoryData}
        selectedSubcategory={selection.selectedSubcategory}
        addingSubcategoryForSelectedCategory={selection.addingSubcategoryForSelectedCategory}
        addCategory={treeCrud.addCategory}
        beginAddSubcategory={menus.beginAddSubcategory}
        renderSubcategoryForm={renderSubcategoryForm}
        editingCategoryName={selection.editingCategoryName}
        setEditingCategoryName={selection.setEditingCategoryName}
        saveCategory={treeCrud.saveCategory}
        showStructureDelete={showStructureDelete}
        deleteCategory={treeCrud.deleteCategory}
        deleteSubcategory={treeCrud.deleteSubcategory}
        showNewItemForm={menus.showNewItemForm}
        newItemPopoverPosition={menus.newItemPopoverPosition}
        newItemAnchorRef={menus.newItemAnchorRef}
        newItemPopoverRef={menus.newItemPopoverRef}
        itemPlaceholder={selection.itemPlaceholder}
        itemInputKey={selection.itemInputKey}
        newNameByKey={selection.newNameByKey}
        setNewNameByKey={selection.setNewNameByKey}
        addItem={treeCrud.addItem}
        setShowNewItemForm={menus.setShowNewItemForm}
        pricingReturnHref={pricingReturnHref}
        pricingReturnLabel={pricingReturnLabel}
        adminOpen={Boolean(leafActions.adminContext)}
        adminContext={leafActions.adminContext}
        adminSaving={leafActions.adminSaving}
        onCloseAdmin={() => leafActions.setAdminContext(null)}
        onSaveAdmin={leafActions.handleSaveItemAdmin}
        binPlacementOpen={context.binPlacementOpen}
        binPlacementContext={context.binPlacementContext}
        warehouseId={warehouseId}
        warehouseName={warehouseName}
        onCloseBinPlacement={() => {
          context.setBinPlacementOpen(false);
          context.setBinPlacementContext(null);
        }}
      />
    </>
  );
}
