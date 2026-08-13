import { vehicleDisplayLabel } from "@/lib/logistics-route-vehicle";
import { loadConductorScopedBoard } from "@/app/actions/conductor-scoped-board";
import { canPreviewConductorTasks, conductorAdminAuditMetadata } from "@/lib/conductor-tareas-view";
import { conductorScopeDate, type ConductorDriverTask } from "@/lib/conductor-tasks";
import { buildConductorTruckInventory, buildConductorTruckInventoryScope, buildConductorFullBoxCargo, conductorTruckLoadTasks, conductorTruckLineKey, conductorTruckStockCatalogKey, type ConductorTransferVehicleOption, type ConductorTruckInventoryEvent, type ConductorTruckInventoryLine, type ConductorTruckInventoryScope, type ConductorTruckInventorySummary, type ConductorFullBoxCargoSummary, type ConductorTruckStockItem } from "@/lib/conductor-truck-inventory";
import { sessionHasPermission } from "@/lib/auth/permissions";
import { requireAppSession } from "@/lib/auth/session";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createScopedSupabase } from "@/lib/supabase/scoped";
import { readPositiveIntegerQty } from "@/lib/security/qty";
import { DEFAULT_PAYMENT_METHOD, isPaymentMethod, type PaymentMethod } from "@/lib/payment-methods";
import type { AppSession } from "@/lib/auth/types";
import type { DbInventoryStock } from "@/lib/db";

export type Supabase = NonNullable<Awaited<ReturnType<typeof createScopedSupabase>>>;
export type Admin = NonNullable<ReturnType<typeof createSupabaseAdminClient>>;

export type TruckEventDbRow = {
  id: string;
  event_type: ConductorTruckInventoryEvent["eventType"];
  route_id: string | null;
  task_id: string | null;
  shipment_id: string | null;
  warehouse_id: string | null;
  item_id: string | null;
  item_name: string | null;
  catalog_key: string | null;
  item_label: string | null;
  qty: number | string;
  created_at: string;
};

type StockDbRow = Pick<DbInventoryStock, "item_id" | "warehouse_id"> & {
  stock: DbInventoryStock["stock"] | string;
  inventory_items:
    | {
        name?: string | null;
        kind?: string | null;
        subcategory?: string | null;
        inventory_categories?: { name?: string | null } | { name?: string | null }[] | null;
      }
    | {
        name?: string | null;
        kind?: string | null;
        subcategory?: string | null;
        inventory_categories?: { name?: string | null } | { name?: string | null }[] | null;
      }[]
  | null;
};

export type ConductorProfileDbRow = {
  id: string;
  email: string;
  full_name: string | null;
  roles:
    | { slug?: string | null }
    | { slug?: string | null }[]
    | null;
};

export type ConductorTruckInventoryView = {
  driverId: string;
  selectedRouteId: string | null;
  routes: Array<{
    id: string;
    name: string;
    routeDate: string;
    status: "draft" | "planned" | "in_progress" | "cancelled" | "completed";
    vehicleId: string | null;
    stopCount: number;
  }>;
  scope: ConductorTruckInventoryScope;
  summary: ConductorTruckInventorySummary;
  stock: ConductorTruckStockItem[];
  cargo: ConductorFullBoxCargoSummary;
  currentVehicleId: string | null;
  transferVehicles: ConductorTransferVehicleOption[];
};

export type ConductorHomeVehicleStatus = {
  routeName: string | null;
  routeStatus: ConductorTruckInventoryView["routes"][number]["status"] | null;
  vehicleLabel: string | null;
  status: "no_route" | "unassigned" | "inactive" | "active";
};

type DriverTaskDbRow = {
  id: string;
  shipment_id: string;
  task_type: ConductorDriverTask["taskType"];
  status: ConductorDriverTask["status"];
  assigned_to: string | null;
  scheduled_at: string | null;
  warehouse_id: string | null;
  created_at: string;
  stock_deducted_at?: string | null;
  loaded_at?: string | null;
  notes?: string | null;
};

export const EVIDENCE_MAX_BYTES = 8 * 1024 * 1024;
export const EVIDENCE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export function conductorActionAudit(session: AppSession, driverId: string) {
  return {
    roleSlug: session.roleSlug,
    actorUserId: session.userId,
    actorName: session.fullName || session.email,
    effectiveDriverId: driverId,
  };
}

