/**
 * Demo local: 30 invoices para Logistica, todos con operacion a domicilio
 * y sin ruta seleccionada. El catalogo semanal debe crear las rutas antes
 * de que una tarea pueda asignarse a un recorrido operativo.
 * Uso: npm run db:seed:logistics-home-mix
 */
import { connectPg } from "./lib/db-connection.mjs";
import { resolveScgsOrgId } from "./lib/scgs-demo-recipients.mjs";

const DEMO_PREFIX = "INV-HOME-MIX-";
const CUSTOMER_EMAIL_PREFIX = "logistics.home.mix+";
const ROUTE_PREFIX = "Demo domicilios";
const BOXES = ["14x14x14", "16x16x16", "18x18x18"];
const BASE_LAT = 34.42;
const BASE_LNG = -118.54;

function isoAt(base, minutes) {
  return new Date(base.getTime() + minutes * 60 * 1000).toISOString();
}

function boxPlan({ action, box, warehouseId }) {
  const isDelivery = action === "dejar";
  const operationMode = isDelivery
    ? "Entregar caja vacía a domicilio"
    : "Recoger caja llena a domicilio";
  const taskType = isDelivery ? "deliver_empty_box" : "pickup_full_box";
  const summary = isDelivery
    ? "Caja vacía: Entregar caja vacía a domicilio | Caja llena: Recolección pendiente"
    : "Caja vacía: Cliente ya tiene caja vacía | Caja llena: Recoger caja llena a domicilio";

  return {
    box: { label: box, paid: "$50", cost: "$31", time: "3-5 dias", carrier: "" },
    boxCount: 1,
    boxLines: [{ label: box, quantity: 1, paid: "$50", cost: "$31", catalogKey: `cajas|${box.toLowerCase()}|` }],
    fees: { total: "$0", fullBoxPickup: "$0", emptyBoxDelivery: "$0" },
    billing: {
      quotedTotal: "$50",
      payNow: "$50",
      balanceDue: "$0",
      boxSubtotal: "$50",
      boxUnitPrice: "$50",
      boxCount: 1,
      fullBoxPickup: "$0",
      emptyBoxDelivery: "$0",
      logisticsSubtotal: "$0",
      minimumDeposit: "$20",
      logisticsFeeMode: "per_trip",
      cartLines: [{ label: box, quantity: 1, unitPrice: "$50", unitCost: "$31", catalogKey: `cajas|${box.toLowerCase()}|` }],
      promotion: null,
    },
    summary,
    emptyBox: isDelivery
      ? { mode: operationMode, label: "empty_box", driverTaskType: taskType, driverTaskNeeded: true, scheduleMode: "scheduled", warehouseId }
      : { mode: "Cliente ya tiene caja vacía", label: "empty_box", driverTaskNeeded: false, warehouseId },
    fullBox: isDelivery
      ? { mode: "Recoger caja llena a domicilio", label: "full_box", deferred: true, driverTaskNeeded: false }
      : { mode: operationMode, label: "full_box", deferred: true, driverTaskType: taskType, driverTaskNeeded: true, scheduleMode: "scheduled" },
    driverTaskCount: 1,
  };
}

function addressFor(index, action) {
  const lat = BASE_LAT + (index % 10) * 0.004;
  const lng = BASE_LNG + (index % 10) * 0.005;
  const street = ["Bouquet Canyon Rd", "Soledad Canyon Rd", "McBean Pkwy", "Lyons Ave", "Sierra Hwy"][index % 5];
  const house = String(18000 + index * 137);
  const city = "Santa Clarita";
  const state = "CA";
  const postalCode = ["91350", "91351", "91355", "91321", "91387"][index % 5];
  return {
    firstName: action === "dejar" ? "Cliente" : "Destinatario",
    lastName: "Prueba",
    phone: `(661) 555-${String(1000 + index).slice(-4)}`,
    country: "USA",
    street,
    houseNumber: house,
    neighborhood: "Santa Clarita",
    city,
    state,
    postalCode,
    formattedAddress: `${house} ${street}, ${city}, ${state} ${postalCode}, USA`,
    placeId: `home-mix-${index + 1}`,
    lat,
    lng,
  };
}

async function loadContext(client, orgId) {
  const owner = await client.query(
    `select p.id from public.profiles p
     join public.roles r on r.id = p.role_id
     where p.organization_id = $1 and p.is_active = true
     order by case when r.slug = 'administrador' then 0 else 1 end, p.created_at
     limit 1`,
    [orgId],
  );
  if (!owner.rowCount) throw new Error("No hay usuario activo para crear el fixture de Logistica.");

  const warehouse = await client.query(
    `select id from public.warehouses where organization_id = $1
     order by is_default desc, created_at limit 1`,
    [orgId],
  );
  const country = await client.query(
    `select id, name from public.pricing_countries where organization_id = $1
     order by sort_order, created_at limit 1`,
    [orgId],
  );
  if (!country.rowCount) throw new Error("No hay paises configurados para crear destinatarios de prueba.");

  return {
    ownerId: owner.rows[0].id,
    warehouseId: warehouse.rows[0]?.id || null,
    recipientCountryId: country.rows[0].id,
    recipientCountry: country.rows[0].name,
  };
}

