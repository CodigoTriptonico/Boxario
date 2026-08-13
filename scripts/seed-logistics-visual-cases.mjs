/**
 * Demo local aditivo: casos visuales para revisar Tareas en Logistica.
 * No borra datos existentes; cada ejecucion crea una nueva corrida identificable.
 * Uso: npm run db:seed:logistics-visual-cases
 */
import { connectPg } from "./lib/db-connection.mjs";
import { resolveScgsOrgId } from "./lib/scgs-demo-recipients.mjs";

const BOXES = ["14x14x14", "16x16x16", "18x18x18"];
function isoAt(base, dayOffset, hour, minute = 0) {
  const date = new Date(base);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(hour, minute, 0, 0);
  return date.toISOString();
}

function dateAt(base, dayOffset) {
  const date = new Date(base);
  date.setDate(date.getDate() + dayOffset);
  return date.toISOString().slice(0, 10);
}

function runTag(base) {
  const value = base.toISOString().replace(/[-:TZ.]/g, "").slice(2, 14);
  return value;
}

function addressFor(index) {
  const streets = [
    "Bouquet Canyon Rd",
    "Soledad Canyon Rd",
    "McBean Pkwy",
    "Lyons Ave",
    "Sierra Hwy",
    "Newhall Ranch Rd",
    "Copper Hill Dr",
    "Magic Mountain Pkwy",
  ];
  const postalCodes = ["91350", "91351", "91355", "91321", "91387"];
  const street = streets[index % streets.length];
  const house = String(18000 + index * 137);
  const city = "Santa Clarita";
  const state = "CA";
  const postalCode = postalCodes[index % postalCodes.length];
  return {
    firstName: index % 2 === 0 ? "Cliente" : "Destinatario",
    lastName: "Visual",
    phone: `(661) 555-${String(2300 + index).slice(-4)}`,
    country: "USA",
    street,
    houseNumber: house,
    neighborhood: "Demo Logistica",
    city,
    state,
    postalCode,
    formattedAddress: `${house} ${street}, ${city}, ${state} ${postalCode}, USA`,
    placeId: "",
    lat: null,
    lng: null,
  };
}

