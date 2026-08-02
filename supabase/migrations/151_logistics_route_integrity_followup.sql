-- Follow-up for logistics route integrity (150 already applied).
-- Admin task exception RPC + immutable audit + historical inventory review helpers.

-- ---------------------------------------------------------------------------
-- 1. Immutable audit for administrative task exceptions
-- ---------------------------------------------------------------------------

create table if not exists public.logistics_task_admin_exceptions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  task_id uuid not null references public.shipment_logistics_tasks (id) on delete cascade,
  shipment_id uuid references public.shipments (id) on delete set null,
  route_id uuid references public.logistics_routes (id) on delete set null,
  previous_status text not null,
  new_status text not null,
  skipped_transition text not null,
  reason text not null,
  risk_summary text not null default '',
  actor_id uuid references public.profiles (id) on delete set null,
  actor_name text not null default '',
  created_at timestamptz not null default now(),
  constraint logistics_task_admin_exceptions_reason_len check (char_length(btrim(reason)) >= 3)
);

create index if not exists idx_logistics_task_admin_exceptions_task
  on public.logistics_task_admin_exceptions (task_id, created_at desc);

create index if not exists idx_logistics_task_admin_exceptions_org
  on public.logistics_task_admin_exceptions (organization_id, created_at desc);

alter table public.logistics_task_admin_exceptions enable row level security;

drop policy if exists logistics_task_admin_exceptions_select on public.logistics_task_admin_exceptions;
create policy logistics_task_admin_exceptions_select
  on public.logistics_task_admin_exceptions for select
  using (
    organization_id = public.current_organization_id()
    and (
      public.user_has_permission('routes.update_status')
      or public.user_has_permission('sales.manage')
      or public.user_has_permission('settings.manage')
    )
  );

create or replace function public.logistics_task_admin_exceptions_immutable()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'ADMIN_TASK_EXCEPTION_IMMUTABLE';
end;
$$;

drop trigger if exists logistics_task_admin_exceptions_immutable
  on public.logistics_task_admin_exceptions;
create trigger logistics_task_admin_exceptions_immutable
  before update or delete on public.logistics_task_admin_exceptions
  for each row execute function public.logistics_task_admin_exceptions_immutable();

-- ---------------------------------------------------------------------------
-- 2. Controlled admin exception RPC (sets GUC only inside this transaction)
-- ---------------------------------------------------------------------------

