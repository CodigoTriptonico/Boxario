import assert from "node:assert/strict";
import { connectPg } from "./lib/db-connection.mjs";

const { client, label } = await connectPg();

async function loadAs(userId) {
  await client.query("begin");
  try {
    await client.query("set local role authenticated");
    await client.query("select set_config($1, $2, true)", ["request.jwt.claim.sub", userId]);
    const result = await client.query(
      "select public.load_statistics_dashboard_v2($1, $2, $3, $4, $5::jsonb) as dashboard",
      ["2026-01-01", "2026-12-31", "2025-01-01", "2025-12-31", "{}"],
    );
    return result.rows[0].dashboard;
  } finally {
    await client.query("rollback");
  }
}

const profiles = await client.query(`
  select profile.id, role.slug
  from public.profiles profile
  join public.roles role on role.id = profile.role_id
  where profile.is_active = true and profile.archived_at is null
`);

const admin = profiles.rows.find((row) => row.slug === "administrador");
assert.ok(admin, "Se requiere un administrador local para verificar Estadísticas");
const adminDashboard = await loadAs(admin.id);
assert.equal(adminDashboard.capabilities.finance, true);
assert.equal(adminDashboard.capabilities.logistics, true);
assert.equal(adminDashboard.capabilities.inventory, true);
assert.ok(adminDashboard.logisticsAnalytics);
assert.ok(Array.isArray(adminDashboard.logisticsAnalytics.daily));
assert.ok(Array.isArray(adminDashboard.logisticsAnalytics.rankings.postalCodes));
assert.ok(Array.isArray(adminDashboard.logisticsAnalytics.rankings.routes));
assert.ok(Array.isArray(adminDashboard.logisticsAnalytics.rankings.vehicles));
assert.ok(Array.isArray(adminDashboard.logisticsAnalytics.rankings.drivers));

const seller = profiles.rows.find((row) => row.slug === "vendedor");
if (seller) {
  const sellerDashboard = await loadAs(seller.id);
  assert.equal(sellerDashboard.capabilities.finance, true);
  const returnedIds = sellerDashboard.tables.shipments.map((row) => row.id);
  if (returnedIds.length) {
    const scope = await client.query(
      "select count(*)::integer as invalid from public.shipments where id = any($1::uuid[]) and sales_owner_id is distinct from $2",
      [returnedIds, seller.id],
    );
    assert.equal(scope.rows[0].invalid, 0, "El vendedor recibió envíos fuera de su cartera");
  }
}

const driver = profiles.rows.find((row) => row.slug === "conductor");
if (driver) {
  const driverDashboard = await loadAs(driver.id);
  assert.equal(driverDashboard.capabilities.finance, false);
  assert.equal(driverDashboard.finance.collected, 0);
  assert.equal(driverDashboard.tables.payments.length, 0);
}

await client.end();
console.log(`Statistics security checks passed against ${label}.`);
