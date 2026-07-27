-- Los días operativos pertenecen al catálogo de Rutas.
-- La configuración logística sólo administra rangos horarios, anticipación y cargos.

create or replace function public.save_logistics_axis_settings_v2(
  p_delivery_ranges text[],
  p_pickup_ranges text[],
  p_route_lead_time text,
  p_linked_route_schedules boolean,
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
  v_delivery_ranges text[] := coalesce(p_delivery_ranges, '{}'::text[]);
  v_pickup_ranges text[] := coalesce(p_pickup_ranges, '{}'::text[]);
begin
  if v_org_id is null
     or not (
       public.user_has_permission('logistics.settings.manage')
       or public.user_has_permission('settings.manage')
     ) then
    raise exception 'FORBIDDEN';
  end if;

  if cardinality(v_delivery_ranges) > 24
     or cardinality(v_pickup_ranges) > 24
     or length(coalesce(p_route_lead_time, '')) > 80
     or length(coalesce(p_empty_box_delivery_fee, '')) > 32
     or length(coalesce(p_full_box_pickup_fee, '')) > 32 then
    raise exception 'INVALID_LOGISTICS_SETTINGS';
  end if;

  if coalesce(p_linked_route_schedules, false) then
    v_pickup_ranges := v_delivery_ranges;
  end if;

  insert into public.organization_route_settings (
    organization_id,
    delivery_ranges,
    pickup_ranges,
    route_lead_time,
    linked_route_schedules,
    empty_box_delivery_fee,
    full_box_pickup_fee,
    logistics_fee_mode,
    updated_at
  ) values (
    v_org_id,
    v_delivery_ranges,
    v_pickup_ranges,
    btrim(coalesce(p_route_lead_time, '')),
    coalesce(p_linked_route_schedules, false),
    btrim(coalesce(p_empty_box_delivery_fee, '$0')),
    btrim(coalesce(p_full_box_pickup_fee, '$0')),
    'per_trip',
    now()
  )
  on conflict (organization_id) do update set
    delivery_ranges = excluded.delivery_ranges,
    pickup_ranges = excluded.pickup_ranges,
    route_lead_time = excluded.route_lead_time,
    linked_route_schedules = excluded.linked_route_schedules,
    empty_box_delivery_fee = excluded.empty_box_delivery_fee,
    full_box_pickup_fee = excluded.full_box_pickup_fee,
    logistics_fee_mode = 'per_trip',
    updated_at = now()
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.save_logistics_axis_settings_v2(text[], text[], text, boolean, text, text) from public;
grant execute on function public.save_logistics_axis_settings_v2(text[], text[], text, boolean, text, text) to authenticated;
revoke execute on function public.save_logistics_axis_settings(text[], text[], text[], text[], text, boolean, text, text) from authenticated;

create or replace function public.set_logistics_route_weekday_enabled(
  target_org_id uuid,
  target_day text,
  target_enabled boolean
)
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_days text[];
begin
  if target_org_id is null or target_day not in ('Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom') then
    raise exception 'Dia de ruta invalido';
  end if;

  if target_org_id is distinct from public.current_organization_id()
     and auth.role() <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  if auth.role() <> 'service_role'
     and not (public.user_has_permission('routes.update_status') or public.user_has_permission('sales.manage')) then
    raise exception 'Forbidden';
  end if;

  select array_agg(day order by array_position(array['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'], day))
  into normalized_days
  from (
    select distinct day
    from unnest(
      coalesce((select delivery_days from public.organization_route_settings where organization_id = target_org_id), '{}'::text[])
      || coalesce((select pickup_days from public.organization_route_settings where organization_id = target_org_id), '{}'::text[])
    ) as day
    where day = any(array['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'])
      and (target_enabled or day <> target_day)
    union
    select target_day where target_enabled
  ) normalized;

  normalized_days := coalesce(normalized_days, '{}'::text[]);

  insert into public.organization_route_settings (
    organization_id, delivery_days, pickup_days, updated_at
  ) values (
    target_org_id, normalized_days, normalized_days, now()
  )
  on conflict (organization_id) do update set
    delivery_days = excluded.delivery_days,
    pickup_days = excluded.pickup_days,
    updated_at = now();

  return normalized_days;
end;
$$;
