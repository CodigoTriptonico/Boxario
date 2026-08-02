-- Conductors must not see draft routes until publish (planned+).

drop policy if exists logistics_routes_select on public.logistics_routes;
create policy logistics_routes_select on public.logistics_routes for select
  using (
    organization_id = public.current_organization_id()
    and (
      (
        public.current_role_slug() = 'conductor'
        and assigned_to = auth.uid()
        and public.user_has_permission('routes.view')
        and status in ('planned', 'in_progress', 'completed', 'cancelled')
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

-- Stops inherit route visibility for conductors (hide draft route stops).
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
            and route.status in ('planned', 'in_progress', 'completed', 'cancelled')
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
