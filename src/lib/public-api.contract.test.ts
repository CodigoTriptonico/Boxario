/**
 * Knip public-API contract.
 *
 * Imports every intentional residual listed in `docs/FASE2_KNIP_EXCEPCIONES.md`
 * so Knip treats them as used. Update that doc when adding/removing symbols here.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createShipmentContactLogAction, listShipmentsForRouteBoardAction } from "@/app/actions/shipments";
import type { EnviosShipmentListsSharedProps } from "@/components/envios/types";
import { Constants, type CompositeTypes } from "@/lib/db/database.generated";
import type { LogisticsTaskWaiting } from "@/lib/logistics-view";
import type { CountryCatalogBoxRow } from "@/lib/pricing-catalog";
import type {
  ScheduleSuggestionDayConfig,
  ScheduleSuggestionModeAvailability,
} from "@/lib/sale/schedule-suggestions";
import type {
  EnviosReadinessBucket,
  EnviosStatusFilterBucket,
  FullBoxPickupPlanStatus,
  ShipmentRouteAssignmentInfo,
} from "@/lib/shipment-display";
import type {
  ExpedienteDocumentView,
  ExpedienteFinancialPayment,
  ExpedientePartyField,
  ExpedientePartySource,
} from "@/lib/shipment-expediente";
import type {
  SaleAgeTone,
  ShipmentAuditTimings,
  ShipmentStepGap,
  ShipmentTimingInsightStatus,
} from "@/lib/shipment-timing";

type PublicApiTypeSurface = [
  CompositeTypes<never>,
  EnviosShipmentListsSharedProps,
  LogisticsTaskWaiting,
  CountryCatalogBoxRow,
  ScheduleSuggestionModeAvailability,
  ScheduleSuggestionDayConfig,
  EnviosStatusFilterBucket,
  EnviosReadinessBucket,
  FullBoxPickupPlanStatus,
  ShipmentRouteAssignmentInfo,
  ExpedientePartySource,
  ExpedientePartyField,
  ExpedienteFinancialPayment,
  ExpedienteDocumentView,
  SaleAgeTone,
  ShipmentStepGap,
  ShipmentTimingInsightStatus,
  ShipmentAuditTimings,
];

describe("public API contract (Knip residuals)", () => {
  it("keeps intentional public actions and codegen values reachable", () => {
    assert.equal(typeof createShipmentContactLogAction, "function");
    assert.equal(typeof listShipmentsForRouteBoardAction, "function");
    assert.equal(typeof Constants, "object");
    assert.ok(Constants.public);
  });

  it("references intentional domain type surface", () => {
    const typeSurface: PublicApiTypeSurface | null = null;
    assert.equal(typeSurface, null);
  });
});
