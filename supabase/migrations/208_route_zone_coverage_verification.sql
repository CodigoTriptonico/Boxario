-- Unifies active route coverage around places (city / zone) and records
-- whether a seller proposal actually matched the selected route coverage.

update public.logistics_route_definitions
set coverage_mode = 'day_only',
    updated_at = now()
where coverage_mode = 'postal_codes';

alter table public.logistics_route_definitions
  drop constraint if exists logistics_route_definitions_coverage_mode_check;

alter table public.logistics_route_definitions
  add constraint logistics_route_definitions_coverage_mode_check
  check (coverage_mode in ('day_only', 'places'));

comment on column public.logistics_route_definitions.coverage_mode is
  'Cobertura vigente: places para ciudad/zona; day_only cuando todavia no se configuro una cobertura geografica.';

alter table public.logistics_route_address_approvals
  alter column postal_code drop not null;

alter table public.logistics_route_address_approvals
  drop constraint if exists logistics_route_address_approvals_postal_code_check;

alter table public.logistics_route_address_approvals
  add constraint logistics_route_address_approvals_postal_code_check
  check (postal_code is null or postal_code ~ '^[0-9]{5}$');

alter table public.customer_route_assignment_requests
  add column if not exists coverage_status text not null default 'matched';

alter table public.customer_route_assignment_requests
  drop constraint if exists customer_route_assignment_requests_coverage_status_check;

alter table public.customer_route_assignment_requests
  add constraint customer_route_assignment_requests_coverage_status_check
  check (coverage_status in ('matched', 'outside'));

comment on column public.customer_route_assignment_requests.coverage_status is
  'Snapshot de cobertura al proponer: matched si la direccion pertenecia a la ciudad/zona; outside si Ventas eligio una ruta como excepcion pendiente de verificacion.';
