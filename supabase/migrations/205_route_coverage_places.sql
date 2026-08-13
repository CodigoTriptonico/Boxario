-- Hierarchical place coverage: city roots with optional neighborhood children.
-- Keeps postal_codes as a legacy coverage mode.

alter table public.logistics_route_definitions
  drop constraint if exists logistics_route_definitions_coverage_mode_check;

alter table public.logistics_route_definitions
  add constraint logistics_route_definitions_coverage_mode_check
    check (coverage_mode in ('day_only', 'postal_codes', 'places'));

create table if not exists public.logistics_route_coverage_places (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  route_definition_id uuid not null references public.logistics_route_definitions(id) on delete cascade,
  place_id text not null check (char_length(btrim(place_id)) between 1 and 256),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 160),
  kind text not null check (kind in ('locality', 'neighborhood', 'sublocality')),
  parent_place_id text,
  selection_role text not null
    check (selection_role in ('root_whole', 'root_partial', 'child_included')),
  lat double precision,
  lng double precision,
  bounds jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (route_definition_id, place_id)
);

create index if not exists logistics_route_coverage_places_org_route_idx
  on public.logistics_route_coverage_places (organization_id, route_definition_id);
create index if not exists logistics_route_coverage_places_lookup_idx
  on public.logistics_route_coverage_places (organization_id, place_id, route_definition_id);
create index if not exists logistics_route_coverage_places_parent_idx
  on public.logistics_route_coverage_places (organization_id, parent_place_id)
  where parent_place_id is not null;

-- Global cache of Google Places children for a parent city (not tenant data).
create table if not exists public.logistics_place_children_cache (
  parent_place_id text primary key check (char_length(btrim(parent_place_id)) between 1 and 256),
  parent_display_name text not null default '',
  children jsonb not null default '[]'::jsonb,
  fetched_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.logistics_route_coverage_places enable row level security;
alter table public.logistics_place_children_cache enable row level security;

create policy logistics_route_coverage_places_select on public.logistics_route_coverage_places for select
  using (organization_id = public.current_organization_id()
    and (public.user_has_permission('routes.view') or public.user_has_permission('sales.manage')));
create policy logistics_route_coverage_places_write on public.logistics_route_coverage_places for all
  using (organization_id = public.current_organization_id()
    and public.user_has_permission('routes.update_status'))
  with check (organization_id = public.current_organization_id()
    and public.user_has_permission('routes.update_status'));

create policy logistics_place_children_cache_select on public.logistics_place_children_cache
  for select to authenticated using (true);
create policy logistics_place_children_cache_write on public.logistics_place_children_cache
  for all to authenticated
  using (public.user_has_permission('routes.update_status'))
  with check (public.user_has_permission('routes.update_status'));
