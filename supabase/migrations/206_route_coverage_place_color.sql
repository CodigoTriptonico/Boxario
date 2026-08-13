-- Per-place map color for hierarchical route coverage.

alter table public.logistics_route_coverage_places
  add column if not exists color text not null default '#10b981'
    check (color ~ '^#[0-9A-Fa-f]{6}$');
