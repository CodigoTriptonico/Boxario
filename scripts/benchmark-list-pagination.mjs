import { connectPg } from "./lib/db-connection.mjs";

/**
 * Lightweight pagination benchmark (Phase 3C).
 * Seeds temporary rows in a transaction and ROLLS BACK — no permanent pollution.
 * Exit 0 always when the script finishes (benchmark, not a CI gate).
 */

const SEED_COUNT = 600;
const OFFSETS = [0, 500, 5000];
const LIMIT = 50;

function hrMs(start) {
  const [s, ns] = process.hrtime(start);
  return Number((s * 1000 + ns / 1e6).toFixed(2));
}

async function timedQuery(client, label, sql, params) {
  const start = process.hrtime();
  const result = await client.query(sql, params);
  return {
    label,
    ms: hrMs(start),
    rows: result.rowCount ?? result.rows.length,
  };
}

function printTable(rows) {
  const cols = ["table", "offset", "ms", "rows", "notes"];
  const widths = cols.map((c) =>
    Math.max(c.length, ...rows.map((r) => String(r[c] ?? "").length)),
  );
  const line = (vals) =>
    vals.map((v, i) => String(v).padEnd(widths[i])).join("  ");
  console.log(line(cols));
  console.log(widths.map((w) => "-".repeat(w)).join("  "));
  for (const r of rows) {
    console.log(line(cols.map((c) => r[c] ?? "")));
  }
}

