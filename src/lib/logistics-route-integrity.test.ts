import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  assertLogisticsRouteTransition,
  assertLogisticsTaskTransition,
  isConductorVisibleRouteStatus,
  isLogisticsRouteTransitionAllowed,
  isLogisticsTaskTransitionAllowed,
  isPhysicalPackageTransitionAllowed,
  isStopOutcomeTransitionAllowed,
  physicalStatusForCustodyHolder,
  publishRouteValidationErrors,
  routeAllowsLivePendingStopEdits,
  routeAllowsNormalStopEdits,
  routeIsClosedForOperationalEdits,
} from "@/lib/logistics-state-machine";
import { buildRouteByTaskId } from "@/lib/conductor-tasks";
import type { LogisticsRouteRow } from "@/lib/logistics-routing";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/150_logistics_route_integrity.sql"),
  "utf8",
);
const lifecycleMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/192_logistics_route_booking_lifecycle.sql"),
  "utf8",
);
const inventorySource = readFileSync(
  join(process.cwd(), "src/app/actions/shipments-inventory.ts"),
  "utf8",
);
const truckSource = readFileSync(
  join(process.cwd(), "src/app/actions/conductor-truck-actions.ts"),
  "utf8",
);
const stopSource = readFileSync(
  join(process.cwd(), "src/app/actions/logistics-route-stop-actions.ts"),
  "utf8",
);
const taskSource = readFileSync(
  join(process.cwd(), "src/app/actions/shipments-logistics-tasks.ts"),
  "utf8",
);
const resultSupport = readFileSync(
  join(process.cwd(), "src/app/actions/conductor-task-result-support.ts"),
  "utf8",
);
const custodyMigration = migration;

function route(partial: Partial<LogisticsRouteRow>): LogisticsRouteRow {
  return {
    id: "route-1",
    routeDate: "2026-08-01",
    name: "Ruta",
    status: "draft",
    assignedTo: "driver-1",
    vehicleId: "vehicle-1",
    warehouseId: null,
    zoneKey: "",
    notes: "",
    createdAt: "",
    updatedAt: "",
    stops: [],
    ...partial,
  };
}

