-- Reject malformed customer/recipient names even when writes bypass the UI.
-- Real names may contain Unicode letters, spaces, apostrophes and hyphens.

alter table public.customers
  add constraint customers_first_name_valid
    check (
      char_length(btrim(first_name)) between 1 and 80
      and first_name !~ '[0-9]'
      and first_name !~ '[^[:alpha:][:space:]''’-]'
    ),
  add constraint customers_last_name_valid
    check (
      char_length(btrim(last_name)) between 1 and 80
      and last_name !~ '[0-9]'
      and last_name !~ '[^[:alpha:][:space:]''’-]'
    );

alter table public.customer_recipients
  add constraint customer_recipients_first_name_valid
    check (
      char_length(btrim(first_name)) between 1 and 80
      and first_name !~ '[0-9]'
      and first_name !~ '[^[:alpha:][:space:]''’-]'
    ),
  add constraint customer_recipients_last_name_valid
    check (
      char_length(btrim(last_name)) between 1 and 80
      and last_name !~ '[0-9]'
      and last_name !~ '[^[:alpha:][:space:]''’-]'
    );
