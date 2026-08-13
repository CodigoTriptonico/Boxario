/**
 * Demo local: un invoice por cada estado operativo de Seguimiento.
 * Uso: node scripts/seed-shipment-status-gallery.mjs
 */
import { connectPg } from "./lib/db-connection.mjs";
import { resolveScgsOrgId } from "./lib/scgs-demo-recipients.mjs";

const EMPTY_BOX_OFFICE = "Cliente recoge caja vacia en oficina";
const EMPTY_BOX_DRIVER = "Programar entrega de caja vacia";
const FULL_BOX_DRIVER = "Programar recoleccion caja llena";
const FULL_BOX_OFFICE = "Cliente trae caja llena a oficina";

function isoFromNow(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000).toISOString();
}

function baseBilling(boxLabel) {
  return {
    payNow: "$20",
    boxCount: 1,
    balanceDue: "$30",
    boxSubtotal: "$50",
    quotedTotal: "$50",
    boxUnitPrice: "$50",
    fullBoxPickup: "$0",
    minimumDeposit: "$20",
    emptyBoxDelivery: "$0",
    logisticsFeeMode: "per_trip",
    logisticsSubtotal: "$0",
    promotionDiscount: "$0",
    boxSubtotalBeforeDiscount: "$50",
    promotionSelectionRequired: false,
    promotionCandidates: [],
    cartLines: [
      {
        time: "3-5 dias",
        label: boxLabel,
        carrier: "",
        quantity: 1,
        unitCost: "$31",
        unitPrice: "$50",
        catalogKey: `cajas|${boxLabel}|`,
      },
    ],
    promotion: null,
  };
}

function basePlan(boxLabel, emptyBox, fullBox, summary) {
  return {
    box: { cost: "$31", paid: "$50", time: "3-5 dias", label: boxLabel, carrier: "" },
    fees: { total: "$0", fullBoxPickup: "$0", emptyBoxDelivery: "$0" },
    notes: "",
    billing: baseBilling(boxLabel),
    emptyBox,
    fullBox,
    summary,
    boxCount: 1,
    boxLines: [
      {
        cost: "$31",
        paid: "$50",
        time: "3-5 dias",
        label: boxLabel,
        carrier: "",
        quantity: 1,
        catalogKey: `cajas|${boxLabel}|`,
      },
    ],
    driverTaskCount: emptyBox.driverTaskNeeded || fullBox.driverTaskNeeded ? 1 : 0,
  };
}

