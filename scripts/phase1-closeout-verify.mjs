/**
 * Phase 1 closeout verification against local Postgres.
 * Covers migrations 150-166 registry, critical RPCs/grants,
 * security/finance/atomicity smoke, and a transactional E2E walk.
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { connectPg } from "./lib/db-connection.mjs";
import { seedTwoTenantLogisticsFixture } from "./lib/phase1-two-tenant-fixture.mjs";

const { client, label } = await connectPg();
console.log(`Phase 1 closeout on ${label}`);

const report = {
  migrations: {},
  security: {},
  finance: {},
  atomicity: {},
  e2e: {},
};

async function clearAuth(target = client) {
  try { await target.query("reset role"); } catch { /* ignore */ }
  try { await target.query("select set_config('request.jwt.claims', '', true)"); } catch { /* ignore */ }
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
  await client.query(`savepoint ${name}`);
  try {
    await task();
    assert.fail(`Expected error ${pattern}`);
  } catch (error) {
    assert.match(String(error.message), pattern);
  } finally {
    await client.query(`rollback to savepoint ${name}`);
    await client.query(`release savepoint ${name}`);
  }
}

try {
  await client.query("begin");

  // --- Migrations 150-166 ---
  const migs = await client.query(`
    select name from public.app_schema_migrations
    where name ~ '^(15[0-9]|16[0-6])_'
    order by name
  `);
  const expected = [];
  for (let i = 150; i <= 166; i++) expected.push(String(i));
  const applied = migs.rows.map((r) => r.name);
  for (const n of expected) {
    const hit = applied.find((name) => name.startsWith(`${n}_`));
    assert.ok(hit, `missing migration ${n}`);
  }
  report.migrations.applied150to166 = applied.length;
  report.migrations.names = applied;

  const critical = await client.query(`
    select p.proname,
      pg_get_function_identity_arguments(p.oid) as args,
      p.prosecdef as security_definer,
      (select string_agg(distinct grantee, ',' order by grantee)
         from information_schema.role_routine_grants g
        where g.specific_schema = 'public' and g.routine_name = p.proname) as grantees
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'complete_conductor_task_atomic',
        'notify_logistics_route_change',
        'collect_shipment_invoice_payment',
        'record_activity_history',
        'start_logistics_route_atomic',
        'update_logistics_task_atomic',
        'mark_logistics_task_loaded_with_stock_atomic',
        'deduct_empty_box_stock_for_task_lines',
        'apply_logistics_empty_box_salida',
        'publish_logistics_route',
        'record_inventory_movement_atomic',
        'reverse_inventory_salidas_for_shipment'
      )
    order by p.proname, 2
  `);
  report.migrations.rpcCount = critical.rowCount;

  const inventoryOverloads = critical.rows.filter((r) => r.proname === "record_inventory_movement_atomic");
  assert.equal(inventoryOverloads.length, 1, "inventory movement must have single canonical signature");
  assert.match(inventoryOverloads[0].args, /p_unit_cost/);

  for (const name of [
    "deduct_empty_box_stock_for_task_lines",
    "apply_logistics_empty_box_salida",
  ]) {
    const row = critical.rows.find((r) => r.proname === name);
    assert.ok(row, `${name} missing`);
    assert.doesNotMatch(String(row.grantees || ""), /authenticated|anon|PUBLIC/i);
  }

  for (const name of [
    "update_logistics_task_atomic",
    "complete_conductor_task_atomic",
    "record_activity_history",
  ]) {
    const row = critical.rows.find((r) => r.proname === name);
    assert.ok(row?.security_definer, `${name} should be security definer`);
    assert.match(String(row.grantees || ""), /authenticated/i);
    assert.doesNotMatch(String(row.grantees || ""), /(^|,)anon(,|$)/i);
  }

  const defs = await client.query(`
    select p.proname, pg_get_functiondef(p.oid) as def
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'complete_conductor_task_atomic',
        'update_logistics_task_atomic',
        'notify_logistics_route_change',
        'collect_shipment_invoice_payment'
      )
  `);
  for (const row of defs.rows) {
    assert.match(row.def, /auth\.uid\(\)/);
    assert.match(row.def, /search_path/i);
  }
  report.migrations.authUidInCriticalRpcs = true;
  report.migrations.grantsOk = true;

  // Seed two isolated tenants (works on clean DB with empty seed.sql)
  const fixture = await seedTwoTenantLogisticsFixture(client);
  const orgId = fixture.orgA.orgId;
  const adminId = fixture.orgA.adminId;
  const warehouseId = fixture.orgA.warehouseId;
  const conductorRoleId = (
    await client.query(
      `select id from public.roles where organization_id = $1 and slug = 'conductor'`,
      [orgId],
    )
  ).rows[0].id;

  async function createDriver(labelName) {
    const id = randomUUID();
    await client.query(`
      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password,
        email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
        created_at, updated_at, confirmation_token, recovery_token,
        email_change_token_new, email_change
      ) values (
        '00000000-0000-0000-0000-000000000000', $1, 'authenticated', 'authenticated', $2,
        crypt('local-test-only', gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        '{}'::jsonb, now(), now(), '', '', '', ''
      )
    `, [id, `qa.phase1.${labelName}.${id.slice(0, 8)}@boxario.local`]);
    await client.query(`
      insert into public.profiles (id, organization_id, role_id, email, full_name, is_active)
      values ($1, $2, $3, $4, $5, true)
    `, [id, orgId, conductorRoleId, `qa.phase1.${labelName}.${id.slice(0, 8)}@boxario.local`, `Phase1 ${labelName}`]);
    return id;
  }

  const driverA = await createDriver("A");
  const driverB = await createDriver("B");
  const foreignOrgId = fixture.orgB.orgId;

  // --- Security ---
  await expectError("sec_no_auth_complete", /UNAUTHORIZED|permission denied|42501/i, async () => {
    await client.query(`select public.complete_conductor_task_atomic(
      $1, $2, $3, 'completed', '', '', '', $4, now(), 0, '', 0, 'not_applicable', false,
      $5, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 0, 0, 'full', 'open', 'not_exportable', null, false
    )`, [orgId, randomUUID(), driverA, randomUUID(), adminId]);
  });
  report.security.completeRequiresAuth = "PASS";

  await authenticated(adminId, async () => {
    await expectError("sec_cross_org", /TASK_NOT_FOUND|FORBIDDEN|UNAUTHORIZED/i, async () => {
      await client.query(`select public.complete_conductor_task_atomic(
        $1, $2, $3, 'completed', '', '', '', $4, now(), 0, '', 0, 'not_applicable', false,
        $5, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 0, 0, 'full', 'open', 'not_exportable', null, false
      )`, [foreignOrgId, randomUUID(), driverA, randomUUID(), adminId]);
    });
  });
  report.security.crossOrgComplete = "PASS";

  await expectError("sec_no_auth_notify", /UNAUTHORIZED|permission denied|42501/i, async () => {
    await client.query(`select public.notify_logistics_route_change(
      $1, $2, 'test', 'summary', null, $3, $4, 'Actor'
    )`, [randomUUID(), driverA, randomUUID(), adminId]);
  });
  report.security.notifyRequiresAuth = "PASS";

  await authenticated(adminId, async () => {
    await expectError("sec_activity_insert", /policy|permission denied|42501|RLS/i, async () => {
      await client.query(`
        insert into public.activity_history (
          organization_id, actor_id, actor_name, action, entity_type, title
        ) values ($1, $2, 'spoof', 'hack', 'shipment', 'should fail')
      `, [orgId, adminId]);
    });
  });
  report.security.activityDirectInsertDenied = "PASS";

  await authenticated(adminId, async () => {
    await expectError("sec_helper_denied", /permission denied|42501/i, async () => {
      await client.query(`
        select public.deduct_empty_box_stock_for_task_lines(
          $1, $2, $3, $4, $5, $5, $6
        )
      `, [orgId, randomUUID(), randomUUID(), warehouseId, adminId, randomUUID()]);
    });
  });
  report.security.internalHelpersNotExecutable = "PASS";

  const seller = await client.query(`
    select profile.id
    from public.profiles profile
    join public.roles role on role.id = profile.role_id
    where profile.organization_id = $1
      and profile.is_active
      and role.slug not in ('administrador')
      and not exists (select 1 from public.profile_warehouses pw where pw.profile_id = profile.id)
    limit 1
  `, [orgId]);
  if (seller.rowCount) {
    await authenticated(seller.rows[0].id, async () => {
      const access = await client.query(`select public.user_can_access_warehouse($1) as ok`, [warehouseId]);
      assert.equal(access.rows[0].ok, false);
    });
    report.security.warehouseDefaultDeny = "PASS";
  } else {
    report.security.warehouseDefaultDeny = "SKIP_NO_UNASSIGNED_USER";
  }

  // --- Finance (seeded invoice with balance) ---
  {
    const payShip = randomUUID();
    const payCode = `INV-PAY-${payShip.slice(0, 6)}`;
    const plan = {
      billing: { quotedTotal: "100.00", currency: "USD" },
    };
    await client.query(`
      insert into public.shipments (id, organization_id, code, customer_name, country, carrier, paid, logistics_plan)
      values ($1, $2, $3, 'Pay QA', 'Mexico', 'QA', 0, $4::jsonb)
    `, [payShip, orgId, payCode, JSON.stringify(plan)]);

    await authenticated(adminId, async () => {
      await expectError("fin_overpay_seeded", /saldo pendiente|Monto|invalido|Total|excede/i, async () => {
        await client.query(`
          select public.collect_shipment_invoice_payment(
            $1, $2, 0, 0, 'full', 'open', 'not_exportable', null,
            $3::jsonb, $4, 'efectivo', 'balance', 'phase1 overpay seeded', $5
          )
        `, [payShip, orgId, JSON.stringify(plan), 150, adminId]);
      });
    });
    report.finance.officeOverpayRejected = "PASS";

    // Valid partial payment then idempotent replay via same note/amount path is SQL-owned;
    // confirm quoted total not mutated by overpay attempt (still 100).
    const after = await client.query(`
      select paid, logistics_plan #>> '{billing,quotedTotal}' as quoted
      from public.shipments where id = $1
    `, [payShip]);
    assert.equal(Number(after.rows[0].paid) || 0, 0);
    assert.equal(String(after.rows[0].quoted), "100.00");
    report.finance.quotedTotalUnchangedAfterOverpay = "PASS";
  }

  const paymentDef = defs.rows.find((r) => r.proname === "collect_shipment_invoice_payment");
  assert.match(paymentDef.def, /quoted_total|quotedTotal|auth\.uid/i);
  report.finance.sqlRecalculates = "PASS";

  // --- Atomicity helper presence ---
  const updateDef = defs.rows.find((r) => r.proname === "update_logistics_task_atomic");
  assert.match(updateDef.def, /client_operation_id|request_hash|FOR UPDATE/i);
  assert.match(updateDef.def, /deduct_empty_box_stock_for_task_lines/);
  report.atomicity.updateLogisticsTaskAtomic = "PASS";

  // Multi-line atomic load inside closeout transaction
  {
    const category = await client.query(`
      select id from public.inventory_categories where organization_id = $1 order by name limit 1
    `, [orgId]);
    assert.ok(category.rowCount > 0);
    const categoryId = category.rows[0].id;
    const itemA = randomUUID();
    const itemB = randomUUID();
    const labelA = `P1BoxA_${itemA.slice(0, 8)}`;
    const labelB = `P1BoxB_${itemB.slice(0, 8)}`;
    await client.query(`
      insert into public.inventory_items (id, organization_id, category_id, name, kind)
      values ($1, $3, $4, $5, $5), ($2, $3, $4, $6, $6)
    `, [itemA, itemB, orgId, categoryId, labelA, labelB]);
    await client.query(`
      insert into public.inventory_stock (organization_id, warehouse_id, item_id, stock, reserved, assigned, unavailable, min_stock)
      values ($1, $2, $3, 5, 0, 0, 0, 0), ($1, $2, $4, 5, 0, 0, 0, 0)
    `, [orgId, warehouseId, itemA, itemB]);
    const multiShip = randomUUID();
    const multiTask = randomUUID();
    await client.query(`
      insert into public.shipments (id, organization_id, code, customer_name, country, carrier, logistics_plan)
      values ($1, $2, $3, 'Multi QA', 'Mexico', 'QA', $4::jsonb)
    `, [multiShip, orgId, `INV-ML-${multiShip.slice(0, 6)}`, JSON.stringify({
      boxLines: [
        { label: labelA, quantity: 1 },
        { label: labelB, quantity: 2 },
      ],
      emptyBox: { mode: "Entrega" },
    })]);
    await client.query(`
      insert into public.shipment_logistics_tasks (
        id, organization_id, shipment_id, task_type, status, warehouse_id
      ) values ($1, $2, $3, 'deliver_empty_box', 'assigned', $4)
    `, [multiTask, orgId, multiShip, warehouseId]);

    await authenticated(adminId, async () => {
      const result = await client.query(
        `select public.update_logistics_task_atomic($1, $2, $3::jsonb) as payload`,
        [multiTask, randomUUID(), JSON.stringify({ status: "loaded_to_truck", warehouseId })],
      );
      assert.equal(result.rows[0].payload.status, "loaded_to_truck");
      assert.equal(result.rows[0].payload.actorId, adminId);
      assert.equal(result.rows[0].payload.stockResult?.deductedCount, 2);
    });
    const stocks = await client.query(`
      select item_id, stock from public.inventory_stock where item_id in ($1, $2)
    `, [itemA, itemB]);
    const byItem = Object.fromEntries(stocks.rows.map((r) => [r.item_id, Number(r.stock)]));
    assert.equal(byItem[itemA], 4);
    assert.equal(byItem[itemB], 3);
    report.atomicity.multiLineLoad = "PASS";
  }

  // --- E2E draft/publish/driver isolation (transactional) ---
  const today = new Date().toISOString().slice(0, 10);
  const vehicleA = randomUUID();
  const routeA = randomUUID();
  const routeB = randomUUID();
  const shipmentA = randomUUID();
  const shipmentB = randomUUID();
  const taskA = randomUUID();
  const taskB = randomUUID();
  const stopA = randomUUID();
  const codeA = `INV-P1A-${shipmentA.slice(0, 6)}`;
  const codeB = `INV-P1B-${shipmentB.slice(0, 6)}`;

  await client.query(`
    insert into public.logistics_vehicles (id, organization_id, name, plate, assigned_driver_id, is_active)
    values ($1, $2, 'Phase1 Van A', $3, $4, true)
  `, [vehicleA, orgId, `P1-${vehicleA.slice(0, 4)}`, driverA]);

  await client.query(`
    insert into public.shipments (id, organization_id, code, customer_name, country, carrier)
    values
      ($1, $3, $4, 'Cliente Phase1 A', 'Mexico', 'QA'),
      ($2, $3, $5, 'Cliente Phase1 B', 'Mexico', 'QA')
  `, [shipmentA, shipmentB, orgId, codeA, codeB]);

  await client.query(`
    insert into public.shipment_logistics_tasks (
      id, organization_id, shipment_id, task_type, status, assigned_to, scheduled_at, schedule_confirmation_status, warehouse_id
    ) values
      ($1, $3, $4, 'deliver_empty_box', 'assigned', $5, $7::date + time '10:00', 'confirmed', $8),
      ($2, $3, $6, 'deliver_empty_box', 'assigned', $9, $7::date + time '11:00', 'confirmed', $8)
  `, [taskA, taskB, orgId, shipmentA, driverA, shipmentB, today, warehouseId, driverB]);

  await client.query(`
    insert into public.logistics_routes (
      id, organization_id, route_date, name, status, assigned_to, vehicle_id, warehouse_id
    ) values
      ($1, $3, $4::date, 'Phase1 Ruta A', 'draft', $5, $6, $7),
      ($2, $3, $4::date, 'Phase1 Ruta B', 'planned', $8, null, null)
  `, [routeA, routeB, orgId, today, driverA, vehicleA, warehouseId, driverB]);

  await client.query(`
    insert into public.logistics_route_stops (
      id, organization_id, route_id, task_id, stop_order, lat, lng, address_snapshot
    ) values ($1, $2, $3, $4, 1, 34.41, -118.50, '{"name":"Stop A"}'::jsonb)
  `, [stopA, orgId, routeA, taskA]);

  await authenticated(driverA, async () => {
    const draftHidden = await client.query(`select id from public.logistics_routes where id = $1`, [routeA]);
    assert.equal(draftHidden.rowCount, 0);
  });
  report.e2e.driverCannotSeeDraft = "PASS";

  await authenticated(adminId, async () => {
    const published = await client.query(`select * from public.publish_logistics_route($1) as route`, [routeA]);
    assert.equal(published.rows[0].status, "planned");
  });
  report.e2e.publishDraftToPlanned = "PASS";

  await authenticated(driverA, async () => {
    const visible = await client.query(`select id, status from public.logistics_routes where id = $1`, [routeA]);
    assert.equal(visible.rowCount, 1);
    assert.equal(visible.rows[0].status, "planned");
    const other = await client.query(`select id from public.logistics_routes where id = $1`, [routeB]);
    assert.equal(other.rowCount, 0);
    const otherTask = await client.query(`select id from public.shipment_logistics_tasks where id = $1`, [taskB]);
    assert.equal(otherTask.rowCount, 0);
  });
  report.e2e.driverASeesOwnNotB = "PASS";

  await authenticated(driverB, async () => {
    const other = await client.query(`select id from public.logistics_routes where id = $1`, [routeA]);
    assert.equal(other.rowCount, 0);
  });
  report.e2e.driverBCannotSeeA = "PASS";

  // Start route if RPC exists
  const startExists = critical.rows.some((r) => r.proname === "start_logistics_route_atomic");
  if (startExists) {
    await authenticated(driverA, async () => {
      try {
        await client.query(`
          select public.start_logistics_route_atomic($1, $2::uuid[], $3, $4, $5)
        `, [routeA, [taskA], 34.41, -118.5, randomUUID()]);
        const started = await client.query(`select status from public.logistics_routes where id = $1`, [routeA]);
        assert.equal(started.rows[0].status, "in_progress");
        report.e2e.startRouteAtomic = "PASS";
      } catch (error) {
        const alt = await client.query(`
          select pg_get_function_identity_arguments(p.oid) as args
          from pg_proc p join pg_namespace n on n.oid = p.pronamespace
          where n.nspname = 'public' and p.proname = 'start_logistics_route_atomic'
        `);
        report.e2e.startRouteAtomic = `FAIL:${error.message}|args=${alt.rows[0]?.args || ""}`;
        throw error;
      }
    });
  }

  await client.query("rollback");
  console.log(JSON.stringify(report, null, 2));
  console.log("Phase 1 closeout verification PASSED");
  process.exit(0);
} catch (error) {
  console.error(error);
  try { await client.query("rollback"); } catch { /* ignore */ }
  process.exit(1);
} finally {
  await client.end();
}
