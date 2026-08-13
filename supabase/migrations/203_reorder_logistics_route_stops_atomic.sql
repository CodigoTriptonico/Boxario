-- Reorder active route stops without re-inserting partial stop rows. The former
-- upsert path could violate logistics_route_stops_source_check before PostgreSQL
-- resolved the id conflict.

create or replace function public.reorder_logistics_route_stops_atomic(
  p_route_id uuid,
  p_stop_ids uuid[]
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  caller_org uuid := public.current_organization_id();
  route_row public.logistics_routes;
  previous_stop_ids uuid[];
  active_stop_count integer := 0;
  distinct_input_count integer := 0;
  updated_stop_count integer := 0;
  actor_name text := '';
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
  from public.logistics_routes route
  where route.id = p_route_id
    and route.organization_id = caller_org
  for update;

  if route_row.id is null then
    raise exception 'ROUTE_NOT_FOUND';
  end if;

  if route_row.status not in ('draft', 'planned') then
    raise exception 'ROUTE_REORDER_STATE_CHANGED';
  end if;

  select coalesce(
    array_agg(stop.id order by stop.stop_order, stop.created_at, stop.id),
    '{}'::uuid[]
  )
  into previous_stop_ids
  from public.logistics_route_stops stop
  where stop.route_id = route_row.id
    and stop.organization_id = caller_org
    and stop.released_at is null;

  active_stop_count := cardinality(previous_stop_ids);
  select count(distinct supplied.stop_id)::integer
  into distinct_input_count
  from unnest(coalesce(p_stop_ids, '{}'::uuid[])) as supplied(stop_id);

  if active_stop_count < 1
     or cardinality(coalesce(p_stop_ids, '{}'::uuid[])) <> active_stop_count
     or distinct_input_count <> active_stop_count
     or exists (
       select 1
       from unnest(coalesce(p_stop_ids, '{}'::uuid[])) as supplied(stop_id)
       left join public.logistics_route_stops stop
         on stop.id = supplied.stop_id
        and stop.route_id = route_row.id
        and stop.organization_id = caller_org
        and stop.released_at is null
       where stop.id is null
     ) then
    raise exception 'ROUTE_STOPS_CHANGED';
  end if;

  if p_stop_ids = previous_stop_ids then
    return jsonb_build_object(
      'routeId', route_row.id,
      'updatedStops', 0,
      'replayed', true
    );
  end if;

  update public.logistics_route_stops stop
  set
    stop_order = ordered.position::integer,
    updated_at = now()
  from unnest(p_stop_ids) with ordinality as ordered(stop_id, position)
  where stop.id = ordered.stop_id
    and stop.route_id = route_row.id
    and stop.organization_id = caller_org
    and stop.released_at is null;

  get diagnostics updated_stop_count = row_count;
  if updated_stop_count <> active_stop_count then
    raise exception 'ROUTE_REORDER_CONFLICT';
  end if;

  perform public.record_activity_history(
    'logistics.route_stops_reordered',
    'logistics_route',
    route_row.id,
    'Orden de paradas actualizado',
    'Se reorganizaron ' || updated_stop_count::text || ' paradas antes de iniciar la ruta.',
    jsonb_build_object(
      'routeId', route_row.id,
      'previousStopIds', to_jsonb(previous_stop_ids),
      'orderedStopIds', to_jsonb(p_stop_ids),
      'routeStatus', route_row.status
    )
  );

  if route_row.status = 'planned' and route_row.assigned_to is not null then
    select coalesce(nullif(btrim(profile.full_name), ''), profile.email, '')
    into actor_name
    from public.profiles profile
    where profile.id = caller_id;

    perform public.notify_logistics_route_change(
      route_row.id,
      route_row.assigned_to,
      'stop_reordered',
      'Nuevo orden de paradas: ' || route_row.name,
      null,
      'stop_reordered:' || route_row.id::text || ':' || array_to_string(p_stop_ids, ','),
      caller_id,
      coalesce(actor_name, '')
    );
  end if;

  return jsonb_build_object(
    'routeId', route_row.id,
    'updatedStops', updated_stop_count,
    'replayed', false
  );
end;
$$;

revoke all on function public.reorder_logistics_route_stops_atomic(uuid, uuid[])
  from public, anon, authenticated;
grant execute on function public.reorder_logistics_route_stops_atomic(uuid, uuid[])
  to authenticated;

comment on function public.reorder_logistics_route_stops_atomic(uuid, uuid[]) is
  'Atomically validates and updates only stop_order for the complete active stop set of a draft or planned route.';
