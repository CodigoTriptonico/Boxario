-- Atomic logistics task update with multi-line empty-box stock deduction.
-- Replaces TS compensatory rollback for updateLogisticsTaskAction.
-- mark_logistics_task_loaded_with_stock_atomic remains a specialized single-item
-- RPC; office multi-line path uses update_logistics_task_atomic exclusively.

-- Align shipment authoritative write guard with inventory (148):
-- SECURITY DEFINER RPCs owned by postgres must be able to update logistics_plan
-- while an authenticated JWT is present. Direct authenticated client writes remain blocked.
create or replace function public.guard_authoritative_shipment_writes()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if current_user in ('postgres', 'supabase_admin')
     or auth.role() is distinct from 'authenticated' then
    return coalesce(new, old);
  end if;
  if tg_op in ('INSERT', 'DELETE') then
    raise exception 'SHIPMENT_COMMAND_REQUIRED';
  end if;
  if new.paid is distinct from old.paid
    or new.profit is distinct from old.profit
    or new.invoice_status is distinct from old.invoice_status
    or new.accounting_status is distinct from old.accounting_status
    or new.finalized_at is distinct from old.finalized_at
    or new.logistics_plan is distinct from old.logistics_plan
    or new.public_tracking_token_hash is distinct from old.public_tracking_token_hash
    or new.public_tracking_expires_at is distinct from old.public_tracking_expires_at
    or new.public_tracking_revoked_at is distinct from old.public_tracking_revoked_at
  then
    raise exception 'SHIPMENT_AUTHORITATIVE_COLUMNS_COMMAND_REQUIRED';
  end if;
  return new;
end;
$$;

revoke execute on function public.guard_authoritative_shipment_writes()
  from public, anon, authenticated;

create table if not exists public.logistics_task_client_operations (
  organization_id uuid not null references public.organizations (id) on delete cascade,
  client_operation_id text not null,
  task_id uuid not null references public.shipment_logistics_tasks (id) on delete cascade,
  request_hash text not null,
  result jsonb not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (organization_id, client_operation_id)
);

create index if not exists idx_logistics_task_client_operations_task
  on public.logistics_task_client_operations (task_id, created_at desc);

alter table public.logistics_task_client_operations enable row level security;

drop policy if exists logistics_task_client_operations_select
  on public.logistics_task_client_operations;
create policy logistics_task_client_operations_select
  on public.logistics_task_client_operations
  for select
  using (
    organization_id = public.current_organization_id()
    and (
      public.user_has_permission('routes.update_status')
      or public.user_has_permission('sales.manage')
      or public.user_has_permission('routes.view')
    )
  );

drop policy if exists logistics_task_client_operations_write
  on public.logistics_task_client_operations;
create policy logistics_task_client_operations_write
  on public.logistics_task_client_operations
  for all
  using (false)
  with check (false);

create or replace function public.normalize_inventory_match_text(value text)
returns text
language sql
immutable
set search_path = pg_catalog, public
as $$
  select lower(
    regexp_replace(
      translate(
        coalesce(value, ''),
        'ÁÀÄÂáàäâÉÈËÊéèëêÍÌÏÎíìïîÓÒÖÔóòöôÚÙÜÛúùüûÑñÇç',
        'AAAAAAAEEEEEEEEIIIIIIIIOOOOOOOUUUUUUUNnCc'
      ),
      '[^a-z0-9]+',
      '',
      'g'
    )
  );
$$;

create or replace function public.logistics_task_transition_allowed(
  p_from text,
  p_to text
) returns boolean
language sql
immutable
set search_path = pg_catalog, public
as $$
  select case p_from
    when 'pending' then p_to in ('scheduled', 'assigned', 'cancelled')
    when 'scheduled' then p_to in ('assigned', 'pending', 'cancelled')
    when 'assigned' then p_to in ('loaded_to_truck', 'scheduled', 'pending', 'cancelled', 'completed')
    when 'loaded_to_truck' then p_to in ('completed', 'cancelled')
    when 'completed' then false
    when 'cancelled' then p_to in ('pending', 'scheduled', 'assigned')
    else false
  end;
