"use client";

import { useCallback } from "react";
import type { useNotify } from "@/hooks/use-notify";
import {
  categoryLeafEntries,
  stockItemForTreeItem,
  type ItemContextMenu,
} from "@/lib/inventory-structure-utils";
import {
  inventoryItemsForLeaf,
  resolveSubcategoryStockItems,
  type InventoryStockItem,
} from "@/lib/inventory-stock";
import type { InventoryAssignment, InventoryMovement } from "@/lib/inventory-types";
import {
  addInventoryTreeChild,
  archiveInventoryTreeItem,
  categoryDirectItems,
  categoryItems,
  categorySubcategories,
  deleteInventoryTreeItem,
  inventoryTreeItemExists,
  isArchivedInventoryTreeItem,
  normalizeInventoryName,
  normalizeInventoryText,
  updateInventoryTreeItem,
  type CategoryConfig,
  type InventoryTreeItem,
} from "@/lib/inventory-tree";

type UseInventoryTreeCrudParams = {
  categoryConfigs: CategoryConfig[];
  onCategoryConfigsChange: (next: CategoryConfig[]) => void;
  inventoryItems: InventoryStockItem[];
  onInventoryItemsChange?: (next: InventoryStockItem[]) => void;
  movements: InventoryMovement[];
  assignments: InventoryAssignment[];
  notify: ReturnType<typeof useNotify>;
  selectedCategory: string;
  setSelectedCategory: (value: string) => void;
  selectedSubcategoryId: string;
  setSelectedSubcategoryId: (value: string) => void;
  setEmbeddedSubcategoryOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setCategoryQuery: (value: string) => void;
  setShowNewItemForm: (value: boolean) => void;
  setOpenSubcategoryInput: (value: string) => void;
  setItemQuery: (value: string) => void;
  categoryNames: string[];
  selectedCategoryData: CategoryConfig | null;
  selectedSubcategory: InventoryTreeItem | null;
  selectedItems: InventoryTreeItem[];
  newNameByKey: Record<string, string>;
  setNewNameByKey: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  newCategoryName: string;
  setNewCategoryName: (value: string) => void;
  setShowNewCategoryInput: (value: boolean) => void;
  editingCategoryName: string;
  setEditingCategoryName: (value: string) => void;
  setEditingCategory: (value: string) => void;
  editingSubcategoryName: string;
  setEditingSubcategoryName: (value: string) => void;
  setEditingSubcategoryId: (value: string) => void;
  editingItemName: string;
  setEditingItemName: (value: string) => void;
  setEditingItemId: (value: string) => void;
  setOptionsOpen: (value: boolean) => void;
  itemQuery: string;
  warehouseId?: string;
};

