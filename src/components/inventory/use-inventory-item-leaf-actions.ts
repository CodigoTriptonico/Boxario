"use client";

import { useState } from "react";
import {
  clearInventoryItemPhotoAction,
  updateInventoryItemMetadataAction,
  updateInventoryItemUnitAction,
  uploadInventoryItemPhotoAction,
} from "@/app/actions/inventory";
import type { useNotify } from "@/hooks/use-notify";
import {
  inventoryItemsForLeaf,
  type InventoryStockItem,
} from "@/lib/inventory-stock";
import type { ItemContextMenu } from "@/lib/inventory-structure-utils";
import {
  categoryItems,
  updateInventoryTreeItem,
  type CategoryConfig,
} from "@/lib/inventory-tree";

type UseInventoryItemLeafActionsParams = {
  categoryConfigs: CategoryConfig[];
  onCategoryConfigsChange: (next: CategoryConfig[]) => void;
  inventoryItems: InventoryStockItem[];
  onInventoryItemsChange?: (next: InventoryStockItem[]) => void;
  warehouseId?: string;
  notify: ReturnType<typeof useNotify>;
};

export function useInventoryItemLeafActions({
  categoryConfigs,
  onCategoryConfigsChange,
  inventoryItems,
  onInventoryItemsChange,
  warehouseId,
  notify,
}: UseInventoryItemLeafActionsParams) {
  const [photoUploading, setPhotoUploading] = useState(false);
  const [unitSaving, setUnitSaving] = useState(false);
  const [adminContext, setAdminContext] = useState<ItemContextMenu | null>(null);
  const [adminSaving, setAdminSaving] = useState(false);

  function updateLeafPhoto(
    context: ItemContextMenu,
    photoUrl: string | undefined,
  ) {
    onInventoryItemsChange?.(
      inventoryItems.map((item) => {
        const leafMatches = inventoryItemsForLeaf(
          inventoryItems,
          context.categoryName,
          context.treeItem.name,
          context.subcategoryName,
        ).some((match) => match.id === item.id);

        if (!leafMatches) {
          return item;
        }

        return {
          ...item,
          photoUrl,
        };
      }),
    );
  }

  async function handleUploadItemPhoto(context: ItemContextMenu, file: File) {
    setPhotoUploading(true);

    try {
      const formData = new FormData();
      formData.set("photo", file);
      formData.set("itemId", context.stockItem.id);

      const result = await uploadInventoryItemPhotoAction(formData);

      if (!result.ok) {
        notify.error(result.error);
        return;
      }

      updateLeafPhoto(context, result.data.previewUrl);
      notify.success("Foto del producto actualizada");
      return true;
    } finally {
      setPhotoUploading(false);
    }
  }

  async function handleClearItemPhoto(context: ItemContextMenu) {
    setPhotoUploading(true);

    try {
      const result = await clearInventoryItemPhotoAction(context.stockItem.id);

      if (!result.ok) {
        notify.error(result.error);
        return;
      }

      updateLeafPhoto(context, undefined);
      notify.success("Foto del producto eliminada");
      return true;
    } finally {
      setPhotoUploading(false);
    }
  }

  function updateLeafUnit(context: ItemContextMenu, unit: string) {
    onInventoryItemsChange?.(
      inventoryItems.map((item) => {
        const leafMatches = inventoryItemsForLeaf(
          inventoryItems,
          context.categoryName,
          context.treeItem.name,
          context.subcategoryName,
        ).some((match) => match.id === item.id);

        if (!leafMatches) {
          return item;
        }

        return {
          ...item,
          unit,
        };
      }),
    );
  }

  async function handleUpdateItemUnit(context: ItemContextMenu, unit: string) {
    setUnitSaving(true);

    try {
      const result = await updateInventoryItemUnitAction({
        itemId: context.stockItem.id,
        unit,
        warehouseId,
        category: context.categoryName,
        kind: context.treeItem.name,
        subcategory: context.subcategoryName,
        itemName: context.treeItem.name,
      });

      if (!result.ok) {
        notify.error(result.error);
        return false;
      }

      updateLeafUnit(context, result.data.unit);
      notify.success("Unidad de medida actualizada");
      return true;
    } finally {
      setUnitSaving(false);
    }
  }

  async function handleSaveItemAdmin(draft: {
    name: string;
    sku: string;
    barcode: string;
    description: string;
    unit: string;
    minStock: string;
    maxStock: string;
    inventoryClass: "consumable" | "sellable" | "reusable" | "asset";
    preferredSupplier: string;
    requiresSerialTracking: boolean;
    requiresLotTracking: boolean;
    requiresExpiryTracking: boolean;
    isCommercial: boolean;
    isActive: boolean;
  }) {
    if (!adminContext || !warehouseId) {
      return;
    }

    setAdminSaving(true);

    const result = await updateInventoryItemMetadataAction({
      itemId: adminContext.stockItem.id,
      warehouseId,
      category: adminContext.categoryName,
      kind: adminContext.treeItem.name,
      subcategory: adminContext.subcategoryName,
      itemName: adminContext.treeItem.name,
      name: draft.name,
      sku: draft.sku,
      barcode: draft.barcode,
      description: draft.description,
      unit: draft.unit,
      minStock: Number(draft.minStock),
      maxStock: draft.maxStock.trim() ? Number(draft.maxStock) : null,
      inventoryClass: draft.inventoryClass,
      preferredSupplier: draft.preferredSupplier,
      requiresSerialTracking: draft.requiresSerialTracking,
      requiresLotTracking: draft.requiresLotTracking,
      requiresExpiryTracking: draft.requiresExpiryTracking,
      isCommercial: draft.isCommercial,
      isActive: draft.isActive,
    });

    setAdminSaving(false);

    if (!result.ok) {
      notify.error(result.error);
      return;
    }

    onCategoryConfigsChange(
      categoryConfigs.map((currentCategory) =>
        currentCategory.name === adminContext.categoryName
          ? {
              ...currentCategory,
              items: updateInventoryTreeItem(
                categoryItems(currentCategory),
                adminContext.treeItem.id,
                draft.name.trim(),
              ),
            }
          : currentCategory,
      ),
    );

    onInventoryItemsChange?.(
      inventoryItems.map((item) => {
        const leafMatches = inventoryItemsForLeaf(
          inventoryItems,
          adminContext.categoryName,
          adminContext.treeItem.name,
          adminContext.subcategoryName,
        ).some((match) => match.id === item.id);

        if (!leafMatches) {
          return item;
        }

        return {
          ...item,
          name: draft.name.trim(),
          sku: draft.sku.trim() || undefined,
          barcode: draft.barcode.trim() || undefined,
          description: draft.description.trim() || undefined,
          unit: draft.unit,
          minStock: Number(draft.minStock) || 0,
          maxStock: draft.maxStock.trim() ? Number(draft.maxStock) : null,
          inventoryClass: draft.inventoryClass,
          preferredSupplier: draft.preferredSupplier.trim() || undefined,
          requiresSerialTracking: draft.requiresSerialTracking,
          requiresLotTracking: draft.requiresLotTracking,
          requiresExpiryTracking: draft.requiresExpiryTracking,
          isCommercial: draft.isCommercial,
          isActive: draft.isActive,
        };
      }),
    );

    setAdminContext(null);
    notify.success("Artículo actualizado");
  }

  return {
    photoUploading,
    unitSaving,
    adminContext,
    setAdminContext,
    adminSaving,
    handleUploadItemPhoto,
    handleClearItemPhoto,
    handleUpdateItemUnit,
    handleSaveItemAdmin,
  };
}
