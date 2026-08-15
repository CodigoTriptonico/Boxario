-- Keep the first administrator as 001 and assign sellers after it.
-- Existing codes are repaired only for organizations with no shipments, so a
-- historical invoice can never be disconnected from the code that generated it.

create temporary table seller_code_repair on commit drop as
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
where not exists (
    select 1
    from public.shipments shipment
    where shipment.organization_id = profile.organization_id
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
  );

alter table public.profiles disable trigger profiles_assign_seller_code;

update public.profiles profile
set seller_code = null
where profile.id in (select id from seller_code_repair);

update public.profiles profile
set seller_code = repair.assigned_code
from seller_code_repair repair
where profile.id = repair.id;

update public.organization_seller_code_counters counter
set last_number = coalesce(repair.max_code, 0),
    updated_at = now()
from (
  select organization_id, max(assigned_code) as max_code
  from seller_code_repair
  group by organization_id
) repair
where counter.organization_id = repair.organization_id;

insert into public.organization_seller_code_counters (organization_id, last_number)
select organization_id, max(assigned_code)
from seller_code_repair
group by organization_id
on conflict (organization_id) do update
set last_number = excluded.last_number,
    updated_at = now();

alter table public.profiles enable trigger profiles_assign_seller_code;

comment on table public.organization_seller_code_counters is
  'Organization seller sequence; 001 is reserved for the first administrator and sellers continue consecutively.';
