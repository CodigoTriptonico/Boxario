import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { readConductorTaskActionsSource } from "@/test-utils/conductor-logistics-action-sources";
import { readShipmentActionsSource } from "@/test-utils/shipment-actions-source";
import { readLogisticaClientSource } from "@/test-utils/logistica-client-source";
import { readConductorTareasClientSource } from "@/test-utils/conductor-tareas-client-source";

const root = process.cwd();
const clientSource = readConductorTareasClientSource(root);
const queueSource = readFileSync(join(root, "src/lib/conductor-offline/queue.ts"), "utf8");
const actionSource = readConductorTaskActionsSource(root);
const shipmentsSource = readShipmentActionsSource(root);
const logisticsSource = readLogisticaClientSource(root);
const migrationSource = readFileSync(join(root, "supabase/migrations/079_package_invoice_evidence.sql"), "utf8");
const atomicSaleMigration = readFileSync(
  join(root, "supabase/migrations/132_atomic_sales_tracking_and_authoritative_writes.sql"),
  "utf8",
);

describe("invoice visible on physical boxes eval", () => {
  it("requires an explicit driver confirmation and matching photo guidance", () => {
    assert.match(clientSource, /Confirmo que la factura de cada caja/);
    assert.match(clientSource, /dialog\?\.task\.boxInvoiceCodes/);
    assert.match(clientSource, /La foto debe mostrar el invoice escrito en la caja/);
    assert.match(clientSource, /Confirma que el invoice se ve escrito en la caja/);
  });

  it("keeps the invoice confirmation with the offline-first task until sync", () => {
    assert.match(queueSource, /invoiceVisible: draft\.invoiceVisible/);
    assert.match(queueSource, /formData\.set\("invoiceVisible", String\(operation\.invoiceVisible\)\)/);
  });

  it("enforces the rule on the server and records both evidence and incidents", () => {
    assert.match(actionSource, /const invoiceVisible = cleanText\(formData\.get\("invoiceVisible"\), 10\) === "true"/);
    assert.match(actionSource, /invoiceVisible,/);
    assert.match(actionSource, /recordInvoiceEvidence\(admin, session/);
    assert.match(actionSource, /recordInvoiceIncident\(admin, session/);
    assert.match(actionSource, /Invoice no visible/);
  });

  it("creates an auditable physical package for every new sale", () => {
    assert.match(
      shipmentsSource,
      /physicalPackageCodesForShipment\(input\.invoiceNumber, quote\.plan\)/,
    );
    assert.match(shipmentsSource, /create_shipment_sale_atomic/);
    assert.match(atomicSaleMigration, /insert into public\.shipment_packages/i);
    assert.match(atomicSaleMigration, /invoice_created_by, invoice_paid_by/i);
  });

  it("keeps logistics aware of pending, confirmed and missing invoices", () => {
    assert.match(shipmentsSource, /shipment_packages \(/);
    assert.match(shipmentsSource, /invoiceBoxEvidence/);
    assert.match(logisticsSource, /Invoice por confirmar/);
    assert.match(logisticsSource, /Invoice confirmado/);
    assert.match(logisticsSource, /Invoice no visible/);
  });

  it("persists the delivery, pickup and incident states per physical package", () => {
    assert.match(migrationSource, /invoice_marked_at/);
    assert.match(migrationSource, /invoice_delivery_evidence_url/);
    assert.match(migrationSource, /invoice_pickup_confirmed_at/);
    assert.match(migrationSource, /invoice_incident_reason/);
    assert.match(migrationSource, /invoice_visible boolean/);
  });
});
