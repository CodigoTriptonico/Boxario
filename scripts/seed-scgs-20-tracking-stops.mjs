/**
 * Demo local: 20 paradas de seguimiento para Scgs.
 * Crea 10 entregas y 10 recolecciones; la mitad tiene solicitud activa para
 * Logística y la otra mitad conserva únicamente la tarea pendiente.
 * Las direcciones se validan como únicas antes de insertar.
 */
import { createHash } from "node:crypto";
import { connectPg } from "./lib/db-connection.mjs";
import { resolveScgsOrgId } from "./lib/scgs-demo-recipients.mjs";

const EMAIL_PREFIX = "tracking.stop+";
const BOXES = ["14x14x14", "16x16x16", "18x18x18"];

const ADDRESSES = [
  ["23920", "Valencia Blvd", "91355"],
  ["24201", "Valencia Blvd", "91355"],
  ["26455", "Rockwell Canyon Rd", "91355"],
  ["26101", "Magic Mountain Pkwy", "91355"],
  ["23845", "McBean Pkwy", "91355"],
  ["23743", "McBean Pkwy", "91355"],
  ["20880", "Centre Pointe Pkwy", "91350"],
  ["27150", "Bouquet Canyon Rd", "91350"],
  ["22421", "Market St", "91321"],
  ["24500", "Main St", "91321"],
  ["24155", "San Fernando Rd", "91321"],
  ["18410", "Sierra Hwy", "91351"],
  ["17615", "Sierra Hwy", "91351"],
  ["27051", "Robert C Lee Pkwy", "91350"],
  ["27801", "Dickason Dr", "91355"],
  ["21900", "W Centurion Way", "91350"],
  ["24825", "Newhall Ave", "91321"],
  ["19152", "Golden Valley Rd", "91387"],
  ["25891", "McBean Pkwy", "91355"],
  ["17901", "Sierra Hwy", "91351"],
].map(([houseNumber, street, postalCode]) => ({
  houseNumber,
  street,
  postalCode,
  neighborhood: "Santa Clarita",
  city: "Santa Clarita",
  state: "CA",
  country: "USA",
}));

const REQUESTED_INDEXES = new Set([0, 1, 3, 4, 7, 10, 12, 13, 16, 19]);

function isoFromNow(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function formatAddress(address) {
  return `${address.houseNumber} ${address.street}, ${address.city}, ${address.state} ${address.postalCode}, ${address.country}`;
}

function addressFingerprint(address) {
  const normalize = (value) => String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ");
  const source = [
    "",
    normalize(formatAddress(address)),
    normalize(address.street),
    normalize(address.houseNumber),
    normalize(address.neighborhood),
    normalize(address.city),
    normalize(address.state),
    address.postalCode,
    normalize(address.country),
    "",
    "",
  ].join("|");
  return createHash("sha256").update(source).digest("hex");
}

function nextDateForWeekday(base, weekday) {
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 12);
  const current = (date.getDay() + 6) % 7;
  const delta = (Number(weekday) - current + 7) % 7 || 7;
  date.setDate(date.getDate() + delta);
  return date.toISOString().slice(0, 10);
}

function scheduledAt(routeDate, startTime, index) {
  const baseTime = String(startTime || "10:00:00").slice(0, 8);
  const [hours, minutes] = baseTime.split(":").map(Number);
  const date = new Date(`${routeDate}T${baseTime}Z`);
  date.setUTCHours(hours + Math.floor(index / 2), minutes + (index % 2) * 30, 0, 0);
  return date.toISOString();
}

function recipientSnapshot(address, firstName, lastName, phone) {
  return {
    lat: null,
    lng: null,
    city: address.city,
    phone,
    state: address.state,
    street: address.street,
    country: address.country,
    placeId: "",
    lastName,
    firstName,
    postalCode: address.postalCode,
    houseNumber: address.houseNumber,
    neighborhood: address.neighborhood,
    formattedAddress: formatAddress(address),
  };
}