$$;

create or replace function public.apply_logistics_empty_box_salida(
  p_organization_id uuid,
  p_warehouse_id uuid,
  p_item_id uuid,
  p_item_name text,
  p_qty numeric,
  p_note text,
  p_actor_id uuid,
  p_assignee_id uuid,
  p_shipment_id uuid,
  p_reason_code text,
  p_movement_key text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  stock_row public.inventory_stock%rowtype;
  warehouse_name text;
  available_qty numeric;
  next_stock numeric;
  new_movement_id uuid;
  existing_id uuid;
begin
  if p_organization_id is null or p_warehouse_id is null or p_item_id is null then
    raise exception 'INVALID_STOCK_CONTEXT';
  end if;
  if coalesce(p_qty, 0) <= 0 then
    raise exception 'Cantidad invalida';
  end if;

  if nullif(btrim(p_movement_key), '') is not null then
    select id into existing_id
    from public.inventory_movements
    where organization_id = p_organization_id
      and movement_key = p_movement_key
    limit 1;
    if existing_id is not null then
      return jsonb_build_object('movement_id', existing_id, 'replayed', true);
    end if;
  end if;

  select name into warehouse_name
  from public.warehouses
  where id = p_warehouse_id
    and organization_id = p_organization_id;

  if warehouse_name is null then
    raise exception 'WAREHOUSE_NOT_FOUND';
  end if;

  if not exists (
    select 1 from public.inventory_items
    where id = p_item_id and organization_id = p_organization_id
  ) then
    raise exception 'ITEM_NOT_FOUND';
  end if;

  select * into stock_row
  from public.inventory_stock
  where organization_id = p_organization_id
    and warehouse_id = p_warehouse_id
    and item_id = p_item_id
  for update;

  if stock_row.id is null then
    raise exception 'Stock no encontrado';
  end if;

  available_qty := greatest(coalesce(stock_row.stock, 0) - coalesce(stock_row.reserved, 0), 0);
  if available_qty < p_qty then
    raise exception 'Stock insuficiente';
  end if;

  next_stock := coalesce(stock_row.stock, 0) - p_qty;
  update public.inventory_stock
  set stock = next_stock
  where id = stock_row.id;

  insert into public.inventory_movements (
    organization_id, warehouse_id, item_id, item_name, type, qty, note,
    created_by, assignee_id, reason_code,
    from_location_type, from_location_id, from_location_label,
    to_location_type, to_location_id, to_location_label,
    reference_type, reference_id, evidence, movement_key
  ) values (
    p_organization_id, p_warehouse_id, p_item_id,
    coalesce(nullif(btrim(p_item_name), ''), 'Caja vacia'),
    'salida', p_qty, coalesce(p_note, ''),
    p_actor_id, p_assignee_id, coalesce(nullif(btrim(p_reason_code), ''), 'sale_fulfillment'),
    'warehouse', p_warehouse_id, coalesce(warehouse_name, 'Bodega'),
    'truck', null, '',
    'shipment', p_shipment_id, '{}'::jsonb, nullif(btrim(p_movement_key), '')
  )
  returning id into new_movement_id;

  return jsonb_build_object(
    'movement_id', new_movement_id,
    'stock', next_stock,
    'replayed', false
  );
end;
$$;

create or replace function public.deduct_empty_box_stock_for_task_lines(
  p_organization_id uuid,
  p_shipment_id uuid,
  p_task_id uuid,
  p_warehouse_id uuid,
  p_actor_id uuid,
  p_assignee_id uuid,
  p_operation_key text
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  shipment_row public.shipments;
  warehouse_row public.warehouses;
  fulfill_result jsonb;
  fulfilled_count integer := 0;
  line_record record;
  stock_row public.inventory_stock%rowtype;
  item_row public.inventory_items%rowtype;
  available_qty numeric;
  label_norm text;
  qty numeric;
  movements jsonb := '[]'::jsonb;
  movement jsonb;
  deducted integer := 0;
  resolved jsonb := '[]'::jsonb;
  resolved_line jsonb;
  lines_json jsonb;
begin
  if p_organization_id is null or p_shipment_id is null or p_warehouse_id is null then
    raise exception 'INVALID_STOCK_CONTEXT';
  end if;

  select * into warehouse_row
  from public.warehouses
  where id = p_warehouse_id
    and organization_id = p_organization_id
    and is_active
  for share;

  if warehouse_row.id is null then
    raise exception 'WAREHOUSE_NOT_FOUND';
  end if;

  select * into shipment_row
  from public.shipments
  where id = p_shipment_id
    and organization_id = p_organization_id
  for update;

  if shipment_row.id is null then
    raise exception 'SHIPMENT_NOT_FOUND';
  end if;

  -- Prefer sale reservations when present (multi-line aware).
  -- Only call fulfill when active reservations exist so routes-only actors
  -- are not blocked by fulfill_inventory_sale_stock permission gates.
  if exists (
    select 1
    from public.inventory_sale_reservations
    where organization_id = p_organization_id
      and shipment_id = p_shipment_id
      and status = 'active'
  ) then
    fulfill_result := public.fulfill_inventory_sale_stock(
      p_organization_id,
      p_shipment_id,
      'Caja vacia cargada a ruta ' || coalesce(shipment_row.code, ''),
      p_actor_id,
      p_assignee_id
    );
    fulfilled_count := coalesce((fulfill_result ->> 'fulfilled_count')::integer, 0);

    if fulfilled_count > 0 then
      return jsonb_build_object(
        'mode', 'reservations',
        'fulfilledCount', fulfilled_count,
        'warehouseId', p_warehouse_id,
        'movements', fulfill_result
      );
    end if;
  end if;

  lines_json := case
    when jsonb_typeof(coalesce(shipment_row.logistics_plan -> 'boxLines', '[]'::jsonb)) = 'array'
      and jsonb_array_length(coalesce(shipment_row.logistics_plan -> 'boxLines', '[]'::jsonb)) > 0
      then shipment_row.logistics_plan -> 'boxLines'
    when coalesce(shipment_row.logistics_plan #>> '{box,label}', shipment_row.logistics_plan #>> '{box,name}', '') <> ''
      then jsonb_build_array(
        jsonb_build_object(
          'label', coalesce(shipment_row.logistics_plan #>> '{box,label}', shipment_row.logistics_plan #>> '{box,name}'),
          'quantity', coalesce(nullif(shipment_row.logistics_plan ->> 'boxCount', '')::numeric, 1)
        )
      )
    else '[]'::jsonb
  end;

  if jsonb_array_length(lines_json) = 0 then
    raise exception 'EMPTY_BOX_LINES_MISSING';
  end if;

  -- Resolve matches first, then lock stock rows in deterministic item_id order.
  for line_record in
    select
      coalesce(nullif(btrim(line.value ->> 'label'), ''), '') as label,
      greatest(coalesce(nullif(line.value ->> 'quantity', '')::numeric, 1), 1) as quantity,
      ordinality
    from jsonb_array_elements(lines_json) with ordinality as line(value, ordinality)
    order by ordinality
  loop
    if line_record.label = '' then
      raise exception 'EMPTY_BOX_LINE_LABEL_REQUIRED';
    end if;

    label_norm := public.normalize_inventory_match_text(line_record.label);

    select stock.id, stock.item_id
    into stock_row.id, stock_row.item_id
    from public.inventory_stock stock
    join public.inventory_items item
      on item.id = stock.item_id
     and item.organization_id = p_organization_id
    where stock.organization_id = p_organization_id
      and stock.warehouse_id = p_warehouse_id
      and (
        public.normalize_inventory_match_text(item.kind) = label_norm
        or public.normalize_inventory_match_text(item.name) = label_norm
        or public.normalize_inventory_match_text(item.kind) like '%' || label_norm || '%'
        or public.normalize_inventory_match_text(item.name) like '%' || label_norm || '%'
        or public.normalize_inventory_match_text('Caja ' || coalesce(item.kind, '')) like '%' || label_norm || '%'
        or public.normalize_inventory_match_text('Caja ' || coalesce(item.name, '')) like '%' || label_norm || '%'
        or label_norm like '%' || public.normalize_inventory_match_text(item.kind) || '%'
        or label_norm like '%' || public.normalize_inventory_match_text(item.name) || '%'
      )
    order by
      case
        when public.normalize_inventory_match_text(item.kind) = label_norm then 0
        when public.normalize_inventory_match_text(item.name) = label_norm then 0
        else 1
      end,
      stock.item_id
    limit 1;

    if stock_row.id is null then
      raise exception 'No hay stock registrado para la caja %', line_record.label;
    end if;

    resolved := resolved || jsonb_build_array(
      jsonb_build_object(
        'stockId', stock_row.id,
        'itemId', stock_row.item_id,
        'label', line_record.label,
        'quantity', line_record.quantity,
        'ordinality', line_record.ordinality
      )
    );
  end loop;

  -- Deterministic lock order by inventory_stock.id
  perform 1
  from public.inventory_stock stock
  where stock.id in (
    select distinct (value ->> 'stockId')::uuid
    from jsonb_array_elements(resolved) value
  )
  order by stock.id
  for update;

  for resolved_line in
    select value
    from jsonb_array_elements(resolved) value
    order by (value ->> 'itemId')::uuid, (value ->> 'ordinality')::int
  loop
    select * into stock_row
    from public.inventory_stock
    where id = (resolved_line ->> 'stockId')::uuid;

    select * into item_row
    from public.inventory_items
    where id = stock_row.item_id;

    qty := (resolved_line ->> 'quantity')::numeric;
    available_qty := greatest(coalesce(stock_row.stock, 0) - coalesce(stock_row.reserved, 0), 0);
    if available_qty < qty then
      raise exception 'Stock insuficiente para %', resolved_line ->> 'label';
    end if;

    movement := public.apply_logistics_empty_box_salida(
      p_organization_id,
      p_warehouse_id,
      stock_row.item_id,
      coalesce(item_row.name, item_row.kind, resolved_line ->> 'label'),
      qty,
      'Caja vacia cargada a ruta ' || coalesce(shipment_row.code, ''),
      p_actor_id,
      p_assignee_id,
      p_shipment_id,
      'sale_fulfillment',
      'task-load:' || p_task_id::text || ':' || stock_row.item_id::text || ':' || p_operation_key
    );

    movements := movements || jsonb_build_array(movement);
    deducted := deducted + 1;

    -- Test hook: force failure after first line to prove full rollback.
    if current_setting('boxario.force_task_update_fail_after_line', true) = '1'
       and deducted >= 1 then
      raise exception 'FORCED_INTERMEDIATE_FAILURE';
    end if;
  end loop;

  if deducted = 0 then
    raise exception 'EMPTY_BOX_DEDUCTION_EMPTY';
  end if;

  return jsonb_build_object(
    'mode', 'legacy_lines',
    'deductedCount', deducted,
    'warehouseId', p_warehouse_id,
    'movements', movements
  );
end;
$$;

create or replace function public.update_logistics_task_atomic(
  p_task_id uuid,
  p_client_operation_id text,
  p_changes jsonb default '{}'::jsonb
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  caller_org uuid := public.current_organization_id();
  task_row public.shipment_logistics_tasks;
  shipment_row public.shipments;
  changes jsonb := coalesce(p_changes, '{}'::jsonb);
  request_hash text;
  existing public.logistics_task_client_operations%rowtype;
  next_status text;
  next_assigned uuid;
  has_assigned boolean := changes ? 'assignedTo';
  has_schedule boolean := changes ? 'schedule';
  has_warehouse boolean := changes ? 'warehouseId';
  has_notes boolean := changes ? 'notes';
  has_status boolean := changes ? 'status';
  schedule jsonb;
  next_warehouse uuid;
  stock_needed boolean := false;
  stock_result jsonb := null;
  now_ts timestamptz := now();
  release_reason text := nullif(btrim(coalesce(changes ->> 'releaseStopsReason', '')), '');
  is_reactivate boolean := false;
  result jsonb;
  activity_id uuid;
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

  if coalesce(nullif(btrim(p_client_operation_id), ''), '') = '' then
    raise exception 'OPERATION_KEY_REQUIRED';
  end if;

  if jsonb_typeof(changes) <> 'object' then
    raise exception 'INVALID_CHANGES';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(changes) key
    where key not in (
      'status', 'assignedTo', 'schedule', 'warehouseId', 'notes', 'releaseStopsReason'
    )
  ) then
    raise exception 'INVALID_CHANGES_KEYS';
  end if;

  request_hash := md5(coalesce(changes::text, '{}'));

  select * into existing
  from public.logistics_task_client_operations
  where organization_id = caller_org
    and client_operation_id = p_client_operation_id
  for update;

  if existing.client_operation_id is not null then
    if existing.task_id is distinct from p_task_id then
      raise exception 'OPERATION_KEY_TASK_MISMATCH';
    end if;
    if existing.request_hash is distinct from request_hash then
      raise exception 'OPERATION_KEY_PAYLOAD_MISMATCH';
    end if;
    return existing.result || jsonb_build_object('replayed', true);
  end if;

  select * into task_row
  from public.shipment_logistics_tasks
  where id = p_task_id
    and organization_id = caller_org
  for update;

  if task_row.id is null then
    raise exception 'TASK_NOT_FOUND';
  end if;

  select * into shipment_row
  from public.shipments
  where id = task_row.shipment_id
    and organization_id = caller_org
  for update;

  if shipment_row.id is null then
    raise exception 'SHIPMENT_NOT_FOUND';
  end if;

  next_status := case
    when has_status then nullif(btrim(changes ->> 'status'), '')
    else task_row.status
  end;
  if next_status is null then
    raise exception 'INVALID_STATUS';
  end if;
  if next_status is distinct from task_row.status
     and not public.logistics_task_transition_allowed(task_row.status, next_status) then
    raise exception 'TASK_TRANSITION_NOT_ALLOWED: % → %', task_row.status, next_status;
  end if;

  is_reactivate :=
    task_row.status = 'cancelled'
    and next_status in ('pending', 'scheduled', 'assigned');

  if has_assigned then
    if changes ->> 'assignedTo' is null or btrim(changes ->> 'assignedTo') = '' then
      next_assigned := null;
    else
      next_assigned := (changes ->> 'assignedTo')::uuid;
      if not exists (
        select 1 from public.profiles
        where id = next_assigned
          and organization_id = caller_org
          and is_active
      ) then
        raise exception 'ASSIGNEE_NOT_FOUND';
      end if;
    end if;
  else
    next_assigned := task_row.assigned_to;
  end if;

  if has_assigned and next_assigned is not null and next_status = 'pending' and not has_status then
    next_status := 'assigned';
  end if;

  if has_warehouse then
    if changes ->> 'warehouseId' is null or btrim(changes ->> 'warehouseId') = '' then
      next_warehouse := null;
    else
      next_warehouse := (changes ->> 'warehouseId')::uuid;
      if not exists (
        select 1 from public.warehouses
        where id = next_warehouse
          and organization_id = caller_org
          and is_active
      ) then
        raise exception 'WAREHOUSE_NOT_FOUND';
      end if;
      if not public.user_can_access_warehouse(next_warehouse) then
        raise exception 'FORBIDDEN';
      end if;
    end if;
    if task_row.stock_deducted_at is not null
       and next_warehouse is distinct from task_row.warehouse_id then
      raise exception 'WAREHOUSE_LOCKED_AFTER_STOCK';
    end if;
  else
    next_warehouse := task_row.warehouse_id;
  end if;

  schedule := case
    when has_schedule and jsonb_typeof(changes -> 'schedule') = 'object' then changes -> 'schedule'
    when has_schedule and changes -> 'schedule' is null then '{}'::jsonb
    else null
  end;

  if has_schedule and schedule is not null and schedule <> '{}'::jsonb then
    if next_status = 'pending' and not has_status
       and coalesce(schedule ->> 'scheduledAt', schedule ->> 'requestedScheduleAt', '') <> '' then
      next_status := 'scheduled';
    end if;
  end if;

  if release_reason is not null then
    update public.logistics_route_stops
    set
      released_at = now_ts,
      release_reason = release_reason,
      outcome = case
        when outcome in ('completed', 'failed') then outcome
        else 'cancelled'
      end,
      outcome_at = case
        when outcome in ('completed', 'failed') then outcome_at
        else now_ts
      end,
      updated_at = now_ts
    where organization_id = caller_org
      and task_id = task_row.id
      and released_at is null
      and coalesce(outcome, '') not in ('completed', 'failed');

    if has_assigned is false then
      next_assigned := null;
    elsif changes ->> 'assignedTo' is null or btrim(coalesce(changes ->> 'assignedTo', '')) = '' then
      next_assigned := null;
    end if;
  end if;

  stock_needed :=
    next_status = 'loaded_to_truck'
    and task_row.task_type = 'deliver_empty_box'
    and task_row.stock_deducted_at is null;

  if stock_needed then
    if next_warehouse is null then
      select id into next_warehouse
      from public.warehouses
      where organization_id = caller_org
        and is_active
        and public.user_can_access_warehouse(id)
      order by is_default desc, created_at
      limit 1;
    end if;
    if next_warehouse is null then
      raise exception 'WAREHOUSE_REQUIRED_FOR_STOCK';
    end if;

    stock_result := public.deduct_empty_box_stock_for_task_lines(
      caller_org,
      task_row.shipment_id,
      task_row.id,
      next_warehouse,
      caller_id,
      coalesce(next_assigned, caller_id),
      p_client_operation_id
    );
  end if;

  update public.shipment_logistics_tasks
  set
    status = next_status,
    assigned_to = next_assigned,
    warehouse_id = next_warehouse,
    notes = case
      when has_notes then left(coalesce(changes ->> 'notes', ''), 1000)
      else notes
    end,
    scheduled_at = case
      when schedule is null then scheduled_at
      when schedule = '{}'::jsonb then null
      else nullif(schedule ->> 'scheduledAt', '')::timestamptz
    end,
    requested_schedule_at = case
      when schedule is null then requested_schedule_at
      when schedule = '{}'::jsonb then null
      else nullif(schedule ->> 'requestedScheduleAt', '')::timestamptz
    end,
    schedule_confirmation_status = case
      when schedule is null then schedule_confirmation_status
      when schedule = '{}'::jsonb then 'confirmed'
      else coalesce(nullif(schedule ->> 'scheduleConfirmationStatus', ''), 'pending')
    end,
    schedule_kind = case
      when schedule is null then schedule_kind
      when schedule = '{}'::jsonb then null
      else nullif(schedule ->> 'scheduleKind', '')
    end,
    window_start_at = case
      when schedule is null then window_start_at
      when schedule = '{}'::jsonb then null
      else nullif(schedule ->> 'windowStartAt', '')::timestamptz
    end,
    window_end_at = case
      when schedule is null then window_end_at
      when schedule = '{}'::jsonb then null
      else nullif(schedule ->> 'windowEndAt', '')::timestamptz
    end,
    ordered_at = case
      when is_reactivate then now_ts
      else ordered_at
    end,
    assigned_at = case
      when is_reactivate then
        case when next_assigned is not null then now_ts else null end
      when next_assigned is not null and assigned_at is null then now_ts
      else assigned_at
    end,
    loaded_at = case
      when is_reactivate then null
      when next_status = 'loaded_to_truck' then coalesce(loaded_at, now_ts)
      else loaded_at
    end,
    completed_at = case
      when is_reactivate then null
      when next_status = 'completed' then coalesce(completed_at, now_ts)
      when next_status is distinct from 'completed' and next_status is distinct from task_row.status
        then null
      else completed_at
    end,
    stock_deducted_at = case
      when stock_needed then now_ts
      else stock_deducted_at
    end,
    updated_at = now_ts
  where id = task_row.id
  returning * into task_row;

  if has_assigned or release_reason is not null then
    update public.shipments
    set assigned_to = next_assigned
    where id = shipment_row.id
      and organization_id = caller_org;
  end if;

  if has_schedule and schedule is not null then
    update public.shipments
    set logistics_plan = case
      when task_row.task_type = 'deliver_empty_box' then
        jsonb_set(
          coalesce(logistics_plan, '{}'::jsonb),
          '{emptyBox}',
          coalesce(logistics_plan -> 'emptyBox', '{}'::jsonb)
            || jsonb_build_object(
              'scheduleMode', case when schedule = '{}'::jsonb then 'pending' else 'scheduled' end,
              'scheduleAt', case
                when schedule = '{}'::jsonb then null
                else coalesce(schedule ->> 'scheduledAt', schedule ->> 'windowStartAt')
              end
            ),
          true
        )
      when task_row.task_type = 'pickup_full_box' then
        jsonb_set(
          coalesce(logistics_plan, '{}'::jsonb),
          '{fullBox}',
          coalesce(logistics_plan -> 'fullBox', '{}'::jsonb)
            || jsonb_build_object(
              'scheduleMode', case when schedule = '{}'::jsonb then 'pending' else 'scheduled' end,
              'scheduleAt', case
                when schedule = '{}'::jsonb then null
                else coalesce(schedule ->> 'scheduledAt', schedule ->> 'windowStartAt')
              end
            ),
          true
        )
      else logistics_plan
    end
    where id = shipment_row.id
      and organization_id = caller_org;
  end if;

  if stock_needed then
    update public.shipments
    set logistics_plan = jsonb_set(
      coalesce(logistics_plan, '{}'::jsonb),
      '{emptyBox}',
      coalesce(logistics_plan -> 'emptyBox', '{}'::jsonb)
        || jsonb_build_object(
          'stockDeductedAt', now_ts,
          'stockWarehouseId', next_warehouse
        ),
      true
    )
    where id = shipment_row.id
      and organization_id = caller_org;
  end if;

  activity_id := public.record_activity_history(
    'shipment.logistics_task_updated',
    'shipment',
    shipment_row.id,
    'Tarea logistica: ' || task_row.status,
    coalesce(shipment_row.code, '') || ' · ' || task_row.task_type,
    jsonb_build_object(
      'taskId', task_row.id,
      'taskType', task_row.task_type,
      'status', task_row.status,
      'assignedTo', task_row.assigned_to,
      'scheduledAt', task_row.scheduled_at,
      'warehouseId', task_row.warehouse_id,
      'stockDeductedAt', task_row.stock_deducted_at,
      'clientOperationId', p_client_operation_id,
      'stockResult', stock_result
    )
  );

  result := jsonb_build_object(
    'replayed', false,
    'taskId', task_row.id,
    'shipmentId', shipment_row.id,
    'status', task_row.status,
    'assignedTo', task_row.assigned_to,
    'warehouseId', task_row.warehouse_id,
    'scheduledAt', task_row.scheduled_at,
    'requestedScheduleAt', task_row.requested_schedule_at,
    'scheduleKind', task_row.schedule_kind,
    'windowStartAt', task_row.window_start_at,
    'windowEndAt', task_row.window_end_at,
    'scheduleConfirmationStatus', task_row.schedule_confirmation_status,
    'notes', task_row.notes,
    'stockDeductedAt', task_row.stock_deducted_at,
    'loadedAt', task_row.loaded_at,
    'completedAt', task_row.completed_at,
    'assignedAt', task_row.assigned_at,
    'orderedAt', task_row.ordered_at,
    'updatedAt', task_row.updated_at,
    'taskType', task_row.task_type,
    'stockResult', stock_result,
    'actorId', caller_id,
    'organizationId', caller_org,
    'clientOperationId', p_client_operation_id,
    'activityId', activity_id
  );

  insert into public.logistics_task_client_operations (
    organization_id, client_operation_id, task_id, request_hash, result, created_by
  ) values (
    caller_org, p_client_operation_id, task_row.id, request_hash, result, caller_id
  );

  return result;
end;
$$;

-- Specialized single-item load (explicit item_id/qty). Not used by office multi-line flow.
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
  op_key text := coalesce(nullif(btrim(p_client_operation_id), ''), nullif(btrim(p_movement_key), ''), 'mark-load:' || p_task_id::text);
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
      'stockDeductedAt', task_row.stock_deducted_at,
      'clientOperationId', op_key
    );
  end if;

  if task_row.task_type is distinct from 'deliver_empty_box' then
    raise exception 'STOCK_DEDUCTION_TASK_TYPE_INVALID';
  end if;

  if task_row.status not in ('assigned', 'scheduled', 'pending', 'loaded_to_truck') then
    raise exception 'TASK_NOT_EXECUTABLE';
  end if;

  if task_row.status is distinct from 'loaded_to_truck'
     and not public.logistics_task_transition_allowed(task_row.status, 'loaded_to_truck') then
    raise exception 'TASK_TRANSITION_NOT_ALLOWED: % → loaded_to_truck', task_row.status;
  end if;

  movement := public.apply_logistics_empty_box_salida(
    caller_org,
    p_warehouse_id,
    p_item_id,
    coalesce(nullif(btrim(p_item_name), ''), 'Caja vacia'),
    p_qty,
    'Carga a camion / entrega caja vacia',
    caller_id,
    null::uuid,
    task_row.shipment_id,
    'logistics_load',
    coalesce(nullif(btrim(p_movement_key), ''), 'task-load:' || task_row.id::text || ':' || op_key)
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
    'clientOperationId', op_key,
    'scope', 'specialized_single_item'
  );
end;
$$;

revoke all on function public.apply_logistics_empty_box_salida(
  uuid, uuid, uuid, text, numeric, text, uuid, uuid, uuid, text, text
) from public, anon, authenticated;

revoke all on function public.normalize_inventory_match_text(text) from public, anon;
grant execute on function public.normalize_inventory_match_text(text) to authenticated;

revoke all on function public.logistics_task_transition_allowed(text, text) from public, anon;
grant execute on function public.logistics_task_transition_allowed(text, text) to authenticated;

revoke all on function public.deduct_empty_box_stock_for_task_lines(
  uuid, uuid, uuid, uuid, uuid, uuid, text
) from public, anon, authenticated;

revoke all on function public.update_logistics_task_atomic(uuid, text, jsonb) from public, anon;
grant execute on function public.update_logistics_task_atomic(uuid, text, jsonb) to authenticated;

revoke all on function public.mark_logistics_task_loaded_with_stock_atomic(
  uuid, uuid, uuid, text, numeric, text, text
) from public, anon;
grant execute on function public.mark_logistics_task_loaded_with_stock_atomic(
  uuid, uuid, uuid, text, numeric, text, text
) to authenticated;

comment on function public.update_logistics_task_atomic(uuid, text, jsonb) is
  'Authoritative atomic logistics task mutation including multi-line empty-box stock deduction. Idempotent via client_operation_id. Identity from auth.uid().';
comment on function public.mark_logistics_task_loaded_with_stock_atomic(
  uuid, uuid, uuid, text, numeric, text, text
) is
  'Specialized single-item load+deduct. Office multi-line flow must use update_logistics_task_atomic.';
comment on function public.deduct_empty_box_stock_for_task_lines(
  uuid, uuid, uuid, uuid, uuid, uuid, text
) is
  'Internal multi-line stock helper. Not granted to authenticated; called only by SECURITY DEFINER RPCs.';
comment on function public.apply_logistics_empty_box_salida(
  uuid, uuid, uuid, text, numeric, text, uuid, uuid, uuid, text, text
) is
  'Internal logistics salida that respects reserved stock. Not granted to authenticated.';
