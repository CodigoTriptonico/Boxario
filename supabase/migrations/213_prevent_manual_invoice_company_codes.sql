-- Company invoice codes are allocated only by the global counter trigger.

create or replace function public.assign_matrix_invoice_company_code()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  next_code bigint;
begin
  if tg_op = 'INSERT' and new.invoice_company_code is not null then
    raise exception 'INVOICE_COMPANY_CODE_MANUAL_ASSIGNMENT';
  end if;

  if tg_op = 'UPDATE'
    and new.invoice_company_code is distinct from old.invoice_company_code then
    if old.invoice_company_code is not null then
      raise exception 'INVOICE_COMPANY_CODE_IMMUTABLE';
    end if;
    raise exception 'INVOICE_COMPANY_CODE_MANUAL_ASSIGNMENT';
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
