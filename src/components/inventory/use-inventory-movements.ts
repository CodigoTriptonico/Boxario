"use client";

import { useState } from "react";
import { recordInventoryMovementForLeafAction, listInventorySupplierTagsAction } from "@/app/actions/inventory";
import { useNotify } from "@/hooks/use-notify";
import { resolveEntryCostForSubmit } from "@/lib/inventory-entry-cost";
import {
  defaultReasonCodeForMovementType,
  normalizeReasonCodeForMovementType,
} from "@/lib/inventory-movement-audit";
import { mergeInventorySupplierTags } from "@/lib/inventory-supplier-tags";
import type { InventoryMovement } from "@/lib/inventory-types";
import type { InventoryStockItem } from "@/lib/inventory-stock";
import { sameStockLeaf, type ItemContextMenu, type MovementDraft } from "@/lib/inventory-structure-utils";

type UseInventoryMovementsParams = {
  warehouseId?: string;
  notify: ReturnType<typeof useNotify>;
  inventoryItems: InventoryStockItem[];
  onInventoryItemsChange?: (next: InventoryStockItem[]) => void;
  onMovementRecorded?: (movement: InventoryMovement) => void;
};

export function useInventoryMovements({
  warehouseId,
  notify,
  inventoryItems,
  onInventoryItemsChange,
  onMovementRecorded,
}: UseInventoryMovementsParams) {
  const [movementDraft, setMovementDraft] = useState<MovementDraft | null>(null);
  const [supplierTags, setSupplierTags] = useState<string[]>([]);
  const [stockSaving, setStockSaving] = useState(false);
  const [stockError, setStockError] = useState("");
  const [itemHistoryContext, setItemHistoryContext] = useState<ItemContextMenu | null>(null);

  function upsertInventoryStockItem(nextItem: InventoryStockItem) {
    const exists = inventoryItems.some(
      (item) =>
        item.id === nextItem.id ||
        sameStockLeaf(item, nextItem.category, nextItem.kind, nextItem.subcategory),
    );

    onInventoryItemsChange?.(
      exists
        ? inventoryItems.map((item) =>
            item.id === nextItem.id ||
            sameStockLeaf(item, nextItem.category, nextItem.kind, nextItem.subcategory)
              ? { ...item, ...nextItem }
              : item,
          )
        : [...inventoryItems, nextItem],
    );
  }

  async function loadSupplierTags() {
    const result = await listInventorySupplierTagsAction();

    if (result.ok) {
      setSupplierTags(result.data);
    }
  }

  function rememberSupplierTag(name: string) {
    setSupplierTags((current) => mergeInventorySupplierTags(current, name));
  }

  function beginMovement(type: MovementDraft["type"], itemContextMenu: ItemContextMenu | null) {
    if (!itemContextMenu) {
      return;
    }

    setMovementDraft({
      type,
      qty: type === "ajuste" ? String(itemContextMenu.stockItem.stock) : "1",
      note: "",
      supplierName: "",
      invoiceReference: "",
      purchaseDate: new Date().toISOString().slice(0, 10),
      reasonCode: defaultReasonCodeForMovementType(type),
      unitCost: "",
      totalCost: "",
      entryCostAnchor: "unit",
      context: itemContextMenu,
    });
    if (type === "entrada") {
      void loadSupplierTags();
    }
    setStockError("");
  }

  function openItemHistory(itemContextMenu: ItemContextMenu | null) {
    if (!itemContextMenu || !warehouseId) {
      return;
    }

    setItemHistoryContext(itemContextMenu);
  }

  async function submitMovement() {
    if (!movementDraft) {
      return;
    }

    if (!warehouseId) {
      setStockError("Bodega no lista");
      return;
    }

    const qty = Number(movementDraft.qty);

    if (
      !Number.isFinite(qty) ||
      qty < 0 ||
      (movementDraft.type !== "ajuste" && qty === 0)
    ) {
      setStockError("Cantidad invalida");
      return;
    }

    if (
      movementDraft.type === "salida" &&
      qty >
        Math.max(
          0,
          Number(movementDraft.context.stockItem.stock) -
            Number(movementDraft.context.stockItem.reserved || 0),
        )
    ) {
      setStockError("No puedes sacar mas unidades de las disponibles");
      return;
    }

    setStockSaving(true);
    setStockError("");

    const resolvedCost =
      movementDraft.type === "entrada"
        ? resolveEntryCostForSubmit({
            qty,
            unitCost: movementDraft.unitCost,
            totalCost: movementDraft.totalCost,
          })
        : { ok: true as const, unitCost: null, totalCost: null };

    if (!resolvedCost.ok) {
      setStockSaving(false);
      setStockError(resolvedCost.error);
      notify.error(resolvedCost.error);
      return;
    }

    const result = await recordInventoryMovementForLeafAction({
      warehouseId,
      category: movementDraft.context.categoryName,
      kind: movementDraft.context.treeItem.name,
      subcategory: movementDraft.context.subcategoryName,
      itemName: movementDraft.context.treeItem.name,
      type: movementDraft.type,
      qty,
      note: movementDraft.note,
      supplierName: movementDraft.type === "entrada" ? movementDraft.supplierName : undefined,
      invoiceReference:
        movementDraft.type === "entrada" ? movementDraft.invoiceReference : undefined,
      purchaseDate:
        movementDraft.type === "entrada" ? movementDraft.purchaseDate : undefined,
      reasonCode: normalizeReasonCodeForMovementType(
        movementDraft.type,
        movementDraft.reasonCode,
      ),
      minStock: movementDraft.context.stockItem.minStock,
      unitCost: resolvedCost.unitCost,
      totalCost: resolvedCost.totalCost,
    });

    setStockSaving(false);

    if (!result.ok) {
      setStockError(result.error);
      notify.error(result.error);
      return;
    }

    const movementType = movementDraft.type;
    const savedSupplierName =
      movementDraft.type === "entrada" ? movementDraft.supplierName : "";

    upsertInventoryStockItem(result.data.item);
    onMovementRecorded?.(result.data.movement);
    setMovementDraft(null);

    if (savedSupplierName?.trim()) {
      rememberSupplierTag(savedSupplierName);
    }

    const movementLabels: Record<MovementDraft["type"], string> = {
      entrada: "Entrada registrada",
      salida: "Salida registrada",
      ajuste: "Ajuste registrado",
    };
    notify.success(movementLabels[movementType]);
  }

  return {
    movementDraft,
    setMovementDraft,
    supplierTags,
    stockSaving,
    stockError,
    setStockError,
    itemHistoryContext,
    setItemHistoryContext,
    beginMovement,
    openItemHistory,
    submitMovement,
    rememberSupplierTag,
  };
}
