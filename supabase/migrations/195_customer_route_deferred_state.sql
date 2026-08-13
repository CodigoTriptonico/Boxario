-- A logistics reviewer can return a seller route request to pending without
-- treating it as a rejection. The seller can propose it again after the note
-- is reviewed.

alter table public.customer_route_assignment_requests
  drop constraint if exists customer_route_assignment_requests_status_check;

alter table public.customer_route_assignment_requests
  add constraint customer_route_assignment_requests_status_check
  check (status in ('pending', 'approved', 'deferred', 'rejected'));

comment on column public.customer_route_assignment_requests.status is
  'pending: active seller proposal; deferred: returned to seller/pending with a reason; approved: included in a route; rejected: refused by logistics.';
