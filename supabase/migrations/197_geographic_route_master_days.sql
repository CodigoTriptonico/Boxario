-- Geographic routes own their schedules. The Monday-Sunday switches are only
-- master availability flags and must not write the legacy pickup_days column or
-- require a legacy logistics_weekday_defaults row before a day can be enabled.

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
  if target_org_id is null
     or target_day not in ('Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom') then
    raise exception 'Dia de ruta invalido';
  end if;

  if target_org_id is distinct from public.current_organization_id()
     and auth.role() <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  if auth.role() <> 'service_role'
     and not (
       public.user_has_permission('routes.update_status')
       or public.user_has_permission('sales.manage')
     ) then
    raise exception 'Forbidden';
  end if;

  select array_agg(
    day
    order by array_position(array['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'], day)
  )
  into normalized_days
  from (
    select distinct day
    from unnest(
      coalesce(
        (
          select delivery_days
          from public.organization_route_settings
          where organization_id = target_org_id
        ),
        '{}'::text[]
      )
    ) as day
    where day = any(array['Lun', 'Mar', 'Mie', 'Jue', 'Vie', 'Sab', 'Dom'])
      and (target_enabled or day <> target_day)
    union
    select target_day where target_enabled
  ) normalized;

  normalized_days := coalesce(normalized_days, '{}'::text[]);

  insert into public.organization_route_settings (
    organization_id,
    delivery_days,
    linked_route_schedules,
    updated_at
  ) values (
    target_org_id,
    normalized_days,
    true,
    now()
  )
  on conflict (organization_id) do update set
    delivery_days = excluded.delivery_days,
    linked_route_schedules = true,
    updated_at = now();

  return normalized_days;
end;
$$;

revoke all on function public.set_logistics_route_weekday_enabled(uuid, text, boolean)
  from public;
grant execute on function public.set_logistics_route_weekday_enabled(uuid, text, boolean)
  to authenticated, service_role;

comment on function public.set_logistics_route_weekday_enabled(uuid, text, boolean) is
  'Updates geographic-route master weekdays in delivery_days only. Route hours live in logistics_route_schedules; pickup_days is legacy and untouched.';

