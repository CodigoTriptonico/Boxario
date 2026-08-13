-- Global cache: Census place polygons (Incorporated Places / CDPs) are public data.
create table if not exists public.logistics_census_place_geometry_cache (
  place_id text primary key check (char_length(place_id) between 3 and 256),
  census_geoid text,
  census_name text,
  census_layer text check (census_layer is null or census_layer in ('incorporated', 'cdp')),
  census_vintage text not null default 'tigerweb',
  geojson jsonb not null,
  bounds jsonb not null default '{}'::jsonb,
  found boolean not null default true,
  fetched_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists logistics_census_place_geometry_cache_geoid_idx
  on public.logistics_census_place_geometry_cache (census_geoid)
  where census_geoid is not null;

alter table public.logistics_census_place_geometry_cache enable row level security;

drop policy if exists logistics_census_place_geometry_cache_select on public.logistics_census_place_geometry_cache;
drop policy if exists logistics_census_place_geometry_cache_write on public.logistics_census_place_geometry_cache;

create policy logistics_census_place_geometry_cache_select on public.logistics_census_place_geometry_cache
  for select to authenticated using (true);
create policy logistics_census_place_geometry_cache_write on public.logistics_census_place_geometry_cache
  for all to authenticated
  using (public.user_has_permission('routes.update_status'))
  with check (public.user_has_permission('routes.update_status'));