async function removePreviousFixture(client, orgId) {
  await client.query(
    `delete from public.logistics_route_stops where organization_id = $1
     and route_id in (select id from public.logistics_routes where organization_id = $1 and name like $2)`,
    [orgId, `${ROUTE_PREFIX} %`],
  );
  await client.query("delete from public.logistics_routes where organization_id = $1 and name like $2", [orgId, `${ROUTE_PREFIX} %`]);
  await client.query("delete from public.shipments where organization_id = $1 and code like $2", [orgId, `${DEMO_PREFIX}%`]);
  await client.query("delete from public.customer_recipients where organization_id = $1 and customer_id in (select id from public.customers where organization_id = $1 and email like $2)", [orgId, `${CUSTOMER_EMAIL_PREFIX}%`]);
  await client.query("delete from public.customers where organization_id = $1 and email like $2", [orgId, `${CUSTOMER_EMAIL_PREFIX}%`]);
}

async function main() {
  const { client, label } = await connectPg();
  try {
    const org = await resolveScgsOrgId(client);
    const context = await loadContext(client, org.id);
    const base = new Date();
    base.setHours(8, 0, 0, 0);

    await client.query("begin");
    await removePreviousFixture(client, org.id);

    for (let index = 0; index < 30; index += 1) {
      const action = index < 15 ? "dejar" : "recoger";
      const actionIndex = action === "dejar" ? index : index - 15;
      const customerName = `${action === "dejar" ? "Dejar" : "Recoger"} domicilio ${actionIndex + 1}`;
      const address = addressFor(index, action);
      const box = BOXES[index % BOXES.length];
      const plan = boxPlan({ action, box, warehouseId: context.warehouseId });
      const scheduledAt = isoAt(base, 30 + index * 15);
      const deliveredAt = action === "recoger" ? isoAt(base, -24 * 60) : null;
      const customer = await client.query(
        `insert into public.customers (organization_id, first_name, last_name, phones, email, street, house_number, neighborhood, city, state, postal_code, country, place_id, formatted_address, lat, lng, geo_updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,now()) returning id`,
        [org.id, action === "dejar" ? "Cliente" : "Destinatario", "Prueba", [address.phone], `${CUSTOMER_EMAIL_PREFIX}${index + 1}@boxario.test`, address.street, address.houseNumber, address.neighborhood, address.city, address.state, address.postalCode, address.country, address.placeId, address.formattedAddress, address.lat, address.lng],
      );
      const customerId = customer.rows[0].id;
      const recipient = await client.query(
        `insert into public.customer_recipients (organization_id, customer_id, first_name, last_name, phone, country, country_id, street, house_number, neighborhood, city, state, postal_code, place_id, formatted_address, lat, lng, geo_updated_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,now()) returning id`,
        [org.id, customerId, address.firstName, address.lastName, address.phone, context.recipientCountry, context.recipientCountryId, address.street, address.houseNumber, address.neighborhood, address.city, address.state, address.postalCode, address.placeId, address.formattedAddress, address.lat, address.lng],
      );
      const status = action === "dejar" ? "Pendiente entrega caja vacía" : "Pendiente recolección caja llena";
      const shipment = await client.query(
        `insert into public.shipments (organization_id, code, customer_id, recipient_id, recipient_snapshot, customer_name, country, carrier, paid, profit, status, assigned_to, created_by, sales_owner_id, sale_kind, invoice_status, accounting_status, finalized_at, empty_box_delivered_at, delivery_notes, logistics_plan, created_at)
         values ($1,$2,$3,$4,$5,$6,'USA','Demo',50,0,$7,$8,$9,$9,'full','paid','exportable',now(),$10,$11,$12,$13) returning id`,
        [org.id, `${DEMO_PREFIX}${String(index + 1).padStart(3, "0")}`, customerId, recipient.rows[0].id, JSON.stringify(address), customerName, status, null, context.ownerId, deliveredAt, plan.summary, JSON.stringify(plan), isoAt(base, -120 + index)],
      );
      await client.query(
        `insert into public.shipment_logistics_tasks (organization_id, shipment_id, task_type, status, assigned_to, scheduled_at, requested_schedule_at, schedule_confirmation_status, schedule_kind, window_start_at, warehouse_id, notes, ordered_at, assigned_at, created_at)
         values ($1,$2,$3,$4,$5,$6,$6,'confirmed','exact',$6,$7,$8,$9,$10,now()) returning id`,
        [org.id, shipment.rows[0].id, action === "dejar" ? "deliver_empty_box" : "pickup_full_box", "scheduled", null, scheduledAt, context.warehouseId, `${action === "dejar" ? "Dejar" : "Recoger"} caja a domicilio · ${address.formattedAddress}`, null, null],
      );
    }

    await client.query("commit");
    console.log(`OK: ${label}`);
    console.log(`Organizacion: ${org.name}`);
    console.log("30 invoices creados: 15 para dejar y 15 para recoger, todos a domicilio y sin ruta seleccionada.");
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