function scenarios(warehouseId) {
  const box = "16x16x16";
  const tEmpty = isoFromNow(-96);
  const tFull = isoFromNow(-72);
  const tOffice = isoFromNow(-48);
  const tDeparted = isoFromNow(-36);
  const tShipped = isoFromNow(-24);
  const tDelivered = isoFromNow(-6);

  return [
    {
      label: "pendiente_entrega",
      status: "Pendiente entrega caja vacía",
      empty_box_delivered_at: null,
      full_box_collected_at: null,
      office_received_at: null,
      departed_at: null,
      shipped_at: null,
      delivered_at: null,
      paid: 0,
      plan: basePlan(
        box,
        {
          mode: EMPTY_BOX_DRIVER,
          label: "empty_box",
          handingNow: null,
          scheduleAt: null,
          scheduleMode: "pending",
          driverTaskType: "deliver_empty_box",
          driverTaskNeeded: true,
          warehouseId,
        },
        {
          mode: "",
          label: "full_box",
          deferred: true,
          scheduleAt: null,
          scheduleMode: null,
          driverTaskType: null,
          driverTaskNeeded: false,
        },
        "Caja vacia: Programar entrega de caja vacia - pendiente | Caja llena: Recolección pendiente",
      ),
    },
    {
      label: "pendiente_recoleccion",
      status: "Pendiente recolección caja llena",
      empty_box_delivered_at: tEmpty,
      full_box_collected_at: null,
      office_received_at: null,
      departed_at: null,
      shipped_at: null,
      delivered_at: null,
      paid: 20,
      plan: basePlan(
        box,
        {
          mode: EMPTY_BOX_OFFICE,
          label: "empty_box",
          handingNow: true,
          scheduleAt: null,
          scheduleMode: null,
          driverTaskType: null,
          stockDeductedAt: tEmpty,
          driverTaskNeeded: false,
          warehouseId,
        },
        {
          mode: FULL_BOX_DRIVER,
          label: "full_box",
          deferred: false,
          scheduleAt: null,
          scheduleMode: "pending",
          driverTaskType: "pickup_full_box",
          driverTaskNeeded: true,
        },
        "Caja vacia: Caja vacia entregada en mostrador | Caja llena: Programar recoleccion caja llena - pendiente",
      ),
    },
    {
      label: "en_oficina",
      status: "En oficina",
      empty_box_delivered_at: tEmpty,
      full_box_collected_at: tOffice,
      office_received_at: tOffice,
      departed_at: null,
      shipped_at: null,
      delivered_at: null,
      paid: 20,
      plan: basePlan(
        box,
        {
          mode: EMPTY_BOX_OFFICE,
          label: "empty_box",
          handingNow: true,
          scheduleAt: null,
          scheduleMode: null,
          driverTaskType: null,
          stockDeductedAt: tEmpty,
          driverTaskNeeded: false,
          warehouseId,
        },
        {
          mode: FULL_BOX_OFFICE,
          label: "full_box",
          deferred: false,
          scheduleAt: null,
          scheduleMode: null,
          driverTaskType: null,
          driverTaskNeeded: false,
        },
        "Caja vacia: Caja vacia entregada en mostrador | Caja llena: Cliente trae caja llena a oficina",
      ),
    },
    {
      label: "pickup",
      status: "Pickup",
      empty_box_delivered_at: tEmpty,
      full_box_collected_at: tFull,
      office_received_at: tOffice,
      departed_at: tDeparted,
      shipped_at: null,
      delivered_at: null,
      paid: 50,
      plan: basePlan(
        box,
        {
          mode: EMPTY_BOX_OFFICE,
          label: "empty_box",
          handingNow: true,
          scheduleAt: null,
          scheduleMode: null,
          driverTaskType: null,
          stockDeductedAt: tEmpty,
          driverTaskNeeded: false,
          warehouseId,
        },
        {
          mode: FULL_BOX_OFFICE,
          label: "full_box",
          deferred: false,
          scheduleAt: null,
          scheduleMode: null,
          driverTaskType: null,
          driverTaskNeeded: false,
        },
        "Caja vacia: Caja vacia entregada en mostrador | Caja llena: Cliente trae caja llena a oficina",
      ),
    },
    {
      label: "enviado",
      status: "Enviado",
      empty_box_delivered_at: tEmpty,
      full_box_collected_at: tFull,
      office_received_at: tOffice,
      departed_at: tDeparted,
      shipped_at: tShipped,
      delivered_at: null,
      paid: 50,
      plan: basePlan(
        box,
        {
          mode: EMPTY_BOX_OFFICE,
          label: "empty_box",
          handingNow: true,
          scheduleAt: null,
          scheduleMode: null,
          driverTaskType: null,
          stockDeductedAt: tEmpty,
          driverTaskNeeded: false,
          warehouseId,
        },
        {
          mode: FULL_BOX_OFFICE,
          label: "full_box",
          deferred: false,
          scheduleAt: null,
          scheduleMode: null,
          driverTaskType: null,
          driverTaskNeeded: false,
        },
        "Caja vacia: Caja vacia entregada en mostrador | Caja llena: Cliente trae caja llena a oficina",
      ),
    },
    {
      label: "entregado",
      status: "Entregado",
      empty_box_delivered_at: tEmpty,
      full_box_collected_at: tFull,
      office_received_at: tOffice,
      departed_at: tDeparted,
      shipped_at: tShipped,
      delivered_at: tDelivered,
      paid: 50,
      plan: basePlan(
        box,
        {
          mode: EMPTY_BOX_OFFICE,
          label: "empty_box",
          handingNow: true,
          scheduleAt: null,
          scheduleMode: null,
          driverTaskType: null,
          stockDeductedAt: tEmpty,
          driverTaskNeeded: false,
          warehouseId,
        },
        {
          mode: FULL_BOX_OFFICE,
          label: "full_box",
          deferred: false,
          scheduleAt: null,
          scheduleMode: null,
          driverTaskType: null,
          driverTaskNeeded: false,
        },
        "Caja vacia: Caja vacia entregada en mostrador | Caja llena: Cliente trae caja llena a oficina",
      ),
    },
  ];
}

