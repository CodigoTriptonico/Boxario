-- Atomic route cancel: unassign drivers on tasks, release stops, cancel route,
-- and audit in one transaction (replaces multi-step TS cancelLogisticsRouteAction).

create or replace function public.cancel_logistics_route_atomic(
  p_route_id uuid,
  p_client_operation_id text default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  caller_org uuid := public.current_organization_id();
  route_row public.logistics_routes;
  now_ts timestamptz := now();
  previous_driver uuid;
  released_stops integer := 0;
  unassigned_tasks integer := 0;
  route_name text;
  route_date_value date;
begin
  if caller_id is null or caller_org is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if not (
    public.user_has_permission('routes.update_status')
    or public.user_has_permission('sales.manage')
  ) then
    raise exception 'FORBIDDEN';
  end if;

  select * into route_row
  from public.logistics_routes
  where id = p_route_id
    and organization_id = caller_org
  for update;

  if route_row.id is null then
    raise exception 'ROUTE_NOT_FOUND';
  end if;

  if route_row.status = 'cancelled' then
    return jsonb_build_object(
      'replayed', true,
      'routeId', route_row.id,
      'status', route_row.status,
      'releasedStops', 0,
      'unassignedTasks', 0
    );
  end if;

  if route_row.status not in ('draft', 'planned') then
    raise exception 'ROUTE_NOT_CANCELLABLE';
  end if;

  previous_driver := route_row.assigned_to;
  route_name := route_row.name;
  route_date_value := route_row.route_date;

  if previous_driver is not null then
    update public.shipment_logistics_tasks task
    set
      assigned_to = null,
      status = case
        when task.status = 'assigned' and task.scheduled_at is not null then 'scheduled'
        when task.status = 'assigned' then 'pending'
        else task.status
      end,
      updated_at = now_ts
    where task.organization_id = caller_org
      and task.assigned_to = previous_driver
      and exists (
        select 1
        from public.logistics_route_stops stop
        where stop.task_id = task.id
          and stop.route_id = route_row.id
          and stop.released_at is null
          and stop.organization_id = caller_org
      );

    get diagnostics unassigned_tasks = row_count;

    update public.shipments shipment
    set assigned_to = null
    where shipment.organization_id = caller_org
      and shipment.assigned_to is not distinct from previous_driver
      and exists (
        select 1
        from public.shipment_logistics_tasks task
        join public.logistics_route_stops stop
          on stop.task_id = task.id
         and stop.route_id = route_row.id
         and stop.organization_id = caller_org
        where task.shipment_id = shipment.id
          and task.organization_id = caller_org
      );
  end if;

  update public.logistics_route_stops
  set
    released_at = now_ts,
    release_reason = 'route_cancelled',
    updated_at = now_ts
  where route_id = route_row.id
    and organization_id = caller_org
    and released_at is null;

  get diagnostics released_stops = row_count;

  update public.logistics_routes
  set
    status = 'cancelled',
    assigned_to = null,
    updated_at = now_ts
  where id = route_row.id
    and organization_id = caller_org
    and status in ('draft', 'planned');

  if not found then
    raise exception 'ROUTE_CANCEL_CONFLICT';
  end if;

  perform public.record_activity_history(
    'logistics.route_cancelled',
    'logistics_route',
    route_row.id,
    'Ruta cancelada: ' || route_name,
    coalesce(route_date_value::text, '') || ' · ' || released_stops::text || ' paradas liberadas',
    jsonb_build_object(
      'routeId', route_row.id,
      'releasedStops', released_stops,
      'unassignedTasks', unassigned_tasks,
      'previousDriverId', previous_driver,
      'clientOperationId', p_client_operation_id
    )
  );

  return jsonb_build_object(
    'replayed', false,
    'routeId', route_row.id,
    'status', 'cancelled',
    'releasedStops', released_stops,
    'unassignedTasks', unassigned_tasks,
    'previousDriverId', previous_driver,
    'actorId', caller_id
  );
end;
$$;

revoke all on function public.cancel_logistics_route_atomic(uuid, text) from public, anon;
grant execute on function public.cancel_logistics_route_atomic(uuid, text) to authenticated;
