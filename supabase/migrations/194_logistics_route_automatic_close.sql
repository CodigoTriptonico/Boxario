-- Close ready draft routes at their effective previous-day cutoff. Logistics
-- can still close them manually before that time. The same cutoff blocks late
-- route creation and stop insertion at the database boundary.

create or replace function public.effective_logistics_route_booking_cutoff(
  target_organization_id uuid,
  target_route_template_id uuid,
  target_route_date date
)
returns time
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select case
    when target_route_template_id is not null then coalesce(
      (
        select template.booking_cutoff_time
        from public.logistics_route_templates template
        where template.id = target_route_template_id
          and template.organization_id = target_organization_id
      ),
      (
        select settings.route_booking_cutoff_time
        from public.organization_route_settings settings
        where settings.organization_id = target_organization_id
      )
    )
    else coalesce(
      (
        select defaults.booking_cutoff_time
        from public.logistics_weekday_defaults defaults
        where defaults.organization_id = target_organization_id
          and defaults.weekday = extract(isodow from target_route_date)::integer - 1
      ),
      (
        select settings.route_booking_cutoff_time
        from public.organization_route_settings settings
        where settings.organization_id = target_organization_id
      )
    )
  end;
$$;

create or replace function public.logistics_route_booking_deadline(
  target_route_date date,
  target_cutoff_time time
)
returns timestamptz
language sql
immutable
set search_path = pg_catalog
as $$
  select ((target_route_date - 1) + target_cutoff_time)
    at time zone 'America/Los_Angeles';
$$;

revoke all on function public.effective_logistics_route_booking_cutoff(uuid, uuid, date)
  from public, anon, authenticated;
revoke all on function public.logistics_route_booking_deadline(date, time)
  from public, anon, authenticated;

create or replace function public.guard_logistics_route_cutoff()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  cutoff_time time;
begin
  if new.status <> 'draft' then
    return new;
  end if;

  cutoff_time := public.effective_logistics_route_booking_cutoff(
    new.organization_id,
    new.route_template_id,
    new.route_date
  );

  if cutoff_time is not null
     and now() >= public.logistics_route_booking_deadline(new.route_date, cutoff_time) then
    raise exception 'ROUTE_ALREADY_CLOSED';
  end if;

  return new;
end;
$$;

drop trigger if exists logistics_route_cutoff_guard on public.logistics_routes;
create trigger logistics_route_cutoff_guard
before insert or update of route_date, route_template_id, status
on public.logistics_routes
for each row execute function public.guard_logistics_route_cutoff();

create or replace function public.guard_logistics_route_stop_cutoff()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  route_row public.logistics_routes;
  cutoff_time time;
begin
  select * into route_row
  from public.logistics_routes route
  where route.id = new.route_id
  for update;

  if route_row.id is null or route_row.status <> 'draft' then
    return new;
  end if;

  cutoff_time := public.effective_logistics_route_booking_cutoff(
    route_row.organization_id,
    route_row.route_template_id,
    route_row.route_date
  );

  if cutoff_time is not null
     and now() >= public.logistics_route_booking_deadline(route_row.route_date, cutoff_time) then
    raise exception 'ROUTE_ALREADY_CLOSED';
  end if;

  return new;
end;
$$;

drop trigger if exists logistics_route_stop_cutoff_guard
  on public.logistics_route_stops;
create trigger logistics_route_stop_cutoff_guard
before insert or update of route_id
on public.logistics_route_stops
for each row execute function public.guard_logistics_route_stop_cutoff();

create or replace function public.auto_close_due_logistics_routes()
returns integer
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  route_row record;
  stop_count integer;
  stops_without_geo integer;
  tasks_without_date integer;
  tasks_mismatched_date integer;
  closed_count integer := 0;
begin
  for route_row in
    select
      route.id,
      route.organization_id,
      route.route_date,
      route.name,
      cutoff.value as cutoff_time
    from public.logistics_routes route
    cross join lateral (
      select public.effective_logistics_route_booking_cutoff(
        route.organization_id,
        route.route_template_id,
        route.route_date
      ) as value
    ) cutoff
    where route.status = 'draft'
      and cutoff.value is not null
      and now() >= public.logistics_route_booking_deadline(route.route_date, cutoff.value)
    order by route.route_date, route.created_at, route.id
    for update of route skip locked
  loop
    select
      count(*)::integer,
      count(*) filter (
        where stop.lat is null or stop.lng is null
           or not (stop.lat between -90 and 90)
           or not (stop.lng between -180 and 180)
      )::integer
    into stop_count, stops_without_geo
    from public.logistics_route_stops stop
    where stop.route_id = route_row.id
      and stop.released_at is null
      and stop.organization_id = route_row.organization_id;

    select
      count(*) filter (
        where task.schedule_confirmation_status is distinct from 'confirmed'
           or (task.scheduled_at is null and task.window_start_at is null)
      )::integer,
      count(*) filter (
        where coalesce(task.scheduled_at, task.window_start_at)::date
          is distinct from route_row.route_date
      )::integer
    into tasks_without_date, tasks_mismatched_date
    from public.logistics_route_stops stop
    join public.shipment_logistics_tasks task on task.id = stop.task_id
    where stop.route_id = route_row.id
      and stop.released_at is null
      and stop.organization_id = route_row.organization_id;

    if stop_count > 0
       and stops_without_geo = 0
       and tasks_without_date = 0
       and tasks_mismatched_date = 0 then
      update public.logistics_routes route
      set
        status = 'planned',
        published_at = now(),
        published_by = null,
        updated_at = now()
      where route.id = route_row.id
        and route.status = 'draft';

      if found then
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
        ) values (
          route_row.organization_id,
          null,
          'Sistema',
          'logistics.route_auto_closed',
          'logistics_route',
          route_row.id,
          'Ruta cerrada automaticamente: ' || route_row.name,
          route_row.route_date::text || ' · ' || stop_count::text || ' paradas',
          jsonb_build_object(
            'routeId', route_row.id,
            'routeDate', route_row.route_date,
            'bookingCutoffTime', route_row.cutoff_time,
            'automatic', true
          )
        );

        closed_count := closed_count + 1;
      end if;
    end if;
  end loop;

  return closed_count;
end;
$$;

revoke all on function public.auto_close_due_logistics_routes()
  from public, anon, authenticated, service_role;

create extension if not exists pg_cron with schema pg_catalog;

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

  perform cron.schedule(
    'boxario-close-due-logistics-routes',
    '* * * * *',
    'select public.auto_close_due_logistics_routes();'
  );
end;
$$;

comment on function public.auto_close_due_logistics_routes() is
  'Closes ready draft routes after their effective previous-day cutoff; invalid drafts remain visible for Logistics to correct and close manually.';
