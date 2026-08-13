-- Organization-owned payment methods for office sales and route collections.

alter table public.organization_route_settings
  add column if not exists accepted_payment_methods text[] not null default array[
    'cash','card','check','zelle','venmo','paypal','cash_app','bank_transfer','deposit','other'
  ]::text[],
  add column if not exists driver_payment_methods text[] not null default array[
    'cash','card','check','zelle','venmo','paypal','cash_app','bank_transfer','deposit','other'
  ]::text[],
  add column if not exists default_payment_method text not null default 'cash',
  add column if not exists payment_reference_required_methods text[] not null default '{}'::text[];

alter table public.organization_route_settings
  drop constraint if exists organization_route_settings_accepted_payment_methods_check,
  add constraint organization_route_settings_accepted_payment_methods_check check (
    cardinality(accepted_payment_methods) between 1 and 10
    and accepted_payment_methods <@ array[
      'cash','card','check','zelle','venmo','paypal','cash_app','bank_transfer','deposit','other'
    ]::text[]
  ),
  drop constraint if exists organization_route_settings_driver_payment_methods_check,
  add constraint organization_route_settings_driver_payment_methods_check check (
    driver_payment_methods <@ accepted_payment_methods
  ),
  drop constraint if exists organization_route_settings_default_payment_method_check,
  add constraint organization_route_settings_default_payment_method_check check (
    default_payment_method = any(accepted_payment_methods)
  ),
  drop constraint if exists organization_route_settings_reference_payment_methods_check,
  add constraint organization_route_settings_reference_payment_methods_check check (
    payment_reference_required_methods <@ accepted_payment_methods
  );

create or replace function public.save_sales_axis_settings_v2(
  p_schedule_suggestions jsonb,
  p_minimum_deposit text,
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

revoke all on function public.save_sales_axis_settings_v2(
  jsonb, text, boolean, text[], text[], text, text[]
) from public;
grant execute on function public.save_sales_axis_settings_v2(
  jsonb, text, boolean, text[], text[], text, text[]
) to authenticated;
revoke execute on function public.save_sales_axis_settings(jsonb, text, boolean) from authenticated;

drop policy if exists organization_route_settings_select on public.organization_route_settings;
create policy organization_route_settings_select on public.organization_route_settings for select
  using (
    organization_id = public.current_organization_id()
    and (
      public.user_has_permission('settings.manage')
      or public.user_has_permission('sales.manage')
      or public.user_has_permission('sales.settings.manage')
      or public.user_has_permission('logistics.settings.manage')
      or public.user_has_permission('routes.update_status')
    )
  );

comment on column public.organization_route_settings.minimum_deposit is
  'Configured deposit per box. The sale snapshot multiplies it by the number of boxes and caps it at the quoted total.';

