-- Migration 217: Customer-centric journal support
-- Allows journal entries to be associated directly with a customer (with optional shipment linkage).

alter table public.shipment_journal_entries
  add column if not exists customer_id uuid references public.customers(id) on delete cascade;

alter table public.shipment_journal_entries
  alter column shipment_id drop not null;

-- Backfill customer_id from existing shipments
update public.shipment_journal_entries sje
set customer_id = s.customer_id
from public.shipments s
where sje.shipment_id = s.id
  and sje.customer_id is null
  and s.customer_id is not null;

-- Index for querying all journal entries of a customer
create index if not exists idx_shipment_journal_customer_time
  on public.shipment_journal_entries(organization_id, customer_id, created_at desc)
  where customer_id is not null;

-- Update RLS policies to support customer-level access
drop policy if exists shipment_journal_entries_select on public.shipment_journal_entries;
create policy shipment_journal_entries_select on public.shipment_journal_entries for select
  using (
    organization_id = public.current_organization_id()
    and (
      (
        shipment_id is not null
        and (
          public.can_view_internal_shipment_journal(shipment_id)
          or assigned_to = auth.uid()
        )
      )
      or (
        customer_id is not null
        and (
          public.current_role_slug() = 'administrador'
          or public.user_has_permission('sales.manage')
          or public.user_has_permission('customers.manage')
          or public.user_has_permission('logistics.settings.manage')
          or assigned_to = auth.uid()
        )
      )
    )
  );

drop policy if exists shipment_journal_entries_insert on public.shipment_journal_entries;
create policy shipment_journal_entries_insert on public.shipment_journal_entries for insert
  with check (
    organization_id = public.current_organization_id()
    and created_by = auth.uid()
    and source = 'manual'
    and (
      (
        shipment_id is not null
        and public.can_view_internal_shipment_journal(shipment_id)
      )
      or (
        customer_id is not null
        and (
          public.current_role_slug() = 'administrador'
          or public.user_has_permission('sales.manage')
          or public.user_has_permission('customers.manage')
          or public.user_has_permission('logistics.settings.manage')
        )
      )
    )
    and (
      public.user_has_permission('sales.manage')
      or public.user_has_permission('customers.manage')
      or public.user_has_permission('logistics.settings.manage')
      or public.user_has_permission('accounting.post')
      or public.user_has_permission('settings.manage')
    )
  );

drop policy if exists shipment_journal_entries_update on public.shipment_journal_entries;
create policy shipment_journal_entries_update on public.shipment_journal_entries for update
  using (
    organization_id = public.current_organization_id()
    and source in ('manual', 'legacy_contact')
    and (
      (
        shipment_id is not null
        and public.can_view_internal_shipment_journal(shipment_id)
      )
      or (
        customer_id is not null
        and (
          public.current_role_slug() = 'administrador'
          or public.user_has_permission('sales.manage')
          or public.user_has_permission('customers.manage')
          or public.user_has_permission('logistics.settings.manage')
        )
      )
    )
    and (
      created_by = auth.uid()
      or public.user_has_permission('settings.manage')
      or (category in ('customer', 'sales', 'general') and (public.user_has_permission('sales.settings.manage') or public.user_has_permission('sales.manage') or public.user_has_permission('customers.manage')))
      or (category = 'logistics' and public.user_has_permission('logistics.settings.manage'))
      or (category = 'billing' and public.user_has_permission('accounting.post'))
    )
  )
  with check (
    organization_id = public.current_organization_id()
    and source in ('manual', 'legacy_contact')
    and (
      (
        shipment_id is not null
        and public.can_view_internal_shipment_journal(shipment_id)
      )
      or (
        customer_id is not null
        and (
          public.current_role_slug() = 'administrador'
          or public.user_has_permission('sales.manage')
          or public.user_has_permission('customers.manage')
          or public.user_has_permission('logistics.settings.manage')
        )
      )
    )
  );
