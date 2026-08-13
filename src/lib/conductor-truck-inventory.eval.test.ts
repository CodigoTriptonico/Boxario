import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { readConductorTaskActionsSource } from "@/test-utils/conductor-logistics-action-sources";
import { readConductorTareasClientSource } from "@/test-utils/conductor-tareas-client-source";
import { readConductorTruckInventoryClientSource } from "@/test-utils/conductor-truck-inventory-client-source";
import { readInventoryStructureEditorSource } from "@/test-utils/inventory-structure-editor-source";

const actionsSource = readConductorTaskActionsSource();
const migrationSource = readFileSync(
  join(process.cwd(), "supabase/migrations/045_conductor_truck_inventory.sql"),
  "utf8",
);
const idempotencyMigrationSource = readFileSync(
  join(process.cwd(), "supabase/migrations/049_conductor_delivery_idempotency.sql"),
  "utf8",
);
const collectionMigrationSource = readFileSync(
  join(process.cwd(), "supabase/migrations/054_conductor_deposit_collection_audit.sql"),
  "utf8",
);
const tareasViewSource = readFileSync(
  join(process.cwd(), "src/lib/conductor-tareas-view.ts"),
  "utf8",
);
const tareasClientSource = readConductorTareasClientSource();
const inventarioClientSource = readConductorTruckInventoryClientSource();
const inventoryTabSource = readInventoryStructureEditorSource();
const inventoryTruckPanelSource = readFileSync(
  join(process.cwd(), "src/components/inventory/inventory-truck-panel.tsx"),
  "utf8",
);