async function verifiedAddressFor(index) {
  const address = addressFor(index);
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY es obligatoria para crear casos visuales con coordenadas verificadas.");
  }
  const params = new URLSearchParams({ address: address.formattedAddress, key: apiKey });
  const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?${params}`);
  const payload = await response.json();
  const match = payload.results?.[0];
  if (!response.ok || payload.status !== "OK" || !match?.geometry?.location || match.partial_match) {
    throw new Error(`Google no pudo verificar completamente la dirección demo: ${address.formattedAddress}`);
  }
  const postalCode = match.address_components?.find((component) =>
    component.types?.includes("postal_code"),
  )?.long_name;
  return {
    ...address,
    formattedAddress: match.formatted_address || address.formattedAddress,
    postalCode: postalCode || address.postalCode,
    placeId: match.place_id || "",
    lat: match.geometry.location.lat,
    lng: match.geometry.location.lng,
  };
}

function planFor({ action, box, warehouseId, scheduleAt }) {
  const isDelivery = action === "deliver_empty_box";
  return {
    box: {
      label: box,
      paid: "$50",
      cost: "$31",
    },
    boxCount: 1,
    billing: {
      quotedTotal: "$50",
      payNow: "$50",
      balanceDue: "$0",
      cartLines: [{ label: box, quantity: 1, unitPrice: "$50", unitCost: "$31" }],
    },
    emptyBox: isDelivery
      ? {
          mode: "Entregar caja vacia a domicilio",
          label: "empty_box",
          driverTaskType: "deliver_empty_box",
          driverTaskNeeded: true,
          warehouseId,
          scheduleAt,
        }
      : {
          mode: "Cliente ya tiene caja vacia",
          label: "empty_box",
          driverTaskNeeded: false,
          warehouseId,
        },
    fullBox: isDelivery
      ? {
          mode: "Recoger caja llena a domicilio",
          label: "full_box",
          deferred: true,
          driverTaskNeeded: false,
        }
      : {
          mode: "Recoger caja llena a domicilio",
          label: "full_box",
          deferred: true,
          driverTaskType: "pickup_full_box",
          driverTaskNeeded: true,
          scheduleAt,
        },
  };
}

const CASES = [
  {
    label: "Pendiente sin fecha",
    action: "deliver_empty_box",
    taskStatus: "pending",
    scheduledDay: null,
    requestedDay: null,
    entryDay: -6,
    invoiceStatus: "open",
  },
  {
    label: "Pendiente esperando confirmacion",
    action: "pickup_full_box",
    taskStatus: "pending",
    scheduledDay: null,
    requestedDay: 1,
    entryDay: -5,
    invoiceStatus: "open",
  },
  {
    label: "Programada para hoy",
    action: "deliver_empty_box",
    taskStatus: "scheduled",
    scheduledDay: 0,
    requestedDay: 0,
    entryDay: -4,
    invoiceStatus: "paid",
  },
  {
    label: "Programada para manana",
    action: "pickup_full_box",
    taskStatus: "scheduled",
    scheduledDay: 1,
    requestedDay: 1,
    entryDay: -3,
    invoiceStatus: "paid",
  },
  {
    label: "Asignada a ruta de hoy",
    action: "deliver_empty_box",
    taskStatus: "assigned",
    scheduledDay: 0,
    requestedDay: 0,
    entryDay: -2,
    invoiceStatus: "paid",
    route: "today",
  },
  {
    label: "Completada ayer",
    action: "pickup_full_box",
    taskStatus: "completed",
    scheduledDay: -1,
    requestedDay: -1,
    entryDay: -7,
    invoiceStatus: "paid",
    route: "yesterday",
    completed: true,
  },
  {
    label: "Cancelada ayer",
    action: "deliver_empty_box",
    taskStatus: "cancelled",
    scheduledDay: -1,
    requestedDay: -1,
    entryDay: -1,
    invoiceStatus: "void",
  },
  {
    label: "Programada proxima semana",
    action: "pickup_full_box",
    taskStatus: "scheduled",
    scheduledDay: 7,
    requestedDay: 7,
    entryDay: 0,
    invoiceStatus: "paid",
  },
];

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
  if (!owner.rowCount) throw new Error("No hay usuario activo para crear el demo de Logistica.");

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
  if (!country.rowCount) throw new Error("No hay paises configurados para crear destinatarios demo.");

  return {
    ownerId: owner.rows[0].id,
    warehouseId: warehouse.rows[0]?.id ?? null,
    recipientCountryId: country.rows[0].id,
    recipientCountry: country.rows[0].name,
  };
}

async function insertCustomerAndRecipient(client, orgId, context, address, email) {
  const customer = await client.query(
    `insert into public.customers (
       organization_id, first_name, last_name, phones, email, street, house_number,
       neighborhood, city, state, postal_code, country, place_id, formatted_address,
       lat, lng, geo_updated_at
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,now())
     returning id`,
    [
      orgId,
      address.firstName,
      address.lastName,
      [address.phone],
      email,
      address.street,
      address.houseNumber,
      address.neighborhood,
      address.city,
      address.state,
      address.postalCode,
      address.country,
      address.placeId,
      address.formattedAddress,
      address.lat,
      address.lng,
    ],
  );

  const recipient = await client.query(
    `insert into public.customer_recipients (
       organization_id, customer_id, first_name, last_name, phone, country, country_id,
       street, house_number, neighborhood, city, state, postal_code, place_id,
       formatted_address, lat, lng, geo_updated_at
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,now())
     returning id`,
    [
      orgId,
      customer.rows[0].id,
      address.firstName,
      address.lastName,
      address.phone,
      context.recipientCountry,
      context.recipientCountryId,
      address.street,
      address.houseNumber,
      address.neighborhood,
      address.city,
      address.state,
      address.postalCode,
      address.placeId,
      address.formattedAddress,
      address.lat,
      address.lng,
    ],
  );

  return { customerId: customer.rows[0].id, recipientId: recipient.rows[0].id };
}

async function insertCase(client, orgId, context, base, tag, scenario, index) {
  const address = await verifiedAddressFor(index);
  const scheduledAt = scenario.scheduledDay === null
    ? null
    : isoAt(base, scenario.scheduledDay, 10 + (index % 4), (index % 2) * 30);
  const requestedAt = scenario.requestedDay === null
    ? null
    : isoAt(base, scenario.requestedDay, 10 + (index % 4), (index % 2) * 30);
  const createdAt = isoAt(base, scenario.entryDay, 8 + (index % 3), index * 5);
  const { customerId, recipientId } = await insertCustomerAndRecipient(
    client,
    orgId,
    context,
    address,
    `logistics.visual.${tag}.${index + 1}@boxario.test`,
  );
  const code = `INV-LOG-${tag}-${String(index + 1).padStart(2, "0")}`;
  const isDelivery = scenario.action === "deliver_empty_box";
  const shipmentStatus = isDelivery ? "Pendiente entrega caja vacia" : "Pendiente recoleccion caja llena";
  const plan = planFor({
    action: scenario.action,
    box: BOXES[index % BOXES.length],
    warehouseId: context.warehouseId,
    scheduleAt: scheduledAt || requestedAt,
  });
  const shipment = await client.query(
    `insert into public.shipments (
       organization_id, code, customer_id, recipient_id, recipient_snapshot, customer_name,
       country, carrier, paid, profit, status, assigned_to, created_by, sales_owner_id,
       sale_kind, invoice_status, accounting_status, finalized_at, delivery_notes,
       logistics_plan, created_at
     ) values ($1,$2,$3,$4,$5,$6,$7,'Demo visual',50,0,$8,null,$9,$9,'full',$10,$11,$12,$13,$14,$15)
     returning id`,
    [
      orgId,
      code,
      customerId,
      recipientId,
      JSON.stringify(address),
      `${address.firstName} ${address.lastName} ${index + 1}`,
      address.country,
      shipmentStatus,
      context.ownerId,
      scenario.invoiceStatus,
      scenario.invoiceStatus === "paid" ? "exportable" : "not_exportable",
      scenario.invoiceStatus === "paid" ? createdAt : null,
      `Caso visual: ${scenario.label}`,
      JSON.stringify(plan),
      createdAt,
    ],
  );

  const completedAt = scenario.completed ? isoAt(base, -1, 16) : null;
  const task = await client.query(
    `insert into public.shipment_logistics_tasks (
       organization_id, shipment_id, task_type, status, assigned_to, scheduled_at,
       requested_schedule_at, schedule_confirmation_status, schedule_kind, window_start_at,
       warehouse_id, notes, ordered_at, assigned_at, completed_at, created_at
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$13)
     returning id`,
    [
      orgId,
      shipment.rows[0].id,
      scenario.action,
      scenario.taskStatus,
      scenario.route ? context.ownerId : null,
      scheduledAt,
      requestedAt,
      scenario.taskStatus === "pending" ? "pending" : "confirmed",
      scheduledAt || requestedAt ? "exact" : null,
      scheduledAt || requestedAt,
      context.warehouseId,
      `Demo visual Â· ${scenario.label}`,
      createdAt,
      scenario.route ? createdAt : null,
      completedAt,
    ],
  );

  return {
    code,
    shipmentId: shipment.rows[0].id,
    taskId: task.rows[0].id,
    address,
  };
}

async function insertRoute(client, orgId, context, base, tag, label, dayOffset, status) {
  const route = await client.query(
    `insert into public.logistics_routes (
       organization_id, route_date, name, status, route_template_id, assigned_to,
       warehouse_id, zone_key, notes, published_at, completed_at, created_by, created_at
     ) values ($1,$2,$3,$4,null,$5,$6,$7,$8,$9,$10,$5,$9)
     returning id`,
    [
      orgId,
      dateAt(base, dayOffset),
      `Demo visual ${label} ${tag}`,
      status,
      context.ownerId,
      context.warehouseId,
      "santa-clarita",
      `Caso visual: ${label}`,
      isoAt(base, dayOffset, 8),
      status === "completed" ? isoAt(base, dayOffset, 16) : null,
    ],
  );
  return route.rows[0].id;
}

async function addStop(client, orgId, routeId, item, outcome = null, outcomeAt = null) {
  await client.query(
    `insert into public.logistics_route_stops (
       organization_id, route_id, task_id, stop_order, address_snapshot, lat, lng,
       postal_code, city, outcome, outcome_at
     ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [
      orgId,
      routeId,
      item.taskId,
      1,
      JSON.stringify({ formattedAddress: item.address.formattedAddress }),
      item.address.lat,
      item.address.lng,
      item.address.postalCode,
      item.address.city,
      outcome,
      outcomeAt,
    ],
  );
}

