"use server";

import {
  mapRequestRow,
} from "@/app/actions/customer-route-assignments/shared";
import type {
  CustomerRouteAssignmentDbRow,
  CustomerRouteAssignmentRequestRow,
} from "@/app/actions/customer-route-assignments/types";
import {
  actionErrorMessage,
  fail,
  ok,
  type ActionResult,
} from "@/lib/actions/errors";
import { sessionHasPermission } from "@/lib/auth/permissions";
import { requireAppSession } from "@/lib/auth/session";
import { createScopedSupabase } from "@/lib/supabase/scoped";

export async function listPendingCustomerRouteAssignmentRequestsAction(): Promise<
  ActionResult<CustomerRouteAssignmentRequestRow[]>
> {
  try {
    const session = await requireAppSession();
    if (
      !sessionHasPermission(session, "routes.view") &&
      !sessionHasPermission(session, "sales.manage")
    ) {
      throw new Error("FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const { data, error } = await supabase
      .from("customer_route_assignment_requests")
      .select(
        `
        id,
        customer_id,
        shipment_id,
        task_id,
        route_template_id,
        scheduled_at,
        driver_id,
        zone_key,
        status,
        requested_by,
        created_at,
        review_note,
        customer:customers!customer_route_assignment_requests_customer_id_fkey(
          first_name, last_name, phones, street, house_number, address_reference,
          neighborhood, city, state, postal_code, country, formatted_address, lat, lng
        ),
        shipment:shipments!customer_route_assignment_requests_shipment_id_fkey(code, logistics_plan),
        task:shipment_logistics_tasks!customer_route_assignment_requests_task_id_fkey(
          task_type, scheduled_at, schedule_kind, window_start_at, window_end_at
        ),
        template:logistics_route_templates!customer_route_assignment_requests_route_template_id_fkey(name, weekday),
        driver:profiles!customer_route_assignment_requests_driver_id_fkey(full_name, email)
      `,
      )
      .eq("organization_id", session.organizationId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      return fail(error.message);
    }

    return ok(
      ((data || []) as CustomerRouteAssignmentDbRow[]).map(
        mapRequestRow,
      ),
    );
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function listPendingCustomerRouteAssignmentTaskIdsAction(): Promise<
  ActionResult<string[]>
> {
  try {
    const session = await requireAppSession();
    if (
      !sessionHasPermission(session, "routes.view") &&
      !sessionHasPermission(session, "sales.manage")
    ) {
      throw new Error("FORBIDDEN");
    }

    const supabase = await createScopedSupabase(session);
    if (!supabase) {
      return fail("Supabase no configurado");
    }

    const { data, error } = await supabase
      .from("customer_route_assignment_requests")
      .select("task_id")
      .eq("organization_id", session.organizationId)
      .eq("status", "pending");

    if (error) {
      return fail(error.message);
    }

    return ok(
      (data || []).map((row) => String(row.task_id)),
    );
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}
