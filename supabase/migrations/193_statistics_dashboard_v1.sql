-- Secure, bounded reporting contract for /estadisticas.
-- Dates are inclusive America/Los_Angeles business dates; the function converts
-- them to half-open timestamptz intervals before reading operational data.

-- Small immutable builders keep the reporting query readable. They do not read
-- tables, accept no scope, and expose no data on their own.
create or replace function public.statistics_kpi_json(current_value numeric, previous_value numeric)
returns jsonb
language sql
immutable
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'value', coalesce(current_value, 0),
    'previous', coalesce(previous_value, 0),
    'deltaPct', case
      when coalesce(previous_value, 0) = 0 then null
      else round((coalesce(current_value, 0) - previous_value) * 100 / abs(previous_value), 2)
    end
  );
$$;

create or replace function public.statistics_coverage_json(
  coverage_key text,
  coverage_label text,
  available_count integer,
  total_count integer
)
returns jsonb
language sql
immutable
set search_path = pg_catalog, public
as $$
  select jsonb_build_object(
    'key', coverage_key,
    'label', coverage_label,
    'available', coalesce(available_count, 0),
    'total', coalesce(total_count, 0),
    'percent', case when coalesce(total_count, 0) = 0 then 100
      else round(100.0 * coalesce(available_count, 0) / total_count, 2) end,
    'status', case
      when coalesce(total_count, 0) = 0 or coalesce(available_count, 0) = total_count then 'complete'
      when coalesce(available_count, 0) = 0 then 'unavailable'
      else 'partial'
    end
  );
$$;

