-- Configurable included pickup window and one-time late pickup charge.

alter table public.organization_route_settings
  add column if not exists pickup_included_days integer not null default 30,
  add column if not exists late_pickup_fee text not null default '$0';

alter table public.organization_route_settings
  drop constraint if exists organization_route_settings_pickup_included_days_check,
  add constraint organization_route_settings_pickup_included_days_check
    check (pickup_included_days between 1 and 3650),
  drop constraint if exists organization_route_settings_late_pickup_fee_check,
  add constraint organization_route_settings_late_pickup_fee_check
    check (late_pickup_fee ~ '^\$?[0-9]+(\.[0-9]{1,2})?$');

create or replace function public.save_sales_axis_settings_v3(
  p_schedule_suggestions jsonb,
  p_minimum_deposit text,
  p_pickup_included_days integer,
  p_late_pickup_fee text,
  p_pending_allowed boolean,
  p_accepted_payment_methods text[],
  p_driver_payment_methods text[],
  p_default_payment_method text,
  p_reference_required_methods text[]
)
returns public.organization_route_settings
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_org_id uuid := public.current_organization_id();
  v_allowed_methods constant text[] := array[
    'cash','card','check','zelle','venmo','paypal','cash_app','bank_transfer','deposit','other'
  ]::text[];
  v_accepted text[] := coalesce(p_accepted_payment_methods, '{}'::text[]);
  v_driver text[] := coalesce(p_driver_payment_methods, '{}'::text[]);
  v_references text[] := coalesce(p_reference_required_methods, '{}'::text[]);
  v_default text := btrim(coalesce(p_default_payment_method, ''));
  v_late_fee text := btrim(coalesce(p_late_pickup_fee, '$0'));
  v_result public.organization_route_settings;
begin
  if v_org_id is null
     or not (
       public.user_has_permission('sales.settings.manage')
       or public.user_has_permission('settings.manage')
     ) then
    raise exception 'FORBIDDEN';
  end if;

  if p_schedule_suggestions is null
     or jsonb_typeof(p_schedule_suggestions) <> 'object'
     or length(coalesce(p_minimum_deposit, '')) > 32
     or p_pickup_included_days not between 1 and 3650
     or length(v_late_fee) > 32
     or v_late_fee !~ '^\$?[0-9]+(\.[0-9]{1,2})?$'
     or cardinality(v_accepted) not between 1 and 10
     or not (v_accepted <@ v_allowed_methods)
     or not (v_driver <@ v_accepted)
     or not (v_references <@ v_accepted)
     or not (v_default = any(v_accepted)) then
    raise exception 'INVALID_SALES_SETTINGS';
  end if;

  insert into public.organization_route_settings (
    organization_id,
    schedule_suggestions,
    minimum_deposit,
    pickup_included_days,
    late_pickup_fee,
    pending_allowed,
    accepted_payment_methods,
    driver_payment_methods,
    default_payment_method,
    payment_reference_required_methods,
    updated_at
  ) values (
    v_org_id,
    p_schedule_suggestions,
    btrim(coalesce(p_minimum_deposit, '$0')),
    p_pickup_included_days,
    v_late_fee,
    coalesce(p_pending_allowed, true),
    v_accepted,
    v_driver,
    v_default,
    v_references,
    now()
  )
  on conflict (organization_id) do update set
    schedule_suggestions = excluded.schedule_suggestions,
    minimum_deposit = excluded.minimum_deposit,
    pickup_included_days = excluded.pickup_included_days,
    late_pickup_fee = excluded.late_pickup_fee,
    pending_allowed = excluded.pending_allowed,
    accepted_payment_methods = excluded.accepted_payment_methods,
    driver_payment_methods = excluded.driver_payment_methods,
    default_payment_method = excluded.default_payment_method,
    payment_reference_required_methods = excluded.payment_reference_required_methods,
    updated_at = now()
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.save_sales_axis_settings_v3(
  jsonb, text, integer, text, boolean, text[], text[], text, text[]
) from public, anon;
grant execute on function public.save_sales_axis_settings_v3(
  jsonb, text, integer, text, boolean, text[], text[], text, text[]
) to authenticated;
revoke execute on function public.save_sales_axis_settings_v2(
  jsonb, text, boolean, text[], text[], text, text[]
) from authenticated;

