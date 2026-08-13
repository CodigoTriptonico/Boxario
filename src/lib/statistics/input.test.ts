import assert from "node:assert/strict";
import test from "node:test";
import { normalizeStatisticsDashboardInput } from "./input";

test("normaliza un periodo inclusivo y filtros admitidos", () => {
  assert.deepEqual(normalizeStatisticsDashboardInput({
    from: "2026-08-01",
    to: "2026-08-05",
    compareFrom: "2026-07-27",
    compareTo: "2026-07-31",
    filters: { country: " Honduras ", sellerId: "9b842a7c-ec94-4fc0-9cb5-8dcb440c82c3" },
  }), {
    from: "2026-08-01",
    to: "2026-08-05",
    compareFrom: "2026-07-27",
    compareTo: "2026-07-31",
    filters: {
      agencyId: undefined,
      country: "Honduras",
      sellerId: "9b842a7c-ec94-4fc0-9cb5-8dcb440c82c3",
      routeId: undefined,
      driverId: undefined,
      shipmentStatus: undefined,
      operationType: undefined,
      productKey: undefined,
    },
  });
});

test("rechaza fechas reales inválidas, rangos invertidos y más de 366 días", () => {
  assert.throws(() => normalizeStatisticsDashboardInput({ from: "2026-02-30", to: "2026-03-01", compareFrom: "2026-02-01", compareTo: "2026-02-02" }), /fecha valida/);
  assert.throws(() => normalizeStatisticsDashboardInput({ from: "2026-08-05", to: "2026-08-01", compareFrom: "2026-07-01", compareTo: "2026-07-02" }), /fechas invertidas/);
  assert.throws(() => normalizeStatisticsDashboardInput({ from: "2025-01-01", to: "2026-08-01", compareFrom: "2024-01-01", compareTo: "2024-01-02" }), /366 dias/);
});

test("rechaza IDs ajenos al formato UUID y filtros con controles", () => {
  const base = { from: "2026-08-01", to: "2026-08-05", compareFrom: "2026-07-27", compareTo: "2026-07-31" };
  assert.throws(() => normalizeStatisticsDashboardInput({ ...base, filters: { agencyId: "otra-organizacion" } }), /agencyId no es valido/);
  assert.throws(() => normalizeStatisticsDashboardInput({ ...base, filters: { productKey: "caja\u0000" } }), /productKey no es valido/);
});
