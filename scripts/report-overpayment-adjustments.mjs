/**
 * Read-only report: shipments where logistics_plan.billing suggests quotedTotal
 * was raised during a driver collection (FIN-004 historical scan).
 * Does NOT mutate data.
 *
 * Usage: node scripts/report-overpayment-adjustments.mjs
 */
import { connectPg } from "./lib/db-connection.mjs";

const { client, label } = await connectPg();
console.log(`Overpayment adjustment report on ${label}`);

try {
  const result = await client.query(`
    select
      shipment.id,
      shipment.code,
      shipment.organization_id,
      shipment.paid,
      shipment.logistics_plan #>> '{billing,quotedTotal}' as quoted_total,
      shipment.logistics_plan #>> '{billing,lastDriverCollection,totalBefore}' as total_before,
      shipment.logistics_plan #>> '{billing,lastDriverCollection,totalAfter}' as total_after,
      shipment.logistics_plan #>> '{billing,lastDriverCollection,receivedAmount}' as received_amount,
      shipment.created_at
    from public.shipments shipment
    where shipment.logistics_plan ? 'billing'
      and coalesce(shipment.logistics_plan #>> '{billing,lastDriverCollection,totalAfter}', '') <> ''
      and coalesce(shipment.logistics_plan #>> '{billing,lastDriverCollection,totalBefore}', '') <> ''
      and nullif(regexp_replace(coalesce(shipment.logistics_plan #>> '{billing,lastDriverCollection,totalAfter}', ''), '[^0-9.-]', '', 'g'), '')::numeric
        > nullif(regexp_replace(coalesce(shipment.logistics_plan #>> '{billing,lastDriverCollection,totalBefore}', ''), '[^0-9.-]', '', 'g'), '')::numeric
    order by shipment.created_at desc
    limit 200
  `);

  console.log(`Found ${result.rowCount} shipments with totalAfter > totalBefore in lastDriverCollection`);
  for (const row of result.rows) {
    console.log(JSON.stringify(row));
  }
  console.log("No data was modified. Review administratively before any correction migration.");
} finally {
  await client.end();
}