async function main() {
  const { client, label } = await connectPg();
  console.log(`benchmark:pagination — ${label}`);
  console.log(`seed=${SEED_COUNT} (txn + rollback); measure LIMIT ${LIMIT}`);

  const fixture = await client.query(`
    SELECT
      o.id::text AS org_id,
      w.id::text AS warehouse_id,
      i.id::text AS item_id,
      i.name AS item_name,
      r.id::text AS route_id,
      n.recipient_id::text AS recipient_id
    FROM public.organizations o
    JOIN public.warehouses w ON w.organization_id = o.id
    JOIN public.inventory_items i ON i.organization_id = o.id
    LEFT JOIN public.logistics_routes r ON r.organization_id = o.id
    LEFT JOIN public.logistics_route_notifications n ON n.organization_id = o.id
    ORDER BY o.id
    LIMIT 1
  `);

  if (!fixture.rows[0]) {
    console.log("No org/warehouse/item fixture found. Measuring only EXPLAIN on empty tables.");
    await client.end();
    return;
  }

  const { org_id, warehouse_id, item_id, item_name, route_id, recipient_id } =
    fixture.rows[0];
  console.log(`fixture org=${org_id.slice(0, 8)}… wh=${warehouse_id.slice(0, 8)}…`);

  const tableRows = [];

  await client.query("BEGIN");
  try {
    // Disable triggers that might enforce stock/auth side effects during bulk seed.
    // Keep FK checks; we only insert list-shape rows and roll back.
    await client.query("SET LOCAL session_replication_role = replica");

    await client.query(
      `
      INSERT INTO public.logistics_routes (organization_id, route_date, name, status, warehouse_id, created_at)
      SELECT
        $1::uuid,
        (CURRENT_DATE - ((gs % 30)::int)),
        'bench-route-' || gs,
        CASE WHEN gs % 3 = 0 THEN 'planned' ELSE 'draft' END,
        $2::uuid,
        now() - (gs || ' seconds')::interval
      FROM generate_series(1, $3::int) AS gs
      `,
      [org_id, warehouse_id, SEED_COUNT],
    );

    await client.query(
      `
      INSERT INTO public.shipments (
        organization_id, code, customer_name, country, carrier, status, created_at
      )
      SELECT
        $1::uuid,
        'BENCH-' || gs,
        'Bench Customer ' || gs,
        'US',
        'local',
        'Pendiente',
        now() - (gs || ' seconds')::interval
      FROM generate_series(1, $2::int) AS gs
      `,
      [org_id, SEED_COUNT],
    );

    await client.query(
      `
      INSERT INTO public.inventory_movements (
        organization_id, warehouse_id, item_id, item_name, type, qty, note, created_at, reason_code
      )
      SELECT
        $1::uuid,
        $2::uuid,
        $3::uuid,
        $4,
        'entrada',
        1,
        'bench',
        now() - (gs || ' seconds')::interval,
        'manual_entry'
      FROM generate_series(1, $5::int) AS gs
      `,
      [org_id, warehouse_id, item_id, item_name, SEED_COUNT],
    );

    const counts = await client.query(
      `
      SELECT
        (SELECT count(*)::int FROM public.logistics_routes WHERE organization_id = $1) AS routes,
        (SELECT count(*)::int FROM public.shipments WHERE organization_id = $1) AS shipments,
        (SELECT count(*)::int FROM public.inventory_movements
          WHERE organization_id = $1 AND warehouse_id = $2) AS movements
      `,
      [org_id, warehouse_id],
    );
    console.log("dataset in txn:", counts.rows[0]);

    for (const offset of OFFSETS) {
      const route = await timedQuery(
        client,
        "routes",
        `
        SELECT id FROM public.logistics_routes
        WHERE organization_id = $1 AND status = 'planned'
        ORDER BY route_date DESC, created_at DESC, id DESC
        LIMIT $2 OFFSET $3
        `,
        [org_id, LIMIT, offset],
      );
      tableRows.push({
        table: "logistics_routes",
        offset,
        ms: route.ms,
        rows: route.rows,
        notes: offset > SEED_COUNT ? "offset>seed" : "",
      });

      const ship = await timedQuery(
        client,
        "shipments",
        `
        SELECT id FROM public.shipments
        WHERE organization_id = $1
        ORDER BY created_at DESC, id DESC
        LIMIT $2 OFFSET $3
        `,
        [org_id, LIMIT, offset],
      );
      tableRows.push({
        table: "shipments",
        offset,
        ms: ship.ms,
        rows: ship.rows,
        notes: offset > SEED_COUNT ? "offset>seed" : "",
      });

      const mov = await timedQuery(
        client,
        "movements",
        `
        SELECT id FROM public.inventory_movements
        WHERE organization_id = $1 AND warehouse_id = $2
        ORDER BY created_at DESC, id DESC
        LIMIT $3 OFFSET $4
        `,
        [org_id, warehouse_id, LIMIT, offset],
      );
      tableRows.push({
        table: "inventory_movements",
        offset,
        ms: mov.ms,
        rows: mov.rows,
        notes: offset > SEED_COUNT ? "offset>seed" : "",
      });
    }

    // One EXPLAIN ANALYZE sample at OFFSET 0 for routes (index evidence).
    const explain = await client.query(
      `
      EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT id FROM public.logistics_routes
      WHERE organization_id = $1 AND status = 'planned'
      ORDER BY route_date DESC, created_at DESC, id DESC
      LIMIT 50 OFFSET 0
      `,
      [org_id],
    );
    console.log("\nEXPLAIN ANALYZE logistics_routes (OFFSET 0, seeded txn):");
    for (const row of explain.rows) console.log(row["QUERY PLAN"]);

    if (route_id && recipient_id) {
      const notifExplain = await client.query(
        `
        EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
        SELECT id FROM public.logistics_route_notifications
        WHERE organization_id = $1 AND recipient_id = $2
        ORDER BY created_at DESC, id DESC
        LIMIT 50 OFFSET 0
        `,
        [org_id, recipient_id],
      );
      console.log("\nEXPLAIN ANALYZE logistics_route_notifications (existing data):");
      for (const row of notifExplain.rows) console.log(row["QUERY PLAN"]);
    }

    const stockExplain = await client.query(
      `
      EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT)
      SELECT id FROM public.inventory_stock
      WHERE organization_id = $1 AND warehouse_id = $2
      ORDER BY id ASC
      LIMIT 100 OFFSET 0
      `,
      [org_id, warehouse_id],
    );
    console.log("\nEXPLAIN ANALYZE inventory_stock (existing data):");
    for (const row of stockExplain.rows) console.log(row["QUERY PLAN"]);
  } finally {
    await client.query("ROLLBACK");
    console.log("\nROLLBACK — no permanent rows left.");
  }

  console.log("");
  printTable(tableRows);
  console.log(
    "\nNote: seed is ~600 rows (not 10k). OFFSET 5000 returns 0 rows; deep-offset cost is not fully exercised.",
  );
  console.log("Honest extrapolation: with covering indexes, Index Scan + Limit stays cheap;");
  console.log("OFFSET deep scans still walk skipped rows — keyset pagination is the real fix at 10k+.");

  await client.end();
}

main().catch(async (error) => {
  console.error("benchmark failed:", error?.message || error);
  // Still exit 0 — benchmark is observational, not a gate.
  process.exitCode = 0;
});
