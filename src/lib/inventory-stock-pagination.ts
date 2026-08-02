/**
 * Default page size for warehouse `inventory_stock` listings (server-side).
 *
 * Larger than envíos shipment pages (50) because Inventario keeps the category
 * tree client-side for structure editing and paginates only stock rows (counts,
 * reserved/assigned/unavailable, and signed photo URLs). Fewer round-trips keep
 * category browsing usable when a bodega has many articles.
 */
export const INVENTORY_STOCK_PAGE_SIZE = 100;

export type WarehouseInventoryStockQuery = {
  limit?: number;
  offset?: number;
  search?: string;
  /** Prefer UUID from `inventory_categories.id` when known. */
  categoryId?: string;
  /** Resolved server-side when `categoryId` is omitted. */
  categoryName?: string;
  kind?: string;
  /**
   * Optional debug: when true, logs one compact count line
   * (`items` / `photoPaths`) for the current page. Off by default.
   */
  debugCounts?: boolean;
};

export function resolveInventoryStockPage(
  options?: WarehouseInventoryStockQuery,
): { limit: number; offset: number } {
  const limit = Math.min(
    Math.max(options?.limit ?? INVENTORY_STOCK_PAGE_SIZE, 1),
    500,
  );
  const offset = Math.max(options?.offset ?? 0, 0);
  return { limit, offset };
}