export function conductorActionAuditMetadata(session: AppSession, driverId: string) {
  return conductorAdminAuditMetadata(conductorActionAudit(session, driverId));
}

export function cleanText(value: unknown, max = 500) {
  return String(value || "").trim().slice(0, max);
}

export function readPaymentMethod(value: unknown): PaymentMethod {
  const normalized = String(value || DEFAULT_PAYMENT_METHOD).trim();
  return isPaymentMethod(normalized) ? normalized : DEFAULT_PAYMENT_METHOD;
}

export function unwrapJoin<T>(value: T | T[] | null | undefined): T | null {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] ?? null : value;
}

export function mapTruckEvent(row: TruckEventDbRow): ConductorTruckInventoryEvent {
  return {
    id: row.id,
    eventType: row.event_type,
    routeId: row.route_id,
    taskId: row.task_id,
    shipmentId: row.shipment_id,
    warehouseId: row.warehouse_id,
    itemId: row.item_id,
    itemName: row.item_name || "",
    catalogKey: row.catalog_key || "",
    itemLabel: row.item_label || row.item_name || "",
    qty: Number(row.qty) || 0,
    createdAt: row.created_at,
  };
}

function mapStock(row: StockDbRow): ConductorTruckStockItem | null {
  const item = unwrapJoin(row.inventory_items);
  const category = unwrapJoin(item?.inventory_categories);

  if (!item) {
    return null;
  }

  return {
    itemId: row.item_id,
    itemName: item.name || item.kind || "Caja",
    category: category?.name || "",
    kind: item.kind || item.name || "",
    subcategory: item.subcategory || undefined,
    warehouseId: row.warehouse_id,
    stock: Number(row.stock) || 0,
  };
}

export function canWriteDriverTask(session: AppSession) {
  return sessionHasPermission(session, "routes.update_status");
}

export async function requireConductorMutationContext() {
  const session = await requireAppSession();
  if (!canWriteDriverTask(session)) {
    throw new Error("FORBIDDEN");
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    throw new Error("Supabase service role no configurado");
  }

  const supabase = await createScopedSupabase(session);
  if (!supabase) {
    throw new Error("Supabase no configurado");
  }

  return { admin, supabase, session };
}

function resolveDriverId(session: AppSession, requestedDriverId?: string | null) {
  const requested = cleanText(requestedDriverId, 80);

  if (canPreviewConductorTasks(session.roleSlug)) {
    return requested || session.userId;
  }

  return session.userId;
}

export function resolveConductorActionDriverId(session: AppSession, requestedDriverId?: string | null) {
  const effectiveDriverId = resolveDriverId(session, requestedDriverId);

  if (!effectiveDriverId) {
    throw new Error("Falta conductor");
  }

  if (!canPreviewConductorTasks(session.roleSlug) && session.userId !== effectiveDriverId) {
    throw new Error("FORBIDDEN");
  }

  return effectiveDriverId;
}

export async function loadConductorData(driverId: string, scopeDate?: string) {
  const effectiveScopeDate = scopeDate ?? conductorScopeDate();
  const board = await loadConductorScopedBoard(driverId, effectiveScopeDate);

  return {
    shipments: board.shipments,
    routes: board.routes,
    taskAddresses: board.taskAddresses,
    vehicles: board.vehicles,
    tasks: board.tasks,
    scopeDate: board.scopeDate,
  };
}

export async function loadDriverTaskFromDb(admin: Admin, session: AppSession, taskId: string) {
  const { data, error } = await admin
    .from("shipment_logistics_tasks")
    .select(
      "id, shipment_id, task_type, status, assigned_to, scheduled_at, warehouse_id, created_at, stock_deducted_at, loaded_at, notes",
    )
    .eq("id", taskId)
    .eq("organization_id", session.organizationId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as DriverTaskDbRow | null) ?? null;
}

export async function loadTruckEvents(
  supabase: Supabase,
  session: AppSession,
  vehicleId: string | null,
) {
  if (!vehicleId) {
    return [];
  }

  const { data, error } = await supabase
    .from("logistics_truck_inventory_events")
    .select(
      "id, event_type, route_id, task_id, shipment_id, warehouse_id, item_id, item_name, catalog_key, item_label, qty, created_at",
    )
    .eq("organization_id", session.organizationId)
    .eq("vehicle_id", vehicleId)
    .order("created_at", { ascending: true });

  if (error) {
    if (error.code === "42P01") {
      return [];
    }
    throw new Error(error.message);
  }

  return ((data || []) as TruckEventDbRow[]).map(mapTruckEvent);
}

