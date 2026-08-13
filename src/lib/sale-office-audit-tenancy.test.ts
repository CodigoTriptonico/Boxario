import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

const saleCommandMigration = readFileSync(
  new URL("../../supabase/migrations/132_atomic_sales_tracking_and_authoritative_writes.sql", import.meta.url),
  "utf8",
);
const tenantRepairMigration = readFileSync(
  new URL("../../supabase/migrations/189_repair_missing_business_tenants.sql", import.meta.url),
  "utf8",
);

describe("office sale audit tenancy", () => {
  it("repairs a missing matrix tenant required by the atomic sale audit", () => {
    assert.match(
      saleCommandMigration,
      /insert into public\.security_audit_events\([\s\S]*?v_actor_id, v_tenant_id, v_org_id/,
    );
    assert.match(tenantRepairMigration, /insert into public\.business_tenants/);
    assert.match(tenantRepairMigration, /tenant\.id is null/);
    assert.match(tenantRepairMigration, /organization\.matrix_organization_id = organization\.id/);
  });
});
