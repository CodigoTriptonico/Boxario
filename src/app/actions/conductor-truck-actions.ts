"use server";

import { revalidatePath } from "next/cache";
import { buildConductorTruckBalance, validateConductorTruckLoad, validateConductorTruckReturn, validateConductorTruckReturnInput, isConductorTruckVehicleChangeReason, type ConductorTruckInventoryEvent, type ConductorTruckBalance } from "@/lib/conductor-truck-inventory";
import { requireAppSession } from "@/lib/auth/session";
import { sessionHasPermission } from "@/lib/auth/permissions";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { actionErrorMessage, fail, ok, type ActionResult } from "@/lib/actions/errors";
import { recordActivityHistory } from "@/lib/activity-history";
import { assertLogisticsRouteTransition } from "@/lib/logistics-state-machine";
import { readPositiveIntegerQty } from "@/lib/security/qty";

import {
  conductorActionAuditMetadata,
  cleanText,
  findInventoryLine,
  insertTruckEvent,
  loadTruckInventoryView,
  loadTruckStock,
  mapTruckEvent,
  recordConductorWarehouseMovement,
  requireConductorMutationContext,
  requireTruckVehicleId,
  resolveConductorActionDriverId,
  truckLineFromStockItem,
  type ConductorHomeVehicleStatus,
  type ConductorProfileDbRow,
  type ConductorTruckInventoryView,
  type TruckEventDbRow,
} from "@/app/actions/conductor-tasks-shared";