export async function loadTruckStock(admin: Admin, session: AppSession) {
  const { data, error } = await admin
    .from("inventory_stock")
    .select(
      "item_id, warehouse_id, stock, inventory_items(name, kind, subcategory, inventory_categories(name))",
    )
    .eq("organization_id", session.organizationId);

  if (error) {
    throw new Error(error.message);
  }

  return ((data || []) as StockDbRow[]).map(mapStock).filter((row): row is ConductorTruckStockItem => Boolean(row));
}

async function loadConductorTransferVehicles(
  admin: Admin,
  session: AppSession,
  currentVehicleId: string | null,
): Promise<ConductorTransferVehicleOption[]> {
  const { data, error } = await admin
    .from("logistics_vehicles")
    .select("id, name, plate, is_active")
    .eq("organization_id", session.organizationId)
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || [])
    .filter((vehicle) => vehicle.id !== currentVehicleId)
    .map((vehicle) => ({
      id: vehicle.id,
      label: vehicleDisplayLabel(vehicle) || vehicle.name,
    }));
}

export async function loadTruckInventoryView(
  session: AppSession,
  driverId: string,
  routeId?: string | null,
  scopeDate = conductorScopeDate(),
): Promise<ConductorTruckInventoryView> {
  const supabase = await createScopedSupabase(session);
  const admin = createSupabaseAdminClient();

  if (!supabase || !admin) {
    throw new Error("Supabase service role no configurado");
  }

  const conductorData = await loadConductorData(driverId, scopeDate);
  const routes = conductorData.routes
    .filter(
      (route) =>
        route.assignedTo === driverId &&
        route.routeDate >= scopeDate &&
        (route.status === "planned" || route.status === "in_progress"),
    )
    .map((route) => ({
      id: route.id,
      name: route.name,
      routeDate: route.routeDate,
      status: route.status,
      vehicleId: route.vehicleId,
      stopCount: route.stops.length,
    }));
  const scopedRoutes = routes.filter((route) => route.routeDate === scopeDate);
  const selectedRouteId =
    (routeId && routes.some((route) => route.id === routeId) ? routeId : null) ||
    scopedRoutes.find((route) => route.status === "in_progress")?.id ||
    scopedRoutes[0]?.id ||
    routes[0]?.id ||
    null;
  const currentVehicleId = routes.find((route) => route.id === selectedRouteId)?.vehicleId || null;
  const [events, stock] = await Promise.all([
    loadTruckEvents(supabase, session, currentVehicleId),
    loadTruckStock(admin, session),
  ]);
  const tasks = conductorTruckLoadTasks(conductorData.tasks, selectedRouteId);
  const scope = buildConductorTruckInventoryScope(tasks, scopeDate);
  const transferVehicles = await loadConductorTransferVehicles(admin, session, currentVehicleId);

  return {
    driverId,
    selectedRouteId,
    routes,
    scope,
    summary: buildConductorTruckInventory({
      tasks,
      events,
      stock,
      scope,
      includePersistentEvents: true,
    }),
    stock,
    cargo: buildConductorFullBoxCargo(events, selectedRouteId),
    currentVehicleId,
    transferVehicles,
  };
}

export function findInventoryLine(summary: ConductorTruckInventorySummary, lineKey: string) {
  return summary.lines.find((line) => line.key === lineKey) || null;
}

function requireLineStock(line: ConductorTruckInventoryLine) {
  if (!line.itemId || !line.warehouseId) {
    throw new Error(`No hay stock registrado para ${line.label}`);
  }
}

export function truckLineFromStockItem(item: ConductorTruckStockItem): ConductorTruckInventoryLine {
  return {
    key: conductorTruckLineKey({
      catalogKey: conductorTruckStockCatalogKey(item),
      label: item.itemName,
    }),
    catalogKey: conductorTruckStockCatalogKey(item),
    label: item.itemName,
    requiredQty: 0,
    loadedQty: 0,
    deliveredQty: 0,
    returnedQty: 0,
    currentQty: 0,
    shortageQty: 0,
    stockQty: item.stock,
    itemId: item.itemId,
    itemName: item.itemName,
    warehouseId: item.warehouseId,
    taskIds: [],
    routeIds: [],
  };
}

