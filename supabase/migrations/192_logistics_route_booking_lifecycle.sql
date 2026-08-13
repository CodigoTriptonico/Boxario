-- Separate weekly route availability from real operational routes.
-- Seller selections remain bookings until Logistics creates the operational run.

alter table public.customer_route_assignment_requests
  alter column route_template_id drop not null,
  add column if not exists route_date date,
  add column if not exists route_weekday smallint,
  add column if not exists route_name text not null default '',
  add column if not exists route_id uuid references public.logistics_routes (id) on delete set null;

update public.customer_route_assignment_requests request
set
  route_date = coalesce(request.route_date, request.scheduled_at::date),
  route_weekday = coalesce(
    request.route_weekday,
    template.weekday,
    extract(isodow from request.scheduled_at)::integer - 1
  ),
  route_name = coalesce(
    nullif(btrim(request.route_name), ''),
    nullif(btrim(template.name), ''),
    case coalesce(template.weekday, extract(isodow from request.scheduled_at)::integer - 1)
      when 0 then 'Ruta del lunes'
      when 1 then 'Ruta del martes'
      when 2 then 'Ruta del miercoles'
      when 3 then 'Ruta del jueves'
      when 4 then 'Ruta del viernes'
      when 5 then 'Ruta del sabado'
      when 6 then 'Ruta del domingo'
      else 'Ruta general'
    end
  )
from public.logistics_route_templates template
where template.id = request.route_template_id;

update public.customer_route_assignment_requests request
set
  route_date = coalesce(request.route_date, request.scheduled_at::date),
  route_weekday = coalesce(
    request.route_weekday,
    extract(isodow from request.scheduled_at)::integer - 1
  ),
  route_name = coalesce(
    nullif(btrim(request.route_name), ''),
    case extract(isodow from request.scheduled_at)::integer - 1
      when 0 then 'Ruta del lunes'
      when 1 then 'Ruta del martes'
      when 2 then 'Ruta del miercoles'
      when 3 then 'Ruta del jueves'
      when 4 then 'Ruta del viernes'
      when 5 then 'Ruta del sabado'
      when 6 then 'Ruta del domingo'
      else 'Ruta general'
    end
  )
where request.route_date is null
   or request.route_weekday is null
   or btrim(request.route_name) = '';

alter table public.customer_route_assignment_requests
  alter column route_date set not null,
  alter column route_weekday set not null;

alter table public.customer_route_assignment_requests
  drop constraint if exists customer_route_assignment_requests_route_weekday_check;

alter table public.customer_route_assignment_requests
  add constraint customer_route_assignment_requests_route_weekday_check
  check (route_weekday between 0 and 6);

create index if not exists customer_route_assignment_requests_booking_group_idx
  on public.customer_route_assignment_requests (
    organization_id,
    status,
    route_date,
    route_template_id,
    route_weekday,
    created_at
  );

create index if not exists customer_route_assignment_requests_route_idx
  on public.customer_route_assignment_requests (route_id)
  where route_id is not null;

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
  pending_count integer;
  replay_route_count integer;
  replay_route_id uuid;
  booking_date date;
  booking_weekday smallint;
  booking_template_id uuid;
  booking_name text;
  booking_zone text := '';
  route_row public.logistics_routes;
  existing_stop_count integer := 0;
  requested_stop_count integer := 0;
  total_box_count integer := 0;
  max_stops_limit integer;
  max_boxes_limit integer;
  covered_postal_codes text[] := '{}'::text[];
  next_stop_order integer := 0;
