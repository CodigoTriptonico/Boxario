-- Atomic warehouse movement + truck inventory event(s) for conductor load/return/transfer.

create or replace function public.conductor_truck_inventory_move_atomic(
  p_driver_id uuid,
  p_source_vehicle_id uuid,
  p_warehouse_id uuid,
  p_item_id uuid,
  p_item_name text,
  p_catalog_key text,
  p_item_label text,
  p_qty numeric,
  p_note text,
  p_route_id uuid,
  p_mode text,
  p_target_vehicle_id uuid default null,
  p_client_operation_id text default null
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  caller_org uuid := public.current_organization_id();
  effective_driver uuid;
  mode_value text := lower(btrim(coalesce(p_mode, '')));
  qty_value numeric := coalesce(p_qty, 0);
  note_value text := left(coalesce(p_note, ''), 500);
  item_name_value text := left(coalesce(nullif(btrim(p_item_name), ''), nullif(btrim(p_item_label), ''), 'Caja'), 200);
  catalog_key_value text := left(coalesce(p_catalog_key, ''), 200);
  item_label_value text := left(coalesce(nullif(btrim(p_item_label), ''), item_name_value), 200);
  movement jsonb;
  movement_type text;
  movement_key text;
  source_event_id uuid;
  target_event_id uuid;
  reason_code text;
  from_type text;
  from_id uuid;
  from_label text;
  to_type text;
  to_id uuid;
  to_label text;
begin
  if caller_id is null or caller_org is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if mode_value not in ('load', 'return_warehouse', 'transfer_vehicle') then
    raise exception 'INVALID_TRUCK_MOVE_MODE';
  end if;

  if p_source_vehicle_id is null or p_item_id is null or qty_value <= 0 then
    raise exception 'INVALID_TRUCK_MOVE';
  end if;

  if mode_value <> 'transfer_vehicle' and p_warehouse_id is null then
    raise exception 'WAREHOUSE_REQUIRED';
  end if;

  if mode_value = 'transfer_vehicle' then
    if p_target_vehicle_id is null or p_target_vehicle_id is not distinct from p_source_vehicle_id then
      raise exception 'TRANSFER_VEHICLE_REQUIRED';
    end if;
  end if;

  if public.user_has_permission('routes.update_status')
     and p_driver_id is not null
     and p_driver_id is distinct from caller_id then
    effective_driver := p_driver_id;
  else
    if not (
      public.user_has_permission('routes.update_status')
      or public.current_role_slug() = 'conductor'
    ) then
      raise exception 'FORBIDDEN';
    end if;
    effective_driver := caller_id;
    if p_driver_id is not null and p_driver_id is distinct from caller_id then
      raise exception 'FORBIDDEN';
    end if;
  end if;

  if not exists (
    select 1 from public.profiles
    where id = effective_driver
      and organization_id = caller_org
      and is_active
  ) then
    raise exception 'DRIVER_NOT_FOUND';
  end if;

  if not exists (
    select 1 from public.logistics_vehicles
    where id = p_source_vehicle_id
      and organization_id = caller_org
      and is_active
  ) then
    raise exception 'VEHICLE_NOT_FOUND';
  end if;

  if mode_value = 'transfer_vehicle' and not exists (
    select 1 from public.logistics_vehicles
    where id = p_target_vehicle_id
      and organization_id = caller_org
      and is_active
  ) then
    raise exception 'TARGET_VEHICLE_NOT_FOUND';
  end if;

  if mode_value <> 'transfer_vehicle' then
    if not public.user_can_access_warehouse(p_warehouse_id) then
      raise exception 'FORBIDDEN';
    end if;

    if mode_value = 'load' then
      movement_type := 'salida';
      reason_code := 'unspecified';
      from_type := 'warehouse';
      from_id := p_warehouse_id;
      from_label := '';
      to_type := 'truck';
      to_id := p_source_vehicle_id;
      to_label := '';
    else
      movement_type := 'devolucion';
      reason_code := 'unspecified';
      from_type := 'truck';
      from_id := p_source_vehicle_id;
      from_label := '';
      to_type := 'warehouse';
      to_id := p_warehouse_id;
      to_label := '';
    end if;

    movement_key := coalesce(
      nullif(btrim(p_client_operation_id), ''),
      'truck-move:' || mode_value || ':' || effective_driver::text || ':' || p_source_vehicle_id::text || ':' || p_item_id::text || ':' || qty_value::text || ':' || extract(epoch from now())::bigint::text
    );

    movement := public.record_inventory_movement_atomic(
      caller_org,
      p_warehouse_id,
      p_item_id,
      item_name_value,
      movement_type,
      qty_value,
      note_value,
      caller_id,
      effective_driver,
      reason_code,
      from_type,
      from_id,
      from_label,
      to_type,
      to_id,
      to_label,
      null::text,
      null::uuid,
      jsonb_build_object('mode', mode_value, 'routeId', p_route_id),
      null::uuid,
      null::uuid,
      null::uuid,
      movement_key,
      null::numeric,
      null::numeric
    );
  end if;

  if mode_value = 'transfer_vehicle' then
    insert into public.logistics_truck_inventory_events (
      organization_id, assigned_driver_id, vehicle_id, route_id, warehouse_id,
      item_id, item_name, catalog_key, item_label, event_type, qty, note, created_by
    ) values (
      caller_org, effective_driver, p_source_vehicle_id, p_route_id, p_warehouse_id,
      p_item_id, item_name_value, catalog_key_value, item_label_value, 'return', qty_value, note_value, caller_id
    ) returning id into source_event_id;

    insert into public.logistics_truck_inventory_events (
      organization_id, assigned_driver_id, vehicle_id, route_id, warehouse_id,
      item_id, item_name, catalog_key, item_label, event_type, qty, note, created_by
    ) values (
      caller_org, effective_driver, p_target_vehicle_id, p_route_id, p_warehouse_id,
      p_item_id, item_name_value, catalog_key_value, item_label_value, 'load', qty_value, note_value, caller_id
    ) returning id into target_event_id;
  else
    insert into public.logistics_truck_inventory_events (
      organization_id, assigned_driver_id, vehicle_id, route_id, warehouse_id,
      item_id, item_name, catalog_key, item_label, event_type, qty, note, created_by
    ) values (
      caller_org, effective_driver, p_source_vehicle_id, p_route_id, p_warehouse_id,
      p_item_id, item_name_value, catalog_key_value, item_label_value,
      case when mode_value = 'load' then 'load' else 'return' end,
      qty_value, note_value, caller_id
    ) returning id into source_event_id;
  end if;

  return jsonb_build_object(
    'replayed', false,
    'mode', mode_value,
    'driverId', effective_driver,
    'sourceEventId', source_event_id,
    'targetEventId', target_event_id,
    'movement', movement,
    'clientOperationId', p_client_operation_id
  );
end;
$$;

revoke all on function public.conductor_truck_inventory_move_atomic(
  uuid, uuid, uuid, uuid, text, text, text, numeric, text, uuid, text, uuid, text
) from public, anon;
grant execute on function public.conductor_truck_inventory_move_atomic(
  uuid, uuid, uuid, uuid, text, text, text, numeric, text, uuid, text, uuid, text
) to authenticated;
