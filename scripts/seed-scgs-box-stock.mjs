/**
 * Carga stock demo en cajas SCGS: la mayoría con cantidad, algunas en cero.
 * Uso: node scripts/seed-scgs-box-stock.mjs
 */
import { connectPg } from "./lib/db-connection.mjs";
import { resolveScgsOrgId } from "./lib/scgs-demo-recipients.mjs";

/** Cantidades por medida. Omitidas o en 0 = sin stock. */
const STOCK_BY_KIND = {
  "12x12x12": 48,
  "14x14x14": 36,
  "16x16x16": 28,
  "18x18x18": 22,
  "20x20x20": 18,
  "20x14x14": 14,
  "24x18x18": 10,
  "22x22x22": 0,
  "24x24x24": 0,
  "30x20x20": 0,
};

const { client } = await connectPg();

try {
  const org = await resolveScgsOrgId(client);

  const rows = await client.query(
    `SELECT s.id, s.stock, i.kind, i.name, w.name AS warehouse
     FROM public.inventory_stock s
     JOIN public.inventory_items i ON i.id = s.item_id
     JOIN public.warehouses w ON w.id = s.warehouse_id
     JOIN public.inventory_categories c ON c.id = i.category_id
     WHERE s.organization_id = $1
       AND lower(c.name) = 'cajas'
     ORDER BY i.kind, w.name`,
    [org.id],
  );

  if (!rows.rows.length) {
    throw new Error("No hay filas de stock para cajas. Ejecuta primero npm run db:seed:scgs-demo");
  }

  await client.query("BEGIN");

  let withStock = 0;
  let withoutStock = 0;

  for (const row of rows.rows) {
    const nextStock = STOCK_BY_KIND[row.kind];
    if (nextStock === undefined) {
      console.log(`Omitido (no en lista): ${row.kind}`);
      continue;
    }

    await client.query(
      `UPDATE public.inventory_stock
       SET stock = $1, min_stock = 2
       WHERE id = $2`,
      [nextStock, row.id],
    );

    if (nextStock > 0) {
      withStock += 1;
      console.log(`OK ${row.kind}: ${nextStock} en ${row.warehouse}`);
    } else {
      withoutStock += 1;
      console.log(`Sin stock ${row.kind} en ${row.warehouse}`);
    }
  }

  await client.query("COMMIT");

  console.log("\n--- Resumen ---");
  console.log(`Con stock: ${withStock}`);
  console.log(`Sin stock: ${withoutStock}`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