begin
  if auth.uid() is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if caller_org is null or not public.user_has_permission('routes.update_status') then
    raise exception 'FORBIDDEN';
  end if;

  if p_request_ids is null or cardinality(p_request_ids) = 0 then
    raise exception 'BOOKINGS_REQUIRED';
  end if;

  if cardinality(p_request_ids) <> (
    select count(distinct request_id)
    from unnest(p_request_ids) request_id
  ) then
    raise exception 'BOOKINGS_DUPLICATED';
  end if;

  perform 1
  from public.customer_route_assignment_requests request
  where request.id = any(p_request_ids)
    and request.organization_id = caller_org
  for update;

  select
    count(*),
    count(*) filter (where request.status = 'pending'),
    count(distinct request.route_id) filter (where request.route_id is not null)
  into selected_count, pending_count, replay_route_count
  from public.customer_route_assignment_requests request
  where request.id = any(p_request_ids)
    and request.organization_id = caller_org;

  if replay_route_count = 1 then
    select request.route_id into replay_route_id
    from public.customer_route_assignment_requests request
    where request.id = any(p_request_ids)
      and request.organization_id = caller_org
      and request.route_id is not null
    limit 1;
  end if;

  if selected_count <> cardinality(p_request_ids) then
    raise exception 'BOOKING_NOT_FOUND';
  end if;

  if pending_count = 0
     and replay_route_count = 1
     and replay_route_id is not null
     and not exists (
       select 1
       from public.customer_route_assignment_requests request
       where request.id = any(p_request_ids)
         and request.organization_id = caller_org
         and (request.status <> 'approved' or request.route_id <> replay_route_id)
     ) then
    return replay_route_id;
  end if;

  if pending_count <> selected_count then
    raise exception 'BOOKING_ALREADY_REVIEWED';
  end if;

  if (
    select count(distinct (
      request.route_date::text || '|' ||
      coalesce(request.route_template_id::text, 'day:' || request.route_weekday::text)
    ))
    from public.customer_route_assignment_requests request
    where request.id = any(p_request_ids)
      and request.organization_id = caller_org
  ) <> 1 then
    raise exception 'BOOKINGS_MUST_SHARE_ROUTE';
  end if;

  select
    request.route_date,
    request.route_weekday,
    request.route_template_id,
    request.route_name
  into booking_date, booking_weekday, booking_template_id, booking_name
  from public.customer_route_assignment_requests request
  where request.id = any(p_request_ids)
    and request.organization_id = caller_org
  order by request.created_at, request.id
  limit 1;

  if exists (
    select 1
    from public.customer_route_assignment_requests request
    join public.shipment_logistics_tasks task on task.id = request.task_id
    where request.id = any(p_request_ids)
      and request.organization_id = caller_org
      and (
        task.organization_id <> caller_org
        or task.shipment_id <> request.shipment_id
        or task.status in ('completed', 'cancelled')
      )
  ) then
    raise exception 'BOOKING_TASK_NOT_AVAILABLE';
  end if;

  if exists (
    select 1
    from public.customer_route_assignment_requests request
    join public.logistics_route_stops stop
      on stop.task_id = request.task_id
     and stop.released_at is null
    where request.id = any(p_request_ids)
      and request.organization_id = caller_org
  ) then
    raise exception 'BOOKING_TASK_ALREADY_ROUTED';
  end if;

  if booking_template_id is not null then
    select
      coalesce(nullif(btrim(template.name), ''), booking_name),
      coalesce(template.zone_key, ''),
      template.max_stops,
      template.max_boxes,
      coalesce(template.covered_postal_codes, '{}'::text[])
    into booking_name, booking_zone, max_stops_limit, max_boxes_limit, covered_postal_codes
    from public.logistics_route_templates template
    where template.id = booking_template_id
      and template.organization_id = caller_org
      and template.weekday = booking_weekday;

    if not found then
      raise exception 'ROUTE_TEMPLATE_NOT_FOUND';
    end if;
  else
    select defaults.max_stops, defaults.max_boxes
    into max_stops_limit, max_boxes_limit
    from public.logistics_weekday_defaults defaults
    where defaults.organization_id = caller_org
      and defaults.weekday = booking_weekday;
  end if;

  if booking_template_id is not null then
    select * into route_row
    from public.logistics_routes route
    where route.organization_id = caller_org
      and route.route_template_id = booking_template_id
      and route.route_date = booking_date
      and route.status <> 'cancelled'
    order by route.created_at
    limit 1
    for update;
  else
    select * into route_row
    from public.logistics_routes route
    where route.organization_id = caller_org
      and route.route_template_id is null
      and route.route_date = booking_date
      and route.name = booking_name
      and route.status <> 'cancelled'
    order by route.created_at
    limit 1
    for update;
  end if;

  if route_row.id is not null and route_row.status <> 'draft' then
    raise exception 'ROUTE_ALREADY_CLOSED';
  end if;

  if route_row.id is null then
    insert into public.logistics_routes (
      organization_id,
      route_template_id,
      route_date,
      name,
      status,
      assigned_to,
      zone_key,
      created_by
    ) values (
      caller_org,
      booking_template_id,
      booking_date,
      booking_name,
      'draft',
      null,
      booking_zone,
      auth.uid()
    )
    returning * into route_row;
  end if;

  select count(*)::integer, coalesce(max(stop.stop_order), 0)
  into existing_stop_count, next_stop_order
  from public.logistics_route_stops stop
  where stop.route_id = route_row.id
    and stop.organization_id = caller_org
    and stop.released_at is null;

  requested_stop_count := selected_count;
  if max_stops_limit is not null
     and existing_stop_count + requested_stop_count > max_stops_limit then
    raise exception 'ROUTE_MAX_STOPS_EXCEEDED';
  end if;

  if cardinality(covered_postal_codes) > 0 and exists (
    select 1
    from public.customer_route_assignment_requests request
    join public.customers customer on customer.id = request.customer_id
    where request.id = any(p_request_ids)
      and request.organization_id = caller_org
      and (
        nullif(upper(btrim(coalesce(customer.postal_code, ''))), '') is null
        or not (upper(btrim(customer.postal_code)) = any(covered_postal_codes))
      )
  ) then
    raise exception 'ROUTE_POSTAL_CODE_NOT_COVERED';
  end if;

  if max_boxes_limit is not null then
    select count(*)::integer
    into total_box_count
    from public.shipment_packages package
    where package.organization_id = caller_org
      and package.shipment_id in (
        select task.shipment_id
        from public.logistics_route_stops stop
        join public.shipment_logistics_tasks task on task.id = stop.task_id
        where stop.route_id = route_row.id
          and stop.organization_id = caller_org
          and stop.released_at is null
        union
        select request.shipment_id
        from public.customer_route_assignment_requests request
        where request.id = any(p_request_ids)
          and request.organization_id = caller_org
      );

    if total_box_count > max_boxes_limit then
      raise exception 'ROUTE_MAX_BOXES_EXCEEDED';
    end if;
  end if;

  insert into public.logistics_route_stops (
    organization_id,
    route_id,
    task_id,
    stop_order,
    address_snapshot,
    lat,
    lng,
    postal_code,
    city
  )
  select
    caller_org,
    route_row.id,
    request.task_id,
    next_stop_order + row_number() over (order by request.scheduled_at, request.created_at, request.id),
    jsonb_build_object(
      'source', 'customer',
      'name', btrim(concat_ws(' ', customer.first_name, customer.last_name)),
      'phone', coalesce(customer.phones[1], ''),
      'street', coalesce(customer.street, ''),
      'houseNumber', coalesce(customer.house_number, ''),
      'addressReference', coalesce(customer.address_reference, ''),
      'neighborhood', coalesce(customer.neighborhood, ''),
      'city', coalesce(customer.city, ''),
      'state', coalesce(customer.state, ''),
      'postalCode', coalesce(customer.postal_code, ''),
      'country', coalesce(customer.country, 'USA'),
      'formattedAddress', coalesce(
        nullif(btrim(customer.formatted_address), ''),
        concat_ws(', ',
          nullif(btrim(concat_ws(' ', customer.street, customer.house_number)), ''),
          nullif(btrim(customer.neighborhood), ''),
          nullif(btrim(concat_ws(' ', customer.city, customer.state, customer.postal_code)), ''),
          nullif(btrim(customer.country), '')
        )
      ),
      'placeId', coalesce(customer.place_id, ''),
      'lat', customer.lat,
      'lng', customer.lng
    ),
    customer.lat,
    customer.lng,
    coalesce(customer.postal_code, ''),
    coalesce(customer.city, '')
  from public.customer_route_assignment_requests request
  join public.customers customer on customer.id = request.customer_id
  where request.id = any(p_request_ids)
    and request.organization_id = caller_org
  order by request.scheduled_at, request.created_at, request.id;

  update public.shipment_logistics_tasks task
  set
    scheduled_at = coalesce(task.scheduled_at, request.scheduled_at),
    requested_schedule_at = coalesce(task.requested_schedule_at, request.scheduled_at),
    window_start_at = coalesce(task.window_start_at, request.scheduled_at),
    schedule_kind = coalesce(task.schedule_kind, 'exact'),
    schedule_confirmation_status = 'confirmed',
    schedule_confirmed_at = now(),
    schedule_confirmed_by = auth.uid(),
    status = case when task.status = 'pending' then 'scheduled' else task.status end,
    updated_at = now()
  from public.customer_route_assignment_requests request
  where request.id = any(p_request_ids)
    and request.organization_id = caller_org
    and task.id = request.task_id
    and task.organization_id = caller_org;

  update public.customer_route_assignment_requests request
  set
    status = 'approved',
    route_id = route_row.id,
    driver_id = null,
    reviewed_by = auth.uid(),
    reviewed_at = now(),
    review_note = 'Incluida en ruta operativa',
    updated_at = now()
  where request.id = any(p_request_ids)
    and request.organization_id = caller_org
    and request.status = 'pending';

  return route_row.id;
