-- Read-only shared tracking visibility for area managers and Accounting.

drop policy if exists shipments_select on public.shipments;
create policy shipments_select on public.shipments for select
  using (
    organization_id = public.current_organization_id()
    and (
      public.current_role_slug() = 'administrador'
      or public.user_has_permission('sales.settings.manage')
      or public.user_has_permission('logistics.settings.manage')
      or public.user_has_permission('accounting.view')
      or public.user_has_permission('audit.immutable.view')
      or (
        public.user_has_permission('sales.manage')
        and sales_owner_id = auth.uid()
      )
      or (
        public.user_has_permission('routes.view')
        and assigned_to = auth.uid()
      )
    )
  );

drop policy if exists shipment_logistics_tasks_select on public.shipment_logistics_tasks;
create policy shipment_logistics_tasks_select on public.shipment_logistics_tasks for select
  using (
    organization_id = public.current_organization_id()
    and (
      public.current_role_slug() = 'administrador'
      or public.user_has_permission('sales.settings.manage')
      or public.user_has_permission('logistics.settings.manage')
      or public.user_has_permission('accounting.view')
      or public.user_has_permission('audit.immutable.view')
      or (
        public.user_has_permission('sales.manage')
        and exists (
          select 1
          from public.shipments shipment
          where shipment.id = shipment_id
            and shipment.organization_id = public.current_organization_id()
            and shipment.sales_owner_id = auth.uid()
        )
      )
      or (
        public.user_has_permission('routes.view')
        and assigned_to = auth.uid()
      )
    )
  );

drop policy if exists shipment_payments_select on public.shipment_payments;
create policy shipment_payments_select on public.shipment_payments for select
  using (
    organization_id = public.current_organization_id()
    and exists (
      select 1
      from public.shipments shipment
      where shipment.id = shipment_id
        and shipment.organization_id = public.current_organization_id()
        and (
          public.current_role_slug() = 'administrador'
          or public.user_has_permission('sales.settings.manage')
          or public.user_has_permission('logistics.settings.manage')
          or public.user_has_permission('accounting.view')
          or public.user_has_permission('audit.immutable.view')
          or (
            public.user_has_permission('sales.manage')
            and shipment.sales_owner_id = auth.uid()
          )
          or (
            public.user_has_permission('routes.view')
            and shipment.assigned_to = auth.uid()
          )
        )
    )
  );

drop policy if exists shipment_journal_entries_update on public.shipment_journal_entries;
create policy shipment_journal_entries_update on public.shipment_journal_entries for update
  using (
    organization_id = public.current_organization_id()
    and source in ('manual', 'legacy_contact')
    and public.can_view_internal_shipment_journal(shipment_id)
    and (
      created_by = auth.uid()
      or public.user_has_permission('settings.manage')
      or (category in ('customer', 'sales', 'general') and public.user_has_permission('sales.settings.manage'))
      or (category = 'logistics' and public.user_has_permission('logistics.settings.manage'))
      or (category = 'billing' and public.user_has_permission('accounting.post'))
    )
  )
  with check (
    organization_id = public.current_organization_id()
    and source in ('manual', 'legacy_contact')
    and public.can_view_internal_shipment_journal(shipment_id)
  );

