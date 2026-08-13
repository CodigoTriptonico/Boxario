/**
 * Demo local: llena Estadísticas con un mes de actividad realista.
 * No borra datos existentes. Los registros usan el prefijo STAT-DEMO- y son
 * idempotentes para poder volver a ejecutar el seed sin duplicarlos.
 * Uso: node scripts/seed-statistics-month.mjs
 */
import { connectPg } from "./lib/db-connection.mjs";
import { resolveScgsOrgId } from "./lib/scgs-demo-recipients.mjs";

const PREFIX = "STAT-DEMO-";
const EMAIL_PREFIX = "statistics.month+";
const BOXES = [
  { label: "14x14x14", price: 50, cost: 31 },
  { label: "16x16x16", price: 65, cost: 39 },
  { label: "18x18x18", price: 85, cost: 52 },
];
const METHODS = ["card", "cash", "zelle", "venmo", "bank_transfer", "paypal"];
const STATUSES = [
  { shipment: "Entregado", task: "completed", taskType: "pickup_full_box", paid: 100 },
  { shipment: "Enviado", task: "completed", taskType: "pickup_full_box", paid: 65 },
  { shipment: "Pickup", task: "completed", taskType: "pickup_full_box", paid: 20 },
  { shipment: "En oficina", task: "completed", taskType: "deliver_empty_box", paid: 50 },
  { shipment: "Pendiente entrega caja vacia", task: "scheduled", taskType: "deliver_empty_box", paid: 20 },
  { shipment: "Pendiente recoleccion caja llena", task: "pending", taskType: "pickup_full_box", paid: 50 },
];

function dateAt(daysAgo, hour, minute = 0) {
  const value = new Date();
  value.setDate(value.getDate() - daysAgo);
  value.setHours(hour, minute, 0, 0);
  return value;
}

function iso(value) {
  return value.toISOString();
}

function planFor(box, boxCount, paid, taskType) {
  const total = box.price * boxCount;
  const pending = Math.max(total - paid, 0);
  const isDelivery = taskType === "deliver_empty_box";
  const line = {
    label: box.label,
    quantity: boxCount,
    unitPrice: `$${box.price}`,
    unitCost: `$${box.cost}`,
    catalogKey: `cajas|${box.label.toLowerCase()}|`,
    time: "3-5 dias",
    carrier: "",
  };
  return {
    box: { label: box.label, paid: `$${box.price}`, cost: `$${box.cost}`, time: "3-5 dias", carrier: "" },
    boxCount,
    boxLines: [{ ...line, paid: `$${box.price}`, cost: `$${box.cost}` }],
    billing: {
      quotedTotal: `$${total}`,
      payNow: `$${paid}`,
      balanceDue: `$${pending}`,
      boxSubtotal: `$${total}`,
      boxUnitPrice: `$${box.price}`,
      boxCount,
      cartLines: [line],
      fullBoxPickup: "$0",
      emptyBoxDelivery: "$0",
      logisticsSubtotal: "$0",
      minimumDeposit: "$20",
      logisticsFeeMode: "per_trip",
      promotionDiscount: "$0",
    },
    emptyBox: {
      mode: isDelivery ? "Entregar caja vacia a domicilio" : "Cliente recoge caja vacia en oficina",
      label: "empty_box",
      driverTaskType: isDelivery ? "deliver_empty_box" : null,
      driverTaskNeeded: isDelivery,
      scheduleMode: isDelivery ? "scheduled" : null,
    },
    fullBox: {
      mode: "Recoger caja llena a domicilio",
      label: "full_box",
      driverTaskType: "pickup_full_box",
      driverTaskNeeded: true,
      deferred: false,
      scheduleMode: "scheduled",
    },
    summary: isDelivery
      ? "Caja vacia: entrega a domicilio | Caja llena: recoleccion programada"
      : "Caja vacia: entregada en oficina | Caja llena: recoleccion programada",
  };
}

async function loadContext(client, orgId) {
  const owner = await client.query(
    `select p.id
       from public.profiles p
       join public.roles r on r.id = p.role_id
      where p.organization_id = $1 and p.is_active = true
      order by case when r.slug = 'administrador' then 0 else 1 end, p.created_at
      limit 1`,
    [orgId],
  );
  if (!owner.rowCount) throw new Error("No hay usuario activo en la organizacion demo.");

  const country = await client.query(
    `select id, name from public.pricing_countries
      where organization_id = $1
      order by sort_order, created_at
      limit 1`,
    [orgId],
  );
  if (!country.rowCount) throw new Error("No hay pais configurado para crear destinatarios demo.");

  const warehouse = await client.query(
    `select id from public.warehouses where organization_id = $1
      order by is_default desc, created_at limit 1`,
    [orgId],
  );

  return {
    ownerId: owner.rows[0].id,
    countryId: country.rows[0].id,
    countryName: country.rows[0].name,
    warehouseId: warehouse.rows[0]?.id ?? null,
  };
}

