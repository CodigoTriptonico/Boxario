-- Split sales/logistics settings and add the shared shipment journal.

alter table public.organization_route_settings
  add column if not exists schedule_suggestions jsonb not null default '{}'::jsonb;

insert into public.permissions (key, name, description) values
  ('sales.settings.manage', 'Configuración de ventas', 'Administrar programación y cobro inicial usados por Ventas'),
  ('logistics.settings.manage', 'Configuración de logística', 'Administrar horarios, rangos y cargos sugeridos de Logística')
on conflict (key) do update
set name = excluded.name,
    description = excluded.description;

insert into public.role_permissions (role_id, permission_id, granted)
select role.id, permission.id, true
from public.roles role
join public.permissions permission
  on permission.key = 'logistics.settings.manage'
where role.slug = 'logistica'
on conflict (role_id, permission_id) do update set granted = true;

create or replace function public.enforce_axis_base_role_permissions()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_role_slug text;
  v_permission_key text;
begin
  select slug into v_role_slug from public.roles where id = new.role_id;
  select key into v_permission_key from public.permissions where id = new.permission_id;
  if v_role_slug = 'logistica' and v_permission_key = 'logistics.settings.manage' then
    new.granted := true;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_enforce_axis_base_role_permissions on public.role_permissions;
create trigger trg_enforce_axis_base_role_permissions
before insert or update on public.role_permissions
for each row execute function public.enforce_axis_base_role_permissions();

drop policy if exists organization_route_settings_select on public.organization_route_settings;
create policy organization_route_settings_select on public.organization_route_settings for select
  using (
    organization_id = public.current_organization_id()
    and (
      public.user_has_permission('settings.manage')
      or public.user_has_permission('sales.manage')
      or public.user_has_permission('sales.settings.manage')
      or public.user_has_permission('logistics.settings.manage')
    )
  );

-- Mutations are intentionally exposed as separate RPCs. This prevents a pricing
-- save from replacing operational settings owned by another area.
create or replace function public.save_sales_axis_settings(
  p_schedule_suggestions jsonb,
  p_minimum_deposit text,
  p_pending_allowed boolean
)
returns public.organization_route_settings
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_org_id uuid := public.current_organization_id();
  v_result public.organization_route_settings;
begin
  if v_org_id is null
     or not (
       public.user_has_permission('sales.settings.manage')
       or public.user_has_permission('settings.manage')
     ) then
    raise exception 'FORBIDDEN';
  end if;

  if p_schedule_suggestions is null
     or jsonb_typeof(p_schedule_suggestions) <> 'object'
     or length(coalesce(p_minimum_deposit, '')) > 32 then
    raise exception 'INVALID_SALES_SETTINGS';
  end if;

  insert into public.organization_route_settings (
    organization_id,
    schedule_suggestions,
    minimum_deposit,
    pending_allowed,
    updated_at
  ) values (
    v_org_id,
    p_schedule_suggestions,
    btrim(coalesce(p_minimum_deposit, '$0')),
    coalesce(p_pending_allowed, true),
    now()
  )
  on conflict (organization_id) do update set
    schedule_suggestions = excluded.schedule_suggestions,
    minimum_deposit = excluded.minimum_deposit,
    pending_allowed = excluded.pending_allowed,
    updated_at = now()
  returning * into v_result;

  return v_result;
end;
$$;

create or replace function public.save_logistics_axis_settings(
  p_delivery_days text[],
  p_pickup_days text[],
  p_delivery_ranges text[],
  p_pickup_ranges text[],
  p_route_lead_time text,
  p_linked_route_schedules boolean,
  p_empty_box_delivery_fee text,
  p_full_box_pickup_fee text
)
returns public.organization_route_settings
language plpgsql
security definer
set search_path = pg_catalog, public
as $$
declare
  v_org_id uuid := public.current_organization_id();
  v_result public.organization_route_settings;
