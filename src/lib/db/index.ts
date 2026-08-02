/**
 * Tipos generados desde el esquema PostgreSQL local (Supabase).
 * Regenerar: `npm run codegen:db-types`
 *
 * No acoplar la UI directamente a estos tipos. Usar adaptadores de dominio
 * (`ShipmentRow`, etc.) y migrar módulos de alto riesgo de forma gradual.
 */
export type {
  Database,
  Json,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from "./database.generated";

import type { Database } from "./database.generated";

export type DbShipment = Database["public"]["Tables"]["shipments"]["Row"];
export type DbShipmentLogisticsTask =
  Database["public"]["Tables"]["shipment_logistics_tasks"]["Row"];
export type DbShipmentPayment = Database["public"]["Tables"]["shipment_payments"]["Row"];
export type DbLogisticsRoute = Database["public"]["Tables"]["logistics_routes"]["Row"];
export type DbLogisticsRouteStop =
  Database["public"]["Tables"]["logistics_route_stops"]["Row"];
export type DbLogisticsRouteNotification =
  Database["public"]["Tables"]["logistics_route_notifications"]["Row"];
export type DbInventoryStock = Database["public"]["Tables"]["inventory_stock"]["Row"];
export type DbInventoryMovement =
  Database["public"]["Tables"]["inventory_movements"]["Row"];
export type DbWarehouse = Database["public"]["Tables"]["warehouses"]["Row"];
export type DbActivityHistory = Database["public"]["Tables"]["activity_history"]["Row"];
export type DbImmutableAuditEvent =
  Database["public"]["Tables"]["immutable_audit_events"]["Row"];
