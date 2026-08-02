-- Inventory article metadata, assignment fields, and adjustment qty zero.

alter table public.inventory_items
  add column if not exists archived_at timestamptz,
  add column if not exists sku text,
  add column if not exists is_commercial boolean not null default false,
  add column if not exists is_active boolean not null default true;

alter table public.inventory_assignments
  add column if not exists purpose text not null default '',
  add column if not exists expected_return_at timestamptz;

create or replace function public.record_inventory_movement_atomic(
  target_org_id uuid,
  p_warehouse_id uuid,
  p_item_id uuid,
  p_item_name text,
  p_type text,
  p_qty numeric,
  p_note text,
  p_created_by uuid,
  p_assignee_id uuid default null,
  p_reason_code text default 'unspecified',
  p_from_location_type text default null,
  p_from_location_id uuid default null,
  p_from_location_label text default '',
  p_to_location_type text default null,
  p_to_location_id uuid default null,
  p_to_location_label text default '',
  p_reference_type text default null,
  p_reference_id uuid default null,
  p_evidence jsonb default '{}'::jsonb,
  p_assignment_id uuid default null,
  p_warehouse_transfer_id uuid default null,
  p_reversal_of_movement_id uuid default null,
  p_movement_key text default null,
  p_unit_cost numeric default null,
  p_total_cost numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  warehouse_row record;
  stock_row record;
  item_org uuid;
  warehouse_org uuid;
  next_stock numeric;
  next_avg_cost numeric;
  effective_reason text;
  effective_from_type text;
  effective_from_id uuid;
  effective_from_label text;
  effective_to_type text;
  effective_to_id uuid;
  effective_to_label text;
  effective_unit_cost numeric;
  effective_total_cost numeric;
  new_movement_id uuid;
begin
  effective_reason := coalesce(nullif(btrim(p_reason_code), ''), 'unspecified');
  effective_from_type := p_from_location_type;
  effective_from_id := p_from_location_id;
  effective_from_label := coalesce(p_from_location_label, '');
  effective_to_type := p_to_location_type;
  effective_to_id := p_to_location_id;
  effective_to_label := coalesce(p_to_location_label, '');

  if target_org_id is null then
    raise exception 'Organizacion invalida';
  end if;

  if target_org_id is distinct from public.current_organization_id()
     and auth.role() <> 'service_role' then
    raise exception 'Forbidden';
  end if;

  if auth.role() <> 'service_role' then
    if p_type in ('entrada', 'ajuste', 'devolucion') then
      if not public.user_has_permission('inventory.adjust') then
        raise exception 'Forbidden';
      end if;
    elsif p_type = 'salida' then
      if not (
        public.user_has_permission('inventory.reserve')
        or public.user_has_permission('inventory.adjust')
      ) then
        raise exception 'Forbidden';
      end if;
    end if;
  end if;

  if p_qty is null or p_qty < 0 then
    raise exception 'Cantidad invalida';
  end if;

  if p_type <> 'ajuste' and p_qty <= 0 then
    raise exception 'Cantidad invalida';
  end if;

  if p_type not in ('entrada', 'salida', 'ajuste', 'devolucion') then
    raise exception 'Tipo de movimiento invalido';
  end if;

  if p_type in ('ajuste', 'dano', 'perdida')
     and effective_reason in ('unspecified')
     and char_length(btrim(coalesce(p_note, ''))) = 0 then
    raise exception 'Motivo requerido';
  end if;

  if effective_reason = 'other'
     and char_length(btrim(coalesce(p_note, ''))) < 3 then
    raise exception 'Detalle requerido para motivo Otro';
  end if;

  select organization_id into warehouse_org
  from public.warehouses
  where id = p_warehouse_id;

  if warehouse_org is null or warehouse_org is distinct from target_org_id then
    raise exception 'Bodega no encontrada';
  end if;

  select * into warehouse_row
  from public.warehouses
  where id = p_warehouse_id;

  select organization_id into item_org
  from public.inventory_items
  where id = p_item_id;

  if item_org is null or item_org is distinct from target_org_id then
    raise exception 'Item no encontrado';
  end if;

  if effective_from_type is null and effective_to_type is null then
    if p_type = 'entrada' then
      effective_from_type := 'external';
      effective_from_label := coalesce(nullif(effective_from_label, ''), 'Entrada externa');
      effective_to_type := 'warehouse';
      effective_to_id := p_warehouse_id;
      effective_to_label := coalesce(nullif(effective_to_label, ''), warehouse_row.name, 'Bodega');
    elsif p_type = 'salida' then
      effective_from_type := 'warehouse';
      effective_from_id := p_warehouse_id;
      effective_from_label := coalesce(nullif(effective_from_label, ''), warehouse_row.name, 'Bodega');
      effective_to_type := 'external';
      effective_to_label := coalesce(nullif(effective_to_label, ''), 'Salida');
    elsif p_type in ('ajuste', 'devolucion') then
      effective_to_type := 'warehouse';
      effective_to_id := p_warehouse_id;
      effective_to_label := coalesce(nullif(effective_to_label, ''), warehouse_row.name, 'Bodega');
    end if;
  end if;

  select *
  into stock_row
  from public.inventory_stock
  where warehouse_id = p_warehouse_id
    and item_id = p_item_id
    and organization_id = target_org_id
  for update;

  if stock_row.id is null then
    raise exception 'Stock no encontrado';
  end if;

  next_stock := stock_row.stock;
  next_avg_cost := coalesce(stock_row.avg_cost, 0);

  if p_type in ('entrada', 'devolucion') then
    next_stock := next_stock + p_qty;
  elsif p_type = 'salida' then
    if next_stock < p_qty then
      raise exception 'Stock insuficiente';
    end if;
    next_stock := next_stock - p_qty;
  else
    next_stock := p_qty;
  end if;

  if next_stock < 0 then
    raise exception 'Stock insuficiente';
  end if;

  if p_type = 'entrada' and (p_unit_cost is not null or p_total_cost is not null) then
    if p_unit_cost is not null and p_unit_cost < 0 then
      raise exception 'Costo unitario invalido';
    end if;

    if p_total_cost is not null and p_total_cost < 0 then
      raise exception 'Costo total invalido';
    end if;

    if p_unit_cost is not null and p_total_cost is not null then
      effective_unit_cost := p_unit_cost;
      effective_total_cost := p_total_cost;
    elsif p_unit_cost is not null then
      effective_unit_cost := p_unit_cost;
      effective_total_cost := round(p_unit_cost * p_qty, 4);
    else
      effective_total_cost := p_total_cost;
      effective_unit_cost := round(p_total_cost / p_qty, 4);
    end if;

    if stock_row.stock + p_qty > 0 then
      next_avg_cost := round(
        (
          stock_row.stock * coalesce(stock_row.avg_cost, 0)
          + p_qty * effective_unit_cost
        ) / (stock_row.stock + p_qty),
        4
      );
    else
      next_avg_cost := effective_unit_cost;
    end if;
  end if;

  update public.inventory_stock
  set stock = next_stock,
      avg_cost = next_avg_cost
  where id = stock_row.id;

  insert into public.inventory_movements (
    organization_id,
    warehouse_id,
    item_id,
    item_name,
    type,
    qty,
    note,
    created_by,
    assignee_id,
    reason_code,
    from_location_type,
    from_location_id,
    from_location_label,
    to_location_type,
    to_location_id,
    to_location_label,
    reference_type,
    reference_id,
    evidence,
    assignment_id,
    warehouse_transfer_id,
    reversal_of_movement_id,
    movement_key,
    unit_cost,
    total_cost
  ) values (
    target_org_id,
    p_warehouse_id,
    p_item_id,
    coalesce(nullif(btrim(p_item_name), ''), 'Item'),
    p_type,
    p_qty,
    coalesce(p_note, ''),
    p_created_by,
    p_assignee_id,
    effective_reason,
    effective_from_type,
    effective_from_id,
    effective_from_label,
    effective_to_type,
    effective_to_id,
    effective_to_label,
    p_reference_type,
    p_reference_id,
    coalesce(p_evidence, '{}'::jsonb),
    p_assignment_id,
    p_warehouse_transfer_id,
    p_reversal_of_movement_id,
    p_movement_key,
    p_unit_cost,
    p_total_cost
  )
  returning id into new_movement_id;

  return jsonb_build_object(
    'movement_id', new_movement_id,
    'stock', next_stock,
    'avg_cost', next_avg_cost
  );
end;
$$;

drop function if exists public.assign_inventory_item(uuid, uuid, uuid, numeric, text);

create or replace function public.assign_inventory_item(
  p_warehouse_id uuid,
  p_item_id uuid,
  p_assignee_id uuid,
  p_qty numeric,
  p_note text default '',
  p_purpose text default '',
  p_expected_return_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  org_id uuid;
  stock_row record;
  item_row record;
  assignee_row record;
  warehouse_row record;
  assignee_label text;
  new_assignment_id uuid;
  new_movement_id uuid;
begin
  if auth.uid() is null then
    raise exception 'FORBIDDEN';
  end if;

  if not public.user_has_permission('inventory.assign') then
    raise exception 'FORBIDDEN';
  end if;

  if not public.user_can_access_warehouse(p_warehouse_id) then
    raise exception 'FORBIDDEN';
  end if;

  if p_qty is null or p_qty <= 0 then
    raise exception 'Cantidad invalida';
  end if;

  select organization_id into org_id from public.profiles where id = auth.uid();

  select * into stock_row
  from public.inventory_stock
  where warehouse_id = p_warehouse_id
    and item_id = p_item_id
    and organization_id = org_id
  for update;

  if stock_row.id is null then
    raise exception 'Stock no encontrado';
  end if;

  if stock_row.stock < p_qty then
    raise exception 'Stock insuficiente en bodega';
  end if;

  select id, name into item_row
  from public.inventory_items
  where id = p_item_id and organization_id = org_id;

  if item_row.id is null then
    raise exception 'Item no encontrado';
  end if;

  select id,
    coalesce(nullif(btrim(full_name), ''), email, 'Empleado') as label
  into assignee_row
  from public.profiles
  where id = p_assignee_id
    and organization_id = org_id
    and is_active = true;

  if assignee_row.id is null then
    raise exception 'Empleado no encontrado';
  end if;

  assignee_label := assignee_row.label;

  select id, name into warehouse_row
  from public.warehouses
  where id = p_warehouse_id;

  update public.inventory_stock
  set stock = stock - p_qty,
      assigned = assigned + p_qty
  where id = stock_row.id;

  insert into public.inventory_assignments (
    organization_id, warehouse_id, item_id, item_name,
    assignee_id, qty_assigned, note, purpose, expected_return_at, assigned_by
  ) values (
    org_id, p_warehouse_id, p_item_id, item_row.name,
    p_assignee_id, p_qty, coalesce(p_note, ''), coalesce(p_purpose, ''),
    p_expected_return_at, auth.uid()
  )
  returning id into new_assignment_id;

  insert into public.inventory_movements (
    organization_id, warehouse_id, item_id, item_name, type, qty, note,
    created_by, assignee_id, assignment_id,
    reason_code,
    from_location_type, from_location_id, from_location_label,
    to_location_type, to_location_id, to_location_label,
    reference_type, reference_id, evidence
  ) values (
    org_id, p_warehouse_id, p_item_id, item_row.name, 'asignacion', p_qty,
    coalesce(p_note, ''),
    auth.uid(), p_assignee_id, new_assignment_id,
    'assignment_issue',
    'warehouse', p_warehouse_id, coalesce(warehouse_row.name, 'Bodega'),
    'assignee', p_assignee_id, assignee_label,
    'assignment', new_assignment_id, '{}'::jsonb
  )
  returning id into new_movement_id;

  return jsonb_build_object(
    'assignment_id', new_assignment_id,
    'movement_id', new_movement_id
  );
end;
$$;

grant execute on function public.assign_inventory_item(
  uuid, uuid, uuid, numeric, text, text, timestamptz
) to authenticated, service_role;
