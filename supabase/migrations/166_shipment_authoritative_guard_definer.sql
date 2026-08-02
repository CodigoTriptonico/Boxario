-- Allow SECURITY DEFINER RPCs (owner postgres/supabase_admin) to update
-- authoritative shipment columns while an authenticated JWT is present.
-- Mirrors inventory stock guard from migration 148. Direct authenticated
-- client writes remain blocked.

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

comment on function public.guard_authoritative_shipment_writes() is
  'Blocks direct authenticated writes to authoritative shipment columns; allows postgres/supabase_admin SECURITY DEFINER commands.';
