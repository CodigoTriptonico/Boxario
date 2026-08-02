/**
 * Public shipment-display contract.
 *
 * Domain implementation lives in `shipment-display/*`; keeping this façade
 * stable prevents callers from depending on internal module boundaries.
 */
export type {
  ShipmentProgressChannel,
  ShipmentProgressKind,
  ShipmentProgressStep,
} from "@/lib/shipment-types";
export {
  PENDING_EMPTY_BOX_STATUS,
  PENDING_FULL_BOX_STATUS,
} from "@/lib/shipment-display/constants";
export {
  ENVIOS_STATUS_FILTER_OPTIONS,
  filterShipmentsForEnviosMode,
  isActiveShipment,
  isCompletedShipment,
  isPendingShipmentStatus,
  matchesEnviosSearchQuery,
  matchesEnviosStatusFilter,
  orderShipmentsByStableIds,
  reconcileShipmentDisplayOrderIds,
  resolveInitialShipmentStatus,
  resolvePendingShipmentStatus,
  shipmentOperationalDetailLabel,
  shipmentOperationalStatusLabel,
  shipmentStatusDisplayLabel,
  sortShipmentsByArrivalOrder,
  sortShipmentsByInvoicePriority,
  syncShipmentStatusPatch,
  type EnviosClientMode,
  type EnviosStatusFilterBucket,
} from "@/lib/shipment-display/status";
export { shipmentLogisticsSteps } from "@/lib/shipment-display/progress";
export {
  balanceDueFromShipment,
  depositFromShipment,
  formatBoxQuantityLabel,
  invoiceStatusLabel,
  quoteFromShipment,
  readBoxLinesFromLogisticsPlan,
  readShipmentBoxLines,
  shipmentBoxLineTotal,
  shipmentBoxLinesDetailLabel,
  shipmentBoxLinesTriggerLabel,
  shipmentPaymentProgress,
  totalFromShipment,
  type ShipmentBoxLine,
  type ShipmentPaymentProgress,
  type ShipmentQuote,
} from "@/lib/shipment-display/finance";
export {
  SHIPMENT_LOGISTICS_BRIDGE_LABEL,
  classifyEnviosReadinessBucket,
  fullBoxPickupPlanStatus,
  fullBoxPickupPlanStatusLabel,
  matchesEnviosReadinessFilter,
  shipmentLogisticsBridgeLabel,
  shipmentOperationalAssignment,
  shipmentOperationalAssignmentLabel,
  shipmentOperationalDriverLabel,
  type EnviosReadinessBucket,
  type EnviosReadinessFilter,
  type FullBoxPickupPlanStatus,
  type ShipmentOperationalAssignment,
  type ShipmentRouteAssignmentInfo,
} from "@/lib/shipment-display/assignment";
