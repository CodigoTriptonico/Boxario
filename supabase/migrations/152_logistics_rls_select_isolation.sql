-- Fix RLS leak: logistics_route_stops_write was FOR ALL, so SELECT also used its
-- permissive org-wide USING clause and bypassed conductor isolation from migration 150.

drop policy if exists logistics_route_stops_write on public.logistics_route_stops;
create policy logistics_route_stops_write on public.logistics_route_stops
  for insert
  with check (
    organization_id = public.current_organization_id()
    and (
      public.user_has_permission('routes.update_status')
      or public.user_has_permission('sales.manage')
    )
  );

create policy logistics_route_stops_update on public.logistics_route_stops
  for update
  using (
    organization_id = public.current_organization_id()
    and (
      (
        public.current_role_slug() = 'conductor'
        and public.user_has_permission('routes.update_status')
        and exists (
          select 1
          from public.logistics_routes route
          where route.id = logistics_route_stops.route_id
            and route.organization_id = logistics_route_stops.organization_id
            and route.assigned_to = auth.uid()
        )
      )
      or (
        public.current_role_slug() is distinct from 'conductor'
        and (
          public.user_has_permission('routes.update_status')
          or public.user_has_permission('sales.manage')
        )
      )
    )
  )
  with check (
    organization_id = public.current_organization_id()
    and (
      (
        public.current_role_slug() = 'conductor'
        and public.user_has_permission('routes.update_status')
        and exists (
          select 1
          from public.logistics_routes route
          where route.id = logistics_route_stops.route_id
            and route.organization_id = logistics_route_stops.organization_id
            and route.assigned_to = auth.uid()
        )
      )
      or (
        public.current_role_slug() is distinct from 'conductor'
        and (
          public.user_has_permission('routes.update_status')
          or public.user_has_permission('sales.manage')
        )
      )
    )
  );

create policy logistics_route_stops_delete on public.logistics_route_stops
  for delete
  using (
    organization_id = public.current_organization_id()
    and (
      public.current_role_slug() is distinct from 'conductor'
    )
    and (
      public.user_has_permission('routes.update_status')
      or public.user_has_permission('sales.manage')
    )
  );

-- Harden routes write similarly: keep SELECT only on select policy.
drop policy if exists logistics_routes_write on public.logistics_routes;
create policy logistics_routes_insert on public.logistics_routes
  for insert
  with check (
    organization_id = public.current_organization_id()
    and (
      public.current_role_slug() is distinct from 'conductor'
    )
    and (
      public.user_has_permission('routes.update_status')
      or public.user_has_permission('sales.manage')
    )
  );

create policy logistics_routes_update on public.logistics_routes
  for update
  using (
    organization_id = public.current_organization_id()
    and (
      (
        public.current_role_slug() = 'conductor'
        and assigned_to = auth.uid()
        and public.user_has_permission('routes.update_status')
      )
      or (
        public.current_role_slug() is distinct from 'conductor'
        and (
          public.user_has_permission('routes.update_status')
          or public.user_has_permission('sales.manage')
        )
      )
    )
  )
  with check (
    organization_id = public.current_organization_id()
    and (
      (
        public.current_role_slug() = 'conductor'
        and assigned_to = auth.uid()
        and public.user_has_permission('routes.update_status')
      )
      or (
        public.current_role_slug() is distinct from 'conductor'
        and (
          public.user_has_permission('routes.update_status')
          or public.user_has_permission('sales.manage')
        )
      )
    )
  );

create policy logistics_routes_delete on public.logistics_routes
  for delete
  using (
    organization_id = public.current_organization_id()
    and public.current_role_slug() is distinct from 'conductor'
    and (
      public.user_has_permission('routes.update_status')
      or public.user_has_permission('sales.manage')
    )
  );

-- Tasks: FOR ALL write also participates in SELECT. Narrow write cmds.
drop policy if exists shipment_logistics_tasks_write on public.shipment_logistics_tasks;
create policy shipment_logistics_tasks_insert on public.shipment_logistics_tasks
  for insert
  with check (
    organization_id = public.current_organization_id()
    and (
      public.current_role_slug() = 'administrador'
      or public.user_has_permission('sales.manage')
      or public.user_has_permission('routes.update_status')
    )
  );

create policy shipment_logistics_tasks_update on public.shipment_logistics_tasks
  for update
  using (
    organization_id = public.current_organization_id()
    and (
      public.current_role_slug() = 'administrador'
      or (
        public.user_has_permission('sales.manage')
        and exists (
          select 1
          from public.shipments s
          where s.id = shipment_id
            and s.organization_id = public.current_organization_id()
            and s.sales_owner_id = auth.uid()
        )
      )
      or (
        public.user_has_permission('routes.update_status')
        and (
          assigned_to = auth.uid()
          or exists (
            select 1
            from public.logistics_route_stops stop
            join public.logistics_routes route on route.id = stop.route_id
            where stop.task_id = shipment_logistics_tasks.id
              and stop.released_at is null
              and route.assigned_to = auth.uid()
          )
          or public.current_role_slug() is distinct from 'conductor'
        )
      )
    )
  )
  with check (
    organization_id = public.current_organization_id()
    and (
      public.current_role_slug() = 'administrador'
      or (
        public.user_has_permission('sales.manage')
        and exists (
          select 1
          from public.shipments s
          where s.id = shipment_id
            and s.organization_id = public.current_organization_id()
            and s.sales_owner_id = auth.uid()
        )
      )
      or (
        public.user_has_permission('routes.update_status')
        and (
          assigned_to = auth.uid()
          or exists (
            select 1
            from public.logistics_route_stops stop
            join public.logistics_routes route on route.id = stop.route_id
            where stop.task_id = shipment_logistics_tasks.id
              and stop.released_at is null
              and route.assigned_to = auth.uid()
          )
          or public.current_role_slug() is distinct from 'conductor'
        )
      )
    )
  );

create policy shipment_logistics_tasks_delete on public.shipment_logistics_tasks
  for delete
  using (
    organization_id = public.current_organization_id()
    and public.current_role_slug() is distinct from 'conductor'
    and (
      public.current_role_slug() = 'administrador'
      or public.user_has_permission('sales.manage')
      or public.user_has_permission('routes.update_status')
    )
  );