async function ensureCustomer(client, orgId, context, index) {
  const existing = await client.query(
    `select id from public.customers where organization_id = $1 and email = $2 limit 1`,
    [orgId, `${EMAIL_PREFIX}${index}@boxario.test`],
  );
  if (existing.rowCount) {
    const recipient = await client.query(
      `select id, first_name, last_name, phone, country, street, house_number,
              neighborhood, city, state, postal_code, lat, lng
         from public.customer_recipients where customer_id = $1
         order by created_at limit 1`,
      [existing.rows[0].id],
    );
    return { customerId: existing.rows[0].id, recipient: recipient.rows[0] };
  }

  const firstNames = ["Sofia", "Mateo", "Valeria", "Diego", "Camila", "Andres", "Natalia", "Bruno", "Lucia", "Gabriel"];
  const lastNames = ["Ramirez", "Torres", "Mendoza", "Castillo", "Vega", "Navarro", "Ortega", "Santos", "Rivera", "Cruz"];
  const streets = ["McBean Pkwy", "Bouquet Canyon Rd", "Soledad Canyon Rd", "Lyons Ave", "Sierra Hwy", "Copper Hill Dr", "Valencia Blvd", "Plum Canyon Rd"];
  const cities = ["Santa Clarita", "Valencia", "Canyon Country", "Saugus"];
  const zips = ["91350", "91351", "91355", "91321", "91387"];
  const firstName = firstNames[(index - 1) % firstNames.length];
  const lastName = lastNames[(index * 3) % lastNames.length];
  const street = streets[(index - 1) % streets.length];
  const city = cities[(index - 1) % cities.length];
  const state = "CA";
  const postalCode = zips[(index - 1) % zips.length];
  const houseNumber = String(18000 + index * 137);
  const lat = 34.39 + ((index * 7) % 24) * 0.003;
  const lng = -118.60 + ((index * 11) % 24) * 0.004;
  const phone = `(661) 555-${String(1000 + index).slice(-4)}`;
  const formattedAddress = `${houseNumber} ${street}, ${city}, ${state} ${postalCode}, USA`;

  const customer = await client.query(
    `insert into public.customers (
       organization_id, first_name, last_name, phones, email, street, house_number,
       neighborhood, city, state, postal_code, country, place_id, formatted_address,
       lat, lng, geo_updated_at
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'USA',$12,$13,$14,$15,now())
     returning id`,
    [orgId, firstName, lastName, [phone], `${EMAIL_PREFIX}${index}@boxario.test`, street, houseNumber,
      "Demo", city, state, postalCode, `statistics-month-${index}`, formattedAddress, lat, lng],
  );
  const recipient = await client.query(
    `insert into public.customer_recipients (
       organization_id, customer_id, first_name, last_name, phone, country, country_id,
       street, house_number, neighborhood, city, state, postal_code, place_id,
       formatted_address, lat, lng, geo_updated_at
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,now())
     returning id, first_name, last_name, phone, country, street, house_number,
               neighborhood, city, state, postal_code, lat, lng`,
    [orgId, customer.rows[0].id, firstName, lastName, phone, context.countryName, context.countryId,
      street, houseNumber, "Demo", city, state, postalCode, `statistics-month-recipient-${index}`,
      formattedAddress, lat, lng],
  );
  return { customerId: customer.rows[0].id, recipient: recipient.rows[0] };
}

