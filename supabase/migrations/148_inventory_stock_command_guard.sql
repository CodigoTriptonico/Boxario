-- Security-definer inventory commands still carry an authenticated JWT, so
-- auth.role() alone cannot distinguish RPC stock updates from direct client writes.
-- Mirror the profile guard: allow postgres/supabase_admin (the definer owner) and
-- service_role, while keeping authenticated direct writes blocked.

create or replace function public.guard_inventory_stock_direct_write()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if current_user in ('postgres', 'supabase_admin')
     or auth.role() is distinct from 'authenticated' then
    return coalesce(new, old);
  end if;

  if tg_op = 'INSERT' then
    if coalesce(new.stock, 0) <> 0 or coalesce(new.reserved, 0) <> 0
       or coalesce(new.assigned, 0) <> 0 or coalesce(new.unavailable, 0) <> 0 then
      raise exception 'INVENTORY_MOVEMENT_COMMAND_REQUIRED';
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if coalesce(old.stock, 0) <> 0 or coalesce(old.reserved, 0) <> 0
       or coalesce(old.assigned, 0) <> 0 or coalesce(old.unavailable, 0) <> 0 then
      raise exception 'INVENTORY_STOCK_WITH_BALANCE_IMMUTABLE';
    end if;
    return old;
  end if;

  if new.stock is distinct from old.stock
    or new.reserved is distinct from old.reserved
    or new.assigned is distinct from old.assigned
    or new.unavailable is distinct from old.unavailable
    or new.avg_cost is distinct from old.avg_cost
  then
    raise exception 'INVENTORY_MOVEMENT_COMMAND_REQUIRED';
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_inventory_stock_direct_write()
  from public, anon, authenticated;
