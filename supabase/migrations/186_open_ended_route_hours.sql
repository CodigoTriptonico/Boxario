-- Route start is mandatory, while the estimated end may be open-ended.

alter table public.logistics_route_templates
  drop constraint if exists logistics_route_templates_schedule_check,
  drop constraint if exists logistics_route_templates_schedule_required;

alter table public.logistics_route_templates
  add constraint logistics_route_templates_schedule_check check (
    (start_time is null and estimated_end_time is null)
    or (
      start_time is not null
      and (estimated_end_time is null or start_time < estimated_end_time)
    )
  ),
  add constraint logistics_route_templates_schedule_required check (
    start_time is not null
    and (estimated_end_time is null or start_time < estimated_end_time)
  ) not valid;

alter table public.logistics_weekday_defaults
  drop constraint if exists logistics_weekday_defaults_schedule_check;

alter table public.logistics_weekday_defaults
  add constraint logistics_weekday_defaults_schedule_check check (
    (start_time is null and estimated_end_time is null)
    or (
      start_time is not null
      and (estimated_end_time is null or start_time < estimated_end_time)
    )
  );

create or replace function public.set_logistics_weekday_schedule(
  target_org_id uuid,
  target_weekday smallint,
  target_start_time time,
  target_estimated_end_time time
)
returns table (
  weekday smallint,
  start_time time,
  estimated_end_time time
)
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  weekday_key text;
begin
  if target_org_id is null
     or target_weekday not between 0 and 6
     or target_start_time is null
     or (
       target_estimated_end_time is not null
       and target_start_time >= target_estimated_end_time
     ) then
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
  if not exists (
    select 1
    from public.organization_route_settings settings
    where settings.organization_id = target_org_id
      and weekday_key = any(
        coalesce(settings.delivery_days, '{}'::text[])
        || coalesce(settings.pickup_days, '{}'::text[])
      )
  ) then
    raise exception 'WEEKDAY_NOT_ENABLED';
  end if;

  insert into public.logistics_weekday_defaults (
    organization_id,
    weekday,
    start_time,
    estimated_end_time,
    updated_at
  ) values (
    target_org_id,
    target_weekday,
    target_start_time,
    target_estimated_end_time,
    now()
  )
  on conflict on constraint logistics_weekday_defaults_pkey do update set
    start_time = excluded.start_time,
    estimated_end_time = excluded.estimated_end_time,
    updated_at = now();

  return query
  select defaults.weekday, defaults.start_time, defaults.estimated_end_time
  from public.logistics_weekday_defaults defaults
  where defaults.organization_id = target_org_id
    and defaults.weekday = target_weekday;
end;
$$;

create or replace function public.activate_logistics_route_weekday(
  target_org_id uuid,
  target_weekday smallint,
  target_start_time time,
  target_estimated_end_time time,
  target_max_stops integer,
  target_max_boxes integer,
  target_booking_cutoff_time time
)
returns table (
  enabled_days text[],
  weekday smallint,
  start_time time,
  estimated_end_time time,
  max_stops integer,
  max_boxes integer,
  booking_cutoff_time time
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
    max_stops, max_boxes, booking_cutoff_time, updated_at
  ) values (
    target_org_id, target_weekday, target_start_time, target_estimated_end_time,
    target_max_stops, target_max_boxes, target_booking_cutoff_time, now()
  )
  on conflict on constraint logistics_weekday_defaults_pkey do update set
    start_time = excluded.start_time,
    estimated_end_time = excluded.estimated_end_time,
    max_stops = excluded.max_stops,
    max_boxes = excluded.max_boxes,
    booking_cutoff_time = excluded.booking_cutoff_time,
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
    defaults.estimated_end_time, defaults.max_stops, defaults.max_boxes,
    defaults.booking_cutoff_time
  from public.logistics_weekday_defaults defaults
  where defaults.organization_id = target_org_id
    and defaults.weekday = target_weekday;
end;
$$;

create or replace function public.set_logistics_route_weekday_enabled(
  target_org_id uuid,
  target_day text,
  target_enabled boolean
)
returns text[]
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  normalized_days text[];
  target_weekday smallint;
begin
  if target_org_id is null or target_day not in ('Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom') then
    raise exception 'Dia de ruta invalido';
  end if;

  if target_org_id is distinct from public.current_organization_id()
     and auth.role() <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  if auth.role() <> 'service_role'
     and not (public.user_has_permission('routes.update_status') or public.user_has_permission('sales.manage')) then
    raise exception 'Forbidden';
  end if;

  target_weekday := array_position(array['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'], target_day) - 1;
  if target_enabled and not exists (
    select 1
    from public.logistics_weekday_defaults defaults
    where defaults.organization_id = target_org_id
      and defaults.weekday = target_weekday
      and defaults.start_time is not null
      and (
        defaults.estimated_end_time is null
        or defaults.start_time < defaults.estimated_end_time
      )
  ) then
    raise exception 'WEEKDAY_SCHEDULE_REQUIRED';
  end if;

  select array_agg(day order by array_position(array['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'], day))
  into normalized_days
  from (
    select distinct day
    from unnest(
      coalesce((select delivery_days from public.organization_route_settings where organization_id = target_org_id), '{}'::text[])
      || coalesce((select pickup_days from public.organization_route_settings where organization_id = target_org_id), '{}'::text[])
    ) as day
    where day = any(array['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'])
      and (target_enabled or day <> target_day)
    union
    select target_day where target_enabled
  ) normalized;

  normalized_days := coalesce(normalized_days, '{}'::text[]);

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

  return normalized_days;
end;
$$;

revoke all on function public.set_logistics_weekday_schedule(uuid, smallint, time, time) from public;
grant execute on function public.set_logistics_weekday_schedule(uuid, smallint, time, time) to authenticated, service_role;
revoke all on function public.activate_logistics_route_weekday(uuid, smallint, time, time, integer, integer, time) from public;
grant execute on function public.activate_logistics_route_weekday(uuid, smallint, time, time, integer, integer, time) to authenticated, service_role;
revoke all on function public.set_logistics_route_weekday_enabled(uuid, text, boolean) from public;
grant execute on function public.set_logistics_route_weekday_enabled(uuid, text, boolean) to authenticated, service_role;

