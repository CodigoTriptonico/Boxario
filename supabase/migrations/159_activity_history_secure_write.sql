-- activity_history: deny direct client inserts; write only via secure RPC.
-- Operational journal remains separate from immutable_audit_events (platform/tenant ledger).

create or replace function public.record_activity_history(
  p_action text,
  p_entity_type text,
  p_entity_id uuid,
  p_title text,
  p_description text default '',
  p_metadata jsonb default '{}'::jsonb,
  p_organization_id uuid default null,
  p_actor_id uuid default null,
  p_actor_name text default null
) returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  caller_org uuid := public.current_organization_id();
  actor_id uuid;
  org_id uuid;
  actor_name text;
  inserted_id uuid;
begin
  if auth.role() = 'service_role' then
    if p_organization_id is null or p_actor_id is null then
      raise exception 'UNAUTHORIZED';
    end if;
    org_id := p_organization_id;
    actor_id := p_actor_id;
    actor_name := left(coalesce(nullif(btrim(p_actor_name), ''), ''), 160);
  else
    if caller_id is null or caller_org is null then
      raise exception 'UNAUTHORIZED';
    end if;
    org_id := caller_org;
    actor_id := caller_id;
    select coalesce(nullif(btrim(full_name), ''), email, '')
    into actor_name
    from public.profiles
    where id = caller_id;
  end if;

  if not (
    auth.role() = 'service_role'
    or public.user_has_permission('sales.manage')
    or public.user_has_permission('customers.manage')
    or public.user_has_permission('routes.update_status')
    or public.user_has_permission('settings.manage')
    or public.user_has_permission('accounting.post')
    or public.user_has_permission('logistics.settings.manage')
    or public.current_role_slug() = 'conductor'
  ) then
    raise exception 'FORBIDDEN';
  end if;

  if coalesce(nullif(btrim(p_action), ''), '') = ''
     or coalesce(nullif(btrim(p_entity_type), ''), '') = ''
     or coalesce(nullif(btrim(p_title), ''), '') = '' then
    raise exception 'INVALID_ACTIVITY_PAYLOAD';
  end if;

  insert into public.activity_history (
    organization_id,
    actor_id,
    actor_name,
    action,
    entity_type,
    entity_id,
    title,
    description,
    metadata
  ) values (
    org_id,
    actor_id,
    coalesce(actor_name, ''),
    left(btrim(p_action), 120),
    left(btrim(p_entity_type), 80),
    p_entity_id,
    left(btrim(p_title), 200),
    left(coalesce(p_description, ''), 1000),
    case
      when jsonb_typeof(coalesce(p_metadata, '{}'::jsonb)) = 'object' then p_metadata
      else '{}'::jsonb
    end
  )
  returning id into inserted_id;

  return inserted_id;
end;
$$;

revoke all on function public.record_activity_history(
  text, text, uuid, text, text, jsonb, uuid, uuid, text
) from public, anon;
grant execute on function public.record_activity_history(
  text, text, uuid, text, text, jsonb, uuid, uuid, text
) to authenticated, service_role;

drop policy if exists activity_history_insert on public.activity_history;

comment on table public.activity_history is
  'Operational activity journal. Writes only via record_activity_history RPC. Distinct from immutable_audit_events (tenant financial/compliance ledger).';