async function main() {
  const { client, label } = await connectPg();
  const base = new Date();
  const tag = runTag(base);
  try {
    const org = await resolveScgsOrgId(client);
    const context = await loadContext(client, org.id);
    await client.query("begin");

    const inserted = [];
    for (let index = 0; index < CASES.length; index += 1) {
      inserted.push(await insertCase(client, org.id, context, base, tag, CASES[index], index));
    }

    const todayRouteId = await insertRoute(client, org.id, context, base, tag, "hoy", 0, "planned");
    await addStop(client, org.id, todayRouteId, inserted[4]);

    const yesterdayRouteId = await insertRoute(client, org.id, context, base, tag, "historial", -1, "completed");
    await addStop(client, org.id, yesterdayRouteId, inserted[5], "completed", isoAt(base, -1, 16));

    await client.query("commit");
    console.log(`OK: ${label}`);
    console.log(`Organizacion: ${org.name}`);
    console.log(`Corrida: ${tag}`);
    console.log("8 invoices agregados: pendientes sin fecha y con solicitud, programados, asignados, completados y cancelados.");
    console.log(`Rutas demo: hoy ${todayRouteId} · historial ${yesterdayRouteId}`);
    for (let index = 0; index < CASES.length; index += 1) {
      const scenario = CASES[index];
      console.log(`- ${inserted[index].code} · ${scenario.label}`);
    }
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
