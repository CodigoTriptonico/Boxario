-- Restore the authenticated RPC boundary used by Logistica > Rutas.
-- The functions validate organization and permission scope internally.

grant execute on function public.list_logistics_route_weekdays(uuid)
  to authenticated, service_role;

grant execute on function public.set_logistics_route_weekday_enabled(uuid, text, boolean)
  to authenticated, service_role;
