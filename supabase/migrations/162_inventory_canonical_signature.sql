-- Consolidate inventory movement to the canonical 25-arg cost-aware signature.
-- Harden reverse helper auth; drop legacy overloads once reverse uses explicit 25-arg call.

create or replace function public.reverse_inventory_salidas_for_shipment(
  p_organization_id uuid,
  p_shipment_id uuid,
  p_actor_id uuid,
  p_operation_key text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  caller_org uuid := public.current_organization_id();
  effective_org uuid;
  effective_actor uuid;
  movement_row record;
  reversed_count integer := 0;
  reverse_key text;
begin
  if auth.role() = 'service_role' then
    if p_organization_id is null or p_actor_id is null then
      raise exception 'UNAUTHORIZED';
    end if;
    effective_org := p_organization_id;
    effective_actor := p_actor_id;
  else
    if caller_id is null or caller_org is null then
      raise exception 'UNAUTHORIZED';
    end if;
    if p_organization_id is distinct from caller_org then
      raise exception 'FORBIDDEN';
    end if;
    if not public.user_has_permission('inventory.adjust')
       and not public.user_has_permission('routes.update_status')
       and not public.user_has_permission('sales.manage') then
      raise exception 'FORBIDDEN';
    end if;
    effective_org := caller_org;
    effective_actor := caller_id;
  end if;

  if coalesce(nullif(btrim(p_operation_key), ''), '') = '' then
    raise exception 'OPERATION_KEY_REQUIRED';
  end if;

  for movement_row in
    select movement.*
    from public.inventory_movements movement
    where movement.organization_id = effective_org
      and movement.type = 'salida'
      and (
        (
          movement.reference_type = 'shipment'
          and movement.reference_id = p_shipment_id
        )
        or exists (
          select 1
          from public.inventory_shipment_ref_links link
          where link.organization_id = effective_org
            and link.movement_id = movement.id
            and link.shipment_id = p_shipment_id
        )
      )
    order by movement.created_at asc
  loop
    reverse_key := 'reverse:' || coalesce(movement_row.movement_key, movement_row.id::text) || ':' || p_operation_key;

    if exists (
      select 1 from public.inventory_movements existing
      where existing.organization_id = effective_org
        and existing.movement_key = reverse_key
    ) then
      continue;
    end if;

    if exists (
      select 1 from public.inventory_movements existing
      where existing.organization_id = effective_org
        and existing.reversal_of_movement_id = movement_row.id
    ) then
      continue;
    end if;

    perform public.record_inventory_movement_atomic(
      effective_org,
      movement_row.warehouse_id,
      movement_row.item_id,
      movement_row.item_name,
      'entrada'::text,
      movement_row.qty,
      'Reverso exacto envio'::text,
      effective_actor,
      null::uuid,
      'correction_reversal'::text,
      null::text,
      null::uuid,
      ''::text,
      null::text,
      null::uuid,
      ''::text,
      'shipment'::text,
      p_shipment_id,
      '{}'::jsonb,
      null::uuid,
      null::uuid,
      movement_row.id,
      reverse_key,
      null::numeric,
      null::numeric
    );
    reversed_count := reversed_count + 1;
  end loop;

  return jsonb_build_object(
    'reversedCount', reversed_count,
    'shipmentId', p_shipment_id,
    'actorId', effective_actor,
    'organizationId', effective_org
  );
end;
$$;

revoke all on function public.reverse_inventory_salidas_for_shipment(uuid, uuid, uuid, text)
  from public, anon;
grant execute on function public.reverse_inventory_salidas_for_shipment(uuid, uuid, uuid, text)
  to authenticated, service_role;

-- Drop legacy overloads. Canonical remains the 25-arg cost-aware function.
do $$
declare
  proc record;
begin
  for proc in
    select p.oid, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'record_inventory_movement_atomic'
  loop
    if proc.args not like '%p_unit_cost%' then
      execute format('drop function public.record_inventory_movement_atomic(%s)', proc.args);
    end if;
  end loop;
end;
$$;
