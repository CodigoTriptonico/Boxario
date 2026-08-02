"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { formatScopedItemCount } from "@/lib/inventory-structure-utils";
import {
  collectCategoryTreeLeaves,
  countInventoryArticles,
  inventoryLeafKey,
  type InventoryStockItem,
} from "@/lib/inventory-stock";
import type { InventoryAssignment } from "@/lib/inventory-types";
import {
  categoryDirectItems,
  categorySubcategories,
  normalizeInventoryName,
  normalizeInventoryText,
  type CategoryConfig,
} from "@/lib/inventory-tree";

type UseInventoryStructureSelectionParams = {
  categoryConfigs: CategoryConfig[];
  inventoryItems: InventoryStockItem[];
  assignments: InventoryAssignment[];
};

export function useInventoryStructureSelection({
  categoryConfigs,
  inventoryItems,
  assignments,
}: UseInventoryStructureSelectionParams) {
  const [categoryQuery, setCategoryQuery] = useState("");
  const [itemQuery, setItemQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubcategoryId, setSelectedSubcategoryId] = useState("");
  const [embeddedSubcategoryOpen, setEmbeddedSubcategoryOpen] = useState(false);
  const [newNameByKey, setNewNameByKey] = useState<Record<string, string>>({});
  const [openSubcategoryInput, setOpenSubcategoryInput] = useState("");
  const [editingCategory, setEditingCategory] = useState("");
  const [editingCategoryName, setEditingCategoryName] = useState("");
  const [editingSubcategoryId, setEditingSubcategoryId] = useState("");
  const [editingSubcategoryName, setEditingSubcategoryName] = useState("");
  const [editingItemId, setEditingItemId] = useState("");
  const [editingItemName, setEditingItemName] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      setItemQuery("");
    });
  }, [selectedCategory, selectedSubcategoryId]);

  useEffect(() => {
    if (selectedCategory || !categoryConfigs.length) {
      return;
    }

    queueMicrotask(() => {
      setSelectedCategory(categoryConfigs[0].name);
    });
  }, [categoryConfigs, selectedCategory]);

  const categoryNames = useMemo(
    () => categoryConfigs.map((currentCategory) => normalizeInventoryName(currentCategory.name)),
    [categoryConfigs],
  );

  const filteredCategories = useMemo(() => {
    const query = normalizeInventoryText(categoryQuery.trim());

    return categoryConfigs.filter((currentCategory) =>
      normalizeInventoryText(currentCategory.name).includes(query),
    );
  }, [categoryConfigs, categoryQuery]);

  const selectedCategoryData = useMemo(
    () =>
      categoryConfigs.find(
        (currentCategory) => currentCategory.name === selectedCategory,
      ) || null,
    [categoryConfigs, selectedCategory],
  );

  const subcategories = useMemo(
    () =>
      selectedCategoryData ? categorySubcategories(selectedCategoryData) : [],
    [selectedCategoryData],
  );

  const selectedSubcategory = useMemo(
    () =>
      subcategories.find((item) => item.id === selectedSubcategoryId) || null,
    [subcategories, selectedSubcategoryId],
  );

  const directItems = useMemo(
    () =>
      selectedCategoryData ? categoryDirectItems(selectedCategoryData) : [],
    [selectedCategoryData],
  );

  const selectedItems = useMemo(() => {
    if (selectedSubcategory) {
      return selectedSubcategory.children || [];
    }

    return directItems;
  }, [selectedSubcategory, directItems]);

  const scopedItems = useMemo(() => {
    if (!selectedCategoryData) {
      return [];
    }

    if (selectedSubcategory) {
      return selectedSubcategory.children || [];
    }

    return directItems;
  }, [selectedCategoryData, selectedSubcategory, directItems]);

  const addingSubcategoryForSelectedCategory = Boolean(
    selectedCategoryData && openSubcategoryInput === selectedCategory,
  );

  const itemInputKey = selectedSubcategory
    ? `${selectedCategory}:${selectedSubcategory.id}:item`
    : `${selectedCategory}:direct:item`;

  const itemPlaceholder = selectedSubcategory
    ? "Ej. rojo, aislante"
    : "Ej. 14x14x14";

  const panelTitle = selectedSubcategory
    ? `${selectedCategoryData?.name} › ${selectedSubcategory.name}`
    : selectedCategoryData?.name || "Items";

  const itemQueryTrimmed = itemQuery.trim();
  const itemQueryActive = itemQueryTrimmed.length > 0;
  const itemCountLabel = selectedSubcategory
    ? formatScopedItemCount(scopedItems.length, selectedSubcategory.name)
    : formatScopedItemCount(directItems.length, selectedCategoryData?.name ?? "");

  const inventoryItemsInTree = useMemo(() => {
    const treeKeys = new Set(
      categoryConfigs.flatMap((category) =>
        collectCategoryTreeLeaves(category).map((leaf) => inventoryLeafKey(leaf)),
      ),
    );

    return inventoryItems.filter((item) => treeKeys.has(inventoryLeafKey(item)));
  }, [categoryConfigs, inventoryItems]);

  const inventoryOverview = useMemo(() => {
    const activeAssignments = assignments.filter((row) => row.status === "open");

    return {
      itemCount: countInventoryArticles(categoryConfigs),
      warehouseQty: inventoryItemsInTree.reduce((total, item) => total + item.stock, 0),
      assignedQty: inventoryItemsInTree.reduce(
        (total, item) => total + (item.assigned || 0),
        0,
      ),
      attentionCount: inventoryItemsInTree.filter(
        (item) => item.stock <= Math.max(item.minStock, 0),
      ).length,
      activeAssignments: activeAssignments.length,
    };
  }, [assignments, categoryConfigs, inventoryItemsInTree]);

  const resetStructureEditing = useCallback(() => {
    setEditingCategory("");
    setEditingCategoryName("");
    setEditingSubcategoryId("");
    setEditingSubcategoryName("");
    setEditingItemId("");
    setEditingItemName("");
  }, []);

  return {
    categoryQuery,
    setCategoryQuery,
    itemQuery,
    setItemQuery,
    selectedCategory,
    setSelectedCategory,
    selectedSubcategoryId,
    setSelectedSubcategoryId,
    embeddedSubcategoryOpen,
    setEmbeddedSubcategoryOpen,
    newNameByKey,
    setNewNameByKey,
    openSubcategoryInput,
    setOpenSubcategoryInput,
    editingCategory,
    setEditingCategory,
    editingCategoryName,
    setEditingCategoryName,
    editingSubcategoryId,
    setEditingSubcategoryId,
    editingSubcategoryName,
    setEditingSubcategoryName,
    editingItemId,
    setEditingItemId,
    editingItemName,
    setEditingItemName,
    newCategoryName,
    setNewCategoryName,
    categoryNames,
    filteredCategories,
    selectedCategoryData,
    subcategories,
    selectedSubcategory,
    directItems,
    selectedItems,
    scopedItems,
    addingSubcategoryForSelectedCategory,
    itemInputKey,
    itemPlaceholder,
    panelTitle,
    itemQueryTrimmed,
    itemQueryActive,
    itemCountLabel,
    inventoryOverview,
    resetStructureEditing,
  };
}
