-- Stable geographic routes, reusable weekly schedules and exact-address approvals.
-- Existing route catalog data is demo-only and is intentionally cleared once.

create table if not exists public.logistics_route_definitions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 120),
  zone_name text not null default '',
  color text not null default '#10b981' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  coverage_mode text not null default 'day_only'
    check (coverage_mode in ('day_only', 'postal_codes')),
  is_system_general boolean not null default false,
  system_weekday smallint check (system_weekday is null or system_weekday between 0 and 6),
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references public.profiles(id) on delete set null,
  archived_by uuid references public.profiles(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists logistics_route_definitions_active_name_uidx
  on public.logistics_route_definitions (organization_id, lower(btrim(name)))
  where status = 'active';
create unique index if not exists logistics_route_definitions_system_day_uidx
  on public.logistics_route_definitions (organization_id, system_weekday)
  where is_system_general and status = 'active';
create index if not exists logistics_route_definitions_org_status_idx
  on public.logistics_route_definitions (organization_id, status, name);

create table if not exists public.logistics_route_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  route_definition_id uuid not null references public.logistics_route_definitions(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  estimated_end_time time,
  max_stops integer check (max_stops is null or max_stops > 0),
  max_boxes integer check (max_boxes is null or max_boxes > 0),
  booking_cutoff_time time,
  default_driver_id uuid references public.profiles(id) on delete set null,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (estimated_end_time is null or start_time < estimated_end_time),
  unique (route_definition_id, weekday, start_time)
);

create index if not exists logistics_route_schedules_org_day_idx
  on public.logistics_route_schedules (organization_id, weekday, is_active, start_time);

create table if not exists public.logistics_route_postal_codes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  route_definition_id uuid not null references public.logistics_route_definitions(id) on delete cascade,
  postal_code text not null check (postal_code ~ '^[0-9]{5}$'),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (route_definition_id, postal_code)
);

create index if not exists logistics_route_postal_codes_lookup_idx
  on public.logistics_route_postal_codes (organization_id, postal_code, route_definition_id);

create table if not exists public.logistics_route_address_approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  route_definition_id uuid not null references public.logistics_route_definitions(id) on delete cascade,
  address_fingerprint text not null check (char_length(address_fingerprint) = 64),
  postal_code text not null check (postal_code ~ '^[0-9]{5}$'),
  place_id text not null default '',
  lat double precision,
  lng double precision,
  approved_by uuid references public.profiles(id) on delete set null,
  approved_at timestamptz not null default now(),
  valid_from timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references public.profiles(id) on delete set null,
  revocation_reason text not null default '',
  created_at timestamptz not null default now(),
  check (revoked_at is null or revoked_at >= valid_from)
);

create unique index if not exists logistics_route_address_approvals_active_uidx
  on public.logistics_route_address_approvals
    (organization_id, customer_id, route_definition_id, address_fingerprint)
  where revoked_at is null;
create index if not exists logistics_route_address_approvals_zip_idx
  on public.logistics_route_address_approvals
    (organization_id, route_definition_id, postal_code, revoked_at);