function logisticsPlan({ action, box, warehouseId, address }) {
  const isDelivery = action === "deliver_empty_box";
  return {
    box: { label: box, paid: "$50", cost: "$31", time: "3-5 dias", carrier: "" },
    boxCount: 1,
    boxLines: [{ label: box, quantity: 1, paid: "$50", cost: "$31", catalogKey: `cajas|${box}|` }],
    billing: {
      quotedTotal: "$50",
      payNow: "$50",
      balanceDue: "$0",
      boxSubtotal: "$50",
      boxUnitPrice: "$50",
      boxCount: 1,
      minimumDeposit: "$20",
      fullBoxPickup: "$0",
      emptyBoxDelivery: "$0",
      logisticsFeeMode: "per_trip",
      logisticsSubtotal: "$0",
      cartLines: [{ label: box, quantity: 1, unitPrice: "$50", unitCost: "$31", catalogKey: `cajas|${box}|` }],
      promotion: null,
    },
    summary: isDelivery
      ? `Caja vacía: Entregar caja vacía a domicilio | Parada: ${formatAddress(address)}`
      : `Caja vacía: Cliente ya tiene caja vacía | Parada: Recoger caja llena en ${formatAddress(address)}`,
    emptyBox: isDelivery
      ? { mode: "Entregar caja vacía a domicilio", label: "empty_box", driverTaskType: "deliver_empty_box", driverTaskNeeded: true, scheduleMode: "pending", warehouseId }
      : { mode: "Cliente ya tiene caja vacía", label: "empty_box", driverTaskNeeded: false, warehouseId },
    fullBox: isDelivery
      ? { mode: "Recolección pendiente", label: "full_box", deferred: true, driverTaskNeeded: false }
      : { mode: "Recoger caja llena a domicilio", label: "full_box", driverTaskType: "pickup_full_box", driverTaskNeeded: true, scheduleMode: "pending" },
    driverTaskCount: 1,
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
  if (!owner.rowCount) throw new Error("No hay un usuario activo para crear las paradas demo.");

  const warehouse = await client.query(
    `select id from public.warehouses where organization_id = $1
      order by is_default desc, created_at limit 1`,
    [orgId],
  );
  const route = await client.query(
    `select s.id as schedule_id, s.weekday, s.start_time,
            d.id as definition_id, d.name as definition_name, d.zone_name
       from public.logistics_route_schedules s
       join public.logistics_route_definitions d on d.id = s.route_definition_id
      where s.organization_id = $1 and s.is_active = true and d.status = 'active'
      order by s.weekday, s.start_time
      limit 1`,
    [orgId],
  );
  if (!route.rowCount) throw new Error("No hay una ruta activa para marcar solicitudes de Logística.");
  const country = await client.query(
    `select id, name from public.pricing_countries where organization_id = $1
      order by sort_order, created_at limit 1`,
    [orgId],
  );
  if (!country.rowCount) throw new Error("No hay un país configurado para crear los destinatarios.");

  return {
    ownerId: owner.rows[0].id,
    warehouseId: warehouse.rows[0]?.id ?? null,
    route: route.rows[0],
    recipientCountryId: country.rows[0].id,
    recipientCountry: country.rows[0].name,
  };
}

async function nextInvoiceNumber(client, orgId, ownerId) {
  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claims', $1, true)", [
    JSON.stringify({ sub: ownerId, role: "authenticated" }),
  ]);
  try {
    const result = await client.query("select public.next_organization_invoice_number($1) as invoice_number", [orgId]);
    return `INV-${String(result.rows[0].invoice_number).padStart(6, "0")}`;
  } finally {
    await client.query("select set_config('request.jwt.claims', '', true)");
    await client.query("reset role");
  }
}

async function assertFixtureIsSafe(client, orgId) {
  const existing = await client.query(
    `select s.code from public.shipments s
       join public.customers c on c.id = s.customer_id
      where s.organization_id = $1 and c.email like $2 limit 1`,
    [orgId, `${EMAIL_PREFIX}%@boxario.test`],
  );
  if (existing.rowCount) throw new Error(`Ya existe el fixture de paradas (${existing.rows[0].code}); no se duplicarán casos.`);

  const addressPairs = ADDRESSES.map((address) => [address.street, address.houseNumber]);
  const existingAddresses = await client.query(
    `select street, house_number from public.customers
      where organization_id = $1 and (street, house_number) in (${addressPairs.map((_, index) => `($${index * 2 + 2}, $${index * 2 + 3})`).join(",")})`,
    [orgId, ...addressPairs.flat()],
  );
  if (existingAddresses.rowCount) {
    throw new Error(`Ya existe una dirección de parada en clientes: ${formatAddress({ ...ADDRESSES[0], street: existingAddresses.rows[0].street, houseNumber: existingAddresses.rows[0].house_number })}`);
  }
}

