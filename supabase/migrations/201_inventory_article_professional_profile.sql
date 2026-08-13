-- Professional article profile and warehouse-specific replenishment ceiling.

alter table public.inventory_items
  add column if not exists barcode text,
  add column if not exists description text not null default '',
  add column if not exists inventory_class text not null default 'consumable',
  add column if not exists preferred_supplier text not null default '',
  add column if not exists requires_serial_tracking boolean not null default false,
  add column if not exists requires_lot_tracking boolean not null default false,
  add column if not exists requires_expiry_tracking boolean not null default false;

update public.inventory_items
set inventory_class = 'sellable'
where is_commercial
  and inventory_class = 'consumable';

alter table public.inventory_items
  drop constraint if exists inventory_items_inventory_class_check;

alter table public.inventory_items
  add constraint inventory_items_inventory_class_check
  check (inventory_class in ('consumable', 'sellable', 'reusable', 'asset'));

create unique index if not exists inventory_items_org_barcode_unique
  on public.inventory_items (organization_id, lower(barcode))
  where nullif(btrim(barcode), '') is not null and archived_at is null;

alter table public.inventory_stock
  add column if not exists max_stock numeric
  check (max_stock is null or max_stock >= 0);