export function useInventoryTreeCrud({
  categoryConfigs,
  onCategoryConfigsChange,
  inventoryItems,
  onInventoryItemsChange,
  movements,
  assignments,
  notify,
  selectedCategory,
  setSelectedCategory,
  selectedSubcategoryId,
  setSelectedSubcategoryId,
  setEmbeddedSubcategoryOpen,
  setCategoryQuery,
  setShowNewItemForm,
  setOpenSubcategoryInput,
  setItemQuery,
  categoryNames,
  selectedCategoryData,
  selectedSubcategory,
  selectedItems,
  newNameByKey,
  setNewNameByKey,
  newCategoryName,
  setNewCategoryName,
  setShowNewCategoryInput,
  editingCategoryName,
  setEditingCategoryName,
  setEditingCategory,
  editingSubcategoryName,
  setEditingSubcategoryName,
  setEditingSubcategoryId,
  editingItemName,
  setEditingItemName,
  setEditingItemId,
  setOptionsOpen,
  itemQuery,
  warehouseId,
}: UseInventoryTreeCrudParams) {
  function selectCategory(name: string) {
    setSelectedCategory(name);
    setSelectedSubcategoryId("");
    setEmbeddedSubcategoryOpen(false);
    setCategoryQuery("");
    setShowNewItemForm(false);
    setOpenSubcategoryInput("");
  }

  function selectSubcategory(id: string) {
    setSelectedSubcategoryId(id);
    setShowNewItemForm(false);
  }

  function exitSubcategory() {
    setSelectedSubcategoryId("");
    setItemQuery("");
    setShowNewItemForm(false);
  }

  function pushInventoryItem(item: InventoryStockItem) {
    onInventoryItemsChange?.([...inventoryItems, item]);
  }

  function removeInventoryForLeaf(
    categoryName: string,
    leafName: string,
    subcategoryName?: string,
  ) {
    const matches = inventoryItemsForLeaf(
      inventoryItems,
      categoryName,
      leafName,
      subcategoryName,
    );
    const matchIds = new Set(matches.map((item) => item.id));

    onInventoryItemsChange?.(
      inventoryItems.filter((item) => !matchIds.has(item.id)),
    );
  }

  function addCategory() {
    const name = newCategoryName.trim();
    const normalizedName = normalizeInventoryName(name);

    if (!normalizedName) {
      notify.error("Escribe un nombre para la categoría.");
      return;
    }

    if (categoryNames.includes(normalizedName)) {
      notify.error("Ya existe una categoría con ese nombre.");
      return;
    }

    onCategoryConfigsChange([...categoryConfigs, { name, items: [] }]);
    selectCategory(name);
    setNewCategoryName("");
    setShowNewCategoryInput(false);
  }

  function saveCategory(oldName: string) {
    const name = editingCategoryName.trim();
    const normalizedName = normalizeInventoryName(name);

    if (!normalizedName) {
      notify.error("Escribe un nombre para la categoría.");
      setEditingCategoryName(oldName);
      return;
    }

    if (normalizeInventoryName(oldName) === normalizedName) {
      setEditingCategoryName(oldName);
      return;
    }

    if (
      name !== oldName &&
      categoryConfigs.some(
        (currentCategory) =>
          currentCategory.name !== oldName &&
          normalizeInventoryName(currentCategory.name) === normalizedName,
      )
    ) {
      notify.error("Ya existe una categoría con ese nombre.");
      setEditingCategoryName(oldName);
      return;
    }

    onCategoryConfigsChange(
      categoryConfigs.map((currentCategory) =>
        currentCategory.name === oldName
          ? { ...currentCategory, name }
          : currentCategory,
      ),
    );

    onInventoryItemsChange?.(
      inventoryItems.map((item) =>
        normalizeInventoryText(item.category) ===
        normalizeInventoryText(oldName)
          ? { ...item, category: name }
          : item,
      ),
    );

    if (selectedCategory === oldName) {
      setSelectedCategory(name);
    }

    setEditingCategory("");
    setEditingCategoryName(name);
  }

  function deleteCategory(name: string) {
    onCategoryConfigsChange(
      categoryConfigs.filter(
        (currentCategory) => currentCategory.name !== name,
      ),
    );

    onInventoryItemsChange?.(
      inventoryItems.filter(
        (item) =>
          normalizeInventoryText(item.category) !==
          normalizeInventoryText(name),
      ),
    );

    if (selectedCategory === name) {
      const next =
        categoryConfigs.find((item) => item.name !== name)?.name || "";
      selectCategory(next);
    }

    setEditingCategory("");
    setEditingCategoryName("");
    setEditingSubcategoryId("");
    setEditingSubcategoryName("");
    setOpenSubcategoryInput("");
    setShowNewCategoryInput(false);
    setShowNewItemForm(false);
    setOptionsOpen(false);
  }

  function addSubcategory(categoryName: string) {
    const subcategoryName = (newNameByKey[categoryName] || "").trim();

    if (!subcategoryName) {
      notify.error("Escribe un nombre para la subcategoría.");
      return;
    }

    const categoryData = categoryConfigs.find(
      (currentCategory) => currentCategory.name === categoryName,
    );

    if (
      categoryData &&
      inventoryTreeItemExists(categoryItems(categoryData), subcategoryName)
    ) {
      notify.error("Ya existe una subcategoría con ese nombre aquí.");
      return;
    }

    let createdId = "";

    onCategoryConfigsChange(
      categoryConfigs.map((currentCategory) => {
        const items = categoryItems(currentCategory);

        if (
          currentCategory.name !== categoryName ||
          inventoryTreeItemExists(items, subcategoryName)
        ) {
          return currentCategory;
        }

        createdId = `${normalizeInventoryText(categoryName).replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`;

        return {
          ...currentCategory,
          items: [
            ...items,
            {
              id: createdId,
              name: subcategoryName,
              children: [],
            },
          ],
        };
      }),
    );

    setNewNameByKey((current) => ({ ...current, [categoryName]: "" }));
    setOpenSubcategoryInput("");

    if (createdId && categoryName === selectedCategory) {
      selectSubcategory(createdId);
    }
  }

  function saveSubcategory(categoryName: string, subcategoryId: string) {
    const nextName = editingSubcategoryName.trim();

    if (!nextName) {
      return;
    }

    const categoryData = categoryConfigs.find(
      (currentCategory) => currentCategory.name === categoryName,
    );
    const subcategory =
      (categoryData ? categorySubcategories(categoryData) : []).find(
        (item) => item.id === subcategoryId,
      ) || null;
    const previousName = subcategory?.name || "";

    if (
      categoryData &&
      inventoryTreeItemExists(
        categoryItems(categoryData).filter((item) => item.id !== subcategoryId),
        nextName,
      )
    ) {
      notify.error("Ya existe una subcategoría con ese nombre aquí.");
      return;
    }

    onCategoryConfigsChange(
      categoryConfigs.map((currentCategory) => {
        if (currentCategory.name !== categoryName) {
          return currentCategory;
        }

        return {
          ...currentCategory,
          items: updateInventoryTreeItem(
            categoryItems(currentCategory),
            subcategoryId,
            nextName,
          ),
        };
      }),
    );

    if (previousName && previousName !== nextName) {
      onInventoryItemsChange?.(
        inventoryItems.map((item) =>
          normalizeInventoryText(item.category) ===
            normalizeInventoryText(categoryName) &&
          item.subcategory &&
          normalizeInventoryText(item.subcategory) ===
            normalizeInventoryText(previousName)
            ? { ...item, subcategory: nextName }
            : item,
        ),
      );
    }

    setEditingSubcategoryId("");
    setEditingSubcategoryName("");
  }

  function deleteSubcategory(categoryName: string, subcategoryId: string) {
    onCategoryConfigsChange(
      categoryConfigs.map((currentCategory) =>
        currentCategory.name === categoryName
          ? {
              ...currentCategory,
              items: deleteInventoryTreeItem(
                categoryItems(currentCategory),
                subcategoryId,
              ),
            }
          : currentCategory,
      ),
    );

    if (selectedSubcategoryId === subcategoryId) {
      setSelectedSubcategoryId("");
    }
  }

  function addItem() {
    if (!selectedCategoryData) {
      notify.error("Elige una categoría antes de agregar un item.");
      return;
    }

    const categoryName = selectedCategoryData.name;
    const subcategoryId = selectedSubcategory?.id ?? null;
    const inputKey = subcategoryId
      ? `${categoryName}:${subcategoryId}:item`
      : `${categoryName}:direct:item`;
    const itemName = (newNameByKey[inputKey] || "").trim();

    if (!itemName) {
      notify.error("Escribe un nombre para el item.");
      return;
    }

    const siblings = subcategoryId
      ? selectedSubcategory?.children || []
      : categoryDirectItems(selectedCategoryData);

    if (inventoryTreeItemExists(siblings, itemName)) {
      notify.error("Ya existe un item con ese nombre aquí.");
      return;
    }

    onCategoryConfigsChange(
      categoryConfigs.map((currentCategory) => {
        if (currentCategory.name !== categoryName) {
          return currentCategory;
        }

        const items = categoryItems(currentCategory);

        if (subcategoryId) {
          return {
            ...currentCategory,
            items: addInventoryTreeChild(items, subcategoryId, {
              id: `${subcategoryId}-${Date.now()}`,
              name: itemName,
            }),
          };
        }

        return {
          ...currentCategory,
          items: [
            ...items,
            {
              id: `${normalizeInventoryText(categoryName).replace(/[^a-z0-9]+/g, "-")}-item-${Date.now()}`,
              name: itemName,
            },
          ],
        };
      }),
    );

    setNewNameByKey((current) => ({ ...current, [inputKey]: "" }));
    setShowNewItemForm(false);

    const subcategoryName = subcategoryId ? selectedSubcategory?.name : undefined;

    pushInventoryItem({
      id: `inv-${Date.now()}`,
      name: itemName,
      category: categoryName,
      kind: itemName,
      subcategory: subcategoryName,
      stock: 0,
      reserved: 0,
      assigned: 0,
      unavailable: 0,
      minStock: 2,
    });

    notify.success(
      subcategoryName
        ? `Item agregado en ${categoryName} › ${subcategoryName}`
        : `Item agregado en ${categoryName}`,
    );
  }

  function saveItem(categoryName: string, itemId: string) {
    const nextName = editingItemName.trim();

    if (!nextName) {
      return;
    }

    const previousItem = selectedItems.find((item) => item.id === itemId);

    onCategoryConfigsChange(
      categoryConfigs.map((currentCategory) => {
        if (currentCategory.name !== categoryName) {
          return currentCategory;
        }

        return {
          ...currentCategory,
          items: updateInventoryTreeItem(
            categoryItems(currentCategory),
            itemId,
            nextName,
          ),
        };
      }),
    );

    if (previousItem && previousItem.name !== nextName) {
      onInventoryItemsChange?.(
        inventoryItems.map((item) => {
          const leafMatches = inventoryItemsForLeaf(
            inventoryItems,
            categoryName,
            previousItem.name,
            selectedSubcategory?.name,
          ).some((match) => match.id === item.id);

          if (!leafMatches) {
            return item;
          }

          return { ...item, name: nextName, kind: nextName };
        }),
      );
    }

    setEditingItemId("");
    setEditingItemName("");
  }

  function deleteItem(categoryName: string, itemId: string) {
    const treeItem = selectedItems.find((entry) => entry.id === itemId);

    onCategoryConfigsChange(
      categoryConfigs.map((currentCategory) =>
        currentCategory.name === categoryName
          ? {
              ...currentCategory,
              items: deleteInventoryTreeItem(
                categoryItems(currentCategory),
                itemId,
              ),
            }
          : currentCategory,
      ),
    );

    if (treeItem) {
      removeInventoryForLeaf(
        categoryName,
        treeItem.name,
        selectedSubcategory?.name,
      );
    }
  }

  function archiveItem(categoryName: string, itemId: string) {
    const treeItem = selectedItems.find((entry) => entry.id === itemId);
    const stockItem = treeItem
      ? stockItemForTreeItem(
          inventoryItems,
          categoryName,
          treeItem,
          selectedSubcategory?.name,
        )
      : null;

    const hasHistory =
      movements.some(
        (movement) =>
          movement.itemId === stockItem?.id ||
          movement.itemName === treeItem?.name,
      ) ||
      assignments.some(
        (assignment) =>
          assignment.itemId === stockItem?.id ||
          assignment.itemName === treeItem?.name,
      ) ||
      (stockItem?.assigned || 0) > 0;

    const confirmed = window.confirm(
      hasHistory
        ? "¿Archivar este artículo? Conservará su historial pero dejará de aparecer para operaciones nuevas."
        : "¿Eliminar este artículo? No tiene movimientos registrados.",
    );

    if (!confirmed) {
      return;
    }

    if (hasHistory) {
      onCategoryConfigsChange(
        categoryConfigs.map((currentCategory) =>
          currentCategory.name === categoryName
            ? {
                ...currentCategory,
                items: archiveInventoryTreeItem(
                  categoryItems(currentCategory),
                  itemId,
                ),
              }
            : currentCategory,
        ),
      );
      notify.success("Artículo archivado");
      return;
    }

    deleteItem(categoryName, itemId);
  }

  function openItemContextMenu(
    event: React.MouseEvent<HTMLElement>,
    item: InventoryTreeItem,
    stockItem: InventoryStockItem,
    primaryLocation: string | undefined,
    setStockError: (value: string) => void,
    setItemContextMenu: (value: ItemContextMenu | null) => void,
  ) {
    if (!selectedCategoryData) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    setStockError("");

    const menuWidth = 220;
    const menuHeight = warehouseId ? 320 : 240;
    const x = Math.min(event.clientX, window.innerWidth - menuWidth - 12);
    const y = Math.min(event.clientY, window.innerHeight - menuHeight - 12);

    setItemContextMenu({
      x: Math.max(12, x),
      y: Math.max(12, y),
      treeItem: item,
      stockItem,
      categoryName: selectedCategoryData.name,
      subcategoryName: selectedSubcategory?.name,
      primaryLocation,
    });
  }

  const subcategoryStockItems = useCallback(
    (
      category: CategoryConfig,
      subcategoryName: string,
      childKindNames: string[],
    ) => {
      return resolveSubcategoryStockItems(
        inventoryItems,
        category,
        subcategoryName,
        childKindNames,
      );
    },
    [inventoryItems],
  );

  const filteredItems = useCallback(
    (scopedItems: InventoryTreeItem[], directItems?: InventoryTreeItem[]) => {
      void directItems;
      const query = normalizeInventoryText(itemQuery.trim());

      if (!selectedCategoryData) {
        return [];
      }

      const baseItems = selectedSubcategory
        ? scopedItems
        : query
          ? categoryLeafEntries(selectedCategoryData).map((entry) => entry.item)
          : scopedItems;

      if (!query) {
        return baseItems.filter((item) => !isArchivedInventoryTreeItem(item));
      }

      const matchingIds = new Set(
        categoryLeafEntries(selectedCategoryData)
          .filter((entry) => normalizeInventoryText(entry.item.name).includes(query))
          .map((entry) => entry.item.id),
      );

      return baseItems.filter(
        (item) => matchingIds.has(item.id) && !isArchivedInventoryTreeItem(item),
      );
    },
    [itemQuery, selectedCategoryData, selectedSubcategory],
  );

  return {
    selectCategory,
    selectSubcategory,
    exitSubcategory,
    addCategory,
    saveCategory,
    deleteCategory,
    addSubcategory,
    saveSubcategory,
    deleteSubcategory,
    addItem,
    saveItem,
    deleteItem,
    archiveItem,
    openItemContextMenu,
    subcategoryStockItems,
    filteredItems,
  };
}
