import assert from "node:assert/strict";
import test from "node:test";
import { parseStatisticsDashboard } from "./parse";

function dashboardFixture() {
  const metric = { value: 0, previous: 0, deltaPct: null };
  return {
    meta: {
      generatedAt: "2026-08-05T12:00:00Z",
      timeZone: "America/Los_Angeles",
      currency: "USD",
      period: { from: "2026-08-05", to: "2026-08-05", compareFrom: "2026-08-04", compareTo: "2026-08-04", granularity: "hour" },
      filters: {}, coverage: [], limitations: [],
    },
    capabilities: { finance: true, logistics: true, inventory: true, agencies: false, agencyFinance: false },
    filterOptions: { agencies: [], countries: [], sellers: [], routes: [], drivers: [], shipmentStatuses: [], operationTypes: [], products: [] },
    kpis: { sales: metric, collections: metric, pending: metric, shipments: metric, boxes: metric, customers: metric, averageTicket: metric },
    trend: { granularity: "hour", buckets: [] },
    finance: { billed: 0, collected: 0, pending: 0, averageTicket: 0, openInvoices: 0, paidInvoices: 0, byStatus: [], paymentMethods: [] },
    logistics: { tasks: [], routes: [], packages: [], exceptions: 0, pendingCustody: 0 },
    logisticsAnalytics: {
      summary: { completedOperations: 0, deliveryOperations: 0, pickupOperations: 0, deliveryBoxOperations: 0, pickupBoxOperations: 0, deliveredBoxes: 0, collectedBoxes: 0 },
      coverage: {
        boxes: { key: "logisticsBoxCount", label: "Cajas", available: 0, total: 0, percent: 100, status: "complete" },
        postalCodes: { key: "logisticsPostalCode", label: "ZIP", available: 0, total: 0, percent: 100, status: "complete" },
      },
      daily: [],
      rankings: { postalCodes: [], routes: [], vehicles: [], drivers: [] },
    },
    inventory: { stock: 0, reserved: 0, assigned: 0, unavailable: 0, available: 0, estimatedValue: null, valuationCoveragePct: 0, lowStockItems: [] },
    agencies: { agencyReceivable: 0, customerReceivable: 0, unappliedAgencyPayments: 0, rows: [] },
    rankings: { sellers: [], countries: [], products: [], routes: [], drivers: [] },
    attention: [], tables: { shipments: [], payments: [], tasks: [] },
  };
}

test("acepta ceros, listas vacías, comparación nula y valoración no disponible", () => {
  const fixture = dashboardFixture();
  assert.equal(parseStatisticsDashboard(fixture).inventory.estimatedValue, null);
});

test("rechaza respuestas parciales antes de renderizarlas", () => {
  const fixture = dashboardFixture();
  delete (fixture.finance as Partial<typeof fixture.finance>).paymentMethods;
  assert.throws(() => parseStatisticsDashboard(fixture), /paymentMethods/);
});
