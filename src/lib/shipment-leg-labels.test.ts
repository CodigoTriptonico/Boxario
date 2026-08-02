import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  EMPTY_BOX_LEG_LABELS,
  FULL_BOX_LEG_LABELS,
  logisticsLegRouteActionCopy,
  logisticsLegCompactLabel,
  weekdayLabelFromSchedule,
} from "./shipment-leg-labels";

describe("shipment-leg-labels", () => {
  it("uses the same verb family for empty box actions", () => {
    assert.equal(EMPTY_BOX_LEG_LABELS.short, "Dejar");
    assert.equal(EMPTY_BOX_LEG_LABELS.ready, "Programar entrega");
    assert.equal(EMPTY_BOX_LEG_LABELS.cancel, "Cancelar entrega");
    assert.match(EMPTY_BOX_LEG_LABELS.pendingRoute, /ruta/i);
    assert.equal(EMPTY_BOX_LEG_LABELS.auditStep, EMPTY_BOX_LEG_LABELS.short);
  });

  it("uses the same verb family for full box actions", () => {
    assert.equal(FULL_BOX_LEG_LABELS.short, "Recoger");
    assert.equal(FULL_BOX_LEG_LABELS.ready, "Programar recolección");
    assert.equal(FULL_BOX_LEG_LABELS.cancel, "Cancelar recolección");
    assert.match(FULL_BOX_LEG_LABELS.pendingRoute, /ruta/i);
    assert.equal(FULL_BOX_LEG_LABELS.auditStep, FULL_BOX_LEG_LABELS.short);
  });

  it("distinguishes programming a new task from editing an existing route", () => {
    assert.deepEqual(logisticsLegRouteActionCopy("empty_box", true), {
      title: "Editar entrega",
      description:
        "Ya está programada. Cambia la ruta (día) o la hora solo si hace falta.",
    });
    assert.equal(
      logisticsLegRouteActionCopy("full_box", true).title,
      "Editar recolección",
    );
    assert.equal(
      logisticsLegRouteActionCopy("empty_box", false).title,
      "Programar entrega",
    );
  });

  it("names compact chips by assignment and weekday", () => {
    assert.equal(weekdayLabelFromSchedule("2026-08-03T10:00"), "lunes");
    assert.equal(
      logisticsLegCompactLabel("empty_box", {
        active: true,
        ordered: true,
        scheduledAt: "2026-08-03T10:00",
      }),
      "Entrega para el lunes",
    );
    assert.equal(
      logisticsLegCompactLabel("full_box", {
        active: true,
        ordered: true,
        scheduledAt: "2026-08-06T10:00",
      }),
      "Recolección para el jueves",
    );
    assert.equal(
      logisticsLegCompactLabel("empty_box", {
        active: true,
        ordered: true,
        scheduledAt: null,
      }),
      "Entrega programada",
    );
    assert.equal(
      logisticsLegCompactLabel("empty_box", { active: true, ordered: false }),
      "Entrega por asignar",
    );
    assert.equal(
      logisticsLegCompactLabel("full_box", { active: true, ordered: false }),
      "Recolección por asignar",
    );
    assert.equal(
      logisticsLegCompactLabel("empty_box", { active: false, ordered: true }),
      "Dejar",
    );
    assert.equal(
      logisticsLegCompactLabel("full_box", { active: false, ordered: false }),
      "Recoger",
    );
  });
});