export async function getConductorTruckInventoryAction(
  driverId?: string | null,
  routeId?: string | null,
): Promise<ActionResult<ConductorTruckInventoryView>> {
  try {
    const session = await requireAppSession();

    if (!sessionHasPermission(session, "routes.view")) {
      throw new Error("FORBIDDEN");
    }

    const effectiveDriverId = resolveConductorActionDriverId(session, driverId);
    return ok(await loadTruckInventoryView(session, effectiveDriverId, routeId));
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function getConductorHomeVehicleStatusAction(
  driverId?: string | null,
): Promise<ActionResult<ConductorHomeVehicleStatus>> {
  try {
    const session = await requireAppSession();

    if (!sessionHasPermission(session, "routes.view")) {
      throw new Error("FORBIDDEN");
    }

    const effectiveDriverId = resolveConductorActionDriverId(session, driverId);
    const view = await loadTruckInventoryView(session, effectiveDriverId);
    const route = view.routes.find((entry) => entry.id === view.selectedRouteId);

    if (!route) {
      return ok({
        routeName: null,
        routeStatus: null,
        vehicleLabel: null,
        status: "no_route",
      });
    }

    if (!route.vehicleId) {
      return ok({
        routeName: route.name,
        routeStatus: route.status,
        vehicleLabel: null,
        status: "unassigned",
      });
    }

    const admin = createSupabaseAdminClient();

    if (!admin) {
      return fail("Supabase service role no configurado");
    }

    const { data: vehicle, error } = await admin
      .from("logistics_vehicles")
      .select("name, plate, is_active")
      .eq("id", route.vehicleId)
      .eq("organization_id", session.organizationId)
      .maybeSingle();

    if (error) {
      return fail(error.message);
    }

    const label = vehicle
      ? [vehicle.name, vehicle.plate].filter(Boolean).join(" · ") || "Vehículo asignado"
      : "Vehículo no encontrado";

    return ok({
      routeName: route.name,
      routeStatus: route.status,
      vehicleLabel: label,
      status: vehicle?.is_active ? "active" : "inactive",
    });
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function listConductorTruckBalancesAction(): Promise<
  ActionResult<ConductorTruckBalance[]>
> {
  try {
    const session = await requireAppSession();

    if (!sessionHasPermission(session, "inventory.view")) {
      throw new Error("FORBIDDEN");
    }

    const admin = createSupabaseAdminClient();

    if (!admin) {
      return fail("Supabase service role no configurado");
    }

    const [{ data: profileRows, error: profileError }, { data: eventRows, error: eventError }, { data: vehicleRows, error: vehicleError }] =
      await Promise.all([
        admin
          .from("profiles")
          .select("id, email, full_name, roles(slug)")
          .eq("organization_id", session.organizationId)
          .eq("is_active", true)
          .order("full_name"),
        admin
          .from("logistics_truck_inventory_events")
          .select(
            "id, vehicle_id, assigned_driver_id, event_type, route_id, task_id, shipment_id, warehouse_id, item_id, item_name, catalog_key, item_label, qty, created_at",
          )
          .eq("organization_id", session.organizationId)
          .order("created_at", { ascending: true }),
        admin
          .from("logistics_vehicles")
          .select("id, name, plate, assigned_driver_id, is_active")
          .eq("organization_id", session.organizationId)
          .eq("is_active", true)
          .order("name"),
      ]);

    if (profileError) {
      return fail(profileError.message);
    }

    if (eventError && eventError.code !== "42P01") {
      return fail(eventError.message);
    }

    if (vehicleError && vehicleError.code !== "42P01") {
      return fail(vehicleError.message);
    }

    const driverNameById = new Map<string, string>();

    for (const row of ((profileRows || []) as unknown as ConductorProfileDbRow[])) {
      const role = Array.isArray(row.roles) ? row.roles[0] : row.roles;

      if (role?.slug === "conductor") {
        driverNameById.set(row.id, row.full_name?.trim() || row.email);
      }
    }

    const stock = await loadTruckStock(admin, session);
    const events = ((eventRows || []) as (TruckEventDbRow & { vehicle_id: string | null })[]).map(
      mapTruckEvent,
    );
    const eventsById = new Map(events.map((event) => [event.id, event]));
    const eventsByVehicle = new Map<string, ConductorTruckInventoryEvent[]>();

    for (const row of (eventRows || []) as (TruckEventDbRow & { vehicle_id: string | null })[]) {
      if (!row.vehicle_id) {
        continue;
      }

      const vehicleEvents = eventsByVehicle.get(row.vehicle_id) || [];
      const mapped = eventsById.get(row.id);

      if (mapped) {
        vehicleEvents.push(mapped);
        eventsByVehicle.set(row.vehicle_id, vehicleEvents);
      }
    }

    const vehicles = (vehicleRows || []) as {
      id: string;
      name: string | null;
      plate: string | null;
      assigned_driver_id: string | null;
    }[];

    const vehicleIdsWithEvents = new Set(
      (eventRows || [])
        .map((row) => (row as { vehicle_id?: string | null }).vehicle_id)
        .filter((vehicleId): vehicleId is string => Boolean(vehicleId)),
    );

    const balances = [
      ...vehicles.map((vehicle) =>
        buildConductorTruckBalance({
          vehicleId: vehicle.id,
          vehicleName: String(vehicle.name || "").trim(),
          vehiclePlate: String(vehicle.plate || "").trim(),
          assignedDriverId: vehicle.assigned_driver_id,
          assignedDriverName: vehicle.assigned_driver_id
            ? driverNameById.get(vehicle.assigned_driver_id) || ""
            : "",
          events: eventsByVehicle.get(vehicle.id) || [],
          stock,
        }),
      ),
      ...[...vehicleIdsWithEvents]
        .filter((vehicleId) => !vehicles.some((vehicle) => vehicle.id === vehicleId))
        .map((vehicleId) =>
          buildConductorTruckBalance({
            vehicleId,
            vehicleName: "Vehículo",
            vehiclePlate: "",
            assignedDriverId: null,
            assignedDriverName: "",
            events: eventsByVehicle.get(vehicleId) || [],
            stock,
          }),
        ),
    ];

    return ok(balances);
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function loadConductorTruckLineAction(input: {
  driverId?: string | null;
  routeId?: string | null;
  lineKey: string;
  qty?: number;
}): Promise<ActionResult<ConductorTruckInventoryView>> {
  try {
    const { admin, session } = await requireConductorMutationContext();
    const driverId = resolveConductorActionDriverId(session, input.driverId);

    const view = await loadTruckInventoryView(session, driverId, input.routeId);
    const line = findInventoryLine(view.summary, input.lineKey);
    const vehicleId = requireTruckVehicleId(view);

    if (!line) {
      return fail("Caja no encontrada");
    }

    const qty = Math.max(Math.floor(Number(input.qty) || line.shortageQty), 1);

    const validationError = validateConductorTruckLoad(line, qty);

    if (validationError) {
      return fail(validationError);
    }

    await recordConductorWarehouseMovement(admin, session, {
      line,
      type: "salida",
      qty,
      note: `Carga camion - ${line.label}`,
      driverId,
    });
    await insertTruckEvent(admin, session, {
      driverId,
      vehicleId,
      line,
      eventType: "load",
      qty,
      routeId: view.selectedRouteId,
      note: `Carga camion - ${line.label}`,
    });

    await recordActivityHistory(admin, session, {
      action: "logistics.truck_inventory_loaded",
      entityType: "profile",
      entityId: driverId,
      title: `Camion cargado`,
      description: `${qty} - ${line.label}`,
      metadata: {
        source: "conductor.inventario_camion",
        driverId,
        lineKey: line.key,
        qty,
        label: line.label,
        ...conductorActionAuditMetadata(session, driverId),
      },
    });

    revalidatePath("/conductor/inventario-camion");
    revalidatePath("/conductor/tareas");
    revalidatePath("/inventario");
    return ok(await loadTruckInventoryView(session, driverId, view.selectedRouteId));
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function loadConductorTruckExtraAction(input: {
  driverId?: string | null;
  routeId?: string | null;
  itemId: string;
  warehouseId: string;
  qty: number;
}): Promise<ActionResult<ConductorTruckInventoryView>> {
  try {
    const { admin, session } = await requireConductorMutationContext();
    const driverId = resolveConductorActionDriverId(session, input.driverId);

    const view = await loadTruckInventoryView(session, driverId, input.routeId);
    const item = view.stock.find(
      (entry) => entry.itemId === input.itemId && entry.warehouseId === input.warehouseId,
    );
    const vehicleId = requireTruckVehicleId(view);

    if (!item) {
      return fail("Item no encontrado en la bodega");
    }

    const qty = readPositiveIntegerQty(input.qty);

    if (qty > item.stock) {
      return fail(`Stock insuficiente para ${item.itemName}`);
    }

    const line = truckLineFromStockItem(item);
    const note = `Caja extra al camion - ${line.label}`;

    await recordConductorWarehouseMovement(admin, session, {
      line,
      type: "salida",
      qty,
      note,
      driverId,
    });
    await insertTruckEvent(admin, session, {
      driverId,
      vehicleId,
      line,
      eventType: "load",
      qty,
      routeId: view.selectedRouteId,
      note,
    });

    await recordActivityHistory(admin, session, {
      action: "logistics.truck_inventory_extra_loaded",
      entityType: "profile",
      entityId: driverId,
      title: "Caja extra al camión",
      description: `${qty} - ${line.label}`,
      metadata: {
        source: "conductor.inventario_camion",
        driverId,
        itemId: line.itemId,
        warehouseId: line.warehouseId,
        qty,
        label: line.label,
        ...conductorActionAuditMetadata(session, driverId),
      },
    });

    revalidatePath("/conductor/inventario-camion");
    revalidatePath("/conductor/tareas");
    revalidatePath("/inventario");
    return ok(await loadTruckInventoryView(session, driverId, view.selectedRouteId));
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function returnConductorTruckLineAction(input: {
  driverId?: string | null;
  routeId?: string | null;
  lineKey: string;
  qty?: number;
  reason: string;
  note?: string;
  origin?: "route" | "extra";
  targetVehicleId?: string | null;
}): Promise<ActionResult<ConductorTruckInventoryView>> {
  try {
    const { admin, session } = await requireConductorMutationContext();
    const driverId = resolveConductorActionDriverId(session, input.driverId);

    const reasonError = validateConductorTruckReturnInput({
      reason: input.reason,
      targetVehicleId: input.targetVehicleId,
    });

    if (reasonError) {
      return fail(reasonError);
    }

    const view = await loadTruckInventoryView(session, driverId, input.routeId);
    const line = findInventoryLine(view.summary, input.lineKey);
    const sourceVehicleId = requireTruckVehicleId(view);

    if (!line) {
      return fail("Caja no encontrada");
    }

    const qty = Math.max(Math.floor(Number(input.qty) || line.currentQty), 1);

    const validationError = validateConductorTruckReturn(line, qty);

    if (validationError) {
      return fail(validationError);
    }

    const reason = cleanText(input.reason, 80);
    const detailNote = cleanText(input.note, 280);
    const originLabel =
      input.origin === "extra"
        ? "caja extra"
        : input.origin === "route"
          ? "caja de ruta"
          : "caja";
    let targetVehicleLabel = "";
    let targetVehicleId = "";

    if (isConductorTruckVehicleChangeReason(reason)) {
      const targetVehicle = view.transferVehicles.find(
        (vehicle) => vehicle.id === String(input.targetVehicleId || "").trim(),
      );

      if (!targetVehicle) {
        return fail("Vehículo destino no válido");
      }

      targetVehicleId = targetVehicle.id;
      targetVehicleLabel = targetVehicle.label;
    }

    const eventNote = [
      isConductorTruckVehicleChangeReason(reason)
        ? `Transferencia entre camiones (${originLabel})`
        : `Baja de camion (${originLabel})`,
      `Motivo: ${reason}`,
      targetVehicleLabel ? `Destino: ${targetVehicleLabel}` : "",
      detailNote,
    ]
      .filter(Boolean)
      .join(" · ");

    if (isConductorTruckVehicleChangeReason(reason)) {
      await insertTruckEvent(admin, session, {
        driverId,
        vehicleId: sourceVehicleId,
        line,
        eventType: "return",
        qty,
        routeId: view.selectedRouteId,
        note: eventNote,
      });
      await insertTruckEvent(admin, session, {
        driverId,
        vehicleId: targetVehicleId,
        line,
        eventType: "load",
        qty,
        routeId: view.selectedRouteId,
        note: eventNote,
      });
    } else {
      await recordConductorWarehouseMovement(admin, session, {
        line,
        type: "devolucion",
        qty,
        note: eventNote,
        driverId,
      });
      await insertTruckEvent(admin, session, {
        driverId,
        vehicleId: sourceVehicleId,
        line,
        eventType: "return",
        qty,
        routeId: view.selectedRouteId,
        note: eventNote,
      });
    }

    await recordActivityHistory(admin, session, {
      action: "logistics.truck_inventory_returned",
      entityType: "profile",
      entityId: driverId,
      title: isConductorTruckVehicleChangeReason(reason)
        ? "Cajas transferidas de camión"
        : `Caja bajada del camion`,
      description: targetVehicleLabel
        ? `${qty} - ${line.label} · ${reason} · ${targetVehicleLabel}`
        : `${qty} - ${line.label} · ${reason}`,
      metadata: {
        source: "conductor.inventario_camion",
        driverId,
        vehicleId: sourceVehicleId,
        lineKey: line.key,
        qty,
        label: line.label,
        reason,
        note: detailNote,
        origin: input.origin || null,
        targetVehicleId: targetVehicleId || null,
        targetVehicleLabel: targetVehicleLabel || null,
        ...conductorActionAuditMetadata(session, driverId),
      },
    });

    revalidatePath("/conductor/inventario-camion");
    revalidatePath("/conductor/tareas");
    revalidatePath("/inventario");
    return ok(await loadTruckInventoryView(session, driverId, view.selectedRouteId));
  } catch (error) {
    return fail(actionErrorMessage(error));
  }
}

export async function startConductorRouteAction(input: {
  routeId: string;
  driverId?: string | null;
  startedLat?: number | null;
  startedLng?: number | null;
}): Promise<ActionResult<ConductorTruckInventoryView>> {
  try {
    const { admin, supabase, session } = await requireConductorMutationContext();
    const effectiveDriverId = resolveConductorActionDriverId(session, input.driverId);
    const routeId = cleanText(input.routeId, 80);
    const startedLat = Number(input.startedLat);
    const startedLng = Number(input.startedLng);

    if (!routeId) {
      return fail("Selecciona una ruta");
    }
    if (!Number.isFinite(startedLat) || !Number.isFinite(startedLng)) {
      return fail("Activa la ubicacion GPS para iniciar la ruta");
    }
    if (startedLat < -90 || startedLat > 90 || startedLng < -180 || startedLng > 180) {
      return fail("La ubicacion GPS no es valida");
    }

    const view = await loadTruckInventoryView(session, effectiveDriverId, routeId);

    if (view.selectedRouteId !== routeId) {
      return fail("La ruta no esta asignada a este conductor para hoy");
    }

    const { data: routeRow, error: routeError } = await admin
      .from("logistics_routes")
      .select("id, name, route_date, status, assigned_to, vehicle_id, warehouse_id")
      .eq("id", routeId)
      .eq("organization_id", session.organizationId)
      .maybeSingle();

    if (routeError) return fail(routeError.message);
    if (!routeRow || routeRow.assigned_to !== effectiveDriverId) {
      throw new Error("FORBIDDEN");
    }

    assertLogisticsRouteTransition(routeRow.status as "draft" | "planned" | "in_progress" | "completed" | "cancelled", "in_progress");

    if (routeRow.status !== "planned") {
      return fail(routeRow.status === "in_progress" ? "La ruta ya esta en curso" : "La ruta todavia no fue enviada");
    }

    const warehouseQuery = routeRow.warehouse_id
      ? admin
          .from("warehouses")
          .select("id, lat, lng, address_verified, is_active")
          .eq("id", routeRow.warehouse_id)
          .eq("organization_id", session.organizationId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null });

    const [{ data: driver }, { data: vehicle }, { data: warehouse }, { data: stops, error: stopsError }] =
      await Promise.all([
        admin
          .from("profiles")
          .select("id, is_active")
          .eq("id", effectiveDriverId)
          .eq("organization_id", session.organizationId)
          .maybeSingle(),
        admin
          .from("logistics_vehicles")
          .select("id, is_active")
          .eq("id", routeRow.vehicle_id)
          .eq("organization_id", session.organizationId)
          .maybeSingle(),
        warehouseQuery,
        admin
          .from("logistics_route_stops")
          .select("id, task_id, lat, lng")
          .eq("route_id", routeId)
          .eq("organization_id", session.organizationId)
          .is("released_at", null),
      ]);

    if (stopsError) return fail(stopsError.message);
    if (!driver?.is_active) return fail("El conductor no esta activo");
    if (!vehicle?.is_active) return fail("El vehiculo no esta activo");
    if (routeRow.warehouse_id && !warehouse) {
      return fail("La bodega asignada no pertenece a la organizacion");
    }
    if (
      warehouse &&
      (
        !warehouse.is_active ||
        !warehouse.address_verified ||
        !Number.isFinite(Number(warehouse.lat)) ||
        !Number.isFinite(Number(warehouse.lng))
      )
    ) {
      return fail("La bodega asignada no tiene una ubicacion verificada");
    }
    if (!stops?.length) return fail("La ruta no tiene paradas");
    if (stops.some((stop) => !Number.isFinite(Number(stop.lat)) || !Number.isFinite(Number(stop.lng)))) {
      return fail("Hay paradas con direccion sin verificar");
    }

    const stopTaskIds = stops.map((stop) => String(stop.task_id));
    const { data: scheduledTasks, error: scheduleError } = await admin
      .from("shipment_logistics_tasks")
      .select("id, scheduled_at, window_start_at, schedule_confirmation_status")
      .eq("organization_id", session.organizationId)
      .in("id", stopTaskIds);

    if (scheduleError) return fail(scheduleError.message);
    if (
      (scheduledTasks || []).length !== stopTaskIds.length ||
      (scheduledTasks || []).some(
        (task) =>
          (!task.scheduled_at && !task.window_start_at) ||
          task.schedule_confirmation_status !== "confirmed" ||
          (task.scheduled_at || task.window_start_at || "").slice(0, 10) !== routeRow.route_date,
      )
    ) {
      return fail("Todas las paradas necesitan fecha confirmada para hoy");
    }

    if (!view.summary.ready) {
      return fail("Faltan cajas para iniciar ruta");
    }

    const taskIds = [...new Set(view.summary.lines.flatMap((line) => line.taskIds))];

    const { error: startError } = await supabase.rpc("start_logistics_route_atomic", {
      p_route_id: routeId,
      p_task_ids: taskIds,
      p_started_lat: startedLat,
      p_started_lng: startedLng,
      p_client_operation_id: null,
    });

    if (startError) return fail(startError.message);

    revalidatePath("/conductor/inventario-camion");
    revalidatePath("/conductor/tareas");
    revalidatePath("/logistica");
    return ok(await loadTruckInventoryView(session, effectiveDriverId, routeId));
  } catch (error) {
    if (actionErrorMessage(error).includes("Transicion de ruta no permitida")) {
      return fail(actionErrorMessage(error));
    }
    return fail(actionErrorMessage(error));
  }
}
