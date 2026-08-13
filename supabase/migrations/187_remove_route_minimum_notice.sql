-- Remove the overlapping exact-hour notice rule. Route booking is governed by
-- the previous-day cutoff, inherited globally or overridden per route.

drop function if exists public.save_route_booking_policy(integer, time);

alter table public.organization_route_settings
  drop constraint if exists organization_route_settings_notice_hours_check,
  drop column if exists route_minimum_notice_hours;

create or replace function public.save_route_booking_policy(
  p_booking_cutoff_time time
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
       public.user_has_permission('routes.update_status')
       or public.user_has_permission('settings.manage')
     ) then
    raise exception 'FORBIDDEN';
  end if;

  insert into public.organization_route_settings (
    organization_id,
    route_booking_cutoff_time,
    updated_at
  ) values (
    v_org_id,
    p_booking_cutoff_time,
    now()
  )
  on conflict (organization_id) do update set
    route_booking_cutoff_time = excluded.route_booking_cutoff_time,
    updated_at = now()
  returning * into v_result;

  return v_result;
end;
$$;

comment on function public.save_route_booking_policy(time) is
  'Saves the organization-wide previous-day cutoff used by routes without an override.';

revoke all on function public.save_route_booking_policy(time) from public;
grant execute on function public.save_route_booking_policy(time) to authenticated;