-- Global cache: ZCTA geometry is public Census data, not tenant business data.
create table if not exists public.logistics_zcta_geometry_cache (
  postal_code text primary key check (postal_code ~ '^[0-9]{5}$'),
  census_vintage text not null,
  geojson jsonb not null,
  bounds jsonb not null default '{}'::jsonb,
  simplified_tolerance double precision,
  fetched_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.logistics_routes
  add column if not exists route_definition_id uuid
    references public.logistics_route_definitions(id) on delete set null,
  add column if not exists route_schedule_id uuid
    references public.logistics_route_schedules(id) on delete set null;

alter table public.customer_route_assignment_requests
  add column if not exists route_definition_id uuid
    references public.logistics_route_definitions(id) on delete set null,
  add column if not exists route_schedule_id uuid
    references public.logistics_route_schedules(id) on delete set null,
  add column if not exists address_fingerprint text,
  add column if not exists postal_code text,
  add column if not exists box_count integer not null default 1;

alter table public.customer_route_assignment_requests
  drop constraint if exists customer_route_assignment_requests_status_check,
  drop constraint if exists customer_route_assignment_requests_postal_check,
  drop constraint if exists customer_route_assignment_requests_address_fingerprint_check,
  drop constraint if exists customer_route_assignment_requests_box_count_check;
alter table public.customer_route_assignment_requests
  alter column status set default 'pending_approval',
  add constraint customer_route_assignment_requests_status_check
    check (status in ('pending_approval', 'template_confirmed', 'deferred', 'rejected', 'routed')) not valid,
  add constraint customer_route_assignment_requests_postal_check
    check (postal_code is null or postal_code ~ '^[0-9]{5}$'),
  add constraint customer_route_assignment_requests_address_fingerprint_check
    check (address_fingerprint is null or char_length(address_fingerprint) = 64),
  add constraint customer_route_assignment_requests_box_count_check
    check (box_count > 0);

drop index if exists public.customer_route_assignment_requests_pending_task_uidx;
create unique index customer_route_assignment_requests_active_task_uidx
  on public.customer_route_assignment_requests(task_id)
  where status in ('pending_approval', 'template_confirmed', 'routed');
create index if not exists customer_route_assignment_requests_definition_group_idx
  on public.customer_route_assignment_requests
    (organization_id, route_date, route_definition_id, route_schedule_id, status, created_at);

-- All pre-existing route data belongs to the demo catalog. Preserve business records and tasks.
update public.shipment_logistics_tasks task
set scheduled_at = null,
    requested_schedule_at = null,
    window_start_at = null,
    window_end_at = null,
    schedule_kind = null,
    schedule_confirmation_status = 'pending',
    schedule_confirmed_at = null,
    schedule_confirmed_by = null,
    assigned_to = null,
    assigned_at = null,
    status = case when task.status in ('completed', 'cancelled') then task.status else 'pending' end,
    updated_at = now()
where task.id in (
  select request.task_id from public.customer_route_assignment_requests request
  union
  select stop.task_id from public.logistics_route_stops stop
);

delete from public.customer_route_assignment_requests;
delete from public.customer_route_verifications;
delete from public.logistics_route_stops;
delete from public.logistics_routes;
delete from public.agency_default_route_assignments;
delete from public.logistics_route_templates;
delete from public.logistics_weekday_defaults;

alter table public.customer_route_assignment_requests
  validate constraint customer_route_assignment_requests_status_check;

-- Materialize the implicit general route for enabled days. It stays hidden whenever
-- that weekday has named routes, but gives exact-address approvals a stable identity.
with enabled as (
  select settings.organization_id,
         day_key,
         array_position(array['Lun','Mar','Mie','Jue','Vie','Sab','Dom'], day_key) - 1 as weekday
  from public.organization_route_settings settings
  cross join lateral unnest(
    coalesce(settings.delivery_days, '{}'::text[]) || coalesce(settings.pickup_days, '{}'::text[])
  ) day_key
  where day_key = any(array['Lun','Mar','Mie','Jue','Vie','Sab','Dom'])
), inserted as (
  insert into public.logistics_route_definitions (
    organization_id, name, zone_name, color, coverage_mode, is_system_general, system_weekday
  )
  select distinct organization_id,
    'Ruta general del ' || lower(day_key), '', '#10b981', 'day_only', true, weekday
  from enabled
  on conflict do nothing
  returning id, organization_id, system_weekday
)
insert into public.logistics_route_schedules (
  organization_id, route_definition_id, weekday, start_time, estimated_end_time
)
select organization_id, id, system_weekday, time '10:00', null
from inserted
on conflict do nothing;

alter table public.logistics_route_definitions enable row level security;
alter table public.logistics_route_schedules enable row level security;
alter table public.logistics_route_postal_codes enable row level security;
alter table public.logistics_route_address_approvals enable row level security;
alter table public.logistics_zcta_geometry_cache enable row level security;

create policy logistics_route_definitions_select on public.logistics_route_definitions for select
  using (organization_id = public.current_organization_id()
    and (public.user_has_permission('routes.view') or public.user_has_permission('sales.manage')));
create policy logistics_route_definitions_write on public.logistics_route_definitions for all
  using (organization_id = public.current_organization_id()
    and public.user_has_permission('routes.update_status'))
  with check (organization_id = public.current_organization_id()
    and public.user_has_permission('routes.update_status'));

create policy logistics_route_schedules_select on public.logistics_route_schedules for select
  using (organization_id = public.current_organization_id()
    and (public.user_has_permission('routes.view') or public.user_has_permission('sales.manage')));
create policy logistics_route_schedules_write on public.logistics_route_schedules for all
  using (organization_id = public.current_organization_id()
    and public.user_has_permission('routes.update_status'))
  with check (organization_id = public.current_organization_id()
    and public.user_has_permission('routes.update_status'));

create policy logistics_route_postal_codes_select on public.logistics_route_postal_codes for select
  using (organization_id = public.current_organization_id()
    and (public.user_has_permission('routes.view') or public.user_has_permission('sales.manage')));
create policy logistics_route_postal_codes_write on public.logistics_route_postal_codes for all
  using (organization_id = public.current_organization_id()
    and public.user_has_permission('routes.update_status'))
  with check (organization_id = public.current_organization_id()
    and public.user_has_permission('routes.update_status'));

create policy logistics_route_address_approvals_select on public.logistics_route_address_approvals for select
  using (organization_id = public.current_organization_id()
    and (public.user_has_permission('routes.view') or public.user_has_permission('sales.manage')));
create policy logistics_route_address_approvals_write on public.logistics_route_address_approvals for all
  using (organization_id = public.current_organization_id()
    and public.user_has_permission('routes.update_status'))
  with check (organization_id = public.current_organization_id()
    and public.user_has_permission('routes.update_status'));

create policy logistics_zcta_geometry_cache_select on public.logistics_zcta_geometry_cache
  for select to authenticated using (true);
create policy logistics_zcta_geometry_cache_write on public.logistics_zcta_geometry_cache
  for all to authenticated
  using (public.user_has_permission('routes.update_status'))
  with check (public.user_has_permission('routes.update_status'));

-- Removing a ZIP revokes remembered addresses and returns unresolved templates to Tareas.
create or replace function public.handle_route_postal_code_removed()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  update public.logistics_route_address_approvals approval
  set revoked_at = now(),
      revoked_by = auth.uid(),
      revocation_reason = 'Codigo postal retirado de la cobertura'
  where approval.organization_id = old.organization_id
    and approval.route_definition_id = old.route_definition_id
    and approval.postal_code = old.postal_code
    and approval.revoked_at is null;

  update public.shipment_logistics_tasks task
  set scheduled_at = null,
      requested_schedule_at = null,
      window_start_at = null,
      window_end_at = null,
      schedule_kind = null,
      schedule_confirmation_status = 'pending',
      assigned_to = null,
      assigned_at = null,
      status = case when task.status in ('completed', 'cancelled') then task.status else 'pending' end,
      updated_at = now()
  from public.customer_route_assignment_requests request
  where request.organization_id = old.organization_id
    and request.route_definition_id = old.route_definition_id
    and request.postal_code = old.postal_code
    and request.status in ('pending_approval', 'template_confirmed')
    and request.route_id is null
    and task.id = request.task_id;

  update public.customer_route_assignment_requests request
  set status = 'deferred',
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = 'Devuelta a Tareas: el ZIP fue retirado de la ruta',
      updated_at = now()
  where request.organization_id = old.organization_id
    and request.route_definition_id = old.route_definition_id
    and request.postal_code = old.postal_code
    and request.status in ('pending_approval', 'template_confirmed')
    and request.route_id is null;
  return old;
end;
$$;

drop trigger if exists logistics_route_postal_code_removed on public.logistics_route_postal_codes;
create trigger logistics_route_postal_code_removed
  after delete on public.logistics_route_postal_codes
  for each row execute function public.handle_route_postal_code_removed();

-- Disabling a schedule returns future, not-yet-routed reservations to Tareas.
create or replace function public.handle_route_schedule_disabled()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if old.is_active and not new.is_active then
    update public.shipment_logistics_tasks task
    set scheduled_at = null,
        requested_schedule_at = null,
        window_start_at = null,
        window_end_at = null,
        schedule_kind = null,
        schedule_confirmation_status = 'pending',
        assigned_to = null,
        assigned_at = null,
        status = case when task.status in ('completed', 'cancelled') then task.status else 'pending' end,
        updated_at = now()
    from public.customer_route_assignment_requests request
    where request.organization_id = new.organization_id
      and request.route_schedule_id = new.id
      and request.route_date >= current_date
      and request.status in ('pending_approval', 'template_confirmed')
      and task.id = request.task_id;

    update public.customer_route_assignment_requests request
    set status = 'deferred', reviewed_by = auth.uid(), reviewed_at = now(),
        review_note = 'Devuelta a Tareas: el horario de la ruta fue desactivado', updated_at = now()
    where request.organization_id = new.organization_id
      and request.route_schedule_id = new.id
      and request.route_date >= current_date
      and request.status in ('pending_approval', 'template_confirmed');
  end if;
  return new;
end;
$$;

drop trigger if exists logistics_route_schedule_disabled on public.logistics_route_schedules;
create trigger logistics_route_schedule_disabled
  after update of is_active on public.logistics_route_schedules
  for each row execute function public.handle_route_schedule_disabled();

-- Atomic conversion. Pending approvals block the whole group; only confirmed
-- template entries become stops. A replay returns the previously-created route.
create or replace function public.create_logistics_route_from_bookings(
  p_request_ids uuid[],
  p_idempotency_key uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_org uuid := public.current_organization_id();
  selected_count integer;
  confirmed_count integer;
  replay_route_id uuid;
  booking_date date;
  definition_id uuid;
  schedule_id uuid;
  definition_row public.logistics_route_definitions;
  schedule_row public.logistics_route_schedules;
  route_row public.logistics_routes;
  existing_stops integer := 0;
  existing_boxes integer := 0;
  requested_boxes integer := 0;
  next_stop_order integer := 0;
begin
  if auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;
  if caller_org is null or not public.user_has_permission('routes.update_status') then
    raise exception 'FORBIDDEN';
  end if;
  if p_request_ids is null or cardinality(p_request_ids) = 0 then
    raise exception 'BOOKINGS_REQUIRED';
  end if;
  if cardinality(p_request_ids) <> (select count(distinct value) from unnest(p_request_ids) value) then
    raise exception 'BOOKINGS_DUPLICATED';
  end if;

  perform 1 from public.customer_route_assignment_requests request
  where request.organization_id = caller_org and request.id = any(p_request_ids)
  for update;

  select count(*),
         count(*) filter (where status = 'template_confirmed'),
         (array_agg(route_id) filter (where status = 'routed'))[1]
  into selected_count, confirmed_count, replay_route_id
  from public.customer_route_assignment_requests
  where organization_id = caller_org and id = any(p_request_ids);

  if selected_count <> cardinality(p_request_ids) then raise exception 'BOOKING_NOT_FOUND'; end if;
  if confirmed_count = 0 and replay_route_id is not null and not exists (
    select 1 from public.customer_route_assignment_requests
    where organization_id = caller_org and id = any(p_request_ids)
      and (status <> 'routed' or route_id <> replay_route_id)
  ) then return replay_route_id; end if;
  if exists (
    select 1 from public.customer_route_assignment_requests
    where organization_id = caller_org and id = any(p_request_ids) and status = 'pending_approval'
  ) then raise exception 'BOOKING_PENDING_APPROVAL'; end if;
  if confirmed_count <> selected_count then raise exception 'BOOKING_ALREADY_REVIEWED'; end if;

  if (select count(distinct concat_ws('|', route_date::text, route_definition_id::text, route_schedule_id::text))
      from public.customer_route_assignment_requests
      where organization_id = caller_org and id = any(p_request_ids)) <> 1 then
    raise exception 'BOOKINGS_MUST_SHARE_ROUTE';
  end if;

  select route_date, route_definition_id, route_schedule_id
  into booking_date, definition_id, schedule_id
  from public.customer_route_assignment_requests
  where organization_id = caller_org and id = any(p_request_ids)
  order by created_at, id limit 1;

  select * into definition_row from public.logistics_route_definitions
  where id = definition_id and organization_id = caller_org and status = 'active'
  for update;
  if definition_row.id is null then raise exception 'ROUTE_DEFINITION_NOT_FOUND'; end if;

  select * into schedule_row from public.logistics_route_schedules
  where id = schedule_id and organization_id = caller_org
    and route_definition_id = definition_id and is_active
  for update;
  if schedule_row.id is null then raise exception 'ROUTE_SCHEDULE_NOT_FOUND'; end if;
  if schedule_row.weekday <> extract(isodow from booking_date)::integer - 1 then
    raise exception 'ROUTE_SCHEDULE_MISMATCH';
  end if;
  if not exists (
    select 1 from public.organization_route_settings settings
    where settings.organization_id = caller_org
      and (array['Lun','Mar','Mie','Jue','Vie','Sab','Dom'])[schedule_row.weekday + 1]
          = any(coalesce(settings.delivery_days, '{}'::text[]) || coalesce(settings.pickup_days, '{}'::text[]))
  ) then raise exception 'ROUTE_DAY_DISABLED'; end if;

  if exists (
    select 1 from public.customer_route_assignment_requests request
    join public.shipment_logistics_tasks task on task.id = request.task_id
    where request.organization_id = caller_org and request.id = any(p_request_ids)
      and (task.organization_id <> caller_org or task.shipment_id <> request.shipment_id
        or task.status in ('completed', 'cancelled'))
  ) then raise exception 'BOOKING_TASK_NOT_AVAILABLE'; end if;
  if exists (
    select 1 from public.customer_route_assignment_requests request
    join public.logistics_route_stops stop on stop.task_id = request.task_id and stop.released_at is null
    where request.organization_id = caller_org and request.id = any(p_request_ids)
  ) then raise exception 'BOOKING_TASK_ALREADY_ROUTED'; end if;

  if definition_row.coverage_mode = 'postal_codes' and exists (
    select 1 from public.customer_route_assignment_requests request
    where request.organization_id = caller_org and request.id = any(p_request_ids)
      and not exists (
        select 1 from public.logistics_route_postal_codes zip
        where zip.route_definition_id = definition_id
          and zip.organization_id = caller_org and zip.postal_code = request.postal_code
      )
  ) then raise exception 'ROUTE_POSTAL_CODE_NOT_COVERED'; end if;

  select * into route_row from public.logistics_routes route
  where route.organization_id = caller_org and route.route_date = booking_date
    and route.route_definition_id = definition_id and route.route_schedule_id = schedule_id
    and route.status <> 'cancelled'
  order by route.created_at limit 1 for update;
  if route_row.id is not null and route_row.status <> 'draft' then raise exception 'ROUTE_ALREADY_CLOSED'; end if;
  if route_row.id is null then
    insert into public.logistics_routes (
      organization_id, route_date, name, status, route_definition_id, route_schedule_id,
      assigned_to, zone_key, created_by
    ) values (
      caller_org, booking_date, definition_row.name, 'draft', definition_id, schedule_id,
      null, definition_row.zone_name, auth.uid()
    ) returning * into route_row;
  end if;

  select count(*), coalesce(max(stop_order), 0)
  into existing_stops, next_stop_order
  from public.logistics_route_stops
  where organization_id = caller_org and route_id = route_row.id and released_at is null;
  select coalesce(sum(box_count), 0) into requested_boxes
  from public.customer_route_assignment_requests
  where organization_id = caller_org and id = any(p_request_ids);
  select coalesce(sum(request.box_count), 0) into existing_boxes
  from public.customer_route_assignment_requests request
  where request.organization_id = caller_org and request.route_id = route_row.id and request.status = 'routed';
  if schedule_row.max_stops is not null and existing_stops + selected_count > schedule_row.max_stops then
    raise exception 'ROUTE_MAX_STOPS_EXCEEDED';
  end if;
  if schedule_row.max_boxes is not null and existing_boxes + requested_boxes > schedule_row.max_boxes then
    raise exception 'ROUTE_MAX_BOXES_EXCEEDED';
  end if;

  insert into public.logistics_route_stops (
    organization_id, route_id, task_id, stop_order, address_snapshot, lat, lng, postal_code, city
  )
  select caller_org, route_row.id, request.task_id,
    next_stop_order + row_number() over (order by request.scheduled_at, request.created_at, request.id),
    jsonb_build_object(
      'source','customer','name',btrim(concat_ws(' ',customer.first_name,customer.last_name)),
      'phone',coalesce(customer.phones[1],''),'street',coalesce(customer.street,''),
      'houseNumber',coalesce(customer.house_number,''),'addressReference',coalesce(customer.address_reference,''),
      'neighborhood',coalesce(customer.neighborhood,''),'city',coalesce(customer.city,''),
      'state',coalesce(customer.state,''),'postalCode',coalesce(customer.postal_code,''),
      'country',coalesce(customer.country,'USA'),'formattedAddress',coalesce(customer.formatted_address,''),
      'placeId',coalesce(customer.place_id,''),'lat',customer.lat,'lng',customer.lng
    ), customer.lat, customer.lng, request.postal_code, coalesce(customer.city,'')
  from public.customer_route_assignment_requests request
  join public.customers customer on customer.id = request.customer_id
  where request.organization_id = caller_org and request.id = any(p_request_ids)
  order by request.scheduled_at, request.created_at, request.id;

  update public.shipment_logistics_tasks task
  set scheduled_at = coalesce(task.scheduled_at, request.scheduled_at),
      requested_schedule_at = coalesce(task.requested_schedule_at, request.scheduled_at),
      window_start_at = coalesce(task.window_start_at, request.scheduled_at),
      schedule_kind = coalesce(task.schedule_kind, 'exact'),
      schedule_confirmation_status = 'confirmed', schedule_confirmed_at = now(),
      schedule_confirmed_by = auth.uid(),
      status = case when task.status = 'pending' then 'scheduled' else task.status end,
      updated_at = now()
  from public.customer_route_assignment_requests request
  where request.organization_id = caller_org and request.id = any(p_request_ids)
    and task.id = request.task_id and task.organization_id = caller_org;

  update public.customer_route_assignment_requests
  set status = 'routed', route_id = route_row.id, driver_id = null,
      reviewed_by = auth.uid(), reviewed_at = now(), review_note = 'Incluida en ruta operativa', updated_at = now()
  where organization_id = caller_org and id = any(p_request_ids) and status = 'template_confirmed';
  return route_row.id;
end;
$$;

revoke all on function public.create_logistics_route_from_bookings(uuid[], uuid)
  from public, anon, authenticated;
grant execute on function public.create_logistics_route_from_bookings(uuid[], uuid) to authenticated;

create or replace function public.restore_route_bookings_after_cancel()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    update public.customer_route_assignment_requests request
    set status = 'template_confirmed', route_id = null, driver_id = null,
        reviewed_by = auth.uid(), reviewed_at = now(),
        review_note = 'Devuelta a plantilla por cancelacion del recorrido', updated_at = now()
    where request.organization_id = new.organization_id
      and request.route_id = new.id and request.status = 'routed';
  end if;
  return new;
end;
$$;

comment on table public.logistics_route_definitions is
  'Stable geographic route identity, independent from dates and weekdays.';
comment on table public.logistics_route_schedules is
  'Weekly operating windows and capacity for a stable route.';
comment on table public.logistics_route_address_approvals is
  'Exact normalized-address membership approvals; changing an address changes its fingerprint.';
comment on column public.customer_route_assignment_requests.status is
  'pending_approval, template_confirmed, deferred, rejected, or routed. Only routed has an operational route.';
