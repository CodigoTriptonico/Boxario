import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  EMPTY_BOX_DRIVER_MODE,
  EMPTY_BOX_OFFICE_MODE,
  FULL_BOX_OFFICE_MODE,
} from "@/components/sale/venta-parts";
import type { ShipmentLogisticsEditorState } from "@/lib/shipment-logistics-edit";
import {
  EMPTY_BOX_LEG_LABELS,
  FULL_BOX_LEG_LABELS,
  logisticsLegRouteActionCopy,
} from "@/lib/shipment-leg-labels";
import {
  logisticsLegActiveChannel,
  logisticsLegMenuSummary,
  scheduleApplyButtonLabel,
} from "@/components/shipment-step-context-menu";

const contextMenuSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "shipment-step-context-menu.tsx"),
  "utf8",
);

const baseState: ShipmentLogisticsEditorState = {
  emptyBoxMode: EMPTY_BOX_OFFICE_MODE,
  emptyBoxHandingNow: false,
  emptyBoxScheduleMode: "pending",
  emptyBoxScheduleAt: "",
  emptyBoxDriverTaskOrdered: false,
  fullBoxMode: "",
  fullBoxScheduleMode: "pending",
  fullBoxScheduleAt: "",
  fullBoxDriverTaskOrdered: false,
};

describe("shipment step context menu", () => {
  it("describes office empty box before and after mostrador handoff", () => {
    assert.equal(
      logisticsLegMenuSummary("empty_box", baseState),
      "Cliente recoge caja vacía en oficina",
    );
    assert.equal(logisticsLegActiveChannel("empty_box", baseState), "office");

    assert.equal(
      logisticsLegMenuSummary("empty_box", { ...baseState, emptyBoxHandingNow: true }),
      "Caja vacia entregada en mostrador",
    );
  });

  it("describes full box pickup separately from empty box delivery", () => {
    assert.equal(logisticsLegMenuSummary("full_box", baseState), "Recolección pendiente");

    const state = {
      ...baseState,
      fullBoxMode: FULL_BOX_OFFICE_MODE,
    };

    assert.equal(
      logisticsLegMenuSummary("full_box", state),
      "Cliente trae caja llena a oficina",
    );
  });

  it("describes driver scheduled empty box", () => {
    const state = {
      ...baseState,
      emptyBoxMode: EMPTY_BOX_DRIVER_MODE,
      emptyBoxScheduleMode: "scheduled",
      emptyBoxScheduleAt: "2026-07-10T10:00:00",
    };

    assert.match(logisticsLegMenuSummary("empty_box", state), /Programar entrega de caja vacia/);
    assert.equal(logisticsLegActiveChannel("empty_box", state), "driver");
  });

  it("keeps schedule apply label helper for legacy callers", () => {
    assert.equal(scheduleApplyButtonLabel(false), "Aplicar programación");
    assert.equal(scheduleApplyButtonLabel(true), "Cambiar fecha");
  });

  it("uses one program action instead of separate listo + ruta buttons", () => {
    assert.equal(EMPTY_BOX_LEG_LABELS.ready, "Programar entrega");
    assert.equal(FULL_BOX_LEG_LABELS.ready, "Programar recolección");
    assert.match(EMPTY_BOX_LEG_LABELS.pendingRoute, /ruta/i);
    assert.match(contextMenuSource, /function DriverLegReadyMenu/);
    assert.match(contextMenuSource, /onProgramRoute/);
    assert.equal(contextMenuSource.includes("onMarkReady"), false);
    assert.equal(contextMenuSource.includes("Listo para dejar"), false);
    assert.equal(contextMenuSource.includes("Establecer una fecha"), false);
    assert.match(contextMenuSource, /function requestCancelPickup|function requestCancelDelivery/);
    assert.match(contextMenuSource, /logisticsLegCancelCopy/);
    assert.match(contextMenuSource, /ActionConfirmDialog/);
  });

  it("shows office and driver options together for empty box like full box", () => {
    assert.match(contextMenuSource, /Entregar en oficina/);
    assert.match(contextMenuSource, /Cliente entregó caja en oficina/);
    assert.equal(contextMenuSource.includes('title="Opciones de dejar"'), false);
    assert.equal(contextMenuSource.includes("isContextMenu ?"), false);
    assert.equal(contextMenuSource.includes("isLeftClickMenu"), false);
    const emptyOfficeIdx = contextMenuSource.indexOf("Entregar en oficina");
    const emptyDriverIdx = contextMenuSource.indexOf(
      'logisticsLegRouteActionCopy(\n                  "empty_box"',
    );
    assert.ok(emptyOfficeIdx > 0 && emptyDriverIdx > emptyOfficeIdx);
  });

  it("edits an existing route instead of offering to program it again", () => {
    assert.deepEqual(logisticsLegRouteActionCopy("empty_box", true, false), {
      title: "Editar entrega",
      description:
        "Pedido enviado a Logística. Cambia el día o la hora si hace falta.",
    });
    assert.equal(
      logisticsLegRouteActionCopy("full_box", true, true).title,
      "Editar recolección",
    );
    assert.match(
      logisticsLegRouteActionCopy("full_box", true, true).description,
      /Ya está en una ruta/,
    );
    assert.equal(
      logisticsLegRouteActionCopy("empty_box", false).title,
      "Programar entrega",
    );
    assert.match(contextMenuSource, /routeName && formattedSchedule/);
    assert.match(contextMenuSource, /routeConfirmed/);
  });

  it("keeps the menu open while native pickers are in use", () => {
    assert.match(contextMenuSource, /shouldSuppressDismissForNativePicker/);
    assert.match(
      contextMenuSource,
      /shouldSuppressDismissForNativePicker\(event, menu\)/,
    );
  });
});
