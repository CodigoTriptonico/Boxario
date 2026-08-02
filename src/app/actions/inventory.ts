/**
 * Public inventory action contract.
 *
 * Implementations are grouped by responsibility in `inventory/*`; callers
 * continue importing this stable façade.
 */
export {
  loadWarehouseInventoryCoreAction,
  loadWarehouseInventoryHistoryAction,
} from "@/app/actions/inventory/read";
export {
  ensureInventoryLeafItemAction,
  saveWarehouseInventoryAction,
} from "@/app/actions/inventory/catalog";
export {
  listInventorySupplierTagsAction,
  recordInventoryMovementForLeafAction,
} from "@/app/actions/inventory/movements";
export {
  clearInventoryItemPhotoAction,
  updateInventoryItemMetadataAction,
  updateInventoryItemUnitAction,
  uploadInventoryItemPhotoAction,
} from "@/app/actions/inventory/items";
