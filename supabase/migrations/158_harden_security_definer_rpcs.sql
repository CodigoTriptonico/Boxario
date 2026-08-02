-- Harden SECURITY DEFINER logistics RPCs: derive identity from auth.uid(),
-- never trust client-supplied organization/actor/payment authority fields.
-- Payment collector recalculates saldo/status from locked shipment rows (FIN-004).
-- Warehouse access remains default-deny (016).

-- ---------------------------------------------------------------------------
-- 0. collect_shipment_invoice_payment — SQL is payment authority
-- ---------------------------------------------------------------------------

create or replace function public.collect_shipment_invoice_payment(
  target_shipment_id uuid,
  target_organization_id uuid,
  next_paid numeric,
  next_profit numeric,
  next_sale_kind text,
  next_invoice_status text,
  next_accounting_status text,
  next_finalized_at timestamptz,
  next_logistics_plan jsonb,
  payment_amount numeric,
  payment_method text,
  payment_kind text,
  payment_note text,
  payment_created_by uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  caller_org uuid := public.current_organization_id();
  shipment_row public.shipments;
  quoted_total numeric;
  current_paid numeric;
  computed_paid numeric;
  computed_balance numeric;
  computed_invoice_status text;
  computed_accounting_status text;
  computed_finalized_at timestamptz;
  computed_profit numeric;
  deposit_required numeric;
  deposit_status text;
  plan_json jsonb;
  billing jsonb;
  money_tol numeric := 0.009;
begin
  -- Client-supplied next_* values are previews only; SQL recalculates authority.
  perform next_paid, next_profit, next_sale_kind, next_invoice_status,
    next_accounting_status, next_finalized_at, payment_created_by;

  if payment_amount is null or payment_amount <= 0 then
    raise exception 'Monto de pago invalido';
  end if;

  if caller_id is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if caller_org is null
     or (target_organization_id is not null and target_organization_id is distinct from caller_org) then
    raise exception 'FORBIDDEN';
  end if;

  if not public.user_has_permission('sales.manage')
     and not public.user_has_permission('routes.update_status')
     and public.current_role_slug() is distinct from 'conductor' then
    raise exception 'FORBIDDEN';
  end if;

  select * into shipment_row
  from public.shipments
  where id = target_shipment_id
    and organization_id = caller_org
  for update;

  if shipment_row.id is null then
    raise exception 'Invoice no encontrado';
  end if;

  plan_json := coalesce(next_logistics_plan, shipment_row.logistics_plan, '{}'::jsonb);
  billing := case
    when jsonb_typeof(plan_json -> 'billing') = 'object' then plan_json -> 'billing'
    else '{}'::jsonb
  end;

  quoted_total := nullif(regexp_replace(coalesce(billing ->> 'quotedTotal', ''), '[^0-9.-]', '', 'g'), '')::numeric;
  if quoted_total is null then
    quoted_total := nullif(regexp_replace(coalesce(plan_json #>> '{quote,total}', ''), '[^0-9.-]', '', 'g'), '')::numeric;
  end if;
  if quoted_total is null then
    raise exception 'Total de invoice no disponible';
  end if;
  if quoted_total < 0 then
    raise exception 'Total de invoice invalido';
  end if;

  current_paid := coalesce(shipment_row.paid, 0);
  computed_balance := round((quoted_total - current_paid)::numeric, 2);
  if computed_balance <= 0 then
    raise exception 'No hay pendiente en este invoice';
  end if;

  if round(payment_amount::numeric, 2) - computed_balance > money_tol then
    raise exception 'El monto no puede superar el saldo pendiente';
  end if;

  computed_paid := round((current_paid + payment_amount)::numeric, 2);
  if computed_paid - quoted_total > money_tol then
    raise exception 'El monto no puede superar el saldo pendiente';
  end if;

  deposit_required := nullif(regexp_replace(coalesce(billing ->> 'depositRequired', billing ->> 'minimumDeposit', ''), '[^0-9.-]', '', 'g'), '')::numeric;
  deposit_status := case
    when deposit_required is null then coalesce(billing ->> 'depositStatus', 'pending')
    when computed_paid + money_tol >= deposit_required then 'paid'
    else 'pending'
  end;

  if abs(computed_paid - quoted_total) <= money_tol then
    computed_invoice_status := 'paid';
    computed_accounting_status := 'exportable';
    computed_finalized_at := coalesce(shipment_row.finalized_at, now());
    computed_profit := greatest(
      round((
        computed_paid
        - coalesce(
            nullif(regexp_replace(coalesce(billing ->> 'boxSubtotalBeforeDiscount', ''), '[^0-9.-]', '', 'g'), '')::numeric
            - coalesce(nullif(regexp_replace(coalesce(billing ->> 'promotionDiscount', '0'), '[^0-9.-]', '', 'g'), '')::numeric, 0)
          , 0)
      )::numeric, 2),
      0
    );
  else
    computed_invoice_status := 'open';
    computed_accounting_status := coalesce(shipment_row.accounting_status, 'not_exportable');
    computed_finalized_at := shipment_row.finalized_at;
    computed_profit := coalesce(shipment_row.profit, 0);
  end if;

  billing := billing || jsonb_build_object(
    'quotedTotal', '$' || trim(to_char(quoted_total, '999999990.00')),
    'payNow', '$' || trim(to_char(computed_paid, '999999990.00')),
    'balanceDue', '$' || trim(to_char(greatest(quoted_total - computed_paid, 0), '999999990.00')),
    'depositStatus', deposit_status
  );
  plan_json := jsonb_set(plan_json, '{billing}', billing, true);

  update public.shipments
  set
    paid = computed_paid,
    profit = computed_profit,
    sale_kind = coalesce(nullif(btrim(shipment_row.sale_kind), ''), 'full'),
    invoice_status = computed_invoice_status,
    accounting_status = computed_accounting_status,
    finalized_at = computed_finalized_at,
    logistics_plan = plan_json
  where id = shipment_row.id
    and organization_id = caller_org;

  insert into public.shipment_payments (
    organization_id,
    shipment_id,
    amount,
    method,
    kind,
    note,
    created_by
  )
  values (
    caller_org,
    shipment_row.id,
    round(payment_amount::numeric, 2),
    left(coalesce(nullif(btrim(payment_method), ''), 'efectivo'), 40),
    case
      when coalesce(nullif(btrim(payment_kind), ''), '') in ('deposit', 'balance', 'full')
        then payment_kind
      else 'balance'
    end,
    left(coalesce(payment_note, ''), 160),
    caller_id
  );
end;
$$;

revoke all on function public.collect_shipment_invoice_payment(
  uuid, uuid, numeric, numeric, text, text, text, timestamptz, jsonb, numeric, text, text, text, uuid
) from public, anon;
grant execute on function public.collect_shipment_invoice_payment(
  uuid, uuid, numeric, numeric, text, text, text, timestamptz, jsonb, numeric, text, text, text, uuid
) to authenticated;

-- ---------------------------------------------------------------------------
-- 1. complete_conductor_task_atomic
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

  select id into attempt_id
  from public.shipment_logistics_task_attempts
  where organization_id = caller_org
    and client_operation_id = p_client_operation_id::uuid
  limit 1;

  if attempt_id is not null then
    return jsonb_build_object('replayed', true, 'taskId', p_task_id, 'attemptId', attempt_id);
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
      stock_deducted_at = case
        when task_row.task_type = 'deliver_empty_box' then coalesce(stock_deducted_at, coalesce(p_captured_at, now()))
        else stock_deducted_at
      end,
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

  -- Only allow explicit shipment milestone fields from a whitelist, never arbitrary patches.
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
      logistics_plan = case
        when p_shipment_patch ? 'logistics_plan'
          and jsonb_typeof(p_shipment_patch -> 'logistics_plan') = 'object'
          then p_shipment_patch -> 'logistics_plan'
        else logistics_plan
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

-- ---------------------------------------------------------------------------
-- 2. notify_logistics_route_change — auth + org + permission; recipient from route
-- ---------------------------------------------------------------------------

create or replace function public.notify_logistics_route_change(
  target_route_id uuid,
  target_recipient_id uuid,
  target_change_type text,
  target_summary text,
  target_stop_id uuid,
  target_idempotency_key text,
  target_actor_id uuid,
  target_actor_name text
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  caller_org uuid := public.current_organization_id();
  route_row public.logistics_routes;
  notification_id uuid;
  recipient uuid;
  actor_name text;
begin
  perform target_recipient_id, target_actor_id, target_actor_name;

  if caller_id is null or caller_org is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if not (
    public.user_has_permission('routes.update_status')
    or public.user_has_permission('sales.manage')
  ) then
    raise exception 'FORBIDDEN';
  end if;

  if coalesce(nullif(btrim(target_idempotency_key), ''), '') = '' then
    raise exception 'IDEMPOTENCY_KEY_REQUIRED';
  end if;

  select * into route_row
  from public.logistics_routes
  where id = target_route_id
    and organization_id = caller_org
  for share;

  if route_row.id is null then
    raise exception 'ROUTE_NOT_FOUND';
  end if;

  recipient := route_row.assigned_to;
  if recipient is null then
    return null;
  end if;

  select coalesce(nullif(btrim(full_name), ''), email, '')
  into actor_name
  from public.profiles
  where id = caller_id;

  insert into public.logistics_route_notifications (
    organization_id, route_id, recipient_id, change_type, stop_id, summary,
    actor_id, actor_name, idempotency_key
  ) values (
    caller_org, route_row.id, recipient,
    left(coalesce(nullif(btrim(target_change_type), ''), 'route_change'), 80),
    target_stop_id,
    left(coalesce(target_summary, ''), 500),
    caller_id, coalesce(actor_name, ''),
    target_idempotency_key
  )
  on conflict (organization_id, idempotency_key) do update
    set summary = excluded.summary
  returning id into notification_id;

  return notification_id;
end;
$$;

revoke all on function public.notify_logistics_route_change(
  uuid, uuid, text, text, uuid, text, uuid, text
) from public, anon;
grant execute on function public.notify_logistics_route_change(
  uuid, uuid, text, text, uuid, text, uuid, text
) to authenticated;

comment on function public.user_can_access_warehouse(uuid) is
  'Default deny: empty profile_warehouses means no warehouse access. Administrador may access all active warehouses in the organization.';
