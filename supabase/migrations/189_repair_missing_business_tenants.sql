-- Some restored/local databases can contain a matrix organization whose
-- tenant_id is populated while the matching business_tenants row is absent.
-- Atomic sales correctly persist the tenant in their security audit event, so
-- repair that legacy inconsistency before the next sale is created.

insert into public.business_tenants (
  id,
  code,
  name,
  status,
  matrix_organization_id,
  archived_at,
  created_at,
  updated_at
)
select
  organization.tenant_id,
  case
    when nullif(btrim(organization.organization_code), '') is not null
      and not exists (
        select 1
        from public.business_tenants existing_tenant
        where lower(btrim(existing_tenant.code)) = lower(btrim(organization.organization_code))
      )
      then upper(btrim(organization.organization_code))
    else 'TENANT-' || organization.tenant_id::text
  end,
  organization.name,
  case
    when organization.organization_status in ('active', 'suspended', 'inactive', 'closed')
      then organization.organization_status
    when organization.is_active then 'active'
    else 'inactive'
  end,
  organization.id,
  case
    when organization.organization_status = 'closed'
      then coalesce(organization.archived_at, now())
    else null
  end,
  organization.created_at,
  now()
from public.organizations organization
left join public.business_tenants tenant
  on tenant.id = organization.tenant_id
where organization.kind = 'client'
  and organization.tenant_id is not null
  and organization.organization_type = 'matrix'
  and organization.matrix_organization_id = organization.id
  and tenant.id is null
on conflict (id) do nothing;

