-- Las solicitudes confirmadas después de publicar permanecen visibles en Plantillas.
-- Esta operación las incorpora de forma atómica y vuelve a publicar la misma ruta.
create or replace function public.update_logistics_route_from_bookings(
  p_request_ids uuid[],
  p_idempotency_key uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  caller_org uuid := public.current_organization_id();
  booking_date date;
  definition_id uuid;
  schedule_id uuid;
  route_row public.logistics_routes;
  updated_route_id uuid;
begin
  if auth.uid() is null then raise exception 'UNAUTHORIZED'; end if;
  if caller_org is null or not public.user_has_permission('routes.update_status') then
    raise exception 'FORBIDDEN';
  end if;
  if p_request_ids is null or cardinality(p_request_ids) = 0 then
    raise exception 'BOOKINGS_REQUIRED';
  end if;

  select route_date, route_definition_id, route_schedule_id
  into booking_date, definition_id, schedule_id
  from public.customer_route_assignment_requests
  where organization_id = caller_org and id = any(p_request_ids)
  order by created_at, id
  limit 1;

  select * into route_row
  from public.logistics_routes route
  where route.organization_id = caller_org
    and route.route_date = booking_date
    and route.route_definition_id = definition_id
    and route.route_schedule_id = schedule_id
    and route.status = 'planned'
  for update;
  if route_row.id is null then raise exception 'ROUTE_NOT_PUBLISHED'; end if;

  -- Reutiliza todas las validaciones de cobertura, capacidad, fecha y estado de
  -- create_logistics_route_from_bookings. El cambio de estado es transaccional:
  -- si alguna validación falla, la ruta conserva exactamente su versión publicada.
  update public.logistics_routes
  set status = 'draft', updated_at = now()
  where id = route_row.id and organization_id = caller_org;

  updated_route_id := public.create_logistics_route_from_bookings(p_request_ids, p_idempotency_key);

  update public.logistics_routes
  set status = 'planned', published_at = now(), published_by = auth.uid(), updated_at = now()
  where id = updated_route_id and organization_id = caller_org and status = 'draft';
  if not found then raise exception 'ROUTE_UPDATE_CONFLICT'; end if;
  return updated_route_id;
end;
$$;

revoke all on function public.update_logistics_route_from_bookings(uuid[], uuid)
  from public, anon, authenticated;
grant execute on function public.update_logistics_route_from_bookings(uuid[], uuid) to authenticated;
