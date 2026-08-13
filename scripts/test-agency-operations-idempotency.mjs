/**
 * AGE-001 agency create + assign idempotency harness (migration 179).
 * Usage: node scripts/test-agency-operations-idempotency.mjs
 */
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { connectPg } from "./lib/db-connection.mjs";
import { seedTwoTenantLogisticsFixture } from "./lib/phase1-two-tenant-fixture.mjs";

const { client, label } = await connectPg();
console.log(`Agency operations idempotency tests on ${label}`);

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

async function createAuthUser(emailPrefix) {
  const id = randomUUID();
  const email = `${emailPrefix}.${id.slice(0, 8)}@boxario.local`;
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
  return { id, email };
}

async function seedAgencyUnderMatrix(matrixOrgId, labelSuffix) {
  const tenant = (
    await client.query(`select tenant_id from public.organizations where id = $1`, [matrixOrgId])
  ).rows[0];
  assert.ok(tenant?.tenant_id, "matrix must have tenant_id");

  await client.query(
    `
    update public.organizations
    set settings = coalesce(settings, '{}'::jsonb) || jsonb_build_object('agencies_enabled', true)
    where id = $1
  `,
    [matrixOrgId],
  );

  const agencyOwner = await createAuthUser(`qa.agency.${labelSuffix}`);
  const agencyOrgId = randomUUID();
  const agencySlug = `qa-agency-${labelSuffix}-${agencyOrgId.slice(0, 6)}`;

  await client.query(
    `
    insert into public.organizations (
      id, name, slug, kind, is_active, tenant_id, organization_type,
      organization_code, organization_status, matrix_organization_id, settings
    ) values (
      $1, $2, $3, 'client', true, $4, 'agency',
      upper($3), 'active', $5, '{"max_users":2,"max_warehouses":1}'::jsonb
    )
  `,
    [agencyOrgId, `QA Agency ${labelSuffix}`, agencySlug, tenant.tenant_id, matrixOrgId],
  );

  const roleId = (
    await client.query(
      `
      insert into public.roles (organization_id, slug, name, is_system)
      values ($1, 'administrador_agencia', 'Administrador de agencia', true)
      returning id
    `,
      [agencyOrgId],
    )
  ).rows[0].id;

  for (const key of [
    "agency.view",
    "agency.requests.view",
    "agency.requests.create",
    "agency.requests.edit",
  ]) {
    await client.query(
      `
      insert into public.role_permissions (role_id, permission_id, granted)
      select $1, permission.id, true
      from public.permissions permission
      where permission.key = $2
      on conflict (role_id, permission_id) do update set granted = true
    `,
      [roleId, key],
    );
  }

  const agencyId = (
    await client.query(
      `
      insert into public.agencies (
        tenant_id, matrix_organization_id, organization_id, code, status,
        max_administrators, max_sellers
      ) values ($1, $2, $3, $4, 'active', 1, 2)
      returning id
    `,
      [tenant.tenant_id, matrixOrgId, agencyOrgId, `QA-A-${labelSuffix}-${agencyOrgId.slice(0, 4)}`],
    )
  ).rows[0].id;

  await client.query(
    `
    insert into public.profiles (id, organization_id, role_id, email, full_name, is_active)
    values ($1, $2, $3, $4, $5, true)
  `,
    [agencyOwner.id, agencyOrgId, roleId, agencyOwner.email, `Agency Admin ${labelSuffix}`],
  );

  return {
    tenantId: tenant.tenant_id,
    agencyId,
    agencyOrgId,
    agencyOwnerId: agencyOwner.id,
  };
}

async function createRequest(userId, lines, note, key, requestedDate = null) {
  const result = await authenticated(userId, async () => {
    const { rows } = await client.query(
      `
      select public.create_agency_service_request($1::jsonb, $2::date, $3, $4) as result
    `,
      [JSON.stringify(lines), requestedDate, note, key],
    );
    return rows[0].result;
  });
  return result;
}

async function assignRequest(userId, requestId, routeId, key, scheduledFor = null) {
  const result = await authenticated(userId, async () => {
    const { rows } = await client.query(
      `
      select public.assign_agency_request_to_route($1::uuid, $2::uuid, $3::timestamptz, $4) as result
    `,
      [requestId, routeId, scheduledFor, key],
    );
    return rows[0].result;
  });
  return result;
}