describe("conductor route eval", () => {
  it("keeps truck inventory tables, evidence bucket and attempts wired", () => {
    assert.match(migrationSource, /logistics_truck_inventory_events/);
    assert.match(migrationSource, /shipment_logistics_task_attempts/);
    assert.match(migrationSource, /logistics-task-evidence/);
    assert.match(actionsSource, /LOGISTICS_TASK_EVIDENCE_BUCKET/);
    assert.match(actionsSource, /shipment_logistics_task_attempts/);
  });

  it("keeps failures visible in the shared Bitácora and audit history", () => {
    // SEG-001: conductor failures feed activity_history, which the Bitácora merges
    // as system entries. shipment_contact_logs is legacy read-only and must not receive writes.
    assert.match(actionsSource, /shipment\.logistics_task_failed/);
    assert.match(actionsSource, /recordActivityHistory/);
    assert.match(actionsSource, /Reprogramar con Logística/);
    assert.doesNotMatch(actionsSource, /from\("shipment_contact_logs"\)/);
  });

  it("keeps payments and route ownership guarded", () => {
    assert.match(actionsSource, /collect_shipment_invoice_payment/);
    assert.match(actionsSource, /canWriteDriverTask/);
    assert.match(actionsSource, /resolveConductorActionDriverId/);
    assert.match(actionsSource, /session\.userId !== cleanDriverId/);
  });

  it("records explicit conductor collection outcomes with an atomic invoice update", () => {
    assert.match(actionsSource, /paymentExpectedAmount/);
    assert.match(actionsSource, /paymentOutcome/);
    assert.match(tareasClientSource, /No recibí dinero/);
    assert.match(collectionMigrationSource, /payment_expected_amount/);
    assert.match(collectionMigrationSource, /payment_outcome/);
    assert.match(collectionMigrationSource, /for update/);
    assert.match(collectionMigrationSource, /Total de invoice inconsistente/);
  });

  it("re-reads task status from db before deliver", () => {
    assert.match(actionsSource, /loadDriverTaskFromDb/);
    assert.match(actionsSource, /shipment_logistics_tasks/);
    assert.match(actionsSource, /taskRow\.status === "completed"/);
    assert.match(actionsSource, /taskRow\.status === "cancelled"/);
  });

  it("keeps deliver events and idempotent guards", () => {
    assert.match(actionsSource, /insertTruckEvent/);
    assert.match(actionsSource, /eventType: "deliver"/);
    assert.match(actionsSource, /hasDeliverEventForTaskLine/);
    assert.match(actionsSource, /error\.code === "23505"/);
  });

  it("lets admin act for a previewed conductor with audit trail", () => {
    assert.match(actionsSource, /resolveConductorActionDriverId/);
    assert.match(actionsSource, /formData\.get\("driverId"\)/);
    assert.match(actionsSource, /conductorActionAuditMetadata/);
    assert.match(tareasViewSource, /actedByAdmin/);
    assert.match(tareasViewSource, /actorUserId/);
    assert.match(tareasViewSource, /formatConductorAdminActionNote/);
    assert.match(tareasClientSource, /driverId/);
  });

  it("keeps delivery idempotency migration index", () => {
    assert.match(idempotencyMigrationSource, /logistics_truck_deliver_task_line_uidx/);
    assert.match(idempotencyMigrationSource, /event_type = 'deliver'/);
  });

  it("keeps tareas blocked by missing truck boxes", () => {
    assert.match(tareasClientSource, /routeBlocked/);
    assert.match(tareasClientSource, /Cargar cajas/);
    assert.match(tareasClientSource, /updateWorkspaceView\("carga"\)/);
    assert.match(tareasClientSource, /Foto requerida/);
  });

  it("keeps route work in one staged conductor workspace", () => {
    assert.match(tareasClientSource, /Preparar carga/);
    assert.match(tareasClientSource, /Paradas/);
    assert.match(tareasClientSource, /Camion \/ regreso/);
    assert.match(tareasClientSource, /selectedRoute\?\.stopCount/);
    assert.match(tareasClientSource, /ConductorTruckInventoryClient/);
  });

  it("separates empty delivery boxes from boxes collected in the truck", () => {
    assert.match(inventarioClientSource, /Cajas de ruta \(por dejar\)/);
    assert.match(inventarioClientSource, /Cajas extra en camión/);
    assert.match(inventarioClientSource, /Cajas recogidas/);
    assert.match(inventarioClientSource, /buildRouteDeliveryBoard/);
    assert.match(inventarioClientSource, /buildExtraBoxesOnTruck/);
    assert.match(inventarioClientSource, /returnConductorTruckLineAction/);
    assert.match(inventarioClientSource, /CONDUCTOR_TRUCK_RETURN_REASONS/);
    assert.doesNotMatch(inventarioClientSource, /Cajas vacías/);
    assert.match(inventarioClientSource, /fullBoxInventory/);
    assert.match(actionsSource, /cargo: buildConductorFullBoxCargo/);
    assert.doesNotMatch(inventarioClientSource, /SmallMetric/);
  });

  it("gives drivers inline truck loading in the route delivery board", () => {
    assert.match(inventarioClientSource, /RouteDeliverySection/);
    assert.match(inventarioClientSource, /buildRouteDeliveryBoard/);
    assert.match(inventarioClientSource, /route-delivery-board/);
    assert.match(inventarioClientSource, /TruckLoadInline/);
    assert.match(inventarioClientSource, /loadQuantities/);
    assert.match(inventarioClientSource, /type="range"/);
    assert.match(inventarioClientSource, /quedan/);
    assert.match(inventarioClientSource, /cajas a subir/);
    assert.match(inventarioClientSource, /Subir al camión/);
    assert.doesNotMatch(inventarioClientSource, /Por subir al camión/);
    assert.doesNotMatch(inventarioClientSource, /de \{line\.shortageQty\}/);
    assert.match(inventarioClientSource, /loadConductorTruckLineAction/);
    assert.doesNotMatch(inventarioClientSource, /loadChecklistOpen/);
    assert.doesNotMatch(inventarioClientSource, /Ver lista/);
  });

  it("keeps the truck loading controls compact and route start left-aligned", () => {
    assert.match(inventarioClientSource, /group mb-3 w-fit max-w-full/);
    assert.match(inventarioClientSource, /mt-3 flex flex-wrap items-center gap-2/);
    assert.match(inventarioClientSource, /searchParams\.get\("subir"\)/);
    assert.match(inventarioClientSource, /route-delivery-board/);
  });

  it("records truck unload reasons for audit", () => {
    assert.match(actionsSource, /returnConductorTruckLineAction/);
    assert.match(actionsSource, /validateConductorTruckReturnInput/);
    assert.match(actionsSource, /logistics\.truck_inventory_returned/);
    assert.match(actionsSource, /Motivo:/);
    assert.match(actionsSource, /transferVehicles/);
    assert.match(actionsSource, /targetVehicleId/);
    assert.match(inventarioClientSource, /¿A qué vehículo van las cajas\?/);
    assert.match(inventarioClientSource, /isConductorTruckVehicleChangeReason/);
  });

  it("keeps the extra truck loading control separate from the inventory counts", () => {
    assert.match(inventarioClientSource, /Cajas extra/);
    assert.match(inventarioClientSource, /Llevar extra/);
    assert.match(actionsSource, /loadConductorTruckExtraAction/);
    assert.match(actionsSource, /includePersistentEvents: true/);
  });

  it("exposes the En camiones inventory tab and per-vehicle balances", () => {
    assert.match(inventoryTabSource, /En camiones/);
    assert.match(inventoryTruckPanelSource, /Cajas en camiones/);
    assert.match(actionsSource, /listConductorTruckBalancesAction/);
    assert.match(actionsSource, /buildConductorTruckBalance/);
    assert.match(actionsSource, /vehicle_id/);
  });
});
