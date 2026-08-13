import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const page = readFileSync(join(root, "app/logistica/page.tsx"), "utf8");
const client = readFileSync(
  join(root, "components/logistica/logistica-client-implementation.tsx"),
  "utf8",
);
const dataHook = readFileSync(
  join(root, "components/logistica/lib/use-logistics-data.ts"),
  "utf8",
);
const workspace = readFileSync(
  join(root, "components/logistica/logistics-routes-workspace.tsx"),
  "utf8",
);

describe("logistics navigation count bootstrap", () => {
  it("renders pending counts from server data instead of flashing an initial zero", () => {
    assert.match(page, /listPendingCustomerRouteAssignmentRequestsAction\(\)/);
    assert.match(page, /initialPendingBookings=\{pendingBookingsResult\.ok/);
    assert.match(dataHook, /initialPendingBookings \|\| \[\]/);
    assert.match(client, /initialBookings=\{pendingBookings\}/);
    assert.match(
      workspace,
      /useState<CustomerRouteAssignmentRequestRow\[\]>\(initialBookings\)/,
    );
    assert.doesNotMatch(
      workspace,
      /useState<CustomerRouteAssignmentRequestRow\[\]>\(\[\]\)/,
    );
  });
});
