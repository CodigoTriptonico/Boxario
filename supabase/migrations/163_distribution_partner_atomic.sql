-- Atomic distribution partner activation / status changes (no Promise.all partial writes).

create or replace function public.distribution_set_partner_active_atomic(
  p_partner_id uuid,
  p_is_active boolean,
  p_reason text default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  caller_org uuid := public.current_organization_id();
  partner_row public.distribution_partners;
begin
  if auth.role() = 'service_role' then
    if caller_id is null then
      -- service role without JWT: require partner parent org match via explicit lookup below
      null;
    end if;
  elsif caller_id is null or caller_org is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if auth.role() <> 'service_role' and not (
    public.user_has_permission('distribution.manage')
    or public.user_has_permission('distribution.acquire')
    or public.user_has_permission('settings.manage')
  ) then
    raise exception 'FORBIDDEN';
  end if;

  select * into partner_row
  from public.distribution_partners
  where id = p_partner_id
    and (caller_org is null or parent_organization_id = caller_org)
  for update;

  if partner_row.id is null then
    raise exception 'PARTNER_NOT_FOUND';
  end if;

  update public.distribution_partners
  set is_active = coalesce(p_is_active, false),
      updated_at = now()
  where id = partner_row.id;

  update public.organizations
  set is_active = coalesce(p_is_active, false)
  where id = partner_row.distributor_organization_id;

  update public.profiles
  set is_active = coalesce(p_is_active, false)
  where organization_id = partner_row.distributor_organization_id;

  insert into public.activity_history (
    organization_id, actor_id, actor_name, action, entity_type, entity_id,
    title, description, metadata
  )
  select
    partner_row.parent_organization_id,
    coalesce(caller_id, partner_row.acquisition_owner_id),
    coalesce(nullif(btrim(profile.full_name), ''), profile.email, 'system'),
    'distribution.partner_status',
    'distribution_partner',
    partner_row.id,
    case when coalesce(p_is_active, false) then 'Distribuidor activado' else 'Distribuidor desactivado' end,
    left(coalesce(p_reason, ''), 500),
    jsonb_build_object('partnerId', partner_row.id, 'isActive', coalesce(p_is_active, false))
  from public.profiles profile
  where profile.id = coalesce(caller_id, partner_row.acquisition_owner_id);

  return jsonb_build_object(
    'partnerId', partner_row.id,
    'isActive', coalesce(p_is_active, false)
  );
end;
$$;

create or replace function public.distribution_finalize_acquired_partner_atomic(
  p_distributor_organization_id uuid,
  p_distributor_user_id uuid,
  p_distributor_role_id uuid,
  p_permission_id uuid
) returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  caller_org uuid := public.current_organization_id();
begin
  if auth.role() <> 'service_role' then
    if caller_id is null or caller_org is null then
      raise exception 'UNAUTHORIZED';
    end if;

    if not (
      public.user_has_permission('distribution.manage')
      or public.user_has_permission('distribution.acquire')
    ) then
      raise exception 'FORBIDDEN';
    end if;
  end if;

  if not exists (
    select 1 from public.organizations
    where id = p_distributor_organization_id
  ) then
    raise exception 'ORG_NOT_FOUND';
  end if;

  insert into public.role_permissions (role_id, permission_id, granted)
  values (p_distributor_role_id, p_permission_id, true)
  on conflict do nothing;

  update public.profiles
  set role_id = p_distributor_role_id,
      is_active = false
  where id = p_distributor_user_id
    and organization_id = p_distributor_organization_id;

  update public.organizations
  set is_active = false
  where id = p_distributor_organization_id;
end;
$$;

revoke all on function public.distribution_set_partner_active_atomic(uuid, boolean, text) from public, anon;
grant execute on function public.distribution_set_partner_active_atomic(uuid, boolean, text) to authenticated, service_role;

revoke all on function public.distribution_finalize_acquired_partner_atomic(uuid, uuid, uuid, uuid) from public, anon;
grant execute on function public.distribution_finalize_acquired_partner_atomic(uuid, uuid, uuid, uuid) to authenticated, service_role;
