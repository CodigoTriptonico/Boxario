import { connectPg } from "./lib/db-connection.mjs";

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

async function hasColumn(client, table, column) {
  const { rows } = await client.query(
    `
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = $1
      and column_name = $2
    limit 1
    `,
    [table, column],
  );
  return rows.length > 0;
}

async function withDisabledTriggers(client, statements, work) {
  for (const statement of statements) {
    try {
      await client.query(statement.disable);
    } catch {
      // Ignore if trigger doesn't exist
    }
  }
  try {
    return await work();
  } finally {
    for (const statement of [...statements].reverse()) {
      try {
        await client.query(statement.enable);
      } catch {
        // Ignore if trigger doesn't exist
      }
    }
  }
}

export async function deleteAllTrackingShipments() {
  const { client } = await connectPg();
  try {
    console.log("Iniciando eliminación de envíos/inbounds en seguimiento...");

    const beforeShipments = await client.query("select count(*)::int from public.shipments");
    const beforeCustomers = await client.query("select count(*)::int from public.customers");
    const beforeRecipients = await client.query("select count(*)::int from public.customer_recipients");

    console.log(`Conteo inicial: Envíos=${beforeShipments.rows[0].count}, Remitentes=${beforeCustomers.rows[0].count}, Destinatarios=${beforeRecipients.rows[0].count}`);

    // Disable immutable triggers if present
    await withDisabledTriggers(
      client,
      [
        {
          disable: "alter table public.package_custody_events disable trigger package_custody_events_immutable",
          enable: "alter table public.package_custody_events enable trigger package_custody_events_immutable",
        },
        {
          disable: "alter table public.package_custody_handoffs disable trigger package_custody_handoffs_immutable",
          enable: "alter table public.package_custody_handoffs enable trigger package_custody_handoffs_immutable",
        },
        {
          disable: "alter table public.shipment_sale_operations disable trigger shipment_sale_operations_immutable",
          enable: "alter table public.shipment_sale_operations enable trigger shipment_sale_operations_immutable",
        },
        {
          disable: "alter table public.shipment_journal_entries disable trigger shipment_journal_entries_immutable",
          enable: "alter table public.shipment_journal_entries enable trigger shipment_journal_entries_immutable",
        },
      ],
      async () => {
        const dependentTablesWithShipmentId = [
          "package_custody_events",
          "package_custody_handoffs",
          "shipment_sale_operations",
          "shipment_journal_entries",
          "shipment_payments",
          "shipment_contact_logs",
          "shipment_logistics_task_attempts",
          "shipment_logistics_tasks",
          "shipment_packages",
          "inventory_sale_reservations",
          "agency_box_allocations",
          "agency_shipment_box_sources",
          "agency_charges",
          "agency_service_request_lines",
          "agency_service_requests",
          "agency_box_lots",
          "agency_visits",
          "customer_route_assignment_requests",
          "customer_route_verifications",
          "distribution_partner_ledger",
          "financial_holds",
          "operational_exceptions",
          "logistics_truck_inventory_events",
          "sales",
        ];

        for (const table of dependentTablesWithShipmentId) {
          if (await tableExists(client, table)) {
            if (await hasColumn(client, table, "shipment_id")) {
              const res = await client.query(`delete from public.${table} where shipment_id is not null`);
              console.log(`Eliminados ${res.rowCount ?? 0} registros de ${table}`);
            }
          }
        }

        // Delete all shipments
        const deleteShipmentsResult = await client.query("delete from public.shipments");
        console.log(`Eliminados ${deleteShipmentsResult.rowCount ?? 0} envíos de public.shipments`);
      }
    );

    const afterShipments = await client.query("select count(*)::int from public.shipments");
    const afterCustomers = await client.query("select count(*)::int from public.customers");
    const afterRecipients = await client.query("select count(*)::int from public.customer_recipients");

    console.log(`Conteo final: Envíos=${afterShipments.rows[0].count}, Remitentes=${afterCustomers.rows[0].count}, Destinatarios=${afterRecipients.rows[0].count}`);

    if (beforeCustomers.rows[0].count === afterCustomers.rows[0].count && beforeRecipients.rows[0].count === afterRecipients.rows[0].count) {
      console.log("ÉXITO: Se eliminaron los envíos/inbounds en seguimiento manteniendo intactos remitentes y destinatarios.");
    } else {
      console.warn("ADVERTENCIA: Hubo un cambio inesperado en remitentes o destinatarios.");
    }
  } finally {
    await client.end();
  }
}

if (process.argv[1]?.endsWith("delete-tracking-shipments.mjs")) {
  deleteAllTrackingShipments().catch((err) => {
    console.error("Error al eliminar envíos:", err);
    process.exit(1);
  });
}