async function countRequestsByKey(tenantId, key) {
  const { rows } = await client.query(
    `
    select count(*)::int as n
    from public.idempotency_operations
    where tenant_id = $1
      and operation_type = 'create_agency_service_request'
      and idempotency_key = $2
      and status = 'completed'
  `,
    [tenantId, key],
  );
  return rows[0].n;
}

async function countRequestsForAgency(agencyId) {
  const { rows } = await client.query(
    `select count(*)::int as n from public.agency_service_requests where agency_id = $1`,
    [agencyId],
  );
  return rows[0].n;
}

async function countVisitsForRequest(requestId) {
  const { rows } = await client.query(
    `
    select count(distinct visit.id)::int as visits,
           count(distinct stop.id)::int as stops
    from public.agency_service_request_lines line
    left join public.agency_visit_lines vl on vl.request_line_id = line.id
    left join public.agency_visits visit on visit.id = vl.visit_id
    left join public.logistics_route_stops stop
      on stop.agency_visit_id = visit.id and stop.released_at is null
    where line.request_id = $1
  `,
    [requestId],
  );
  return { visits: rows[0].visits, stops: rows[0].stops };
}

async function requestStatus(requestId) {
  const { rows } = await client.query(
    `select status, status_version from public.agency_service_requests where id = $1`,
    [requestId],
  );
  return rows[0];
}

const evidence = {
  createSequentialRequests: 0,
  createFinalRequests: 0,
  createReplays: 0,
  createConflicts: 0,
  createConcurrentCreated: 0,
  assignSequential: 0,
  assignFinalVisits: 0,
  assignFinalStops: 0,
  assignReplays: 0,
  assignRouteConflicts: 0,
  assignConcurrentWinner: 0,
  assignConcurrentConflicts: 0,
};

await client.query("begin");

