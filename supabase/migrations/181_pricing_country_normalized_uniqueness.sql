-- COM-001: el catálogo comercial no admite dos países equivalentes por
-- organización, incluso si un cliente omite la validación de la interfaz.

do $$
begin
  if exists (
    select 1
    from public.pricing_countries
    group by organization_id, upper(btrim(code))
    having count(*) > 1
  ) then
    raise exception 'PRICING_COUNTRY_DUPLICATE_CODE_REQUIRES_REVIEW';
  end if;

  if exists (
    select 1
    from public.pricing_countries
    group by organization_id, lower(btrim(name))
    having count(*) > 1
  ) then
    raise exception 'PRICING_COUNTRY_DUPLICATE_NAME_REQUIRES_REVIEW';
  end if;
end;
$$;

create unique index if not exists pricing_countries_org_code_normalized_uidx
  on public.pricing_countries (organization_id, upper(btrim(code)));

create unique index if not exists pricing_countries_org_name_normalized_uidx
  on public.pricing_countries (organization_id, lower(btrim(name)));

comment on index public.pricing_countries_org_code_normalized_uidx is
  'COM-001: prevents duplicate country codes per organization after trim/case normalization.';

comment on index public.pricing_countries_org_name_normalized_uidx is
  'COM-001: prevents duplicate country names per organization after trim/case normalization.';
