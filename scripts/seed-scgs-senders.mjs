/**
 * Inserta remitentes de prueba para la org SCGS (desarrollo local).
 * Siembra los primeros `SCGS_DEMO_SENDERS` del catálogo (5 por defecto).
 * Uso: node scripts/seed-scgs-senders.mjs
 */
import { connectPg } from "./lib/db-connection.mjs";
import { resolveScgsOrgId } from "./lib/scgs-demo-recipients.mjs";

const DEFAULT_SENDER_COUNT = 5;

const SENDER_CATALOG = [
  {
    first_name: "Maria",
    last_name: "Gonzalez",
    phones: ["+1-661-255-4821"],
    email: "maria.gonzalez@gmail.com",
    street: "Valencia Blvd",
    house_number: "24516",
    neighborhood: "Valencia",
    city: "Santa Clarita",
    state: "CA",
    postal_code: "91355",
  },
  {
    first_name: "Roberto",
    last_name: "Mendoza",
    phones: ["+1-661-298-7340"],
    email: "roberto.mendoza@yahoo.com",
    street: "Soledad Canyon Rd",
    house_number: "18808",
    neighborhood: "Canyon Country",
    city: "Santa Clarita",
    state: "CA",
    postal_code: "91351",
  },
  {
    first_name: "Ana",
    last_name: "Martinez",
    phones: ["+1-661-259-1167"],
    email: "ana.martinez@outlook.com",
    street: "Main St",
    house_number: "24300",
    neighborhood: "Newhall",
    city: "Santa Clarita",
    state: "CA",
    postal_code: "91321",
  },
  {
    first_name: "Carlos",
    last_name: "Ramirez",
    phones: ["+1-661-287-9034"],
    email: "carlos.ramirez@gmail.com",
    street: "McBean Pkwy",
    house_number: "27180",
    neighborhood: "Valencia",
    city: "Santa Clarita",
    state: "CA",
    postal_code: "91354",
  },
  {
    first_name: "Lucia",
    last_name: "Herrera",
    phones: ["+1-661-296-5512"],
    email: "lucia.herrera@icloud.com",
    street: "Seco Canyon Rd",
    house_number: "27945",
    neighborhood: "Saugus",
    city: "Santa Clarita",
    state: "CA",
    postal_code: "91350",
  },
  {
    first_name: "Jorge",
    last_name: "Silva",
    phones: ["+1-661-254-8803"],
    email: "jorge.silva@gmail.com",
    street: "Newhall Ave",
    house_number: "23618",
    neighborhood: "Newhall",
    city: "Santa Clarita",
    state: "CA",
    postal_code: "91321",
  },
  {
    first_name: "Patricia",
    last_name: "Lopez",
    phones: ["+1-661-290-4478"],
    email: "patricia.lopez@yahoo.com",
    street: "The Old Rd",
    house_number: "25868",
    neighborhood: "Stevenson Ranch",
    city: "Santa Clarita",
    state: "CA",
    postal_code: "91381",
  },
  {
    first_name: "Miguel",
    last_name: "Torres",
    phones: ["+1-661-753-2291"],
    email: "miguel.torres@outlook.com",
    street: "Town Center Dr",
    house_number: "24525",
    neighborhood: "Valencia",
    city: "Santa Clarita",
    state: "CA",
    postal_code: "91355",
  },
  {
    first_name: "Sandra",
    last_name: "Ruiz",
    phones: ["+1-661-297-6635"],
    email: "sandra.ruiz@gmail.com",
    street: "Bouquet Canyon Rd",
    house_number: "26650",
    neighborhood: "Saugus",
    city: "Santa Clarita",
    state: "CA",
    postal_code: "91350",
  },
  {
    first_name: "Fernando",
    last_name: "Castro",
    phones: ["+1-661-252-9146"],
    email: "fernando.castro@icloud.com",
    street: "Golden Valley Rd",
    house_number: "19205",
    neighborhood: "Canyon Country",
    city: "Santa Clarita",
    state: "CA",
    postal_code: "91387",
  },
];

function requestedSenderCount() {
  const raw = Number(process.env.SCGS_DEMO_SENDERS);
  if (!Number.isFinite(raw) || raw <= 0) {
    return DEFAULT_SENDER_COUNT;
  }

  return Math.min(Math.trunc(raw), SENDER_CATALOG.length);
}

const senders = SENDER_CATALOG.slice(0, requestedSenderCount());

const { client } = await connectPg();

const org = await resolveScgsOrgId(client);
const SCGS_ORG_ID = org.id;

console.log(`Sembrando ${senders.length} remitente(s) en: ${org.name}\n`);

let inserted = 0;

for (const sender of senders) {
  const exists = await client.query(
    `SELECT id FROM public.customers
     WHERE organization_id = $1
       AND lower(email) = lower($2)`,
    [SCGS_ORG_ID, sender.email],
  );

  if (exists.rows.length) {
    console.log(`Skip: ${sender.first_name} ${sender.last_name} (ya existe)`);
    continue;
  }

  await client.query(
    `INSERT INTO public.customers (
      organization_id, first_name, last_name, phones, email,
      street, house_number, neighborhood, city, state, postal_code, country
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'USA')`,
    [
      SCGS_ORG_ID,
      sender.first_name,
      sender.last_name,
      sender.phones,
      sender.email,
      sender.street,
      sender.house_number,
      sender.neighborhood,
      sender.city,
      sender.state,
      sender.postal_code,
    ],
  );

  inserted += 1;
  console.log(`OK: ${sender.first_name} ${sender.last_name} — ${sender.house_number} ${sender.street}, ${sender.neighborhood}`);
}

const total = await client.query(
  "SELECT count(*)::int AS total FROM public.customers WHERE organization_id = $1",
  [SCGS_ORG_ID],
);

console.log(`\nInsertados: ${inserted}. Total remitentes SCGS: ${total.rows[0].total}.`);

await client.end();
