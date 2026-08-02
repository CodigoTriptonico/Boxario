import { randomUUID } from "node:crypto";

/**
 * Creates two isolated client organizations with admin, logistics, conductor,
 * warehouse, shipment, task, route, stop and notification fixtures.
 * Intended for transactional DB integrity tests (caller owns begin/rollback).
 */
export async function seedTwoTenantLogisticsFixture(client) {
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

  async function bootstrapOrg(label) {
    const admin = await createAuthUser(`qa.${label}.admin`);
    const orgId = (
      await client.query(
        `select public.bootstrap_organization($1, $2, $3, $4, $5, 'client', null) as id`,
        [`QA Tenant ${label}`, admin.id, admin.email, `Admin ${label}`, `qa-tenant-${label}-${admin.id.slice(0, 6)}`],
      )
    ).rows[0].id;

    const roles = await client.query(
      `
      select slug, id
      from public.roles
      where organization_id = $1
        and slug in ('administrador', 'logistica', 'conductor')
    `,
      [orgId],
    );
    const roleBySlug = Object.fromEntries(roles.rows.map((r) => [r.slug, r.id]));

    const logistics = await createAuthUser(`qa.${label}.logistics`);
    await client.query(
      `
      insert into public.profiles (id, organization_id, role_id, email, full_name, is_active)
      values ($1, $2, $3, $4, $5, true)
    `,
      [logistics.id, orgId, roleBySlug.logistica, logistics.email, `Logistics ${label}`],
    );

    const conductor = await createAuthUser(`qa.${label}.driver`);
    await client.query(
      `
      insert into public.profiles (id, organization_id, role_id, email, full_name, is_active)
      values ($1, $2, $3, $4, $5, true)
    `,
      [conductor.id, orgId, roleBySlug.conductor, conductor.email, `Driver ${label}`],
    );

    const warehouse = (
      await client.query(
        `
      select id from public.warehouses
      where organization_id = $1 and is_active
      order by is_default desc, created_at
      limit 1
    `,
        [orgId],
      )
    ).rows[0];

    const categoryId = randomUUID();
    await client.query(
      `
      insert into public.inventory_categories (id, organization_id, name)
      values ($1, $2, $3)
    `,
      [categoryId, orgId, `QA Cat ${label}`],
    );

    const itemId = randomUUID();
    await client.query(
      `
      insert into public.inventory_items (id, organization_id, category_id, name, kind)
      values ($1, $2, $3, $4, $4)
    `,
      [itemId, orgId, categoryId, `QABox_${label}`],
    );
    await client.query(
      `
      insert into public.inventory_stock (
        organization_id, warehouse_id, item_id, stock, reserved, assigned, unavailable, min_stock
      ) values ($1, $2, $3, 10, 0, 0, 0, 0)
    `,
      [orgId, warehouse.id, itemId],
    );

    const shipmentId = randomUUID();
    const taskId = randomUUID();
    const routeId = randomUUID();
    const stopId = randomUUID();
    const vehicleId = randomUUID();
    const notifId = randomUUID();
    const code = `INV-${label}-${shipmentId.slice(0, 6)}`;
    const today = new Date().toISOString().slice(0, 10);

    await client.query(
      `
      insert into public.shipments (
        id, organization_id, code, customer_name, country, carrier, paid, logistics_plan
      ) values ($1, $2, $3, $4, 'Mexico', 'QA', 0, $5::jsonb)
    `,
      [
        shipmentId,
        orgId,
        code,
        `Cliente ${label}`,
        JSON.stringify({
          billing: { quotedTotal: "80.00" },
          boxLines: [{ label: `QABox_${label}`, quantity: 1 }],
          emptyBox: { mode: "Entrega" },
        }),
      ],
    );

    await client.query(
      `
      insert into public.shipment_logistics_tasks (
        id, organization_id, shipment_id, task_type, status, assigned_to,
        scheduled_at, schedule_confirmation_status, warehouse_id
      ) values ($1, $2, $3, 'deliver_empty_box', 'assigned', $4, $5::date + time '10:00', 'confirmed', $6)
    `,
      [taskId, orgId, shipmentId, conductor.id, today, warehouse.id],
    );

    await client.query(
      `
      insert into public.logistics_vehicles (
        id, organization_id, name, plate, assigned_driver_id, is_active
      ) values ($1, $2, $3, $4, $5, true)
    `,
      [vehicleId, orgId, `Van ${label}`, `QA-${label}-${vehicleId.slice(0, 3)}`, conductor.id],
    );

    await client.query(
      `
      insert into public.logistics_routes (
        id, organization_id, route_date, name, status, assigned_to, vehicle_id, warehouse_id
      ) values ($1, $2, $3::date, $4, 'planned', $5, $6, $7)
    `,
      [routeId, orgId, today, `Ruta ${label}`, conductor.id, vehicleId, warehouse.id],
    );

    await client.query(
      `
      insert into public.logistics_route_stops (
        id, organization_id, route_id, task_id, stop_order, lat, lng, address_snapshot
      ) values ($1, $2, $3, $4, 1, 34.4, -118.5, $5::jsonb)
    `,
      [stopId, orgId, routeId, taskId, JSON.stringify({ name: `Stop ${label}` })],
    );

    await client.query(
      `
      insert into public.logistics_route_notifications (
        id, organization_id, route_id, recipient_id, change_type, summary, actor_id, actor_name, idempotency_key
      ) values ($1, $2, $3, $4, 'route_published', $5, $6, $7, $8)
    `,
      [
        notifId,
        orgId,
        routeId,
        conductor.id,
        `Notif ${label}`,
        admin.id,
        `Admin ${label}`,
        `qa-notif-${label}-${notifId}`,
      ],
    );

    // Operational activity via security definer path under admin session is asserted elsewhere;
    // seed a row as postgres owner for RLS visibility checks.
    const activityId = randomUUID();
    await client.query(
      `
      insert into public.activity_history (
        id, organization_id, actor_id, actor_name, action, entity_type, entity_id, title, description
      ) values ($1, $2, $3, $4, 'qa.seed', 'shipment', $5, $6, 'seed')
    `,
      [activityId, orgId, admin.id, `Admin ${label}`, shipmentId, `Audit ${label}`],
    );

    return {
      orgId,
      adminId: admin.id,
      logisticsId: logistics.id,
      conductorId: conductor.id,
      warehouseId: warehouse.id,
      shipmentId,
      taskId,
      routeId,
      stopId,
      notifId,
      activityId,
      itemId,
      code,
    };
  }

  const orgA = await bootstrapOrg("A");
  const orgB = await bootstrapOrg("B");
  return { orgA, orgB };
}
