-- Notifications: conductors with routes.update_status must not read other drivers' alerts.

drop policy if exists logistics_route_notifications_select on public.logistics_route_notifications;
create policy logistics_route_notifications_select on public.logistics_route_notifications for select
  using (
    organization_id = public.current_organization_id()
    and (
      recipient_id = auth.uid()
      or (
        public.current_role_slug() is distinct from 'conductor'
        and (
          public.user_has_permission('routes.update_status')
          or public.user_has_permission('sales.manage')
        )
      )
    )
  );