async function main() {
  const { client, label } = await connectPg();
  try {
    const org = await resolveScgsOrgId(client);
    const context = await loadContext(client, org.id);
    await assertFixtureIsSafe(client, org.id);

    const routeDate = nextDateForWeekday(new Date(), context.route.weekday);
    await client.query("begin");
    const created = [];

    for (let index = 0; index < ADDRESSES.length; index += 1) {
      const address = ADDRESSES[index];
      const requested = REQUESTED_INDEXES.has(index);
      const isDelivery = index < 10;
      const action = isDelivery ? "deliver_empty_box" : "pickup_full_box";
      const taskTypeLabel = isDelivery ? "Entregar" : "Recoger";
      const firstName = "Cliente";
      const lastName = "Santa Clarita";
      const phone = `(661) 555-${String(4100 + index)}`;
      const addressText = formatAddress(address);
      const code = await nextInvoiceNumber(client, org.id, context.ownerId);
      const createdAt = isoFromNow(-48 + index);
      const scheduled = requested ? scheduledAt(routeDate, context.route.start_time, index) : null;
      const plan = logisticsPlan({ action, box: BOXES[index % BOXES.length], warehouseId: context.warehouseId, address });
      const snapshot = recipientSnapshot(address, firstName, lastName, phone);
      const customer = await client.query(
        `insert into public.customers (
           organization_id, first_name, last_name, phones, email, street, house_number,
           neighborhood, city, state, postal_code, country, place_id, formatted_address,
           lat, lng, address_reference
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,null,null,$15)
         returning id`,
        [org.id, firstName, lastName, [phone], `${EMAIL_PREFIX}${String(index + 1).padStart(2, "0")}@boxario.test`, address.street, address.houseNumber, address.neighborhood, address.city, address.state, address.postalCode, address.country, `scgs-stop-${index + 1}`, addressText, addressText],
      );
      const recipient = await client.query(
        `insert into public.customer_recipients (
           organization_id, customer_id, first_name, last_name, phone, country,
           country_id, street, house_number, neighborhood, city, state, postal_code,
           place_id, formatted_address, lat, lng, address_reference
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,null,null,$16)
         returning id`,
        [org.id, customer.rows[0].id, firstName, lastName, phone, context.recipientCountry, context.recipientCountryId, address.street, address.houseNumber, address.neighborhood, address.city, address.state, address.postalCode, `scgs-stop-${index + 1}`, addressText, addressText],
      );
      const status = isDelivery ? "Pendiente entrega caja vacía" : "Pendiente recolección caja llena";
      const shipment = await client.query(
        `insert into public.shipments (
           organization_id, code, customer_id, recipient_id, recipient_snapshot, customer_name,
           country, carrier, paid, profit, status, created_by, sales_owner_id, sale_kind,
           invoice_status, accounting_status, finalized_at, empty_box_delivered_at,
           delivery_notes, logistics_plan, created_at
         ) values ($1,$2,$3,$4,$5,$6,$7,'Demo Santa Clarita',50,0,$8,$9,$9,'full','paid','exportable',now(),$10,$11,$12,$13)
         returning id`,
        [org.id, code, customer.rows[0].id, recipient.rows[0].id, JSON.stringify(snapshot), `${firstName} ${lastName}`, address.country, status, context.ownerId, isDelivery ? null : isoFromNow(-24 - index), plan.summary, JSON.stringify(plan), createdAt],
      );
      const task = await client.query(
        `insert into public.shipment_logistics_tasks (
           organization_id, shipment_id, task_type, status, scheduled_at, warehouse_id,
           notes, ordered_at, requested_schedule_at, requested_by, schedule_kind,
           window_start_at, schedule_confirmation_status, created_at
         ) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         returning id`,
        [org.id, shipment.rows[0].id, action, requested ? "scheduled" : "pending", scheduled, context.warehouseId, `${taskTypeLabel} caja en ${addressText}`, requested ? createdAt : null, scheduled, requested ? context.ownerId : null, requested ? "exact" : null, scheduled, requested ? "pending" : "pending", createdAt],
      );

      if (requested) {
        await client.query(
          `insert into public.customer_route_assignment_requests (
             organization_id, customer_id, shipment_id, task_id, scheduled_at, zone_key,
             status, requested_by, review_note, route_date, route_weekday, route_name,
             route_definition_id, route_schedule_id, address_fingerprint, postal_code, box_count
           ) values ($1,$2,$3,$4,$5,$6,'pending_approval',$7,'',$8,$9,$10,$11,$12,$13,$14,1)`,
          [org.id, customer.rows[0].id, shipment.rows[0].id, task.rows[0].id, scheduled, context.route.zone_name || context.route.definition_name, context.ownerId, routeDate, context.route.weekday, context.route.definition_name, context.route.definition_id, context.route.schedule_id, addressFingerprint(address), address.postalCode],
        );
      }
      created.push({ code, action: taskTypeLabel, requested, address: addressText });
    }

    await client.query("commit");
    console.log(`OK: ${created.length} paradas creadas en ${label} · ${org.name}`);
    console.log(`- Entregas: ${created.filter((row) => row.action === "Entregar").length}`);
    console.log(`- Recolecciones: ${created.filter((row) => row.action === "Recoger").length}`);
    console.log(`- Solicitadas a Logística: ${created.filter((row) => row.requested).length}`);
    console.log(`- Sin solicitud a Logística: ${created.filter((row) => !row.requested).length}`);
    for (const row of created) console.log(`- ${row.code} · ${row.action} · ${row.requested ? "solicitada" : "sin solicitud"} · ${row.address}`);
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
