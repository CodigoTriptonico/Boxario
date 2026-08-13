-- Tenant-scoped payment intention keys.
-- Drop the redundant global unique on client_payment_id: multi-tenant authority is
-- (organization_id, client_payment_id). Cross-org reuse of the same UUID string is a
-- separate intention under another tenant and must not collide globally.
-- Lookups and conflict checks use organization_id + client_payment_id.

drop index if exists public.idx_shipment_payments_client_payment_id_global;

drop function if exists public.collect_shipment_invoice_payment(
  uuid, uuid, numeric, numeric, text, text, text, timestamptz, jsonb, numeric, text, text, text, uuid, text
);

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
  payment_created_by uuid,
  payment_client_operation_id text default null
)
returns jsonb
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
  safe_method text;
  safe_kind text;
  safe_note text;
  safe_operation_id text := nullif(btrim(coalesce(payment_client_operation_id, '')), '');
  existing_payment public.shipment_payments;
  new_payment_id uuid;
begin
  -- Client-supplied next_* values are previews only; SQL recalculates authority.
  perform next_paid, next_profit, next_sale_kind, next_invoice_status,
    next_accounting_status, next_finalized_at, payment_created_by;

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

  safe_method := left(coalesce(nullif(btrim(payment_method), ''), 'cash'), 40);
  if safe_method = 'efectivo' then
    safe_method := 'cash';
  end if;
  if safe_method not in (
    'cash', 'card', 'check', 'zelle', 'venmo', 'paypal',
    'cash_app', 'bank_transfer', 'deposit', 'other'
  ) then
    raise exception 'Metodo de pago invalido';
  end if;

  safe_kind := case
    when coalesce(nullif(btrim(payment_kind), ''), '') in ('deposit', 'balance', 'full')
      then payment_kind
    else 'balance'
  end;
  safe_note := left(coalesce(payment_note, ''), 160);

  if safe_operation_id is not null then
    if char_length(safe_operation_id) < 8 or char_length(safe_operation_id) > 128 then
      raise exception 'PAYMENT_OPERATION_ID_INVALID';
    end if;

    -- Serialize same-key retries across concurrent sessions before mutating.
    perform pg_advisory_xact_lock(
      hashtextextended(caller_org::text || ':pay:' || safe_operation_id, 0)
    );

    select * into existing_payment
    from public.shipment_payments
    where organization_id = caller_org
      and client_payment_id = safe_operation_id
    limit 1;

    if existing_payment.id is not null then
      if existing_payment.shipment_id is distinct from target_shipment_id
         or (payment_amount is not null and payment_amount > 0
             and round(existing_payment.amount::numeric, 2) is distinct from round(payment_amount::numeric, 2))
         or existing_payment.method is distinct from safe_method then
        raise exception 'PAYMENT_IDEMPOTENCY_CONFLICT';
      end if;

      select * into shipment_row
      from public.shipments
      where id = existing_payment.shipment_id
        and organization_id = caller_org;

      return jsonb_build_object(
        'replayed', true,
        'paymentId', existing_payment.id,
        'shipmentId', existing_payment.shipment_id,
        'paid', coalesce(shipment_row.paid, 0),
        'invoiceStatus', shipment_row.invoice_status,
        'clientPaymentId', safe_operation_id
      );
    end if;
  end if;

  if payment_amount is null or payment_amount <= 0 then
    raise exception 'Monto de pago invalido';
  end if;

  select * into shipment_row
  from public.shipments
  where id = target_shipment_id
    and organization_id = caller_org
  for update;

  if shipment_row.id is null then
    raise exception 'Invoice no encontrado';
  end if;

  -- Re-check under shipment row lock (belt-and-suspenders with advisory lock).
  if safe_operation_id is not null then
    select * into existing_payment
    from public.shipment_payments
    where organization_id = caller_org
      and client_payment_id = safe_operation_id
    limit 1;

    if existing_payment.id is not null then
      if existing_payment.shipment_id is distinct from shipment_row.id
         or (payment_amount is not null and payment_amount > 0
             and round(existing_payment.amount::numeric, 2) is distinct from round(payment_amount::numeric, 2))
         or existing_payment.method is distinct from safe_method then
        raise exception 'PAYMENT_IDEMPOTENCY_CONFLICT';
      end if;

      return jsonb_build_object(
        'replayed', true,
        'paymentId', existing_payment.id,
        'shipmentId', shipment_row.id,
        'paid', shipment_row.paid,
        'invoiceStatus', shipment_row.invoice_status,
        'clientPaymentId', safe_operation_id
      );
    end if;
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

  -- Insert payment first so a unique race cannot leave a double financial update.
  begin
    insert into public.shipment_payments (
      organization_id,
      shipment_id,
      amount,
      method,
      kind,
      note,
      created_by,
      client_payment_id
    )
    values (
      caller_org,
      shipment_row.id,
      round(payment_amount::numeric, 2),
      safe_method,
      safe_kind,
      safe_note,
      caller_id,
      safe_operation_id
    )
    returning id into new_payment_id;
  exception
    when unique_violation then
      if safe_operation_id is null then
        raise;
      end if;

      select * into existing_payment
      from public.shipment_payments
      where organization_id = caller_org
        and client_payment_id = safe_operation_id
      limit 1;

      if existing_payment.id is null then
        raise;
      end if;

      if existing_payment.shipment_id is distinct from shipment_row.id
         or (payment_amount is not null and payment_amount > 0
             and round(existing_payment.amount::numeric, 2) is distinct from round(payment_amount::numeric, 2))
         or existing_payment.method is distinct from safe_method then
        raise exception 'PAYMENT_IDEMPOTENCY_CONFLICT';
      end if;

      return jsonb_build_object(
        'replayed', true,
        'paymentId', existing_payment.id,
        'shipmentId', shipment_row.id,
        'paid', shipment_row.paid,
        'invoiceStatus', shipment_row.invoice_status,
        'clientPaymentId', safe_operation_id
      );
  end;

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

  return jsonb_build_object(
    'replayed', false,
    'paymentId', new_payment_id,
    'shipmentId', shipment_row.id,
    'paid', computed_paid,
    'invoiceStatus', computed_invoice_status,
    'clientPaymentId', safe_operation_id
  );
end;
$$;

revoke all on function public.collect_shipment_invoice_payment(
  uuid, uuid, numeric, numeric, text, text, text, timestamptz, jsonb, numeric, text, text, text, uuid, text
) from public, anon;
grant execute on function public.collect_shipment_invoice_payment(
  uuid, uuid, numeric, numeric, text, text, text, timestamptz, jsonb, numeric, text, text, text, uuid, text
) to authenticated;

comment on function public.collect_shipment_invoice_payment(
  uuid, uuid, numeric, numeric, text, text, text, timestamptz, jsonb, numeric, text, text, text, uuid, text
) is
  'Authoritative invoice collect. Intention key is unique per organization. Same (org, client_payment_id) + shipment/amount/method = replayed jsonb; mismatch = PAYMENT_IDEMPOTENCY_CONFLICT. payment kind is derived labeling only.';
