-- L-H9 / INV: stock_deducted_at is a fulfill/load-movement milestone, not a
-- delivery-complete timestamp. Never invent it in complete or route-start.

-- 1. complete_conductor_task_atomic (preserve stock_deducted_at only)
-- ---------------------------------------------------------------------------

create or replace function public.complete_conductor_task_atomic(
  p_organization_id uuid,
  p_task_id uuid,
  p_driver_id uuid,
  p_result text,
  p_note text,
  p_failure_reason text,
  p_evidence_url text,
  p_client_operation_id text,
  p_captured_at timestamptz,
  p_payment_amount numeric,
  p_payment_method text,
  p_payment_expected_amount numeric,
  p_payment_outcome text,
  p_invoice_visible boolean,
  p_actor_id uuid,
  p_task_patch jsonb,
  p_shipment_patch jsonb,
  p_payment_plan jsonb,
  p_next_paid numeric,
  p_next_profit numeric,
  p_next_sale_kind text,
  p_next_invoice_status text,
  p_next_accounting_status text,
  p_next_finalized_at timestamptz,
  p_collect_payment boolean
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  caller_org uuid := public.current_organization_id();
  task_row public.shipment_logistics_tasks;
  route_row public.logistics_routes;
  stop_row public.logistics_route_stops;
  shipment_row public.shipments;
  attempt_id uuid;
  attempt_task_status text;
  settlement_paid numeric;
  effective_driver uuid;
  is_admin_actor boolean := false;
  safe_note text := left(coalesce(p_note, ''), 500);
  safe_failure text := left(coalesce(p_failure_reason, ''), 200);
  safe_evidence text := left(coalesce(p_evidence_url, ''), 2000);
  payment_amount numeric := coalesce(p_payment_amount, 0);
  collect_payment boolean := coalesce(p_collect_payment, false) and payment_amount > 0;
  payment_method text := left(coalesce(nullif(btrim(p_payment_method), ''), 'efectivo'), 40);
  payment_outcome text := coalesce(nullif(btrim(p_payment_outcome), ''), 'not_applicable');
  result_value text := coalesce(nullif(btrim(p_result), ''), '');
begin
  -- Ignore spoofable client authority fields intentionally.
  perform p_organization_id, p_actor_id, p_next_paid, p_next_profit,
    p_next_sale_kind, p_next_invoice_status, p_next_accounting_status,
    p_next_finalized_at, p_payment_plan;

  if caller_id is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if caller_org is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = caller_id and is_active and organization_id = caller_org
  ) then
    raise exception 'UNAUTHORIZED';
  end if;

  if coalesce(nullif(btrim(p_client_operation_id), ''), '') = '' then
    raise exception 'OPERATION_KEY_REQUIRED';
  end if;

  if result_value not in ('completed', 'failed') then
    raise exception 'INVALID_TASK_RESULT';
  end if;

  if payment_outcome not in ('collected', 'not_collected', 'not_applicable') then
    raise exception 'INVALID_PAYMENT_OUTCOME';
  end if;

  is_admin_actor := public.user_has_permission('routes.update_status')
    and caller_id is distinct from coalesce(p_driver_id, caller_id);

  if is_admin_actor then
    if p_driver_id is null then
      raise exception 'DRIVER_REQUIRED';
    end if;
    effective_driver := p_driver_id;
  else
    if not (
      public.user_has_permission('routes.update_status')
      or public.current_role_slug() = 'conductor'
    ) then
      raise exception 'FORBIDDEN';
    end if;
    effective_driver := caller_id;
    if p_driver_id is not null and p_driver_id is distinct from caller_id then
      raise exception 'FORBIDDEN';
    end if;
  end if;

  -- L-H1: existence of an attempt is not proof of successful completion.
  select a.id, t.status
  into attempt_id, attempt_task_status
  from public.shipment_logistics_task_attempts a
  left join public.shipment_logistics_tasks t
    on t.id = a.task_id
   and t.organization_id = a.organization_id
  where a.organization_id = caller_org
    and a.client_operation_id = p_client_operation_id::uuid
  limit 1;

  if attempt_id is not null then
    if result_value = 'completed' and attempt_task_status = 'completed' then
      return jsonb_build_object('replayed', true, 'taskId', p_task_id, 'attemptId', attempt_id);
    end if;
    if result_value = 'failed' and attempt_task_status = 'cancelled' then
      return jsonb_build_object('replayed', true, 'taskId', p_task_id, 'attemptId', attempt_id);
    end if;

    delete from public.shipment_logistics_task_attempts
    where id = attempt_id
      and organization_id = caller_org;
    attempt_id := null;
  end if;

  select * into task_row
  from public.shipment_logistics_tasks
  where id = p_task_id
    and organization_id = caller_org
  for update;

  if task_row.id is null then
    raise exception 'TASK_NOT_FOUND';
  end if;

  if task_row.status = 'completed' then
    return jsonb_build_object('replayed', true, 'taskId', p_task_id);
  end if;

  if task_row.status = 'cancelled' then
    raise exception 'TASK_CANCELLED';
  end if;

  if task_row.status not in ('assigned', 'loaded_to_truck', 'scheduled', 'pending') then
    raise exception 'TASK_NOT_EXECUTABLE';
  end if;

  select * into shipment_row
  from public.shipments
  where id = task_row.shipment_id
    and organization_id = caller_org
  for update;

  if shipment_row.id is null then
    raise exception 'SHIPMENT_NOT_FOUND';
  end if;

  select route.* into route_row
  from public.logistics_route_stops stop
  join public.logistics_routes route on route.id = stop.route_id
  where stop.task_id = task_row.id
    and stop.released_at is null
    and stop.organization_id = caller_org
  order by stop.created_at desc
  limit 1;

  if route_row.id is null then
    raise exception 'TASK_ROUTE_REQUIRED';
  end if;

  if route_row.organization_id is distinct from caller_org then
    raise exception 'FORBIDDEN';
  end if;

  if route_row.assigned_to is distinct from effective_driver then
    raise exception 'TASK_NOT_ASSIGNED_TO_DRIVER';
  end if;

  if route_row.status is distinct from 'in_progress' then
    raise exception 'TASK_REQUIRES_ROUTE_IN_PROGRESS';
  end if;

  if collect_payment then
    if result_value <> 'completed' then
      raise exception 'PAYMENT_REQUIRES_COMPLETED_TASK';
    end if;
    if payment_outcome <> 'collected' then
      raise exception 'INVALID_PAYMENT_OUTCOME';
    end if;

    -- Payment authority lives in collect_shipment_invoice_payment (recalculates).
    perform public.collect_shipment_invoice_payment(
      task_row.shipment_id,
      caller_org,
      0, -- ignored by hardened collector; kept for signature compatibility
      0,
      coalesce(shipment_row.sale_kind, 'full'),
      'open',
      coalesce(shipment_row.accounting_status, 'not_exportable'),
      null,
      coalesce(shipment_row.logistics_plan, '{}'::jsonb),
      payment_amount,
      payment_method,
      'deposit',
      safe_note,
      caller_id
    );

    select paid into settlement_paid
    from public.shipments
    where id = task_row.shipment_id;
  end if;

  if result_value = 'completed' then
    update public.shipment_logistics_tasks
    set
      status = 'completed',
      completed_at = coalesce(p_captured_at, now()),
      notes = case when safe_note = '' then notes else safe_note end,
      loaded_at = case
        when task_row.task_type = 'deliver_empty_box' then coalesce(loaded_at, coalesce(p_captured_at, now()))
        else loaded_at
      end,
      -- Preserve only: deduction happens in mark/update load RPCs with real movements.
      stock_deducted_at = stock_deducted_at,
      updated_at = now()
    where id = task_row.id;
  else
    update public.shipment_logistics_tasks
    set
      status = 'cancelled',
      notes = case
        when safe_failure = '' and safe_note = '' then notes
        else nullif(btrim(concat_ws(' - ', nullif(safe_failure, ''), nullif(safe_note, ''))), '')
      end,
      updated_at = now()
    where id = task_row.id;
  end if;

  -- Only allow explicit shipment milestone/status fields from a whitelist.
  -- L-H3: never accept a full logistics_plan replace from the client preview.
  if p_shipment_patch is not null and p_shipment_patch <> '{}'::jsonb then
    update public.shipments
    set
      empty_box_delivered_at = case
        when result_value = 'completed'
          and task_row.task_type = 'deliver_empty_box'
          and p_shipment_patch ? 'empty_box_delivered_at'
          then coalesce((p_shipment_patch ->> 'empty_box_delivered_at')::timestamptz, empty_box_delivered_at)
        else empty_box_delivered_at
      end,
      full_box_collected_at = case
        when result_value = 'completed'
          and task_row.task_type = 'pickup_full_box'
          and p_shipment_patch ? 'full_box_collected_at'
          then coalesce((p_shipment_patch ->> 'full_box_collected_at')::timestamptz, full_box_collected_at)
        else full_box_collected_at
      end,
      status = case
        when p_shipment_patch ? 'status'
          and (p_shipment_patch ->> 'status') in (
            'pending', 'in_progress', 'ready_for_pickup', 'completed', 'cancelled',
            'En oficina', 'En ruta', 'Entregado', 'Recogido'
          )
          then p_shipment_patch ->> 'status'
        else status
      end
    where id = task_row.shipment_id
      and organization_id = caller_org;
  end if;

  -- Merge driver-collection audit into SQL billing without replacing the plan.
  if result_value = 'completed' and payment_outcome in ('collected', 'not_collected') then
    update public.shipments s
    set logistics_plan = jsonb_set(
      coalesce(s.logistics_plan, '{}'::jsonb),
      '{billing}',
      coalesce(s.logistics_plan -> 'billing', '{}'::jsonb) || jsonb_build_object(
        'lastDriverCollection', jsonb_build_object(
          'expectedAmount', coalesce(p_payment_expected_amount, 0),
          'receivedAmount', case when collect_payment then payment_amount else 0 end,
          'outcome', payment_outcome,
          'collectedAt', coalesce(p_captured_at, now()),
          'totalBefore', coalesce(
            nullif(regexp_replace(coalesce(s.logistics_plan #>> '{billing,quotedTotal}', ''), '[^0-9.-]', '', 'g'), '')::numeric,
            0
          ),
          'totalAfter', coalesce(
            nullif(regexp_replace(coalesce(s.logistics_plan #>> '{billing,quotedTotal}', ''), '[^0-9.-]', '', 'g'), '')::numeric,
            0
          )
        )
      ),
      true
    )
    where s.id = task_row.shipment_id
      and s.organization_id = caller_org;
  end if;

  select * into stop_row
  from public.logistics_route_stops
  where task_id = task_row.id
    and released_at is null
    and organization_id = caller_org
  order by created_at desc
  limit 1
  for update;

  if stop_row.id is not null then
    update public.logistics_route_stops
    set outcome = case when result_value = 'completed' then 'completed' else 'failed' end,
        outcome_at = now()
    where id = stop_row.id;
  end if;

  insert into public.shipment_logistics_task_attempts (
    organization_id, task_id, shipment_id, route_id, driver_id, result, failure_reason,
    note, evidence_url, payment_expected_amount, payment_amount, payment_method,
    payment_outcome, invoice_visible, client_operation_id, captured_at, created_by
  ) values (
    caller_org, task_row.id, task_row.shipment_id, route_row.id, effective_driver, result_value,
    safe_failure, safe_note, safe_evidence,
    coalesce(p_payment_expected_amount, 0), coalesce(payment_amount, 0), coalesce(payment_method, ''),
    payment_outcome, coalesce(p_invoice_visible, false),
    p_client_operation_id::uuid, coalesce(p_captured_at, now()), caller_id
  )
  returning id into attempt_id;

  return jsonb_build_object(
    'replayed', false,
    'taskId', task_row.id,
    'attemptId', attempt_id,
    'paid', settlement_paid,
    'actorId', caller_id,
    'organizationId', caller_org,
    'driverId', effective_driver
  );
end;
$$;

revoke all on function public.complete_conductor_task_atomic(
  uuid, uuid, uuid, text, text, text, text, text, timestamptz, numeric, text, numeric, text, boolean, uuid,
  jsonb, jsonb, jsonb, numeric, numeric, text, text, text, timestamptz, boolean
) from public, anon;
grant execute on function public.complete_conductor_task_atomic(
  uuid, uuid, uuid, text, text, text, text, text, timestamptz, numeric, text, numeric, text, boolean, uuid,
  jsonb, jsonb, jsonb, numeric, numeric, text, text, text, timestamptz, boolean
) to authenticated;
-- service_role retained only for controlled server paths that set a user JWT claim context.
grant execute on function public.complete_conductor_task_atomic(
  uuid, uuid, uuid, text, text, text, text, text, timestamptz, numeric, text, numeric, text, boolean, uuid,
  jsonb, jsonb, jsonb, numeric, numeric, text, text, text, timestamptz, boolean
) to service_role;

-- 2. start_logistics_route_atomic (do not invent stock_deducted_at)
-- ---------------------------------------------------------------------------

create or replace function public.start_logistics_route_atomic(
  p_route_id uuid,
  p_task_ids uuid[],
  p_started_lat double precision,
  p_started_lng double precision,
  p_client_operation_id text default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  caller_org uuid := public.current_organization_id();
  route_row public.logistics_routes;
  effective_driver uuid;
  now_ts timestamptz := now();
  updated_tasks integer := 0;
begin
  if caller_id is null or caller_org is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if p_started_lat is null or p_started_lng is null
     or p_started_lat < -90 or p_started_lat > 90
     or p_started_lng < -180 or p_started_lng > 180 then
    raise exception 'INVALID_GPS';
  end if;

  select * into route_row
  from public.logistics_routes
  where id = p_route_id
    and organization_id = caller_org
  for update;

  if route_row.id is null then
    raise exception 'ROUTE_NOT_FOUND';
  end if;

  if route_row.status = 'in_progress' then
    return jsonb_build_object(
      'replayed', true,
      'routeId', route_row.id,
      'status', route_row.status
    );
  end if;

  if route_row.status is distinct from 'planned' then
    raise exception 'ROUTE_NOT_PLANNED';
  end if;

  if public.user_has_permission('routes.update_status')
     and caller_id is distinct from route_row.assigned_to then
    effective_driver := route_row.assigned_to;
  else
    if route_row.assigned_to is distinct from caller_id then
      raise exception 'FORBIDDEN';
    end if;
    effective_driver := caller_id;
  end if;

  if effective_driver is null then
    raise exception 'ROUTE_MISSING_DRIVER';
  end if;

  if coalesce(cardinality(p_task_ids), 0) > 0 then
    update public.shipment_logistics_tasks task
    set
      status = 'loaded_to_truck',
      loaded_at = coalesce(task.loaded_at, now_ts),
      -- Preserve only: stock_deducted_at requires a real inventory movement RPC.
      stock_deducted_at = task.stock_deducted_at,
      updated_at = now_ts
    where task.organization_id = caller_org
      and task.id = any(p_task_ids)
      and exists (
        select 1
        from public.logistics_route_stops stop
        where stop.task_id = task.id
          and stop.route_id = route_row.id
          and stop.released_at is null
          and stop.organization_id = caller_org
      );

    get diagnostics updated_tasks = row_count;
  end if;

  update public.logistics_routes
  set
    status = 'in_progress',
    started_at = now_ts,
    started_by = caller_id,
    started_lat = p_started_lat,
    started_lng = p_started_lng,
    updated_at = now_ts
  where id = route_row.id
    and organization_id = caller_org
    and status = 'planned';

  if not found then
    raise exception 'ROUTE_START_CONFLICT';
  end if;

  insert into public.activity_history (
    organization_id, actor_id, actor_name, action, entity_type, entity_id,
    title, description, metadata
  )
  select
    caller_org,
    caller_id,
    coalesce(nullif(btrim(profile.full_name), ''), profile.email, ''),
    'logistics.route_started',
    'logistics_route',
    route_row.id,
    'Ruta iniciada: ' || route_row.name,
    'Inicio atomico de ruta',
    jsonb_build_object(
      'routeId', route_row.id,
      'driverId', effective_driver,
      'taskIds', to_jsonb(coalesce(p_task_ids, '{}'::uuid[])),
      'updatedTasks', updated_tasks,
      'startedLat', p_started_lat,
      'startedLng', p_started_lng,
      'clientOperationId', p_client_operation_id
    )
  from public.profiles profile
  where profile.id = caller_id;

  return jsonb_build_object(
    'replayed', false,
    'routeId', route_row.id,
    'status', 'in_progress',
    'updatedTasks', updated_tasks,
    'driverId', effective_driver,
    'actorId', caller_id
  );
end;
$$;

revoke all on function public.start_logistics_route_atomic(
  uuid, uuid[], double precision, double precision, text
) from public, anon;
grant execute on function public.start_logistics_route_atomic(
  uuid, uuid[], double precision, double precision, text
) to authenticated;
