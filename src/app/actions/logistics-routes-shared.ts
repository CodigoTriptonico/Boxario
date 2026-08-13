import { sessionHasPermission, canManageRoutes } from "@/lib/auth/permissions";
export { canManageRoutes };
import { createScopedSupabase } from "@/lib/supabase/scoped";
import { routeAddressForLogisticsTask, type LogisticsCustomerAddressRow } from "@/lib/logistics-address";
import { statusAfterRouteUnassign, type LogisticsRouteRow, type LogisticsRouteStatus, type LogisticsRouteStopAddress, type LogisticsRouteStopRow, type LogisticsRouteTaskInput } from "@/lib/logistics-routing";
import { listShipmentsAction } from "@/app/actions/shipments";
import { activeLogisticsRouteTaskIds } from "@/lib/logistics-view";
import type { ShipmentLogisticsTaskRow, ShipmentRow } from "@/lib/shipment-types";
import { SHIPMENTS_BOARD_LIMIT } from "@/lib/shipments-pagination";
import { type LogisticsWeekdayKey } from "@/lib/logistics-route-catalog";
import {
  genericLogisticsRouteName,
  isDayAsRouteTemplateId,
  normalizeGenericLogisticsRouteName,
} from "@/lib/logistics-day-route";
import type { AppSession } from "@/lib/auth/types";
import type { DbLogisticsRoute, DbLogisticsRouteStop } from "@/lib/db";
import type { ScheduleTimeSuggestions } from "@/lib/sale/schedule-suggestions";
import type { LogisticsTaskDbRow } from "@/app/actions/shipments-data";
import {
  readBoxLinesFromLogisticsPlan,
  shipmentBoxLinesDetailLabel,
} from "@/lib/shipment-display";

export type Supabase = NonNullable<Awaited<ReturnType<typeof createScopedSupabase>>>;

