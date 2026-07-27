-- Customer RLS policies call this helper for every sender and recipient read.
-- Migration 128 revoked default function execution, so authenticated requests
-- need this explicit grant to evaluate those policies.

grant execute on function public.can_manage_customers() to authenticated, service_role;
