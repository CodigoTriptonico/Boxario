-- Enabled route days: single write column delivery_days (LOG-001).
-- pickup_days is no longer written; list reads delivery_days only.
-- Deprecation: drop pickup_days in a later migration after confirming no readers.

create or replace function public.list_logistics_route_weekdays(target_org_id uuid)
returns text[]
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  configured_days text[];
begin
  if target_org_id is null then
    raise exception 'Organizacion invalida';
  end if;

  if target_org_id is distinct from public.current_organization_id()
     and auth.role() <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  if auth.role() <> 'service_role'
     and not (
       public.user_has_permission('routes.view')
       or public.user_has_permission('sales.manage')
     ) then
    raise exception 'Forbidden';
  end if;

  select array_agg(day order by array_position(array['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'], day))
  into configured_days
  from public.organization_route_settings settings
  cross join lateral (
    select distinct day
    from unnest(coalesce(settings.delivery_days, '{}'::text[])) as day
    where day = any(array['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'])
  ) normalized
  where settings.organization_id = target_org_id;

  return coalesce(configured_days, '{}'::text[]);
end;
$$;

create or replace function public.set_logistics_route_weekday_enabled(
  target_org_id uuid,
  target_day text,
  target_enabled boolean
)
returns text[]
language plpgsql
security definer
set search_path = pg_catalog, public
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
    ) as day
    where day = any(array['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'])
      and (target_enabled or day <> target_day)
    union
    select target_day where target_enabled
  ) normalized;

  normalized_days := coalesce(normalized_days, '{}'::text[]);

  insert into public.organization_route_settings (
    organization_id, delivery_days, updated_at
  ) values (
    target_org_id, normalized_days, now()
  )
  on conflict (organization_id) do update set
    delivery_days = excluded.delivery_days,
    updated_at = now();

  return normalized_days;
end;
$$;

comment on column public.organization_route_settings.delivery_days is
  'Autoridad vigente de dias operativos (LOG-001). pickup_days es legado de solo lectura.';
comment on column public.organization_route_settings.pickup_days is
  'LEGACY: ya no se escribe desde set_logistics_route_weekday_enabled (164). Plan de deprecacion: eliminar tras confirmar cero lectores.';
