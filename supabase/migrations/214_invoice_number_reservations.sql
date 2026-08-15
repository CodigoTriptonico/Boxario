-- Temporary invoice reservations keep the preview unique without consuming
-- the organization counter until the shipment is actually inserted.

create table if not exists public.organization_invoice_reservations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  reservation_token text not null,
  invoice_number text not null,
  sequence_number bigint not null check (sequence_number > 0),
  status text not null default 'active' check (status in ('active', 'committed', 'released')),
  expires_at timestamptz not null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, reservation_token)
);

create unique index if not exists organization_invoice_reservations_active_sequence
  on public.organization_invoice_reservations (organization_id, sequence_number)
  where status = 'active';

create unique index if not exists organization_invoice_reservations_active_invoice
  on public.organization_invoice_reservations (organization_id, invoice_number)
  where status = 'active';

create index if not exists organization_invoice_reservations_expiry
  on public.organization_invoice_reservations (organization_id, status, expires_at);

alter table public.organization_invoice_reservations enable row level security;

create or replace function public.reserve_organization_invoice_number(
  target_org_id uuid,
  target_reservation_token text,
  target_country_code text,
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
    or target_company_code is null or target_company_code < 1 then
    raise exception 'INVOICE_RESERVATION_IDENTITY_INVALID';
  end if;

  update public.organization_invoice_reservations
  set status = 'released', updated_at = now()
  where organization_id = target_org_id
    and status = 'active'
    and expires_at <= now();

  select *
    into existing
  from public.organization_invoice_reservations
  where organization_id = target_org_id
    and reservation_token = btrim(target_reservation_token)
  for update;

  if existing.id is not null and existing.status = 'active' then
    update public.organization_invoice_reservations
    set expires_at = reservation_expires_at,
        updated_at = now()
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

  select last_number
    into counter_last
  from public.organization_invoice_counters
  where organization_id = target_org_id
  for update;

  select coalesce(max(sequence_number), 0)
    into highest_reserved
  from public.organization_invoice_reservations
  where organization_id = target_org_id
    and status = 'active';

  next_sequence := greatest(counter_last, highest_reserved) + 1;
  while exists (
    select 1
    from public.organization_invoice_reservations reservation
    where reservation.organization_id = target_org_id
      and reservation.status = 'active'
      and reservation.sequence_number = next_sequence
  ) loop
    next_sequence := next_sequence + 1;
  end loop;

  invoice_number := upper(coalesce(nullif(btrim(target_country_code), ''), 'UNK'))
    || target_box_count::text
    || lpad(target_seller_code::text, 3, '0')
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
      status = 'active',
      expires_at = excluded.expires_at,
      updated_at = now();

  return jsonb_build_object(
    'reservationToken', btrim(target_reservation_token),
    'invoiceNumber', invoice_number,
    'sequence', next_sequence,
    'expiresAt', reservation_expires_at
  );
end;
$$;

create or replace function public.release_organization_invoice_number(
  target_org_id uuid,
  target_reservation_token text
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_org uuid;
begin
  caller_org := public.current_organization_id();
  if caller_org is null or target_org_id is distinct from caller_org then
    raise exception 'Forbidden';
  end if;

  update public.organization_invoice_reservations
  set status = 'released', updated_at = now()
  where organization_id = target_org_id
    and reservation_token = btrim(target_reservation_token)
    and status = 'active';

  return found;
end;
$$;

create or replace function public.commit_invoice_number_reservation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  reservation public.organization_invoice_reservations%rowtype;
begin
  select *
    into reservation
  from public.organization_invoice_reservations
  where organization_id = new.organization_id
    and invoice_number = new.code
    and status = 'active'
  for update;

  if reservation.id is null then
    return new;
  end if;

  if reservation.expires_at <= now() then
    raise exception 'INVOICE_RESERVATION_EXPIRED';
  end if;

  update public.organization_invoice_counters
  set last_number = greatest(last_number, reservation.sequence_number),
      updated_at = now()
  where organization_id = new.organization_id;

  update public.organization_invoice_reservations
  set status = 'committed', updated_at = now()
  where id = reservation.id;

  return new;
end;
$$;

drop trigger if exists commit_invoice_number_reservation_on_shipment
  on public.shipments;

create trigger commit_invoice_number_reservation_on_shipment
before insert on public.shipments
for each row
execute function public.commit_invoice_number_reservation();

revoke all on function public.reserve_organization_invoice_number(uuid, text, text, integer, integer, integer)
  from public, anon, authenticated;
grant execute on function public.reserve_organization_invoice_number(uuid, text, text, integer, integer, integer)
  to authenticated, service_role;

revoke all on function public.release_organization_invoice_number(uuid, text)
  from public, anon, authenticated;
grant execute on function public.release_organization_invoice_number(uuid, text)
  to authenticated, service_role;
