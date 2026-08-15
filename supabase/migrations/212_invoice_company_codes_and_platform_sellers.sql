-- Globally distinguish matrix-company invoices and keep platform identities
-- outside tenant seller sequences.

alter table public.organizations
  add column if not exists invoice_company_code bigint;

alter table public.organizations
  drop constraint if exists organizations_invoice_company_code_positive;

alter table public.organizations
  add constraint organizations_invoice_company_code_positive
  check (invoice_company_code is null or invoice_company_code > 0);

create unique index if not exists organizations_invoice_company_code_unique
  on public.organizations (invoice_company_code)
  where invoice_company_code is not null;

create table if not exists public.platform_invoice_company_code_counter (
  singleton boolean primary key default true check (singleton),
  last_number bigint not null default 0 check (last_number >= 0),
  updated_at timestamptz not null default now()
);

-- SCGS is the first real matrix. Other initialized matrices retain creation
-- order; non-initialized QA tenants and agencies do not consume this sequence.
with matrix_codes as (
  select
    organization.id,
    row_number() over (
      order by
        case when exists (
          select 1
          from public.profiles profile
          where profile.organization_id = organization.id
            and lower(profile.email) = 'scgs@gmail.com'
        ) then 0 else 1 end,
        organization.created_at,
        organization.id
    )::bigint as assigned_code
  from public.organizations organization
  where organization.organization_type = 'matrix'
)
update public.organizations organization
set invoice_company_code = matrix_codes.assigned_code
from matrix_codes
where organization.id = matrix_codes.id
  and organization.invoice_company_code is null;

insert into public.platform_invoice_company_code_counter (singleton, last_number)
select true, coalesce(max(invoice_company_code), 0)
from public.organizations
on conflict (singleton) do update
set last_number = greatest(
      public.platform_invoice_company_code_counter.last_number,
      excluded.last_number
    ),
    updated_at = now();

create or replace function public.assign_matrix_invoice_company_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_code bigint;
begin
  if tg_op = 'UPDATE'
    and old.invoice_company_code is not null
    and new.invoice_company_code is distinct from old.invoice_company_code then
    raise exception 'INVOICE_COMPANY_CODE_IMMUTABLE';
  end if;

  if new.organization_type <> 'matrix' or new.invoice_company_code is not null then
    return new;
  end if;

  insert into public.platform_invoice_company_code_counter (singleton, last_number)
  values (true, 1)
  on conflict (singleton) do update
  set last_number = public.platform_invoice_company_code_counter.last_number + 1,
      updated_at = now()
  returning last_number into next_code;

  new.invoice_company_code := next_code;
  return new;
end;
$$;

drop trigger if exists organizations_assign_invoice_company_code on public.organizations;
create trigger organizations_assign_invoice_company_code
before insert or update of organization_type, invoice_company_code
on public.organizations
for each row execute function public.assign_matrix_invoice_company_code();

alter table public.organizations
  drop constraint if exists matrix_organizations_require_invoice_company_code;

alter table public.organizations
  add constraint matrix_organizations_require_invoice_company_code
  check (organization_type <> 'matrix' or invoice_company_code is not null);

alter table public.platform_invoice_company_code_counter enable row level security;

-- Platform administrators never participate in commercial seller numbering.
create or replace function public.assign_profile_seller_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_code integer;
  can_create_sales boolean;
  is_platform_identity boolean;
begin
  select exists (
    select 1 from public.platform_admins platform_admin
    where platform_admin.user_id = new.id
  ) into is_platform_identity;

  if is_platform_identity then
    new.seller_code := null;
    return new;
  end if;

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

-- Organizations without shipments can be compacted safely. Organizations with
-- history retain every commercial code and their high-water counter.
alter table public.profiles disable trigger profiles_assign_seller_code;

update public.profiles profile
set seller_code = null
where exists (
    select 1 from public.platform_admins platform_admin
    where platform_admin.user_id = profile.id
  )
   or not exists (
    select 1 from public.shipments shipment
    where shipment.organization_id = profile.organization_id
  );

with eligible_profiles as (
  select
    profile.id,
    profile.organization_id,
    row_number() over (
      partition by profile.organization_id
      order by
        case when role.slug = 'administrador' then 0 else 1 end,
        profile.created_at,
        profile.id
    )::integer as assigned_code
  from public.profiles profile
  join public.roles role on role.id = profile.role_id
  where not exists (
      select 1 from public.shipments shipment
      where shipment.organization_id = profile.organization_id
    )
    and not exists (
      select 1 from public.platform_admins platform_admin
      where platform_admin.user_id = profile.id
    )
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
)
update public.profiles profile
set seller_code = eligible.assigned_code
from eligible_profiles eligible
where profile.id = eligible.id;

insert into public.organization_seller_code_counters (organization_id, last_number)
select
  organization.id,
  coalesce(max(profile.seller_code), 0)::integer
from public.organizations organization
left join public.profiles profile on profile.organization_id = organization.id
where not exists (
  select 1 from public.shipments shipment
  where shipment.organization_id = organization.id
)
group by organization.id
on conflict (organization_id) do update
set last_number = excluded.last_number,
    updated_at = now();

alter table public.profiles enable trigger profiles_assign_seller_code;

create or replace function public.sync_platform_admin_seller_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.profiles
    set seller_code = null
    where id = new.user_id;
    return new;
  end if;

  update public.profiles
  set seller_code = null
  where id = old.user_id
    and seller_code is null;
  return old;
end;
$$;

drop trigger if exists platform_admins_sync_seller_code on public.platform_admins;
create trigger platform_admins_sync_seller_code
after insert or delete on public.platform_admins
for each row execute function public.sync_platform_admin_seller_code();

comment on column public.organizations.invoice_company_code is
  'Immutable global matrix-company number shown with at least three digits in invoice references.';

comment on table public.platform_invoice_company_code_counter is
  'Global non-reusable sequence for matrix invoice company codes.';
