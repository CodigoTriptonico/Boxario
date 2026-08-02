/**
 * Public shipment-timing contract.
 *
 * Domain implementation lives in `shipment-timing/*`; keeping this façade
 * stable prevents callers from depending on internal module boundaries.
 */
export {
  formatShipmentAbsolute,
  formatShipmentDuration,
  formatShipmentRelative,
  formatGapSummary,
  formatActiveElapsed,
  formatWaitingHeadline,
  formatWaitingSince,
  resolveStepCompletedAt,
  saleAgeTextClass,
  saleAgeTone,
  stepShortName,
  type SaleAgeTone,
  type ShipmentStepGap,
  type ShipmentTimings,
} from "@/lib/shipment-timing/core";
export { buildShipmentTimings } from "@/lib/shipment-timing/timings";
export {
  buildShipmentMilestoneAges,
  milestoneAgeDisplayValue,
  milestoneAgeIndicatorButtonClass,
  type ShipmentMilestoneAge,
} from "@/lib/shipment-timing/milestones";
export {
  buildShipmentTimingInsightPanel,
  timingInsightRowTextClass,
  type ShipmentTimingInsightRow,
  type ShipmentTimingInsightStatus,
} from "@/lib/shipment-timing/insights";
export {
  buildShipmentAuditTimings,
  stepTimingTooltip,
  type ShipmentAuditTimings,
} from "@/lib/shipment-timing/audit";
