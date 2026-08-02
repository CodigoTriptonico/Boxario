"use client";

import { useMemo, useState } from "react";
import type { PricingCountryConfig } from "@/lib/pricing/types";
import {
  catalogProductFromLeaf,
  isCommercialInventoryProduct,
} from "@/lib/pricing-catalog";
import {
  movementsForItem,
  type ItemContextMenu,
  type MovementDraft,
} from "@/lib/inventory-structure-utils";
import type { InventoryAssignment, InventoryMovement } from "@/lib/inventory-types";

type UseInventoryStructureContextParams = {
  movements: InventoryMovement[];
  assignments: InventoryAssignment[];
  pricingCountries: PricingCountryConfig[];
  itemHistoryContext: ItemContextMenu | null;
  beginMovementDraft: (
    type: MovementDraft["type"],
    context: ItemContextMenu | null,
  ) => void;
  openItemHistoryDraft: (context: ItemContextMenu | null) => void;
};

export function useInventoryStructureContext({
  movements,
  assignments,
  pricingCountries,
  itemHistoryContext,
  beginMovementDraft,
  openItemHistoryDraft,
}: UseInventoryStructureContextParams) {
  const [itemContextMenu, setItemContextMenu] =
    useState<ItemContextMenu | null>(null);
  const [binPlacementOpen, setBinPlacementOpen] = useState(false);
  const [binPlacementContext, setBinPlacementContext] =
    useState<ItemContextMenu | null>(null);

  function beginMovement(type: MovementDraft["type"]) {
    beginMovementDraft(type, itemContextMenu);
    setItemContextMenu(null);
  }

  function openItemHistory() {
    openItemHistoryDraft(itemContextMenu);
    setItemContextMenu(null);
  }

  const itemHistoryMovements = useMemo(() => {
    if (!itemHistoryContext) {
      return [];
    }

    return movementsForItem(
      movements,
      itemHistoryContext.stockItem,
      itemHistoryContext.treeItem.name,
    );
  }, [itemHistoryContext, movements]);

  const contextMenuAssignments = useMemo(() => {
    if (!itemContextMenu) {
      return [];
    }

    const { stockItem, treeItem } = itemContextMenu;

    return assignments.filter(
      (row) =>
        row.status === "open" &&
        (row.itemId === stockItem.id ||
          row.itemName === treeItem.name ||
          row.itemName === stockItem.name),
    );
  }, [assignments, itemContextMenu]);

  const showCommercialPricing = useMemo(() => {
    if (!itemContextMenu) {
      return false;
    }

    const product = catalogProductFromLeaf({
      category: itemContextMenu.categoryName,
      kind: itemContextMenu.treeItem.name,
      subcategory: itemContextMenu.subcategoryName,
      name: itemContextMenu.treeItem.name,
    });

    return isCommercialInventoryProduct(product, pricingCountries, {
      isCommercialFlag: itemContextMenu.stockItem.isCommercial,
    });
  }, [itemContextMenu, pricingCountries]);

  return {
    itemContextMenu,
    setItemContextMenu,
    binPlacementOpen,
    setBinPlacementOpen,
    binPlacementContext,
    setBinPlacementContext,
    beginMovement,
    openItemHistory,
    itemHistoryMovements,
    contextMenuAssignments,
    showCommercialPricing,
  };
}
