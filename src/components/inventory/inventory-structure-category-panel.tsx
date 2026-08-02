"use client";

import { useMemo } from "react";
import { InventoryCategorySidebar } from "@/components/inventory/inventory-category-sidebar";
import type { InventoryStockItem } from "@/lib/inventory-stock";
import type { CategoryConfig, InventoryTreeItem } from "@/lib/inventory-tree";

export type InventoryStructureCategoryPanelProps = {
  categoryQuery: string;
  setCategoryQuery: (value: string) => void;
  categoryConfigs: CategoryConfig[];
  filteredCategories: CategoryConfig[];
  selectedCategory: string;
  selectedSubcategoryId: string;
  editingCategory: string;
  editingCategoryName: string;
  setEditingCategoryName: (value: string) => void;
  setEditingCategory: (value: string) => void;
  openSubcategoryInput: string;
  setOpenSubcategoryInput: (value: string) => void;
  newNameByKey: Record<string, string>;
  setNewNameByKey: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  editingSubcategoryId: string;
  editingSubcategoryName: string;
  setEditingSubcategoryName: (value: string) => void;
  setEditingSubcategoryId: (value: string) => void;
  showStructureOptions: boolean;
  structureEditingEnabled: boolean;
  optionsOpen: boolean;
  setOptionsOpen: React.Dispatch<React.SetStateAction<boolean>>;
  optionsSummary: string;
  showNewCategoryInput: boolean;
  setShowNewCategoryInput: (value: boolean) => void;
  newCategoryName: string;
  setNewCategoryName: (value: string) => void;
  showNewItemForm: boolean;
  setShowNewItemForm: (value: boolean) => void;
  selectedCategoryData: CategoryConfig | null;
  itemInputKey: string;
  itemPlaceholder: string;
  addingSubcategoryForSelectedCategory: boolean;
  inventoryItems: InventoryStockItem[];
  selectCategory: (name: string) => void;
  selectSubcategory: (id: string) => void;
  saveCategory: (name: string) => void;
  deleteCategory: (name: string) => void;
  addSubcategory: (categoryName: string) => void;
  saveSubcategory: (categoryName: string, subcategoryId: string) => void;
  deleteSubcategory: (categoryName: string, subcategoryId: string) => void;
  addCategory: () => void;
  addItem: () => void;
  beginAddItem: () => void;
  beginAddSubcategory: () => void;
  openStructureOptions: (opts?: { addCategory?: boolean; addItem?: boolean }) => void;
  subcategoryStockItems: (
    category: CategoryConfig,
    subcategoryName: string,
    itemNames: string[],
  ) => InventoryStockItem[];
  renderSubcategoryForm: (compact?: boolean) => React.ReactNode;
  showStructureDelete: boolean;
  selectedSubcategory: InventoryTreeItem | null;
};

export function InventoryStructureCategoryPanel(props: InventoryStructureCategoryPanelProps) {
  return useMemo(
    () => <InventoryCategorySidebar {...props} />,
  // Sidebar shell: handlers close over latest state; full deps would rebuild every keystroke.
  // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional stable shell snapshot
    [
      props.categoryQuery,
      props.newCategoryName,
      props.filteredCategories,
      props.selectedCategory,
      props.selectedSubcategoryId,
      props.editingCategory,
      props.editingCategoryName,
      props.editingSubcategoryId,
      props.editingSubcategoryName,
      props.openSubcategoryInput,
      props.newNameByKey,
      props.showStructureOptions,
      props.showNewCategoryInput,
      props.optionsOpen,
      props.optionsSummary,
      props.selectedCategoryData,
      props.itemInputKey,
      props.itemPlaceholder,
      props.showNewItemForm,
      props.selectCategory,
      props.selectSubcategory,
      props.saveCategory,
      props.deleteCategory,
      props.addSubcategory,
      props.saveSubcategory,
      props.deleteSubcategory,
      props.addCategory,
      props.addItem,
      props.subcategoryStockItems,
    ],
  );
}
