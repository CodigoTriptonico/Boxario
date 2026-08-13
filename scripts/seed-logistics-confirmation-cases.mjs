/**
 * Crea solicitudes demo en estado pendiente de aprobacion para revisar la
 * pestaña Por confirmar de Logistica.
 * No borra datos existentes y es idempotente por tarea.
 */
import { connectPg } from "./lib/db-connection.mjs";
import { resolveScgsOrgId } from "./lib/scgs-demo-recipients.mjs";
import { createHash } from "node:crypto";

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function nextDateForWeekday(base, weekday) {
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 12);
  const currentLogisticsWeekday = (date.getDay() + 6) % 7;
  const delta = (Number(weekday) - currentLogisticsWeekday + 7) % 7 || 7;
  date.setDate(date.getDate() + delta);
  return formatLocalDate(date);
}

// Keep this byte-for-byte compatible with normalizedAddressFingerprintSource
// in src/lib/logistics-route-coverage.ts. Demo requests must pass the same
// address-integrity check as requests created from the application.
function normalizeUsPostalCode(value) {
  const normalized = String(value || "").trim();
  return /^\d{5}$/.test(normalized) ? normalized : null;
}

function normalizedAddressPart(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");
}

function addressFingerprint(customer) {
  const postalCode = normalizeUsPostalCode(customer.postal_code) || "";
  const source = [
    normalizedAddressPart(customer.place_id),
    normalizedAddressPart(customer.formatted_address),
    normalizedAddressPart(customer.street),
    normalizedAddressPart(customer.house_number),
    normalizedAddressPart(customer.neighborhood),
    normalizedAddressPart(customer.city),
    normalizedAddressPart(customer.state),
    postalCode,
    normalizedAddressPart(customer.country || "USA"),
    customer.lat == null ? "" : Number(customer.lat).toFixed(6),
    customer.lng == null ? "" : Number(customer.lng).toFixed(6),
  ].join("|");
  return createHash("sha256").update(source).digest("hex");
}

async function main() {
  const { client, label } = await connectPg();
  try {
    const org = await resolveScgsOrgId(client);
    const owner = await client.query(
      `select p.id
         from public.profiles p
         join public.roles r on r.id = p.role_id
        where p.organization_id = $1 and p.is_active = true
        order by case when r.slug = 'administrador' then 0 else 1 end, p.created_at
        limit 1`,
      [org.id],
    );
    if (!owner.rowCount) throw new Error("No hay un usuario activo para crear solicitudes demo.");

    const schedule = await client.query(
      `select s.id as schedule_id, s.weekday, s.start_time, s.estimated_end_time,
              d.id as definition_id, d.name as definition_name, d.zone_name
         from public.logistics_route_schedules s
         join public.logistics_route_definitions d on d.id = s.route_definition_id
        where s.organization_id = $1 and s.is_active = true and d.status = 'active'
        order by case when s.weekday = 6 then 0 else 1 end, s.weekday, s.start_time
        limit 1`,
      [org.id],
    );
    if (!schedule.rowCount) throw new Error("No hay una subruta activa para las solicitudes demo.");

    const route = schedule.rows[0];
    const routeDate = nextDateForWeekday(new Date(), route.weekday);
    const cases = await client.query(
      `select s.id as shipment_id, s.code, s.customer_id, t.id as task_id,
              t.task_type, c.street, c.house_number, c.neighborhood,
              c.city, c.state, c.postal_code, c.country, c.formatted_address,
              c.place_id, c.lat, c.lng
         from public.shipments s
         join public.shipment_logistics_tasks t on t.shipment_id = s.id
         join public.customers c on c.id = s.customer_id
        where s.organization_id = $1
          and (s.code like 'INV-LOG-%-01' or s.code like 'INV-LOG-%-02' or s.code like 'INV-LOG-%-03')
        order by s.created_at desc, t.created_at
        limit 3`,
      [org.id],
    );
    if (cases.rowCount < 3) throw new Error("Se necesitan tres invoices demo con tareas de Logistica.");

    await client.query("begin");
    let created = 0;
    for (const [index, item] of cases.rows.entries()) {
      const existing = await client.query(
        `select id, status from public.customer_route_assignment_requests
          where organization_id = $1 and task_id = $2
            and status in ('pending_approval', 'template_confirmed', 'routed')
          limit 1`,
        [org.id, item.task_id],
      );
      const scheduledAt = new Date(`${routeDate}T${10 + index}:00:00Z`).toISOString();
      const fingerprint = addressFingerprint(item);
      if (existing.rowCount && existing.rows[0].status === "pending_approval") {
        await client.query(
          `update public.customer_route_assignment_requests
              set scheduled_at = $1, zone_key = $2, route_date = $3,
                  route_weekday = $4, route_name = $5, route_definition_id = $6,
                  route_schedule_id = $7, postal_code = $8,
                  address_fingerprint = $9, updated_at = now()
            where id = $10 and organization_id = $11`,
          [
            scheduledAt,
            route.zone_name || route.definition_name,
            routeDate,
            route.weekday,
            route.definition_name,
            route.definition_id,
            route.schedule_id,
            item.postal_code,
            fingerprint,
            existing.rows[0].id,
            org.id,
          ],
        );
      } else if (!existing.rowCount) {
        await client.query(
          `insert into public.customer_route_assignment_requests (
           organization_id, customer_id, shipment_id, task_id,
           route_template_id, scheduled_at, driver_id, zone_key, status,
           requested_by, review_note, route_date, route_weekday, route_name,
           route_id, route_definition_id, route_schedule_id, address_fingerprint,
           postal_code, box_count
         ) values ($1,$2,$3,$4,null,$5,null,$6,'pending_approval',$7,'',$8,$9,$10,
                   null,$11,$12,$13,$14,1)`,
          [
            org.id,
            item.customer_id,
            item.shipment_id,
            item.task_id,
            scheduledAt,
            route.zone_name || route.definition_name,
            owner.rows[0].id,
            routeDate,
            route.weekday,
            route.definition_name,
            route.definition_id,
            route.schedule_id,
            fingerprint,
            item.postal_code,
          ],
        );
      } else {
        continue;
      }
      await client.query(
        `update public.shipment_logistics_tasks
            set scheduled_at = $1,
                requested_schedule_at = $1,
                schedule_confirmation_status = 'pending',
                status = case when status = 'pending' then 'scheduled' else status end,
                updated_at = now()
          where organization_id = $2 and id = $3`,
        [scheduledAt, org.id, item.task_id],
      );
      created += 1;
      console.log(`- ${item.code} · ${item.task_type === "pickup_full_box" ? "Recoger" : "Entregar"} · pendiente`);
    }
    await client.query("commit");
    console.log(`OK: ${label} · ${created} solicitudes por confirmar para ${routeDate}`);
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
