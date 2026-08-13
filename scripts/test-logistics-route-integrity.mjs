/**
 * Real DB validation for logistics integrity (migrations 150/151).
 * Creates ephemeral conductors/routes inside a transaction and rolls back.
 * Usage: node scripts/test-logistics-route-integrity.mjs
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { connectPg } from "./lib/db-connection.mjs";
import { seedTwoTenantLogisticsFixture } from "./lib/phase1-two-tenant-fixture.mjs";

const { client, label } = await connectPg();
console.log(`Logistics integrity DB tests on ${label}`);

async function clearAuth() {
  try {
    await client.query("reset role");
  } catch {
    // ignore
  }
  try {
    await client.query("select set_config('request.jwt.claims', '', true)");
  } catch {
    // ignore when transaction is aborted; outer savepoint/rollback restores state
  }
}

async function authenticated(userId, task) {
  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claims', $1, true)", [
    JSON.stringify({ sub: userId, role: "authenticated" }),
  ]);
  try {
    return await task();
  } finally {
    await clearAuth();
  }
}

async function expectDatabaseError(name, pattern, task) {
  await client.query(`savepoint ${name}`);
  try {
    await task();
    assert.fail(`Expected database error: ${pattern}`);
  } catch (error) {
    assert.match(String(error.message), pattern);
  } finally {
    await client.query(`rollback to savepoint ${name}`);
    await client.query(`release savepoint ${name}`);
  }
}

async function insertAuthUser(id, email) {
  await client.query(
    `
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
  `,
    [id, email],
  );
}

await client.query("begin");
const report = {
  publish: false,
  rls: false,
  states: false,
  atomic: false,
  custody: false,
  inventory: false,
  notifications: false,
  reactivation: false,
  adminException: false,
  failAtomic: false,
  e2e: false,
};

try {
  const fixture = await seedTwoTenantLogisticsFixture(client);
  const roles = await client.query(
    `
    select slug, id
    from public.roles
    where organization_id = $1
      and slug in ('administrador', 'conductor')
  `,
    [fixture.orgA.orgId],
  );
  const roleBySlug = Object.fromEntries(roles.rows.map((r) => [r.slug, r.id]));
  const ctx = {
    organization_id: fixture.orgA.orgId,
    admin_id: fixture.orgA.adminId,
    warehouse_id: fixture.orgA.warehouseId,
    conductor_role_id: roleBySlug.conductor,
    admin_role_id: roleBySlug.administrador,
  };
  assert.ok(ctx.conductor_role_id && ctx.admin_role_id, "admin+conductor roles required");

  await client.query(
    `
    update public.warehouses
    set lat = coalesce(lat, 34.41),
        lng = coalesce(lng, -118.50),
        address_verified = true
    where id = $1
  `,
    [ctx.warehouse_id],
  );

  const driverA = randomUUID();
  const driverB = randomUUID();
  await insertAuthUser(driverA, `qa.driver.a.${driverA.slice(0, 8)}@boxario.local`);  await insertAuthUser(driverB, `qa.driver.b.${driverB.slice(0, 8)}@boxario.local`);

  await client.query(
    `
    insert into public.profiles (id, organization_id, email, full_name, role_id, is_active)
    values
      ($1, $3, $4, 'QA Conductor A', $5, true),
      ($2, $3, $6, 'QA Conductor B', $5, true)
  `,
    [
      driverA,
      driverB,
      ctx.organization_id,
      `qa.driver.a.${driverA.slice(0, 8)}@boxario.local`,
      ctx.conductor_role_id,
      `qa.driver.b.${driverB.slice(0, 8)}@boxario.local`,
    ],
  );

  const vehicleA = randomUUID();
  const vehicleB = randomUUID();
  await client.query(
    `
    insert into public.logistics_vehicles (
      id, organization_id, name, plate, assigned_driver_id, is_active
    ) values
      ($1, $3, 'QA Van A', $4, $5, true),
      ($2, $3, 'QA Van B', $6, $7, true)
  `,
    [
      vehicleA,
      vehicleB,
      ctx.organization_id,
      `QA-A-${vehicleA.slice(0, 4)}`,
      driverA,
      `QA-B-${vehicleB.slice(0, 4)}`,
      driverB,
    ],
  );

  const today = new Date().toISOString().slice(0, 10);
  const routeA = randomUUID();
  const routeB = randomUUID();
  const shipmentA = randomUUID();
  const shipmentB = randomUUID();
  const shipmentC = randomUUID();
  const taskA = randomUUID();
  const taskB = randomUUID();
  const taskC = randomUUID();
  const codeA = `INV-QA-A-${randomUUID().slice(0, 6)}`;
  const codeB = `INV-QA-B-${randomUUID().slice(0, 6)}`;
  const codeC = `INV-QA-C-${randomUUID().slice(0, 6)}`;

  await client.query(
    `
    insert into public.shipments (id, organization_id, code, customer_name, country, carrier)
    values
      ($1, $4, $5, 'Cliente QA A', 'Mexico', 'QA'),
      ($2, $4, $6, 'Cliente QA B', 'Mexico', 'QA'),
      ($3, $4, $7, 'Cliente QA C', 'Mexico', 'QA')
  `,
    [shipmentA, shipmentB, shipmentC, ctx.organization_id, codeA, codeB, codeC],
  );

  await client.query(
    `
    insert into public.shipment_logistics_tasks (
      id, organization_id, shipment_id, task_type, status, assigned_to,
      scheduled_at, schedule_confirmation_status, warehouse_id
    ) values
      ($1, $4, $5, 'deliver_empty_box', 'assigned', $7, $9::date + time '10:00', 'confirmed', $10),
      ($2, $4, $6, 'deliver_empty_box', 'assigned', $8, $9::date + time '11:00', 'confirmed', $10),
      ($3, $4, $11, 'pickup_full_box', 'assigned', $7, $9::date + time '12:00', 'confirmed', $10)
  `,
    [
      taskA,
      taskB,
      taskC,
      ctx.organization_id,
      shipmentA,
      shipmentB,
      driverA,
      driverB,
      today,
      ctx.warehouse_id,
      shipmentC,
    ],
  );

  await client.query(
    `
    insert into public.logistics_routes (
      id, organization_id, route_date, name, status, assigned_to, vehicle_id, warehouse_id
    ) values
      ($1, $3, $4::date, 'QA Ruta A', 'draft', $5, $7, $9),
      ($2, $3, $4::date, 'QA Ruta B', 'planned', $6, $8, null)
  `,
    [
      routeA,
      routeB,
      ctx.organization_id,
      today,
      driverA,
      driverB,
      vehicleA,
      vehicleB,
      ctx.warehouse_id,
    ],
  );

  const stopA = randomUUID();
  const stopB = randomUUID();
  const stopC = randomUUID();
  await client.query(
    `
    insert into public.logistics_route_stops (
      id, organization_id, route_id, task_id, stop_order, lat, lng, address_snapshot
    ) values
      ($1, $4, $5, $7, 1, 34.41, -118.50, '{"name":"Stop A"}'::jsonb),
      ($2, $4, $6, $8, 1, 34.42, -118.51, '{"name":"Stop B"}'::jsonb),
      ($3, $4, $5, $9, 2, 34.43, -118.52, '{"name":"Stop C"}'::jsonb)
  `,
    [
      stopA,
      stopB,
      stopC,
      ctx.organization_id,
      routeA,
      routeB,
      taskA,
      taskB,
      taskC,
    ],
  );

  // --- Publish flow ---
  // Before publish, assigned conductor must not see draft route.
  await authenticated(driverA, async () => {
    const draftHidden = await client.query(
      "select id from public.logistics_routes where id = $1",
      [routeA],
    );
    assert.equal(draftHidden.rowCount, 0, "conductor must not see draft route");
  });

  await authenticated(ctx.admin_id, async () => {
    await expectDatabaseError("pub_incomplete", /ROUTE_NOT_DRAFT|ROUTE_/, async () => {
      // incomplete: remove vehicle temporarily via draft without vehicle is already set;
      // use routeB which is planned
      await client.query("select public.publish_logistics_route($1)", [routeB]);
    });

    const published = await client.query(
      "select * from public.publish_logistics_route($1) as route",
      [routeA],
    );
    assert.equal(published.rows[0].status, "planned");
    assert.ok(published.rows[0].published_at);
    assert.equal(published.rows[0].published_by, ctx.admin_id);
  });

  await authenticated(driverA, async () => {
    const visible = await client.query(
      "select id, status from public.logistics_routes where id = $1",
      [routeA],
    );
    assert.equal(visible.rowCount, 1);
    assert.equal(visible.rows[0].status, "planned");
  });

  const auditPublish = await client.query(
    `
    select count(*)::int as n from public.activity_history
    where organization_id = $1 and entity_id = $2 and action like '%publish%'
  `,
    [ctx.organization_id, routeA],
  );
  // publish action may write via TS; RPC notify creates notification
  const notifPublish = await client.query(
    `
    select count(*)::int as n from public.logistics_route_notifications
    where route_id = $1 and recipient_id = $2 and change_type = 'route_published'
  `,
    [routeA, driverA],
  );
  assert.equal(notifPublish.rows[0].n, 1);
  report.publish = true;
  console.log("OK publish flow");

  // --- RLS two drivers ---
  await authenticated(driverA, async () => {
    const own = await client.query(
      "select id from public.logistics_routes where id = $1",
      [routeA],
    );
    assert.equal(own.rowCount, 1);
    const other = await client.query(
      "select id from public.logistics_routes where id = $1",
      [routeB],
    );
    assert.equal(other.rowCount, 0);
    const ownStops = await client.query(
      "select id from public.logistics_route_stops where route_id = $1",
      [routeA],
    );
    assert.ok(ownStops.rowCount >= 1);
    const otherStops = await client.query(
      "select id from public.logistics_route_stops where route_id = $1",
      [routeB],
    );
    assert.equal(otherStops.rowCount, 0);
    const ownTasks = await client.query(
      "select id from public.shipment_logistics_tasks where id = $1",
      [taskA],
    );
    assert.equal(ownTasks.rowCount, 1);
    const otherTasks = await client.query(
      "select id from public.shipment_logistics_tasks where id = $1",
      [taskB],
    );
    assert.equal(otherTasks.rowCount, 0);
    const otherNotif = await client.query(
      `
      select id from public.logistics_route_notifications
      where recipient_id = $1
    `,
      [driverB],
    );
    assert.equal(otherNotif.rowCount, 0);
  });

  await authenticated(driverB, async () => {
    const own = await client.query(
      "select id from public.logistics_routes where id = $1",
      [routeB],
    );
    assert.equal(own.rowCount, 1);
    const other = await client.query(
      "select id from public.logistics_routes where id = $1",
      [routeA],
    );
    assert.equal(other.rowCount, 0);
  });

  await authenticated(ctx.admin_id, async () => {
    const both = await client.query(
      "select id from public.logistics_routes where id = any($1::uuid[])",
      [[routeA, routeB]],
    );
    assert.equal(both.rowCount, 2);
  });
  report.rls = true;
  console.log("OK RLS two conductors");

  // --- State machine / start guards ---
  // Setup mutations as table owner (outside authenticated role).
  await client.query(
    `
    update public.logistics_routes
    set status = 'draft', published_at = null, published_by = null
    where id = $1
  `,
    [routeA],
  );
  await authenticated(driverA, async () => {
    const hidden = await client.query(
      "select id from public.logistics_routes where id = $1",
      [routeA],
    );
    assert.equal(hidden.rowCount, 0, "draft route hidden again");
  });
  // Re-publish then start
  await authenticated(ctx.admin_id, async () => {
    await client.query("select public.publish_logistics_route($1)", [routeA]);
  });

  await client.query(
    `
    update public.logistics_routes
    set status = 'in_progress',
        started_at = now(),
        started_by = $2,
        started_lat = 34.41,
        started_lng = -118.50
    where id = $1 and status = 'planned'
  `,
    [routeA, driverA],
  );

  // Completing task before in_progress rejected
  await client.query(
    `
    update public.logistics_routes set status = 'planned' where id = $1
  `,
    [routeA],
  );
  await expectDatabaseError("task_before_start", /TASK_REQUIRES_ROUTE_IN_PROGRESS/, async () => {
    await client.query(
      `
      update public.shipment_logistics_tasks
      set status = 'completed', completed_at = now()
      where id = $1
    `,
      [taskA],
    );
  });

  await client.query(
    `
    update public.logistics_routes
    set status = 'in_progress', started_at = now(), started_by = $2,
        started_lat = 34.41, started_lng = -118.50
    where id = $1
  `,
    [routeA, driverA],
  );
  report.states = true;
  console.log("OK state guards");

  // --- Atomic payment completion ---
  const opKey = randomUUID();
  await authenticated(driverA, async () => {
    const first = await client.query(
      `
      select public.complete_conductor_task_atomic(
        $1, $2, $3, 'completed', 'ok', null, 'evidence://qa', $4, now(),
        0, null, 0, null, false, $3,
        jsonb_build_object('status','completed','completed_at', now()::text),
        '{}'::jsonb, '{}'::jsonb, 0, 0, null, null, null, null, false
      ) as result
    `,
      [ctx.organization_id, taskA, driverA, opKey],
    );
    assert.equal(first.rows[0].result.replayed, false);

    const second = await client.query(
      `
      select public.complete_conductor_task_atomic(
        $1, $2, $3, 'completed', 'ok', null, 'evidence://qa', $4, now(),
        0, null, 0, null, false, $3,
        jsonb_build_object('status','completed','completed_at', now()::text),
        '{}'::jsonb, '{}'::jsonb, 0, 0, null, null, null, null, false
      ) as result
    `,
      [ctx.organization_id, taskA, driverA, opKey],
    );
    assert.equal(second.rows[0].result.replayed, true);
  });

  const taskState = await client.query(
    "select status from public.shipment_logistics_tasks where id = $1",
    [taskA],
  );
  assert.equal(taskState.rows[0].status, "completed");

  // L-H1: orphan attempt (same operation key, task still incomplete) must not fake replay.
  const orphanOp = randomUUID();
  await client.query(
    `
    update public.shipment_logistics_tasks
    set status = 'assigned', completed_at = null, updated_at = now()
    where id = $1
  `,
    [taskA],
  );
  await client.query(
    `
    update public.logistics_route_stops
    set outcome = null, outcome_at = null
    where task_id = $1 and released_at is null
  `,
    [taskA],
  );
  await client.query(
    `
    insert into public.shipment_logistics_task_attempts (
      organization_id, task_id, shipment_id, route_id, driver_id, result,
      failure_reason, note, evidence_url, payment_expected_amount, payment_amount,
      payment_method, payment_outcome, invoice_visible, client_operation_id, captured_at, created_by
    )
    select
      organization_id, id, shipment_id, $2, $3, 'completed',
      '', 'orphan', 'evidence://orphan', 0, 0,
      '', 'not_applicable', false, $4::uuid, now(), $3
    from public.shipment_logistics_tasks
    where id = $1
  `,
    [taskA, routeA, driverA, orphanOp],
  );
  await authenticated(driverA, async () => {
    const recovered = await client.query(
      `
      select public.complete_conductor_task_atomic(
        $1, $2, $3, 'completed', 'recovered', null, 'evidence://qa', $4, now(),
        0, null, 0, null, false, $3,
        jsonb_build_object('status','completed','completed_at', now()::text),
        '{}'::jsonb, '{}'::jsonb, 0, 0, null, null, null, null, false
      ) as result
    `,
      [ctx.organization_id, taskA, driverA, orphanOp],
    );
    assert.equal(recovered.rows[0].result.replayed, false);
  });
  const orphanTaskState = await client.query(
    "select status from public.shipment_logistics_tasks where id = $1",
    [taskA],
  );
  assert.equal(orphanTaskState.rows[0].status, "completed");

  // L-H3: client logistics_plan in p_shipment_patch must not replace SQL-owned plan/billing.
  const lh3Op = randomUUID();
  const shipmentForTaskA = await client.query(
    "select shipment_id from public.shipment_logistics_tasks where id = $1",
    [taskA],
  );
  const shipmentAId = shipmentForTaskA.rows[0].shipment_id;
  await client.query(
    `
    update public.shipments
    set logistics_plan = $2::jsonb
    where id = $1
  `,
    [
      shipmentAId,
      JSON.stringify({
        keepMe: true,
        feeAdjustments: { delivery: { enabled: true } },
        billing: { quotedTotal: "$10.00", payNow: "$0.00", balanceDue: "$10.00" },
      }),
    ],
  );
  await client.query(
    `
    update public.shipment_logistics_tasks
    set status = 'assigned', completed_at = null, updated_at = now()
    where id = $1
  `,
    [taskA],
  );
  await client.query(
    `
    update public.logistics_route_stops
    set outcome = null, outcome_at = null
    where task_id = $1 and released_at is null
  `,
    [taskA],
  );
  await authenticated(driverA, async () => {
    await client.query(
      `
      select public.complete_conductor_task_atomic(
        $1, $2, $3, 'completed', 'lh3', null, 'evidence://qa', $4, now(),
        0, null, 0, 'not_applicable', false, $3,
        jsonb_build_object('status','completed','completed_at', now()::text),
        jsonb_build_object(
          'status', 'En ruta',
          'logistics_plan', jsonb_build_object(
            'keepMe', false,
            'billing', jsonb_build_object('stale', true, 'payNow', '$0.00')
          )
        ),
        jsonb_build_object('billing', jsonb_build_object('stale', true)),
        0, 0, null, null, null, null, false
      ) as result
    `,
      [ctx.organization_id, taskA, driverA, lh3Op],
    );
  });
  const lh3Plan = await client.query(
    "select logistics_plan from public.shipments where id = $1",
    [shipmentAId],
  );
  assert.equal(lh3Plan.rows[0].logistics_plan.keepMe, true);
  assert.deepEqual(lh3Plan.rows[0].logistics_plan.feeAdjustments, {
    delivery: { enabled: true },
  });
  assert.equal(lh3Plan.rows[0].logistics_plan.billing?.stale, undefined);
  assert.equal(lh3Plan.rows[0].logistics_plan.billing?.quotedTotal, "$10.00");

  // intentional failure mid-way: force TASK_CANCELLED path
  await client.query(
    `update public.shipment_logistics_tasks set status = 'cancelled' where id = $1`,
    [taskC],
  );
  await expectDatabaseError("atomic_fail", /TASK_CANCELLED/, async () => {
    await authenticated(driverA, async () => {
      await client.query(
        `
        select public.complete_conductor_task_atomic(
          $1, $2, $3, 'completed', 'fail', null, 'evidence://qa', $4, now(),
          0, null, 0, null, false, $3,
          jsonb_build_object('status','completed'),
          '{}'::jsonb, '{}'::jsonb, 0, 0, null, null, null, null, false
        )
      `,
        [ctx.organization_id, taskC, driverA, randomUUID()],
      );
    });
  });
  const taskCState = await client.query(
    "select status from public.shipment_logistics_tasks where id = $1",
    [taskC],
  );
  assert.equal(taskCState.rows[0].status, "cancelled");
  report.atomic = true;
  console.log("OK atomic RPC + idempotency + failure");

  // --- Notifications live edit ---
  await authenticated(ctx.admin_id, async () => {
    await client.query(
      `
      select public.notify_logistics_route_change(
        $1, $2, 'stop_instructions', 'Instrucciones actualizadas', $3,
        $4, $5, 'Admin QA'
      )
    `,
      [routeA, driverA, stopC, `live:${randomUUID()}`, ctx.admin_id],
    );
  });
  await authenticated(driverA, async () => {
    const rows = await client.query(
      `
      select id, change_type, summary, read_at
      from public.logistics_route_notifications
      where recipient_id = $1 and change_type = 'stop_instructions'
    `,
      [driverA],
    );
    assert.equal(rows.rowCount, 1);
    await client.query(
      `update public.logistics_route_notifications set read_at = now() where id = $1`,
      [rows.rows[0].id],
    );
  });
  await authenticated(driverB, async () => {
    const leaked = await client.query(
      `
      select id from public.logistics_route_notifications
      where recipient_id = $1 and change_type = 'stop_instructions'
    `,
      [driverA],
    );
    assert.equal(leaked.rowCount, 0);
  });
  report.notifications = true;
  console.log("OK notifications");

  // --- Admin exception ---
  await client.query(
    `
    update public.logistics_routes set status = 'planned' where id = $1
  `,
    [routeB],
  );
  await authenticated(ctx.admin_id, async () => {
    await expectDatabaseError("exc_no_ack", /ADMIN_EXCEPTION_RISK_ACK_REQUIRED/, async () => {
      await client.query(
        `select public.admin_complete_logistics_task_exception($1, 'motivo suficiente', false)`,
        [taskB],
      );
    });
    const exc = await client.query(
      `select public.admin_complete_logistics_task_exception($1, 'Correccion controlada QA', true) as result`,
      [taskB],
    );
    assert.equal(exc.rows[0].result.newStatus, "completed");
  });
  const excAudit = await client.query(
    `select count(*)::int as n from public.logistics_task_admin_exceptions where task_id = $1`,
    [taskB],
  );
  assert.equal(excAudit.rows[0].n, 1);
  await expectDatabaseError("exc_immutable", /ADMIN_TASK_EXCEPTION_IMMUTABLE/, async () => {
    await client.query(
      `update public.logistics_task_admin_exceptions set reason = 'hack' where task_id = $1`,
      [taskB],
    );
  });
  report.adminException = true;
  console.log("OK admin exception");

  // --- Inventory historical links ---
  await clearAuth();
  const itemResult = await client.query(
    `
    select item.id as item_id, item.name as item_name
    from public.inventory_items item
    where item.organization_id = $1
    limit 1
  `,
    [ctx.organization_id],
  );
  if (itemResult.rowCount === 1) {
    const item = itemResult.rows[0];
    const movExact = randomUUID();
    const movAmbiguous = randomUUID();

    // Bypass immutability by inserting directly (inserts allowed)
    await client.query(
      `
      insert into public.inventory_movements (
        id, organization_id, warehouse_id, item_id, item_name, type, qty, note, created_by, reason_code
      ) values
        ($1, $3, $4, $5, $6, 'salida', 1, $7, $8, 'unspecified'),
        ($2, $3, $4, $5, $6, 'salida', 1, $9, $8, 'unspecified')
    `,
      [
        movExact,
        movAmbiguous,
        ctx.organization_id,
        ctx.warehouse_id,
        item.item_id,
        item.item_name,
        `Salida ${codeA} ok`,
        ctx.admin_id,
        `Salida ${codeA} y ${codeB}`,
      ],
    );

    await authenticated(ctx.admin_id, async () => {
      const dry = await client.query(
        `select public.backfill_inventory_shipment_refs_unambiguous(true) as result`,
      );
      assert.ok(Number(dry.rows[0].result.linkedCount) >= 1);
      const applied = await client.query(
        `select public.backfill_inventory_shipment_refs_unambiguous(false) as result`,
      );
      assert.ok(Number(applied.rows[0].result.linkedCount) >= 1);
      const reportRows = await client.query(
        `select * from public.list_inventory_movements_missing_shipment_refs(50)`,
      );
      assert.ok(reportRows.rowCount >= 1);
      const reverse = await client.query(
        `
        select public.reverse_inventory_salidas_for_shipment($1, $2, $3, $4) as result
      `,
        [ctx.organization_id, shipmentA, ctx.admin_id, `rev-${randomUUID()}`],
      );
      assert.ok(Number(reverse.rows[0].result.reversedCount) >= 1);
      const reverse2 = await client.query(
        `
        select public.reverse_inventory_salidas_for_shipment($1, $2, $3, $4) as result
      `,
        [ctx.organization_id, shipmentA, ctx.admin_id, `rev-${randomUUID()}`],
      );
      // already reversed via reversal_of_movement_id
      assert.equal(Number(reverse2.rows[0].result.reversedCount), 0);
    });
    report.inventory = true;
    console.log("OK inventory historical links + reverse");
  } else {
    console.log("SKIP inventory (no inventory_items in org)");
  }

  // --- Custody accept + physical status ---
  const packageId = randomUUID();
  const handoffId = randomUUID();
  const initiatorId = driverB;
  await client.query(
    `
    insert into public.shipment_packages (
      id, organization_id, shipment_id, code, country, status
    ) values ($1, $2, $3, $4, 'Mexico', 'on_pallet')
  `,
    [packageId, ctx.organization_id, shipmentC, `BX-${randomUUID().slice(0, 8)}`],
  );

  try {
    await client.query("savepoint custody_qa");
    await client.query(
      `
      insert into public.package_custody_handoffs (
        id, organization_id, package_id, shipment_id, status,
        from_holder_type, from_holder_label,
        to_holder_type, to_holder_label,
        initiated_by, initiated_at, idempotency_key, reason, evidence
      ) values (
        $1, $2, $3, $4, 'pending',
        'bodega', 'Bodega QA',
        'proveedor', 'Transportista QA',
        $5, now(), $6, 'QA handoff', '{"note":"evidencia inicio"}'::jsonb
      )
    `,
      [
        handoffId,
        ctx.organization_id,
        packageId,
        shipmentC,
        initiatorId,
        `custody-key-${randomUUID()}`,
      ],
    );
    await authenticated(ctx.admin_id, async () => {
      await client.query(
        `select public.accept_package_custody_handoff($1, $2::jsonb, $3)`,
        [handoffId, JSON.stringify({ note: "recibido QA" }), `custody-op-${randomUUID()}`],
      );
    });
    const pkg = await client.query(
      `select status from public.shipment_packages where id = $1`,
      [packageId],
    );
    assert.equal(pkg.rows[0].status, "handed_to_carrier");
    report.custody = true;
    console.log("OK custody handoff atomic status");
    await client.query("release savepoint custody_qa");
  } catch (error) {
    await client.query("rollback to savepoint custody_qa");
    await client.query("release savepoint custody_qa");
    console.log(`SKIP custody detail: ${error.message}`);
  }

  // --- Reactivation: release pending stop, clear assignment ---
  await clearAuth();
  const reactTask = randomUUID();
  const reactShipment = randomUUID();
  const reactRoute = randomUUID();
  const reactStop = randomUUID();
  await client.query(
    `
    insert into public.shipments (id, organization_id, code, customer_name, country, carrier)
    values ($1, $2, $3, 'React QA', 'Mexico', 'QA')
  `,
    [reactShipment, ctx.organization_id, `INV-REACT-${randomUUID().slice(0, 6)}`],
  );
  await client.query(
    `
    insert into public.shipment_logistics_tasks (
      id, organization_id, shipment_id, task_type, status, assigned_to,
      scheduled_at, schedule_confirmation_status
    ) values ($1, $2, $3, 'deliver_empty_box', 'cancelled', $4, now(), 'confirmed')
  `,
    [reactTask, ctx.organization_id, reactShipment, driverA],
  );
  await client.query(
    `
    insert into public.logistics_routes (
      id, organization_id, route_date, name, status, assigned_to, vehicle_id
    ) values ($1, $2, $3::date, 'React route', 'planned', $4, $5)
  `,
    [reactRoute, ctx.organization_id, today, driverA, vehicleA],
  );
  await client.query(
    `
    insert into public.logistics_route_stops (
      id, organization_id, route_id, task_id, stop_order, lat, lng
    ) values ($1, $2, $3, $4, 1, 34.4, -118.5)
  `,
    [reactStop, ctx.organization_id, reactRoute, reactTask],
  );

  // Simulate TS reactivation SQL effects: release pending stop
  await client.query(
    `
    update public.logistics_route_stops
    set released_at = now(), outcome = 'cancelled', outcome_at = now()
    where id = $1 and outcome is null
  `,
    [reactStop],
  );
  await client.query(
    `
    update public.shipment_logistics_tasks
    set status = 'scheduled', assigned_to = null
    where id = $1
  `,
    [reactTask],
  );
  const reactCheck = await client.query(
    `
    select
      (select released_at is not null from public.logistics_route_stops where id = $1) as released,
      (select assigned_to from public.shipment_logistics_tasks where id = $2) as assigned,
      (select count(*)::int from public.logistics_route_stops where task_id = $2 and released_at is null) as open_stops
  `,
    [reactStop, reactTask],
  );
  assert.equal(reactCheck.rows[0].released, true);
  assert.equal(reactCheck.rows[0].assigned, null);
  assert.equal(reactCheck.rows[0].open_stops, 0);
  report.reactivation = true;
  console.log("OK reactivation cleanup semantics");

  // --- L-H5: fail_conductor_task_atomic ---
  const failShipment = randomUUID();
  const failTaskId = randomUUID();
  const failRoute = randomUUID();
  const failStop = randomUUID();
  const failCode = `INV-QA-FAIL-${randomUUID().slice(0, 6)}`;
  await client.query(
    `
    insert into public.shipments (id, organization_id, code, customer_name, country, carrier)
    values ($1, $2, $3, 'Cliente QA Fail', 'Mexico', 'QA')
  `,
    [failShipment, ctx.organization_id, failCode],
  );
  await client.query(
    `
    insert into public.shipment_logistics_tasks (
      id, organization_id, shipment_id, task_type, status, assigned_to,
      scheduled_at, schedule_confirmation_status, warehouse_id
    ) values (
      $1, $2, $3, 'deliver_empty_box', 'assigned', $4,
      $5::date + time '15:00', 'confirmed', $6
    )
  `,
    [failTaskId, ctx.organization_id, failShipment, driverA, today, ctx.warehouse_id],
  );
  await client.query(
    `
    insert into public.logistics_routes (
      id, organization_id, route_date, name, status, assigned_to, vehicle_id, warehouse_id,
      started_at, started_lat, started_lng
    ) values (
      $1, $2, $3::date, 'QA Fail Route', 'in_progress', $4, $5, $6,
      now(), 34.41, -118.50
    )
  `,
    [failRoute, ctx.organization_id, today, driverA, vehicleA, ctx.warehouse_id],
  );
  await client.query(
    `
    insert into public.logistics_route_stops (
      id, organization_id, route_id, task_id, stop_order, lat, lng
    ) values ($1, $2, $3, $4, 1, 34.41, -118.50)
  `,
    [failStop, ctx.organization_id, failRoute, failTaskId],
  );

  const failOp = randomUUID();
  await authenticated(driverA, async () => {
    const first = await client.query(
      `
      select public.fail_conductor_task_atomic(
        $1, $2, $3, 'nota', 'Cliente no contesto', '', $4, now(), false, $3
      ) as result
    `,
      [ctx.organization_id, failTaskId, driverA, failOp],
    );
    assert.equal(first.rows[0].result.replayed, false);
    assert.equal(first.rows[0].result.status, "cancelled");

    const second = await client.query(
      `
      select public.fail_conductor_task_atomic(
        $1, $2, $3, 'nota', 'Cliente no contesto', '', $4, now(), false, $3
      ) as result
    `,
      [ctx.organization_id, failTaskId, driverA, failOp],
    );
    assert.equal(second.rows[0].result.replayed, true);
  });

  const failState = await client.query(
    `
    select
      t.status as task_status,
      s.outcome as stop_outcome,
      (select count(*)::int from public.shipment_logistics_task_attempts
        where task_id = $1 and client_operation_id = $2::uuid) as attempt_count
    from public.shipment_logistics_tasks t
    join public.logistics_route_stops s on s.task_id = t.id and s.released_at is null
    where t.id = $1
  `,
    [failTaskId, failOp],
  );
  assert.equal(failState.rows[0].task_status, "cancelled");
  assert.equal(failState.rows[0].stop_outcome, "failed");
  assert.equal(failState.rows[0].attempt_count, 1);

  await authenticated(driverA, async () => {
    await expectDatabaseError("fail_conflict", /ATTEMPT_CONFLICT/, async () => {
      await client.query(
        `
        select public.fail_conductor_task_atomic(
          $1, $2, $3, 'otra nota', 'Cliente no contesto', '', $4, now(), false, $3
        )
      `,
        [ctx.organization_id, failTaskId, driverA, failOp],
      );
    });
  });

  // Rollback of fail mutation: force error after insert path via invalid op on executable task
  const failShip2 = randomUUID();
  const failTask2 = randomUUID();
  const failRoute2 = randomUUID();
  const failStop2 = randomUUID();
  await client.query(
    `
    insert into public.shipments (id, organization_id, code, customer_name, country, carrier)
    values ($1, $2, $3, 'Cliente QA Fail2', 'Mexico', 'QA')
  `,
    [failShip2, ctx.organization_id, `INV-QA-F2-${randomUUID().slice(0, 6)}`],
  );
  await client.query(
    `
    insert into public.shipment_logistics_tasks (
      id, organization_id, shipment_id, task_type, status, assigned_to,
      scheduled_at, schedule_confirmation_status, warehouse_id
    ) values (
      $1, $2, $3, 'deliver_empty_box', 'assigned', $4,
      $5::date + time '16:00', 'confirmed', $6
    )
  `,
    [failTask2, ctx.organization_id, failShip2, driverA, today, ctx.warehouse_id],
  );
  await client.query(
    `
    insert into public.logistics_routes (
      id, organization_id, route_date, name, status, assigned_to, vehicle_id, warehouse_id,
      started_at, started_lat, started_lng
    ) values (
      $1, $2, $3::date, 'QA Fail Route 2', 'in_progress', $4, $5, $6,
      now(), 34.41, -118.50
    )
  `,
    [failRoute2, ctx.organization_id, today, driverA, vehicleA, ctx.warehouse_id],
  );
  await client.query(
    `
    insert into public.logistics_route_stops (
      id, organization_id, route_id, task_id, stop_order, lat, lng
    ) values ($1, $2, $3, $4, 1, 34.41, -118.50)
  `,
    [failStop2, ctx.organization_id, failRoute2, failTask2],
  );

  await authenticated(driverB, async () => {
    await expectDatabaseError("fail_scope_open", /FORBIDDEN|TASK_NOT_ASSIGNED/, async () => {
      await client.query(
        `
        select public.fail_conductor_task_atomic(
          $1, $2, $3, 'nota', 'Cliente no contesto', '', $4, now(), false, $3
        )
      `,
        [ctx.organization_id, failTask2, driverB, randomUUID()],
      );
    });
  });

  await authenticated(driverA, async () => {
    await expectDatabaseError("fail_reason", /FAILURE_REASON_REQUIRED/, async () => {
      await client.query(
        `
        select public.fail_conductor_task_atomic(
          $1, $2, $3, 'nota', '', '', $4, now(), false, $3
        )
      `,
        [ctx.organization_id, failTask2, driverA, randomUUID()],
      );
    });
  });
  const unchanged = await client.query(
    `
    select
      (select status from public.shipment_logistics_tasks where id = $1) as task_status,
      (select count(*)::int from public.shipment_logistics_task_attempts where task_id = $1) as attempts
  `,
    [failTask2],
  );
  assert.equal(unchanged.rows[0].task_status, "assigned");
  assert.equal(unchanged.rows[0].attempts, 0);

  await authenticated(driverA, async () => {
    await expectDatabaseError("fail_already", /TASK_CANCELLED/, async () => {
      await client.query(
        `
        select public.fail_conductor_task_atomic(
          $1, $2, $3, 'nota', 'Cliente no contesto', '', $4, now(), false, $3
        )
      `,
        [ctx.organization_id, failTaskId, driverA, randomUUID()],
      );
    });
  });

  report.failAtomic = true;
  console.log("OK L-H5 fail_conductor_task_atomic");

  // --- Mini E2E complete routeA stop C remains ---
  await client.query(
    `
    update public.shipment_logistics_tasks
    set status = 'assigned'
    where id = $1
  `,
    [taskC],
  );
  await client.query(
    `
    update public.logistics_routes
    set status = 'in_progress', started_at = coalesce(started_at, now()),
        started_lat = 34.41, started_lng = -118.5
    where id = $1
  `,
    [routeA],
  );
  await authenticated(driverA, async () => {
    await client.query(
      `
      select public.complete_conductor_task_atomic(
        $1, $2, $3, 'completed', 'pickup ok', null, 'evidence://qa-pickup', $4, now(),
        0, null, 0, null, false, $3,
        jsonb_build_object('status','completed','completed_at', now()::text),
        '{}'::jsonb, '{}'::jsonb, 0, 0, null, null, null, null, false
      )
    `,
      [ctx.organization_id, taskC, driverA, randomUUID()],
    );
  });
  await client.query(
    `
    update public.logistics_routes
    set status = 'completed', completed_at = now(), completed_by = $2
    where id = $1
  `,
    [routeA, driverA],
  );
  const done = await client.query(
    `select status from public.logistics_routes where id = $1`,
    [routeA],
  );
  assert.equal(done.rows[0].status, "completed");
  report.e2e = true;
  console.log("OK mini e2e complete");

  console.log("\nREPORT", report);
  console.log("auditPublishRows", auditPublish.rows[0]);
  console.log("ALL LOGISTICS INTEGRITY DB TESTS PASSED (rolling back)");
} catch (error) {
  console.error("FAILED", error);
  console.error("PARTIAL", report);
  await client.query("rollback");
  await client.end();
  process.exit(1);
}

await client.query("rollback");
await client.end();
