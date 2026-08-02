/**
 * Catálogo demo SCGS: países con precio por caja y un destinatario por país
 * para cada remitente existente.
 * Uso: node scripts/seed-scgs-demo-catalog.mjs
 */
import { randomUUID } from "node:crypto";
import { connectPg } from "./lib/db-connection.mjs";
import {
  BOX_SIZES,
  COUNTRIES,
  boxPricingForCountry,
  normalizeCountryName,
  recipientForSenderIndexed,
  resolveScgsOrgId,
} from "./lib/scgs-demo-recipients.mjs";

const CATEGORY_NAME = "cajas";

function normalizeLabel(value) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function catalogKey(kind) {
  return [normalizeLabel(CATEGORY_NAME), normalizeLabel(kind), ""].join("|");
}

function collectLeafNames(items) {
  const names = new Set();

  for (const item of items || []) {
    if (item.children !== undefined) {
      for (const child of item.children || []) {
        names.add(normalizeLabel(child.name));
      }
      continue;
    }

    names.add(normalizeLabel(item.name));
  }

  return names;
}

function mergeDirectBoxSizes(treeData) {
  const existing = collectLeafNames(treeData);
  const next = [...(treeData || [])];

  for (const box of BOX_SIZES) {
    if (existing.has(normalizeLabel(box.name))) {
      continue;
    }

    next.push({ id: randomUUID(), name: box.name });
    existing.add(normalizeLabel(box.name));
  }

  return next;
}

const { client } = await connectPg();

