-- Confirming a preparation group is the final route-assembly decision. Create
-- the concrete route and close it in the same transaction so it never reaches
-- the Routes stage as a new draft.

create or replace function public.confirm_logistics_route_from_bookings(
  p_request_ids uuid[],
  p_idempotency_key uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  confirmed_route_id uuid;
  confirmed_route_status text;
begin
  confirmed_route_id := public.create_logistics_route_from_bookings(
    p_request_ids,
    p_idempotency_key
  );

  select route.status
  into confirmed_route_status
  from public.logistics_routes route
  where route.id = confirmed_route_id
    and route.organization_id = public.current_organization_id()
  for update;

  if confirmed_route_status = 'draft' then
    perform public.publish_logistics_route(confirmed_route_id);
  elsif confirmed_route_status is distinct from 'planned' then
    raise exception 'ROUTE_CONFIRM_CONFLICT';
  end if;

  return confirmed_route_id;
end;
$$;

revoke all on function public.confirm_logistics_route_from_bookings(uuid[], uuid)
  from public, anon, authenticated;
grant execute on function public.confirm_logistics_route_from_bookings(uuid[], uuid)
  to authenticated;

comment on function public.confirm_logistics_route_from_bookings(uuid[], uuid) is
  'Atomically creates and closes the route confirmed in Preparation; idempotent replays return the planned route.';

-- Routes created through the previous two-step flow already passed the
-- Preparation confirmation. Promote every complete, valid draft, including
-- historical/demo routes without retained booking rows. Incomplete drafts remain
-- visible so Logistics can correct them safely.
with ready_routes as (
  select route.id
  from public.logistics_routes route
  where route.status = 'draft'
    and exists (
      select 1
      from public.logistics_route_stops stop
      where stop.route_id = route.id
        and stop.organization_id = route.organization_id
        and stop.released_at is null
    )
    and not exists (
      select 1
      from public.logistics_route_stops stop
      where stop.route_id = route.id
        and stop.organization_id = route.organization_id
        and stop.released_at is null
        and (
          stop.lat is null or stop.lng is null
          or not (stop.lat between -90 and 90)
          or not (stop.lng between -180 and 180)
        )
    )
    and not exists (
      select 1
      from public.logistics_route_stops stop
      join public.shipment_logistics_tasks task on task.id = stop.task_id
      where stop.route_id = route.id
        and stop.organization_id = route.organization_id
        and stop.released_at is null
        and (
          task.schedule_confirmation_status is distinct from 'confirmed'
          or (task.scheduled_at is null and task.window_start_at is null)
          or coalesce(task.scheduled_at, task.window_start_at)::date
            is distinct from route.route_date
        )
    )
),
closed_routes as (
  update public.logistics_routes route
  set
    status = 'planned',
    published_at = coalesce(route.published_at, now()),
    published_by = null,
    updated_at = now()
  from ready_routes ready
  where route.id = ready.id
    and route.status = 'draft'
  returning route.id, route.organization_id, route.name, route.route_date
)
insert into public.activity_history (
  organization_id,
  actor_id,
  actor_name,
  action,
  entity_type,
  entity_id,
  title,
  description,
  metadata
)
select
  route.organization_id,
  null,
  'Sistema',
  'logistics.route_confirmed_from_preparation',
  'logistics_route',
  route.id,
  'Ruta confirmada desde Preparación: ' || route.name,
  route.route_date::text,
  jsonb_build_object(
    'routeId', route.id,
    'routeDate', route.route_date,
    'migration', '202_confirm_prepared_route_atomically'
  )
from closed_routes route;