begin
  if v_org_id is null
     or not (
       public.user_has_permission('logistics.settings.manage')
       or public.user_has_permission('settings.manage')
     ) then
    raise exception 'FORBIDDEN';
  end if;

  if cardinality(coalesce(p_delivery_days, '{}'::text[])) > 7
     or cardinality(coalesce(p_pickup_days, '{}'::text[])) > 7
     or cardinality(coalesce(p_delivery_ranges, '{}'::text[])) > 24
     or cardinality(coalesce(p_pickup_ranges, '{}'::text[])) > 24
     or length(coalesce(p_route_lead_time, '')) > 80
     or length(coalesce(p_empty_box_delivery_fee, '')) > 32
     or length(coalesce(p_full_box_pickup_fee, '')) > 32 then
    raise exception 'INVALID_LOGISTICS_SETTINGS';
  end if;

  insert into public.organization_route_settings (
    organization_id,
    delivery_days,
    pickup_days,
    delivery_ranges,
    pickup_ranges,
    route_lead_time,
    linked_route_schedules,
    empty_box_delivery_fee,
    full_box_pickup_fee,
    logistics_fee_mode,
    updated_at
  ) values (
    v_org_id,
    coalesce(p_delivery_days, '{}'::text[]),
    coalesce(p_pickup_days, '{}'::text[]),
    coalesce(p_delivery_ranges, '{}'::text[]),
    coalesce(p_pickup_ranges, '{}'::text[]),
    btrim(coalesce(p_route_lead_time, '')),
    coalesce(p_linked_route_schedules, false),
    btrim(coalesce(p_empty_box_delivery_fee, '$0')),
    btrim(coalesce(p_full_box_pickup_fee, '$0')),
    'per_trip',
    now()
  )
  on conflict (organization_id) do update set
    delivery_days = excluded.delivery_days,
    pickup_days = excluded.pickup_days,
    delivery_ranges = excluded.delivery_ranges,
    pickup_ranges = excluded.pickup_ranges,
    route_lead_time = excluded.route_lead_time,
    linked_route_schedules = excluded.linked_route_schedules,
    empty_box_delivery_fee = excluded.empty_box_delivery_fee,
    full_box_pickup_fee = excluded.full_box_pickup_fee,
    logistics_fee_mode = 'per_trip',
    updated_at = now()
  returning * into v_result;

  return v_result;
end;
$$;

revoke all on function public.save_sales_axis_settings(jsonb, text, boolean) from public;
revoke all on function public.save_logistics_axis_settings(text[], text[], text[], text[], text, boolean, text, text) from public;
grant execute on function public.save_sales_axis_settings(jsonb, text, boolean) to authenticated;
grant execute on function public.save_logistics_axis_settings(text[], text[], text[], text[], text, boolean, text, text) to authenticated;

create table if not exists public.shipment_journal_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  shipment_id uuid not null references public.shipments(id) on delete cascade,
  category text not null check (category in ('customer', 'sales', 'logistics', 'billing', 'general')),
  body text not null default '' check (length(body) <= 4000),
  details jsonb not null default '{}'::jsonb,
  follow_up_at timestamptz,
  assigned_to uuid references public.profiles(id) on delete set null,
  reminder_status text not null default 'pending'
    check (reminder_status in ('pending', 'completed', 'cancelled')),
  source text not null default 'manual',
  source_id uuid,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  revision_count integer not null default 0 check (revision_count >= 0),
  deleted_by uuid references public.profiles(id) on delete set null,
  deleted_at timestamptz,
  delete_reason text not null default '' check (length(delete_reason) <= 500),
  check (source <> 'manual' or length(btrim(body)) > 0 or follow_up_at is not null),
  check (deleted_at is null or length(btrim(delete_reason)) > 0)
);

create unique index if not exists idx_shipment_journal_source
  on public.shipment_journal_entries(organization_id, source, source_id)
  where source_id is not null;
create index if not exists idx_shipment_journal_shipment_time
  on public.shipment_journal_entries(shipment_id, created_at desc);
create index if not exists idx_shipment_journal_reminders
  on public.shipment_journal_entries(organization_id, assigned_to, follow_up_at)
  where follow_up_at is not null and reminder_status = 'pending' and deleted_at is null;

alter table public.shipment_journal_entries enable row level security;

