/**
 * Borra envíos/invoices, rutas logísticas e historial de actividad.
 * Conserva: remitentes, destinatarios, inventario, precios y configuración.
 *
 * Uso: node scripts/clear-sales-history.mjs
 * Opcional: SCGS_ORG_ID=<uuid> para una sola org (si no, resuelve la org SCGS por slug)
 * Opcional: CLEAR_ALL_ORGS=1 para todas las orgs
 */
import { connectPg, loadEnvLocal } from "./lib/db-connection.mjs";
import { resolveScgsOrgId } from "./lib/scgs-demo-recipients.mjs";

const TARGET_ORG_ID = process.env.SCGS_ORG_ID?.trim() || "";
const CLEAR_ALL_ORGS = process.env.CLEAR_ALL_ORGS === "1";

async function count(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return Number(rows[0]?.count ?? 0);
}

async function tableExists(client, table) {
  const { rows } = await client.query(
    `
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = $1
    limit 1
    `,
    [table],
  );
  return rows.length > 0;
}

async function withDisabledTriggers(client, statements, work) {
  for (const statement of statements) {
    await client.query(statement.disable);
  }
  try {
    return await work();
  } finally {
    for (const statement of [...statements].reverse()) {
      await client.query(statement.enable);
    }
  }
}

async function deleteByOrg(client, table, orgId) {
  if (!(await tableExists(client, table))) {
    return "skip (missing)";
  }
  const result = await client.query(`delete from public.${table} where organization_id = $1`, [orgId]);
  return result.rowCount ?? 0;
}

async function deleteByShipmentOrg(client, table, orgId, extraOrgColumns = []) {
  if (!(await tableExists(client, table))) {
    return "skip (missing)";
  }

  const orgPredicates = [
    `shipment_id in (select id from public.shipments where organization_id = $1)`,
    ...extraOrgColumns.map((column) => `${column} = $1`),
  ];

  const result = await client.query(
    `delete from public.${table} where ${orgPredicates.join(" or ")}`,
    [orgId],
  );
  return result.rowCount ?? 0;
}

async function clearOrgSalesHistory(client, orgId) {
  const deleted = {};

  // Finance rows without organization_id — RESTRICT children of shipments/packages.
  deleted.financial_holds = await deleteByShipmentOrg(client, "financial_holds", orgId, [
    "agency_organization_id",
    "matrix_organization_id",
  ]);
  deleted.agency_charges = await deleteByShipmentOrg(client, "agency_charges", orgId, [
    "agency_organization_id",
    "matrix_organization_id",
  ]);
  deleted.sales = await deleteByShipmentOrg(client, "sales", orgId, [
    "selling_organization_id",
    "agency_organization_id",
    "matrix_organization_id",
  ]);

  // Immutable custody facts — disable delete guards only for this admin wipe.
  deleted.package_custody_events = await withDisabledTriggers(
    client,
    [
      {
        disable:
          "alter table public.package_custody_events disable trigger package_custody_events_immutable",
        enable:
          "alter table public.package_custody_events enable trigger package_custody_events_immutable",
      },
    ],
    () => deleteByOrg(client, "package_custody_events", orgId),
  );
  deleted.package_custody_handoffs = await withDisabledTriggers(
    client,
    [
      {
        disable:
          "alter table public.package_custody_handoffs disable trigger package_custody_handoffs_immutable",
        enable:
          "alter table public.package_custody_handoffs enable trigger package_custody_handoffs_immutable",
      },
    ],
    () => deleteByOrg(client, "package_custody_handoffs", orgId),
  );

  // Idempotencia de ventas: referencia shipments con on delete restrict.
  deleted.shipment_sale_operations = await withDisabledTriggers(
    client,
    [
      {
        disable:
          "alter table public.shipment_sale_operations disable trigger shipment_sale_operations_immutable",
        enable:
          "alter table public.shipment_sale_operations enable trigger shipment_sale_operations_immutable",
      },
    ],
    () => deleteByOrg(client, "shipment_sale_operations", orgId),
  );

  // Hijos de envíos / rutas antes de borrar shipments y logistics_routes.
  for (const table of [
    "shipment_payments",
    "shipment_contact_logs",
    "shipment_logistics_task_attempts",
    "shipment_logistics_tasks",
    "shipment_packages",
    "inventory_sale_reservations",
    "agency_box_allocations",
    "agency_shipment_box_sources",
    "customer_route_assignment_requests",
    "operational_exceptions",
    "logistics_truck_inventory_events",
    "logistics_route_location_samples",
    "logistics_route_live_locations",
    "logistics_route_stops",
    "warehouse_intake_sessions",
    "logistics_routes",
    "shipments",
    "activity_history",
    "organization_invoice_counters",
  ]) {
    deleted[table] = await deleteByOrg(client, table, orgId);
  }

  return deleted;
}

async function main() {
  loadEnvLocal();
  const { client, label } = await connectPg();
  console.log("Conectado a", label);

  let orgs;
  if (CLEAR_ALL_ORGS) {
    const { rows } = await client.query(
      "select id, name, slug from public.organizations order by created_at asc",
    );
    orgs = rows;
  } else if (TARGET_ORG_ID) {
    const { rows } = await client.query(
      "select id, name, slug from public.organizations where id = $1",
      [TARGET_ORG_ID],
    );
    orgs = rows;
  } else {
    const org = await resolveScgsOrgId(client);
    const { rows } = await client.query(
      "select id, name, slug from public.organizations where id = $1",
      [org.id],
    );
    orgs = rows;
  }

  if (!orgs.length) {
    console.error(TARGET_ORG_ID ? `No existe la org ${TARGET_ORG_ID}` : "No hay organizaciones");
    process.exit(1);
  }

  const snapshot = async (orgId) => ({
    shipments: await count(
      client,
      "select count(*)::int as count from public.shipments where organization_id = $1",
      [orgId],
    ),
    packages: await count(
      client,
      "select count(*)::int as count from public.shipment_packages where organization_id = $1",
      [orgId],
    ),
    custodyEvents: await count(
      client,
      "select count(*)::int as count from public.package_custody_events where organization_id = $1",
      [orgId],
    ),
    routes: await count(
      client,
      "select count(*)::int as count from public.logistics_routes where organization_id = $1",
      [orgId],
    ),
    history: await count(
      client,
      "select count(*)::int as count from public.activity_history where organization_id = $1",
      [orgId],
    ),
    customers: await count(
      client,
      "select count(*)::int as count from public.customers where organization_id = $1",
      [orgId],
    ),
    recipients: await count(
      client,
      "select count(*)::int as count from public.customer_recipients where organization_id = $1",
      [orgId],
    ),
    inventoryItems: await count(
      client,
      "select count(*)::int as count from public.inventory_items where organization_id = $1",
      [orgId],
    ),
    pricingCountries: await count(
      client,
      "select count(*)::int as count from public.pricing_countries where organization_id = $1",
      [orgId],
    ),
  });

  await client.query("begin");

  try {
    for (const org of orgs) {
      const before = await snapshot(org.id);
      console.log(`\n${org.name} (${org.slug})`);
      console.log("  Antes:", before);

      const deleted = await clearOrgSalesHistory(client, org.id);
      console.log("  Borrado:", deleted);

      const after = await snapshot(org.id);
      console.log("  Después:", after);
    }

    await client.query("commit");
    console.log("\nListo. Remitentes, destinatarios, inventario y precios intactos.");
    console.log("El contador de invoices arranca de nuevo en INV-000001.");
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