create or replace function public.admin_complete_logistics_task_exception(
  p_task_id uuid,
  p_reason text,
  p_risk_acknowledged boolean default false
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  task_row public.shipment_logistics_tasks;
  route_row public.logistics_routes;
  stop_row public.logistics_route_stops;
  reason_clean text := btrim(coalesce(p_reason, ''));
  previous_status text;
  skipped text;
  actor_name_value text;
  exception_id uuid;
begin
  if auth.uid() is null
     or not (
       public.user_has_permission('routes.update_status')
       or public.user_has_permission('sales.manage')
     ) then
    raise exception 'FORBIDDEN';
  end if;

  if char_length(reason_clean) < 3 then
    raise exception 'ADMIN_EXCEPTION_REASON_REQUIRED';
  end if;

  if not coalesce(p_risk_acknowledged, false) then
    raise exception 'ADMIN_EXCEPTION_RISK_ACK_REQUIRED';
  end if;

  select * into task_row
  from public.shipment_logistics_tasks
  where id = p_task_id
    and organization_id = public.current_organization_id()
  for update;

  if task_row.id is null then
    raise exception 'TASK_NOT_FOUND';
  end if;

  if task_row.status = 'completed' then
    raise exception 'TASK_ALREADY_COMPLETED';
  end if;

  if task_row.status = 'cancelled' then
    raise exception 'TASK_CANCELLED';
  end if;

  select stop.* into stop_row
  from public.logistics_route_stops stop
  where stop.task_id = task_row.id
    and stop.released_at is null
  order by stop.created_at desc
  limit 1;

  if stop_row.id is not null then
    select * into route_row
    from public.logistics_routes
    where id = stop_row.route_id;
  end if;

  if route_row.id is null then
    raise exception 'ADMIN_EXCEPTION_REQUIRES_ROUTE_CONTEXT';
  end if;

  if route_row.status = 'in_progress' then
    raise exception 'ADMIN_EXCEPTION_NOT_NEEDED_ROUTE_ACTIVE';
  end if;

  previous_status := task_row.status;
  skipped := format(
    'Normal: completar solo con ruta in_progress. Actual: ruta %s (%s).',
    coalesce(route_row.name, route_row.id::text),
    coalesce(route_row.status, 'sin_estado')
  );

  select coalesce(full_name, email, '') into actor_name_value
  from public.profiles
  where id = auth.uid();

  perform set_config('boxario.allow_admin_task_exception', '1', true);

  update public.shipment_logistics_tasks
  set status = 'completed',
      completed_at = coalesce(completed_at, now()),
      updated_at = now(),
      notes = case
        when coalesce(nullif(btrim(notes), ''), '') = '' then
          'Excepcion administrativa: ' || reason_clean
        else
          notes || E'\nExcepcion administrativa: ' || reason_clean
      end
  where id = task_row.id;

  if stop_row.id is not null and stop_row.outcome is null then
    update public.logistics_route_stops
    set outcome = 'completed',
        outcome_at = now(),
        updated_at = now()
    where id = stop_row.id
      and outcome is null;
  end if;

  insert into public.logistics_task_admin_exceptions (
    organization_id,
    task_id,
    shipment_id,
    route_id,
    previous_status,
    new_status,
    skipped_transition,
    reason,
    risk_summary,
    actor_id,
    actor_name
  ) values (
    task_row.organization_id,
    task_row.id,
    task_row.shipment_id,
    route_row.id,
    previous_status,
    'completed',
    skipped,
    reason_clean,
    'Omite el requisito de ruta in_progress. Puede desincronizar cobro, custodia o inventario si se usa fuera de correccion controlada.',
    auth.uid(),
    coalesce(actor_name_value, '')
  )
  returning id into exception_id;

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
    task_row.organization_id,
    auth.uid(),
    coalesce(actor_name_value, ''),
    'logistics.task_admin_exception',
    'shipment_logistics_task',
    task_row.id,
    'Excepcion administrativa de tarea',
    reason_clean,
    jsonb_build_object(
      'previousStatus', previous_status,
      'newStatus', 'completed',
      'routeId', route_row.id,
      'routeStatus', route_row.status,
      'skippedTransition', skipped,
      'exceptionId', exception_id
    )
  );

  return jsonb_build_object(
    'taskId', task_row.id,
    'exceptionId', exception_id,
    'previousStatus', previous_status,
    'newStatus', 'completed',
    'routeId', route_row.id,
    'routeStatus', route_row.status,
    'skippedTransition', skipped
  );
end;
$$;

revoke execute on function public.admin_complete_logistics_task_exception(uuid, text, boolean)
  from public, anon;
grant execute on function public.admin_complete_logistics_task_exception(uuid, text, boolean)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Historical inventory: report + unambiguous link table (no mutation of movements)
-- ---------------------------------------------------------------------------

create table if not exists public.inventory_shipment_ref_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  movement_id uuid not null references public.inventory_movements (id) on delete cascade,
  shipment_id uuid not null references public.shipments (id) on delete cascade,
  link_source text not null check (link_source in ('unambiguous_note_code', 'manual_review')),
  match_detail text not null default '',
  actor_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organization_id, movement_id)
);

create index if not exists idx_inventory_shipment_ref_links_shipment
  on public.inventory_shipment_ref_links (organization_id, shipment_id);

alter table public.inventory_shipment_ref_links enable row level security;

drop policy if exists inventory_shipment_ref_links_select on public.inventory_shipment_ref_links;
create policy inventory_shipment_ref_links_select
  on public.inventory_shipment_ref_links for select
  using (
    organization_id = public.current_organization_id()
    and (
      public.user_has_permission('inventory.view')
      or public.user_has_permission('inventory.adjust')
      or public.user_has_permission('settings.manage')
    )
  );

