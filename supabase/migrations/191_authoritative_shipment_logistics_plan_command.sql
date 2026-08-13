-- Route logistics-plan writes through an authoritative command.
-- Direct authenticated updates to shipments.logistics_plan are blocked by the
-- shipment guard; this SECURITY DEFINER RPC is the server-side write path.

create or replace function public.update_shipment_logistics_plan_atomic(
  p_shipment_id uuid,
  p_logistics_plan jsonb,
  p_delivery_notes text
)
returns void
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  caller_org uuid := public.current_organization_id();
begin
  if caller_id is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if caller_org is null
     or not public.user_has_permission('sales.manage') then
    raise exception 'FORBIDDEN';
  end if;

  if p_shipment_id is null
     or p_logistics_plan is null
     or jsonb_typeof(p_logistics_plan) <> 'object' then
    raise exception 'SHIPMENT_LOGISTICS_PLAN_INVALID';
  end if;

  update public.shipments
  set
    logistics_plan = p_logistics_plan,
    delivery_notes = coalesce(p_delivery_notes, '')
  where id = p_shipment_id
    and organization_id = caller_org;

  if not found then
    raise exception 'SHIPMENT_NOT_FOUND';
  end if;
end;
$$;

revoke all on function public.update_shipment_logistics_plan_atomic(uuid, jsonb, text)
  from public, anon, authenticated;
grant execute on function public.update_shipment_logistics_plan_atomic(uuid, jsonb, text)
  to authenticated;

comment on function public.update_shipment_logistics_plan_atomic(uuid, jsonb, text) is
  'Authoritative command for logistics_plan and delivery_notes; scoped to the authenticated organization.';
