-- Atomic route start: tasks load + route in_progress in one transaction.

create or replace function public.start_logistics_route_atomic(
  p_route_id uuid,
  p_task_ids uuid[],
  p_started_lat double precision,
  p_started_lng double precision,
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
  effective_driver uuid;
  now_ts timestamptz := now();
  updated_tasks integer := 0;
begin
  if caller_id is null or caller_org is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if p_started_lat is null or p_started_lng is null
     or p_started_lat < -90 or p_started_lat > 90
     or p_started_lng < -180 or p_started_lng > 180 then
    raise exception 'INVALID_GPS';
  end if;

  select * into route_row
  from public.logistics_routes
  where id = p_route_id
    and organization_id = caller_org
  for update;

  if route_row.id is null then
    raise exception 'ROUTE_NOT_FOUND';
  end if;

  if route_row.status = 'in_progress' then
    return jsonb_build_object(
      'replayed', true,
      'routeId', route_row.id,
      'status', route_row.status
    );
  end if;

  if route_row.status is distinct from 'planned' then
    raise exception 'ROUTE_NOT_PLANNED';
  end if;

  if public.user_has_permission('routes.update_status')
     and caller_id is distinct from route_row.assigned_to then
    effective_driver := route_row.assigned_to;
  else
    if route_row.assigned_to is distinct from caller_id then
      raise exception 'FORBIDDEN';
    end if;
    effective_driver := caller_id;
  end if;

  if effective_driver is null then
    raise exception 'ROUTE_MISSING_DRIVER';
  end if;

  if coalesce(cardinality(p_task_ids), 0) > 0 then
    update public.shipment_logistics_tasks task
    set
      status = 'loaded_to_truck',
      loaded_at = coalesce(task.loaded_at, now_ts),
      stock_deducted_at = coalesce(task.stock_deducted_at, now_ts),
      updated_at = now_ts
    where task.organization_id = caller_org
      and task.id = any(p_task_ids)
      and exists (
        select 1
        from public.logistics_route_stops stop
        where stop.task_id = task.id
          and stop.route_id = route_row.id
          and stop.released_at is null
          and stop.organization_id = caller_org
      );

    get diagnostics updated_tasks = row_count;
  end if;

  update public.logistics_routes
  set
    status = 'in_progress',
    started_at = now_ts,
    started_by = caller_id,
    started_lat = p_started_lat,
    started_lng = p_started_lng,
    updated_at = now_ts
  where id = route_row.id
    and organization_id = caller_org
    and status = 'planned';

  if not found then
    raise exception 'ROUTE_START_CONFLICT';
  end if;

  insert into public.activity_history (
    organization_id, actor_id, actor_name, action, entity_type, entity_id,
    title, description, metadata
  )
  select
    caller_org,
    caller_id,
    coalesce(nullif(btrim(profile.full_name), ''), profile.email, ''),
    'logistics.route_started',
    'logistics_route',
    route_row.id,
    'Ruta iniciada: ' || route_row.name,
    'Inicio atomico de ruta',
    jsonb_build_object(
      'routeId', route_row.id,
      'driverId', effective_driver,
      'taskIds', to_jsonb(coalesce(p_task_ids, '{}'::uuid[])),
      'updatedTasks', updated_tasks,
      'startedLat', p_started_lat,
      'startedLng', p_started_lng,
      'clientOperationId', p_client_operation_id
    )
  from public.profiles profile
  where profile.id = caller_id;

  return jsonb_build_object(
    'replayed', false,
    'routeId', route_row.id,
    'status', 'in_progress',
    'updatedTasks', updated_tasks,
    'driverId', effective_driver,
    'actorId', caller_id
  );
end;
$$;

revoke all on function public.start_logistics_route_atomic(
  uuid, uuid[], double precision, double precision, text
) from public, anon;
grant execute on function public.start_logistics_route_atomic(
  uuid, uuid[], double precision, double precision, text
) to authenticated;
