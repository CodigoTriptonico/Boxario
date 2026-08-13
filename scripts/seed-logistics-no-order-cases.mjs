/**
 * Agrega invoices demo donde el cliente ya tiene la caja, pero todavía no se
 * ha creado una orden de recoger o entregar.
 */
import { connectPg } from "./lib/db-connection.mjs";
import { resolveScgsOrgId } from "./lib/scgs-demo-recipients.mjs";

function isoDaysAgo(days, hour) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 15, 0, 0);
  return date.toISOString();
}

async function main() {
  const { client, label } = await connectPg();
  try {
    const org = await resolveScgsOrgId(client);
    const context = await client.query(
      `select p.id as owner_id, c.id as customer_id, r.id as recipient_id,
              c.first_name, c.last_name, c.street, c.house_number, c.city,
              c.state, c.postal_code, c.country, c.formatted_address,
              c.lat, c.lng
         from public.profiles p
         join public.roles role on role.id = p.role_id
         cross join lateral (
           select c.* from public.customers c
            where c.organization_id = $1
            order by c.created_at limit 3
         ) c
         join lateral (
           select r.* from public.customer_recipients r
            where r.customer_id = c.id
            order by r.created_at limit 1
         ) r on true
        where p.organization_id = $1 and p.is_active = true
        order by case when role.slug = 'administrador' then 0 else 1 end, p.created_at
        limit 3`,
      [org.id],
    );
    if (context.rows.length < 3) throw new Error("Se necesitan tres clientes con destinatario para los casos demo.");

    const tag = Date.now().toString().slice(-8);
    const cases = [
      { label: "Cliente tiene caja · sin orden · hoy", daysAgo: 0 },
      { label: "Cliente tiene caja · sin orden · ayer", daysAgo: 1 },
      { label: "Cliente tiene caja · sin orden · ayer", daysAgo: 1 },
    ];

    await client.query("begin");
    for (const [index, item] of cases.entries()) {
      const row = context.rows[index];
      const code = `INV-NO-ORDER-${tag}-${String(index + 1).padStart(2, "0")}`;
      const snapshot = {
        firstName: row.first_name,
        lastName: row.last_name,
        street: row.street,
        houseNumber: row.house_number,
        city: row.city,
        state: row.state,
        postalCode: row.postal_code,
        country: row.country,
        formattedAddress: row.formatted_address,
        lat: row.lat,
        lng: row.lng,
      };
      const createdAt = isoDaysAgo(item.daysAgo, 9 + index);
      const plan = {
        box: { label: "14x14x14", paid: "$50", cost: "$31" },
        boxCount: 1,
        emptyBox: { mode: "Cliente ya tiene caja vacía", driverTaskNeeded: false },
        fullBox: { mode: "Sin orden logística", driverTaskNeeded: false },
        billing: { quotedTotal: "$50", payNow: "$50", balanceDue: "$0" },
      };
      await client.query(
        `insert into public.shipments (
           organization_id, code, customer_id, recipient_id, recipient_snapshot,
           customer_name, country, carrier, paid, profit, status, created_by,
           sales_owner_id, sale_kind, invoice_status, accounting_status,
           delivery_notes, logistics_plan, created_at
         ) values ($1,$2,$3,$4,$5,$6,$7,'Demo',50,0,'Cliente tiene caja',$8,$8,'full',
                   'open','not_exportable',$9,$10,$11)`,
        [
          org.id,
          code,
          row.customer_id,
          row.recipient_id,
          JSON.stringify(snapshot),
          `${row.first_name} ${row.last_name}`,
          row.country || "USA",
          row.owner_id,
          item.label,
          JSON.stringify(plan),
          createdAt,
        ],
      );
    }
    await client.query("commit");
    console.log(`OK: ${label} · 3 invoices sin orden logística creados`);
    console.log(`- INV-NO-ORDER-${tag}-01 · hoy`);
    console.log(`- INV-NO-ORDER-${tag}-02 · ayer`);
    console.log(`- INV-NO-ORDER-${tag}-03 · ayer`);
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
