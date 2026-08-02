import { availableEmptyBoxStock } from "@/lib/inventory-empty-box-stock";
import { normalizeInventoryText } from "@/lib/inventory-tree";
import { stockLevelForItem, type StockLevel } from "@/lib/inventory-stock";

export type SaleBoxStockSnapshot = {
  available: number;
  minStock: number;
};

export type SaleBoxStockRow = {
  item_id: string;
  stock: number;
  reserved: number;
  min_stock?: number | null;
  inventory_items:
    | { id?: string; name: string; kind: string }
    | { id?: string; name: string; kind: string }[]
    | null;
};

const DEFAULT_MIN_STOCK = 2;

function readInventoryItem(row: SaleBoxStockRow) {
  const item = Array.isArray(row.inventory_items)
    ? row.inventory_items[0]
    : row.inventory_items;
  return item || null;
}

/** Agrupa stock disponible por medida/nombre de caja para el catálogo de venta. */
export function buildSaleBoxStockIndex(
  rows: ReadonlyArray<SaleBoxStockRow>,
): Record<string, SaleBoxStockSnapshot> {
  const byItem = new Map<
    string,
    SaleBoxStockSnapshot & { kind: string; name: string }
  >();

  for (const row of rows) {
    const item = readInventoryItem(row);
    if (!item) {
      continue;
    }

    const itemId = String(row.item_id || item.id || "").trim();
    if (!itemId) {
      continue;
    }

    const available = availableEmptyBoxStock(row);
    const minStock = Math.max(0, Number(row.min_stock ?? DEFAULT_MIN_STOCK) || DEFAULT_MIN_STOCK);
    const existing = byItem.get(itemId);

    if (existing) {
      existing.available += available;
      existing.minStock = Math.max(existing.minStock, minStock);
      continue;
    }

    byItem.set(itemId, {
      available,
      minStock,
      kind: item.kind || "",
      name: item.name || "",
    });
  }

  const index: Record<string, SaleBoxStockSnapshot> = {};

  for (const entry of byItem.values()) {
    const snapshot: SaleBoxStockSnapshot = {
      available: entry.available,
      minStock: entry.minStock,
    };

    for (const raw of [entry.kind, entry.name]) {
      const key = normalizeInventoryText(raw || "");
      if (!key) {
        continue;
      }

      const previous = index[key];
      if (!previous || snapshot.available > previous.available) {
        index[key] = snapshot;
      }
    }
  }

  return index;
}

export function lookupSaleBoxStock(
  boxLabel: string,
  stockByKey: Record<string, SaleBoxStockSnapshot> | null | undefined,
): SaleBoxStockSnapshot {
  const key = normalizeInventoryText(boxLabel || "");
  if (!key || !stockByKey) {
    return { available: 0, minStock: DEFAULT_MIN_STOCK };
  }

  return stockByKey[key] ?? { available: 0, minStock: DEFAULT_MIN_STOCK };
}

export function saleBoxStockLevel(snapshot: SaleBoxStockSnapshot): StockLevel {
  return stockLevelForItem({
    stock: snapshot.available,
    minStock: snapshot.minStock,
  });
}

export function saleBoxStockTitle(snapshot: SaleBoxStockSnapshot) {
  if (snapshot.available <= 0) {
    return "Sin stock en bodega (puedes vender igual)";
  }

  if (snapshot.available <= snapshot.minStock) {
    return `Stock bajo: ${snapshot.available} disponible${snapshot.available === 1 ? "" : "s"}`;
  }

  return `${snapshot.available} disponible${snapshot.available === 1 ? "" : "s"}`;
}
