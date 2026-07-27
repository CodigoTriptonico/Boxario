import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import {
  EMPTY_BOX_OFFICE_MODE,
  EMPTY_BOX_DRIVER_MODE,
  FULL_BOX_DEFERRED_SUMMARY,
  FULL_BOX_DRIVER_MODE,
  FULL_BOX_OFFICE_MODE,
  fullBoxSummaryLine,
  logisticsSummary,
  saleLogisticsContinueHint,
  saleLogisticsPlanReady,
} from "@/components/sale/venta-parts";

describe("sale deferred pickup helpers", () => {
  it("marks logistics ready with only empty box configured", () => {
    assert.equal(
      saleLogisticsPlanReady(
        EMPTY_BOX_OFFICE_MODE,
        "",
        "",
        "",
        "",
        "",
      ),
      true,
    );
    assert.equal(
      saleLogisticsPlanReady(
        "",
        "",
        "",
        "",
        "",
        "",
      ),
      false,
    );
  });

  it("allows pending empty-box driver delivery when day is known later via route decision", () => {
    assert.equal(
      saleLogisticsPlanReady(
        EMPTY_BOX_DRIVER_MODE,
        "pending",
        "",
        "",
        "",
        "",
      ),
      true,
    );
    assert.equal(
      saleLogisticsPlanReady(
        EMPTY_BOX_DRIVER_MODE,
        "scheduled",
        "",
        "",
        "",
        "",
      ),
      false,
    );
    assert.equal(
      saleLogisticsPlanReady(
        EMPTY_BOX_DRIVER_MODE,
        "scheduled",
        "2026-07-25T10:00",
        "",
        "",
        "",
      ),
      true,
    );
  });

  it("requires full box completion when pickup mode is chosen at sale", () => {
    assert.equal(
      saleLogisticsPlanReady(
        EMPTY_BOX_OFFICE_MODE,
        "",
        "",
        FULL_BOX_DRIVER_MODE,
        "pending",
        "",
      ),
      true,
    );
    assert.equal(
      saleLogisticsPlanReady(
        EMPTY_BOX_OFFICE_MODE,
        "",
        "",
        FULL_BOX_DRIVER_MODE,
        "scheduled",
        "",
      ),
      false,
    );
    assert.equal(
      saleLogisticsPlanReady(
        EMPTY_BOX_OFFICE_MODE,
        "",
        "",
        FULL_BOX_OFFICE_MODE,
        "",
        "",
      ),
      true,
    );
  });

  it("summarizes deferred pickup in logistics notes", () => {
    assert.equal(fullBoxSummaryLine("", "", ""), FULL_BOX_DEFERRED_SUMMARY);
    assert.match(
      logisticsSummary(
        EMPTY_BOX_OFFICE_MODE,
        "",
        "",
        "",
        "",
        "",
      ),
      /Caja llena: Recolección pendiente/,
    );
  });

  it("returns continue hints only while logistics is incomplete", () => {
    assert.equal(
      saleLogisticsContinueHint("", "", "", "", "", "", false),
      "Elige cómo sale la caja vacía para continuar.",
    );
    assert.equal(
      saleLogisticsContinueHint(
        EMPTY_BOX_DRIVER_MODE,
        "pending",
        "",
        "",
        "",
        "",
        false,
      ),
      "",
    );
    assert.equal(
      saleLogisticsContinueHint(
        EMPTY_BOX_DRIVER_MODE,
        "scheduled",
        "",
        "",
        "",
        "",
        false,
      ),
      "Elige la fecha de entrega de la caja vacía (la ruta es opcional).",
    );
    assert.equal(
      saleLogisticsContinueHint(
        EMPTY_BOX_OFFICE_MODE,
        "",
        "",
        "",
        "",
        "",
        false,
      ),
      "",
    );
    assert.equal(
      saleLogisticsContinueHint(
        EMPTY_BOX_OFFICE_MODE,
        "",
        "",
        FULL_BOX_DRIVER_MODE,
        "scheduled",
        "",
        true,
      ),
      "Completa la recolección o toca Dejar pendiente.",
    );
  });
});

describe("sale logistics step copy eval", () => {
  it("does not require both movements by default", () => {
    const source = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../components/sale/sale-logistics-step.tsx"),
      "utf8",
    );
    const partsSource = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../components/sale/venta-parts.tsx"),
      "utf8",
    );

    assert.equal(source.includes("Completa los dos movimientos"), false);
    assert.equal(source.includes("Programar ahora"), true);
    assert.equal(source.includes("Dejar pendiente"), true);
    assert.equal(source.includes("Caja llena vuelve a oficina"), true);
    assert.equal(source.includes("secondaryButtonClass"), false);
    assert.equal(source.includes("La caja sale del mostrador en este momento"), false);
    assert.equal(source.includes("La programas en Envíos cuando el cliente la llene"), false);
    assert.equal(source.includes("Pasa por la oficina y se la lleva"), false);
    assert.equal(source.includes("Se entrega ahora en mostrador"), true);
    assert.equal(source.includes("Fecha obligatoria; la ruta es opcional."), true);
    assert.equal(source.includes("compactOfficeSelection"), true);
    assert.equal(partsSource.includes("Elige cómo sale la caja vacía"), true);
    assert.equal(
      partsSource.includes("Elige la fecha de entrega de la caja vacía (la ruta es opcional)."),
      true,
    );
    assert.match(
      partsSource,
      /allowPending = mode === FULL_BOX_DRIVER_MODE \|\| mode === EMPTY_BOX_DRIVER_MODE/,
    );
  });

  it("does not clip the logistics step panel", () => {
    const ventaSource = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../components/venta-client.tsx"),
      "utf8",
    );

    assert.match(ventaSource, /activeStep === "delivery"[\s\S]*?flowPersonListShellClass/);
  });

  it("offers Siguiente on delivery when logistics is ready", () => {
    const ventaSource = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../components/venta-client.tsx"),
      "utf8",
    );
    const logisticsSource = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../components/sale/sale-logistics-step.tsx"),
      "utf8",
    );

    assert.match(ventaSource, /function continueFromLogistics\(\)/);
    assert.match(ventaSource, /disabled=\{!logisticsPlanReady\}[\s\S]*?continueFromLogistics/);
    assert.match(ventaSource, /logisticsContinueHint/);
    assert.equal(logisticsSource.includes("footerHint"), false);
    assert.equal(logisticsSource.includes("pulsa Siguiente"), false);
  });

  it("requires a dated route decision for empty-box driver delivery at sale time", () => {
    const ventaSource = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), "../components/venta-client.tsx"),
      "utf8",
    );

    assert.match(
      ventaSource,
      /emptyBoxRouteDecision\?\.kind === "selected" \|\|[\s\S]*?kind === "pending" && Boolean\(emptyBoxRouteDecision\.routeDate\)/,
    );
    assert.match(ventaSource, /allowPendingDay=\{routePlannerLeg === "fullBox"\}/);
    assert.match(
      ventaSource,
      /allowPendingRoute=\{\s*routePlannerLeg === "fullBox" \|\|\s*routePlannerLeg === "emptyBox" \|\|\s*routePlannerLeg === "quickEmptyBox"\s*\}/,
    );
  });
});
