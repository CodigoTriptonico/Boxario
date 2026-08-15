import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { describe, it } from "node:test";

const root = process.cwd();
const read = (...segments: string[]) => fs.readFileSync(path.join(root, ...segments), "utf8");

describe("invoice company code wiring", () => {
  it("allocates immutable matrix codes and repairs platform seller membership", () => {
    const migration = read("supabase", "migrations", "212_invoice_company_codes_and_platform_sellers.sql");
    const hardening = read("supabase", "migrations", "213_prevent_manual_invoice_company_codes.sql");

    assert.match(migration, /invoice_company_code bigint/);
    assert.match(migration, /organizations_invoice_company_code_unique/);
    assert.match(migration, /organization\.organization_type = 'matrix'/);
    assert.match(migration, /lower\(profile\.email\) = 'scgs@gmail\.com'/);
    assert.match(migration, /public\.platform_admins/);
    assert.match(migration, /not exists \(\s*select 1 from public\.shipments/);
    assert.match(migration, /platform_admins_sync_seller_code/);
    assert.match(hardening, /INVOICE_COMPANY_CODE_MANUAL_ASSIGNMENT/);
    assert.match(hardening, /INVOICE_COMPANY_CODE_IMMUTABLE/);
  });

  it("loads the company code for server allocation and every sale preview", () => {
    const pricing = read("src", "app", "actions", "pricing.ts");
    const bootstrap = read("src", "lib", "sale", "bootstrap.ts");
    const core = read("src", "components", "sale", "venta", "use-venta-core.tsx");
    const invoices = read("src", "components", "sale", "venta", "use-venta-invoices.ts");

    for (const source of [pricing, bootstrap]) {
      assert.match(source, /invoice_company_code/);
      assert.match(source, /codigo de invoice valido/);
    }
    assert.match(core, /companyCode/);
    assert.match(invoices, /companyCode/);
  });

  it("shows the read-only company code in the platform console", () => {
    const action = read("src", "app", "actions", "platform.ts");
    const consoleSource = read("src", "components", "platform", "platform-console.tsx");

    assert.match(action, /invoice_company_code/);
    assert.match(consoleSource, /Código de invoice/);
    assert.match(consoleSource, /padStart\(3, "0"\)/);
  });
});
