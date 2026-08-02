-- Logistics route integrity: publish flow, conductor RLS, task/route guards,
-- atomic conductor completion, custody sync, pallet close, route notifications.

-- ---------------------------------------------------------------------------
-- 1. Route start GPS + change notifications / audit
-- ---------------------------------------------------------------------------

alter table public.logistics_routes
  add column if not exists started_lat double precision,
  add column if not exists started_lng double precision;

create table if not exists public.logistics_route_notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  route_id uuid not null references public.logistics_routes (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  change_type text not null check (
    change_type in (
      'stop_added',
      'stop_cancelled',
      'stop_reordered',
      'stop_priority',
      'stop_instructions',
      'route_published',
      'route_started'
    )
  ),
  stop_id uuid references public.logistics_route_stops (id) on delete set null,
  summary text not null default '',
  actor_id uuid references public.profiles (id) on delete set null,
  actor_name text not null default '',
  idempotency_key text not null,
  read_at timestamptz,
  created_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);

create index if not exists idx_logistics_route_notifications_recipient
  on public.logistics_route_notifications (recipient_id, read_at, created_at desc);

create table if not exists public.logistics_route_change_audit (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  route_id uuid not null references public.logistics_routes (id) on delete cascade,
  stop_id uuid references public.logistics_route_stops (id) on delete set null,
  change_type text not null,
  reason text not null,
  before_value jsonb not null default '{}'::jsonb,
  after_value jsonb not null default '{}'::jsonb,
  actor_id uuid references public.profiles (id) on delete set null,
  actor_name text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists idx_logistics_route_change_audit_route
  on public.logistics_route_change_audit (route_id, created_at desc);

alter table public.logistics_route_notifications enable row level security;
alter table public.logistics_route_change_audit enable row level security;

drop policy if exists logistics_route_notifications_select on public.logistics_route_notifications;
create policy logistics_route_notifications_select on public.logistics_route_notifications for select
  using (
    organization_id = public.current_organization_id()
    and (
      recipient_id = auth.uid()
      or public.user_has_permission('routes.update_status')
      or public.user_has_permission('sales.manage')
    )
  );

drop policy if exists logistics_route_notifications_update on public.logistics_route_notifications;
create policy logistics_route_notifications_update on public.logistics_route_notifications for update
  using (
    organization_id = public.current_organization_id()
    and recipient_id = auth.uid()
  )
  with check (
    organization_id = public.current_organization_id()
    and recipient_id = auth.uid()
  );

drop policy if exists logistics_route_change_audit_select on public.logistics_route_change_audit;
create policy logistics_route_change_audit_select on public.logistics_route_change_audit for select
  using (
    organization_id = public.current_organization_id()
    and (
      public.user_has_permission('routes.update_status')
      or public.user_has_permission('sales.manage')
      or exists (
        select 1 from public.logistics_routes route
        where route.id = logistics_route_change_audit.route_id
          and route.assigned_to = auth.uid()
      )
    )
  );

drop policy if exists logistics_route_change_audit_insert on public.logistics_route_change_audit;
create policy logistics_route_change_audit_insert on public.logistics_route_change_audit for insert
  with check (
    organization_id = public.current_organization_id()
    and (
      public.user_has_permission('routes.update_status')
      or public.user_has_permission('sales.manage')
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Conductor RLS: only own assigned routes (planned/in_progress visibility
--    is enforced in app + helper; RLS restores assigned_to isolation)
-- ---------------------------------------------------------------------------

drop policy if exists logistics_routes_select on public.logistics_routes;
create policy logistics_routes_select on public.logistics_routes for select
  using (
    organization_id = public.current_organization_id()
    and (
      (
        public.current_role_slug() = 'conductor'
        and assigned_to = auth.uid()
        and public.user_has_permission('routes.view')
      )
      or (
        public.current_role_slug() is distinct from 'conductor'
        and (
          public.user_has_permission('routes.view')
          or public.user_has_permission('sales.manage')
        )
      )
    )
  );

drop policy if exists logistics_route_stops_select on public.logistics_route_stops;
create policy logistics_route_stops_select on public.logistics_route_stops for select
  using (
    organization_id = public.current_organization_id()
    and (
      (
        public.current_role_slug() = 'conductor'
        and public.user_has_permission('routes.view')
        and exists (
          select 1
          from public.logistics_routes route
          where route.id = logistics_route_stops.route_id
            and route.organization_id = logistics_route_stops.organization_id
            and route.assigned_to = auth.uid()
        )
      )
      or (
        public.current_role_slug() is distinct from 'conductor'
        and (
          public.user_has_permission('routes.view')
          or public.user_has_permission('sales.manage')
        )
      )
    )
  );

drop policy if exists shipment_logistics_tasks_select on public.shipment_logistics_tasks;
create policy shipment_logistics_tasks_select on public.shipment_logistics_tasks for select
  using (
    organization_id = public.current_organization_id()
    and (
      (
        public.current_role_slug() = 'conductor'
        and public.user_has_permission('routes.view')
        and (
          assigned_to = auth.uid()
          or exists (
            select 1
            from public.logistics_route_stops stop
            join public.logistics_routes route on route.id = stop.route_id
            where stop.task_id = shipment_logistics_tasks.id
              and stop.released_at is null
              and route.assigned_to = auth.uid()
          )
        )
      )
      or (
        public.current_role_slug() is distinct from 'conductor'
        and (
          public.user_has_permission('sales.manage')
          or public.user_has_permission('routes.view')
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Helpers: notify driver, publish route
-- ---------------------------------------------------------------------------

create or replace function public.notify_logistics_route_change(
  target_route_id uuid,
  target_recipient_id uuid,
  target_change_type text,
  target_summary text,
  target_stop_id uuid,
  target_idempotency_key text,
  target_actor_id uuid,
  target_actor_name text
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  org_id uuid;
  notification_id uuid;
begin
  select organization_id into org_id
  from public.logistics_routes
  where id = target_route_id;

  if org_id is null or target_recipient_id is null then
    return null;
  end if;

  insert into public.logistics_route_notifications (
    organization_id, route_id, recipient_id, change_type, stop_id, summary,
    actor_id, actor_name, idempotency_key
  ) values (
    org_id, target_route_id, target_recipient_id, target_change_type, target_stop_id,
    coalesce(target_summary, ''), target_actor_id, coalesce(target_actor_name, ''),
    target_idempotency_key
  )
  on conflict (organization_id, idempotency_key) do update
    set summary = excluded.summary
  returning id into notification_id;

  return notification_id;
end;
$$;

create or replace function public.publish_logistics_route(target_route_id uuid)
returns public.logistics_routes
language plpgsql
security definer
set search_path = public
as $$
declare
  route_row public.logistics_routes;
  stop_count integer;
  stops_without_geo integer;
  tasks_without_date integer;
  tasks_mismatched_date integer;
begin
  if auth.uid() is null
     or not (
       public.user_has_permission('routes.update_status')
       or public.user_has_permission('sales.manage')
     ) then
    raise exception 'FORBIDDEN';
  end if;

  select * into route_row
  from public.logistics_routes
  where id = target_route_id
    and organization_id = public.current_organization_id()
  for update;

  if route_row.id is null then
    raise exception 'ROUTE_NOT_FOUND';
  end if;
  if route_row.status <> 'draft' then
    raise exception 'ROUTE_NOT_DRAFT';
  end if;
  if route_row.assigned_to is null then
    raise exception 'ROUTE_MISSING_DRIVER';
  end if;
  if route_row.vehicle_id is null then
    raise exception 'ROUTE_MISSING_VEHICLE';
  end if;

  select
    count(*)::integer,
    count(*) filter (
      where stop.lat is null or stop.lng is null
         or not (stop.lat between -90 and 90)
         or not (stop.lng between -180 and 180)
    )::integer
  into stop_count, stops_without_geo
  from public.logistics_route_stops stop
  where stop.route_id = route_row.id
    and stop.released_at is null
    and stop.organization_id = route_row.organization_id;

  if stop_count < 1 then
    raise exception 'ROUTE_WITHOUT_STOPS';
  end if;
  if stops_without_geo > 0 then
    raise exception 'ROUTE_STOPS_WITHOUT_GEO';
  end if;

  select
    count(*) filter (
      where task.schedule_confirmation_status is distinct from 'confirmed'
         or (task.scheduled_at is null and task.window_start_at is null)
    )::integer,
    count(*) filter (
      where coalesce(task.scheduled_at, task.window_start_at)::date is distinct from route_row.route_date
    )::integer
  into tasks_without_date, tasks_mismatched_date
  from public.logistics_route_stops stop
  join public.shipment_logistics_tasks task on task.id = stop.task_id
  where stop.route_id = route_row.id
    and stop.released_at is null;

  if tasks_without_date > 0 then
    raise exception 'ROUTE_TASKS_WITHOUT_CONFIRMED_DATE';
  end if;
  if tasks_mismatched_date > 0 then
    raise exception 'ROUTE_TASK_DATE_MISMATCH';
  end if;

  if route_row.warehouse_id is not null then
    if not exists (
      select 1 from public.warehouses warehouse
      where warehouse.id = route_row.warehouse_id
        and warehouse.organization_id = route_row.organization_id
        and warehouse.is_active
    ) then
      raise exception 'ROUTE_WAREHOUSE_INVALID';
    end if;
  end if;

  update public.logistics_routes
  set status = 'planned',
      published_at = now(),
      published_by = auth.uid(),
      updated_at = now()
  where id = route_row.id
  returning * into route_row;

  perform public.notify_logistics_route_change(
    route_row.id,
    route_row.assigned_to,
    'route_published',
    'Ruta publicada: ' || route_row.name,
    null,
    'route_published:' || route_row.id::text || ':' || coalesce(route_row.published_at::text, ''),
    auth.uid(),
    coalesce((select full_name from public.profiles where id = auth.uid()), '')
  );

  return route_row;
end;
$$;

revoke execute on function public.publish_logistics_route(uuid) from public, anon;
grant execute on function public.publish_logistics_route(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Guard: operational task completion requires route in_progress
-- ---------------------------------------------------------------------------

create or replace function public.assert_active_route_for_task_completion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  route_status text;
  route_id_value uuid;
  admin_exception boolean;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status <> 'completed' then
    return new;
  end if;

  admin_exception := coalesce((current_setting('boxario.allow_admin_task_exception', true)), '') = '1';

  select stop.route_id, route.status
  into route_id_value, route_status
  from public.logistics_route_stops stop
  join public.logistics_routes route on route.id = stop.route_id
  where stop.task_id = new.id
    and stop.released_at is null
  order by stop.created_at desc
  limit 1;

  if route_id_value is null then
    -- Unrouted tasks may still be completed by office flows when not on a route.
    return new;
  end if;

  if route_status <> 'in_progress' and not admin_exception then
    raise exception 'TASK_REQUIRES_ROUTE_IN_PROGRESS';
  end if;

  return new;
end;
$$;

drop trigger if exists shipment_task_requires_active_route on public.shipment_logistics_tasks;
create trigger shipment_task_requires_active_route
before update of status on public.shipment_logistics_tasks
for each row execute function public.assert_active_route_for_task_completion();

create or replace function public.mark_collected_packages_in_truck()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  route_id_value uuid;
  driver_id_value uuid;
  route_status text;
begin
  if new.task_type <> 'pickup_full_box' or new.status <> 'completed'
    or old.status = 'completed' then
    return new;
  end if;

  select stop.route_id, coalesce(route.assigned_to, new.assigned_to), route.status
    into route_id_value, driver_id_value, route_status
  from public.logistics_route_stops stop
  join public.logistics_routes route on route.id = stop.route_id
  where stop.task_id = new.id and stop.released_at is null
  order by stop.created_at desc limit 1;

  if route_id_value is null then
    return new;
  end if;

  if route_status is distinct from 'in_progress' then
    raise exception 'PACKAGE_IN_TRUCK_REQUIRES_ROUTE_IN_PROGRESS';
  end if;

  update public.shipment_packages package set
    status = 'in_truck',
    truck_route_id = route_id_value,
    truck_task_id = new.id,
    collection_source = 'driver',
    collection_recorded_at = coalesce(package.collection_recorded_at, new.completed_at, now()),
    collection_recorded_by = coalesce(package.collection_recorded_by, driver_id_value),
    updated_at = now()
  where package.organization_id = new.organization_id
    and package.shipment_id = new.shipment_id
    and package.status = 'awaiting_full_box';

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Atomic conductor task completion (payment + task + shipment + stop)
-- ---------------------------------------------------------------------------

create or replace function public.complete_conductor_task_atomic(
  p_organization_id uuid,
  p_task_id uuid,
  p_driver_id uuid,
  p_result text,
  p_note text,
  p_failure_reason text,
  p_evidence_url text,
  p_client_operation_id text,
  p_captured_at timestamptz,
  p_payment_amount numeric,
  p_payment_method text,
  p_payment_expected_amount numeric,
  p_payment_outcome text,
  p_invoice_visible boolean,
  p_actor_id uuid,
  p_task_patch jsonb,
  p_shipment_patch jsonb,
  p_payment_plan jsonb,
  p_next_paid numeric,
  p_next_profit numeric,
  p_next_sale_kind text,
  p_next_invoice_status text,
  p_next_accounting_status text,
  p_next_finalized_at timestamptz,
  p_collect_payment boolean
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  task_row public.shipment_logistics_tasks;
  route_row public.logistics_routes;
  stop_row public.logistics_route_stops;
  attempt_id uuid;
  settlement_paid numeric;
begin
  if coalesce(nullif(btrim(p_client_operation_id), ''), '') = '' then
    raise exception 'OPERATION_KEY_REQUIRED';
  end if;

  select id into attempt_id
  from public.shipment_logistics_task_attempts
  where organization_id = p_organization_id
    and client_operation_id = p_client_operation_id::uuid
  limit 1;

  if attempt_id is not null then
    return jsonb_build_object('replayed', true, 'taskId', p_task_id, 'attemptId', attempt_id);
  end if;

  select * into task_row
  from public.shipment_logistics_tasks
  where id = p_task_id
    and organization_id = p_organization_id
  for update;

  if task_row.id is null then
    raise exception 'TASK_NOT_FOUND';
  end if;
  if task_row.status = 'completed' then
    return jsonb_build_object('replayed', true, 'taskId', p_task_id);
  end if;
  if task_row.status = 'cancelled' then
    raise exception 'TASK_CANCELLED';
  end if;

  select route.* into route_row
  from public.logistics_route_stops stop
  join public.logistics_routes route on route.id = stop.route_id
  where stop.task_id = task_row.id
    and stop.released_at is null
  order by stop.created_at desc
  limit 1;

  if route_row.id is not null and route_row.status is distinct from 'in_progress' then
    raise exception 'TASK_REQUIRES_ROUTE_IN_PROGRESS';
  end if;

  if p_collect_payment and coalesce(p_payment_amount, 0) > 0 then
    perform public.collect_shipment_invoice_payment(
      task_row.shipment_id,
      p_organization_id,
      p_next_paid,
      p_next_profit,
      p_next_sale_kind,
      p_next_invoice_status,
      p_next_accounting_status,
      p_next_finalized_at,
      coalesce(p_payment_plan, '{}'::jsonb),
      p_payment_amount,
      p_payment_method,
      'deposit',
      coalesce(p_note, ''),
      p_actor_id
    );
    settlement_paid := p_next_paid;
  end if;

  if p_result = 'completed' then
    update public.shipment_logistics_tasks
    set
      status = coalesce(p_task_patch ->> 'status', 'completed'),
      completed_at = coalesce((p_task_patch ->> 'completed_at')::timestamptz, now()),
      notes = coalesce(p_task_patch ->> 'notes', p_note, notes),
      loaded_at = case
        when p_task_patch ? 'loaded_at' then (p_task_patch ->> 'loaded_at')::timestamptz
        else loaded_at
      end,
      stock_deducted_at = case
        when p_task_patch ? 'stock_deducted_at' then (p_task_patch ->> 'stock_deducted_at')::timestamptz
        else stock_deducted_at
      end,
      updated_at = now()
    where id = task_row.id;
  else
    update public.shipment_logistics_tasks
    set
      status = 'cancelled',
      notes = coalesce(p_note, notes),
      updated_at = now()
    where id = task_row.id;
  end if;

  if p_shipment_patch is not null and p_shipment_patch <> '{}'::jsonb then
    update public.shipments
    set
      status = coalesce(p_shipment_patch ->> 'status', status),
      empty_box_delivered_at = case
        when p_shipment_patch ? 'empty_box_delivered_at'
          then (p_shipment_patch ->> 'empty_box_delivered_at')::timestamptz
        else empty_box_delivered_at
      end,
      full_box_collected_at = case
        when p_shipment_patch ? 'full_box_collected_at'
          then (p_shipment_patch ->> 'full_box_collected_at')::timestamptz
        else full_box_collected_at
      end,
      logistics_plan = case
        when p_shipment_patch ? 'logistics_plan' then p_shipment_patch -> 'logistics_plan'
        else logistics_plan
      end
    where id = task_row.shipment_id
      and organization_id = p_organization_id;
  end if;

  select * into stop_row
  from public.logistics_route_stops
  where task_id = task_row.id
    and released_at is null
  order by created_at desc
  limit 1;

  if stop_row.id is not null then
    update public.logistics_route_stops
    set outcome = case when p_result = 'completed' then 'completed' else 'failed' end,
        outcome_at = now()
    where id = stop_row.id;
  end if;

  insert into public.shipment_logistics_task_attempts (
    organization_id, task_id, shipment_id, route_id, driver_id, result, failure_reason,
    note, evidence_url, payment_expected_amount, payment_amount, payment_method,
    payment_outcome, invoice_visible, client_operation_id, captured_at, created_by
  ) values (
    p_organization_id, task_row.id, task_row.shipment_id, route_row.id, p_driver_id, p_result,
    coalesce(p_failure_reason, ''), coalesce(p_note, ''), coalesce(p_evidence_url, ''),
    p_payment_expected_amount, coalesce(p_payment_amount, 0), coalesce(p_payment_method, ''),
    coalesce(p_payment_outcome, 'not_applicable'), coalesce(p_invoice_visible, false),
    p_client_operation_id::uuid, coalesce(p_captured_at, now()), p_actor_id
  )
  returning id into attempt_id;

  return jsonb_build_object(
    'replayed', false,
    'taskId', task_row.id,
    'attemptId', attempt_id,
    'paid', settlement_paid
  );
end;
$$;

revoke execute on function public.complete_conductor_task_atomic(
  uuid, uuid, uuid, text, text, text, text, text, timestamptz, numeric, text, numeric, text, boolean, uuid,
  jsonb, jsonb, jsonb, numeric, numeric, text, text, text, timestamptz, boolean
) from public, anon;
grant execute on function public.complete_conductor_task_atomic(
  uuid, uuid, uuid, text, text, text, text, text, timestamptz, numeric, text, numeric, text, boolean, uuid,
  jsonb, jsonb, jsonb, numeric, numeric, text, text, text, timestamptz, boolean
) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6. Custody accept updates physical package status atomically
-- ---------------------------------------------------------------------------

create or replace function public.accept_package_custody_handoff(
  target_handoff_id uuid,
  receive_evidence_value jsonb,
  operation_key text
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  handoff public.package_custody_handoffs;
  package_row public.shipment_packages;
  next_status text;
begin
  if auth.uid() is null or not public.user_has_permission('package.custody.receive') then
    raise exception 'FORBIDDEN';
  end if;
  if jsonb_typeof(coalesce(receive_evidence_value, '{}'::jsonb)) <> 'object'
     or receive_evidence_value = '{}'::jsonb then
    raise exception 'CUSTODY_EVIDENCE_REQUIRED';
  end if;
  if coalesce(nullif(btrim(operation_key), ''), '') = '' then
    raise exception 'CUSTODY_OPERATION_KEY_REQUIRED';
  end if;

  select * into handoff
  from public.package_custody_handoffs
  where id = target_handoff_id
    and organization_id = public.current_organization_id()
  for update;

  if handoff.id is null then raise exception 'CUSTODY_HANDOFF_NOT_FOUND'; end if;
  if handoff.status = 'accepted' then
    return jsonb_build_object('handoffId', handoff.id, 'status', 'accepted', 'replayed', true);
  end if;
  if handoff.status <> 'pending' then raise exception 'CUSTODY_HANDOFF_NOT_PENDING'; end if;
  if handoff.initiated_by = auth.uid() then raise exception 'CUSTODY_RECEIVER_MUST_BE_DISTINCT'; end if;

  if handoff.to_holder_id is not null
     and handoff.to_holder_id <> auth.uid()
     and not public.user_has_permission('package.custody.receive.delegated') then
    raise exception 'CUSTODY_DESIGNATED_RECEIVER_REQUIRED';
  end if;
  if handoff.to_holder_id is null
     and not public.user_has_permission('package.custody.receive.delegated') then
    raise exception 'CUSTODY_DELEGATION_REQUIRED';
  end if;

  select * into package_row from public.shipment_packages where id = handoff.package_id for update;
  if package_row.id is null then raise exception 'PACKAGE_NOT_FOUND'; end if;

  next_status := package_row.status;
  if handoff.to_holder_type = 'proveedor'
     and package_row.status in ('on_pallet', 'in_warehouse') then
    next_status := 'handed_to_carrier';
  elsif handoff.to_holder_type = 'bodega'
     and package_row.status = 'on_pallet' then
    next_status := 'in_warehouse';
  end if;

  update public.package_custody_handoffs
  set status = 'accepted',
      received_by = auth.uid(),
      received_at = now(),
      receive_evidence = receive_evidence_value
  where id = handoff.id
  returning * into handoff;

  if next_status is distinct from package_row.status then
    update public.shipment_packages
    set status = next_status,
        updated_at = now()
    where id = package_row.id
    returning * into package_row;
  end if;

  insert into public.package_custody_events (
    organization_id, package_id, shipment_id, event_type,
    from_holder_type, from_holder_id, from_holder_label,
    to_holder_type, to_holder_id, to_holder_label,
    package_status, actor_id, evidence, source, occurred_at, event_key
  ) values (
    handoff.organization_id, handoff.package_id, handoff.shipment_id, 'manual_handoff',
    handoff.from_holder_type, handoff.from_holder_id, handoff.from_holder_label,
    handoff.to_holder_type, handoff.to_holder_id, handoff.to_holder_label,
    package_row.status, auth.uid(), receive_evidence_value, 'manual_handoff',
    handoff.received_at, 'handoff:' || handoff.id::text
  ) on conflict (organization_id, event_key) do nothing;

  return jsonb_build_object(
    'handoffId', handoff.id,
    'status', 'accepted',
    'replayed', false,
    'packageStatus', package_row.status
  );
end;
$$;

revoke execute on function public.accept_package_custody_handoff(uuid, jsonb, text)
  from public, anon;
grant execute on function public.accept_package_custody_handoff(uuid, jsonb, text)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Pallet close / reopen exception
-- ---------------------------------------------------------------------------

create or replace function public.close_warehouse_pallet(
  target_pallet_id uuid,
  operation_key text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pallet_row public.warehouse_pallets;
begin
  if auth.uid() is null or not (
    public.user_has_permission('pallets.manage')
    or public.user_has_permission('warehouses.manage')
  ) then
    raise exception 'FORBIDDEN';
  end if;
  if coalesce(nullif(btrim(operation_key), ''), '') = '' then
    raise exception 'OPERATION_KEY_REQUIRED';
  end if;

  select * into pallet_row
  from public.warehouse_pallets
  where id = target_pallet_id
    and organization_id = public.current_organization_id()
  for update;

  if pallet_row.id is null then raise exception 'PALLET_NOT_FOUND'; end if;
  if pallet_row.status = 'closed' then
    return jsonb_build_object('palletId', pallet_row.id, 'status', 'closed', 'replayed', true);
  end if;
  if pallet_row.status <> 'open' then raise exception 'PALLET_NOT_OPEN'; end if;

  if not exists (
    select 1 from public.shipment_packages pkg
    where pkg.pallet_id = pallet_row.id
      and pkg.organization_id = pallet_row.organization_id
  ) then
    raise exception 'PALLET_EMPTY';
  end if;

  update public.warehouse_pallets
  set status = 'closed', updated_at = now()
  where id = pallet_row.id
  returning * into pallet_row;

  return jsonb_build_object('palletId', pallet_row.id, 'status', pallet_row.status, 'replayed', false);
end;
$$;

create or replace function public.reopen_warehouse_pallet_exception(
  target_pallet_id uuid,
  reason_value text,
  operation_key text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  pallet_row public.warehouse_pallets;
begin
  if auth.uid() is null or not (
    public.user_has_permission('pallets.manage')
    or public.user_has_permission('warehouses.manage')
  ) then
    raise exception 'FORBIDDEN';
  end if;
  if coalesce(nullif(btrim(reason_value), ''), '') = '' then
    raise exception 'REASON_REQUIRED';
  end if;
  if coalesce(nullif(btrim(operation_key), ''), '') = '' then
    raise exception 'OPERATION_KEY_REQUIRED';
  end if;

  select * into pallet_row
  from public.warehouse_pallets
  where id = target_pallet_id
    and organization_id = public.current_organization_id()
  for update;

  if pallet_row.id is null then raise exception 'PALLET_NOT_FOUND'; end if;
  if pallet_row.status = 'open' then
    return jsonb_build_object('palletId', pallet_row.id, 'status', 'open', 'replayed', true);
  end if;

  update public.warehouse_pallets
  set status = 'open', updated_at = now()
  where id = pallet_row.id
  returning * into pallet_row;

  insert into public.activity_history (
    organization_id, actor_id, actor_name, action, entity_type, entity_id, title, description, metadata
  ) values (
    pallet_row.organization_id,
    auth.uid(),
    coalesce((select full_name from public.profiles where id = auth.uid()), ''),
    'warehouse.pallet_reopened',
    'warehouse_pallet',
    pallet_row.id,
    'Paleta reabierta: ' || pallet_row.code,
    btrim(reason_value),
    jsonb_build_object('operationKey', operation_key, 'reason', btrim(reason_value))
  );

  return jsonb_build_object('palletId', pallet_row.id, 'status', pallet_row.status, 'replayed', false);
end;
$$;

revoke execute on function public.close_warehouse_pallet(uuid, text) from public, anon;
grant execute on function public.close_warehouse_pallet(uuid, text) to authenticated;
revoke execute on function public.reopen_warehouse_pallet_exception(uuid, text, text) from public, anon;
grant execute on function public.reopen_warehouse_pallet_exception(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Inventory reverse by exact shipment reference (no note LIKE)
-- ---------------------------------------------------------------------------

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
      and movement.reference_type = 'shipment'
      and movement.reference_id = p_shipment_id
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

revoke execute on function public.notify_logistics_route_change(
  uuid, uuid, text, text, uuid, text, uuid, text
) from public, anon;
grant execute on function public.notify_logistics_route_change(
  uuid, uuid, text, text, uuid, text, uuid, text
) to authenticated, service_role;
