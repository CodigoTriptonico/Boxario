import assert from "node:assert/strict";
import test from "node:test";
import {
  resolveStatisticsPeriod,
  statisticsStateFromParams,
  statisticsStateToSearchParams,
} from "./statistics-period";

test("últimos 7 días usa límites inclusivos y un periodo anterior equivalente", () => {
  assert.deepEqual(resolveStatisticsPeriod("last7", "2026-08-05"), {
    from: "2026-07-30",
    to: "2026-08-05",
    compareFrom: "2026-07-23",
    compareTo: "2026-07-29",
  });
});

test("mes anterior respeta febrero y compara igual cantidad de días", () => {
  assert.deepEqual(resolveStatisticsPeriod("previousMonth", "2024-03-31"), {
    from: "2024-02-01",
    to: "2024-02-29",
    compareFrom: "2024-01-03",
    compareTo: "2024-01-31",
  });
});

test("rango personalizado se ordena y se limita a 366 días", () => {
  const value = resolveStatisticsPeriod("custom", "2026-08-05", {
    from: "2026-08-05",
    to: "2024-01-01",
  });
  assert.equal(value.to, "2026-08-05");
  assert.equal(value.from, "2025-08-05");
});

test("filtros válidos se conservan en una URL sincronizada", () => {
  const state = statisticsStateFromParams({
    tab: "logistics",
    period: "custom",
    from: "2026-08-01",
    to: "2026-08-05",
    country: "Honduras",
    sellerId: "seller-1",
    ignored: "no",
  });
  const params = statisticsStateToSearchParams(state);
  assert.equal(params.get("country"), "Honduras");
  assert.equal(params.get("sellerId"), "seller-1");
  assert.equal(params.get("tab"), "logistics");
  assert.equal(params.has("ignored"), false);
});

test("riesgos conserva su pestaña en la URL sin alterar el periodo compartido", () => {
  const state = statisticsStateFromParams({ tab: "risks", period: "last7" }, "2026-08-09");
  assert.equal(state.tab, "risks");
  assert.equal(statisticsStateToSearchParams(state).get("tab"), "risks");
});
