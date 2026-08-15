-- Add the three-letter destination city code to new invoice references.

drop function if exists public.reserve_organization_invoice_number(uuid, text, text, integer, integer, integer);

create or replace function public.reserve_organization_invoice_number(
  target_org_id uuid,
  target_reservation_token text,
  target_country_code text,
  target_city_code text,
  target_box_count integer,
  target_seller_code integer,
  target_company_code integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_org uuid;
  existing public.organization_invoice_reservations%rowtype;
  counter_last bigint;
  highest_reserved bigint;
  next_sequence bigint;
  invoice_number text;
  reservation_expires_at timestamptz := now() + interval '15 minutes';
begin
  caller_org := public.current_organization_id();
  if caller_org is null or target_org_id is distinct from caller_org then
    raise exception 'Forbidden';
  end if;
  if nullif(btrim(target_reservation_token), '') is null
    or length(target_reservation_token) > 200 then
    raise exception 'INVOICE_RESERVATION_TOKEN_INVALID';
  end if;
  if target_box_count is null or target_box_count < 1
    or target_seller_code is null or target_seller_code < 1 or target_seller_code > 999
    or target_company_code is null or target_company_code < 1
    or target_city_code is null or target_city_code !~ '^[A-Z]{3}$' then
    raise exception 'INVOICE_RESERVATION_IDENTITY_INVALID';
  end if;

  update public.organization_invoice_reservations
  set status = 'released', updated_at = now()
  where organization_id = target_org_id
    and status = 'active'
    and expires_at <= now();

  select * into existing
  from public.organization_invoice_reservations
  where organization_id = target_org_id
    and reservation_token = btrim(target_reservation_token)
  for update;

  if existing.id is not null and existing.status = 'active' then
    update public.organization_invoice_reservations
    set expires_at = reservation_expires_at, updated_at = now()
    where id = existing.id;
    return jsonb_build_object(
      'reservationToken', existing.reservation_token,
      'invoiceNumber', existing.invoice_number,
      'sequence', existing.sequence_number,
      'expiresAt', reservation_expires_at
    );
  end if;

  if existing.id is not null and existing.status = 'committed' then
    raise exception 'INVOICE_RESERVATION_ALREADY_COMMITTED';
  end if;

  insert into public.organization_invoice_counters (organization_id, last_number)
  values (target_org_id, 0)
  on conflict (organization_id) do nothing;

  select last_number into counter_last
  from public.organization_invoice_counters
  where organization_id = target_org_id
  for update;

  select coalesce(max(sequence_number), 0) into highest_reserved
  from public.organization_invoice_reservations
  where organization_id = target_org_id and status = 'active';

  next_sequence := greatest(counter_last, highest_reserved) + 1;
  while exists (
    select 1 from public.organization_invoice_reservations reservation
    where reservation.organization_id = target_org_id
      and reservation.status = 'active'
      and reservation.sequence_number = next_sequence
  ) loop
    next_sequence := next_sequence + 1;
  end loop;

  invoice_number := upper(coalesce(nullif(btrim(target_country_code), ''), 'UNK'))
    || lpad(target_seller_code::text, 3, '0')
    || upper(btrim(target_city_code))
    || target_box_count::text
    || lpad(target_company_code::text, 3, '0')
    || lpad(next_sequence::text, 4, '0');

  insert into public.organization_invoice_reservations(
    organization_id, reservation_token, invoice_number, sequence_number,
    expires_at, created_by
  ) values (
    target_org_id, btrim(target_reservation_token), invoice_number, next_sequence,
    reservation_expires_at, auth.uid()
  )
  on conflict (organization_id, reservation_token) do update
  set invoice_number = excluded.invoice_number,
      sequence_number = excluded.sequence_number,
      status = 'active', expires_at = excluded.expires_at, updated_at = now();

  return jsonb_build_object(
    'reservationToken', btrim(target_reservation_token),
    'invoiceNumber', invoice_number,
    'sequence', next_sequence,
    'expiresAt', reservation_expires_at
  );
end;
$$;

revoke all on function public.reserve_organization_invoice_number(uuid, text, text, text, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.reserve_organization_invoice_number(uuid, text, text, text, integer, integer, integer)
  to authenticated, service_role;
