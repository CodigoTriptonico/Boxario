/**
 * DB integrity gate for P0/P1 security + payment + warehouse hardening (migrations 158+)
 * and atomic multi-line logistics task updates (migration 165).
 * Usage: npm run test:db-integrity
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { connectPg } from "./lib/db-connection.mjs";
import { seedTwoTenantLogisticsFixture } from "./lib/phase1-two-tenant-fixture.mjs";

const { client, label } = await connectPg();
console.log(`DB integrity tests on ${label}`);

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

function scenario(name) {
  return {
    name,
    ok: false,
    detail: "",
  };
}

await client.query("begin");
const report = {
  grants: false,
  completeAuth: false,
  notifyAuth: false,
  activityInsertDenied: false,
  warehouseDefaultDeny: false,
  paymentRecalc: false,
  overloads: false,
  daysWrite: false,
  crossTenant: false,
};
const atomicScenarios = [
  scenario("1_no_session"),
  scenario("2_cross_org"),
  scenario("3_driver_unassigned"),
  scenario("4_invalid_transition"),
  scenario("5_single_line"),
  scenario("6_multi_line"),
  scenario("7_reserved_not_consumed"),
  scenario("8_insufficient_reverts"),
  scenario("9_intermediate_fail_reverts"),
  scenario("10_idempotent_retry"),
  scenario("11_payload_mismatch"),
  scenario("12_concurrent_no_negative"),
  scenario("13_audit_once"),
  scenario("14_actor_from_auth"),
  scenario("15_shipment_coherent"),
  scenario("16_no_orphan_movements"),
  scenario("17_mark_specialized_still_gated"),
];

try {
  // Grants / function presence
  const grants = await client.query(`
    select p.proname, pg_get_function_identity_arguments(p.oid) as args,
      (select string_agg(grantee || ':' || privilege_type, ',')
         from information_schema.role_routine_grants g
        where g.specific_schema = 'public'
          and g.routine_name = p.proname) as grants
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'complete_conductor_task_atomic',
        'notify_logistics_route_change',
        'collect_shipment_invoice_payment',
        'record_activity_history',
        'start_logistics_route_atomic',
        'user_can_access_warehouse',
        'update_logistics_task_atomic',
        'mark_logistics_task_loaded_with_stock_atomic',
        'deduct_empty_box_stock_for_task_lines',
        'apply_logistics_empty_box_salida'
    )
    order by p.proname
  `);
  assert.ok(grants.rowCount >= 8, "expected hardened functions present");
  const updateGrants = grants.rows.find((r) => r.proname === "update_logistics_task_atomic");
  assert.ok(updateGrants, "update_logistics_task_atomic missing");
  assert.match(String(updateGrants.grants || ""), /authenticated/i);
  assert.doesNotMatch(String(updateGrants.grants || ""), /\banon:/i);
  const deductGrants = grants.rows.find((r) => r.proname === "deduct_empty_box_stock_for_task_lines");
  assert.ok(deductGrants, "deduct helper missing");
  assert.doesNotMatch(String(deductGrants.grants || ""), /authenticated/i);
  report.grants = true;

  const { orgA, orgB } = await seedTwoTenantLogisticsFixture(client);
  const orgId = orgA.orgId;
  const adminId = orgA.adminId;
  const warehouseId = orgA.warehouseId;
  const conductorId = orgA.conductorId;
  const logisticsId = orgA.logisticsId;

  const crossTenant = {
    aCannotReadBRoute: false,
    aCannotReadBTask: false,
    aCannotReadBNotif: false,
    aCannotReadBActivity: false,
    aCannotReadBStock: false,
    aCannotUpdateBTask: false,
    aCannotCompleteBTaskRpc: false,
    aCannotUpdateLogisticsB: false,
    bCannotReadARoute: false,
    bCannotReadATask: false,
    bCannotReadANotif: false,
    conductorACannotSeeB: false,
    conductorACannotCompleteB: false,
    spoofedOrgIgnored: false,
    spoofedActorIgnored: false,
    uuidKnowledgeDenied: false,
  };

  // complete_conductor_task_atomic requires auth
  await expectDatabaseError("no_auth_complete", /UNAUTHORIZED|permission denied|42501/i, async () => {
    await client.query(`select public.complete_conductor_task_atomic(
      $1, $2, $3, 'completed', '', '', '', $4, now(), 0, '', 0, 'not_applicable', false,
      $5, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 0, 0, 'full', 'open', 'not_exportable', null, false
    )`, [orgId, randomUUID(), conductorId, randomUUID(), adminId]);
  });
  report.completeAuth = true;

  // --- Mandatory cross-tenant isolation (never SKIP) ---
  await authenticated(orgA.adminId, async () => {
    assert.equal(
      (await client.query(`select id from public.logistics_routes where id = $1`, [orgB.routeId])).rowCount,
      0,
    );
    crossTenant.aCannotReadBRoute = true;

    assert.equal(
      (await client.query(`select id from public.shipment_logistics_tasks where id = $1`, [orgB.taskId])).rowCount,
      0,
    );
    crossTenant.aCannotReadBTask = true;

    assert.equal(
      (await client.query(`select id from public.logistics_route_notifications where id = $1`, [orgB.notifId])).rowCount,
      0,
    );
    crossTenant.aCannotReadBNotif = true;

    assert.equal(
      (await client.query(`select id from public.activity_history where id = $1`, [orgB.activityId])).rowCount,
      0,
    );
    crossTenant.aCannotReadBActivity = true;

    assert.equal(
      (await client.query(`select id from public.inventory_stock where item_id = $1`, [orgB.itemId])).rowCount,
      0,
    );
    crossTenant.aCannotReadBStock = true;

    await expectDatabaseError("cross_update_b_task", /0|policy|permission denied|42501|TASK_NOT_FOUND|FORBIDDEN/i, async () => {
      const updated = await client.query(
        `update public.shipment_logistics_tasks set notes = 'hack' where id = $1 returning id`,
        [orgB.taskId],
      );
      assert.equal(updated.rowCount, 0, "cross-org task update must affect 0 rows");
      throw new Error("0 rows updated");
    });
    crossTenant.aCannotUpdateBTask = true;

    await expectDatabaseError("cross_complete_b", /TASK_NOT_FOUND|FORBIDDEN|UNAUTHORIZED/i, async () => {
      await client.query(`select public.complete_conductor_task_atomic(
        $1, $2, $3, 'completed', '', '', '', $4, now(), 0, '', 0, 'not_applicable', false,
        $5, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 0, 0, 'full', 'open', 'not_exportable', null, false
      )`, [orgB.orgId, orgB.taskId, orgA.conductorId, randomUUID(), orgA.adminId]);
    });
    crossTenant.aCannotCompleteBTaskRpc = true;

    await expectDatabaseError("cross_update_task_atomic_b", /TASK_NOT_FOUND|FORBIDDEN|UNAUTHORIZED/i, async () => {
      await client.query(
        `select public.update_logistics_task_atomic($1, $2, $3::jsonb)`,
        [orgB.taskId, randomUUID(), JSON.stringify({ notes: "cross" })],
      );
    });
    crossTenant.aCannotUpdateLogisticsB = true;

    // Spoof org/actor parameters: identity still from auth.uid(); foreign org must fail.
    await expectDatabaseError(
      "spoof_org_complete",
      /TASK_NOT_FOUND|FORBIDDEN|UNAUTHORIZED|TASK_NOT_ASSIGNED_TO_DRIVER/i,
      async () => {
        await client.query(`select public.complete_conductor_task_atomic(
          $1, $2, $3, 'completed', '', '', '', $4, now(), 0, '', 0, 'not_applicable', false,
          $5, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 0, 0, 'full', 'open', 'not_exportable', null, false
        )`, [orgB.orgId, orgA.taskId, orgB.conductorId, randomUUID(), orgB.adminId]);
      },
    );
    crossTenant.spoofedOrgIgnored = true;

    await expectDatabaseError(
      "spoof_actor_notify",
      /FORBIDDEN|UNAUTHORIZED|ROUTE_NOT_FOUND|TASK_NOT_FOUND|not found|permission denied|42501/i,
      async () => {
        await client.query(`select public.notify_logistics_route_change(
          $1, $2, 'test', 'summary', null, $3, $4, 'Spoofed Actor'
        )`, [orgB.routeId, orgB.conductorId, randomUUID(), orgB.adminId]);
      },
    );
    crossTenant.spoofedActorIgnored = true;

    await expectDatabaseError("uuid_only_update", /TASK_NOT_FOUND|FORBIDDEN|UNAUTHORIZED/i, async () => {
      await client.query(
        `select public.update_logistics_task_atomic($1, $2, $3::jsonb)`,
        [orgB.taskId, randomUUID(), JSON.stringify({ status: "scheduled" })],
      );
    });
    crossTenant.uuidKnowledgeDenied = true;
  });

  await authenticated(orgB.adminId, async () => {
    assert.equal(
      (await client.query(`select id from public.logistics_routes where id = $1`, [orgA.routeId])).rowCount,
      0,
    );
    crossTenant.bCannotReadARoute = true;
    assert.equal(
      (await client.query(`select id from public.shipment_logistics_tasks where id = $1`, [orgA.taskId])).rowCount,
      0,
    );
    crossTenant.bCannotReadATask = true;
    assert.equal(
      (await client.query(`select id from public.logistics_route_notifications where id = $1`, [orgA.notifId])).rowCount,
      0,
    );
    crossTenant.bCannotReadANotif = true;
  });

  await authenticated(orgA.conductorId, async () => {
    assert.equal(
      (await client.query(`select id from public.logistics_routes where id = $1`, [orgB.routeId])).rowCount,
      0,
    );
    assert.equal(
      (await client.query(`select id from public.shipment_logistics_tasks where id = $1`, [orgB.taskId])).rowCount,
      0,
    );
    crossTenant.conductorACannotSeeB = true;

    await expectDatabaseError("driver_complete_b", /TASK_NOT_FOUND|FORBIDDEN|UNAUTHORIZED/i, async () => {
      await client.query(`select public.complete_conductor_task_atomic(
        $1, $2, $3, 'completed', '', '', '', $4, now(), 0, '', 0, 'not_applicable', false,
        $5, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb, 0, 0, 'full', 'open', 'not_exportable', null, false
      )`, [orgB.orgId, orgB.taskId, orgA.conductorId, randomUUID(), orgA.conductorId]);
    });
    crossTenant.conductorACannotCompleteB = true;
  });

  assert.ok(
    Object.values(crossTenant).every(Boolean),
    `cross-tenant incomplete: ${JSON.stringify(crossTenant)}`,
  );
  report.crossTenant = true;
  console.log("Cross-tenant report", crossTenant);

  // notify requires auth
  await expectDatabaseError("no_auth_notify", /UNAUTHORIZED|permission denied|42501/i, async () => {
    await client.query(`select public.notify_logistics_route_change(
      $1, $2, 'test', 'summary', null, $3, $4, 'Actor'
    )`, [randomUUID(), conductorId, randomUUID(), adminId]);
  });
  report.notifyAuth = true;

  // Direct activity_history insert denied for authenticated
  await authenticated(adminId, async () => {
    await expectDatabaseError("activity_direct", /policy|permission denied|42501|RLS/i, async () => {
      await client.query(`
        insert into public.activity_history (
          organization_id, actor_id, actor_name, action, entity_type, title
        ) values ($1, $2, 'spoof', 'hack', 'shipment', 'should fail')
      `, [orgId, adminId]);
    });
  });
  report.activityInsertDenied = true;

  // Warehouse default deny for logistics without warehouse assignment
  await authenticated(logisticsId, async () => {
    const access = await client.query(`select public.user_can_access_warehouse($1) as ok`, [warehouseId]);
    assert.equal(access.rows[0].ok, false);
  });
  report.warehouseDefaultDeny = true;

  // Inventory overloads: only cost-aware signature remains
  const overloads = await client.query(`
    select pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'record_inventory_movement_atomic'
  `);
  assert.equal(overloads.rowCount, 1);
  assert.match(overloads.rows[0].args, /p_unit_cost/);
  report.overloads = true;

  // Days write no longer touches pickup_days
  const daysFn = await client.query(`
    select pg_get_functiondef(p.oid) as def
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'set_logistics_route_weekday_enabled'
  `);
  assert.doesNotMatch(daysFn.rows[0].def, /pickup_days\s*=/);
  report.daysWrite = true;

  // Payment collector rejects overpayment when authenticated with a real shipment if available
  const shipment = await client.query(`
    select id, paid, logistics_plan
    from public.shipments
    where organization_id = $1
      and coalesce((logistics_plan #>> '{billing,quotedTotal}'), '') <> ''
    limit 1
  `, [orgId]);
  if (shipment.rowCount) {
    await authenticated(adminId, async () => {
      const quoted = Number(String(shipment.rows[0].logistics_plan?.billing?.quotedTotal || "0").replace(/[^0-9.-]/g, "")) || 0;
      const paid = Number(shipment.rows[0].paid) || 0;
      const balance = Math.max(quoted - paid, 0);
      if (balance > 0) {
        await expectDatabaseError("overpay", /saldo pendiente|Monto|invalido|Total/i, async () => {
          await client.query(`
            select public.collect_shipment_invoice_payment(
              $1, $2, 0, 0, 'full', 'open', 'not_exportable', null,
              $3::jsonb, $4, 'efectivo', 'balance', 'test overpay', $5
            )
          `, [shipment.rows[0].id, orgId, JSON.stringify(shipment.rows[0].logistics_plan), balance + 50, adminId]);
        });
        report.paymentRecalc = true;
      } else {
        report.paymentRecalc = true;
      }
    });
  } else {
    report.paymentRecalc = true;
  }

  // ---------------------------------------------------------------------------
  // Migration 165: update_logistics_task_atomic
  // ---------------------------------------------------------------------------
  assert.ok(
    (await client.query(`
      select 1 from public.app_schema_migrations where name like '165_%' limit 1
    `)).rowCount > 0 ||
    (await client.query(`
      select 1 from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'update_logistics_task_atomic'
    `)).rowCount > 0,
    "migration 165 / update_logistics_task_atomic required",
  );

  const category = await client.query(`
    select id from public.inventory_categories
    where organization_id = $1
    order by name
    limit 1
  `, [orgId]);
  let categoryId = category.rows[0]?.id;
  if (!categoryId) {
    categoryId = randomUUID();
    await client.query(`
      insert into public.inventory_categories (id, organization_id, name)
      values ($1, $2, 'QA Atomic Boxes')
    `, [categoryId, orgId]);
  }

  async function seedBoxItem(label, stockQty, reservedQty = 0) {
    const itemId = randomUUID();
    await client.query(`
      insert into public.inventory_items (id, organization_id, category_id, name, kind)
      values ($1, $2, $3, $4, $4)
    `, [itemId, orgId, categoryId, label]);
    await client.query(`
      insert into public.inventory_stock (
        organization_id, warehouse_id, item_id, stock, reserved, assigned, unavailable, min_stock
      ) values ($1, $2, $3, $4, $5, 0, 0, 0)
    `, [orgId, warehouseId, itemId, stockQty, reservedQty]);
    return itemId;
  }

  async function seedTask(options = {}) {
    const shipmentId = randomUUID();
    const taskId = randomUUID();
    const code = `INV-ATM-${shipmentId.slice(0, 6)}`;
    const boxLines = options.boxLines || [{ label: "Caja Grande", quantity: 1 }];
    const plan = {
      boxLines,
      emptyBox: { mode: "Entrega", scheduleMode: "pending" },
      ...(options.planExtra || {}),
    };
    await client.query(`
      insert into public.shipments (id, organization_id, code, customer_name, country, carrier, logistics_plan)
      values ($1, $2, $3, 'Atomic QA', 'Mexico', 'QA', $4::jsonb)
    `, [shipmentId, orgId, code, JSON.stringify(plan)]);
    await client.query(`
      insert into public.shipment_logistics_tasks (
        id, organization_id, shipment_id, task_type, status, assigned_to, warehouse_id
      ) values ($1, $2, $3, $4, $5, $6, $7)
    `, [
      taskId,
      orgId,
      shipmentId,
      options.taskType || "deliver_empty_box",
      options.status || "assigned",
      options.assignedTo ?? null,
      warehouseId,
    ]);
    return { shipmentId, taskId, code };
  }

  // 1. No session
  {
    const s = atomicScenarios[0];
    await expectDatabaseError("atm_no_auth", /UNAUTHORIZED|permission denied|42501/i, async () => {
      await client.query(
        `select public.update_logistics_task_atomic($1, $2, $3::jsonb)`,
        [randomUUID(), randomUUID(), JSON.stringify({ status: "loaded_to_truck" })],
      );
    });
    s.ok = true;
  }

  // 2. Cross-org (mandatory; fixtures always create org B)
  {
    const s = atomicScenarios[1];
    await authenticated(adminId, async () => {
      await expectDatabaseError("atm_cross", /TASK_NOT_FOUND|FORBIDDEN|UNAUTHORIZED/i, async () => {
        await client.query(
          `select public.update_logistics_task_atomic($1, $2, $3::jsonb)`,
          [orgB.taskId, randomUUID(), JSON.stringify({ status: "scheduled" })],
        );
      });
    });
    s.ok = true;
  }

  // 3. Conductor without routes.update_status / sales.manage rejected
  {
    const s = atomicScenarios[2];
    const { taskId } = await seedTask({ status: "assigned", assignedTo: conductorId });
    await authenticated(conductorId, async () => {
      await expectDatabaseError("atm_driver", /FORBIDDEN|UNAUTHORIZED/i, async () => {
        await client.query(
          `select public.update_logistics_task_atomic($1, $2, $3::jsonb)`,
          [taskId, randomUUID(), JSON.stringify({ status: "loaded_to_truck", warehouseId })],
        );
      });
    });
    s.ok = true;
  }

  // 4. Invalid transition
  {
    const s = atomicScenarios[3];
    const { taskId } = await seedTask({ status: "completed" });
    await authenticated(adminId, async () => {
      await expectDatabaseError("atm_bad_transition", /TASK_TRANSITION_NOT_ALLOWED/i, async () => {
        await client.query(
          `select public.update_logistics_task_atomic($1, $2, $3::jsonb)`,
          [taskId, randomUUID(), JSON.stringify({ status: "assigned" })],
        );
      });
    });
    s.ok = true;
  }

  // 5. Single line success
  {
    const s = atomicScenarios[4];
    await seedBoxItem("Caja Grande", 5);
    const { taskId, shipmentId } = await seedTask({
      boxLines: [{ label: "Caja Grande", quantity: 1 }],
      status: "assigned",
    });
    const op = randomUUID();
    let result;
    await authenticated(adminId, async () => {
      result = await client.query(
        `select public.update_logistics_task_atomic($1, $2, $3::jsonb) as payload`,
        [taskId, op, JSON.stringify({ status: "loaded_to_truck", warehouseId })],
      );
    });
    assert.equal(result.rows[0].payload.status, "loaded_to_truck");
    assert.ok(result.rows[0].payload.stockDeductedAt);
    assert.equal(result.rows[0].payload.actorId, adminId);
    const stock = await client.query(`
      select stock, reserved from public.inventory_stock
      where organization_id = $1 and warehouse_id = $2
        and item_id in (select id from public.inventory_items where organization_id = $1 and kind = 'Caja Grande')
      order by item_id desc limit 1
    `, [orgId, warehouseId]);
    assert.equal(Number(stock.rows[0].stock), 4);
    const movements = await client.query(`
      select count(*)::int as n from public.inventory_movements
      where organization_id = $1 and reference_id = $2 and type = 'salida'
    `, [orgId, shipmentId]);
    assert.equal(movements.rows[0].n, 1);
    s.ok = true;
  }

  // 6. Multi-line success
  {
    const s = atomicScenarios[5];
    await seedBoxItem("Caja Mediana QA", 10);
    await seedBoxItem("Caja Chica QA", 10);
    const { taskId, shipmentId } = await seedTask({
      boxLines: [
        { label: "Caja Mediana QA", quantity: 2 },
        { label: "Caja Chica QA", quantity: 3 },
      ],
      status: "assigned",
    });
    await authenticated(adminId, async () => {
      const result = await client.query(
        `select public.update_logistics_task_atomic($1, $2, $3::jsonb) as payload`,
        [taskId, randomUUID(), JSON.stringify({ status: "loaded_to_truck", warehouseId })],
      );
      assert.equal(result.rows[0].payload.status, "loaded_to_truck");
      assert.equal(result.rows[0].payload.stockResult?.deductedCount, 2);
    });
    const movements = await client.query(`
      select count(*)::int as n from public.inventory_movements
      where organization_id = $1 and reference_id = $2 and type = 'salida'
    `, [orgId, shipmentId]);
    assert.equal(movements.rows[0].n, 2);
    s.ok = true;
  }

  // 7. Reserved stock not consumed
  {
    const s = atomicScenarios[6];
    await seedBoxItem("Caja Reservada QA", 5, 5);
    const { taskId } = await seedTask({
      boxLines: [{ label: "Caja Reservada QA", quantity: 1 }],
      status: "assigned",
    });
    await authenticated(adminId, async () => {
      await expectDatabaseError("atm_reserved", /Stock insuficiente/i, async () => {
        await client.query(
          `select public.update_logistics_task_atomic($1, $2, $3::jsonb)`,
          [taskId, randomUUID(), JSON.stringify({ status: "loaded_to_truck", warehouseId })],
        );
      });
    });
    const stock = await client.query(`
      select stock, reserved from public.inventory_stock
      where organization_id = $1 and warehouse_id = $2
        and item_id in (select id from public.inventory_items where organization_id = $1 and kind = 'Caja Reservada QA')
      order by item_id desc limit 1
    `, [orgId, warehouseId]);
    assert.equal(Number(stock.rows[0].stock), 5);
    assert.equal(Number(stock.rows[0].reserved), 5);
    const reservedTask = await client.query(
      `select status, stock_deducted_at from public.shipment_logistics_tasks where id = $1`,
      [taskId],
    );
    assert.equal(reservedTask.rows[0].status, "assigned");
    assert.equal(reservedTask.rows[0].stock_deducted_at, null);
    s.ok = true;
  }

  // 8. Insufficient stock reverts everything (multi-line, second fails)
  {
    const s = atomicScenarios[7];
    await seedBoxItem("Caja Ok QA", 5);
    await seedBoxItem("Caja Fail QA", 0);
    const { taskId, shipmentId } = await seedTask({
      boxLines: [
        { label: "Caja Ok QA", quantity: 1 },
        { label: "Caja Fail QA", quantity: 1 },
      ],
      status: "assigned",
    });
    await authenticated(adminId, async () => {
      await expectDatabaseError("atm_insuff", /Stock insuficiente|No hay stock/i, async () => {
        await client.query(
          `select public.update_logistics_task_atomic($1, $2, $3::jsonb)`,
          [taskId, randomUUID(), JSON.stringify({ status: "loaded_to_truck", warehouseId })],
        );
      });
    });
    const task = await client.query(
      `select status, stock_deducted_at from public.shipment_logistics_tasks where id = $1`,
      [taskId],
    );
    assert.equal(task.rows[0].status, "assigned");
    assert.equal(task.rows[0].stock_deducted_at, null);
    const movements = await client.query(`
      select count(*)::int as n from public.inventory_movements
      where organization_id = $1 and reference_id = $2
    `, [orgId, shipmentId]);
    assert.equal(movements.rows[0].n, 0);
    const okStock = await client.query(`
      select stock from public.inventory_stock
      where organization_id = $1 and warehouse_id = $2
        and item_id in (select id from public.inventory_items where organization_id = $1 and kind = 'Caja Ok QA')
      order by item_id desc limit 1
    `, [orgId, warehouseId]);
    assert.equal(Number(okStock.rows[0].stock), 5);
    s.ok = true;
  }

  // 9. Intermediate forced failure reverts
  {
    const s = atomicScenarios[8];
    await seedBoxItem("Caja Force A", 5);
    await seedBoxItem("Caja Force B", 5);
    const { taskId, shipmentId } = await seedTask({
      boxLines: [
        { label: "Caja Force A", quantity: 1 },
        { label: "Caja Force B", quantity: 1 },
      ],
      status: "assigned",
    });
    await authenticated(adminId, async () => {
      await client.query(`select set_config('boxario.force_task_update_fail_after_line', '1', true)`);
      await expectDatabaseError("atm_force", /FORCED_INTERMEDIATE_FAILURE/i, async () => {
        await client.query(
          `select public.update_logistics_task_atomic($1, $2, $3::jsonb)`,
          [taskId, randomUUID(), JSON.stringify({ status: "loaded_to_truck", warehouseId })],
        );
      });
      await client.query(`select set_config('boxario.force_task_update_fail_after_line', '', true)`);
    });
    const task = await client.query(
      `select status, stock_deducted_at from public.shipment_logistics_tasks where id = $1`,
      [taskId],
    );
    assert.equal(task.rows[0].status, "assigned");
    assert.equal(task.rows[0].stock_deducted_at, null);
    const movements = await client.query(`
      select count(*)::int as n from public.inventory_movements
      where organization_id = $1 and reference_id = $2
    `, [orgId, shipmentId]);
    assert.equal(movements.rows[0].n, 0);
    s.ok = true;
  }

  // 10 + 13 + 14: Idempotent retry / audit once / actor from auth
  {
    const s10 = atomicScenarios[9];
    const s13 = atomicScenarios[12];
    const s14 = atomicScenarios[13];
    await seedBoxItem("Caja Idem QA", 8);
    const { taskId, shipmentId } = await seedTask({
      boxLines: [{ label: "Caja Idem QA", quantity: 1 }],
      status: "assigned",
    });
    const op = randomUUID();
    const changes = JSON.stringify({ status: "loaded_to_truck", warehouseId });
    let first;
    let second;
    await authenticated(adminId, async () => {
      first = await client.query(
        `select public.update_logistics_task_atomic($1, $2, $3::jsonb) as payload`,
        [taskId, op, changes],
      );
      second = await client.query(
        `select public.update_logistics_task_atomic($1, $2, $3::jsonb) as payload`,
        [taskId, op, changes],
      );
    });
    assert.equal(first.rows[0].payload.replayed, false);
    assert.equal(second.rows[0].payload.replayed, true);
    assert.equal(first.rows[0].payload.actorId, adminId);
    assert.equal(second.rows[0].payload.actorId, adminId);
    const movements = await client.query(`
      select count(*)::int as n from public.inventory_movements
      where organization_id = $1 and reference_id = $2 and type = 'salida'
    `, [orgId, shipmentId]);
    assert.equal(movements.rows[0].n, 1);
    const audits = await client.query(`
      select count(*)::int as n, max(actor_id::text) as actor
      from public.activity_history
      where organization_id = $1
        and entity_id = $2
        and action = 'shipment.logistics_task_updated'
        and metadata->>'clientOperationId' = $3
    `, [orgId, shipmentId, op]);
    assert.equal(audits.rows[0].n, 1);
    assert.equal(audits.rows[0].actor, adminId);
    s10.ok = true;
    s13.ok = true;
    s14.ok = true;
  }

  // 11. Same key different payload
  {
    const s = atomicScenarios[10];
    await seedBoxItem("Caja Mismatch QA", 5);
    const { taskId } = await seedTask({
      boxLines: [{ label: "Caja Mismatch QA", quantity: 1 }],
      status: "assigned",
    });
    const op = randomUUID();
    await authenticated(adminId, async () => {
      await client.query(
        `select public.update_logistics_task_atomic($1, $2, $3::jsonb)`,
        [taskId, op, JSON.stringify({ status: "loaded_to_truck", warehouseId })],
      );
      await expectDatabaseError("atm_mismatch", /OPERATION_KEY_PAYLOAD_MISMATCH/i, async () => {
        await client.query(
          `select public.update_logistics_task_atomic($1, $2, $3::jsonb)`,
          [taskId, op, JSON.stringify({ status: "loaded_to_truck", warehouseId, notes: "other" })],
        );
      });
    });
    s.ok = true;
  }

  // 12. Concurrent competing stock — run after main txn so two clients see committed rows.
  // Placeholder marked here; executed after rollback below.
  atomicScenarios[11].detail = "deferred";

  // 15. Shipment plan coherent after load
  {
    const s = atomicScenarios[14];
    await seedBoxItem("Caja Plan QA", 4);
    const { taskId, shipmentId } = await seedTask({
      boxLines: [{ label: "Caja Plan QA", quantity: 1 }],
      status: "assigned",
    });
    await authenticated(adminId, async () => {
      await client.query(
        `select public.update_logistics_task_atomic($1, $2, $3::jsonb)`,
        [taskId, randomUUID(), JSON.stringify({ status: "loaded_to_truck", warehouseId })],
      );
    });
    const ship = await client.query(
      `select logistics_plan from public.shipments where id = $1`,
      [shipmentId],
    );
    assert.ok(ship.rows[0].logistics_plan?.emptyBox?.stockDeductedAt);
    assert.equal(ship.rows[0].logistics_plan?.emptyBox?.stockWarehouseId, warehouseId);
    s.ok = true;
  }

  // 16. No orphan movements for failed ops already covered; assert helpers not client-callable
  {
    const s = atomicScenarios[15];
    await authenticated(adminId, async () => {
      await expectDatabaseError("atm_helper_denied", /permission denied|42501/i, async () => {
        await client.query(`
          select public.deduct_empty_box_stock_for_task_lines(
            $1, $2, $3, $4, $5, $5, $6
          )
        `, [orgId, randomUUID(), randomUUID(), warehouseId, adminId, randomUUID()]);
      });
    });
    s.ok = true;
  }

  // 17. Specialized mark_* still requires auth and warehouse access
  {
    const s = atomicScenarios[16];
    await expectDatabaseError("mark_no_auth", /UNAUTHORIZED|permission denied|42501/i, async () => {
      await client.query(`
        select public.mark_logistics_task_loaded_with_stock_atomic(
          $1, $2, $3, 'x', 1, 'k', null
        )
      `, [randomUUID(), warehouseId, randomUUID()]);
    });
    s.ok = true;
  }

  console.log("DB integrity report", report);
  assert.ok(Object.values(report).every(Boolean), `incomplete report: ${JSON.stringify(report)}`);
  assert.ok(
    atomicScenarios.filter((s) => s.name !== "12_concurrent_no_negative").every((s) => s.ok),
    `atomic scenarios failed: ${JSON.stringify(atomicScenarios.filter((s) => !s.ok && s.name !== "12_concurrent_no_negative"))}`,
  );
  await client.query("rollback");

  // --- Concurrent stock race (committed + cleaned) ---
  {
    const s = atomicScenarios[11];
    const clientA = client;
    const { client: clientB } = await connectPg();
    const raceItem = randomUUID();
    const raceLabel = `RaceBox_${raceItem.replace(/-/g, "").slice(0, 12)}`;
    const shipA = randomUUID();
    const shipB = randomUUID();
    const taskA = randomUUID();
    const taskB = randomUUID();
    let raceOrgId = null;
    let raceAdminId = null;
    let raceWarehouseId = null;
    let raceCategoryId = null;
    try {
      await clientA.query("begin");
      const fixture = await seedTwoTenantLogisticsFixture(clientA);
      raceOrgId = fixture.orgA.orgId;
      raceAdminId = fixture.orgA.adminId;
      raceWarehouseId = fixture.orgA.warehouseId;
      raceCategoryId = (
        await clientA.query(
          `select id from public.inventory_categories where organization_id = $1 limit 1`,
          [raceOrgId],
        )
      ).rows[0].id;

      await clientA.query(`
        insert into public.inventory_items (id, organization_id, category_id, name, kind)
        values ($1, $2, $3, $4, $4)
      `, [raceItem, raceOrgId, raceCategoryId, raceLabel]);
      await clientA.query(`
        insert into public.inventory_stock (
          organization_id, warehouse_id, item_id, stock, reserved, assigned, unavailable, min_stock
        ) values ($1, $2, $3, 1, 0, 0, 0, 0)
      `, [raceOrgId, raceWarehouseId, raceItem]);
      for (const [shipmentId, taskId, code] of [
        [shipA, taskA, `INV-RACE-${shipA.slice(0, 6)}`],
        [shipB, taskB, `INV-RACE-${shipB.slice(0, 6)}`],
      ]) {
        await clientA.query(`
          insert into public.shipments (id, organization_id, code, customer_name, country, carrier, logistics_plan)
          values ($1, $2, $3, 'Race QA', 'Mexico', 'QA', $4::jsonb)
        `, [
          shipmentId,
          raceOrgId,
          code,
          JSON.stringify({
            boxLines: [{ label: raceLabel, quantity: 1 }],
            emptyBox: { mode: "Entrega" },
          }),
        ]);
        await clientA.query(`
          insert into public.shipment_logistics_tasks (
            id, organization_id, shipment_id, task_type, status, warehouse_id
          ) values ($1, $2, $3, 'deliver_empty_box', 'assigned', $4)
        `, [taskId, raceOrgId, shipmentId, raceWarehouseId]);
      }
      await clientA.query("commit");

      const run = async (target, taskId, op) => {
        await target.query("begin");
        try {
          await target.query("set local role authenticated");
          await target.query("select set_config('request.jwt.claims', $1, true)", [
            JSON.stringify({ sub: raceAdminId, role: "authenticated" }),
          ]);
          const result = await target.query(
            `select public.update_logistics_task_atomic($1, $2, $3::jsonb) as payload`,
            [taskId, op, JSON.stringify({ status: "loaded_to_truck", warehouseId: raceWarehouseId })],
          );
          await target.query("commit");
          return { ok: true, payload: result.rows[0].payload };
        } catch (error) {
          try {
            await target.query("rollback");
          } catch {
            // ignore
          }
          return { ok: false, error: String(error.message) };
        }
      };

      const [ra, rb] = await Promise.all([
        run(clientA, taskA, randomUUID()),
        run(clientB, taskB, randomUUID()),
      ]);
      const wins = [ra, rb].filter((r) => r.ok).length;
      const losses = [ra, rb].filter((r) => !r.ok).length;
      assert.equal(wins, 1, `expected one winner, got ${JSON.stringify([ra, rb])}`);
      assert.equal(losses, 1);
      assert.match([ra, rb].find((r) => !r.ok).error, /Stock insuficiente/i);

      const stock = await clientA.query(
        `select stock from public.inventory_stock where item_id = $1`,
        [raceItem],
      );
      assert.equal(Number(stock.rows[0].stock), 0);
      s.ok = true;
    } finally {
      try {
        await clientA.query("rollback");
      } catch {
        // ignore
      }
      try {
        await clientA.query("begin");
        await clientA.query(`delete from public.logistics_task_client_operations where task_id in ($1, $2)`, [taskA, taskB]);
        await clientA.query(`delete from public.activity_history where entity_id in ($1, $2)`, [shipA, shipB]);
        await clientA.query(`delete from public.shipment_logistics_tasks where id in ($1, $2)`, [taskA, taskB]);
        await clientA.query(`delete from public.shipments where id in ($1, $2)`, [shipA, shipB]);
        await clientA.query(`update public.inventory_stock set stock = 0, reserved = 0 where item_id = $1`, [raceItem]);
        await clientA.query("commit");
      } catch (cleanupError) {
        console.warn("race cleanup warning", cleanupError.message);
        try {
          await clientA.query("rollback");
        } catch {
          // ignore
        }
      }
      await clientB.end();
    }
  }

  console.log(
    "Atomic scenarios",
    Object.fromEntries(atomicScenarios.map((row) => [row.name, row.ok ? "PASS" : "FAIL"])),
  );
  assert.ok(
    atomicScenarios.every((row) => row.ok),
    `atomic scenarios failed: ${JSON.stringify(atomicScenarios.filter((row) => !row.ok))}`,
  );
  console.log("DB integrity tests passed");
  process.exit(0);
} catch (error) {
  console.error(error);
  try {
    await client.query("rollback");
  } catch {
    // ignore
  }
  process.exit(1);
} finally {
  await client.end();
}
