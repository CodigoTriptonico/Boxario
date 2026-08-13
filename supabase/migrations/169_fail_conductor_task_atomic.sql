-- L-H5: atomic conductor task failure (attempt + cancelled status + stop outcome).
-- No window where shipment_logistics_task_attempts exists without task status=cancelled.
-- Attempt payload conflicts are non-retryable; identical replays are idempotent.

create or replace function public.fail_conductor_task_atomic(
  p_organization_id uuid,
  p_task_id uuid,
  p_driver_id uuid,
  p_note text,
  p_failure_reason text,
  p_evidence_url text,
  p_client_operation_id text,
  p_captured_at timestamptz,
  p_invoice_visible boolean,
  p_actor_id uuid
) returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_id uuid := auth.uid();
  caller_org uuid := public.current_organization_id();
  task_row public.shipment_logistics_tasks;
  route_row public.logistics_routes;
  stop_row public.logistics_route_stops;
  existing_attempt public.shipment_logistics_task_attempts;
  attempt_id uuid;
  effective_driver uuid;
  is_admin_actor boolean := false;
  safe_note text := left(coalesce(p_note, ''), 500);
  safe_failure text := left(coalesce(p_failure_reason, ''), 200);
  safe_evidence text := left(coalesce(p_evidence_url, ''), 2000);
  invoice_visible boolean := coalesce(p_invoice_visible, false);
  payload_matches boolean := false;
begin
  -- Spoofable authority fields intentionally ignored.
  perform p_organization_id, p_actor_id;

  if caller_id is null or caller_org is null then
    raise exception 'UNAUTHORIZED';
  end if;

  if not exists (
    select 1 from public.profiles
    where id = caller_id and is_active and organization_id = caller_org
  ) then
    raise exception 'UNAUTHORIZED';
  end if;

  if coalesce(nullif(btrim(p_client_operation_id), ''), '') = '' then
    raise exception 'OPERATION_KEY_REQUIRED';
  end if;

  if coalesce(nullif(btrim(safe_failure), ''), '') = '' then
    raise exception 'FAILURE_REASON_REQUIRED';
  end if;

  is_admin_actor := public.user_has_permission('routes.update_status')
    and caller_id is distinct from coalesce(p_driver_id, caller_id);

  if is_admin_actor then
    if p_driver_id is null then
      raise exception 'DRIVER_REQUIRED';
    end if;
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

  select * into existing_attempt
  from public.shipment_logistics_task_attempts a
  where a.organization_id = caller_org
    and a.client_operation_id = p_client_operation_id::uuid
  limit 1
  for update;

  if existing_attempt.id is not null then
    payload_matches :=
      existing_attempt.task_id = p_task_id
      and existing_attempt.driver_id = effective_driver
      and existing_attempt.result = 'failed'
      and coalesce(existing_attempt.failure_reason, '') = safe_failure
      and coalesce(existing_attempt.note, '') = safe_note
      and coalesce(existing_attempt.evidence_url, '') = safe_evidence
      and coalesce(existing_attempt.invoice_visible, false) = invoice_visible;

    if not payload_matches then
      raise exception 'ATTEMPT_CONFLICT';
    end if;

    select * into task_row
    from public.shipment_logistics_tasks
    where id = existing_attempt.task_id
      and organization_id = caller_org
    for update;

    if task_row.id is not null and task_row.status = 'cancelled' then
      return jsonb_build_object(
        'replayed', true,
        'taskId', task_row.id,
        'attemptId', existing_attempt.id,
        'status', 'cancelled'
      );
    end if;

    -- Matching payload but task not cancelled: orphan recovery (delete attempt, continue).
    delete from public.shipment_logistics_task_attempts
    where id = existing_attempt.id
      and organization_id = caller_org;
  end if;

  select * into task_row
  from public.shipment_logistics_tasks
  where id = p_task_id
    and organization_id = caller_org
  for update;

  if task_row.id is null then
    raise exception 'TASK_NOT_FOUND';
  end if;

  if task_row.status = 'cancelled' then
    -- Terminal without a matching attempt for this operation key.
    raise exception 'TASK_CANCELLED';
  end if;

  if task_row.status = 'completed' then
    raise exception 'TASK_ALREADY_COMPLETED';
  end if;

  if task_row.status not in ('assigned', 'loaded_to_truck', 'scheduled', 'pending') then
    raise exception 'TASK_NOT_EXECUTABLE';
  end if;

  select route.* into route_row
  from public.logistics_route_stops stop
  join public.logistics_routes route on route.id = stop.route_id
  where stop.task_id = task_row.id
    and stop.released_at is null
    and stop.organization_id = caller_org
  order by stop.created_at desc
  limit 1;

  if route_row.id is null then
    raise exception 'TASK_ROUTE_REQUIRED';
  end if;

  if route_row.organization_id is distinct from caller_org then
    raise exception 'FORBIDDEN';
  end if;

  if route_row.assigned_to is distinct from effective_driver then
    raise exception 'TASK_NOT_ASSIGNED_TO_DRIVER';
  end if;

  if route_row.status is distinct from 'in_progress' then
    raise exception 'TASK_REQUIRES_ROUTE_IN_PROGRESS';
  end if;

  update public.shipment_logistics_tasks
  set
    status = 'cancelled',
    notes = nullif(btrim(concat_ws(' - ', nullif(safe_failure, ''), nullif(safe_note, ''))), ''),
    completed_at = null,
    updated_at = now()
  where id = task_row.id;

  select * into stop_row
  from public.logistics_route_stops
  where task_id = task_row.id
    and released_at is null
    and organization_id = caller_org
  order by created_at desc
  limit 1
  for update;

  if stop_row.id is not null then
    update public.logistics_route_stops
    set outcome = 'failed',
        outcome_at = coalesce(p_captured_at, now()),
        updated_at = now()
    where id = stop_row.id;
  end if;

  insert into public.shipment_logistics_task_attempts (
    organization_id, task_id, shipment_id, route_id, driver_id, result, failure_reason,
    note, evidence_url, payment_expected_amount, payment_amount, payment_method,
    payment_outcome, invoice_visible, client_operation_id, captured_at, created_by
  ) values (
    caller_org, task_row.id, task_row.shipment_id, route_row.id, effective_driver, 'failed',
    safe_failure, safe_note, safe_evidence,
    null, null, null,
    'not_applicable', invoice_visible,
    p_client_operation_id::uuid, coalesce(p_captured_at, now()), caller_id
  )
  returning id into attempt_id;

  return jsonb_build_object(
    'replayed', false,
    'taskId', task_row.id,
    'attemptId', attempt_id,
    'status', 'cancelled',
    'actorId', caller_id,
    'organizationId', caller_org,
    'driverId', effective_driver
  );
end;
$$;

revoke all on function public.fail_conductor_task_atomic(
  uuid, uuid, uuid, text, text, text, text, timestamptz, boolean, uuid
) from public, anon;

grant execute on function public.fail_conductor_task_atomic(
  uuid, uuid, uuid, text, text, text, text, timestamptz, boolean, uuid
) to authenticated;

grant execute on function public.fail_conductor_task_atomic(
  uuid, uuid, uuid, text, text, text, text, timestamptz, boolean, uuid
) to service_role;