describe("logistics route integrity", () => {
  it("creates routes in draft and closes only from draft", () => {
    assert.equal(isLogisticsRouteTransitionAllowed("draft", "planned"), true);
    assert.equal(isLogisticsRouteTransitionAllowed("planned", "draft"), false);
    assert.equal(isLogisticsRouteTransitionAllowed("completed", "planned"), false);
    assert.throws(() => assertLogisticsRouteTransition("completed", "draft"));
    assert.match(lifecycleMigration, /publish_logistics_route/);
    assert.match(lifecycleMigration, /status = 'planned'/);
    assert.match(lifecycleMigration, /published_at = now\(\)/);
    assert.doesNotMatch(lifecycleMigration, /ROUTE_MISSING_DRIVER/);
  });

  it("rejects incomplete publish payloads", () => {
    const errors = publishRouteValidationErrors({
      status: "draft",
      stopCount: 0,
      stopsWithoutGeo: 1,
      tasksWithoutConfirmedDate: 1,
      tasksWithMismatchedDate: 1,
    });
    assert.ok(errors.length >= 4);
  });

  it("hides draft routes from conductor route maps", () => {
    const map = buildRouteByTaskId([
      route({
        status: "draft",
        stops: [
          {
            id: "s1",
            routeId: "route-1",
            taskId: "task-1",
            order: 1,
            address: {
              source: "unknown",
              name: "",
              phone: "",
              street: "",
              houseNumber: "",
              addressReference: "",
              neighborhood: "",
              city: "",
              state: "",
              postalCode: "",
              country: "",
              formattedAddress: "",
              placeId: "",
              lat: 1,
              lng: 1,
            },
            lat: 1,
            lng: 1,
            postalCode: "",
            city: "",
            createdAt: "",
          },
        ],
      }),
      route({
        id: "route-2",
        status: "planned",
        stops: [
          {
            id: "s2",
            routeId: "route-2",
            taskId: "task-2",
            order: 1,
            address: {
              source: "unknown",
              name: "",
              phone: "",
              street: "",
              houseNumber: "",
              addressReference: "",
              neighborhood: "",
              city: "",
              state: "",
              postalCode: "",
              country: "",
              formattedAddress: "",
              placeId: "",
              lat: 1,
              lng: 1,
            },
            lat: 1,
            lng: 1,
            postalCode: "",
            city: "",
            createdAt: "",
          },
        ],
      }),
    ]);
    assert.equal(map.has("task-1"), false);
    assert.equal(map.has("task-2"), true);
    assert.equal(isConductorVisibleRouteStatus("draft"), false);
    assert.equal(isConductorVisibleRouteStatus("planned"), true);
  });

  it("allows starting planned routes without warehouse and validates warehouse when present", () => {
    assert.match(truckSource, /startedLat/);
    assert.match(truckSource, /started_lat/);
    assert.match(truckSource, /Activa la ubicacion GPS/);
    assert.match(truckSource, /routeRow\.warehouse_id && !warehouse/);
    assert.match(truckSource, /La bodega asignada no tiene una ubicacion verificada/);
  });

  it("rejects incompatible task/route dates instead of shifting them", () => {
    assert.match(stopSource, /La fecha de la tarea no coincide con la fecha de la ruta/);
    assert.match(stopSource, /La fecha de la tarea no coincide con el dia de la ruta semanal/);
    assert.doesNotMatch(stopSource, /resolveRouteDateForTemplate/);
  });

  it("releases pending stops when task date changes or task is reactivated", () => {
    const atomicMigration = readFileSync(
      join(process.cwd(), "supabase/migrations/165_update_logistics_task_atomic.sql"),
      "utf8",
    );
    assert.match(taskSource, /update_logistics_task_atomic/);
    assert.match(taskSource, /task_date_changed/);
    assert.match(taskSource, /task_reactivated/);
    assert.match(taskSource, /assignedTo: null/);
    assert.doesNotMatch(taskSource, /deductEmptyBoxStockForTask/);
    assert.doesNotMatch(taskSource, /reverseInventorySalidasForShipment/);
    assert.match(atomicMigration, /release_reason = release_reason/);
    assert.match(atomicMigration, /next_assigned := null/);
  });

  it("blocks task completion unless route is in progress", () => {
    assert.match(migration, /TASK_REQUIRES_ROUTE_IN_PROGRESS/);
    assert.match(migration, /PACKAGE_IN_TRUCK_REQUIRES_ROUTE_IN_PROGRESS/);
    assert.equal(isLogisticsTaskTransitionAllowed("completed", "pending"), false);
    assert.throws(() => assertLogisticsTaskTransition("completed", "assigned"));
  });

  it("allows audited live edits only on pending stops", () => {
    assert.equal(routeAllowsNormalStopEdits("draft"), true);
    assert.equal(routeAllowsNormalStopEdits("planned"), false);
    assert.equal(routeAllowsLivePendingStopEdits("in_progress"), true);
    assert.equal(routeIsClosedForOperationalEdits("completed"), true);
    assert.equal(isStopOutcomeTransitionAllowed("completed", "cancelled"), false);
    assert.match(migration, /logistics_route_notifications/);
    assert.match(migration, /logistics_route_change_audit/);
  });

  it("restores conductor RLS isolation by assigned_to", () => {
    assert.match(migration, /public\.current_role_slug\(\) = 'conductor'/);
    assert.match(migration, /assigned_to = auth\.uid\(\)/);
  });

  it("rolls back inventory by shipment reference, never by note LIKE", () => {
    const reverseMigration = readFileSync(
      join(process.cwd(), "supabase/migrations/162_inventory_canonical_signature.sql"),
      "utf8",
    );
    assert.match(reverseMigration, /reverse_inventory_salidas_for_shipment/);
    assert.doesNotMatch(reverseMigration, /ilike/i);
    assert.doesNotMatch(inventorySource, /\.ilike\("note"/);
    assert.match(migration, /reference_type = 'shipment'/);
    assert.match(migration, /reversal_of_movement_id/);
    assert.match(reverseMigration, /reference_type = 'shipment'/);
  });

  it("completes conductor tasks atomically with payment", () => {
    assert.match(resultSupport, /complete_conductor_task_atomic/);
    assert.match(resultSupport, /p_collect_payment/);
    assert.match(resultSupport, /clientOperationId/);
    assert.match(resultSupport, /resolveConductorCompleteOutcome/);
    assert.match(migration, /complete_conductor_task_atomic/);
    const idempotencyMigration = readFileSync(
      join(process.cwd(), "supabase/migrations/167_conductor_complete_attempt_idempotency.sql"),
      "utf8",
    );
    assert.match(idempotencyMigration, /attempt_task_status = 'completed'/);
    assert.match(idempotencyMigration, /delete from public\.shipment_logistics_task_attempts/);
    const billingMigration = readFileSync(
      join(process.cwd(), "supabase/migrations/168_conductor_complete_preserve_sql_billing.sql"),
      "utf8",
    );
    assert.match(billingMigration, /L-H3: never accept a full logistics_plan replace/);
    assert.match(billingMigration, /lastDriverCollection/);
  });

  it("syncs custody acceptance with physical package status and closes pallets", () => {
    assert.equal(physicalStatusForCustodyHolder("proveedor", "on_pallet"), "handed_to_carrier");
    assert.equal(isPhysicalPackageTransitionAllowed("on_pallet", "handed_to_carrier"), true);
    assert.match(custodyMigration, /handed_to_carrier/);
    assert.match(custodyMigration, /close_warehouse_pallet/);
  });
});
