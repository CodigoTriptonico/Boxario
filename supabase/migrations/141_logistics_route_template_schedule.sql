-- Logistics owns the operating window shown to sellers for each weekly route.

alter table public.logistics_route_templates
  add column if not exists start_time time,
  add column if not exists estimated_end_time time;

alter table public.logistics_route_templates
  drop constraint if exists logistics_route_templates_schedule_check;

alter table public.logistics_route_templates
  add constraint logistics_route_templates_schedule_check check (
    (start_time is null and estimated_end_time is null)
    or (
      start_time is not null
      and estimated_end_time is not null
      and start_time < estimated_end_time
    )
  );

create or replace function public.guard_logistics_route_template_schedule()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not public.user_has_permission('routes.update_status') and (
    (tg_op = 'INSERT' and (new.start_time is not null or new.estimated_end_time is not null))
    or (
      tg_op = 'UPDATE'
      and (
        new.start_time is distinct from old.start_time
        or new.estimated_end_time is distinct from old.estimated_end_time
      )
    )
  ) then
    raise exception 'FORBIDDEN_ROUTE_SCHEDULE';
  end if;

  return new;
end;
$$;

drop trigger if exists logistics_route_template_schedule_guard on public.logistics_route_templates;
create trigger logistics_route_template_schedule_guard
before insert or update on public.logistics_route_templates
for each row execute function public.guard_logistics_route_template_schedule();
