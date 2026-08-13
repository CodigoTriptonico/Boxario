/**
 * Exhaustive office payment idempotency harness (migrations 170 + 175).
 * Usage: node scripts/test-office-payment-idempotency.mjs
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { connectPg } from "./lib/db-connection.mjs";
import { seedTwoTenantLogisticsFixture } from "./lib/phase1-two-tenant-fixture.mjs";

const { client, label } = await connectPg();
console.log(`Office payment idempotency tests on ${label}`);

async function clearAuth(target = client) {
  try {
    await target.query("reset role");
  } catch {
    // ignore
  }
  try {
    await target.query("select set_config('request.jwt.claims', '', true)");
  } catch {
    // ignore
  }
}

async function authenticated(userId, task, target = client) {
  await target.query("set local role authenticated");
  await target.query("select set_config('request.jwt.claims', $1, true)", [
    JSON.stringify({ sub: userId, role: "authenticated" }),
  ]);
  try {
    return await task();
  } finally {
    await clearAuth(target);
  }
}

async function expectError(name, pattern, task) {
  const sp = `sp_${String(name).replace(/[^a-zA-Z0-9_]/g, "_")}`;
  await client.query(`savepoint ${sp}`);
  try {
    await task();
    assert.fail(`Expected error matching ${pattern}`);
  } catch (error) {
    assert.match(String(error.message), pattern);
  } finally {
    await client.query(`rollback to savepoint ${sp}`);
    await client.query(`release savepoint ${sp}`);
  }
}

async function createOpenInvoice(orgId, quotedTotal, codePrefix = "PAY") {
  const id = randomUUID();
  const code = `${codePrefix}-${id.slice(0, 8)}`;
  await client.query(
    `
    insert into public.shipments (
      id, organization_id, code, customer_name, country, carrier, paid, invoice_status, logistics_plan
    ) values ($1, $2, $3, $4, 'Mexico', 'QA', 0, 'open', $5::jsonb)
  `,
    [
      id,
      orgId,
      code,
      "Cliente pago QA",
      JSON.stringify({
        billing: {
          quotedTotal: String(quotedTotal),
          payNow: "0.00",
          balanceDue: String(quotedTotal),
        },
      }),
    ],
  );
  return { id, code, quotedTotal };
}

async function collect({
  shipmentId,
  orgId,
  amount,
  method = "cash",
  kind = "balance",
  note = "qa",
  userId,
  clientPaymentId,
  logisticsPlan,
  target = client,
}) {
  let plan = logisticsPlan;
  if (plan === undefined) {
    const loaded = await target.query(
      `select logistics_plan from public.shipments where id = $1`,
      [shipmentId],
    );
    plan = loaded.rows[0]?.logistics_plan ?? {};
  }
  const result = await target.query(
    `
    select public.collect_shipment_invoice_payment(
      $1, $2, 0, 0, 'full', 'open', 'not_exportable', null,
      $3::jsonb, $4, $5, $6, $7, $8, $9
    ) as result
  `,
    [
      shipmentId,
      orgId,
      JSON.stringify(plan),
      amount,
      method,
      kind,
      note,
      userId,
      clientPaymentId ?? null,
    ],
  );
  return result.rows[0].result;
}

async function paymentCountByKey(clientPaymentId, organizationId = null) {
  if (organizationId) {
    const r = await client.query(
      `
      select count(*)::int as n
      from public.shipment_payments
      where organization_id = $1 and client_payment_id = $2
    `,
      [organizationId, clientPaymentId],
    );
    return r.rows[0].n;
  }
  const r = await client.query(
    `
    select count(*)::int as n
    from public.shipment_payments
    where client_payment_id = $1
  `,
    [clientPaymentId],
  );
  return r.rows[0].n;
}

async function shipmentPaid(shipmentId) {
  const r = await client.query(`select paid, invoice_status from public.shipments where id = $1`, [
    shipmentId,
  ]);
  return {
    paid: Number(r.rows[0].paid),
    invoiceStatus: r.rows[0].invoice_status,
  };
}

const evidence = {
  sequentialRequests: 0,
  sequentialPayments: 0,
  sequentialReplays: 0,
  concurrentPairPayments: 0,
  multiCreated: 0,
  multiReplays: 0,
  conflictExtraPayments: 0,
  historicalNullOk: false,
  crossTenantBlocked: false,
  crossOrgKeyNamespaced: false,
};

await client.query("begin");

try {
  const { orgA, orgB } = await seedTwoTenantLogisticsFixture(client);
  const orgId = orgA.orgId;
  const adminId = orgA.adminId;
  const orgBId = orgB.orgId;
  const adminBId = orgB.adminId;

  const col = await client.query(`
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'shipment_payments'
      and column_name = 'client_payment_id'
  `);
  assert.equal(col.rowCount, 1, "client_payment_id column missing");

  const idx = await client.query(`
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'idx_shipment_payments_org_client_payment_id'
  `);
  assert.equal(idx.rowCount, 1, "org-scoped client_payment_id unique index missing");
  const globalIdx = await client.query(`
    select 1 from pg_indexes
    where schemaname = 'public'
      and indexname = 'idx_shipment_payments_client_payment_id_global'
  `);
  assert.equal(globalIdx.rowCount, 0, "global client_payment_id unique index should be dropped (migration 178)");

  const fn = await client.query(`
    select pg_get_function_result(p.oid) as result_type
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'collect_shipment_invoice_payment'
    order by p.oid desc
    limit 1
  `);
  assert.match(String(fn.rows[0]?.result_type || ""), /jsonb/i, "RPC must return jsonb");

  // 18. Historical payments without key
  const histShipment = await createOpenInvoice(orgId, 50, "HIST");
  await authenticated(adminId, async () => {
    const first = await collect({
      shipmentId: histShipment.id,
      orgId,
      amount: 5,
      userId: adminId,
      clientPaymentId: null,
      note: "historical-style",
    });
    assert.equal(first.replayed, false);
    const nullKeys = await client.query(
      `
      select count(*)::int as n
      from public.shipment_payments
      where organization_id = $1 and shipment_id = $2 and client_payment_id is null
    `,
      [orgId, histShipment.id],
    );
    assert.equal(nullKeys.rows[0].n, 1);
    evidence.historicalNullOk = true;
  });

  const invoice = await createOpenInvoice(orgId, 100, "IDEM");
  const key1 = `office-pay-${randomUUID()}`;

  // 1. First partial
  let created;
  await authenticated(adminId, async () => {
    created = await collect({
      shipmentId: invoice.id,
      orgId,
      amount: 10,
      userId: adminId,
      clientPaymentId: key1,
      method: "cash",
    });
  });
  assert.equal(created.replayed, false);
  assert.equal(await paymentCountByKey(key1, orgId), 1);
  assert.equal((await shipmentPaid(invoice.id)).paid, 10);

  // 2. Identical replay
  let replay;
  await authenticated(adminId, async () => {
    replay = await collect({
      shipmentId: invoice.id,
      orgId,
      amount: 10,
      userId: adminId,
      clientPaymentId: key1,
      method: "cash",
    });
  });
  assert.equal(replay.replayed, true);
  assert.equal(replay.paymentId, created.paymentId);
  assert.equal(await paymentCountByKey(key1, orgId), 1);
  assert.equal((await shipmentPaid(invoice.id)).paid, 10);

  // 3. 100 equivalent requests total (1 create + 99 replays)
  let replayHits = 1;
  for (let i = 0; i < 98; i += 1) {
    await authenticated(adminId, async () => {
      const r = await collect({
        shipmentId: invoice.id,
        orgId,
        amount: 10,
        userId: adminId,
        clientPaymentId: key1,
        method: "cash",
      });
      assert.equal(r.replayed, true);
      assert.equal(r.paymentId, created.paymentId);
      replayHits += 1;
    });
  }
  evidence.sequentialRequests = 100;
  evidence.sequentialPayments = await paymentCountByKey(key1, orgId);
  evidence.sequentialReplays = replayHits;
  assert.equal(evidence.sequentialPayments, 1);
  assert.equal(evidence.sequentialReplays, 99);
  assert.equal((await shipmentPaid(invoice.id)).paid, 10);

  // 17. Lost response after commit → replay
  await authenticated(adminId, async () => {
    const lost = await collect({
      shipmentId: invoice.id,
      orgId,
      amount: 10,
      userId: adminId,
      clientPaymentId: key1,
      method: "cash",
    });
    assert.equal(lost.replayed, true);
  });

  // 6. Different amount
  await authenticated(adminId, async () => {
    await expectError("e", /PAYMENT_IDEMPOTENCY_CONFLICT/i, async () => {
      await collect({
        shipmentId: invoice.id,
        orgId,
        amount: 11,
        userId: adminId,
        clientPaymentId: key1,
        method: "cash",
      });
    });
  });

  // 7. Different method
  await authenticated(adminId, async () => {
    await expectError("e", /PAYMENT_IDEMPOTENCY_CONFLICT/i, async () => {
      await collect({
        shipmentId: invoice.id,
        orgId,
        amount: 10,
        userId: adminId,
        clientPaymentId: key1,
        method: "card",
      });
    });
  });

  // 8. Different invoice
  const otherInvoice = await createOpenInvoice(orgId, 80, "OTHER");
  await authenticated(adminId, async () => {
    await expectError("e", /PAYMENT_IDEMPOTENCY_CONFLICT/i, async () => {
      await collect({
        shipmentId: otherInvoice.id,
        orgId,
        amount: 10,
        userId: adminId,
        clientPaymentId: key1,
        method: "cash",
      });
    });
  });
  assert.equal(await paymentCountByKey(key1, orgId), 1);
  evidence.conflictExtraPayments = 0;

  // 9. Same key string in another organization is a separate tenant intention
  // (org-scoped unique). Cross-tenant mutation of org A invoice remains blocked.
  const orgBInvoice = await createOpenInvoice(orgBId, 80, "ORGB");
  const orgBKeyReuse = key1; // same string, different org namespace
  await authenticated(adminBId, async () => {
    const orgBPay = await collect({
      shipmentId: orgBInvoice.id,
      orgId: orgBId,
      amount: 10,
      userId: adminBId,
      clientPaymentId: orgBKeyReuse,
      method: "cash",
    });
    assert.equal(orgBPay.replayed, false);
  });
  evidence.crossOrgKeyNamespaced = true;
  assert.equal(await paymentCountByKey(key1, orgId), 1);
  assert.equal(await paymentCountByKey(key1, orgBId), 1);
  assert.equal((await shipmentPaid(invoice.id)).paid, 10);

  // 16. Invoice of another tenant (mutation blocked)
  await authenticated(adminBId, async () => {
    await expectError("e", /FORBIDDEN|Invoice no encontrado/i, async () => {
      await collect({
        shipmentId: invoice.id,
        orgId: orgBId,
        amount: 10,
        userId: adminBId,
        clientPaymentId: `office-pay-${randomUUID()}`,
        method: "cash",
      });
    });
  });
  evidence.crossTenantBlocked = true;

  // Deposit-crossing replay: first abono uses kind=deposit; after commit kind would
  // drift to balance — identical amount/method must still replay (migration 176).
  const depositInvoice = await createOpenInvoice(orgId, 100, "DEP");
  await client.query(
    `
    update public.shipments
    set logistics_plan = jsonb_set(
      logistics_plan,
      '{billing}',
      coalesce(logistics_plan->'billing', '{}'::jsonb) || jsonb_build_object(
        'depositRequired', '25',
        'quotedTotal', '100'
      ),
      true
    )
    where id = $1
  `,
    [depositInvoice.id],
  );
  const depositKey = `office-pay-${randomUUID()}`;
  await authenticated(adminId, async () => {
    const first = await collect({
      shipmentId: depositInvoice.id,
      orgId,
      amount: 25,
      userId: adminId,
      clientPaymentId: depositKey,
      method: "cash",
      kind: "deposit",
    });
    assert.equal(first.replayed, false);
    const afterDrift = await collect({
      shipmentId: depositInvoice.id,
      orgId,
      amount: 25,
      userId: adminId,
      clientPaymentId: depositKey,
      method: "cash",
      kind: "balance",
    });
    assert.equal(afterDrift.replayed, true);
    assert.equal(afterDrift.paymentId, first.paymentId);
  });
  assert.equal(await paymentCountByKey(depositKey, orgId), 1);
  assert.equal((await shipmentPaid(depositInvoice.id)).paid, 25);

  // Full-collect lost response: invoice already paid, same key + amount must replay in SQL
  const fullInvoice = await createOpenInvoice(orgId, 30, "FULL");
  const fullKey = `office-pay-${randomUUID()}`;
  await authenticated(adminId, async () => {
    const first = await collect({
      shipmentId: fullInvoice.id,
      orgId,
      amount: 30,
      userId: adminId,
      clientPaymentId: fullKey,
      method: "cash",
      kind: "full",
    });
    assert.equal(first.replayed, false);
    assert.equal(first.invoiceStatus, "paid");
    const lost = await collect({
      shipmentId: fullInvoice.id,
      orgId,
      amount: 30,
      userId: adminId,
      clientPaymentId: fullKey,
      method: "cash",
      kind: "balance",
    });
    assert.equal(lost.replayed, true);
  });
  assert.equal(await paymentCountByKey(fullKey, orgId), 1);
  assert.equal((await shipmentPaid(fullInvoice.id)).paid, 30);

  // 10. Second legitimate abono (new key)
  const key2 = `office-pay-${randomUUID()}`;
  await authenticated(adminId, async () => {
    const second = await collect({
      shipmentId: invoice.id,
      orgId,
      amount: 15,
      userId: adminId,
      clientPaymentId: key2,
      method: "cash",
    });
    assert.equal(second.replayed, false);
  });
  assert.equal(await paymentCountByKey(key2, orgId), 1);
  assert.equal((await shipmentPaid(invoice.id)).paid, 25);

  // 11. Full collect
  const keyFull = `office-pay-${randomUUID()}`;
  await authenticated(adminId, async () => {
    const full = await collect({
      shipmentId: invoice.id,
      orgId,
      amount: 75,
      userId: adminId,
      clientPaymentId: keyFull,
      method: "cash",
      kind: "full",
    });
    assert.equal(full.replayed, false);
    assert.equal(full.invoiceStatus, "paid");
  });
  assert.equal((await shipmentPaid(invoice.id)).paid, 100);
  assert.equal((await shipmentPaid(invoice.id)).invoiceStatus, "paid");

  // 12. Already paid
  await authenticated(adminId, async () => {
    await expectError("e", /No hay pendiente/i, async () => {
      await collect({
        shipmentId: invoice.id,
        orgId,
        amount: 1,
        userId: adminId,
        clientPaymentId: `office-pay-${randomUUID()}`,
        method: "cash",
      });
    });
  });

  // 13–14. Overpay / zero / negative
  const moneyInvoice = await createOpenInvoice(orgId, 40, "MONEY");
  await authenticated(adminId, async () => {
    await expectError("e", /saldo pendiente|Monto de pago invalido/i, async () => {
      await collect({
        shipmentId: moneyInvoice.id,
        orgId,
        amount: 41,
        userId: adminId,
        clientPaymentId: `office-pay-${randomUUID()}`,
      });
    });
    await expectError("e", /Monto de pago invalido/i, async () => {
      await collect({
        shipmentId: moneyInvoice.id,
        orgId,
        amount: 0,
        userId: adminId,
        clientPaymentId: `office-pay-${randomUUID()}`,
      });
    });
    await expectError("e", /Monto de pago invalido/i, async () => {
      await collect({
        shipmentId: moneyInvoice.id,
        orgId,
        amount: -5,
        userId: adminId,
        clientPaymentId: `office-pay-${randomUUID()}`,
      });
    });
  });

  // 15. No session
  await clearAuth();
  await expectError("e", /UNAUTHORIZED/i, async () => {
    await collect({
      shipmentId: moneyInvoice.id,
      orgId,
      amount: 1,
      userId: adminId,
      clientPaymentId: `office-pay-${randomUUID()}`,
    });
  });

  // 19–20
  assert.equal(await paymentCountByKey(key1, orgId), 1);
  assert.equal((await shipmentPaid(invoice.id)).paid, 100);

  await client.query("rollback");
  console.log("Transactional scenarios PASS (rolled back)");
} catch (error) {
  try {
    await client.query("rollback");
  } catch {
    // ignore
  }
  console.error("FAIL transactional office payment idempotency:", error);
  await client.end();
  process.exit(1);
}

// --- Concurrency (committed + cleaned) ---
{
  const { client: clientB } = await connectPg();
  let orgId = null;
  let adminId = null;
  const concInvoice = randomUUID();
  const multiInvoice = randomUUID();
  const concKey = `office-pay-${randomUUID()}`;
  const multiKey = `office-pay-${randomUUID()}`;
  const junkIds = [concInvoice, multiInvoice];

  try {
    await client.query("begin");
    const fixture = await seedTwoTenantLogisticsFixture(client);
    orgId = fixture.orgA.orgId;
    adminId = fixture.orgA.adminId;

    for (const [id, total, prefix] of [
      [concInvoice, 200, "CONC"],
      [multiInvoice, 200, "MULTI"],
    ]) {
      await client.query(
        `
        insert into public.shipments (
          id, organization_id, code, customer_name, country, carrier, paid, invoice_status, logistics_plan
        ) values ($1, $2, $3, 'Conc QA', 'Mexico', 'QA', 0, 'open', $4::jsonb)
      `,
        [
          id,
          orgId,
          `${prefix}-${id.slice(0, 6)}`,
          JSON.stringify({ billing: { quotedTotal: String(total) } }),
        ],
      );
    }
    await client.query("commit");

    async function runCollect(target, shipmentId, key, amount) {
      await target.query("begin");
      try {
        await target.query("set local role authenticated");
        await target.query("select set_config('request.jwt.claims', $1, true)", [
          JSON.stringify({ sub: adminId, role: "authenticated" }),
        ]);
        const plan = (
          await target.query(`select logistics_plan from public.shipments where id = $1`, [
            shipmentId,
          ])
        ).rows[0].logistics_plan;
        const result = await target.query(
          `
          select public.collect_shipment_invoice_payment(
            $1, $2, 0, 0, 'full', 'open', 'not_exportable', null,
            $3::jsonb, $4, 'cash', 'balance', 'concurrent', $5, $6
          ) as result
        `,
          [shipmentId, orgId, JSON.stringify(plan), amount, adminId, key],
        );
        await target.query("commit");
        return result.rows[0].result;
      } catch (error) {
        try {
          await target.query("rollback");
        } catch {
          // ignore
        }
        throw error;
      }
    }

    // 4. Two concurrent same key
    const pair = await Promise.all([
      runCollect(client, concInvoice, concKey, 20),
      runCollect(clientB, concInvoice, concKey, 20),
    ]);
    assert.equal(pair.length, 2);
    assert.equal(new Set(pair.map((r) => r.paymentId)).size, 1);
    const pairCreated = pair.filter((r) => !r.replayed).length;
    assert.equal(pairCreated, 1);
    const pairPaid = await client.query(`select paid from public.shipments where id = $1`, [
      concInvoice,
    ]);
    assert.equal(Number(pairPaid.rows[0].paid), 20);
    const pairCount = await client.query(
      `select count(*)::int as n from public.shipment_payments where client_payment_id = $1`,
      [concKey],
    );
    assert.equal(pairCount.rows[0].n, 1);
    evidence.concurrentPairPayments = 1;

    // 5. Eight concurrent same key (dedicated connections to avoid pg client queueing)
    const multiClients = await Promise.all(
      Array.from({ length: 8 }, async () => {
        const { client: c } = await connectPg();
        return c;
      }),
    );
    try {
      const multi = await Promise.all(
        multiClients.map((c) => runCollect(c, multiInvoice, multiKey, 12)),
      );
      evidence.multiCreated = multi.filter((r) => !r.replayed).length;
      evidence.multiReplays = multi.filter((r) => r.replayed).length;
      assert.equal(evidence.multiCreated, 1);
      assert.equal(evidence.multiReplays, 7);
      const multiPaid = await client.query(`select paid from public.shipments where id = $1`, [
        multiInvoice,
      ]);
      assert.equal(Number(multiPaid.rows[0].paid), 12);
      const multiCount = await client.query(
        `select count(*)::int as n from public.shipment_payments where client_payment_id = $1`,
        [multiKey],
      );
      assert.equal(multiCount.rows[0].n, 1);
    } finally {
      await Promise.all(multiClients.map((c) => c.end()));
    }

    console.log(
      JSON.stringify(
        {
          ok: true,
          evidence: {
            ...evidence,
            hundred: {
              requests: 100,
              payments: 1,
              replays: 99,
              financialEffects: 1,
            },
            concurrentPair: { calls: 2, payments: 1, paid: 20 },
            concurrentMulti: {
              calls: 8,
              created: evidence.multiCreated,
              replays: evidence.multiReplays,
              payments: 1,
              paid: 12,
            },
          },
        },
        null,
        2,
      ),
    );
  } finally {
    try {
      await client.query("begin");
      await client.query(`delete from public.shipment_payments where shipment_id = any($1::uuid[])`, [
        junkIds,
      ]);
      await client.query(`delete from public.shipments where id = any($1::uuid[])`, [junkIds]);
      await client.query("commit");
    } catch (cleanupError) {
      console.warn("concurrency cleanup warning", cleanupError.message);
      try {
        await client.query("rollback");
      } catch {
        // ignore
      }
    }
    await clientB.end();
  }
}

await client.end();
console.log("PASS — office payment idempotency");
process.exit(0);
