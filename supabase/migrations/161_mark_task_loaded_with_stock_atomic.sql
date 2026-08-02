-- Atomic task load + empty-box stock deduction (replaces fragile TS rollback).

create or replace function public.mark_logistics_task_loaded_with_stock_atomic(
  p_task_id uuid,
  p_warehouse_id uuid,
  p_item_id uuid,
  p_item_name text,
  p_qty numeric,
  p_movement_key text,
  p_client_operation_id text default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  caller_org uuid := public.current_organization_id();
  task_row public.shipment_logistics_tasks;
  movement jsonb;
  now_ts timestamptz := now();
begin
  if caller_id is null or caller_org is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if not (
    public.user_has_permission('routes.update_status')
    or public.user_has_permission('sales.manage')
  ) then
    raise exception 'FORBIDDEN';
  end if;

  if p_warehouse_id is null or p_item_id is null or coalesce(p_qty, 0) <= 0 then
    raise exception 'INVALID_STOCK_DEDUCTION';
  end if;

  if not public.user_can_access_warehouse(p_warehouse_id) then
    raise exception 'FORBIDDEN';
  end if;

  select * into task_row
  from public.shipment_logistics_tasks
  where id = p_task_id
    and organization_id = caller_org
  for update;

  if task_row.id is null then
    raise exception 'TASK_NOT_FOUND';
  end if;

  if task_row.stock_deducted_at is not null and task_row.status = 'loaded_to_truck' then
    return jsonb_build_object(
      'replayed', true,
      'taskId', task_row.id,
      'warehouseId', task_row.warehouse_id,
      'stockDeductedAt', task_row.stock_deducted_at
    );
  end if;

  if task_row.task_type is distinct from 'deliver_empty_box' then
    raise exception 'STOCK_DEDUCTION_TASK_TYPE_INVALID';
  end if;

  if task_row.status not in ('assigned', 'scheduled', 'pending', 'loaded_to_truck') then
    raise exception 'TASK_NOT_EXECUTABLE';
  end if;

  movement := public.record_inventory_movement_atomic(
    caller_org,
    p_warehouse_id,
    p_item_id,
    coalesce(nullif(btrim(p_item_name), ''), 'Caja vacia'),
    'salida',
    p_qty,
    'Carga a camion / entrega caja vacia',
    caller_id,
    null::uuid,
    'logistics_load',
    'warehouse',
    p_warehouse_id,
    '',
    'truck',
    null::uuid,
    '',
    'shipment',
    task_row.shipment_id,
    '{}'::jsonb,
    null::uuid,
    null::uuid,
    null::uuid,
    coalesce(nullif(btrim(p_movement_key), ''), 'task-load:' || task_row.id::text),
    null::numeric,
    null::numeric
  );

  update public.shipment_logistics_tasks
  set
    status = 'loaded_to_truck',
    warehouse_id = p_warehouse_id,
    loaded_at = coalesce(loaded_at, now_ts),
    stock_deducted_at = now_ts,
    updated_at = now_ts
  where id = task_row.id
    and organization_id = caller_org;

  return jsonb_build_object(
    'replayed', false,
    'taskId', task_row.id,
    'warehouseId', p_warehouse_id,
    'stockDeductedAt', now_ts,
    'movement', movement,
    'clientOperationId', p_client_operation_id
  );
end;
$$;

revoke all on function public.mark_logistics_task_loaded_with_stock_atomic(
  uuid, uuid, uuid, text, numeric, text, text
) from public, anon;
grant execute on function public.mark_logistics_task_loaded_with_stock_atomic(
  uuid, uuid, uuid, text, numeric, text, text
) to authenticated;
