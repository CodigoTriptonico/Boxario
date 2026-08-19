-- P1 2B: bounded, cursor-based read models for operational logistics.
-- Every function derives tenant and authority from the authenticated session.

create index if not exists idx_logistics_routes_workspace_cursor
  on public.logistics_routes (organization_id, status, route_date desc, created_at desc, id desc);

create or replace function public.list_logistics_route_workspace_page(
  target_scope text default 'operational',
  target_from date default null,
  target_to date default null,
  target_assigned_to uuid default null,
  target_zone_key text default null,
  target_route_template_id uuid default null,
  target_search text default null,
  cursor_route_date date default null,
  cursor_created_at timestamptz default null,
  cursor_id uuid default null,
  target_limit integer default 50
)
returns table (
  id uuid,
  route_date date,
  name text,
  status text,
  assigned_to uuid,
  vehicle_id uuid,
  warehouse_id uuid,
  zone_key text,
  route_template_id uuid,
  stop_count integer,
  delivery_stop_count integer,
  pickup_stop_count integer,
  created_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  caller_org uuid := public.current_organization_id();
  normalized_scope text := lower(trim(coalesce(target_scope, 'operational')));
  normalized_search text := nullif(trim(target_search), '');
  page_limit integer := greatest(1, least(coalesce(target_limit, 50), 100));
begin
  if caller_org is null
    or not (public.user_has_permission('routes.view') or public.user_has_permission('sales.manage')) then
    raise exception 'FORBIDDEN';
  end if;

  if normalized_scope not in ('operational', 'history') then
    raise exception 'INVALID_SCOPE';
  end if;

  return query
  select
    route.id,
    route.route_date,
    route.name,
    route.status,
    route.assigned_to,
    route.vehicle_id,
    route.warehouse_id,
    route.zone_key,
    route.route_template_id,
    count(stop.id)::integer,
    count(stop.id) filter (where task.task_type = 'deliver_empty_box')::integer,
    count(stop.id) filter (where task.task_type = 'pickup_full_box')::integer,
    route.created_at
  from public.logistics_routes route
  left join public.logistics_route_stops stop
    on stop.route_id = route.id
   and stop.organization_id = caller_org
   and stop.released_at is null
  left join public.shipment_logistics_tasks task
    on task.id = stop.task_id
   and task.organization_id = caller_org
  left join public.shipments shipment
    on shipment.id = task.shipment_id
   and shipment.organization_id = caller_org
  where route.organization_id = caller_org
    and case
      when normalized_scope = 'operational' then route.status in ('draft', 'planned', 'in_progress')
      else route.status in ('completed', 'cancelled')
    end
    and (target_from is null or route.route_date >= target_from)
    and (target_to is null or route.route_date <= target_to)
    and (target_assigned_to is null or route.assigned_to = target_assigned_to)
    and (target_zone_key is null or route.zone_key = target_zone_key)
    and (target_route_template_id is null or route.route_template_id = target_route_template_id)
    and (
      normalized_search is null
      or route.name ilike '%' || normalized_search || '%'
      or route.notes ilike '%' || normalized_search || '%'
      or route.zone_key ilike '%' || normalized_search || '%'
      or route.route_date::text ilike '%' || normalized_search || '%'
      or stop.postal_code ilike '%' || normalized_search || '%'
      or stop.city ilike '%' || normalized_search || '%'
      or stop.address_snapshot::text ilike '%' || normalized_search || '%'
      or shipment.code ilike '%' || normalized_search || '%'
      or shipment.customer_name ilike '%' || normalized_search || '%'
    )
    and (
      cursor_route_date is null
      or cursor_created_at is null
      or cursor_id is null
      or (route.route_date, route.created_at, route.id) < (cursor_route_date, cursor_created_at, cursor_id)
    )
  group by route.id
  order by route.route_date desc, route.created_at desc, route.id desc
  limit page_limit;
end;
$$;

revoke all on function public.list_logistics_route_workspace_page(text, date, date, uuid, text, uuid, text, date, timestamptz, uuid, integer) from public;
grant execute on function public.list_logistics_route_workspace_page(text, date, date, uuid, text, uuid, text, date, timestamptz, uuid, integer) to authenticated;

-- A conductor never needs its historical task universe to decide the board for
-- one operational day.  Keep the historical exception semantics (loaded and
-- unscheduled direct tasks remain in scope) while applying them in SQL.
create index if not exists idx_shipment_logistics_tasks_driver_scope
  on public.shipment_logistics_tasks (organization_id, assigned_to, scheduled_at, created_at desc, id desc);

create or replace function public.list_conductor_operational_task_page(
  p_driver_id uuid,
  p_scope_date date,
  p_visibility text default 'open',
  p_cursor_sort_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit integer default 100
)
returns table (
  task_id uuid,
  shipment_id uuid,
  task_type text,
  task_status text,
  scheduled_at timestamptz,
  assigned_to uuid,
  route_id uuid,
  route_name text,
  route_date date,
  stop_order integer,
  vehicle_id uuid,
  sort_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  caller_org uuid := public.current_organization_id();
  normalized_visibility text := lower(trim(coalesce(p_visibility, 'open')));
  page_limit integer := greatest(1, least(coalesce(p_limit, 100), 100));
begin
  if caller_org is null or p_driver_id is null or p_scope_date is null then
    raise exception 'INVALID_SCOPE';
  end if;

  -- The web action applies the same rule before invoking the RPC.  Repeating
  -- it here makes the RPC safe for every authenticated caller.
  if public.current_role_slug() <> 'administrador' and auth.uid() <> p_driver_id then
    raise exception 'FORBIDDEN';
  end if;

  if normalized_visibility not in ('open', 'closed') then
    raise exception 'INVALID_VISIBILITY';
  end if;

  return query
  with routed as (
    select
      task.id as task_id,
      route.id as route_id,
      route.name as route_name,
      route.route_date,
      stop.stop_order,
      route.vehicle_id
    from public.logistics_routes route
    join public.logistics_route_stops stop
      on stop.route_id = route.id
     and stop.organization_id = caller_org
     and stop.released_at is null
    join public.shipment_logistics_tasks task
      on task.id = stop.task_id
     and task.organization_id = caller_org
    where route.organization_id = caller_org
      and route.assigned_to = p_driver_id
      and route.route_date = p_scope_date
      and route.status not in ('draft', 'cancelled')
  ),
  eligible as (
    select
      task.id as task_id,
      task.shipment_id,
      task.task_type,
      task.status as task_status,
      task.scheduled_at,
      task.assigned_to,
      routed.route_id,
      routed.route_name,
      routed.route_date,
      routed.stop_order,
      routed.vehicle_id,
      coalesce(routed.route_date::timestamptz, task.scheduled_at, task.created_at) as sort_at
    from public.shipment_logistics_tasks task
    left join routed on routed.task_id = task.id
    where task.organization_id = caller_org
      and (
        routed.task_id is not null
        or (
          task.assigned_to = p_driver_id
          and (
            task.status = 'loaded_to_truck'
            or task.scheduled_at is null
            or (task.scheduled_at at time zone 'America/Los_Angeles')::date = p_scope_date
          )
        )
      )
      and case
        when normalized_visibility = 'open' then task.status not in ('completed', 'cancelled')
        else task.status in ('completed', 'cancelled')
      end
  )
  select
    eligible.task_id,
    eligible.shipment_id,
    eligible.task_type,
    eligible.task_status,
    eligible.scheduled_at,
    eligible.assigned_to,
    eligible.route_id,
    eligible.route_name,
    eligible.route_date,
    eligible.stop_order,
    eligible.vehicle_id,
    eligible.sort_at
  from eligible
  where p_cursor_sort_at is null
    or p_cursor_id is null
    or (eligible.sort_at, eligible.task_id) < (p_cursor_sort_at, p_cursor_id)
  order by eligible.sort_at desc, eligible.task_id desc
  limit page_limit;
end;
$$;

revoke all on function public.list_conductor_operational_task_page(uuid, date, text, timestamptz, uuid, integer) from public;
grant execute on function public.list_conductor_operational_task_page(uuid, date, text, timestamptz, uuid, integer) to authenticated;

-- Small task-board projection.  It intentionally omits the rich shipment
-- graph; opening an invoice continues to use the existing detail read.
create index if not exists idx_shipment_logistics_tasks_board_cursor
  on public.shipment_logistics_tasks (organization_id, status, created_at desc, id desc);

create or replace function public.list_logistics_task_board_page(
  p_route_date date default null,
  p_task_type text default null,
  p_assigned_to uuid default null,
  p_zone_key text default null,
  p_search text default null,
  p_cursor_created_at timestamptz default null,
  p_cursor_id uuid default null,
  p_limit integer default 50
)
returns table (
  task_id uuid,
  shipment_id uuid,
  task_type text,
  task_status text,
  scheduled_at timestamptz,
  assigned_to uuid,
  shipment_code text,
  customer_name text,
  route_id uuid,
  route_date date,
  zone_key text,
  created_at timestamptz
)
language plpgsql
security invoker
set search_path = public
as $$
declare
  caller_org uuid := public.current_organization_id();
  normalized_search text := nullif(trim(p_search), '');
  page_limit integer := greatest(1, least(coalesce(p_limit, 50), 100));
begin
  if caller_org is null
    or not (public.user_has_permission('routes.view') or public.user_has_permission('sales.manage')) then
    raise exception 'FORBIDDEN';
  end if;

  return query
  select
    task.id,
    task.shipment_id,
    task.task_type,
    task.status,
    task.scheduled_at,
    task.assigned_to,
    shipment.code,
    shipment.customer_name,
    route.id,
    route.route_date,
    route.zone_key,
    task.created_at
  from public.shipment_logistics_tasks task
  join public.shipments shipment
    on shipment.id = task.shipment_id
   and shipment.organization_id = caller_org
  left join public.logistics_route_stops stop
    on stop.task_id = task.id
   and stop.organization_id = caller_org
   and stop.released_at is null
  left join public.logistics_routes route
    on route.id = stop.route_id
   and route.organization_id = caller_org
   and route.status not in ('draft', 'cancelled')
  where task.organization_id = caller_org
    and task.status not in ('completed', 'cancelled')
    and (p_route_date is null or route.route_date = p_route_date)
    and (p_task_type is null or task.task_type = p_task_type)
    and (p_assigned_to is null or task.assigned_to = p_assigned_to)
    and (p_zone_key is null or route.zone_key = p_zone_key)
    and (
      normalized_search is null
      or shipment.code ilike '%' || normalized_search || '%'
      or shipment.customer_name ilike '%' || normalized_search || '%'
      or route.name ilike '%' || normalized_search || '%'
      or stop.address_snapshot::text ilike '%' || normalized_search || '%'
    )
    and (
      p_cursor_created_at is null
      or p_cursor_id is null
      or (task.created_at, task.id) < (p_cursor_created_at, p_cursor_id)
    )
  order by task.created_at desc, task.id desc
  limit page_limit;
end;
$$;

revoke all on function public.list_logistics_task_board_page(date, text, uuid, text, text, timestamptz, uuid, integer) from public;
grant execute on function public.list_logistics_task_board_page(date, text, uuid, text, text, timestamptz, uuid, integer) to authenticated;
