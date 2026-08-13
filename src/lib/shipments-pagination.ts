/** Default page size for shipment list reads (envíos, board bootstrap, etc.). */
export const SHIPMENTS_PAGE_SIZE = 50;

/** Hard cap for listShipmentsAction / listShipmentsForRouteBoardAction. */
export const SHIPMENTS_MAX_PAGE_SIZE = 200;
const SHIPMENTS_OPERATIONAL_BOARD_REQUEST = 200;

/**
 * Operational board reads (logística) that need a wider window than a UI page
 * but must stay bounded.
 */
export const SHIPMENTS_BOARD_LIMIT = Math.min(
  SHIPMENTS_OPERATIONAL_BOARD_REQUEST,
  SHIPMENTS_MAX_PAGE_SIZE,
);

export function clampShipmentsLimit(limit?: number, max = SHIPMENTS_MAX_PAGE_SIZE): number {
  return Math.min(Math.max(limit ?? SHIPMENTS_PAGE_SIZE, 1), max);
}

export function clampShipmentsOffset(offset?: number): number {
  return Math.max(offset ?? 0, 0);
}