export type LogisticsRouteTemplateRow = {
  id: string;
  routeDefinitionId?: string;
  routeScheduleId?: string;
  weekday: number;
  name: string;
  startTime: string;
  estimatedEndTime: string;
  maxStops?: number | null;
  maxBoxes?: number | null;
  reservedStops?: number;
  reservedBoxes?: number;
  zoneKey?: string;
  coveredPostalCodes?: string[];
  defaultDriverId?: string | null;
  color?: string;
  coverageMode?: LogisticsRouteCoverageMode;
  routeStatus?: "active" | "archived";
  isSystemGeneral?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type LogisticsRouteCoverageMode = "day_only" | "places";

export type LogisticsRouteCoveragePlaceRow = {
  placeId: string;
  displayName: string;
  kind: "locality" | "neighborhood" | "sublocality";
  parentPlaceId: string | null;
  selectionRole: "root_whole" | "root_partial" | "child_included";
  lat: number | null;
  lng: number | null;
  bounds: { north: number; south: number; east: number; west: number } | null;
  color: string;
};

export type LogisticsRouteScheduleRow = {
  id: string;
  routeDefinitionId: string;
  weekday: number;
  startTime: string;
  estimatedEndTime: string;
  maxStops: number | null;
  maxBoxes: number | null;
  defaultDriverId: string | null;
  isActive: boolean;
  reservedStops: number;
  reservedBoxes: number;
};

export type LogisticsRouteDefinitionRow = {
  id: string;
  name: string;
  zoneName: string;
  color: string;
  coverageMode: LogisticsRouteCoverageMode;
  status: "active" | "archived";
  isSystemGeneral: boolean;
  systemWeekday: number | null;
  postalCodes: string[];
  places: LogisticsRouteCoveragePlaceRow[];
  schedules: LogisticsRouteScheduleRow[];
  createdAt: string;
  updatedAt: string;
};

export type LogisticsWeekdaySchedule = {
  startTime: string;
  estimatedEndTime: string;
  maxStops?: number | null;
  maxBoxes?: number | null;
};

export type LogisticsRouteCatalog = {
  enabledDays: LogisticsWeekdayKey[];
  routeDefinitions: LogisticsRouteDefinitionRow[];
  schedules: LogisticsRouteScheduleRow[];
  templates: LogisticsRouteTemplateRow[];
  defaultDriverByWeekday: Array<string | null>;
  weekdayScheduleByWeekday: Array<LogisticsWeekdaySchedule | null>;
  scheduleSuggestionsByWeekday?: {
    delivery: ScheduleTimeSuggestions[];
    pickup: ScheduleTimeSuggestions[];
  };
};

export type LogisticsRouteTemplateDbRow = {
  id: string;
  weekday: number;
  name: string;
  start_time?: string | null;
  estimated_end_time?: string | null;
  max_stops?: number | null;
  max_boxes?: number | null;
  zone_key?: string | null;
  covered_postal_codes?: string[] | null;
  default_driver_id?: string | null;
  created_at: string;
  updated_at: string;
};

/** Aligned with generated `logistics_routes`; domain status narrows the string column. */
export type LogisticsRouteDbRow = Omit<
  Pick<
    DbLogisticsRoute,
    | "id"
    | "route_date"
    | "name"
    | "assigned_to"
    | "vehicle_id"
    | "warehouse_id"
    | "zone_key"
    | "route_template_id"
    | "notes"
    | "published_at"
    | "started_at"
    | "completed_at"
    | "arrival_warehouse_id"
    | "arrival_reason_code"
    | "arrival_note"
    | "arrival_reported_at"
    | "arrival_confirmed_at"
    | "arrival_confirmed_by"
    | "created_at"
    | "updated_at"
  >,
  "status"
> & {
  status: LogisticsRouteStatus;
  route_definition_id?: string | null;
  route_schedule_id?: string | null;
  logistics_route_stops?: LogisticsRouteStopDbRow[] | null;
};

/** Join/select shape for route stops; domain outcome narrows the string column. */
type LogisticsRouteStopDbRow = Omit<
  Pick<
    DbLogisticsRouteStop,
    | "id"
    | "route_id"
    | "task_id"
    | "stop_order"
    | "address_snapshot"
    | "lat"
    | "lng"
    | "postal_code"
    | "city"
    | "outcome"
    | "outcome_at"
    | "released_at"
    | "release_reason"
    | "created_at"
  >,
  "outcome" | "address_snapshot" | "task_id"
> & {
  task_id: string;
  address_snapshot: LogisticsRouteStopAddress | Record<string, unknown> | null;
  outcome: "completed" | "failed" | "cancelled" | null;
  task?: {
    task_type?: "deliver_empty_box" | "pickup_full_box" | null;
    shipment?: {
      code?: string | null;
      customer_name?: string | null;
      logistics_plan?: unknown;
    } | null;
  } | null;
};

export type LogisticsWeekdayDefaultDbRow = {
  weekday: number;
  default_driver_id: string | null;
};

export type LogisticsWeekdayScheduleDbRow = {
  weekday: number;
  start_time: string | null;
  estimated_end_time: string | null;
  max_stops: number | null;
  max_boxes: number | null;
};

export const ROUTE_SELECT = `
  id, route_date, name, status, assigned_to, vehicle_id, warehouse_id, zone_key, route_template_id, route_definition_id, route_schedule_id, notes, published_at, started_at, completed_at, arrival_warehouse_id, arrival_reason_code, arrival_note, arrival_reported_at, arrival_confirmed_at, arrival_confirmed_by, created_at, updated_at,
  logistics_route_stops (
    id, route_id, task_id, stop_order, address_snapshot, lat, lng, postal_code, city, outcome, outcome_at, released_at, release_reason, created_at,
    task:shipment_logistics_tasks!logistics_route_stops_task_id_fkey (
      task_type,
      shipment:shipments!shipment_logistics_tasks_shipment_id_fkey (
        code, customer_name, logistics_plan
      )
    )
  )
`;

export function mapRouteTemplate(row: LogisticsRouteTemplateDbRow): LogisticsRouteTemplateRow {
  return {
    id: row.id,
    weekday: Number(row.weekday),
    name: normalizeGenericLogisticsRouteName(row.name, Number(row.weekday)),
    startTime: row.start_time ? row.start_time.slice(0, 5) : "",
    estimatedEndTime: row.estimated_end_time ? row.estimated_end_time.slice(0, 5) : "",
    maxStops: row.max_stops ?? null,
    maxBoxes: row.max_boxes ?? null,
    zoneKey: row.zone_key || "",
    coveredPostalCodes: row.covered_postal_codes || [],
    defaultDriverId: row.default_driver_id || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function isLegacyImplicitDayTemplate(template: LogisticsRouteTemplateRow) {
  return (
    template.name.trim().toLowerCase() ===
    genericLogisticsRouteName(template.weekday).toLowerCase()
  );
}

export const ROUTE_TEMPLATE_SELECT = "id, weekday, name, start_time, estimated_end_time, max_stops, max_boxes, zone_key, covered_postal_codes, default_driver_id, created_at, updated_at";
const ROUTE_TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export function routeScheduleInput(input: { startTime?: string; estimatedEndTime?: string }) {
  const hasScheduleInput = input.startTime !== undefined || input.estimatedEndTime !== undefined;
  if (!hasScheduleInput) {
    return { hasScheduleInput: false, startTime: null as string | null, estimatedEndTime: null as string | null };
  }

  const startTime = String(input.startTime || "").trim();
  const estimatedEndTime = String(input.estimatedEndTime || "").trim();
  if (!startTime && !estimatedEndTime) {
    return { hasScheduleInput: true, startTime: null, estimatedEndTime: null };
  }
  if (!ROUTE_TIME_PATTERN.test(startTime) || !ROUTE_TIME_PATTERN.test(estimatedEndTime)) {
    throw new Error("Completa la hora de inicio y la hora de fin estimada");
  }
  if (startTime >= estimatedEndTime) {
    throw new Error("La hora de fin estimada debe ser posterior a la hora de inicio");
  }

  return { hasScheduleInput: true, startTime, estimatedEndTime };
}

export function routeOperationalWindowInput(input: {
  startTime?: string;
  estimatedEndTime?: string | null;
}) {
  const hasScheduleInput = input.startTime !== undefined || input.estimatedEndTime !== undefined;
  if (!hasScheduleInput) {
    return { hasScheduleInput: false, startTime: null as string | null, estimatedEndTime: null as string | null };
  }

  const startTime = String(input.startTime || "").trim();
  const estimatedEndTime = String(input.estimatedEndTime || "").trim();
  if (!startTime && !estimatedEndTime) {
    return { hasScheduleInput: true, startTime: null, estimatedEndTime: null };
  }
  if (!ROUTE_TIME_PATTERN.test(startTime)) {
    throw new Error("La hora de inicio es obligatoria");
  }
  if (estimatedEndTime && !ROUTE_TIME_PATTERN.test(estimatedEndTime)) {
    throw new Error("La hora estimada de fin no es valida");
  }
  if (estimatedEndTime && startTime >= estimatedEndTime) {
    throw new Error("La hora estimada de fin debe ser posterior a la hora de inicio");
  }

  return { hasScheduleInput: true, startTime, estimatedEndTime: estimatedEndTime || null };
}

export function canManageRouteSchedule(session: AppSession) {
  return sessionHasPermission(session, "routes.update_status");
}


function mapNumber(value: number | string | null | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapStop(row: LogisticsRouteStopDbRow): LogisticsRouteStopRow {
  const snapshot =
    row.address_snapshot && typeof row.address_snapshot === "object"
      ? (row.address_snapshot as LogisticsRouteStopAddress)
      : ({} as LogisticsRouteStopAddress);
  const boxLines = readBoxLinesFromLogisticsPlan(row.task?.shipment?.logistics_plan);

  return {
    id: row.id,
    routeId: row.route_id,
    taskId: row.task_id,
    order: Number(row.stop_order) || 0,
    address: snapshot,
    lat: mapNumber(row.lat),
    lng: mapNumber(row.lng),
    postalCode: row.postal_code || "",
    city: row.city || "",
    shipmentCode: String(row.task?.shipment?.code || "").trim(),
    customerName: String(row.task?.shipment?.customer_name || "").trim(),
    taskType: row.task?.task_type || undefined,
    boxCount: boxLines.reduce((total, line) => total + line.quantity, 0),
    boxSummary: shipmentBoxLinesDetailLabel(boxLines),
    outcome: row.outcome,
    outcomeAt: row.outcome_at,
    releasedAt: row.released_at,
    releaseReason: row.release_reason || "",
    createdAt: row.created_at,
  };
}

export function mapRoute(row: LogisticsRouteDbRow): LogisticsRouteRow {
  const stops = (row.logistics_route_stops || [])
    .map(mapStop)
    .filter((stop) => !stop.releasedAt)
    .sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));

  return {
    id: row.id,
    routeDate: row.route_date,
    name: row.name,
    status: row.status,
    assignedTo: row.assigned_to,
    vehicleId: row.vehicle_id,
    warehouseId: row.warehouse_id,
    zoneKey: row.zone_key || "",
    notes: row.notes || "",
    routeTemplateId: row.route_template_id || null,
    routeDefinitionId: row.route_definition_id || null,
    routeScheduleId: row.route_schedule_id || null,
    publishedAt: row.published_at,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    arrivalWarehouseId: row.arrival_warehouse_id,
    arrivalReasonCode: row.arrival_reason_code,
    arrivalNote: row.arrival_note || "",
    arrivalReportedAt: row.arrival_reported_at,
    arrivalConfirmedAt: row.arrival_confirmed_at,
    arrivalConfirmedBy: row.arrival_confirmed_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    stops,
  };
}

async function loadShipments() {
  const result = await listShipmentsAction({ limit: SHIPMENTS_BOARD_LIMIT, offset: 0 });
  if (!result.ok) {
    throw new Error(result.error);
  }

  return result.data;
}

async function loadCustomerMap(
  supabase: Supabase,
  session: AppSession,
  shipments: ShipmentRow[],
) {
  const customerIds = Array.from(
    new Set(shipments.map((shipment) => shipment.customerId).filter((id): id is string => Boolean(id))),
  );

  if (!customerIds.length) {
    return new Map<string, LogisticsCustomerAddressRow>();
  }

  const { data, error } = await supabase
    .from("customers")
    .select(
      "id, first_name, last_name, phones, street, house_number, address_reference, neighborhood, city, state, postal_code, country, place_id, formatted_address, lat, lng, exact_entrance_lat, exact_entrance_lng, exact_entrance_confirmed_at, exact_entrance_note, exact_entrance_pano_id, exact_entrance_heading, exact_entrance_pitch",
    )
    .eq("organization_id", session.organizationId)
    .in("id", customerIds);

  if (error) {
    throw new Error(error.message);
  }

  return new Map(
    ((data || []) as LogisticsCustomerAddressRow[]).map((customer) => [customer.id, customer]),
  );
}

async function loadRoutedTaskIds(supabase: Supabase, session: AppSession) {
  const { data, error } = await supabase
    .from("logistics_route_stops")
    .select("task_id")
    .eq("organization_id", session.organizationId)
    .is("released_at", null);

  if (error) {
    if (error.code === "42P01" || error.code === "42703") {
      return new Set<string>();
    }

    throw new Error(error.message);
  }

  return new Set((data || []).map((row) => String(row.task_id)));
}

function isOpenTask(task: ShipmentLogisticsTaskRow) {
  return task.status !== "completed" && task.status !== "cancelled";
}

function taskInputFromShipment(
  shipment: ShipmentRow,
  task: ShipmentLogisticsTaskRow,
  customerById: Map<string, LogisticsCustomerAddressRow>,
): LogisticsRouteTaskInput {
  return {
    taskId: task.id,
    shipmentId: shipment.id,
    shipmentCode: shipment.code,
    customerName: shipment.customer_name,
    taskType: task.taskType,
    scheduledAt: task.scheduledAt,
    scheduleKind: task.scheduleKind || (task.scheduledAt ? "exact" : null),
    windowStartAt: task.windowStartAt || task.scheduledAt,
    windowEndAt: task.windowEndAt || null,
    warehouseId: task.warehouseId,
    assignedTo: task.assignedTo,
    address: routeAddressForLogisticsTask(
      {
        customerId: shipment.customerId,
        customerName: shipment.customer_name,
        recipientSnapshot: shipment.recipientSnapshot,
      },
      task.taskType,
      customerById,
    ),
  };
}

export async function loadTaskInputs(
  supabase: Supabase,
  session: AppSession,
  options?: {
    excludeRouted?: boolean;
    onlyCurrentStep?: boolean;
    /** Evita un segundo listShipmentsAction cuando el caller ya tiene el tablero. */
    shipments?: ShipmentRow[];
  },
) {
  const shipments = options?.shipments ?? (await loadShipments());
  const customerById = await loadCustomerMap(supabase, session, shipments);
  const routedIds = options?.excludeRouted
    ? await loadRoutedTaskIds(supabase, session)
    : new Set<string>();
  const currentTaskIds = options?.onlyCurrentStep
    ? activeLogisticsRouteTaskIds(shipments)
    : null;

  return shipments.flatMap((shipment) =>
    shipment.logisticsTasks
      .filter((task) => isOpenTask(task))
      .filter((task) => !routedIds.has(task.id))
      .filter((task) => !currentTaskIds || currentTaskIds.has(task.id))
      .map((task) => taskInputFromShipment(shipment, task, customerById)),
  );
}

export async function loadRouteById(supabase: Supabase, session: AppSession, routeId: string) {
  const { data, error } = await supabase
    .from("logistics_routes")
    .select(ROUTE_SELECT)
    .eq("id", routeId)
    .eq("organization_id", session.organizationId)
    .single();

  if (error || !data) {
    throw new Error(error?.message || "Ruta no encontrada");
  }

  return mapRoute(data as unknown as LogisticsRouteDbRow);
}

export async function loadTaskRows(supabase: Supabase, session: AppSession, taskIds: string[]) {
  if (!taskIds.length) {
    return [];
  }

  const { data, error } = await supabase
    .from("shipment_logistics_tasks")
    .select("id, status, assigned_to, assigned_at, scheduled_at, schedule_confirmation_status, schedule_kind, window_start_at, window_end_at, shipment_id")
    .eq("organization_id", session.organizationId)
    .in("id", taskIds);

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as LogisticsTaskDbRow[];
}

export function weekdayIndexForRouteDate(routeDate: string) {
  const date = new Date(`${routeDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return (date.getDay() + 6) % 7;
}

export async function defaultDriverForRouteDate(
  supabase: Supabase,
  session: AppSession,
  routeDate: string,
) {
  const weekday = weekdayIndexForRouteDate(routeDate);
  if (weekday === null) {
    return null;
  }

  const { data, error } = await supabase
    .from("logistics_weekday_defaults")
    .select("default_driver_id")
    .eq("organization_id", session.organizationId)
    .eq("weekday", weekday)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as { default_driver_id?: string | null } | null)?.default_driver_id || null;
}

export async function defaultDriverForRouteSelection(
  supabase: Supabase,
  session: AppSession,
  input: { routeDate: string; routeTemplateId: string },
) {
  if (isDayAsRouteTemplateId(input.routeTemplateId)) {
    return defaultDriverForRouteDate(supabase, session, input.routeDate);
  }

  const { data, error } = await supabase
    .from("logistics_route_templates")
    .select("default_driver_id")
    .eq("id", input.routeTemplateId)
    .eq("organization_id", session.organizationId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as { default_driver_id?: string | null } | null)?.default_driver_id || null;
}

export async function assertConductorProfile(
  supabase: Supabase,
  session: AppSession,
  driverId: string,
) {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, roles(slug)")
    .eq("id", driverId)
    .eq("organization_id", session.organizationId)
    .maybeSingle();

  if (error || !data) {
    throw new Error(error?.message || "Conductor no encontrado");
  }

  const rawRoles = (data as { roles?: { slug?: string | null } | Array<{ slug?: string | null }> | null }).roles;
  const role = Array.isArray(rawRoles) ? rawRoles[0] : rawRoles;
  if (role?.slug !== "conductor") {
    throw new Error("El usuario seleccionado no es conductor");
  }
}

export async function syncRouteDriver(
  supabase: Supabase,
  session: AppSession,
  route: LogisticsRouteRow,
  assignedTo: string | null,
) {
  const tasks = await loadTaskRows(
    supabase,
    session,
    route.stops.map((stop) => stop.taskId),
  );

  for (const task of tasks) {
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    let shouldUpdateShipment = false;

    if (assignedTo) {
      patch.assigned_to = assignedTo;
      shouldUpdateShipment = true;
      if (!task.assigned_at) {
        patch.assigned_at = new Date().toISOString();
      }
      if (["pending", "scheduled", "assigned"].includes(task.status)) {
        patch.status = "assigned";
      }
    } else if (task.assigned_to === route.assignedTo) {
      patch.assigned_to = null;
      patch.status = statusAfterRouteUnassign(task.status, task.scheduled_at);
      shouldUpdateShipment = true;
    } else {
      continue;
    }

    await supabase
      .from("shipment_logistics_tasks")
      .update(patch)
      .eq("id", task.id)
      .eq("organization_id", session.organizationId);

    if (shouldUpdateShipment) {
      await supabase
        .from("shipments")
        .update({ assigned_to: assignedTo })
        .eq("id", task.shipment_id)
        .eq("organization_id", session.organizationId);
    }
  }
}

export async function insertStops(
  supabase: Supabase,
  session: AppSession,
  routeId: string,
  stops: LogisticsRouteTaskInput[],
  startOrder = 1,
) {
  if (!stops.length) {
    return;
  }

  const { error } = await supabase.from("logistics_route_stops").insert(
    stops.map((stop, index) => ({
      organization_id: session.organizationId,
      route_id: routeId,
      task_id: stop.taskId,
      stop_order: startOrder + index,
      address_snapshot: stop.address,
      lat: stop.address.lat,
      lng: stop.address.lng,
      postal_code: stop.address.postalCode,
      city: stop.address.city,
    })),
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function routeTaskConstraintError(
  supabase: Supabase,
  session: AppSession,
  route: LogisticsRouteRow,
  task: LogisticsRouteTaskInput,
) {
  let limits: {
    max_stops?: number | null;
    max_boxes?: number | null;
    covered_postal_codes?: string[] | null;
  } | null = null;

  if (route.routeTemplateId) {
    const { data, error } = await supabase
      .from("logistics_route_templates")
      .select("max_stops, max_boxes, covered_postal_codes")
      .eq("id", route.routeTemplateId)
      .eq("organization_id", session.organizationId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    limits = data;
  } else {
    const weekday = weekdayIndexForRouteDate(route.routeDate);
    if (weekday !== null) {
      const { data, error } = await supabase
        .from("logistics_weekday_defaults")
        .select("max_stops, max_boxes")
        .eq("organization_id", session.organizationId)
        .eq("weekday", weekday)
        .maybeSingle();
      if (error) throw new Error(error.message);
      limits = data;
    }
  }

  if (!limits) return null;
  const postalCodes = limits.covered_postal_codes || [];
  const postalCode = task.address.postalCode.trim().toUpperCase();
  if (postalCodes.length && (!postalCode || !postalCodes.includes(postalCode))) {
    return "El codigo postal de la tarea no pertenece a esta subruta";
  }
  if (limits.max_stops && route.stops.length >= limits.max_stops) {
    return `La ruta alcanzo su capacidad de ${limits.max_stops} paradas`;
  }
  if (!limits.max_boxes) return null;

  const taskIds = route.stops.map((stop) => stop.taskId);
  const { data: routedTasks, error: tasksError } = taskIds.length
    ? await supabase
        .from("shipment_logistics_tasks")
        .select("shipment_id")
        .eq("organization_id", session.organizationId)
        .in("id", taskIds)
    : { data: [], error: null };
  if (tasksError) throw new Error(tasksError.message);
  const shipmentIds = Array.from(new Set([
    ...(routedTasks || []).map((row) => row.shipment_id),
    task.shipmentId,
  ]));
  const { count, error: countError } = await supabase
    .from("shipment_packages")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", session.organizationId)
    .in("shipment_id", shipmentIds);
  if (countError) throw new Error(countError.message);
  return (count || 0) > limits.max_boxes
    ? `La ruta supera su capacidad de ${limits.max_boxes} cajas`
    : null;
}