export function requireTruckVehicleId(view: ConductorTruckInventoryView) {
  if (!view.currentVehicleId) {
    throw new Error("Asigna un vehículo a la ruta antes de mover cajas del camión");
  }

  return view.currentVehicleId;
}

export async function insertTruckEvent(admin: Admin, session: AppSession, input: {
  driverId: string;
  vehicleId: string;
  line: ConductorTruckInventoryLine;
  eventType: ConductorTruckInventoryEvent["eventType"];
  qty: number;
  taskId?: string | null;
  shipmentId?: string | null;
  routeId?: string | null;
  note?: string;
}) {
  const { error } = await admin.from("logistics_truck_inventory_events").insert({
    organization_id: session.organizationId,
    assigned_driver_id: input.driverId,
    vehicle_id: input.vehicleId,
    route_id: input.routeId || input.line.routeIds[0] || null,
    task_id: input.taskId || null,
    shipment_id: input.shipmentId || null,
    warehouse_id: input.line.warehouseId,
    item_id: input.line.itemId,
    item_name: input.line.itemName || input.line.label,
    catalog_key: input.line.catalogKey,
    item_label: input.line.label,
    event_type: input.eventType,
    qty: input.qty,
    note: input.note || "",
    created_by: session.userId,
  });

  if (error) {
    if (error.code === "23505" && input.eventType === "deliver") {
      return;
    }

    throw new Error(error.message);
  }
}

/** Warehouse movement + truck event(s) in one SQL transaction. */
export async function conductorTruckInventoryMoveAtomic(
  supabase: Supabase,
  input: {
    driverId: string;
    sourceVehicleId: string;
    line: ConductorTruckInventoryLine;
    qty: number;
    note: string;
    routeId?: string | null;
    mode: "load" | "return_warehouse" | "transfer_vehicle";
    targetVehicleId?: string | null;
    clientOperationId?: string | null;
  },
) {
  const qty = readPositiveIntegerQty(input.qty);
  if (input.mode !== "transfer_vehicle") {
    requireLineStock(input.line);
    if (!input.line.warehouseId || !input.line.itemId) {
      throw new Error(`Stock no encontrado para ${input.line.label}`);
    }
  } else if (!input.line.itemId) {
    throw new Error(`Caja no encontrada para ${input.line.label}`);
  }

  const { error } = await supabase.rpc("conductor_truck_inventory_move_atomic", {
    p_driver_id: input.driverId,
    p_source_vehicle_id: input.sourceVehicleId,
    p_warehouse_id: input.line.warehouseId || null,
    p_item_id: input.line.itemId,
    p_item_name: input.line.itemName || input.line.label,
    p_catalog_key: input.line.catalogKey || "",
    p_item_label: input.line.label,
    p_qty: qty,
    p_note: input.note,
    p_route_id: input.routeId || input.line.routeIds[0] || null,
    p_mode: input.mode,
    p_target_vehicle_id: input.targetVehicleId || null,
    p_client_operation_id: input.clientOperationId || null,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function insertFullBoxCollectionEvent(
  admin: Admin,
  session: AppSession,
  input: {
    driverId: string;
    vehicleId: string;
    routeId: string;
    taskId: string;
    shipmentId: string;
    warehouseId: string | null;
    boxLine: { catalogKey: string; label: string; quantity: number };
    note: string;
  },
) {
  const { error } = await admin.from("logistics_truck_inventory_events").insert({
    organization_id: session.organizationId,
    assigned_driver_id: input.driverId,
    vehicle_id: input.vehicleId,
    route_id: input.routeId,
    task_id: input.taskId,
    shipment_id: input.shipmentId,
    warehouse_id: input.warehouseId,
    item_id: null,
    item_name: input.boxLine.label,
    catalog_key: input.boxLine.catalogKey,
    item_label: input.boxLine.label,
    event_type: "collect_full_box",
    qty: input.boxLine.quantity,
    note: input.note,
    created_by: session.userId,
  });

  if (error?.code !== "23505") {
    if (error) throw new Error(error.message);
  }
}
