import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

const migration = readFileSync(resolve("supabase/migrations/193_statistics_dashboard_v1.sql"), "utf8");
const logisticsMigration = readFileSync(resolve("supabase/migrations/199_statistics_logistics_dashboard.sql"), "utf8");
const action = readFileSync(resolve("src/app/actions/statistics-dashboard.ts"), "utf8");

test("RPC deriva alcance de sesión y no acepta una organización del cliente", () => {
  assert.match(migration, /caller_org_id uuid := public\.current_organization_id\(\)/);
  assert.match(migration, /can_view_dashboard := public\.user_has_permission\('audit\.immutable\.view'\)/);
  assert.doesNotMatch(migration, /target_organization_id|organization_id uuid[\s\S]*requested_filters/);
  assert.match(migration, /organization\.tenant_id = caller_tenant_id/);
  assert.match(migration, /agency\.tenant_id = caller_tenant_id/);
});

test("RPC restringe SECURITY DEFINER y fechas operativas", () => {
  assert.match(migration, /security definer[\s\S]*set search_path = pg_catalog, public/);
  assert.match(migration, /revoke all on function public\.load_statistics_dashboard[\s\S]*from public/);
  assert.match(migration, /from anon/);
  assert.match(migration, /grant execute[\s\S]*to authenticated/);
  assert.match(migration, /at time zone 'America\/Los_Angeles'/);
  assert.match(migration, /> 366/);
});

test("finanzas no mezclan cobro, deuda de cliente y deuda de agencia", () => {
  assert.match(migration, /payment\.created_at >= period_start/);
  assert.match(migration, /greatest\(coalesce\(quoted_total, 0\) - paid, 0\)/);
  assert.match(migration, /'agencyReceivable'/);
  assert.match(migration, /'customerReceivable'/);
  assert.match(migration, /'unappliedAgencyPayments'/);
});

test("inventario no inventa valoración ni resta asignado dos veces", () => {
  assert.match(migration, /greatest\(stock-reserved,0\)/);
  assert.match(migration, /then coalesce\(sum\(stock\*avg_cost\),0\) else null end/);
});

test("la action usa un solo RPC scoped y no service role", () => {
  assert.match(action, /requireScopedActionContext\(\[[\s\S]*"audit\.immutable\.view"[\s\S]*"agency\.account\.view"/);
  assert.match(action, /\.rpc\("load_statistics_dashboard_v2"/);
  assert.doesNotMatch(action, /createSupabaseAdminClient|service_role/);
});

test("logistica usa resultados completados y conserva cantidades persistidas", () => {
  assert.match(logisticsMigration, /task\.status = 'completed'/);
  assert.match(logisticsMigration, /task\.completed_at >= period_start/);
  assert.match(logisticsMigration, /booking\.box_count/);
  assert.match(logisticsMigration, /shipment\.logistics_plan->'billing'->>'boxCount'/);
  assert.match(logisticsMigration, /stop\.postal_code, booking\.postal_code/);
  assert.match(logisticsMigration, /'postalCodes'/);
  assert.match(logisticsMigration, /'vehicles'/);
  assert.match(logisticsMigration, /'drivers'/);
});

test("v2 mantiene un solo contrato agregado y restringido", () => {
  assert.match(logisticsMigration, /base_dashboard := public\.load_statistics_dashboard/);
  assert.match(logisticsMigration, /security definer[\s\S]*set search_path = pg_catalog, public/);
  assert.match(logisticsMigration, /revoke all on function public\.load_statistics_dashboard_v2[\s\S]*from public/);
  assert.match(logisticsMigration, /from anon/);
  assert.match(logisticsMigration, /grant execute[\s\S]*to authenticated/);
});