async function ensureShipment(client, orgId, context, index, customer, createdAt) {
  const code = `${PREFIX}${String(index).padStart(3, "0")}`;
  const existing = await client.query(
    `select id from public.shipments where organization_id = $1 and code = $2`,
    [orgId, code],
  );
  if (existing.rowCount) return { id: existing.rows[0].id, created: false, code };

  const scenario = STATUSES[index % STATUSES.length];
  const box = BOXES[index % BOXES.length];
  const boxCount = index % 9 === 0 ? 2 : 1;
  const total = box.price * boxCount;
  const paid = Math.min(scenario.paid + (index % 4 === 0 ? 15 : 0), total);
  const plan = planFor(box, boxCount, paid, scenario.taskType);
  const snapshot = {
    firstName: customer.recipient.first_name,
    lastName: customer.recipient.last_name,
    phone: customer.recipient.phone,
    country: customer.recipient.country,
    street: customer.recipient.street,
    houseNumber: customer.recipient.house_number,
    neighborhood: customer.recipient.neighborhood,
    city: customer.recipient.city,
    state: customer.recipient.state,
    postalCode: customer.recipient.postal_code,
    lat: customer.recipient.lat,
    lng: customer.recipient.lng,
    formattedAddress: `${customer.recipient.house_number} ${customer.recipient.street}, ${customer.recipient.city}, ${customer.recipient.state} ${customer.recipient.postal_code}, USA`,
  };
  const milestoneBase = new Date(createdAt);
  const deliveredAt = scenario.shipment === "Entregado" ? iso(new Date(milestoneBase.getTime() + 4 * 86_400_000)) : null;
  const shippedAt = ["Entregado", "Enviado"].includes(scenario.shipment)
    ? iso(new Date(milestoneBase.getTime() + 3 * 86_400_000)) : null;
  const officeAt = ["Entregado", "Enviado", "Pickup", "En oficina"].includes(scenario.shipment)
    ? iso(new Date(milestoneBase.getTime() + 2 * 86_400_000)) : null;

  const shipment = await client.query(
    `insert into public.shipments (
       organization_id, code, customer_id, recipient_id, recipient_snapshot, customer_name,
       country, carrier, paid, profit, status, assigned_to, created_by, sales_owner_id,
       sale_kind, invoice_status, accounting_status, finalized_at, empty_box_delivered_at,
       full_box_collected_at, office_received_at, departed_at, shipped_at, delivered_at,
       delivery_notes, logistics_plan, created_at
     ) values (
       $1,$2,$3,$4,$5,$6,'USA','Boxario Express',$7,$8,$9,null,$10,$10,
       'full',$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22
     ) returning id`,
    [orgId, code, customer.customerId, customer.recipient.id, JSON.stringify(snapshot),
      `${customer.recipient.first_name} ${customer.recipient.last_name}`, paid,
      Math.max(paid - box.cost * boxCount, 0), scenario.shipment, context.ownerId,
      paid >= total ? "paid" : "open", paid >= total ? "exportable" : "not_exportable",
      deliveredAt, officeAt, scenario.shipment === "Entregado" ? deliveredAt : null, officeAt,
      shippedAt ? iso(new Date(new Date(shippedAt).getTime() - 24 * 60 * 60 * 1000)) : null,
      shippedAt, deliveredAt,
      `${scenario.taskType === "deliver_empty_box" ? "Entrega" : "Recoleccion"} demo de ${customer.recipient.first_name}`,
      JSON.stringify(plan), iso(createdAt)],
  );

  return { id: shipment.rows[0].id, created: true, code, scenario, total, paid, createdAt };
}

async function ensureTask(client, orgId, context, shipment, customer, index, createdAt) {
  if (!shipment.created) {
    const existing = await client.query(
      `select id from public.shipment_logistics_tasks where shipment_id = $1 order by created_at limit 1`,
      [shipment.id],
    );
    return existing.rows[0]?.id ?? null;
  }
  const scenario = shipment.scenario;
  const taskAt = new Date(createdAt.getTime() + (index % 5) * 60 * 60 * 1000);
  const scheduledAt = scenario.task === "pending"
    ? new Date(Math.max(taskAt.getTime(), Date.now() - 2 * 86_400_000))
    : taskAt;
  const task = await client.query(
    `insert into public.shipment_logistics_tasks (
       organization_id, shipment_id, task_type, status, assigned_to, scheduled_at,
       requested_schedule_at, schedule_confirmation_status, schedule_kind, window_start_at,
       warehouse_id, notes, ordered_at, assigned_at, completed_at, created_at, updated_at
     ) values ($1,$2,$3,$4,null,$5,$5,'confirmed','exact',$5,$6,$7,$8,null,$9,$10,$10)
     returning id`,
    [orgId, shipment.id, scenario.taskType, scenario.task, iso(scheduledAt), context.warehouseId,
      `${scenario.taskType === "deliver_empty_box" ? "Entregar" : "Recoger"} caja · ${customer.recipient.city}`,
      scenario.task === "completed" ? iso(taskAt) : null,
      scenario.task === "completed" ? iso(taskAt) : null,
      iso(taskAt)],
  );
  return task.rows[0].id;
}

