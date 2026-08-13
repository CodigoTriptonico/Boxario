-- P0 agency: assign must not create a second visit when the request is already
-- assigned. Stable client keys remain required; this guards status regardless of
-- a fresh idempotency_key (randomUUID defeat).

create or replace function public.assign_agency_request_to_route(
  target_request_id uuid,
  target_route_id uuid,
  scheduled_for_value timestamptz,
  idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  tenant uuid := public.current_tenant_id();
  membership uuid := public.current_membership_id();
  request_row public.agency_service_requests;
  route_row public.logistics_routes;
  visit_id uuid;
  operation public.idempotency_operations;
  safe_key text := nullif(btrim(coalesce(idempotency_key, '')), '');
begin
  if tenant is null or membership is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if safe_key is null then
    raise exception 'IDEMPOTENCY_KEY_REQUIRED';
  end if;

  select * into request_row
  from public.agency_service_requests
  where id = target_request_id
    and tenant_id = tenant
  for update;

  select * into route_row
  from public.logistics_routes
  where id = target_route_id
    and organization_id = public.current_business_organization_id()
    and status not in ('cancelled', 'completed');

  if request_row.id is null
     or route_row.id is null
     or not public.current_membership_has_permission(
       'agency.requests.assign',
       tenant,
       route_row.organization_id
     ) then
    raise exception 'FORBIDDEN';
  end if;

  -- Already assigned (or further): return the existing visit; never duplicate stops.
  if request_row.status in (
    'assigned', 'in_route', 'completed', 'partially_completed', 'cancelled'
  ) then
    select visit.id into visit_id
    from public.agency_visits visit
    join public.agency_visit_lines visit_line on visit_line.visit_id = visit.id
    join public.agency_service_request_lines request_line
      on request_line.id = visit_line.request_line_id
    where request_line.request_id = request_row.id
      and visit.tenant_id = tenant
    order by visit.created_at desc
    limit 1;

    if visit_id is not null then
      return jsonb_build_object('visitId', visit_id, 'replayed', true);
    end if;

    raise exception 'REQUEST_ALREADY_ASSIGNED';
  end if;

  if request_row.status not in (
    'submitted', 'under_review', 'confirmed', 'scheduled'
  ) then
    raise exception 'REQUEST_NOT_ASSIGNABLE';
  end if;

  insert into public.idempotency_operations(
    tenant_id, operation_type, idempotency_key, actor_membership_id, status
  )
  values(
    tenant, 'assign_agency_request_to_route', safe_key, membership, 'executing'
  )
  on conflict (tenant_id, operation_type, idempotency_key) do nothing
  returning * into operation;

  if operation.id is null then
    select * into operation
    from public.idempotency_operations
    where tenant_id = tenant
      and operation_type = 'assign_agency_request_to_route'
      and idempotency_key = safe_key;

    if operation.status = 'completed' then
      return operation.result || jsonb_build_object('replayed', true);
    end if;

    raise exception 'OPERATION_IN_PROGRESS';
  end if;

  insert into public.agency_visits(
    tenant_id, organization_id, agency_id, route_id, status, scheduled_for,
    address_snapshot, notes, created_by_membership_id
  )
  select
    tenant,
    request_row.organization_id,
    request_row.agency_id,
    route_row.id,
    'assigned',
    coalesce(scheduled_for_value, route_row.route_date::timestamptz),
    request_row.address_snapshot,
    request_row.notes,
    membership
  returning id into visit_id;

  insert into public.agency_visit_lines(
    tenant_id, organization_id, visit_id, request_line_id, requested_quantity
  )
  select
    tenant,
    request_row.organization_id,
    visit_id,
    line.id,
    line.requested_quantity
  from public.agency_service_request_lines line
  where line.request_id = request_row.id;

  insert into public.logistics_route_stops(
    organization_id, route_id, agency_visit_id, stop_order,
    address_snapshot, lat, lng, postal_code, city
  )
  values (
    route_row.organization_id,
    route_row.id,
    visit_id,
    coalesce(
      (select max(stop_order) + 1 from public.logistics_route_stops where route_id = route_row.id),
      1
    ),
    (select address_snapshot from public.agency_visits where id = visit_id),
    null,
    null,
    '',
    ''
  );

  update public.agency_service_requests
  set
    status = 'assigned',
    status_version = status_version + 1,
    updated_at = now()
  where id = request_row.id;

  update public.idempotency_operations
  set
    status = 'completed',
    result = jsonb_build_object('visitId', visit_id, 'replayed', false),
    completed_at = now()
  where id = operation.id;

  return jsonb_build_object('visitId', visit_id, 'replayed', false);
end;
$$;

revoke all on function public.assign_agency_request_to_route(uuid, uuid, timestamptz, text)
  from public, anon;
grant execute on function public.assign_agency_request_to_route(uuid, uuid, timestamptz, text)
  to authenticated;
