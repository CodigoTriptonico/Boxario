-- Read per-weekday schedule suggestions from route consumers.
-- Writes remain behind save_sales_axis_settings and its sales-settings permission.

drop policy if exists organization_route_settings_select on public.organization_route_settings;
create policy organization_route_settings_select on public.organization_route_settings for select
  using (
    organization_id = public.current_organization_id()
    and (
      public.user_has_permission('settings.manage')
      or public.user_has_permission('sales.manage')
      or public.user_has_permission('sales.settings.manage')
      or public.user_has_permission('logistics.settings.manage')
      or public.user_has_permission('routes.view')
    )
  );
