-- Name-normalization triggers run for customers, recipients, profiles,
-- shipments and sales. Their shared SQL helper must remain callable by the
-- authenticated role after the restrictive function defaults from 128.

grant execute on function public.normalize_person_name(text) to authenticated, service_role;
