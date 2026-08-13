-- Move item quantities between warehouse bins in one transaction.

create or replace function public.transfer_inventory_bin_stock_atomic(
  target_org_id uuid,
  p_warehouse_id uuid,
  p_item_id uuid,
  p_from_bin_id uuid,
  p_to_bin_id uuid,
  p_qty numeric
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  source_row public.inventory_bin_stock%rowtype;
  destination_row public.inventory_bin_stock%rowtype;
  stock_row public.inventory_stock%rowtype;
  source_bin public.warehouse_bins%rowtype;
  destination_bin public.warehouse_bins%rowtype;
begin
  if target_org_id is null
     or target_org_id is distinct from public.current_organization_id() then
    raise exception 'Forbidden';
  end if;

  if not public.user_has_permission('inventory.adjust')
     or not public.user_can_access_warehouse(p_warehouse_id) then
    raise exception 'Forbidden';
  end if;

  if p_qty is null or p_qty <= 0 then
    raise exception 'Cantidad invalida';
  end if;

  if p_from_bin_id is null or p_to_bin_id is null or p_from_bin_id = p_to_bin_id then
    raise exception 'Origen y destino deben ser distintos';
  end if;

  select * into source_bin
  from public.warehouse_bins
  where id = p_from_bin_id
    and organization_id = target_org_id
    and warehouse_id = p_warehouse_id
    and is_active;

  select * into destination_bin
  from public.warehouse_bins
  where id = p_to_bin_id
    and organization_id = target_org_id
    and warehouse_id = p_warehouse_id
    and is_active;

  if source_bin.id is null or destination_bin.id is null then
    raise exception 'Estante no encontrado';
  end if;

  -- The aggregate stock row serializes every bin move for this item/warehouse.
  select * into stock_row
  from public.inventory_stock
  where organization_id = target_org_id
    and warehouse_id = p_warehouse_id
    and item_id = p_item_id
  for update;

  if stock_row.id is null then
    raise exception 'Stock no encontrado';
  end if;

  select * into source_row
  from public.inventory_bin_stock
  where organization_id = target_org_id
    and warehouse_id = p_warehouse_id
    and item_id = p_item_id
    and bin_id = p_from_bin_id
  for update;

  if source_row.id is null or source_row.quantity < p_qty then
    raise exception 'No hay suficiente stock en el estante de origen';
  end if;

  select * into destination_row
  from public.inventory_bin_stock
  where organization_id = target_org_id
    and warehouse_id = p_warehouse_id
    and item_id = p_item_id
    and bin_id = p_to_bin_id
  for update;

  if source_row.quantity = p_qty then
    delete from public.inventory_bin_stock where id = source_row.id;
  else
    update public.inventory_bin_stock
    set quantity = quantity - p_qty,
        updated_at = now()
    where id = source_row.id;
  end if;

  if destination_row.id is null then
    insert into public.inventory_bin_stock (
      organization_id,
      warehouse_id,
      bin_id,
      item_id,
      quantity,
      updated_at
    ) values (
      target_org_id,
      p_warehouse_id,
      p_to_bin_id,
      p_item_id,
      p_qty,
      now()
    );
  else
    update public.inventory_bin_stock
    set quantity = quantity + p_qty,
        updated_at = now()
    where id = destination_row.id;
  end if;

  return jsonb_build_object(
    'fromBinId', p_from_bin_id,
    'toBinId', p_to_bin_id,
    'quantity', p_qty
  );
end;
$$;

revoke all on function public.transfer_inventory_bin_stock_atomic(
  uuid, uuid, uuid, uuid, uuid, numeric
) from public, anon;

grant execute on function public.transfer_inventory_bin_stock_atomic(
  uuid, uuid, uuid, uuid, uuid, numeric
) to authenticated;