try {
  const { orgA, orgB } = await seedTwoTenantLogisticsFixture(client);
  await client.query(`select public.initialize_business_matrix_organization($1)`, [orgA.orgId]);
  await client.query(`select public.initialize_business_matrix_organization($1)`, [orgB.orgId]);
  const agencyA = await seedAgencyUnderMatrix(orgA.orgId, "A");
  const agencyB = await seedAgencyUnderMatrix(orgB.orgId, "B");

  const hashCol = await client.query(`
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'idempotency_operations'
      and column_name = 'request_hash'
  `);
  assert.equal(hashCol.rowCount, 1, "request_hash column missing");

  const visitLineIdx = await client.query(`
    select 1 from pg_indexes
    where schemaname = 'public' and indexname = 'agency_visit_lines_request_line_uidx'
  `);
  assert.equal(visitLineIdx.rowCount, 1, "visit line uniqueness missing");

  const officeLines = [
    {
      serviceCode: "agency_office_full_box_pickup",
      quantity: 2,
      productKey: "Caja",
      boxSize: "M",
    },
  ];

  // --- CREATE: normal ---
  const createKey = `agency-create-${randomUUID()}`;
  const created = await createRequest(agencyA.agencyOwnerId, officeLines, "nota-a", createKey);
  assert.equal(created.replayed, false);
  assert.ok(created.requestId);
  evidence.createSequentialRequests = 1;
  evidence.createFinalRequests = await countRequestsForAgency(agencyA.agencyId);
  assert.equal(evidence.createFinalRequests, 1);

  // --- CREATE: identical replay ---
  const replay1 = await createRequest(agencyA.agencyOwnerId, officeLines, "nota-a", createKey);
  assert.equal(replay1.replayed, true);
  assert.equal(replay1.requestId, created.requestId);
  assert.equal(await countRequestsForAgency(agencyA.agencyId), 1);

  // --- CREATE: 100 sequential equivalent requests ---
  let createReplays = 1;
  for (let i = 0; i < 99; i += 1) {
    const r = await createRequest(agencyA.agencyOwnerId, officeLines, "nota-a", createKey);
    assert.equal(r.replayed, true);
    assert.equal(r.requestId, created.requestId);
    createReplays += 1;
  }
  evidence.createSequentialRequests = 100;
  evidence.createReplays = createReplays;
  evidence.createFinalRequests = await countRequestsForAgency(agencyA.agencyId);
  assert.equal(evidence.createFinalRequests, 1);
  assert.equal(evidence.createReplays, 100);
  assert.equal(await countRequestsByKey(agencyA.tenantId, createKey), 1);

  // --- CREATE: conflict payloads (same key) ---
  await expectError("create-type-conflict", /AGENCY_IDEMPOTENCY_CONFLICT/, async () => {
    await createRequest(
      agencyA.agencyOwnerId,
      [{
        serviceCode: "agency_office_empty_box_delivery",
        quantity: 2,
        productKey: "Caja",
        boxSize: "M",
        inventoryItemId: orgA.itemId,
        warehouseId: orgA.warehouseId,
      }],
      "nota-a",
      createKey,
    );
  });
  evidence.createConflicts += 1;

  await expectError("create-qty-conflict", /AGENCY_IDEMPOTENCY_CONFLICT/, async () => {
    await createRequest(
      agencyA.agencyOwnerId,
      [{ ...officeLines[0], quantity: 9 }],
      "nota-a",
      createKey,
    );
  });
  evidence.createConflicts += 1;

  // Same key string under another tenant is a separate namespace.
  const crossAgency = await createRequest(
    agencyB.agencyOwnerId,
    officeLines,
    "nota-a",
    createKey,
  );
  assert.equal(crossAgency.replayed, false);
  assert.notEqual(crossAgency.requestId, created.requestId);

  await expectError("create-forbidden", /FORBIDDEN/, async () => {
    await createRequest(orgA.conductorId, officeLines, "x", `agency-create-forb-${randomUUID()}`);
  });

  const second = await createRequest(
    agencyA.agencyOwnerId,
    officeLines,
    "otra",
    `agency-create-${randomUUID()}`,
  );
  assert.equal(second.replayed, false);
  assert.notEqual(second.requestId, created.requestId);

  // Historical-style request: already persisted; assign with a fresh client key must still work.
  const histCreated = await createRequest(
    agencyA.agencyOwnerId,
    officeLines,
    "historical",
    `agency-create-hist-${randomUUID()}`,
  );
  const histId = histCreated.requestId;
  assert.equal((await requestStatus(histId)).status, "submitted");

  const route2Id = randomUUID();
  const today = new Date().toISOString().slice(0, 10);
  await client.query(
    `
    insert into public.logistics_routes (
      id, organization_id, route_date, name, status, assigned_to, vehicle_id, warehouse_id
    )
    select $1, $2, $3::date, 'Ruta A2', 'planned', $4, vehicle_id, warehouse_id
    from public.logistics_routes where id = $5
  `,
    [route2Id, orgA.orgId, today, orgA.conductorId, orgA.routeId],
  );

  const assignKey = `agency-assign-${randomUUID()}`;
  const assigned = await assignRequest(
    orgA.adminId,
    created.requestId,
    orgA.routeId,
    assignKey,
  );
  assert.equal(assigned.replayed, false);
  assert.ok(assigned.visitId);
  evidence.assignSequential = 1;
  let counts = await countVisitsForRequest(created.requestId);
  assert.equal(counts.visits, 1);
  assert.equal(counts.stops, 1);
  evidence.assignFinalVisits = counts.visits;
  evidence.assignFinalStops = counts.stops;
  assert.equal((await requestStatus(created.requestId)).status, "assigned");
  const statusVersionAfterAssign = (await requestStatus(created.requestId)).status_version;

  const assignReplay = await assignRequest(
    orgA.adminId,
    created.requestId,
    orgA.routeId,
    assignKey,
  );
  assert.equal(assignReplay.replayed, true);
  assert.equal(assignReplay.visitId, assigned.visitId);

  let assignReplays = 1;
  for (let i = 0; i < 99; i += 1) {
    const r = await assignRequest(orgA.adminId, created.requestId, orgA.routeId, assignKey);
    assert.equal(r.replayed, true);
    assert.equal(r.visitId, assigned.visitId);
    assignReplays += 1;
  }
  evidence.assignSequential = 100;
  evidence.assignReplays = assignReplays;
  counts = await countVisitsForRequest(created.requestId);
  assert.equal(counts.visits, 1);
  assert.equal(counts.stops, 1);
  assert.equal((await requestStatus(created.requestId)).status_version, statusVersionAfterAssign);

  await expectError("assign-key-route-conflict", /AGENCY_IDEMPOTENCY_CONFLICT/, async () => {
    await assignRequest(orgA.adminId, created.requestId, route2Id, assignKey);
  });

  await expectError("assign-already", /REQUEST_ALREADY_ASSIGNED/, async () => {
    await assignRequest(
      orgA.adminId,
      created.requestId,
      route2Id,
      `agency-assign-${randomUUID()}`,
    );
  });
  evidence.assignRouteConflicts += 1;
  counts = await countVisitsForRequest(created.requestId);
  assert.equal(counts.visits, 1);
  assert.equal(counts.stops, 1);

  const cancelledReq = await createRequest(
    agencyA.agencyOwnerId,
    officeLines,
    "cancel",
    `agency-create-cancel-${randomUUID()}`,
  );
  await client.query(
    `update public.agency_service_requests set status = 'cancelled' where id = $1`,
    [cancelledReq.requestId],
  );
  await expectError("assign-cancelled", /REQUEST_CANCELLED|REQUEST_NOT_ASSIGNABLE/, async () => {
    await assignRequest(
      orgA.adminId,
      cancelledReq.requestId,
      orgA.routeId,
      `agency-assign-${randomUUID()}`,
    );
  });

  const completedReq = await createRequest(
    agencyA.agencyOwnerId,
    officeLines,
    "done",
    `agency-create-done-${randomUUID()}`,
  );
  await client.query(
    `update public.agency_service_requests set status = 'completed' where id = $1`,
    [completedReq.requestId],
  );
  await expectError("assign-completed", /REQUEST_NOT_ASSIGNABLE/, async () => {
    await assignRequest(
      orgA.adminId,
      completedReq.requestId,
      orgA.routeId,
      `agency-assign-${randomUUID()}`,
    );
  });

  await expectError("assign-missing", /REQUEST_NOT_FOUND|FORBIDDEN/, async () => {
    await assignRequest(
      orgA.adminId,
      randomUUID(),
      orgA.routeId,
      `agency-assign-${randomUUID()}`,
    );
  });

  const otherOrgReq = await createRequest(
    agencyB.agencyOwnerId,
    officeLines,
    "other-org",
    `agency-create-other-${randomUUID()}`,
  );
  await expectError("assign-cross-tenant", /REQUEST_NOT_FOUND|FORBIDDEN/, async () => {
    await assignRequest(
      orgA.adminId,
      otherOrgReq.requestId,
      orgA.routeId,
      `agency-assign-${randomUUID()}`,
    );
  });

  const permReq = await createRequest(
    agencyA.agencyOwnerId,
    officeLines,
    "perm",
    `agency-create-perm-${randomUUID()}`,
  );
  await expectError("assign-forbidden", /FORBIDDEN/, async () => {
    await assignRequest(
      orgA.conductorId,
      permReq.requestId,
      orgA.routeId,
      `agency-assign-${randomUUID()}`,
    );
  });

  const histAssign = await assignRequest(
    orgA.adminId,
    histId,
    orgA.routeId,
    `agency-assign-hist-${randomUUID()}`,
  );
  assert.equal(histAssign.replayed, false);

  // Timeout-after-commit simulation: identical replay after success
  const lostCreate = await createRequest(agencyA.agencyOwnerId, officeLines, "nota-a", createKey);
  assert.equal(lostCreate.replayed, true);
  const lostAssign = await assignRequest(orgA.adminId, created.requestId, orgA.routeId, assignKey);
  assert.equal(lostAssign.replayed, true);

  console.log(
    JSON.stringify(
      {
        connection: label,
        evidence,
        summary: {
          create: "100 equivalent -> 1 request -> 100 replays -> 0 duplicates",
          assign: "100 equivalent -> 1 visit -> 1 stop -> 100 replays -> 0 duplicates",
        },
        persistedChanges: false,
      },
      null,
      2,
    ),
  );

  await client.query("rollback");
  console.log("Transactional agency idempotency scenarios PASS (rolled back)");
} catch (error) {
  try {
    await client.query("rollback");
  } catch {
    // ignore
  }
  console.error("FAIL transactional agency operations idempotency:", error);
  await client.end();
  process.exit(1);
}

