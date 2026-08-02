"use client";

import { Layers3, Package2 } from "lucide-react";
import { useMemo } from "react";
import { StockBadgeDisplay } from "@/components/stock-badge";
import {
  categoryLeafEntries,
  type CategoryLeafEntry,
} from "@/lib/inventory-structure-utils";
import {
  inventoryItemsForLeaf,
  resolveCategoryStockItems,
  type InventoryStockItem,
} from "@/lib/inventory-stock";
import type { CategoryConfig, InventoryTreeItem } from "@/lib/inventory-tree";

type UseInventoryEmbeddedOptionsParams = {
  categoryConfigs: CategoryConfig[];
  inventoryItems: InventoryStockItem[];
  warehouseId?: string;
  selectedCategoryData: CategoryConfig | null;
  subcategories: InventoryTreeItem[];
  selectedSubcategory: InventoryTreeItem | null;
  subcategoryStockItems: (
    category: CategoryConfig,
    subcategoryName: string,
    itemNames: string[],
  ) => InventoryStockItem[];
  embeddedSubcategoryOpen: boolean;
  selectedSubcategoryId: string;
};

export function useInventoryEmbeddedOptions({
  categoryConfigs,
  inventoryItems,
  warehouseId,
  selectedCategoryData,
  subcategories,
  selectedSubcategory,
  subcategoryStockItems,
  embeddedSubcategoryOpen,
  selectedSubcategoryId,
}: UseInventoryEmbeddedOptionsParams) {
  const embeddedCategoryOptions = useMemo(
    () =>
      categoryConfigs.map((category) => ({
        value: category.name,
        label: category.name,
        icon: <Layers3 className="h-4 w-4 text-slate-500" aria-hidden />,
        trailing: (
          <StockBadgeDisplay
            items={resolveCategoryStockItems(inventoryItems, category)}
            title="Stock en categoría"
          />
        ),
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stock snapshot
    [categoryConfigs, inventoryItems, warehouseId],
  );

  const embeddedSubcategoryOptions = useMemo(() => {
    if (!selectedCategoryData || !subcategories.length) {
      return [];
    }

    return [
      { value: "", label: "Items sueltos" },
      ...subcategories.map((subcategory) => ({
        value: subcategory.id,
        label: subcategory.name,
        trailing: (
          <StockBadgeDisplay
            items={subcategoryStockItems(
              selectedCategoryData,
              subcategory.name,
              (subcategory.children || []).map((child) => child.name),
            )}
            title="Stock en subcategoría"
          />
        ),
      })),
    ];
  }, [selectedCategoryData, subcategories, subcategoryStockItems]);

  const hasEmbeddedSubcategories = embeddedSubcategoryOptions.length > 1;
  const hasSubcategorySelection = Boolean(selectedSubcategoryId);
  const showEmbeddedSubcategoryPicker =
    hasEmbeddedSubcategories &&
    (embeddedSubcategoryOpen || hasSubcategorySelection);

  const embeddedItemOptions = useMemo(() => {
    if (!selectedCategoryData) {
      return [];
    }

    const entries: CategoryLeafEntry[] = selectedSubcategory
      ? (selectedSubcategory.children || []).map((item) => ({
          item,
          subcategoryName: selectedSubcategory.name,
        }))
      : categoryLeafEntries(selectedCategoryData);

    return entries.map((entry) => {
      const leafItems = inventoryItemsForLeaf(
        inventoryItems,
        selectedCategoryData.name,
        entry.item.name,
        entry.subcategoryName,
      );

      return {
        value: entry.item.id,
        label: entry.subcategoryName
          ? `${entry.item.name} · ${entry.subcategoryName}`
          : entry.item.name,
        icon: <Package2 className="h-4 w-4 text-slate-500" aria-hidden />,
        trailing: (
          <StockBadgeDisplay
            items={
              leafItems.length
                ? leafItems
                : [
                    {
                      id: `virtual-leaf-${entry.item.id}`,
                      name: entry.item.name,
                      category: selectedCategoryData.name,
                      kind: entry.item.name,
                      subcategory: entry.subcategoryName,
                      stock: 0,
                      reserved: 0,
                      assigned: 0,
                      unavailable: 0,
                      minStock: 2,
                    },
                  ]
            }
            title="Stock disponible"
          />
        ),
      };
    });
  }, [inventoryItems, selectedCategoryData, selectedSubcategory]);

  return {
    embeddedCategoryOptions,
    embeddedSubcategoryOptions,
    embeddedItemOptions,
    hasEmbeddedSubcategories,
    hasSubcategorySelection,
    showEmbeddedSubcategoryPicker,
  };
}
