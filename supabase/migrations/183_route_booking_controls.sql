-- Operational booking rules, date exceptions and route capacity/coverage.

alter table public.organization_route_settings
  add column if not exists route_minimum_notice_hours integer not null default 0,
  add column if not exists route_booking_cutoff_time time;

alter table public.organization_route_settings
  drop constraint if exists organization_route_settings_notice_hours_check,
  add constraint organization_route_settings_notice_hours_check
    check (route_minimum_notice_hours between 0 and 2160);

alter table public.logistics_weekday_defaults
  add column if not exists max_stops integer,
  add column if not exists max_boxes integer;

alter table public.logistics_weekday_defaults
  drop constraint if exists logistics_weekday_defaults_capacity_check,
  add constraint logistics_weekday_defaults_capacity_check check (
    (max_stops is null or max_stops > 0)
    and (max_boxes is null or max_boxes > 0)
  );

alter table public.logistics_route_templates
  add column if not exists max_stops integer,
  add column if not exists max_boxes integer,
  add column if not exists zone_key text not null default '',
  add column if not exists covered_postal_codes text[] not null default '{}'::text[];

alter table public.logistics_route_templates
  drop constraint if exists logistics_route_templates_capacity_check,
  add constraint logistics_route_templates_capacity_check check (
    (max_stops is null or max_stops > 0)
    and (max_boxes is null or max_boxes > 0)
  );

create table if not exists public.logistics_route_date_exceptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  exception_date date not null,
  is_closed boolean not null default true,
  start_time time,
  estimated_end_time time,
  note text not null default '',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, exception_date),
  constraint logistics_route_date_exceptions_schedule_check check (
    is_closed
    or (
      start_time is not null
      and estimated_end_time is not null
      and start_time < estimated_end_time
    )
  )
);

create index if not exists logistics_route_date_exceptions_org_date_idx
  on public.logistics_route_date_exceptions (organization_id, exception_date);

alter table public.logistics_route_date_exceptions enable row level security;

drop policy if exists logistics_route_date_exceptions_select
  on public.logistics_route_date_exceptions;
create policy logistics_route_date_exceptions_select
  on public.logistics_route_date_exceptions for select
  using (
    organization_id = public.current_organization_id()
    and (
      public.user_has_permission('routes.view')
      or public.user_has_permission('sales.manage')
    )
  );

drop policy if exists logistics_route_date_exceptions_write
  on public.logistics_route_date_exceptions;
create policy logistics_route_date_exceptions_write
  on public.logistics_route_date_exceptions for all
  using (
    organization_id = public.current_organization_id()
    and (
      public.user_has_permission('routes.update_status')
      or public.user_has_permission('settings.manage')
    )
  )
  with check (
    organization_id = public.current_organization_id()
    and (
      public.user_has_permission('routes.update_status')
      or public.user_has_permission('settings.manage')
    )
  );

comment on column public.organization_route_settings.route_minimum_notice_hours is
  'Minimum elapsed hours required between booking and the requested route time.';
comment on column public.organization_route_settings.route_booking_cutoff_time is
  'Local daily cutoff after which next-day route bookings are rejected.';
comment on column public.logistics_route_templates.covered_postal_codes is
  'Optional allowlist. Empty means the subroute accepts any postal code.';

create or replace function public.save_route_booking_policy(
  p_minimum_notice_hours integer,
  p_booking_cutoff_time time
)
returns public.organization_route_settings
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_org_id uuid := public.current_organization_id();
  v_result public.organization_route_settings;
begin
  if v_org_id is null
     or not (
       public.user_has_permission('routes.update_status')
       or public.user_has_permission('settings.manage')
     ) then
    raise exception 'FORBIDDEN';
  end if;
  if coalesce(p_minimum_notice_hours, 0) not between 0 and 2160 then
    raise exception 'INVALID_ROUTE_NOTICE';
  end if;

  insert into public.organization_route_settings (
    organization_id,
    route_minimum_notice_hours,
    route_booking_cutoff_time,
    updated_at
  ) values (
    v_org_id,
    coalesce(p_minimum_notice_hours, 0),
    p_booking_cutoff_time,
    now()
  )
  on conflict (organization_id) do update set
    route_minimum_notice_hours = excluded.route_minimum_notice_hours,
    route_booking_cutoff_time = excluded.route_booking_cutoff_time,
    updated_at = now()
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.save_route_booking_policy(integer, time) from public;
grant execute on function public.save_route_booking_policy(integer, time) to authenticated;
