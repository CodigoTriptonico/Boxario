-- Fix backfill helper: min(uuid) is unavailable on this Postgres.

create or replace function public.backfill_inventory_shipment_refs_unambiguous(
  p_dry_run boolean default true
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  movement_row record;
  matched_shipment_id uuid;
  matched_code text;
  match_count integer;
  linked_ids uuid[] := '{}';
  skipped_count integer := 0;
begin
  if auth.uid() is null
     or not (
       public.user_has_permission('inventory.adjust')
       or public.user_has_permission('settings.manage')
     ) then
    raise exception 'FORBIDDEN';
  end if;

  for movement_row in
    select movement.*
    from public.inventory_movements movement
    where movement.organization_id = public.current_organization_id()
      and movement.type = 'salida'
      and (
        movement.reference_type is distinct from 'shipment'
        or movement.reference_id is null
      )
      and not exists (
        select 1 from public.inventory_shipment_ref_links link
        where link.movement_id = movement.id
      )
      and coalesce(nullif(btrim(movement.note), ''), '') <> ''
    order by movement.created_at asc
  loop
    select
      count(*)::integer,
      (array_agg(shipment.id order by shipment.created_at, shipment.id))[1],
      (array_agg(shipment.code order by shipment.created_at, shipment.id))[1]
      into match_count, matched_shipment_id, matched_code
    from public.shipments shipment
    where shipment.organization_id = movement_row.organization_id
      and movement_row.note ~ (
        '(^|[^A-Za-z0-9_-])'
        || regexp_replace(shipment.code, '([\\.^$|?*+(){}\\[\\]])', '\\\1', 'g')
        || '([^A-Za-z0-9_-]|$)'
      );

    if match_count = 1 and matched_shipment_id is not null then
      if not p_dry_run then
        insert into public.inventory_shipment_ref_links (
          organization_id,
          movement_id,
          shipment_id,
          link_source,
          match_detail,
          actor_id
        ) values (
          movement_row.organization_id,
          movement_row.id,
          matched_shipment_id,
          'unambiguous_note_code',
          'Exact code token: ' || matched_code,
          auth.uid()
        )
        on conflict (organization_id, movement_id) do nothing;
      end if;
      linked_ids := array_append(linked_ids, movement_row.id);
    else
      skipped_count := skipped_count + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'dryRun', p_dry_run,
    'linkedCount', coalesce(array_length(linked_ids, 1), 0),
    'linkedMovementIds', to_jsonb(linked_ids),
    'skippedAmbiguousOrUnmatched', skipped_count
  );
end;
$$;

revoke execute on function public.backfill_inventory_shipment_refs_unambiguous(boolean)
  from public, anon;
grant execute on function public.backfill_inventory_shipment_refs_unambiguous(boolean)
  to authenticated;
