-- Logistics analytics for /estadisticas.
-- The v2 contract keeps the dashboard behind one scoped RPC while preserving
-- the v1 commercial/financial aggregation as its source of truth.

create index if not exists idx_shipment_logistics_tasks_org_completed
  on public.shipment_logistics_tasks (organization_id, completed_at desc)
  where status = 'completed' and completed_at is not null;

create or replace function public.load_statistics_dashboard_v2(
  period_from date,
  period_to date,
  comparison_from date,
  comparison_to date,
  requested_filters jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $$
declare
  base_dashboard jsonb;
  caller_org_id uuid := public.current_organization_id();
  caller_org public.organizations;
  caller_tenant_id uuid;
  caller_role_slug text;
  can_view_all_shipments boolean := false;
  can_view_agencies boolean := false;
  can_view_logistics boolean := false;
  agency_filter uuid;
  seller_filter uuid;
  route_filter uuid;
  driver_filter uuid;
  country_filter text;
  status_filter text;
  operation_filter text;
  product_filter text;
  period_start timestamptz;
  period_end timestamptz;
  logistics_payload jsonb;
begin
  -- v1 validates authentication, capability, dates, filters and their scope.
  base_dashboard := public.load_statistics_dashboard(
    period_from,
    period_to,
    comparison_from,
    comparison_to,
    requested_filters
  );

  can_view_logistics := coalesce((base_dashboard->'capabilities'->>'logistics')::boolean, false);
  if not can_view_logistics then
    return base_dashboard || jsonb_build_object(
      'logisticsAnalytics', jsonb_build_object(
        'summary', jsonb_build_object(
          'completedOperations', 0,
          'deliveryOperations', 0,
          'pickupOperations', 0,
          'deliveryBoxOperations', 0,
          'pickupBoxOperations', 0,
          'deliveredBoxes', 0,
          'collectedBoxes', 0
        ),
        'coverage', jsonb_build_object(
          'boxes', public.statistics_coverage_json('logisticsBoxCount', 'Operaciones completadas con cantidad de cajas', 0, 0),
          'postalCodes', public.statistics_coverage_json('logisticsPostalCode', 'Operaciones completadas con codigo postal', 0, 0)
        ),
        'daily', '[]'::jsonb,
        'rankings', jsonb_build_object(
          'postalCodes', '[]'::jsonb,
          'routes', '[]'::jsonb,
          'vehicles', '[]'::jsonb,
          'drivers', '[]'::jsonb
        )
      )
    );
  end if;

  select * into caller_org
  from public.organizations
  where id = caller_org_id
    and is_active = true
    and archived_at is null;

  caller_tenant_id := caller_org.tenant_id;
  caller_role_slug := public.current_role_slug();
  can_view_agencies := caller_tenant_id is not null and (
    public.user_has_permission('agency.view')
    or (caller_org.organization_type = 'agency' and (
      public.user_has_permission('agency.sales.view')
      or public.user_has_permission('agency.account.view')
    ))
  );
  can_view_all_shipments := caller_role_slug = 'administrador'
    or public.user_has_permission('audit.immutable.view')
    or public.user_has_permission('sales.settings.manage')
    or public.user_has_permission('logistics.settings.manage')
    or public.user_has_permission('accounting.view')
    or (caller_org.organization_type = 'agency' and (
      public.user_has_permission('agency.sales.view')
      or public.user_has_permission('agency.account.view')
    ));

  requested_filters := coalesce(requested_filters, '{}'::jsonb);
  agency_filter := nullif(btrim(coalesce(requested_filters->>'agencyId', '')), '')::uuid;
  seller_filter := nullif(btrim(coalesce(requested_filters->>'sellerId', '')), '')::uuid;
  route_filter := nullif(btrim(coalesce(requested_filters->>'routeId', '')), '')::uuid;
  driver_filter := nullif(btrim(coalesce(requested_filters->>'driverId', '')), '')::uuid;
  country_filter := nullif(btrim(coalesce(requested_filters->>'country', '')), '');
  status_filter := nullif(btrim(coalesce(requested_filters->>'shipmentStatus', '')), '');
  operation_filter := nullif(btrim(coalesce(requested_filters->>'operationType', '')), '');
  product_filter := nullif(btrim(coalesce(requested_filters->>'productKey', '')), '');
  period_start := period_from::timestamp at time zone 'America/Los_Angeles';
  period_end := (period_to + 1)::timestamp at time zone 'America/Los_Angeles';

  with
  scoped_organizations as materialized (
    select organization.id
    from public.organizations organization
    where organization.id = caller_org_id
      or (
        can_view_agencies
        and caller_org.organization_type = 'matrix'
        and organization.tenant_id = caller_tenant_id
        and organization.organization_status <> 'closed'
      )
  ),
  completed_tasks as materialized (
    select
      task.id,
      task.task_type,
      (timezone('America/Los_Angeles', task.completed_at))::date as completed_date,
      coalesce(box_values.box_count, 0)::integer as box_count,
      box_values.box_count is not null as box_count_known,
      nullif(upper(btrim(coalesce(stop.postal_code, booking.postal_code, ''))), '') as postal_code,
      route.id as route_id,
      route.name as route_name,
      route.route_date,
      vehicle.id as vehicle_id,
      case
        when vehicle.id is null then null
        when btrim(coalesce(vehicle.plate, '')) = '' then vehicle.name
        else concat(vehicle.name, ' · ', vehicle.plate)
      end as vehicle_name,
      coalesce(route.assigned_to, task.assigned_to) as driver_id,
      coalesce(nullif(btrim(driver.full_name), ''), nullif(btrim(driver.email), '')) as driver_name
    from public.shipment_logistics_tasks task
    join scoped_organizations scoped_org on scoped_org.id = task.organization_id
    join public.shipments shipment on shipment.id = task.shipment_id
      and shipment.organization_id = task.organization_id
    left join public.agencies agency on agency.organization_id = shipment.organization_id
      and agency.tenant_id = caller_tenant_id
    left join lateral (
      select request.route_id, request.route_name, request.postal_code, request.box_count
      from public.customer_route_assignment_requests request
      where request.task_id = task.id
        and request.organization_id = task.organization_id
      order by request.created_at desc
      limit 1
    ) booking on true
    left join lateral (
      select route_stop.route_id, route_stop.postal_code
      from public.logistics_route_stops route_stop
      where route_stop.task_id = task.id
        and route_stop.organization_id = task.organization_id
      order by
        (route_stop.outcome = 'completed') desc,
        route_stop.outcome_at desc nulls last,
        route_stop.created_at desc
      limit 1
    ) stop on true
    left join public.logistics_routes route on route.id = coalesce(stop.route_id, booking.route_id)
      and route.organization_id = task.organization_id
    left join public.logistics_vehicles vehicle on vehicle.id = route.vehicle_id
      and vehicle.organization_id = route.organization_id
    left join public.profiles driver on driver.id = coalesce(route.assigned_to, task.assigned_to)
      and driver.organization_id = task.organization_id
    left join lateral (
      select coalesce(
        booking.box_count,
        case
          when coalesce(shipment.logistics_plan->'billing'->>'boxCount', '') ~ '^[0-9]+([.][0-9]+)?$'
            then greatest((shipment.logistics_plan->'billing'->>'boxCount')::numeric, 0)::integer
          else null
        end
      ) as box_count
    ) box_values on true
    where task.status = 'completed'
      and task.completed_at is not null
      and task.completed_at >= period_start
      and task.completed_at < period_end
      and shipment.invoice_status <> 'void'
      and (
        can_view_all_shipments
        or (public.user_has_permission('sales.manage') and shipment.sales_owner_id = auth.uid())
        or (public.user_has_permission('routes.view') and shipment.assigned_to = auth.uid())
      )
      and (agency_filter is null or agency.id = agency_filter)
      and (country_filter is null or shipment.country = country_filter)
      and (seller_filter is null or shipment.created_by = seller_filter)
      and (status_filter is null or shipment.status = status_filter)
      and (operation_filter is null or shipment.sale_kind = operation_filter)
      and (route_filter is null or route.id = route_filter)
      and (driver_filter is null or coalesce(route.assigned_to, task.assigned_to) = driver_filter)
      and (
        product_filter is null
        or exists (
          select 1
          from jsonb_array_elements(
            case
              when jsonb_typeof(shipment.logistics_plan->'billing'->'cartLines') = 'array'
                then shipment.logistics_plan->'billing'->'cartLines'
              else '[]'::jsonb
            end
          ) product
          where coalesce(
            nullif(btrim(product->>'catalogKey'), ''),
            nullif(btrim(product->>'label'), '')
          ) = product_filter
        )
      )
  ),
  daily_rows as (
    select
      day_value::date as day,
      count(task.id) filter (where task.task_type = 'deliver_empty_box')::integer as delivery_operations,
      count(task.id) filter (where task.task_type = 'pickup_full_box')::integer as pickup_operations,
      count(task.id) filter (where task.task_type = 'deliver_empty_box' and task.box_count_known)::integer as delivery_box_operations,
      count(task.id) filter (where task.task_type = 'pickup_full_box' and task.box_count_known)::integer as pickup_box_operations,
      coalesce(sum(task.box_count) filter (where task.task_type = 'deliver_empty_box'), 0)::integer as delivered_boxes,
      coalesce(sum(task.box_count) filter (where task.task_type = 'pickup_full_box'), 0)::integer as collected_boxes
    from generate_series(period_from::timestamp, period_to::timestamp, interval '1 day') day_value
    left join completed_tasks task on task.completed_date = day_value::date
    group by day_value
  ),
  postal_rankings as (
    select
      postal_code as key,
      postal_code as label,
      count(*) filter (where task_type = 'deliver_empty_box')::integer as deliveries,
      count(*) filter (where task_type = 'pickup_full_box')::integer as pickups,
      coalesce(sum(box_count) filter (where task_type = 'deliver_empty_box'), 0)::integer as delivered_boxes,
      coalesce(sum(box_count) filter (where task_type = 'pickup_full_box'), 0)::integer as collected_boxes,
      count(distinct route_id) filter (where route_id is not null)::integer as routes
    from completed_tasks
    where postal_code is not null
    group by postal_code
  ),
  route_rankings as (
    select
      route_id as id,
      route_id::text as key,
      coalesce(nullif(btrim(route_name), ''), 'Ruta sin nombre') as label,
      route_date as date,
      count(*) filter (where task_type = 'deliver_empty_box')::integer as deliveries,
      count(*) filter (where task_type = 'pickup_full_box')::integer as pickups,
      coalesce(sum(box_count) filter (where task_type = 'deliver_empty_box'), 0)::integer as delivered_boxes,
      coalesce(sum(box_count) filter (where task_type = 'pickup_full_box'), 0)::integer as collected_boxes,
      1::integer as routes
    from completed_tasks
    where route_id is not null
    group by route_id, route_name, route_date
  ),
  vehicle_rankings as (
    select
      vehicle_id::text as key,
      coalesce(nullif(btrim(vehicle_name), ''), 'Vehiculo sin nombre') as label,
      count(*) filter (where task_type = 'deliver_empty_box')::integer as deliveries,
      count(*) filter (where task_type = 'pickup_full_box')::integer as pickups,
      coalesce(sum(box_count) filter (where task_type = 'deliver_empty_box'), 0)::integer as delivered_boxes,
      coalesce(sum(box_count) filter (where task_type = 'pickup_full_box'), 0)::integer as collected_boxes,
      count(distinct route_id)::integer as routes
    from completed_tasks
    where vehicle_id is not null
    group by vehicle_id, vehicle_name
  ),
  driver_rankings as (
    select
      driver_id::text as key,
      coalesce(nullif(btrim(driver_name), ''), 'Conductor sin nombre') as label,
      count(*) filter (where task_type = 'deliver_empty_box')::integer as deliveries,
      count(*) filter (where task_type = 'pickup_full_box')::integer as pickups,
      coalesce(sum(box_count) filter (where task_type = 'deliver_empty_box'), 0)::integer as delivered_boxes,
      coalesce(sum(box_count) filter (where task_type = 'pickup_full_box'), 0)::integer as collected_boxes,
      count(distinct route_id) filter (where route_id is not null)::integer as routes
    from completed_tasks
    where driver_id is not null
    group by driver_id, driver_name
  )
  select jsonb_build_object(
    'summary', jsonb_build_object(
      'completedOperations', count(*),
      'deliveryOperations', count(*) filter (where task_type = 'deliver_empty_box'),
      'pickupOperations', count(*) filter (where task_type = 'pickup_full_box'),
      'deliveryBoxOperations', count(*) filter (where task_type = 'deliver_empty_box' and box_count_known),
      'pickupBoxOperations', count(*) filter (where task_type = 'pickup_full_box' and box_count_known),
      'deliveredBoxes', coalesce(sum(box_count) filter (where task_type = 'deliver_empty_box'), 0),
      'collectedBoxes', coalesce(sum(box_count) filter (where task_type = 'pickup_full_box'), 0)
    ),
    'coverage', jsonb_build_object(
      'boxes', public.statistics_coverage_json(
        'logisticsBoxCount',
        'Operaciones completadas con cantidad de cajas',
        count(*) filter (where box_count_known)::integer,
        count(*)::integer
      ),
      'postalCodes', public.statistics_coverage_json(
        'logisticsPostalCode',
        'Operaciones completadas con codigo postal',
        count(*) filter (where postal_code is not null)::integer,
        count(*)::integer
      )
    ),
    'daily', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'date', day,
        'deliveryOperations', delivery_operations,
        'pickupOperations', pickup_operations,
        'deliveryBoxOperations', delivery_box_operations,
        'pickupBoxOperations', pickup_box_operations,
        'deliveredBoxes', delivered_boxes,
        'collectedBoxes', collected_boxes
      ) order by day), '[]'::jsonb)
      from daily_rows
    ),
    'rankings', jsonb_build_object(
      'postalCodes', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'key', key, 'label', label, 'deliveries', deliveries, 'pickups', pickups,
          'deliveredBoxes', delivered_boxes, 'collectedBoxes', collected_boxes, 'routes', routes
        ) order by delivered_boxes + collected_boxes desc, deliveries + pickups desc, label), '[]'::jsonb)
        from (select * from postal_rankings order by delivered_boxes + collected_boxes desc, deliveries + pickups desc limit 100) ranked
      ),
      'routes', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'id', id, 'key', key, 'label', label, 'date', date,
          'deliveries', deliveries, 'pickups', pickups,
          'deliveredBoxes', delivered_boxes, 'collectedBoxes', collected_boxes, 'routes', routes
        ) order by delivered_boxes + collected_boxes desc, deliveries + pickups desc, label), '[]'::jsonb)
        from (select * from route_rankings order by delivered_boxes + collected_boxes desc, deliveries + pickups desc limit 100) ranked
      ),
      'vehicles', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'key', key, 'label', label, 'deliveries', deliveries, 'pickups', pickups,
          'deliveredBoxes', delivered_boxes, 'collectedBoxes', collected_boxes, 'routes', routes
        ) order by delivered_boxes + collected_boxes desc, deliveries + pickups desc, label), '[]'::jsonb)
        from (select * from vehicle_rankings order by delivered_boxes + collected_boxes desc, deliveries + pickups desc limit 100) ranked
      ),
      'drivers', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'key', key, 'label', label, 'deliveries', deliveries, 'pickups', pickups,
          'deliveredBoxes', delivered_boxes, 'collectedBoxes', collected_boxes, 'routes', routes
        ) order by delivered_boxes + collected_boxes desc, deliveries + pickups desc, label), '[]'::jsonb)
        from (select * from driver_rankings order by delivered_boxes + collected_boxes desc, deliveries + pickups desc limit 100) ranked
      )
    )
  ) into logistics_payload
  from completed_tasks;

  return base_dashboard || jsonb_build_object('logisticsAnalytics', logistics_payload);
end;
$$;

revoke all on function public.load_statistics_dashboard_v2(date, date, date, date, jsonb) from public;
revoke all on function public.load_statistics_dashboard_v2(date, date, date, date, jsonb) from anon;
grant execute on function public.load_statistics_dashboard_v2(date, date, date, date, jsonb) to authenticated;

comment on function public.load_statistics_dashboard_v2(date, date, date, date, jsonb) is
  'Dashboard agregado v2: conserva el informe comercial v1 y agrega operaciones logisticas completadas por fecha real, ZIP, ruta, vehiculo y conductor.';
