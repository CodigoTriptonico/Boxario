alter table public.logistics_route_templates
  add column if not exists default_driver_id uuid
  references public.profiles (id) on delete set null;

create index if not exists logistics_route_templates_default_driver_idx
  on public.logistics_route_templates (organization_id, default_driver_id)
  where default_driver_id is not null;
