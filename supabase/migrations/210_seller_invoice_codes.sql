-- Stable three-digit seller codes used in customer-facing invoice references.

alter table public.profiles
  add column if not exists seller_code integer;

alter table public.profiles
  drop constraint if exists profiles_seller_code_range;

alter table public.profiles
  add constraint profiles_seller_code_range
  check (seller_code is null or seller_code between 1 and 999);

create unique index if not exists profiles_organization_seller_code_unique
  on public.profiles (organization_id, seller_code)
  where seller_code is not null;

create table if not exists public.organization_seller_code_counters (
  organization_id uuid primary key references public.organizations (id) on delete cascade,
  last_number integer not null default 0 check (last_number between 0 and 999),
  updated_at timestamptz not null default now()
);

with eligible_profiles as (
  select
    profile.id,
    profile.organization_id,
    row_number() over (
      partition by profile.organization_id
      order by
        case
          when role.slug = 'administrador' then 0
          when role.slug = 'vendedor' then 1
          else 2
        end,
        profile.created_at,
        profile.id
    )::integer as assigned_code
  from public.profiles profile
  join public.roles role on role.id = profile.role_id
  where profile.seller_code is null
    and (
      role.slug in ('administrador', 'vendedor')
      or exists (
        select 1
        from public.role_permissions role_permission
        join public.permissions permission on permission.id = role_permission.permission_id
        where role_permission.role_id = role.id
          and role_permission.granted
          and permission.key in ('all', 'sales.manage')
      )
    )
), assigned_profiles as (
  update public.profiles profile
  set seller_code = eligible.assigned_code
  from eligible_profiles eligible
  where profile.id = eligible.id
  returning profile.organization_id, profile.seller_code
)
insert into public.organization_seller_code_counters (organization_id, last_number)
select organization_id, max(seller_code)
from assigned_profiles
group by organization_id
on conflict (organization_id) do update
set last_number = greatest(
      public.organization_seller_code_counters.last_number,
      excluded.last_number
    ),
    updated_at = now();

create or replace function public.assign_profile_seller_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_code integer;
  can_create_sales boolean;
begin
  if tg_op = 'UPDATE'
    and old.seller_code is not null
    and new.seller_code is distinct from old.seller_code then
    raise exception 'SELLER_CODE_IMMUTABLE';
  end if;

  if new.seller_code is not null then
    return new;
  end if;

  select
    role.slug in ('administrador', 'vendedor')
    or exists (
      select 1
      from public.role_permissions role_permission
      join public.permissions permission on permission.id = role_permission.permission_id
      where role_permission.role_id = role.id
        and role_permission.granted
        and permission.key in ('all', 'sales.manage')
    )
  into can_create_sales
  from public.roles role
  where role.id = new.role_id;

  if not coalesce(can_create_sales, false) then
    return new;
  end if;

  insert into public.organization_seller_code_counters (organization_id, last_number)
  values (new.organization_id, 1)
  on conflict (organization_id) do update
  set last_number = public.organization_seller_code_counters.last_number + 1,
      updated_at = now()
  where public.organization_seller_code_counters.last_number < 999
  returning last_number into next_code;

  if next_code is null then
    raise exception 'SELLER_CODE_LIMIT_REACHED';
  end if;

  new.seller_code := next_code;
  return new;
end;
$$;

drop trigger if exists profiles_assign_seller_code on public.profiles;
create trigger profiles_assign_seller_code
before insert or update of role_id, seller_code on public.profiles
for each row execute function public.assign_profile_seller_code();

alter table public.organization_seller_code_counters enable row level security;

create policy organization_seller_code_counters_select
on public.organization_seller_code_counters for select
using (
  organization_id = public.current_organization_id()
  and public.user_has_permission('sales.manage')
);

comment on column public.profiles.seller_code is
  'Immutable organization-scoped seller number rendered as three digits in invoice references.';
