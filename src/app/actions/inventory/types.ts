import type {
  InventoryAssignment,
  InventoryMovement,
} from "@/lib/inventory-types";
import type { InventoryStockItem } from "@/lib/inventory-stock";
import type { CategoryConfig } from "@/lib/inventory-tree";

type WarehouseInventoryStockPage = {
  limit: number;
  offset: number;
  hasMore: boolean;
};

export type WarehouseInventoryCorePayload = {
  categoryConfigs: CategoryConfig[];
  items: InventoryStockItem[];
  /** Present for paginated stock loads (default: first page of 100). */
  stockPage: WarehouseInventoryStockPage;
};

export type WarehouseInventoryHistoryPayload = {
  movements: InventoryMovement[];
  assignments: InventoryAssignment[];
};
