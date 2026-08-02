import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { LogisticsRouteDbRow } from "@/app/actions/logistics-routes-shared";
import type { ShipmentDbRow } from "@/app/actions/shipments-data";
import type { DbMovementRow, DbStockRow } from "@/lib/inventory-backend";
import type {
  DbActivityHistory,
  DbInventoryMovement,
  DbInventoryStock,
  DbLogisticsRoute,
  DbLogisticsRouteNotification,
  DbLogisticsRouteStop,
  DbShipment,
  DbShipmentLogisticsTask,
  DbShipmentPayment,
  DbWarehouse,
} from "@/lib/db";

type AssertHasKeys<Row extends Record<string, unknown>, Keys extends keyof Row> = Keys;
type AssertExtends<Actual extends Expected, Expected> = Actual;

type ShipmentScopeKeys = AssertHasKeys<
  DbShipment,
  "id" | "organization_id" | "code" | "status" | "customer_name"
>;
type PaymentScopeKeys = AssertHasKeys<
  DbShipmentPayment,
  "id" | "organization_id" | "shipment_id" | "amount" | "method"
>;
type RouteScopeKeys = AssertHasKeys<
  DbLogisticsRoute,
  "id" | "organization_id" | "route_date" | "status" | "assigned_to"
>;
type TaskScopeKeys = AssertHasKeys<
  DbShipmentLogisticsTask,
  "id" | "organization_id" | "shipment_id" | "status" | "task_type"
>;
type StockScopeKeys = AssertHasKeys<
  DbInventoryStock,
  "id" | "organization_id" | "item_id" | "warehouse_id" | "stock"
>;
type RouteStopScopeKeys = AssertHasKeys<
  DbLogisticsRouteStop,
  "id" | "organization_id" | "route_id" | "task_id" | "stop_order"
>;
type MovementScopeKeys = AssertHasKeys<
  DbInventoryMovement,
  "id" | "organization_id" | "item_id" | "qty" | "type"
>;
type NotificationScopeKeys = AssertHasKeys<
  DbLogisticsRouteNotification,
  "id" | "organization_id" | "recipient_id" | "route_id" | "read_at"
>;
type WarehouseScopeKeys = AssertHasKeys<
  DbWarehouse,
  "id" | "organization_id" | "name" | "is_active" | "is_default"
>;
type ActivityScopeKeys = AssertHasKeys<
  DbActivityHistory,
  "id" | "organization_id" | "action" | "entity_type" | "title"
>;

type ShipmentAdapterCore = AssertExtends<
  Pick<ShipmentDbRow, "id" | "organization_id" | "code" | "status" | "customer_name">,
  Pick<DbShipment, "id" | "organization_id" | "code" | "status" | "customer_name">
>;
type RouteAdapterCore = AssertExtends<
  Pick<LogisticsRouteDbRow, "id" | "route_date" | "status">,
  Pick<DbLogisticsRoute, "id" | "route_date" | "status">
>;
type StockAdapterCore = AssertExtends<
  Pick<DbStockRow, "id" | "item_id" | "warehouse_id">,
  Pick<DbInventoryStock, "id" | "item_id" | "warehouse_id">
>;
type MovementAdapterCore = AssertExtends<
  Pick<DbMovementRow, "id" | "item_id" | "qty">,
  Pick<DbInventoryMovement, "id" | "item_id" | "qty">
>;

const compileTimeGuards: [
  ShipmentScopeKeys,
  PaymentScopeKeys,
  RouteScopeKeys,
  TaskScopeKeys,
  StockScopeKeys,
  RouteStopScopeKeys,
  MovementScopeKeys,
  NotificationScopeKeys,
  WarehouseScopeKeys,
  ActivityScopeKeys,
  ShipmentAdapterCore,
  RouteAdapterCore,
  StockAdapterCore,
  MovementAdapterCore,
] = [
  "organization_id",
  "organization_id",
  "organization_id",
  "organization_id",
  "organization_id",
  "organization_id",
  "organization_id",
  "organization_id",
  "organization_id",
  "organization_id",
  undefined as ShipmentAdapterCore,
  undefined as RouteAdapterCore,
  undefined as StockAdapterCore,
  undefined as MovementAdapterCore,
];

describe("database types drift guards", () => {
  it("keeps organization scope columns on generated shipment rows", () => {
    const keys: ShipmentScopeKeys[] = [
      "id",
      "organization_id",
      "code",
      "status",
      "customer_name",
    ];
    assert.equal(keys.length, 5);
  });

  it("keeps organization scope columns on generated payment rows", () => {
    const keys: PaymentScopeKeys[] = [
      "id",
      "organization_id",
      "shipment_id",
      "amount",
      "method",
    ];
    assert.equal(keys.length, 5);
  });

  it("keeps organization scope columns on generated logistics route rows", () => {
    const keys: RouteScopeKeys[] = [
      "id",
      "organization_id",
      "route_date",
      "status",
      "assigned_to",
    ];
    assert.equal(keys.length, 5);
  });

  it("keeps organization scope columns on generated logistics task rows", () => {
    const keys: TaskScopeKeys[] = [
      "id",
      "organization_id",
      "shipment_id",
      "status",
      "task_type",
    ];
    assert.equal(keys.length, 5);
  });

  it("keeps organization scope columns on generated inventory stock rows", () => {
    const keys: StockScopeKeys[] = [
      "id",
      "organization_id",
      "item_id",
      "warehouse_id",
      "stock",
    ];
    assert.equal(keys.length, 5);
  });

  it("keeps route linkage columns on generated route stop rows", () => {
    const keys: RouteStopScopeKeys[] = [
      "id",
      "organization_id",
      "route_id",
      "task_id",
      "stop_order",
    ];
    assert.equal(keys.length, 5);
  });

  it("keeps organization scope columns on generated inventory movement rows", () => {
    const keys: MovementScopeKeys[] = [
      "id",
      "organization_id",
      "item_id",
      "qty",
      "type",
    ];
    assert.equal(keys.length, 5);
  });

  it("keeps recipient scope columns on generated route notification rows", () => {
    const keys: NotificationScopeKeys[] = [
      "id",
      "organization_id",
      "recipient_id",
      "route_id",
      "read_at",
    ];
    assert.equal(keys.length, 5);
  });

  it("keeps organization scope columns on generated warehouse rows", () => {
    const keys: WarehouseScopeKeys[] = [
      "id",
      "organization_id",
      "name",
      "is_active",
      "is_default",
    ];
    assert.equal(keys.length, 5);
  });

  it("keeps organization scope columns on generated activity history rows", () => {
    const keys: ActivityScopeKeys[] = [
      "id",
      "organization_id",
      "action",
      "entity_type",
      "title",
    ];
    assert.equal(keys.length, 5);
  });

  it("keeps compile-time alignment between adapters and generated core columns", () => {
    assert.equal(compileTimeGuards.length, 14);
  });
});
