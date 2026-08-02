import { readFileSync } from "node:fs";
import { join } from "node:path";

const INVENTORY_ACTION_FILES = [
  "inventory.ts",
  "inventory/read.ts",
  "inventory/catalog.ts",
  "inventory/movements.ts",
  "inventory/items.ts",
  "inventory/types.ts",
] as const;

const CUSTOMER_ROUTE_ASSIGNMENT_ACTION_FILES = [
  "customer-route-assignments.ts",
  "customer-route-assignments/shared.ts",
  "customer-route-assignments/request.ts",
  "customer-route-assignments/queries.ts",
  "customer-route-assignments/review.ts",
  "customer-route-assignments/types.ts",
] as const;

function readActionDomainSource(
  files: readonly string[],
  root: string,
) {
  return files
    .map((file) =>
      readFileSync(
        join(root, "src", "app", "actions", file),
        "utf8",
      ),
    )
    .join("\n");
}

export function readInventoryActionsSource(
  root = process.cwd(),
) {
  return readActionDomainSource(INVENTORY_ACTION_FILES, root);
}

export function readCustomerRouteAssignmentActionsSource(
  root = process.cwd(),
) {
  return readActionDomainSource(
    CUSTOMER_ROUTE_ASSIGNMENT_ACTION_FILES,
    root,
  );
}
