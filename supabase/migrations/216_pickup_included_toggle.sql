-- Allow organizations to explicitly enable or disable the included pickup window.

alter table public.organization_route_settings
  add column if not exists pickup_included_enabled boolean not null default true;

create or replace function public.save_sales_axis_settings_v3(
  p_schedule_suggestions jsonb,
  p_minimum_deposit text,
  p_pickup_included_enabled boolean,
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
     or not (public.user_has_permission('sales.settings.manage') or public.user_has_permission('settings.manage')) then
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
    organization_id, schedule_suggestions, minimum_deposit,
    pickup_included_enabled, pickup_included_days, late_pickup_fee,
    pending_allowed, accepted_payment_methods, driver_payment_methods,
    default_payment_method, payment_reference_required_methods, updated_at
  ) values (
    v_org_id, p_schedule_suggestions, btrim(coalesce(p_minimum_deposit, '$0')),
    coalesce(p_pickup_included_enabled, true), p_pickup_included_days, v_late_fee,
    coalesce(p_pending_allowed, true), v_accepted, v_driver,
    v_default, v_references, now()
  )
  on conflict (organization_id) do update set
    schedule_suggestions = excluded.schedule_suggestions,
    minimum_deposit = excluded.minimum_deposit,
    pickup_included_enabled = excluded.pickup_included_enabled,
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
  jsonb, text, boolean, integer, text, boolean, text[], text[], text, text[]
) from public, anon;
grant execute on function public.save_sales_axis_settings_v3(
  jsonb, text, boolean, integer, text, boolean, text[], text[], text, text[]
) to authenticated;
