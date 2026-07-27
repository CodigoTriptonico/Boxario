-- Restore the remaining SECURITY DEFINER helpers called directly by RLS.
-- Migration 128 revoked authenticated function execution globally, which made
-- inventory/warehouse and agency reads fail before their policies could run.

grant execute on function public.user_can_access_warehouse(uuid)
  to authenticated, service_role;

grant execute on function public.agency_operations_can_view(uuid, uuid)
  to authenticated, service_role;