create or replace function public.can_view_internal_shipment_journal(p_shipment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public
as $$
  select exists (
    select 1
    from public.shipments shipment
    where shipment.id = p_shipment_id
      and shipment.organization_id = public.current_organization_id()
      and (
        public.current_role_slug() = 'administrador'
        or public.user_has_permission('accounting.view')
        or public.user_has_permission('audit.immutable.view')
        or public.user_has_permission('logistics.settings.manage')
        or (
          public.user_has_permission('sales.manage')
          and (shipment.sales_owner_id = auth.uid() or public.user_has_permission('sales.settings.manage'))
        )
      )
  );
$$;

revoke all on function public.can_view_internal_shipment_journal(uuid) from public;
grant execute on function public.can_view_internal_shipment_journal(uuid) to authenticated;

create policy shipment_journal_entries_select on public.shipment_journal_entries for select
  using (
    organization_id = public.current_organization_id()
    and (
      public.can_view_internal_shipment_journal(shipment_id)
      or assigned_to = auth.uid()
    )
  );

create policy shipment_journal_entries_insert on public.shipment_journal_entries for insert
  with check (
    organization_id = public.current_organization_id()
    and created_by = auth.uid()
    and source = 'manual'
    and public.can_view_internal_shipment_journal(shipment_id)
    and (
      public.user_has_permission('sales.manage')
      or public.user_has_permission('logistics.settings.manage')
      or public.user_has_permission('accounting.post')
      or public.user_has_permission('settings.manage')
    )
  );

create policy shipment_journal_entries_update on public.shipment_journal_entries for update
  using (
    organization_id = public.current_organization_id()
    and source = 'manual'
    and public.can_view_internal_shipment_journal(shipment_id)
    and (
      created_by = auth.uid()
      or public.user_has_permission('settings.manage')
      or (category in ('customer', 'sales', 'general') and public.user_has_permission('sales.settings.manage'))
      or (category = 'logistics' and public.user_has_permission('logistics.settings.manage'))
      or (category = 'billing' and public.user_has_permission('accounting.post'))
    )
  )
  with check (
    organization_id = public.current_organization_id()
    and source = 'manual'
    and public.can_view_internal_shipment_journal(shipment_id)
  );

insert into public.shipment_journal_entries (
  organization_id,
  shipment_id,
  category,
  body,
  details,
  follow_up_at,
  assigned_to,
  reminder_status,
  source,
  source_id,
  created_by,
  created_at,
  updated_at
)
select
  contact.organization_id,
  contact.shipment_id,
  'customer',
  contact.note,
  jsonb_strip_nulls(jsonb_build_object(
    'channel', contact.channel,
    'channelOther', contact.channel_other,
    'outcome', contact.outcome,
    'nextStep', contact.next_step
  )),
  contact.follow_up_at,
  contact.created_by,
  'pending',
  'legacy_contact',
  contact.id,
  contact.created_by,
  contact.created_at,
  contact.created_at
from public.shipment_contact_logs contact
where not (
  contact.channel = 'other'
  and lower(btrim(coalesce(contact.channel_other, ''))) = 'conductor'
)
on conflict (organization_id, source, source_id) where source_id is not null do nothing;

drop policy if exists activity_history_select on public.activity_history;
create policy activity_history_select on public.activity_history for select
  using (
    organization_id = public.current_organization_id()
    and (
      public.user_has_permission('sales.manage')
      or public.user_has_permission('customers.manage')
      or public.user_has_permission('routes.view')
      or public.user_has_permission('routes.update_status')
      or public.user_has_permission('settings.manage')
      or public.user_has_permission('accounting.view')
      or public.user_has_permission('audit.immutable.view')
    )
  );

drop policy if exists activity_history_insert on public.activity_history;
create policy activity_history_insert on public.activity_history for insert
  with check (
    organization_id = public.current_organization_id()
    and (
      public.user_has_permission('sales.manage')
      or public.user_has_permission('customers.manage')
      or public.user_has_permission('routes.update_status')
      or public.user_has_permission('settings.manage')
      or public.user_has_permission('accounting.post')
      or public.user_has_permission('logistics.settings.manage')
    )
  );