create or replace function public.list_inventory_movements_missing_shipment_refs(
  p_limit integer default 200
) returns table (
  movement_id uuid,
  organization_id uuid,
  warehouse_id uuid,
  item_id uuid,
  item_name text,
  qty numeric,
  note text,
  reference_type text,
  reference_id uuid,
  movement_key text,
  created_at timestamptz,
  review_status text,
  linked_shipment_id uuid
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or not (
       public.user_has_permission('inventory.view')
       or public.user_has_permission('inventory.adjust')
       or public.user_has_permission('settings.manage')
     ) then
    raise exception 'FORBIDDEN';
  end if;

  return query
  select
    movement.id,
    movement.organization_id,
    movement.warehouse_id,
    movement.item_id,
    movement.item_name,
    movement.qty,
    movement.note,
    movement.reference_type,
    movement.reference_id,
    movement.movement_key,
    movement.created_at,
    case
      when movement.reference_type = 'shipment' and movement.reference_id is not null then 'ok'
      when link.shipment_id is not null then 'linked'
      when exists (
        select 1
        from public.inventory_movements reversal
        where reversal.reversal_of_movement_id = movement.id
      ) then 'already_reversed'
      else 'needs_manual_review'
    end as review_status,
    link.shipment_id as linked_shipment_id
  from public.inventory_movements movement
  left join public.inventory_shipment_ref_links link
    on link.movement_id = movement.id
   and link.organization_id = movement.organization_id
  where movement.organization_id = public.current_organization_id()
    and movement.type = 'salida'
    and (
      movement.reference_type is distinct from 'shipment'
      or movement.reference_id is null
    )
  order by movement.created_at desc
  limit greatest(1, least(coalesce(p_limit, 200), 1000));
end;
$$;

revoke execute on function public.list_inventory_movements_missing_shipment_refs(integer)
  from public, anon;
grant execute on function public.list_inventory_movements_missing_shipment_refs(integer)
  to authenticated;

create or replace function public.backfill_inventory_shipment_refs_unambiguous(
  p_dry_run boolean default true
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  movement_row record;
  matched_shipment_id uuid;
  matched_code text;
  match_count integer;
  linked_ids uuid[] := '{}';
  skipped_count integer := 0;
begin
  if auth.uid() is null
     or not (
       public.user_has_permission('inventory.adjust')
       or public.user_has_permission('settings.manage')
     ) then
    raise exception 'FORBIDDEN';
  end if;

  for movement_row in
    select movement.*
    from public.inventory_movements movement
    where movement.organization_id = public.current_organization_id()
      and movement.type = 'salida'
      and (
        movement.reference_type is distinct from 'shipment'
        or movement.reference_id is null
      )
      and not exists (
        select 1 from public.inventory_shipment_ref_links link
        where link.movement_id = movement.id
      )
      and coalesce(nullif(btrim(movement.note), ''), '') <> ''
    order by movement.created_at asc
  loop
    -- Exact shipment code as whole token only. Never ILIKE / partial automatic match.
    select count(*)::integer, min(shipment.id), min(shipment.code)
      into match_count, matched_shipment_id, matched_code
    from public.shipments shipment
    where shipment.organization_id = movement_row.organization_id
      and movement_row.note ~ ('(^|[^A-Za-z0-9_-])' || regexp_replace(shipment.code, '([\\.^$|?*+(){}\\[\\]])', '\\\1', 'g') || '([^A-Za-z0-9_-]|$)');

    if match_count = 1 and matched_shipment_id is not null then
      if not p_dry_run then
        insert into public.inventory_shipment_ref_links (
          organization_id,
          movement_id,
          shipment_id,
          link_source,
          match_detail,
          actor_id
        ) values (
          movement_row.organization_id,
          movement_row.id,
          matched_shipment_id,
          'unambiguous_note_code',
          'Exact code token: ' || matched_code,
          auth.uid()
        )
        on conflict (organization_id, movement_id) do nothing;
      end if;
      linked_ids := array_append(linked_ids, movement_row.id);
    else
      skipped_count := skipped_count + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'dryRun', p_dry_run,
    'linkedCount', coalesce(array_length(linked_ids, 1), 0),
    'linkedMovementIds', to_jsonb(linked_ids),
    'skippedAmbiguousOrUnmatched', skipped_count
  );
end;
$$;

revoke execute on function public.backfill_inventory_shipment_refs_unambiguous(boolean)
  from public, anon;
grant execute on function public.backfill_inventory_shipment_refs_unambiguous(boolean)
  to authenticated;

-- Extend exact reverse to honor approved historical links without note LIKE.
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
      target_org_id := p_organization_id,
      p_warehouse_id := movement_row.warehouse_id,
      p_item_id := movement_row.item_id,
      p_item_name := movement_row.item_name,
      p_type := 'entrada',
      p_qty := movement_row.qty,
      p_note := 'Reverso exacto envio',
      p_created_by := p_actor_id,
      p_reason_code := 'correction_reversal',
      p_reference_type := 'shipment',
      p_reference_id := p_shipment_id,
      p_reversal_of_movement_id := movement_row.id,
      p_movement_key := reverse_key
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
