-- AGE-001 follow-up: fix ambiguous ON CONFLICT (param vs column idempotency_key).
-- Uses unique constraint idempotency_operations_tenant_id_operation_type_idempotency_key.
-- Does not rewrite 179 history; replaces function bodies only.

create or replace function public.create_agency_service_request(
  lines jsonb,
  requested_date date,
  note text,
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
  agency_row public.agencies;
  request_id uuid;
  line jsonb;
  operation public.idempotency_operations;
  service_code_value text;
  service_kind_value text;
  customer_id_value uuid;
  first_customer_id uuid;
  address_value jsonb := '{}'::jsonb;
  request_scope_value text := 'agency_office';
  destination_code_value text;
  profile_country_code text;
  price_value jsonb;
  unit_charge_value bigint;
  product_code_value text;
  safe_key text := nullif(btrim(coalesce(idempotency_key, '')), '');
  safe_note text := left(coalesce(note, ''), 1000);
  fingerprint text;
  lines_fingerprint text;
begin
  if tenant is null or membership is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if safe_key is null
     or char_length(safe_key) < 8
     or char_length(safe_key) > 128 then
    raise exception 'IDEMPOTENCY_KEY_INVALID';
  end if;

  if jsonb_typeof(lines) <> 'array' or jsonb_array_length(lines) = 0 then
    raise exception 'SOLICITUD_INVALIDA';
  end if;

  select agency.* into agency_row
  from public.agencies agency
  where agency.tenant_id = tenant
    and agency.organization_id = public.current_business_organization_id()
    and agency.archived_at is null;

  if agency_row.id is null
     or not public.current_membership_has_permission(
       'agency.requests.create',
       tenant,
       agency_row.organization_id
     ) then
    raise exception 'FORBIDDEN';
  end if;

  select profile.country_code into profile_country_code
  from public.commercial_entity_profiles profile
  where profile.tenant_id = tenant
    and profile.matrix_organization_id = agency_row.matrix_organization_id
    and profile.entity_type = 'agency'
    and profile.entity_id = agency_row.id;

  for line in select value from jsonb_array_elements(lines) loop
    service_code_value := coalesce(line->>'serviceCode', line->>'serviceKind', '');
    if service_code_value in (
      'customer_home_delivery', 'customer_empty_box_delivery', 'customer_full_box_pickup'
    ) then
      request_scope_value := 'agency_customer';
      customer_id_value := nullif(line->>'customerId', '')::uuid;
      if customer_id_value is null
         or not exists (
           select 1
           from public.customers customer
           where customer.id = customer_id_value
             and customer.organization_id = agency_row.organization_id
         ) then
        raise exception 'AGENCY_CUSTOMER_REQUIRED';
      end if;
      if first_customer_id is not null and first_customer_id <> customer_id_value then
        raise exception 'ONE_CUSTOMER_PER_REQUEST';
      end if;
      first_customer_id := customer_id_value;
      if jsonb_typeof(line->'address') <> 'object' or line->'address' = '{}'::jsonb then
        raise exception 'AGENCY_CUSTOMER_ADDRESS_REQUIRED';
      end if;
      address_value := line->'address';
    elsif request_scope_value = 'agency_customer' then
      raise exception 'REQUEST_SCOPE_MIXED';
    end if;
  end loop;

  -- Semantic fingerprint: org/agency/date/note/lines (qty, codes, resources, address).
  -- Excludes server-resolved charges and derived price snapshots.
  select coalesce(
    string_agg(
      concat_ws(
        ':',
        coalesce(elem->>'serviceCode', elem->>'serviceKind', ''),
        coalesce(elem->>'quantity', ''),
        coalesce(elem->>'productKey', ''),
        coalesce(elem->>'boxSize', ''),
        coalesce(elem->>'inventoryItemId', ''),
        coalesce(elem->>'warehouseId', ''),
        coalesce(elem->>'customerId', ''),
        coalesce(elem->>'destinationCode', ''),
        coalesce((elem->'address')::text, '{}')
      ),
      '|'
      order by
        coalesce(elem->>'serviceCode', elem->>'serviceKind', ''),
        coalesce(elem->>'customerId', ''),
        coalesce(elem->>'inventoryItemId', ''),
        coalesce(elem->>'productKey', ''),
        coalesce(elem->>'boxSize', ''),
        coalesce(elem->>'quantity', '')
    ),
    ''
  )
  into lines_fingerprint
  from jsonb_array_elements(lines) as elem;

  fingerprint := md5(
    concat_ws(
      '|',
      tenant::text,
      agency_row.organization_id::text,
      agency_row.id::text,
      coalesce(requested_date::text, ''),
      safe_note,
      lines_fingerprint
    )
  );

  perform pg_advisory_xact_lock(
    hashtextextended(tenant::text || ':create_agency_service_request:' || safe_key, 0)
  );

  insert into public.idempotency_operations(
    tenant_id, operation_type, idempotency_key, actor_membership_id, status, request_hash
  )
  values (
    tenant, 'create_agency_service_request', safe_key, membership, 'executing', fingerprint
  )
  on conflict on constraint idempotency_operations_tenant_id_operation_type_idempotency_key
  do nothing
  returning * into operation;

  if operation.id is null then
    select * into operation
    from public.idempotency_operations existing
    where existing.tenant_id = tenant
      and existing.operation_type = 'create_agency_service_request'
      and existing.idempotency_key = safe_key
    for update;

    if operation.request_hash is not null
       and operation.request_hash is distinct from fingerprint then
      raise exception 'AGENCY_IDEMPOTENCY_CONFLICT';
    end if;

    if operation.status = 'completed' then
      return operation.result || jsonb_build_object('replayed', true);
    end if;

    if operation.status = 'failed' then
      update public.idempotency_operations
      set
        status = 'executing',
        request_hash = fingerprint,
        actor_membership_id = membership,
        result = null,
        error_code = null,
        completed_at = null
      where id = operation.id
      returning * into operation;
    else
      raise exception 'OPERATION_IN_PROGRESS';
    end if;
  end if;

  insert into public.agency_service_requests(
    tenant_id, organization_id, agency_id, code, status, requested_service_date,
    address_snapshot, notes, created_by_membership_id, request_scope, agency_customer_id
  ) values (
    tenant, agency_row.organization_id, agency_row.id,
    'AG-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
    'draft', requested_date, address_value, safe_note, membership,
    request_scope_value, first_customer_id
  )
  returning id into request_id;

  for line in select value from jsonb_array_elements(lines) loop
    service_code_value := coalesce(line->>'serviceCode', line->>'serviceKind', '');
    if coalesce((line->>'quantity')::integer, 0) <= 0 or service_code_value not in (
      'agency_office_empty_box_delivery',
      'agency_office_full_box_pickup',
      'customer_home_delivery',
      'customer_empty_box_delivery',
      'customer_full_box_pickup'
    ) then
      raise exception 'LINEA_INVALIDA';
    end if;

    service_kind_value := case service_code_value
      when 'agency_office_empty_box_delivery' then 'empty_box_delivery'
      when 'agency_office_full_box_pickup' then 'full_box_pickup'
      when 'customer_empty_box_delivery' then 'empty_box_delivery'
      when 'customer_full_box_pickup' then 'home_pickup'
      else 'home_delivery'
    end;

    customer_id_value := nullif(line->>'customerId', '')::uuid;
    destination_code_value := upper(coalesce(
      nullif(btrim(line->>'destinationCode'), ''),
      nullif(btrim(profile_country_code), ''),
      ''
    ));
    product_code_value := coalesce(
      nullif(btrim(line->>'productKey'), ''),
      nullif(btrim(line->>'boxSize'), ''),
      ''
    );
    unit_charge_value := 0;
    price_value := jsonb_build_object(
      'amountCents', 0, 'currency', 'USD', 'sourceLevel', 'not_chargeable', 'resolvedAt', now()
    );

    if service_code_value in (
      'customer_home_delivery', 'customer_empty_box_delivery', 'customer_full_box_pickup'
    ) then
      if destination_code_value = '' then
        raise exception 'AGENCY_COUNTRY_REQUIRED';
      end if;
      price_value := public.resolve_commercial_price(
        'agency', agency_row.id, destination_code_value, '', 'additional_service',
        case
          when service_code_value = 'customer_full_box_pickup' then 'home_pickup'
          else 'home_delivery'
        end,
        now()
      );
      unit_charge_value := (price_value->>'amountCents')::bigint;
    end if;

    insert into public.agency_service_request_lines(
      tenant_id, organization_id, request_id, service_kind, service_code, requested_quantity,
      inventory_item_id, matrix_warehouse_id, product_key, box_size,
      unit_charge_amount_cents, currency, commercial_price_snapshot, details
    ) values (
      tenant, agency_row.organization_id, request_id, service_kind_value, service_code_value,
      (line->>'quantity')::integer,
      nullif(line->>'inventoryItemId', '')::uuid,
      nullif(line->>'warehouseId', '')::uuid,
      coalesce(line->>'productKey', ''),
      coalesce(line->>'boxSize', ''),
      unit_charge_value,
      coalesce(price_value->>'currency', 'USD'),
      price_value,
      coalesce(line->'details', '{}'::jsonb) || jsonb_build_object(
        'customerId', customer_id_value,
        'address', coalesce(line->'address', '{}'::jsonb),
        'destinationCode', destination_code_value,
        'serviceCode', service_code_value
      )
    );
  end loop;

  update public.agency_service_requests
  set
    status = 'submitted',
    submitted_at = coalesce(submitted_at, now()),
    status_version = status_version + 1,
    updated_at = now()
  where id = request_id;

  update public.idempotency_operations
  set
    status = 'completed',
    request_hash = fingerprint,
    result = jsonb_build_object(
      'requestId', request_id,
      'replayed', false,
      'fingerprint', fingerprint
    ),
    error_code = null,
    completed_at = now()
  where id = operation.id;

  return jsonb_build_object(
    'requestId', request_id,
    'replayed', false,
    'fingerprint', fingerprint
  );
exception
  when others then
    if operation.id is not null then
      update public.idempotency_operations
      set
        status = 'failed',
        error_code = left(sqlstate || ':' || sqlerrm, 120),
        result = null,
        completed_at = now()
      where id = operation.id
        and status = 'executing';
    end if;
    raise;
end;
$$;

revoke all on function public.create_agency_service_request(jsonb, date, text, text)
  from public, anon;
grant execute on function public.create_agency_service_request(jsonb, date, text, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- assign_agency_request_to_route — client key + fingerprint + status authority
-- ---------------------------------------------------------------------------

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
  fingerprint text;
  scheduled_norm text;
begin
  if tenant is null or membership is null then
    raise exception 'UNAUTHENTICATED';
  end if;

  if safe_key is null
     or char_length(safe_key) < 8
     or char_length(safe_key) > 128 then
    raise exception 'IDEMPOTENCY_KEY_INVALID';
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

  if request_row.id is null then
    raise exception 'REQUEST_NOT_FOUND';
  end if;

  if route_row.id is null
     or not public.current_membership_has_permission(
       'agency.requests.assign',
       tenant,
       route_row.organization_id
     ) then
    raise exception 'FORBIDDEN';
  end if;

  -- Cross-tenant / wrong-org request already filtered by tenant lock above.
  -- Matrix assigns agency requests that share the tenant.
  if request_row.tenant_id is distinct from tenant then
    raise exception 'FORBIDDEN';
  end if;

  scheduled_norm := coalesce(
    scheduled_for_value::text,
    route_row.route_date::timestamptz::text,
    ''
  );

  -- Fingerprint: tenant + agency + request + route + scheduled window.
  -- Visit type/quantities are derived from the request lines (immutable here).
  fingerprint := md5(
    concat_ws(
      '|',
      tenant::text,
      request_row.organization_id::text,
      request_row.agency_id::text,
      request_row.id::text,
      route_row.id::text,
      scheduled_norm
    )
  );

  perform pg_advisory_xact_lock(
    hashtextextended(tenant::text || ':assign_agency_request:' || request_row.id::text, 0)
  );

  -- Re-read under request advisory + row lock for concurrent assign races.
  select * into request_row
  from public.agency_service_requests
  where id = target_request_id
    and tenant_id = tenant
  for update;

  insert into public.idempotency_operations(
    tenant_id, operation_type, idempotency_key, actor_membership_id, status, request_hash
  )
  values (
    tenant, 'assign_agency_request_to_route', safe_key, membership, 'executing', fingerprint
  )
  on conflict on constraint idempotency_operations_tenant_id_operation_type_idempotency_key
  do nothing
  returning * into operation;

  if operation.id is null then
    select * into operation
    from public.idempotency_operations existing
    where existing.tenant_id = tenant
      and existing.operation_type = 'assign_agency_request_to_route'
      and existing.idempotency_key = safe_key
    for update;

    if operation.request_hash is not null
       and operation.request_hash is distinct from fingerprint then
      raise exception 'AGENCY_IDEMPOTENCY_CONFLICT';
    end if;

    if operation.status = 'completed' then
      return operation.result || jsonb_build_object('replayed', true);
    end if;

    if operation.status = 'failed' then
      update public.idempotency_operations
      set
        status = 'executing',
        request_hash = fingerprint,
        actor_membership_id = membership,
        result = null,
        error_code = null,
        completed_at = null
      where id = operation.id
      returning * into operation;
    else
      raise exception 'OPERATION_IN_PROGRESS';
    end if;
  end if;

  if request_row.status = 'cancelled' then
    raise exception 'REQUEST_CANCELLED';
  end if;

  if request_row.status in ('completed', 'partially_completed', 'rejected') then
    raise exception 'REQUEST_NOT_ASSIGNABLE';
  end if;

  if request_row.status in ('assigned', 'in_route') then
    -- Identical key already completed returns earlier as replay.
    -- A new key must not silently reassign or claim the existing visit.
    raise exception 'REQUEST_ALREADY_ASSIGNED';
  end if;

  if request_row.status not in (
    'submitted', 'under_review', 'confirmed', 'scheduled'
  ) then
    raise exception 'REQUEST_NOT_ASSIGNABLE';
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
    request_hash = fingerprint,
    result = jsonb_build_object(
      'visitId', visit_id,
      'requestId', request_row.id,
      'routeId', route_row.id,
      'replayed', false,
      'fingerprint', fingerprint
    ),
    error_code = null,
    completed_at = now()
  where id = operation.id;

  return jsonb_build_object(
    'visitId', visit_id,
    'requestId', request_row.id,
    'routeId', route_row.id,
    'replayed', false,
    'fingerprint', fingerprint
  );
exception
  when others then
    if operation.id is not null then
      update public.idempotency_operations
      set
        status = 'failed',
        error_code = left(sqlstate || ':' || sqlerrm, 120),
        result = null,
        completed_at = now()
      where id = operation.id
        and status = 'executing';
    end if;
    raise;
end;
$$;

revoke all on function public.assign_agency_request_to_route(uuid, uuid, timestamptz, text)
  from public, anon;
grant execute on function public.assign_agency_request_to_route(uuid, uuid, timestamptz, text)
  to authenticated;

comment on function public.create_agency_service_request(jsonb, date, text, text) is
  'AGE-001: creates one agency request per client idempotency key+fingerprint within tenant.';

comment on function public.assign_agency_request_to_route(uuid, uuid, timestamptz, text) is
  'AGE-001: assigns one visit+stop per request; identical key+fingerprint replays; other route/key conflicts.';