try {
  const org = await resolveScgsOrgId(client);
  const orgId = org.id;

  console.log(`Sembrando catálogo demo para: ${org.name}\n`);

  await client.query("BEGIN");

  const categoryRow = await client.query(
    `SELECT id, name, tree_data
     FROM public.inventory_categories
     WHERE organization_id = $1
       AND lower(name) = lower($2)
     LIMIT 1`,
    [orgId, CATEGORY_NAME],
  );

  const treeData = mergeDirectBoxSizes(categoryRow.rows[0]?.tree_data);

  if (!categoryRow.rows.length) {
    await client.query(
      `INSERT INTO public.inventory_categories (organization_id, name, tree_data)
       VALUES ($1, $2, $3::jsonb)`,
      [orgId, CATEGORY_NAME, JSON.stringify(treeData)],
    );
    console.log("OK: categoría cajas creada");
  } else {
    await client.query(
      `UPDATE public.inventory_categories
       SET name = $1, tree_data = $2::jsonb
       WHERE id = $3`,
      [CATEGORY_NAME, JSON.stringify(treeData), categoryRow.rows[0].id],
    );
    console.log("OK: categoría cajas actualizada");
  }

  const countryIds = new Map();

  for (const [index, country] of COUNTRIES.entries()) {
    const existing = await client.query(
      `SELECT id, name FROM public.pricing_countries
       WHERE organization_id = $1
         AND (
           code = $2
           OR lower(translate(name, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU')) =
              lower(translate($3, 'áéíóúÁÉÍÓÚ', 'aeiouAEIOU'))
         )
       LIMIT 1`,
      [orgId, country.code, country.name],
    );

    if (existing.rows.length) {
      countryIds.set(country.name, existing.rows[0].id);
      await client.query(
        `UPDATE public.pricing_countries
         SET code = $1, name = $2, delivery_time = $3, sort_order = $4
         WHERE id = $5`,
        [country.code, country.name, country.deliveryTime, index, existing.rows[0].id],
      );
      console.log(`País existente: ${country.name}`);
      continue;
    }

    const inserted = await client.query(
      `INSERT INTO public.pricing_countries (
        organization_id, code, name, delivery_time, sort_order
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING id`,
      [orgId, country.code, country.name, country.deliveryTime, index],
    );

    countryIds.set(country.name, inserted.rows[0].id);
    console.log(`País nuevo: ${country.name}`);
  }

  let boxesInserted = 0;
  let boxesUpdated = 0;

  for (const country of COUNTRIES) {
    const countryId = countryIds.get(country.name);

    for (const box of BOX_SIZES) {
      const key = catalogKey(box.name);
      const { price, cost } = boxPricingForCountry(box, country);
      const exists = await client.query(
        `SELECT id FROM public.pricing_country_boxes
         WHERE country_id = $1 AND catalog_key = $2`,
        [countryId, key],
      );

      if (exists.rows.length) {
        await client.query(
          `UPDATE public.pricing_country_boxes
           SET size = $1, price = $2, cost = $3
           WHERE id = $4`,
          [box.name, price, cost, exists.rows[0].id],
        );
        boxesUpdated += 1;
        continue;
      }

      await client.query(
        `INSERT INTO public.pricing_country_boxes (
          organization_id, country_id, size, price, cost, catalog_key
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [orgId, countryId, box.name, price, cost, key],
      );
      boxesInserted += 1;
    }
  }

  console.log(`Precios: ${boxesInserted} nuevos, ${boxesUpdated} actualizados`);

  const senders = await client.query(
    `SELECT id, first_name, last_name
     FROM public.customers
     WHERE organization_id = $1
     ORDER BY created_at, last_name, first_name`,
    [orgId],
  );

  if (!senders.rows.length) {
    console.log("Sin remitentes. Ejecuta primero: npm run db:seed:senders");
  }

  const existingRecipients = await client.query(
    `SELECT customer_id, country
     FROM public.customer_recipients
     WHERE organization_id = $1`,
    [orgId],
  );

  const senderCountryPairs = new Set(
    existingRecipients.rows.map(
      (row) => `${row.customer_id}|${normalizeCountryName(row.country)}`,
    ),
  );

  let recipientsInserted = 0;
  let recipientsSkipped = 0;

  for (const [senderIndex, sender] of senders.rows.entries()) {
    for (const [countryIndex, country] of COUNTRIES.entries()) {
      const pairKey = `${sender.id}|${normalizeCountryName(country.name)}`;

      if (senderCountryPairs.has(pairKey)) {
        recipientsSkipped += 1;
        continue;
      }

      const recipient = recipientForSenderIndexed(
        sender,
        country.name,
        senderIndex,
        countryIndex,
      );

      await client.query(
        `INSERT INTO public.customer_recipients (
          organization_id, customer_id,
          first_name, last_name, phone, country, country_id,
          street, house_number, neighborhood, city, state, postal_code
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
        [
          orgId,
          sender.id,
          recipient.first_name,
          recipient.last_name,
          recipient.phone,
          country.name,
          countryIds.get(country.name),
          recipient.street,
          recipient.house_number,
          recipient.neighborhood,
          recipient.city,
          recipient.state,
          recipient.postal_code,
        ],
      );

      senderCountryPairs.add(pairKey);
      recipientsInserted += 1;
      console.log(
        `Destinatario: ${sender.first_name} ${sender.last_name} → ${recipient.first_name} ${recipient.last_name} (${country.name})`,
      );
    }
  }

  await client.query("COMMIT");

  const summary = await client.query(
    `SELECT
       (SELECT count(*)::int FROM public.pricing_countries WHERE organization_id = $1) AS countries,
       (SELECT count(*)::int FROM public.pricing_country_boxes WHERE organization_id = $1) AS country_boxes,
       (SELECT count(*)::int FROM public.customers WHERE organization_id = $1) AS senders,
       (SELECT count(*)::int FROM public.customer_recipients WHERE organization_id = $1) AS recipients`,
    [orgId],
  );

  console.log("\n--- Resumen ---");
  console.log(`Países: ${summary.rows[0].countries}`);
  console.log(`Cajas en precios: ${summary.rows[0].country_boxes}`);
  console.log(`Remitentes: ${summary.rows[0].senders}`);
  console.log(`Destinatarios insertados: ${recipientsInserted} (omitidos: ${recipientsSkipped})`);
  console.log(`Total destinatarios: ${summary.rows[0].recipients}`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
