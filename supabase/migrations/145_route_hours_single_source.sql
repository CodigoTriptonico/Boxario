-- Los horarios operativos pertenecen a logistics_route_templates.
-- La configuración logística conserva sólo anticipación y cargos sugeridos.

create or replace function public.save_logistics_axis_settings_v3(
  p_route_lead_time text,
  p_empty_box_delivery_fee text,
  p_full_box_pickup_fee text
)
returns public.organization_route_settings
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_org_id uuid := public.current_organization_id();
  v_result public.organization_route_settings;
begin
  if v_org_id is null
     or not (
       public.user_has_permission('logistics.settings.manage')
       or public.user_has_permission('settings.manage')
     ) then
    raise exception 'FORBIDDEN';
  end if;

  if length(coalesce(p_route_lead_time, '')) > 80
     or length(coalesce(p_empty_box_delivery_fee, '')) > 32
     or length(coalesce(p_full_box_pickup_fee, '')) > 32 then
    raise exception 'INVALID_LOGISTICS_SETTINGS';
  end if;

  insert into public.organization_route_settings (
    organization_id,
    route_lead_time,
    empty_box_delivery_fee,
    full_box_pickup_fee,
    logistics_fee_mode,
    updated_at
  ) values (
    v_org_id,
    btrim(coalesce(p_route_lead_time, '')),
    btrim(coalesce(p_empty_box_delivery_fee, '$0')),
    btrim(coalesce(p_full_box_pickup_fee, '$0')),
    'per_trip',
    now()
  )
  on conflict (organization_id) do update set
    route_lead_time = excluded.route_lead_time,
    empty_box_delivery_fee = excluded.empty_box_delivery_fee,
    full_box_pickup_fee = excluded.full_box_pickup_fee,
    logistics_fee_mode = 'per_trip',
    updated_at = now()
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.save_logistics_axis_settings_v3(text, text, text) from public;
grant execute on function public.save_logistics_axis_settings_v3(text, text, text) to authenticated;
revoke execute on function public.save_logistics_axis_settings_v2(text[], text[], text, boolean, text, text) from authenticated;
