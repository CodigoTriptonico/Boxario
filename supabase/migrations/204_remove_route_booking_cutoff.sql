-- Remove global booking cutoff, date exceptions, and automatic previous-day close.
-- Manual route close (draft → planned) remains available.

do $$
declare
  existing_job_id bigint;
begin
  select jobid into existing_job_id
  from cron.job
  where jobname = 'boxario-close-due-logistics-routes';

  if existing_job_id is not null then
    perform cron.unschedule(existing_job_id);
  end if;
exception
  when undefined_table then
    null;
  when undefined_object then
    null;
end;
$$;

drop trigger if exists logistics_route_cutoff_guard on public.logistics_routes;
drop trigger if exists logistics_route_stop_cutoff_guard on public.logistics_route_stops;

drop function if exists public.guard_logistics_route_cutoff();
drop function if exists public.guard_logistics_route_stop_cutoff();
drop function if exists public.auto_close_due_logistics_routes();
drop function if exists public.logistics_route_booking_deadline(date, time);
drop function if exists public.effective_logistics_route_booking_cutoff(uuid, uuid, date);
drop function if exists public.save_route_booking_policy(time);
drop function if exists public.save_route_booking_policy(integer, time);
drop function if exists public.activate_logistics_route_weekday(uuid, smallint, time, time, integer, integer, time);

alter table if exists public.organization_route_settings
  drop column if exists route_booking_cutoff_time;

alter table if exists public.logistics_weekday_defaults
  drop column if exists booking_cutoff_time;

alter table if exists public.logistics_route_templates
  drop column if exists booking_cutoff_time;

alter table if exists public.logistics_route_schedules
  drop column if exists booking_cutoff_time;

drop table if exists public.logistics_route_date_exceptions;

create or replace function public.activate_logistics_route_weekday(
  target_org_id uuid,
  target_weekday smallint,
  target_start_time time,
  target_estimated_end_time time,
  target_max_stops integer,
  target_max_boxes integer
)
returns table (
  enabled_days text[],
  weekday smallint,
  start_time time,
  estimated_end_time time,
  max_stops integer,
  max_boxes integer
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  weekday_key text;
  normalized_days text[];
begin
  if target_org_id is null
     or target_weekday not between 0 and 6
     or target_start_time is null
     or (
       target_estimated_end_time is not null
       and target_start_time >= target_estimated_end_time
     )
     or (target_max_stops is not null and target_max_stops <= 0)
     or (target_max_boxes is not null and target_max_boxes <= 0) then
    raise exception 'INVALID_WEEKDAY_SCHEDULE';
  end if;

  if target_org_id is distinct from public.current_organization_id()
     and auth.role() <> 'service_role' then
    raise exception 'FORBIDDEN';
  end if;

  if auth.role() <> 'service_role'
     and not (
       public.user_has_permission('routes.update_status')
       or public.user_has_permission('sales.manage')
     ) then
    raise exception 'FORBIDDEN';
  end if;

  weekday_key := (array['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'])[target_weekday + 1];

  insert into public.logistics_weekday_defaults (
    organization_id, weekday, start_time, estimated_end_time,
    max_stops, max_boxes, updated_at
  ) values (
    target_org_id, target_weekday, target_start_time, target_estimated_end_time,
    target_max_stops, target_max_boxes, now()
  )
  on conflict on constraint logistics_weekday_defaults_pkey do update set
    start_time = excluded.start_time,
    estimated_end_time = excluded.estimated_end_time,
    max_stops = excluded.max_stops,
    max_boxes = excluded.max_boxes,
    updated_at = now();

  select array_agg(day order by array_position(array['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'], day))
  into normalized_days
  from (
    select distinct day
    from unnest(
      coalesce((select delivery_days from public.organization_route_settings where organization_id = target_org_id), '{}'::text[])
      || coalesce((select pickup_days from public.organization_route_settings where organization_id = target_org_id), '{}'::text[])
      || array[weekday_key]
    ) as day
    where day = any(array['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'])
  ) normalized;

  normalized_days := coalesce(normalized_days, array[weekday_key]);

  insert into public.organization_route_settings (
    organization_id, delivery_days, pickup_days, linked_route_schedules, updated_at
  ) values (
    target_org_id, normalized_days, normalized_days, true, now()
  )
  on conflict (organization_id) do update set
    delivery_days = excluded.delivery_days,
    pickup_days = excluded.pickup_days,
    linked_route_schedules = true,
    updated_at = now();

  return query
  select normalized_days, defaults.weekday, defaults.start_time,
    defaults.estimated_end_time, defaults.max_stops, defaults.max_boxes
  from public.logistics_weekday_defaults defaults
  where defaults.organization_id = target_org_id
    and defaults.weekday = target_weekday;
end;
$$;

revoke all on function public.activate_logistics_route_weekday(uuid, smallint, time, time, integer, integer)
  from public;
grant execute on function public.activate_logistics_route_weekday(uuid, smallint, time, time, integer, integer)
  to authenticated, service_role;

comment on function public.activate_logistics_route_weekday(uuid, smallint, time, time, integer, integer) is
  'Activa un día de ruta con horario y capacidad; sin cierre de reservas del día anterior.';