async function ensurePayment(client, orgId, context, shipment, index, createdAt) {
  if (!shipment.created || shipment.paid <= 0) return;
  const key = `${PREFIX}PAY-${String(index).padStart(3, "0")}`;
  const exists = await client.query(
    `select 1 from public.shipment_payments where organization_id = $1 and note = $2`,
    [orgId, key],
  );
  if (exists.rowCount) return;
  const firstAmount = Math.min(shipment.paid, index % 3 === 0 ? 20 : shipment.paid);
  await client.query(
    `insert into public.shipment_payments (
       organization_id, shipment_id, amount, method, kind, note, created_by, created_at
     ) values ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [orgId, shipment.id, firstAmount, METHODS[index % METHODS.length], firstAmount === shipment.paid ? "full" : "deposit", key, context.ownerId, iso(new Date(createdAt.getTime() + 2 * 60 * 60 * 1000))],
  );
  if (firstAmount < shipment.paid) {
    await client.query(
      `insert into public.shipment_payments (
         organization_id, shipment_id, amount, method, kind, note, created_by, created_at
       ) values ($1,$2,$3,$4,'balance',$5,$6,$7)`,
      [orgId, shipment.id, shipment.paid - firstAmount, METHODS[(index + 2) % METHODS.length], `${key}-BALANCE`, context.ownerId, iso(new Date(createdAt.getTime() + 22 * 60 * 60 * 1000))],
    );
  }
}

async function ensureRouteAndStops(client, orgId, context, routeDate, routeIndex, taskIds) {
  const name = `Demo · ${routeIndex === 0 ? "Valencia" : routeIndex === 1 ? "Canyon Country" : "Santa Clarita"}`;
  const existing = await client.query(
    `select id from public.logistics_routes where organization_id = $1 and route_date = $2 and name = $3 limit 1`,
    [orgId, routeDate, name],
  );
  if (existing.rowCount) return existing.rows[0].id;
  const route = await client.query(
    `insert into public.logistics_routes (
       organization_id, route_date, name, status, assigned_to, warehouse_id,
       zone_key, notes, created_by, created_at, updated_at
     ) values ($1,$2,$3,$4,null,$5,$6,$7,$8,now(),now())
     returning id`,
    [orgId, routeDate, name, routeIndex === 0 ? "completed" : routeIndex === 1 ? "planned" : "draft",
      context.warehouseId, name.toLowerCase().replaceAll(" ", "-"), "Ruta demo para Estadisticas", context.ownerId],
  );
  for (const [order, taskId] of taskIds.entries()) {
    await client.query(
      `insert into public.logistics_route_stops (
         organization_id, route_id, task_id, stop_order, address_snapshot, lat, lng, postal_code, city
       ) select $1,$2,$3,$4,coalesce(recipient_snapshot,'{}'::jsonb),
                nullif(recipient_snapshot->>'lat','')::double precision,
                nullif(recipient_snapshot->>'lng','')::double precision,
                coalesce(recipient_snapshot->>'postalCode',''),
                coalesce(recipient_snapshot->>'city','')
           from public.shipments where id = (select shipment_id from public.shipment_logistics_tasks where id = $3)`,
      [orgId, route.rows[0].id, taskId, order + 1],
    );
  }
  return route.rows[0].id;
}

async function main() {
  const { client, label } = await connectPg();
  try {
    const org = await resolveScgsOrgId(client);
    const context = await loadContext(client, org.id);
    await client.query("begin");

    const shipments = [];
    const taskIds = [];
    for (let index = 1; index <= 36; index += 1) {
      const daysAgo = Math.max(0, 30 - index);
      const createdAt = dateAt(daysAgo, 8 + (index % 9), (index * 7) % 60);
      const customer = await ensureCustomer(client, org.id, context, index);
      const shipment = await ensureShipment(client, org.id, context, index, customer, createdAt);
      const taskId = await ensureTask(client, org.id, context, shipment, customer, index, createdAt);
      await ensurePayment(client, org.id, context, shipment, index, createdAt);
      if (taskId) taskIds.push({ taskId, createdAt });
      shipments.push(shipment);
    }

    const routeDates = [dateAt(21, 10), dateAt(10, 10), dateAt(2, 10)].map((value) => value.toISOString().slice(0, 10));
    for (let index = 0; index < routeDates.length; index += 1) {
      const ids = taskIds.filter((row) => row.createdAt.toISOString().slice(0, 10) === routeDates[index]).map((row) => row.taskId).slice(0, 6);
      if (ids.length) await ensureRouteAndStops(client, org.id, context, routeDates[index], index, ids);
    }

    await client.query("commit");
    const counts = await client.query(
      `select
         (select count(*) from public.shipments where organization_id = $1 and code like $2) as shipments,
         (select count(*) from public.shipment_payments where organization_id = $1 and note like $2) as payments,
         (select count(*) from public.shipment_logistics_tasks task join public.shipments shipment on shipment.id = task.shipment_id where shipment.organization_id = $1 and shipment.code like $2) as tasks,
         (select count(*) from public.logistics_routes where organization_id = $1 and name like 'Demo · %') as routes`,
      [org.id, `${PREFIX}%`],
    );
    console.log(`OK: datos demo de Estadisticas cargados · ${label} · ${org.name}`);
    console.log(JSON.stringify(counts.rows[0]));
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
