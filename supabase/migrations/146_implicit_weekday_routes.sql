-- An enabled weekday is already an implicit route.
-- Weekly route templates are reserved for named subdivisions of that day.

create table if not exists public.logistics_weekday_defaults (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  default_driver_id uuid references public.profiles (id) on delete set null,
  start_time time,
  estimated_end_time time,
  updated_at timestamptz not null default now(),
  primary key (organization_id, weekday)
);

alter table public.logistics_weekday_defaults
  add column if not exists start_time time,
  add column if not exists estimated_end_time time;

alter table public.logistics_weekday_defaults
  drop constraint if exists logistics_weekday_defaults_schedule_check;

alter table public.logistics_weekday_defaults
  add constraint logistics_weekday_defaults_schedule_check
  check (
    (start_time is null and estimated_end_time is null)
    or (
      start_time is not null
      and estimated_end_time is not null
      and start_time < estimated_end_time
    )
  );

alter table public.logistics_weekday_defaults enable row level security;

drop policy if exists logistics_weekday_defaults_select
  on public.logistics_weekday_defaults;
create policy logistics_weekday_defaults_select
  on public.logistics_weekday_defaults
  for select
  using (
    organization_id = public.current_organization_id()
    and (
      public.user_has_permission('routes.view')
      or public.user_has_permission('sales.manage')
    )
  );

drop policy if exists logistics_weekday_defaults_write
  on public.logistics_weekday_defaults;
create policy logistics_weekday_defaults_write
  on public.logistics_weekday_defaults
  for all
  using (
    organization_id = public.current_organization_id()
    and (
      public.user_has_permission('routes.update_status')
      or public.user_has_permission('sales.manage')
    )
  )
  with check (
    organization_id = public.current_organization_id()
    and (
      public.user_has_permission('routes.update_status')
      or public.user_has_permission('sales.manage')
    )
  );

-- Preserve schedules that were previously stored in hidden "Ruta del día" templates.
insert into public.logistics_weekday_defaults (
  organization_id,
  weekday,
  start_time,
  estimated_end_time,
  updated_at
)
select
  template.organization_id,
  template.weekday,
  template.start_time,
  template.estimated_end_time,
  now()
from public.logistics_route_templates template
where template.start_time is not null
  and template.estimated_end_time is not null
  and lower(btrim(template.name)) = case template.weekday
    when 0 then 'ruta del lunes'
    when 1 then 'ruta del martes'
    when 2 then 'ruta del miercoles'
    when 3 then 'ruta del jueves'
    when 4 then 'ruta del viernes'
    when 5 then 'ruta del sabado'
    when 6 then 'ruta del domingo'
  end
on conflict (organization_id, weekday) do update set
  start_time = coalesce(public.logistics_weekday_defaults.start_time, excluded.start_time),
  estimated_end_time = coalesce(
    public.logistics_weekday_defaults.estimated_end_time,
    excluded.estimated_end_time
  ),
  updated_at = now();

create or replace function public.list_logistics_weekday_schedules(
  target_org_id uuid
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
begin
  if target_org_id is null
     or (
       target_org_id is distinct from public.current_organization_id()
       and auth.role() <> 'service_role'
     ) then
    raise exception 'FORBIDDEN';
  end if;

  if auth.role() <> 'service_role'
     and not (
       public.user_has_permission('routes.view')
       or public.user_has_permission('sales.manage')
     ) then
    raise exception 'FORBIDDEN';
  end if;

  return query
  select
    defaults.weekday,
    defaults.start_time,
    defaults.estimated_end_time
  from public.logistics_weekday_defaults defaults
  where defaults.organization_id = target_org_id
  order by defaults.weekday;
end;
$$;

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
     or target_estimated_end_time is null
     or target_start_time >= target_estimated_end_time then
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
  select
    defaults.weekday,
    defaults.start_time,
    defaults.estimated_end_time
  from public.logistics_weekday_defaults defaults
  where defaults.organization_id = target_org_id
    and defaults.weekday = target_weekday;
end;
$$;

revoke all on function public.list_logistics_weekday_schedules(uuid) from public;
grant execute on function public.list_logistics_weekday_schedules(uuid)
  to authenticated, service_role;

revoke all on function public.set_logistics_weekday_schedule(uuid, smallint, time, time)
  from public;
grant execute on function public.set_logistics_weekday_schedule(uuid, smallint, time, time)
  to authenticated, service_role;