// --- Concurrency (committed + cleaned) ---
{
  const { client: clientB } = await connectPg();
  const junkAgencyOrgIds = [];
  const junkRequestIds = [];
  let matrixOrgId = null;
  let matrixAdminId = null;
  let agencyOwnerId = null;
  let agencyId = null;
  let agencyOrgId = null;
  let tenantId = null;
  let routeId = null;
  let route2Id = null;
  let conductorId = null;

  try {
    await client.query("begin");
    const fixture = await seedTwoTenantLogisticsFixture(client);
    matrixOrgId = fixture.orgA.orgId;
    matrixAdminId = fixture.orgA.adminId;
    routeId = fixture.orgA.routeId;
    conductorId = fixture.orgA.conductorId;
    await client.query(`select public.initialize_business_matrix_organization($1)`, [matrixOrgId]);
    const agency = await seedAgencyUnderMatrix(matrixOrgId, "CONC");
    agencyOwnerId = agency.agencyOwnerId;
    agencyId = agency.agencyId;
    agencyOrgId = agency.agencyOrgId;
    tenantId = agency.tenantId;
    junkAgencyOrgIds.push(agencyOrgId);

    route2Id = randomUUID();
    const today = new Date().toISOString().slice(0, 10);
    await client.query(
      `
      insert into public.logistics_routes (
        id, organization_id, route_date, name, status, assigned_to, vehicle_id, warehouse_id
      )
      select $1, $2, $3::date, 'Ruta Conc 2', 'planned', $4, vehicle_id, warehouse_id
      from public.logistics_routes where id = $5
    `,
      [route2Id, matrixOrgId, today, conductorId, routeId],
    );
    await client.query("commit");

    const officeLines = [
      {
        serviceCode: "agency_office_full_box_pickup",
        quantity: 1,
        productKey: "Caja",
        boxSize: "M",
      },
    ];

    async function runCreate(target, key, note) {
      await target.query("begin");
      try {
        await target.query("set local role authenticated");
        await target.query("select set_config('request.jwt.claims', $1, true)", [
          JSON.stringify({ sub: agencyOwnerId, role: "authenticated" }),
        ]);
        const result = await target.query(
          `select public.create_agency_service_request($1::jsonb, null, $2, $3) as result`,
          [JSON.stringify(officeLines), note, key],
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

    async function runAssign(target, requestId, targetRouteId, key) {
      await target.query("begin");
      try {
        await target.query("set local role authenticated");
        await target.query("select set_config('request.jwt.claims', $1, true)", [
          JSON.stringify({ sub: matrixAdminId, role: "authenticated" }),
        ]);
        const result = await target.query(
          `select public.assign_agency_request_to_route($1::uuid, $2::uuid, null, $3) as result`,
          [requestId, targetRouteId, key],
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

    // Concurrent create (pair)
    const createConcKey = `agency-create-conc-${randomUUID()}`;
    const createPair = await Promise.allSettled([
      runCreate(client, createConcKey, "c1"),
      runCreate(clientB, createConcKey, "c1"),
    ]);
    const createOk = createPair.filter((r) => r.status === "fulfilled").map((r) => r.value);
    assert.ok(createOk.length >= 1);
    assert.equal(new Set(createOk.map((r) => r.requestId)).size, 1);
    evidence.createConcurrentCreated = 1;
    junkRequestIds.push(createOk[0].requestId);

    // Concurrent create (multi)
    const multiKey = `agency-create-multi-${randomUUID()}`;
    const multiClients = await Promise.all(
      Array.from({ length: 5 }, async () => (await connectPg()).client),
    );
    try {
      const multi = await Promise.allSettled(
        multiClients.map((c) => runCreate(c, multiKey, "m")),
      );
      const multiOk = multi.filter((r) => r.status === "fulfilled").map((r) => r.value);
      assert.ok(multiOk.length >= 1);
      assert.equal(new Set(multiOk.map((r) => r.requestId)).size, 1);
      junkRequestIds.push(multiOk[0].requestId);
    } finally {
      await Promise.all(multiClients.map((c) => c.end()));
    }

    // Concurrent assign same route
    const sameReq = await runCreate(client, `agency-create-same-${randomUUID()}`, "same");
    junkRequestIds.push(sameReq.requestId);
    const sameKey = `agency-assign-same-${randomUUID()}`;
    const sameAssignClients = await Promise.all(
      Array.from({ length: 4 }, async () => (await connectPg()).client),
    );
    try {
      const sameAssign = await Promise.allSettled(
        sameAssignClients.map((c) => runAssign(c, sameReq.requestId, routeId, sameKey)),
      );
      const sameOk = sameAssign.filter((r) => r.status === "fulfilled").map((r) => r.value);
      assert.ok(sameOk.length >= 1);
      assert.equal(new Set(sameOk.map((r) => r.visitId)).size, 1);
      const sameCounts = await countVisitsForRequest(sameReq.requestId);
      assert.equal(sameCounts.visits, 1);
      assert.equal(sameCounts.stops, 1);
    } finally {
      await Promise.all(sameAssignClients.map((c) => c.end()));
    }

    // Concurrent assign two routes
    const raceReq = await runCreate(client, `agency-create-race-${randomUUID()}`, "race");
    junkRequestIds.push(raceReq.requestId);
    const race = await Promise.allSettled([
      runAssign(client, raceReq.requestId, routeId, `agency-assign-race-a-${randomUUID()}`),
      runAssign(clientB, raceReq.requestId, route2Id, `agency-assign-race-b-${randomUUID()}`),
    ]);
    const raceOk = race.filter((r) => r.status === "fulfilled");
    const raceFail = race.filter((r) => r.status === "rejected");
    assert.equal(raceOk.length, 1);
    assert.equal(raceFail.length, 1);
    assert.match(String(raceFail[0].reason?.message || ""), /REQUEST_ALREADY_ASSIGNED/);
    evidence.assignConcurrentWinner = 1;
    evidence.assignConcurrentConflicts = 1;
    const raceCounts = await countVisitsForRequest(raceReq.requestId);
    assert.equal(raceCounts.visits, 1);
    assert.equal(raceCounts.stops, 1);

    console.log(
      JSON.stringify(
        {
          ok: true,
          evidence: {
            ...evidence,
            concurrentCreate: { created: 1 },
            concurrentAssignSameRoute: { visits: 1, stops: 1 },
            concurrentAssignTwoRoutes: {
              winner: 1,
              conflicts: 1,
              visits: 1,
              stops: 1,
            },
          },
        },
        null,
        2,
      ),
    );
  } catch (error) {
    console.error("FAIL concurrent agency operations idempotency:", error);
    process.exitCode = 1;
  } finally {
    // Best-effort cleanup of committed concurrency fixtures
    try {
      if (junkRequestIds.length) {
        await client.query(
          `
          delete from public.logistics_route_stops
          where agency_visit_id in (
            select visit.id from public.agency_visits visit
            join public.agency_visit_lines vl on vl.visit_id = visit.id
            join public.agency_service_request_lines line on line.id = vl.request_line_id
            where line.request_id = any($1::uuid[])
          )
        `,
          [junkRequestIds],
        );
        await client.query(
          `
          delete from public.agency_visit_lines
          where request_line_id in (
            select id from public.agency_service_request_lines where request_id = any($1::uuid[])
          )
        `,
          [junkRequestIds],
        );
        await client.query(
          `
          delete from public.agency_visits
          where id in (
            select visit.id from public.agency_visits visit
            join public.agency_visit_lines vl on vl.visit_id = visit.id
            join public.agency_service_request_lines line on line.id = vl.request_line_id
            where line.request_id = any($1::uuid[])
          )
        `,
          [junkRequestIds],
        );
        await client.query(
          `delete from public.agency_service_request_lines where request_id = any($1::uuid[])`,
          [junkRequestIds],
        );
        await client.query(
          `delete from public.agency_service_requests where id = any($1::uuid[])`,
          [junkRequestIds],
        );
      }
      if (tenantId) {
        await client.query(
          `
          delete from public.idempotency_operations
          where tenant_id = $1
            and operation_type in ('create_agency_service_request', 'assign_agency_request_to_route')
            and idempotency_key like 'agency-%'
        `,
          [tenantId],
        );
      }
      if (route2Id) {
        await client.query(`delete from public.logistics_routes where id = $1`, [route2Id]);
      }
      if (agencyId) {
        await client.query(`delete from public.agencies where id = $1`, [agencyId]);
      }
      if (agencyOrgId) {
        await client.query(
          `delete from public.organization_memberships where organization_id = $1`,
          [agencyOrgId],
        );
        await client.query(`delete from public.profiles where organization_id = $1`, [agencyOrgId]);
        await client.query(`delete from public.role_permissions where role_id in (select id from public.roles where organization_id = $1)`, [agencyOrgId]);
        await client.query(`delete from public.roles where organization_id = $1`, [agencyOrgId]);
        await client.query(`delete from public.organizations where id = $1`, [agencyOrgId]);
      }
    } catch (cleanupError) {
      console.warn("Cleanup warning:", cleanupError.message);
    }
    await clientB.end();
    await client.end();
  }
}
