import type {
  CustomerRouteAssignmentOutcome,
  CustomerRouteAssignmentRequestStatus,
} from "@/lib/customer-route-verification";
import type { ShipmentBoxLine } from "@/lib/shipment-display";

export type CustomerRouteAssignmentRequestRow = {
  id: string;
  customerId: string;
  customerName: string;
  customerPhone: string;
  formattedAddress: string;
  addressReference: string;
  shipmentId: string;
  shipmentCode: string;
  taskId: string;
  taskType: string;
  routeTemplateId: string | null;
  routeDefinitionId?: string | null;
  routeScheduleId?: string | null;
  routeTemplateName: string;
  routeWeekday: number;
  routeDate: string;
  routeId: string | null;
  scheduledAt: string;
  driverId: string;
  driverLabel: string;
  zoneKey: string;
  postalCode?: string;
  addressFingerprint?: string;
  coverageStatus: "matched" | "outside";
  lat?: number | null;
  lng?: number | null;
  boxLines: ShipmentBoxLine[];
  boxSummary: string;
  status: CustomerRouteAssignmentRequestStatus;
  requestedBy: string | null;
  createdAt: string;
  reviewNote: string;
};

export type CustomerRouteAssignmentResult = {
  outcome: CustomerRouteAssignmentOutcome;
  requestId: string | null;
  routeId: string | null;
};

export type CustomerRouteAssignmentDbRow = {
  id: string;
  customer_id: string;
  shipment_id: string;
  task_id: string;
  route_template_id: string | null;
  route_definition_id: string | null;
  route_schedule_id: string | null;
  route_date: string;
  route_weekday: number;
  route_name: string;
  route_id: string | null;
  scheduled_at: string;
  driver_id: string | null;
  zone_key: string;
  postal_code: string | null;
  address_fingerprint: string | null;
  coverage_status: string;
  status: string;
  requested_by: string | null;
  created_at: string;
  review_note: string;
  customer?: {
    first_name?: string | null;
    last_name?: string | null;
    phones?: string[] | null;
    street?: string | null;
    house_number?: string | null;
    address_reference?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    postal_code?: string | null;
    country?: string | null;
    formatted_address?: string | null;
    lat?: number | string | null;
    lng?: number | string | null;
  } | null;
  shipment?: { code?: string | null; logistics_plan?: unknown } | null;
  task?: {
    task_type?: string | null;
    scheduled_at?: string | null;
    schedule_kind?: "exact" | "range" | "from" | null;
    window_start_at?: string | null;
    window_end_at?: string | null;
  } | null;
  template?: { name?: string | null; weekday?: number | null } | null;
  definition?: { name?: string | null } | null;
  schedule?: { weekday?: number | null } | null;
  driver?: { full_name?: string | null; email?: string | null } | null;
};
