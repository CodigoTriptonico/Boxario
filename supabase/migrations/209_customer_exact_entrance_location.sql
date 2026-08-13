alter table public.customers
  add column if not exists exact_entrance_lat double precision,
  add column if not exists exact_entrance_lng double precision,
  add column if not exists exact_entrance_confirmed_at timestamptz,
  add column if not exists exact_entrance_confirmed_by uuid references public.profiles (id) on delete set null,
  add column if not exists exact_entrance_note text not null default '',
  add column if not exists exact_entrance_pano_id text,
  add column if not exists exact_entrance_heading double precision,
  add column if not exists exact_entrance_pitch double precision;

alter table public.customer_recipients
  add column if not exists exact_entrance_lat double precision,
  add column if not exists exact_entrance_lng double precision,
  add column if not exists exact_entrance_confirmed_at timestamptz,
  add column if not exists exact_entrance_confirmed_by uuid references public.profiles (id) on delete set null,
  add column if not exists exact_entrance_note text not null default '',
  add column if not exists exact_entrance_pano_id text,
  add column if not exists exact_entrance_heading double precision,
  add column if not exists exact_entrance_pitch double precision;

alter table public.customers
  drop constraint if exists customers_exact_entrance_coordinates_check,
  add constraint customers_exact_entrance_coordinates_check check (
    (exact_entrance_lat is null and exact_entrance_lng is null and exact_entrance_confirmed_at is null)
    or
    (
      exact_entrance_lat between -90 and 90
      and exact_entrance_lng between -180 and 180
      and exact_entrance_confirmed_at is not null
    )
  );

alter table public.customer_recipients
  drop constraint if exists customer_recipients_exact_entrance_coordinates_check,
  add constraint customer_recipients_exact_entrance_coordinates_check check (
    (exact_entrance_lat is null and exact_entrance_lng is null and exact_entrance_confirmed_at is null)
    or
    (
      exact_entrance_lat between -90 and 90
      and exact_entrance_lng between -180 and 180
      and exact_entrance_confirmed_at is not null
    )
  );

comment on column public.customers.exact_entrance_lat is
  'Latitud de la entrada exacta confirmada manualmente; no reemplaza la coordenada geocodificada de la direccion.';
comment on column public.customer_recipients.exact_entrance_lat is
  'Latitud de la entrada exacta confirmada manualmente; no reemplaza la coordenada geocodificada de la direccion.';

comment on column public.customers.exact_entrance_pano_id is
  'Panorama de Street View elegido como referencia visual; se guarda la vista interactiva y no una copia de la imagen.';
comment on column public.customer_recipients.exact_entrance_pano_id is
  'Panorama de Street View elegido como referencia visual; se guarda la vista interactiva y no una copia de la imagen.';