end;
$$;

revoke all on function public.create_logistics_route_from_bookings(uuid[], uuid)
  from public, anon, authenticated;
grant execute on function public.create_logistics_route_from_bookings(uuid[], uuid)
  to authenticated;

comment on function public.create_logistics_route_from_bookings(uuid[], uuid) is
  'Creates or fills one open operational route from seller bookings; replay returns the same route.';

-- `planned` now means the route is closed for normal stop changes. Driver and
-- vehicle assignment intentionally happen after this transition.
create or replace function public.publish_logistics_route(target_route_id uuid)
returns public.logistics_routes
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  route_row public.logistics_routes;
  stop_count integer;
  stops_without_geo integer;
  tasks_without_date integer;
  tasks_mismatched_date integer;
begin
  if auth.uid() is null
     or not public.user_has_permission('routes.update_status') then
    raise exception 'FORBIDDEN';
  end if;

  select * into route_row
  from public.logistics_routes
  where id = target_route_id
    and organization_id = public.current_organization_id()
  for update;

  if route_row.id is null then
    raise exception 'ROUTE_NOT_FOUND';
  end if;
  if route_row.status <> 'draft' then
    raise exception 'ROUTE_NOT_DRAFT';
  end if;

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

  if stop_count < 1 then
    raise exception 'ROUTE_WITHOUT_STOPS';
  end if;
  if stops_without_geo > 0 then
    raise exception 'ROUTE_STOPS_WITHOUT_GEO';
  end if;

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
    and stop.released_at is null;

  if tasks_without_date > 0 then
    raise exception 'ROUTE_TASKS_WITHOUT_CONFIRMED_DATE';
  end if;
  if tasks_mismatched_date > 0 then
    raise exception 'ROUTE_TASK_DATE_MISMATCH';
  end if;

  update public.logistics_routes
  set
    status = 'planned',
    published_at = now(),
    published_by = auth.uid(),
    updated_at = now()
  where id = route_row.id
  returning * into route_row;

  if route_row.assigned_to is not null then
    perform public.notify_logistics_route_change(
      route_row.id,
      route_row.assigned_to,
      'route_published',
      'Ruta cerrada y asignada: ' || route_row.name,
      null,
      'route_closed:' || route_row.id::text || ':' || coalesce(route_row.published_at::text, ''),
      auth.uid(),
      coalesce((select full_name from public.profiles where id = auth.uid()), '')
    );
  end if;

  return route_row;
end;
$$;

revoke all on function public.publish_logistics_route(uuid)
  from public, anon, authenticated;
grant execute on function public.publish_logistics_route(uuid)
  to authenticated;

comment on function public.publish_logistics_route(uuid) is
  'Closes a draft route. Driver and vehicle are assigned only after closure.';

create or replace function public.restore_route_bookings_after_cancel()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
begin
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    update public.customer_route_assignment_requests request
    set
      status = 'pending',
      route_id = null,
      driver_id = null,
      reviewed_by = null,
      reviewed_at = null,
      review_note = '',
      updated_at = now()
    where request.organization_id = new.organization_id
      and request.route_id = new.id
      and request.status = 'approved';
  end if;

  return new;
end;
$$;

drop trigger if exists logistics_route_restore_bookings_on_cancel
  on public.logistics_routes;
create trigger logistics_route_restore_bookings_on_cancel
after update of status on public.logistics_routes
for each row execute function public.restore_route_bookings_after_cancel();
