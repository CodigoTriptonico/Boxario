import type { InventoryStockItem } from "@/lib/inventory-stock";
import { formatInventoryAvailableLabel } from "@/lib/inventory-units";

export function formatInventoryStockStatusLine(
  item: Pick<InventoryStockItem, "stock" | "reserved" | "assigned">,
) {
  const parts = [`${item.stock} ${formatInventoryAvailableLabel(item.stock)}`];

  if (item.reserved > 0) {
    parts.push(`${item.reserved} reservadas`);
  }

  if (item.assigned > 0) {
    parts.push(`${item.assigned} asignadas`);
  }

  return parts.join(" · ");
}

export function sumOpenAssignmentQty(
  assignments: Array<{ qtyAssigned: number; status: string }>,
) {
  return assignments
    .filter((row) => row.status === "open")
    .reduce((total, row) => total + row.qtyAssigned, 0);
}
