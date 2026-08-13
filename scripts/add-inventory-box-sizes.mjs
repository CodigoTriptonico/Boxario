/**
 * Agrega cajas por medida (ej. 14x14x14) al árbol de inventario y crea stock en bodega.
 * Sin argumentos usa la org SCGS y el catálogo demo compartido.
 * Uso: node scripts/add-inventory-box-sizes.mjs [orgId] [14x14x14 16x16x16 ...]
 */
import { randomUUID } from "node:crypto";
import { connectPg } from "./lib/db-connection.mjs";
import { BOX_SIZES, resolveScgsOrgId } from "./lib/scgs-demo-recipients.mjs";

const DEFAULT_CATEGORY = "cajas";
const DEFAULT_SIZES = BOX_SIZES.map((box) => box.name);

function normalizeLabel(value) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
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

function addDirectItemsToTree(treeData, sizes) {
  const existing = collectLeafNames(treeData);
  const next = [...(treeData || [])];

  for (const size of sizes) {
    if (existing.has(normalizeLabel(size))) {
      continue;
    }

    next.push({ id: randomUUID(), name: size });
    existing.add(normalizeLabel(size));
  }

  return next;
}

const explicitOrgId = process.argv[2];
const sizes = process.argv.length > 3 ? process.argv.slice(3) : DEFAULT_SIZES;

const { client } = await connectPg();

try {
  let org;

  if (explicitOrgId) {
    const orgCheck = await client.query(
      "SELECT id, name FROM public.organizations WHERE id = $1",
      [explicitOrgId],
    );

    if (!orgCheck.rows.length) {
      console.error("No se encontró la organización.");
      process.exit(1);
    }

    org = orgCheck.rows[0];
  } else {
    org = await resolveScgsOrgId(client);
  }

  const orgId = org.id;

  console.log(`Agregando cajas a: ${org.name}`);
  console.log(`Medidas: ${sizes.join(", ")}\n`);

  await client.query("BEGIN");

  const categoryRow = await client.query(
    `SELECT id, name, tree_data
     FROM public.inventory_categories
     WHERE organization_id = $1
       AND lower(name) = lower($2)
     LIMIT 1`,
    [orgId, DEFAULT_CATEGORY],
  );

  let categoryId;
  let treeData;

  if (!categoryRow.rows.length) {
    categoryId = randomUUID();
    treeData = sizes.map((size) => ({ id: randomUUID(), name: size }));

    await client.query(
      `INSERT INTO public.inventory_categories (id, organization_id, name, tree_data)
       VALUES ($1, $2, $3, $4::jsonb)`,
      [categoryId, orgId, DEFAULT_CATEGORY, JSON.stringify(treeData)],
    );
    console.log(`Categoría "${DEFAULT_CATEGORY}" creada`);
  } else {
    categoryId = categoryRow.rows[0].id;
    treeData = addDirectItemsToTree(categoryRow.rows[0].tree_data, sizes);

    await client.query(
      `UPDATE public.inventory_categories
       SET tree_data = $1::jsonb
       WHERE id = $2`,
      [JSON.stringify(treeData), categoryId],
    );
    console.log(`Árbol de "${DEFAULT_CATEGORY}" actualizado`);
  }

  let warehouses = await client.query(
    `SELECT id, name FROM public.warehouses
     WHERE organization_id = $1 AND is_active = true
     ORDER BY is_default DESC, name`,
    [orgId],
  );

  if (!warehouses.rows.length) {
    await client.query(
      `INSERT INTO public.warehouses (organization_id, name, code, is_default, is_active)
       VALUES ($1, 'Bodega principal', 'MAIN', true, true)`,
      [orgId],
    );
    warehouses = await client.query(
      `SELECT id, name FROM public.warehouses
       WHERE organization_id = $1 AND is_active = true
       ORDER BY is_default DESC, name`,
      [orgId],
    );
    console.log('Bodega principal creada por defecto');
  }

  let itemsCreated = 0;
  let stockCreated = 0;

  for (const size of sizes) {
    let itemRow = await client.query(
      `SELECT id FROM public.inventory_items
       WHERE organization_id = $1
         AND category_id = $2
         AND lower(kind) = lower($3)
         AND subcategory IS NULL
       LIMIT 1`,
      [orgId, categoryId, size],
    );

    let itemId = itemRow.rows[0]?.id;

    if (!itemId) {
      itemId = randomUUID();
      await client.query(
        `INSERT INTO public.inventory_items (
           id, organization_id, category_id, name, kind, subcategory
         ) VALUES ($1, $2, $3, $4, $5, NULL)`,
        [itemId, orgId, categoryId, size, size],
      );
      itemsCreated += 1;
      console.log(`  Item creado: ${size}`);
    } else {
      console.log(`  Item existente: ${size}`);
    }

    for (const warehouse of warehouses.rows) {
      const stockRow = await client.query(
        `SELECT id FROM public.inventory_stock
         WHERE warehouse_id = $1 AND item_id = $2
         LIMIT 1`,
        [warehouse.id, itemId],
      );

      if (stockRow.rows.length) {
        continue;
      }

      await client.query(
        `INSERT INTO public.inventory_stock (
           organization_id, warehouse_id, item_id, stock, reserved, assigned, unavailable, min_stock
         ) VALUES ($1, $2, $3, 0, 0, 0, 0, 2)`,
        [orgId, warehouse.id, itemId],
      );
      stockCreated += 1;
    }
  }

  await client.query("COMMIT");

  console.log(`\nListo. Items nuevos: ${itemsCreated}, filas de stock nuevas: ${stockCreated}`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