create or replace function public.load_statistics_dashboard(
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
  caller_org_id uuid := public.current_organization_id();
  caller_org public.organizations;
  caller_tenant_id uuid;
  caller_role_slug text;
  can_view_dashboard boolean := false;
  can_view_all_shipments boolean := false;
  can_view_finance boolean := false;
  can_view_logistics boolean := false;
  can_view_agencies boolean := false;
  can_view_agency_finance boolean := false;
  can_view_inventory boolean := false;
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
  comparison_start timestamptz;
  comparison_end timestamptz;
  bucket_granularity text;
  bucket_count integer;
  result jsonb;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHENTICATED';
  end if;
  can_view_dashboard := public.user_has_permission('audit.immutable.view')
    or public.user_has_permission('sales.manage')
    or public.user_has_permission('routes.view')
    or public.user_has_permission('logistics.settings.manage')
    or public.user_has_permission('inventory.view')
    or public.user_has_permission('accounting.view')
    or public.user_has_permission('agency.view')
    or public.user_has_permission('agency.sales.view')
    or public.user_has_permission('agency.account.view');
  if caller_org_id is null or not can_view_dashboard then
    raise exception 'FORBIDDEN';
  end if;

  select * into caller_org
  from public.organizations
  where id = caller_org_id
    and is_active = true
    and archived_at is null;
  if caller_org.id is null then
    raise exception 'FORBIDDEN';
  end if;

  if period_from is null or period_to is null
    or comparison_from is null or comparison_to is null
    or period_to < period_from or comparison_to < comparison_from
    or (period_to - period_from) + 1 > 366
    or (comparison_to - comparison_from) + 1 > 366 then
    raise exception 'STATISTICS_PERIOD_INVALID';
  end if;

  if requested_filters is null then requested_filters := '{}'::jsonb; end if;
  if jsonb_typeof(requested_filters) <> 'object' then
    raise exception 'STATISTICS_FILTERS_INVALID';
  end if;

  caller_tenant_id := caller_org.tenant_id;
  caller_role_slug := public.current_role_slug();
  can_view_all_shipments := caller_role_slug = 'administrador'
    or public.user_has_permission('audit.immutable.view')
    or public.user_has_permission('sales.settings.manage')
    or public.user_has_permission('logistics.settings.manage')
    or public.user_has_permission('accounting.view')
    or (caller_org.organization_type = 'agency' and (
      public.user_has_permission('agency.sales.view')
      or public.user_has_permission('agency.account.view')
    ));
  can_view_finance := caller_role_slug = 'administrador'
    or public.user_has_permission('audit.immutable.view')
    or public.user_has_permission('accounting.view')
    or public.user_has_permission('sales.manage')
    or public.user_has_permission('agency.sales.view')
    or public.user_has_permission('agency.account.view');
  can_view_logistics := caller_role_slug = 'administrador'
    or public.user_has_permission('audit.immutable.view')
    or public.user_has_permission('logistics.settings.manage')
    or public.user_has_permission('routes.view')
    or public.user_has_permission('sales.manage');
  can_view_agencies := caller_tenant_id is not null and (
    public.user_has_permission('agency.view')
    or (caller_org.organization_type = 'agency' and (
      public.user_has_permission('agency.sales.view')
      or public.user_has_permission('agency.account.view')
    ))
  );
  can_view_agency_finance := can_view_agencies and (
    caller_role_slug = 'administrador'
    or public.user_has_permission('audit.immutable.view')
    or public.user_has_permission('accounting.view')
    or public.user_has_permission('agency.account.view')
  );
  can_view_inventory := public.user_has_permission('inventory.view');

  if nullif(btrim(coalesce(requested_filters->>'agencyId', '')), '') is not null then
    if (requested_filters->>'agencyId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception 'STATISTICS_FILTERS_INVALID';
    end if;
    agency_filter := (requested_filters->>'agencyId')::uuid;
  end if;
  if nullif(btrim(coalesce(requested_filters->>'sellerId', '')), '') is not null then
    if (requested_filters->>'sellerId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception 'STATISTICS_FILTERS_INVALID';
    end if;
    seller_filter := (requested_filters->>'sellerId')::uuid;
  end if;
  if nullif(btrim(coalesce(requested_filters->>'routeId', '')), '') is not null then
    if (requested_filters->>'routeId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception 'STATISTICS_FILTERS_INVALID';
    end if;
    route_filter := (requested_filters->>'routeId')::uuid;
  end if;
  if nullif(btrim(coalesce(requested_filters->>'driverId', '')), '') is not null then
    if (requested_filters->>'driverId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception 'STATISTICS_FILTERS_INVALID';
    end if;
    driver_filter := (requested_filters->>'driverId')::uuid;
  end if;

  country_filter := nullif(btrim(coalesce(requested_filters->>'country', '')), '');
  status_filter := nullif(btrim(coalesce(requested_filters->>'shipmentStatus', '')), '');
  operation_filter := nullif(btrim(coalesce(requested_filters->>'operationType', '')), '');
  product_filter := nullif(btrim(coalesce(requested_filters->>'productKey', '')), '');
  if greatest(
    length(coalesce(country_filter, '')),
    length(coalesce(status_filter, '')),
    length(coalesce(operation_filter, '')),
    length(coalesce(product_filter, ''))
  ) > 120 then
    raise exception 'STATISTICS_FILTERS_INVALID';
  end if;

  if agency_filter is not null and (
    not can_view_agencies
    or not exists (
      select 1 from public.agencies agency
      where agency.id = agency_filter
        and agency.tenant_id = caller_tenant_id
        and (
          caller_org.organization_type = 'matrix'
          or agency.organization_id = caller_org_id
        )
    )
  ) then raise exception 'STATISTICS_FILTERS_INVALID'; end if;

  if seller_filter is not null and not exists (
    select 1
    from public.profiles profile
    join public.organizations organization on organization.id = profile.organization_id
    where profile.id = seller_filter
      and profile.is_active = true
      and profile.archived_at is null
      and (
        profile.organization_id = caller_org_id
        or (
          can_view_agencies
          and caller_org.organization_type = 'matrix'
          and organization.tenant_id = caller_tenant_id
        )
      )
  ) then raise exception 'STATISTICS_FILTERS_INVALID'; end if;

  if route_filter is not null and not exists (
    select 1
    from public.logistics_routes route
    join public.organizations organization on organization.id = route.organization_id
    where route.id = route_filter
      and (
        route.organization_id = caller_org_id
        or (
          can_view_agencies
          and caller_org.organization_type = 'matrix'
          and organization.tenant_id = caller_tenant_id
        )
      )
  ) then raise exception 'STATISTICS_FILTERS_INVALID'; end if;

  if driver_filter is not null and not exists (
    select 1
    from public.profiles profile
    join public.organizations organization on organization.id = profile.organization_id
    where profile.id = driver_filter
      and profile.is_active = true
      and profile.archived_at is null
      and (
        profile.organization_id = caller_org_id
        or (
          can_view_agencies
          and caller_org.organization_type = 'matrix'
          and organization.tenant_id = caller_tenant_id
        )
      )
  ) then raise exception 'STATISTICS_FILTERS_INVALID'; end if;

  period_start := period_from::timestamp at time zone 'America/Los_Angeles';
  period_end := (period_to + 1)::timestamp at time zone 'America/Los_Angeles';
  comparison_start := comparison_from::timestamp at time zone 'America/Los_Angeles';
  comparison_end := (comparison_to + 1)::timestamp at time zone 'America/Los_Angeles';

  bucket_granularity := case
    when (period_to - period_from) + 1 = 1 then 'hour'
    when (period_to - period_from) + 1 <= 45 then 'day'
    when (period_to - period_from) + 1 <= 180 then 'week'
    else 'month'
  end;
  bucket_count := case bucket_granularity
    when 'hour' then 24
    when 'day' then (period_to - period_from) + 1
    when 'week' then ceil(((period_to - period_from) + 1)::numeric / 7)::integer
    else (
      (extract(year from period_to)::integer * 12 + extract(month from period_to)::integer)
      - (extract(year from period_from)::integer * 12 + extract(month from period_from)::integer)
      + 1
    )
  end;

  with
  scoped_organizations as materialized (
    select organization.id, organization.organization_type
    from public.organizations organization
    where organization.id = caller_org_id
      or (
        can_view_agencies
        and caller_org.organization_type = 'matrix'
        and organization.tenant_id = caller_tenant_id
        and organization.organization_status <> 'closed'
      )
  ),
  scoped_shipments as materialized (
    select
      shipment.id,
      shipment.organization_id,
      shipment.code,
      shipment.created_at,
      shipment.logistics_plan,
      shipment.created_by as seller_id,
      coalesce(nullif(btrim(seller.full_name), ''), nullif(btrim(seller.email), ''), 'Sin atribuir') as seller_name,
      shipment.customer_id,
      shipment.customer_name,
      shipment.country,
      shipment.status,
      shipment.invoice_status,
      shipment.sale_kind,
      case when can_view_finance then greatest(coalesce(shipment.paid, 0), 0)::numeric else 0::numeric end as paid,
      case
        when can_view_finance
          and regexp_replace(coalesce(shipment.logistics_plan->'billing'->>'quotedTotal', ''), '[^0-9.-]', '', 'g') ~ '^[0-9]+([.][0-9]+)?$'
          then regexp_replace(shipment.logistics_plan->'billing'->>'quotedTotal', '[^0-9.-]', '', 'g')::numeric
        else null
      end as quoted_total,
      case
        when coalesce(shipment.logistics_plan->'billing'->>'boxCount', '') ~ '^[0-9]+([.][0-9]+)?$'
          then (shipment.logistics_plan->'billing'->>'boxCount')::numeric
        else null
      end as box_count,
      agency.id as agency_id,
      agency_organization.name as agency_name
    from public.shipments shipment
    join scoped_organizations scoped_org on scoped_org.id = shipment.organization_id
    left join public.profiles seller on seller.id = shipment.created_by
      and seller.organization_id = shipment.organization_id
    left join public.agencies agency on agency.organization_id = shipment.organization_id
      and agency.tenant_id = caller_tenant_id
    left join public.organizations agency_organization on agency_organization.id = agency.organization_id
    where shipment.invoice_status <> 'void'
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
      and (
        route_filter is null
        or exists (
          select 1
          from public.shipment_logistics_tasks task
          join public.logistics_route_stops stop on stop.task_id = task.id
            and stop.organization_id = task.organization_id
            and stop.released_at is null
          where task.shipment_id = shipment.id
            and task.organization_id = shipment.organization_id
            and stop.route_id = route_filter
        )
      )
      and (
        driver_filter is null
        or exists (
          select 1
          from public.shipment_logistics_tasks task
          left join public.logistics_route_stops stop on stop.task_id = task.id
            and stop.organization_id = task.organization_id
            and stop.released_at is null
          left join public.logistics_routes route on route.id = stop.route_id
            and route.organization_id = task.organization_id
          where task.shipment_id = shipment.id
            and task.organization_id = shipment.organization_id
            and coalesce(route.assigned_to, task.assigned_to) = driver_filter
        )
      )
  ),
  current_shipments as materialized (
    select *, greatest(coalesce(quoted_total, 0) - paid, 0)::numeric as pending
    from scoped_shipments
    where created_at >= period_start and created_at < period_end
  ),
  previous_shipments as materialized (
    select *, greatest(coalesce(quoted_total, 0) - paid, 0)::numeric as pending
    from scoped_shipments
    where created_at >= comparison_start and created_at < comparison_end
  ),
  current_payments as materialized (
    select payment.*, shipment.seller_id, shipment.seller_name, shipment.customer_name,
      shipment.code as shipment_code, shipment.country, shipment.agency_id
    from public.shipment_payments payment
    join scoped_shipments shipment on shipment.id = payment.shipment_id
      and shipment.organization_id = payment.organization_id
    where payment.created_at >= period_start and payment.created_at < period_end
      and can_view_finance
  ),
  previous_payments as materialized (
    select payment.*, shipment.seller_id, shipment.seller_name, shipment.customer_name,
      shipment.code as shipment_code, shipment.country, shipment.agency_id
    from public.shipment_payments payment
    join scoped_shipments shipment on shipment.id = payment.shipment_id
      and shipment.organization_id = payment.organization_id
    where payment.created_at >= comparison_start and payment.created_at < comparison_end
      and can_view_finance
  ),
  current_totals as (
    select
      coalesce(sum(quoted_total), 0)::numeric as sales,
      coalesce(sum(pending), 0)::numeric as pending,
      count(*)::integer as shipments,
      coalesce(sum(box_count), 0)::numeric as boxes,
      count(distinct customer_id) filter (where customer_id is not null)::integer as customers,
      coalesce(sum(quoted_total), 0) / nullif(count(*) filter (where quoted_total is not null), 0) as average_ticket
    from current_shipments
  ),
  previous_totals as (
    select
      coalesce(sum(quoted_total), 0)::numeric as sales,
      coalesce(sum(pending), 0)::numeric as pending,
      count(*)::integer as shipments,
      coalesce(sum(box_count), 0)::numeric as boxes,
      count(distinct customer_id) filter (where customer_id is not null)::integer as customers,
      coalesce(sum(quoted_total), 0) / nullif(count(*) filter (where quoted_total is not null), 0) as average_ticket
    from previous_shipments
  ),
  current_collection_total as (
    select coalesce(sum(amount), 0)::numeric as collections from current_payments
  ),
  previous_collection_total as (
    select coalesce(sum(amount), 0)::numeric as collections from previous_payments
  ),
  bucket_indices as (
    select index_value
    from generate_series(0, greatest(bucket_count - 1, 0)) index_value
  ),
  current_shipment_buckets as (
    select bucket_index, coalesce(sum(quoted_total), 0)::numeric as sales,
      coalesce(sum(pending), 0)::numeric as pending, count(*)::integer as shipments,
      coalesce(sum(box_count), 0)::numeric as boxes,
      count(distinct customer_id) filter (where customer_id is not null)::integer as customers
    from (
      select current_shipments.*,
        case bucket_granularity
          when 'hour' then floor(extract(epoch from (timezone('America/Los_Angeles', created_at) - period_from::timestamp)) / 3600)::integer
          when 'day' then floor(extract(epoch from (timezone('America/Los_Angeles', created_at) - period_from::timestamp)) / 86400)::integer
          when 'week' then floor(extract(epoch from (timezone('America/Los_Angeles', created_at) - period_from::timestamp)) / 604800)::integer
          else (
            extract(year from timezone('America/Los_Angeles', created_at))::integer * 12
            + extract(month from timezone('America/Los_Angeles', created_at))::integer
            - extract(year from period_from)::integer * 12
            - extract(month from period_from)::integer
          )
        end as bucket_index
      from current_shipments
    ) bucketed
    group by bucket_index
  ),
  previous_shipment_buckets as (
    select bucket_index, coalesce(sum(quoted_total), 0)::numeric as sales,
      coalesce(sum(pending), 0)::numeric as pending, count(*)::integer as shipments,
      coalesce(sum(box_count), 0)::numeric as boxes,
      count(distinct customer_id) filter (where customer_id is not null)::integer as customers
    from (
      select previous_shipments.*,
        case bucket_granularity
          when 'hour' then floor(extract(epoch from (timezone('America/Los_Angeles', created_at) - comparison_from::timestamp)) / 3600)::integer
          when 'day' then floor(extract(epoch from (timezone('America/Los_Angeles', created_at) - comparison_from::timestamp)) / 86400)::integer
          when 'week' then floor(extract(epoch from (timezone('America/Los_Angeles', created_at) - comparison_from::timestamp)) / 604800)::integer
          else (
            extract(year from timezone('America/Los_Angeles', created_at))::integer * 12
            + extract(month from timezone('America/Los_Angeles', created_at))::integer
            - extract(year from comparison_from)::integer * 12
            - extract(month from comparison_from)::integer
          )
        end as bucket_index
      from previous_shipments
    ) bucketed
    group by bucket_index
  ),
  current_payment_buckets as (
    select bucket_index, coalesce(sum(amount), 0)::numeric as collections
    from (
      select current_payments.*,
        case bucket_granularity
          when 'hour' then floor(extract(epoch from (timezone('America/Los_Angeles', created_at) - period_from::timestamp)) / 3600)::integer
          when 'day' then floor(extract(epoch from (timezone('America/Los_Angeles', created_at) - period_from::timestamp)) / 86400)::integer
          when 'week' then floor(extract(epoch from (timezone('America/Los_Angeles', created_at) - period_from::timestamp)) / 604800)::integer
          else (
            extract(year from timezone('America/Los_Angeles', created_at))::integer * 12
            + extract(month from timezone('America/Los_Angeles', created_at))::integer
            - extract(year from period_from)::integer * 12
            - extract(month from period_from)::integer
          )
        end as bucket_index
      from current_payments
    ) bucketed
    group by bucket_index
  ),
  previous_payment_buckets as (
    select bucket_index, coalesce(sum(amount), 0)::numeric as collections
    from (
      select previous_payments.*,
        case bucket_granularity
          when 'hour' then floor(extract(epoch from (timezone('America/Los_Angeles', created_at) - comparison_from::timestamp)) / 3600)::integer
          when 'day' then floor(extract(epoch from (timezone('America/Los_Angeles', created_at) - comparison_from::timestamp)) / 86400)::integer
          when 'week' then floor(extract(epoch from (timezone('America/Los_Angeles', created_at) - comparison_from::timestamp)) / 604800)::integer
          else (
            extract(year from timezone('America/Los_Angeles', created_at))::integer * 12
            + extract(month from timezone('America/Los_Angeles', created_at))::integer
            - extract(year from comparison_from)::integer * 12
            - extract(month from comparison_from)::integer
          )
        end as bucket_index
      from previous_payments
    ) bucketed
    group by bucket_index
  ),
  current_tasks as materialized (
    select task.*, shipment.code as shipment_code, shipment.customer_name, shipment.country,
      coalesce(task.scheduled_at, task.requested_schedule_at, task.created_at) as operational_at,
      stop.route_id, route.name as route_name,
      coalesce(route.assigned_to, task.assigned_to) as driver_id,
      coalesce(nullif(btrim(driver.full_name), ''), nullif(btrim(driver.email), '')) as driver_name
    from public.shipment_logistics_tasks task
    join scoped_shipments shipment on shipment.id = task.shipment_id
      and shipment.organization_id = task.organization_id
    left join lateral (
      select route_stop.route_id
      from public.logistics_route_stops route_stop
      where route_stop.task_id = task.id
        and route_stop.organization_id = task.organization_id
        and route_stop.released_at is null
      order by route_stop.created_at desc
      limit 1
    ) stop on true
    left join public.logistics_routes route on route.id = stop.route_id
      and route.organization_id = task.organization_id
    left join public.profiles driver on driver.id = coalesce(route.assigned_to, task.assigned_to)
      and driver.organization_id = task.organization_id
    where can_view_logistics
      and coalesce(task.scheduled_at, task.requested_schedule_at, task.created_at) >= period_start
      and coalesce(task.scheduled_at, task.requested_schedule_at, task.created_at) < period_end
  ),
  current_routes as materialized (
    select route.*, coalesce(nullif(btrim(driver.full_name), ''), nullif(btrim(driver.email), '')) as driver_name,
      count(stop.id)::integer as stops,
      count(stop.id) filter (where stop.outcome is not null)::integer as completed_stops
    from public.logistics_routes route
    join scoped_organizations scoped_org on scoped_org.id = route.organization_id
    left join public.profiles driver on driver.id = route.assigned_to
      and driver.organization_id = route.organization_id
    left join public.logistics_route_stops stop on stop.route_id = route.id
      and stop.organization_id = route.organization_id
      and stop.released_at is null
    where can_view_logistics
      and route.route_date between period_from and period_to
      and (route_filter is null or route.id = route_filter)
      and (driver_filter is null or route.assigned_to = driver_filter)
      and (
        agency_filter is null
        or exists (
          select 1 from public.agencies agency
          where agency.id = agency_filter and agency.organization_id = route.organization_id
        )
      )
    group by route.id, driver.full_name, driver.email
  ),
  current_packages as materialized (
    select package.*
    from public.shipment_packages package
    join current_shipments shipment on shipment.id = package.shipment_id
      and shipment.organization_id = package.organization_id
    where can_view_logistics
  ),
  current_exceptions as materialized (
    select exception.*
    from public.operational_exceptions exception
    join current_shipments shipment on shipment.id = exception.shipment_id
      and shipment.organization_id = exception.organization_id
    where can_view_logistics
      and exception.status in ('open', 'in_resolution', 'pending_approval')
  ),
  current_custody as materialized (
    select handoff.*
    from public.package_custody_handoffs handoff
    join current_shipments shipment on shipment.id = handoff.shipment_id
      and shipment.organization_id = handoff.organization_id
    where can_view_logistics
      and handoff.status = 'pending'
  ),
  inventory_rows as materialized (
    select stock.*, item.name as item_name, coalesce(item.sku, item.id::text) as item_key
    from public.inventory_stock stock
    join scoped_organizations scoped_org on scoped_org.id = stock.organization_id
    join public.inventory_items item on item.id = stock.item_id
      and item.organization_id = stock.organization_id
    where item.archived_at is null
      and item.is_active = true
      and can_view_inventory
      and (
        agency_filter is null
        or exists (
          select 1 from public.agencies agency
          where agency.id = agency_filter and agency.organization_id = stock.organization_id
        )
      )
  ),
  product_rows as materialized (
    select shipment.id as shipment_id,
      coalesce(nullif(btrim(product->>'catalogKey'), ''), nullif(btrim(product->>'label'), ''), 'sin-clave') as product_key,
      coalesce(nullif(btrim(product->>'label'), ''), nullif(btrim(product->>'catalogKey'), ''), 'Producto sin nombre') as product_label,
      case when coalesce(product->>'quantity', '') ~ '^[0-9]+([.][0-9]+)?$'
        then (product->>'quantity')::numeric else 0 end as quantity,
      case when can_view_finance
        and regexp_replace(coalesce(product->>'unitPrice', ''), '[^0-9.-]', '', 'g') ~ '^[0-9]+([.][0-9]+)?$'
        then regexp_replace(product->>'unitPrice', '[^0-9.-]', '', 'g')::numeric else 0 end as unit_price
    from current_shipments shipment
    cross join lateral jsonb_array_elements(
      case when jsonb_typeof(shipment.logistics_plan->'billing'->'cartLines') = 'array'
        then shipment.logistics_plan->'billing'->'cartLines' else '[]'::jsonb end
    ) product
  ),
  agency_rows as materialized (
    select agency.id, agency.organization_id, agency.code, agency.status,
      organization.name as label,
      coalesce(sale_metrics.sales, 0)::numeric as sales,
      coalesce(sale_metrics.shipments, 0)::integer as shipments,
      coalesce(charge_metrics.receivable, 0)::numeric as agency_receivable,
      coalesce(payment_metrics.unapplied, 0)::numeric as unapplied_payments
    from public.agencies agency
    join public.organizations organization on organization.id = agency.organization_id
    left join lateral (
      select coalesce(sum(sale.total_cents), 0)::numeric / 100 as sales,
        count(distinct sale.shipment_id) filter (where sale.shipment_id is not null)::integer as shipments
      from public.sales sale
      where can_view_finance
        and sale.tenant_id = agency.tenant_id
        and sale.agency_organization_id = agency.organization_id
        and sale.status <> 'void'
        and sale.created_at >= period_start and sale.created_at < period_end
    ) sale_metrics on true
    left join lateral (
      select coalesce(sum(balance.outstanding_cents), 0)::numeric / 100 as receivable
      from public.agency_charge_balances balance
      where can_view_agency_finance
        and balance.tenant_id = agency.tenant_id
        and balance.agency_organization_id = agency.organization_id
    ) charge_metrics on true
    left join lateral (
      select coalesce(sum(balance.unapplied_cents), 0)::numeric / 100 as unapplied
      from public.agency_payment_balances balance
      where can_view_agency_finance
        and balance.tenant_id = agency.tenant_id
        and balance.agency_organization_id = agency.organization_id
    ) payment_metrics on true
    where can_view_agencies
      and agency.tenant_id = caller_tenant_id
      and (caller_org.organization_type = 'matrix' or agency.organization_id = caller_org_id)
      and (agency_filter is null or agency.id = agency_filter)
  ),
  attention_rows as (
    select task.id::text as id, 'overdue_task'::text as kind, 'warning'::text as severity,
      'Tarea vencida'::text as title,
      concat(task.shipment_code, ' · ', task.task_type, ' · ', task.customer_name) as detail,
      task.operational_at as occurred_at,
      '/seguimiento/' || task.shipment_id::text || '/expediente' as href
    from current_tasks task
    where task.status not in ('completed', 'cancelled') and task.operational_at < now()
    union all
    select exception.id::text, 'operational_exception',
      case when exception.blocks_release then 'critical' else 'warning' end,
      'Excepcion operativa', concat(exception.exception_type, ' · ', exception.reason),
      exception.reported_at,
      case when exception.shipment_id is null then '/seguimiento/excepciones'
        else '/seguimiento/' || exception.shipment_id::text || '/expediente' end
    from current_exceptions exception
    union all
    select package.id::text, 'weight_review', 'warning', 'Diferencia de peso sin revisar',
      concat(package.code, ' · ', package.weight_difference_kg, ' kg'), package.updated_at,
      '/seguimiento/' || package.shipment_id::text || '/expediente'
    from current_packages package
    where package.weight_difference_kg is not null
      and package.weight_difference_reviewed_at is null
    union all
    select handoff.id::text, 'custody_handoff', 'warning', 'Custodia pendiente de recibir',
      concat(handoff.from_holder_label, ' → ', handoff.to_holder_label), handoff.initiated_at,
      '/seguimiento/' || handoff.shipment_id::text || '/expediente'
    from current_custody handoff
    union all
    select hold.id::text, 'financial_hold', 'critical', 'Retencion financiera activa',
      coalesce(nullif(btrim(hold.reason), ''), 'Requiere revision contable'), hold.created_at,
      '/contabilidad'
    from public.current_financial_holds hold
    where can_view_agency_finance
      and hold.tenant_id = caller_tenant_id
      and hold.status = 'active'
      and (agency_filter is null or hold.agency_organization_id = (
        select agency.organization_id from public.agencies agency where agency.id = agency_filter
      ))
      and (caller_org.organization_type = 'matrix' or hold.agency_organization_id = caller_org_id)
    union all
    select inventory.id::text, 'low_stock', 'warning', 'Inventario bajo minimo',
      concat(inventory.item_name, ' · ', inventory.stock, ' de ', inventory.min_stock), null::timestamptz,
      '/inventario'
    from inventory_rows inventory
    where inventory.stock <= inventory.min_stock
  ),
  coverage_values as (
    select
      count(*)::integer as shipments_total,
      count(*) filter (where quoted_total is not null)::integer as quoted_available,
      count(*) filter (where customer_id is not null)::integer as customer_available,
      count(*) filter (where box_count is not null)::integer as boxes_available,
      count(*) filter (where seller_id is not null)::integer as seller_available,
      count(*) filter (where agency_id is not null)::integer as agency_available
    from current_shipments
  ),
  inventory_coverage as (
    select count(*) filter (where stock > 0)::integer as total,
      count(*) filter (where stock > 0 and avg_cost > 0)::integer as available
    from inventory_rows
  )
  select jsonb_build_object(
    'meta', jsonb_build_object(
      'generatedAt', now(),
      'timeZone', 'America/Los_Angeles',
      'currency', 'USD',
      'period', jsonb_build_object(
        'from', period_from, 'to', period_to,
        'compareFrom', comparison_from, 'compareTo', comparison_to,
        'granularity', bucket_granularity
      ),
      'filters', jsonb_strip_nulls(jsonb_build_object(
        'agencyId', agency_filter, 'country', country_filter, 'sellerId', seller_filter,
        'routeId', route_filter, 'driverId', driver_filter,
        'shipmentStatus', status_filter, 'operationType', operation_filter,
        'productKey', product_filter
      )),
      'coverage', (
        select jsonb_build_array(
          public.statistics_coverage_json('quotedTotal', 'Total cotizado persistido', quoted_available, shipments_total),
          public.statistics_coverage_json('customerId', 'Clientes con ID persistido', customer_available, shipments_total),
          public.statistics_coverage_json('boxCount', 'Cantidad de cajas persistida', boxes_available, shipments_total),
          public.statistics_coverage_json('sellerCreatedBy', 'Vendedor atribuido por creador', seller_available, shipments_total),
          public.statistics_coverage_json('agencyLink', 'Envios vinculados a agencia', agency_available, shipments_total),
          public.statistics_coverage_json('inventoryCost', 'Stock positivo con costo promedio', inventory_coverage.available, inventory_coverage.total)
        )
        from coverage_values, inventory_coverage
      ),
      'limitations', (
        select jsonb_agg(row.payload order by row.position)
        from (
          values
            (1, jsonb_build_object('key','collectionsCashFlow','title','Cobros por fecha de recepcion','detail','Cobros usa shipment_payments.created_at; no es el pagado acumulado de las ventas creadas en el periodo.','impact','info')),
            (2, jsonb_build_object('key','pendingSnapshot','title','Pendiente es una foto actual','detail','El saldo de ventas del periodo usa total cotizado menos paid actual y puede cambiar con abonos posteriores.','impact','info')),
            (3, jsonb_build_object('key','logisticsOperationalDate','title','Fecha operativa de tareas','detail','Tareas usa scheduled_at, luego requested_schedule_at y finalmente created_at cuando falta programacion.','impact','info')),
            (4, jsonb_build_object('key','inventorySnapshot','title','Inventario sin periodo','detail','Inventario es una foto actual del alcance autorizado y no se suma con paquetes fisicos de clientes.','impact','info')),
            (5, jsonb_build_object('key','agencyFinanceSeparated','title','Carteras separadas','detail','La cuenta agencia-matriz y la cartera de clientes se muestran separadas y nunca se suman entre si.','impact','info')),
            (6, case when inventory_coverage.total > 0 and inventory_coverage.available < inventory_coverage.total
              then jsonb_build_object('key','inventoryValuationUnavailable','title','Valoracion incompleta','detail','El valor estimado queda no disponible porque hay stock positivo sin avg_cost confiable.','impact','warning')
              else null end)
        ) row(position, payload)
        where row.payload is not null
      )
    ),
    'capabilities', jsonb_build_object(
      'finance', can_view_finance, 'logistics', can_view_logistics,
      'inventory', can_view_inventory, 'agencies', can_view_agencies,
      'agencyFinance', can_view_agency_finance
    ),
    'filterOptions', jsonb_build_object(
      'agencies', (select coalesce(jsonb_agg(jsonb_build_object('value', id, 'label', label, 'meta', code) order by label), '[]'::jsonb) from agency_rows),
      'countries', (select coalesce(jsonb_agg(jsonb_build_object('value', value, 'label', value) order by value), '[]'::jsonb) from (select distinct country as value from scoped_shipments where btrim(country) <> '' limit 200) row),
      'sellers', (select coalesce(jsonb_agg(jsonb_build_object('value', seller_id, 'label', seller_name) order by seller_name), '[]'::jsonb) from (select distinct seller_id, seller_name from scoped_shipments where seller_id is not null limit 200) row),
      'routes', (select coalesce(jsonb_agg(jsonb_build_object('value', id, 'label', name, 'meta', route_date) order by route_date desc, name), '[]'::jsonb) from (select route.id, route.name, route.route_date from public.logistics_routes route join scoped_organizations scoped_org on scoped_org.id=route.organization_id where can_view_logistics order by route.route_date desc limit 200) row),
      'drivers', (select coalesce(jsonb_agg(jsonb_build_object('value', id, 'label', label) order by label), '[]'::jsonb) from (select distinct profile.id, coalesce(nullif(btrim(profile.full_name),''), profile.email) as label from public.profiles profile join scoped_organizations scoped_org on scoped_org.id=profile.organization_id where can_view_logistics and profile.is_active and profile.archived_at is null and (exists(select 1 from public.logistics_routes route where route.assigned_to=profile.id and route.organization_id=profile.organization_id) or exists(select 1 from public.shipment_logistics_tasks task where task.assigned_to=profile.id and task.organization_id=profile.organization_id)) limit 200) row),
      'shipmentStatuses', (select coalesce(jsonb_agg(jsonb_build_object('value', value, 'label', value) order by value), '[]'::jsonb) from (select distinct status as value from scoped_shipments limit 100) row),
      'operationTypes', (select coalesce(jsonb_agg(jsonb_build_object('value', value, 'label', value) order by value), '[]'::jsonb) from (select distinct sale_kind as value from scoped_shipments limit 100) row),
      'products', (select coalesce(jsonb_agg(jsonb_build_object('value', product_key, 'label', product_label) order by product_label), '[]'::jsonb) from (select product_key,min(product_label) as product_label from (select shipment.logistics_plan from public.shipments shipment join scoped_organizations scoped_org on scoped_org.id=shipment.organization_id where shipment.invoice_status <> 'void' order by shipment.created_at desc limit 1000) shipment cross join lateral jsonb_array_elements(case when jsonb_typeof(shipment.logistics_plan->'billing'->'cartLines')='array' then shipment.logistics_plan->'billing'->'cartLines' else '[]'::jsonb end) product cross join lateral (select coalesce(nullif(btrim(product->>'catalogKey'),''),nullif(btrim(product->>'label'),''),'sin-clave') as product_key, coalesce(nullif(btrim(product->>'label'),''),nullif(btrim(product->>'catalogKey'),''),'Producto sin nombre') as product_label) normalized group by product_key order by min(product_label) limit 200) grouped_products)
    ),
    'kpis', (
      select jsonb_build_object(
        'sales', public.statistics_kpi_json(current_totals.sales, previous_totals.sales),
        'collections', public.statistics_kpi_json(current_collection_total.collections, previous_collection_total.collections),
        'pending', public.statistics_kpi_json(current_totals.pending, previous_totals.pending),
        'shipments', public.statistics_kpi_json(current_totals.shipments, previous_totals.shipments),
        'boxes', public.statistics_kpi_json(current_totals.boxes, previous_totals.boxes),
        'customers', public.statistics_kpi_json(current_totals.customers, previous_totals.customers),
        'averageTicket', public.statistics_kpi_json(coalesce(current_totals.average_ticket,0), coalesce(previous_totals.average_ticket,0))
      ) from current_totals, previous_totals, current_collection_total, previous_collection_total
    ),
    'trend', jsonb_build_object(
      'granularity', bucket_granularity,
      'buckets', (
        select coalesce(jsonb_agg(jsonb_build_object(
          'key', index_value::text,
          'label', case bucket_granularity
            when 'hour' then to_char(period_from::timestamp + index_value * interval '1 hour', 'HH24:MI')
            when 'day' then to_char(period_from::timestamp + index_value * interval '1 day', 'DD Mon')
            when 'week' then 'Sem ' || to_char(period_from::timestamp + index_value * interval '7 day', 'DD Mon')
            else to_char(period_from::timestamp + index_value * interval '1 month', 'Mon YYYY')
          end,
          'current', jsonb_build_object('sales',coalesce(cs.sales,0),'collections',coalesce(cp.collections,0),'pending',coalesce(cs.pending,0),'shipments',coalesce(cs.shipments,0),'boxes',coalesce(cs.boxes,0),'customers',coalesce(cs.customers,0)),
          'previous', jsonb_build_object('sales',coalesce(ps.sales,0),'collections',coalesce(pp.collections,0),'pending',coalesce(ps.pending,0),'shipments',coalesce(ps.shipments,0),'boxes',coalesce(ps.boxes,0),'customers',coalesce(ps.customers,0))
        ) order by index_value), '[]'::jsonb)
        from bucket_indices
        left join current_shipment_buckets cs on cs.bucket_index=index_value
        left join previous_shipment_buckets ps on ps.bucket_index=index_value
        left join current_payment_buckets cp on cp.bucket_index=index_value
        left join previous_payment_buckets pp on pp.bucket_index=index_value
      )
    ),
    'finance', (
      select jsonb_build_object(
        'billed', totals.sales, 'collected', collections.collections, 'pending', totals.pending,
        'averageTicket', coalesce(totals.average_ticket,0),
        'openInvoices', (select count(*) from current_shipments where invoice_status <> 'paid'),
        'paidInvoices', (select count(*) from current_shipments where invoice_status = 'paid'),
        'byStatus', (select coalesce(jsonb_agg(jsonb_build_object('key',invoice_status,'label',invoice_status,'count',count_value,'amount',amount) order by count_value desc), '[]'::jsonb) from (select invoice_status,count(*)::integer count_value,coalesce(sum(quoted_total),0)::numeric amount from current_shipments group by invoice_status) row),
        'paymentMethods', (select coalesce(jsonb_agg(jsonb_build_object('key',method,'label',method,'count',count_value,'amount',amount) order by amount desc,method), '[]'::jsonb) from (select method,count(*)::integer count_value,coalesce(sum(amount),0)::numeric amount from current_payments group by method) row)
      ) from current_totals totals, current_collection_total collections
    ),
    'logistics', jsonb_build_object(
      'tasks', (select coalesce(jsonb_agg(jsonb_build_object('key',status,'label',status,'count',count_value) order by count_value desc), '[]'::jsonb) from (select status,count(*)::integer count_value from current_tasks group by status) row),
      'routes', (select coalesce(jsonb_agg(jsonb_build_object('key',status,'label',status,'count',count_value) order by count_value desc), '[]'::jsonb) from (select status,count(*)::integer count_value from current_routes group by status) row),
      'packages', (select coalesce(jsonb_agg(jsonb_build_object('key',status,'label',status,'count',count_value) order by count_value desc), '[]'::jsonb) from (select status,count(*)::integer count_value from current_packages group by status) row),
      'exceptions', (select count(*) from current_exceptions),
      'pendingCustody', (select count(*) from current_custody)
    ),
    'inventory', (
      select jsonb_build_object(
        'stock', coalesce(sum(stock),0), 'reserved', coalesce(sum(reserved),0),
        'assigned', coalesce(sum(assigned),0), 'unavailable', coalesce(sum(unavailable),0),
        'available', coalesce(sum(greatest(stock-reserved,0)),0),
        'estimatedValue', case when count(*) filter(where stock>0)=count(*) filter(where stock>0 and avg_cost>0)
          then coalesce(sum(stock*avg_cost),0) else null end,
        'valuationCoveragePct', case when count(*) filter(where stock>0)=0 then 100 else round(100.0*count(*) filter(where stock>0 and avg_cost>0)/count(*) filter(where stock>0),2) end,
        'lowStockItems', (select coalesce(jsonb_agg(jsonb_build_object('key',item_key,'label',item_name,'count',stock,'amount',min_stock) order by stock asc,item_name) filter(where stock<=min_stock), '[]'::jsonb) from inventory_rows)
      ) from inventory_rows
    ),
    'agencies', jsonb_build_object(
      'agencyReceivable', (select coalesce(sum(agency_receivable),0) from agency_rows),
      'customerReceivable', (select coalesce(sum(balance.outstanding_cents),0)::numeric/100 from public.customer_invoice_balances balance join scoped_organizations scoped_org on scoped_org.id=balance.organization_id where can_view_agency_finance and balance.tenant_id=caller_tenant_id and (agency_filter is null or balance.organization_id=(select agency.organization_id from public.agencies agency where agency.id=agency_filter))),
      'unappliedAgencyPayments', (select coalesce(sum(unapplied_payments),0) from agency_rows),
      'rows', (select coalesce(jsonb_agg(jsonb_build_object('id',id,'label',label,'code',code,'status',status,'sales',sales,'shipments',shipments,'agencyReceivable',agency_receivable,'unappliedPayments',unapplied_payments) order by sales desc,label), '[]'::jsonb) from agency_rows)
    ),
    'rankings', jsonb_build_object(
      'sellers', (select coalesce(jsonb_agg(to_jsonb(row) order by row.sales desc,row.shipments desc,row.label), '[]'::jsonb) from (select shipment.seller_id as id,shipment.seller_name as label,count(*)::integer shipments,coalesce(sum(shipment.quoted_total),0)::numeric sales,coalesce((select sum(payment.amount) from current_payments payment where payment.seller_id is not distinct from shipment.seller_id),0)::numeric collections,coalesce(sum(shipment.pending),0)::numeric pending,count(distinct shipment.customer_id) filter(where shipment.customer_id is not null)::integer customers,coalesce(sum(shipment.box_count),0)::numeric boxes from current_shipments shipment group by shipment.seller_id,shipment.seller_name order by sales desc limit 20) row),
      'countries', (select coalesce(jsonb_agg(to_jsonb(row) order by row.sales desc,row.shipments desc,row.label), '[]'::jsonb) from (select shipment.country as key,shipment.country as label,count(*)::integer shipments,coalesce(sum(shipment.quoted_total),0)::numeric sales,coalesce((select sum(payment.amount) from current_payments payment where payment.country=shipment.country),0)::numeric collections,coalesce(sum(shipment.pending),0)::numeric pending,coalesce(sum(shipment.box_count),0)::numeric boxes from current_shipments shipment group by shipment.country order by sales desc limit 20) row),
      'products', (select coalesce(jsonb_agg(to_jsonb(row) order by row.sales desc,row.quantity desc,row.label), '[]'::jsonb) from (select product_key as key,min(product_label) as label,coalesce(sum(quantity),0)::numeric quantity,coalesce(sum(quantity*unit_price),0)::numeric sales,count(distinct shipment_id)::integer shipments from product_rows group by product_key order by sales desc limit 20) row),
      'routes', (select coalesce(jsonb_agg(jsonb_build_object('id',id,'label',name,'date',route_date,'status',status,'stops',stops,'completedStops',completed_stops,'driverId',assigned_to,'driverName',driver_name) order by stops desc,route_date desc), '[]'::jsonb) from current_routes),
      'drivers', (select coalesce(jsonb_agg(to_jsonb(row) order by row.completed_stops desc,row.stops desc,row.label), '[]'::jsonb) from (select driver.id,coalesce(nullif(btrim(driver.full_name),''),driver.email) label,count(distinct route.id)::integer routes,coalesce(sum(route.stops),0)::integer stops,coalesce(sum(route.completed_stops),0)::integer completed_stops,(select count(*) from current_tasks task where task.driver_id=driver.id)::integer tasks,(select count(*) from current_tasks task where task.driver_id=driver.id and task.status='completed')::integer completed_tasks from public.profiles driver join scoped_organizations scoped_org on scoped_org.id=driver.organization_id join current_routes route on route.assigned_to=driver.id group by driver.id,driver.full_name,driver.email order by completed_stops desc limit 20) row)
    ),
    'attention', (select coalesce(jsonb_agg(jsonb_build_object('id',id,'kind',kind,'severity',severity,'title',title,'detail',detail,'occurredAt',occurred_at,'href',href) order by case severity when 'critical' then 0 when 'warning' then 1 else 2 end,occurred_at nulls last) , '[]'::jsonb) from (select * from attention_rows limit 50) row),
    'tables', jsonb_build_object(
      'shipments', (select coalesce(jsonb_agg(jsonb_build_object('id',id,'code',code,'createdAt',created_at,'customerId',customer_id,'customerName',customer_name,'country',country,'status',status,'invoiceStatus',invoice_status,'sellerId',seller_id,'sellerName',seller_name,'agencyName',agency_name,'sales',coalesce(quoted_total,0),'paid',paid,'pending',pending,'boxes',coalesce(box_count,0)) order by created_at desc), '[]'::jsonb) from (select * from current_shipments order by created_at desc limit 100) row),
      'payments', (select coalesce(jsonb_agg(jsonb_build_object('id',id,'shipmentId',shipment_id,'shipmentCode',shipment_code,'createdAt',created_at,'amount',amount,'method',method,'customerName',customer_name,'sellerName',seller_name) order by created_at desc), '[]'::jsonb) from (select * from current_payments order by created_at desc limit 100) row),
      'tasks', (select coalesce(jsonb_agg(jsonb_build_object('id',id,'shipmentId',shipment_id,'shipmentCode',shipment_code,'taskType',task_type,'status',status,'scheduledAt',operational_at,'routeId',route_id,'routeName',route_name,'driverId',driver_id,'driverName',driver_name,'customerName',customer_name,'country',country) order by operational_at desc), '[]'::jsonb) from (select * from current_tasks order by operational_at desc limit 100) row)
    )
  ) into result
  from inventory_coverage;

  return result;
end;
$$;

revoke all on function public.load_statistics_dashboard(date, date, date, date, jsonb) from public;
revoke all on function public.load_statistics_dashboard(date, date, date, date, jsonb) from anon;
grant execute on function public.load_statistics_dashboard(date, date, date, date, jsonb) to authenticated;

revoke all on function public.statistics_kpi_json(numeric, numeric) from public;
revoke all on function public.statistics_kpi_json(numeric, numeric) from anon;
revoke all on function public.statistics_coverage_json(text, text, integer, integer) from public;
revoke all on function public.statistics_coverage_json(text, text, integer, integer) from anon;

comment on function public.load_statistics_dashboard(date, date, date, date, jsonb) is
  'Dashboard agregado. Deriva organizacion/tenant de auth, aplica alcance por capacidades y limita rangos a 366 dias.';