async function ensureContext(client, orgId) {
  const owner = await client.query(
    `
      select p.id
      from public.profiles p
      join public.roles r on r.id = p.role_id
      where p.organization_id = $1 and p.is_active = true
      order by case when r.slug = 'administrador' then 0 else 1 end, p.created_at asc
      limit 1
    `,
    [orgId],
  );
  if (!owner.rowCount) throw new Error("No hay usuario activo.");

  const warehouse = await client.query(
    `
      select id from public.warehouses
      where organization_id = $1
      order by is_default desc, created_at asc
      limit 1
    `,
    [orgId],
  );

  const recipients = await client.query(
    `
      select
        c.id as customer_id,
        c.first_name,
        c.last_name,
        c.lat,
        c.lng,
        r.id as recipient_id,
        r.first_name as recipient_first,
        r.last_name as recipient_last,
        r.country as recipient_country,
        r.street as recipient_street,
        r.house_number as recipient_house,
        r.neighborhood as recipient_neighborhood,
        r.city as recipient_city,
        r.state as recipient_state,
        r.postal_code as recipient_postal,
        r.phone as recipient_phone
      from public.customers c
      join public.customer_recipients r on r.customer_id = c.id
      where c.organization_id = $1
      order by c.created_at, r.created_at
      offset 10
      limit 12
    `,
    [orgId],
  );

  if (recipients.rows.length < 6) {
    throw new Error(`Se necesitan al menos 6 destinatarios; hay ${recipients.rows.length}.`);
  }

  return {
    orgId,
    ownerId: owner.rows[0].id,
    warehouseId: warehouse.rows[0]?.id ?? null,
    recipients: recipients.rows,
  };
}

async function nextInvoiceNumber(client, orgId, ownerId) {
  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claims', $1, true)", [
    JSON.stringify({ sub: ownerId, role: "authenticated" }),
  ]);
  try {
    const { rows } = await client.query(
      "select public.next_organization_invoice_number($1) as last_number",
      [orgId],
    );
    return `INV-${String(rows[0].last_number).padStart(6, "0")}`;
  } finally {
    await client.query("select set_config('request.jwt.claims', '', true)");
    await client.query("reset role");
  }
}

function recipientSnapshot(row) {
  return {
    lat: row.lat ?? 0,
    lng: row.lng ?? 0,
    city: row.recipient_city,
    phone: row.recipient_phone,
    state: row.recipient_state,
    street: row.recipient_street,
    country: row.recipient_country,
    placeId: "",
    lastName: row.recipient_last,
    firstName: row.recipient_first,
    postalCode: row.recipient_postal,
    houseNumber: row.recipient_house,
    neighborhood: row.recipient_neighborhood,
    formattedAddress: "",
  };
}

async function main() {
  const { client, label } = await connectPg();
  try {
    const org = await resolveScgsOrgId(client);
    const context = await ensureContext(client, org.id);
    const gallery = scenarios(context.warehouseId);

    await client.query("begin");
    const created = [];

    for (let index = 0; index < gallery.length; index += 1) {
      const scenario = gallery[index];
      const row = context.recipients[index];
      const code = await nextInvoiceNumber(client, context.orgId, context.ownerId);
      const snapshot = recipientSnapshot(row);
      const customerName = `Demo ${
        scenario.status === "Pendiente entrega caja vacía"
          ? "Entrega pendiente"
          : scenario.status === "Pendiente recolección caja llena"
            ? "Recolección pendiente"
            : scenario.status
      }`;
      const invoiceStatus = scenario.paid >= 50 ? "paid" : "open";
      const accountingStatus = scenario.paid >= 50 ? "exportable" : "not_exportable";
      const finalizedAt = scenario.status === "Entregado" ? scenario.delivered_at : null;

      await client.query(
        `
          insert into public.shipments (
            organization_id, code, customer_id, recipient_id, recipient_snapshot, customer_name, country,
            carrier, paid, profit, status, assigned_to, created_by, sales_owner_id, sale_kind,
            invoice_status, accounting_status, finalized_at, empty_box_delivered_at,
            full_box_collected_at, office_received_at, departed_at, shipped_at, delivered_at,
            delivery_notes, logistics_plan, created_at
          )
          values (
            $1,$2,$3,$4,$5,$6,$7,$8,$9,0,$10,null,$11,$11,'full',
            $12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23
          )
        `,
        [
          context.orgId,
          code,
          row.customer_id,
          row.recipient_id,
          JSON.stringify(snapshot),
          customerName,
          row.recipient_country || "Mexico",
          "(1) 16x16x16",
          scenario.paid,
          scenario.status,
          context.ownerId,
          invoiceStatus,
          accountingStatus,
          finalizedAt,
          scenario.empty_box_delivered_at,
          scenario.full_box_collected_at,
          scenario.office_received_at,
          scenario.departed_at,
          scenario.shipped_at,
          scenario.delivered_at,
          scenario.plan.summary,
          JSON.stringify(scenario.plan),
          isoFromNow(-120 + index * 4),
        ],
      );

      created.push({ code, customer_name: customerName, status: scenario.status, label: scenario.label });
    }

    await client.query("commit");

    console.log(`OK: ${created.length} invoices (galería de estados) · ${label} · ${org.name}`);
    for (const row of created) {
      console.log(`- ${row.code} · ${row.customer_name} · ${row.status}`);
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
