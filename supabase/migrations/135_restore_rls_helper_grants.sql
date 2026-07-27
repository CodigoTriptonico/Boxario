-- Restore Data API access required by the app after 128 hardened defaults.
-- RLS still controls which rows are visible; these grants only restore role access.

grant usage on schema public to authenticated, service_role;

grant select, insert, update, delete on all tables in schema public
  to authenticated, service_role;

grant usage, select on all sequences in schema public
  to authenticated, service_role;

alter default privileges for role postgres in schema public
  grant select, insert, update, delete on tables to authenticated, service_role;

alter default privileges for role postgres in schema public
  grant usage, select on sequences to authenticated, service_role;

-- RLS helper functions used by policies during authenticated requests.
grant execute on function public.current_organization_id() to authenticated, service_role;
grant execute on function public.current_role_slug() to authenticated, service_role;
grant execute on function public.user_has_permission(text) to authenticated, service_role;
grant execute on function public.normalize_phone_digits(text) to authenticated, service_role;
grant execute on function public.is_platform_admin() to authenticated, service_role;

-- Keep intentionally closed tables server-only / RPC-only.
revoke all on table public.agency_route_proposals from public, anon, authenticated;
revoke all on table public.driver_settlement_reversals from public, anon, authenticated;
revoke all on table public.warehouse_intake_counters from public, anon, authenticated;
revoke all on table public.time_clock_auth_events from public, anon, authenticated;
revoke all on table public.shipment_sale_operations from public, anon, authenticated;
revoke all on table public.security_audit_events from public, anon, authenticated;
grant select on table public.security_audit_events to service_role;
grant all on table public.time_clock_auth_events to service_role;

revoke insert, update, delete on table public.agency_status_history from authenticated;
revoke insert, update, delete on table public.agency_request_status_history from authenticated;
revoke insert, update, delete on table public.agency_visit_status_history from authenticated;
revoke insert, update, delete on table public.agency_box_movements from authenticated;
revoke insert, update, delete on table public.agency_box_allocations from authenticated;
revoke insert, update, delete on table public.package_custody_handoffs from authenticated;
revoke insert, update, delete on table public.operational_exceptions from authenticated;
revoke insert, update, delete on table public.operational_exception_events from authenticated;
revoke insert, update, delete on table public.agency_daily_closures from authenticated;
revoke insert, update, delete on table public.agency_daily_closure_events from authenticated;
revoke insert, update, delete on table public.shipment_payments from authenticated;

-- anon stays locked out of the public schema tables.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
revoke execute on all functions in schema public from anon;
