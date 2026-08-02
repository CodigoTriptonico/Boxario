-- Call the cost-aware overload explicitly to avoid ambiguity.

create or replace function public.reverse_inventory_salidas_for_shipment(
  p_organization_id uuid,
  p_shipment_id uuid,
  p_actor_id uuid,
  p_operation_key text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  movement_row record;
  reversed_count integer := 0;
  reverse_key text;
begin
  if coalesce(nullif(btrim(p_operation_key), ''), '') = '' then
    raise exception 'OPERATION_KEY_REQUIRED';
  end if;

  for movement_row in
    select movement.*
    from public.inventory_movements movement
    where movement.organization_id = p_organization_id
      and movement.type = 'salida'
      and (
        (
          movement.reference_type = 'shipment'
          and movement.reference_id = p_shipment_id
        )
        or exists (
          select 1
          from public.inventory_shipment_ref_links link
          where link.organization_id = p_organization_id
            and link.movement_id = movement.id
            and link.shipment_id = p_shipment_id
        )
      )
    order by movement.created_at asc
  loop
    reverse_key := 'reverse:' || coalesce(movement_row.movement_key, movement_row.id::text) || ':' || p_operation_key;

    if exists (
      select 1 from public.inventory_movements existing
      where existing.organization_id = p_organization_id
        and existing.movement_key = reverse_key
    ) then
      continue;
    end if;

    if exists (
      select 1 from public.inventory_movements existing
      where existing.organization_id = p_organization_id
        and existing.reversal_of_movement_id = movement_row.id
    ) then
      continue;
    end if;

    perform public.record_inventory_movement_atomic(
      p_organization_id,
      movement_row.warehouse_id,
      movement_row.item_id,
      movement_row.item_name,
      'entrada'::text,
      movement_row.qty,
      'Reverso exacto envio'::text,
      p_actor_id,
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

  return jsonb_build_object('reversedCount', reversed_count, 'shipmentId', p_shipment_id);
end;
$$;

revoke execute on function public.reverse_inventory_salidas_for_shipment(uuid, uuid, uuid, text)
  from public, anon;
grant execute on function public.reverse_inventory_salidas_for_shipment(uuid, uuid, uuid, text)
  to authenticated, service_role;