create or replace function public.apply_late_pickup_fee(p_shipment_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_org_id uuid := public.current_organization_id();
  v_actor_id uuid := auth.uid();
  v_actor_name text := '';
  v_tenant_id uuid;
  v_shipment public.shipments;
  v_task public.shipment_logistics_tasks;
  v_plan jsonb;
  v_policy jsonb;
  v_billing jsonb;
  v_included_days integer;
  v_fee numeric(12,2);
  v_deadline timestamptz;
  v_total numeric(12,2);
  v_logistics_total numeric(12,2);
  v_next_total numeric(12,2);
  v_balance numeric(12,2);
  v_fee_label text;
  v_total_label text;
  v_logistics_label text;
  v_balance_label text;
begin
  if v_org_id is null or not public.user_has_permission('sales.manage') then
    raise exception 'FORBIDDEN';
  end if;

  select * into v_shipment
  from public.shipments shipment
  where shipment.id = p_shipment_id
    and shipment.organization_id = v_org_id
  for update;

  if not found then
    raise exception 'SHIPMENT_NOT_FOUND';
  end if;

  v_plan := coalesce(v_shipment.logistics_plan, '{}'::jsonb);
  v_policy := coalesce(v_plan -> 'pickupPolicy', '{}'::jsonb);

  if coalesce(v_policy ->> 'includedDays', '') !~ '^[0-9]+$' then
    return jsonb_build_object('applied', false, 'reason', 'not_configured');
  end if;

  v_included_days := (v_policy ->> 'includedDays')::integer;
  v_fee := coalesce(
    nullif(regexp_replace(coalesce(v_policy ->> 'latePickupFee', ''), '[^0-9.-]', '', 'g'), '')::numeric,
    0
  );

  if v_shipment.empty_box_delivered_at is null then
    return jsonb_build_object('applied', false, 'reason', 'awaiting_empty_box_delivery');
  end if;

  select * into v_task
  from public.shipment_logistics_tasks task
  where task.organization_id = v_org_id
    and task.shipment_id = v_shipment.id
    and task.task_type = 'pickup_full_box'
    and task.status <> 'cancelled'
    and task.ordered_at is not null
  order by task.ordered_at desc, task.created_at desc
  limit 1;

  if not found then
    return jsonb_build_object('applied', false, 'reason', 'pickup_not_requested');
  end if;

  v_deadline := v_shipment.empty_box_delivered_at + make_interval(days => v_included_days);
  if v_task.ordered_at <= v_deadline or v_fee <= 0 then
    return jsonb_build_object(
      'applied', false,
      'reason', case when v_fee <= 0 then 'zero_fee' else 'within_window' end,
      'includedUntil', v_deadline,
      'requestedAt', v_task.ordered_at
    );
  end if;

  if coalesce(v_policy ->> 'lateFeeAppliedAt', '') <> '' then
    return jsonb_build_object('applied', false, 'reason', 'already_applied');
  end if;

  v_billing := coalesce(v_plan -> 'billing', '{}'::jsonb);
  v_total := coalesce(
    nullif(regexp_replace(coalesce(v_billing ->> 'quotedTotal', ''), '[^0-9.-]', '', 'g'), '')::numeric,
    0
  );
  v_logistics_total := coalesce(
    nullif(regexp_replace(coalesce(v_billing ->> 'logisticsSubtotal', ''), '[^0-9.-]', '', 'g'), '')::numeric,
    0
  );
  v_next_total := v_total + v_fee;
  v_balance := greatest(v_next_total - coalesce(v_shipment.paid, 0), 0);
  v_fee_label := '$' || to_char(v_fee, 'FM999999999990.00');
  v_total_label := '$' || to_char(v_next_total, 'FM999999999990.00');
  v_logistics_label := '$' || to_char(v_logistics_total + v_fee, 'FM999999999990.00');
  v_balance_label := '$' || to_char(v_balance, 'FM999999999990.00');

  v_billing := v_billing || jsonb_build_object(
    'latePickupFee', v_fee_label,
    'logisticsSubtotal', v_logistics_label,
    'quotedTotal', v_total_label,
    'balanceDue', v_balance_label
  );
  v_policy := v_policy || jsonb_build_object(
    'startsAt', v_shipment.empty_box_delivered_at,
    'includedUntil', v_deadline,
    'pickupRequestedAt', v_task.ordered_at,
    'lateFeeAppliedAt', now(),
    'lateFeeAppliedAmount', v_fee_label
  );
  v_plan := jsonb_set(v_plan, '{billing}', v_billing, true);
  v_plan := jsonb_set(v_plan, '{pickupPolicy}', v_policy, true);
  v_plan := jsonb_set(
    v_plan,
    '{fees,total}',
    to_jsonb(v_logistics_label),
    true
  );
  v_plan := jsonb_set(v_plan, '{quote,total}', to_jsonb(v_total_label), true);

  update public.shipments
  set logistics_plan = v_plan,
      invoice_status = case when coalesce(paid, 0) >= v_next_total then 'paid' else 'open' end,
      accounting_status = case when coalesce(paid, 0) >= v_next_total then 'exportable' else 'not_exportable' end,
      finalized_at = case when coalesce(paid, 0) >= v_next_total then finalized_at else null end,
      profit = case when coalesce(paid, 0) >= v_next_total then profit else 0 end
  where id = v_shipment.id
    and organization_id = v_org_id;

  select profile.full_name into v_actor_name
  from public.profiles profile
  where profile.id = v_actor_id;
  select organization.tenant_id into v_tenant_id
  from public.organizations organization
  where organization.id = v_org_id;

  insert into public.activity_history(
    organization_id, actor_id, actor_name, action, entity_type, entity_id,
    title, description, metadata
  ) values (
    v_org_id, v_actor_id, coalesce(v_actor_name, ''),
    'shipment.late_pickup_fee_applied', 'shipment', v_shipment.id,
    'Cargo por recolección fuera de plazo · ' || v_shipment.code,
    'La recolección se solicitó después del plazo incluido.',
    jsonb_build_object(
      'amount', v_fee_label,
      'includedDays', v_included_days,
      'emptyBoxDeliveredAt', v_shipment.empty_box_delivered_at,
      'includedUntil', v_deadline,
      'pickupRequestedAt', v_task.ordered_at,
      'taskId', v_task.id
    )
  );

  insert into public.security_audit_events(
    actor_id, tenant_id, organization_id, entity_type, entity_id, action,
    previous_state, next_state, reason, operation_key, context
  ) values (
    v_actor_id, v_tenant_id, v_org_id, 'shipment', v_shipment.id,
    'shipment.late_pickup_fee_applied',
    jsonb_build_object('quotedTotal', v_total, 'invoiceStatus', v_shipment.invoice_status),
    jsonb_build_object('quotedTotal', v_next_total, 'invoiceStatus', case when coalesce(v_shipment.paid, 0) >= v_next_total then 'paid' else 'open' end),
    'Recolección solicitada fuera del plazo incluido',
    'late-pickup:' || v_shipment.id::text,
    jsonb_build_object('taskId', v_task.id, 'fee', v_fee, 'includedUntil', v_deadline)
  );

  return jsonb_build_object(
    'applied', true,
    'amount', v_fee_label,
    'quotedTotal', v_total_label,
    'balanceDue', v_balance_label,
    'includedUntil', v_deadline,
    'requestedAt', v_task.ordered_at
  );
end;
$$;

revoke all on function public.apply_late_pickup_fee(uuid) from public, anon;
grant execute on function public.apply_late_pickup_fee(uuid) to authenticated;

comment on column public.organization_route_settings.pickup_included_days is
  'Number of days after actual empty-box delivery in which a customer pickup request remains included.';
comment on column public.organization_route_settings.late_pickup_fee is
  'One-time per-invoice pickup charge snapshotted at sale and applied only when pickup is requested after the included window.';
comment on function public.apply_late_pickup_fee(uuid) is
  'Idempotently applies the snapshotted late pickup fee when an active full-box pickup task was ordered after the included deadline.';
