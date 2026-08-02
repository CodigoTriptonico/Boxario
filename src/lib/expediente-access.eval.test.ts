import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { readEnviosClientSource } from "@/test-utils/envios-client-source";
import {
  buildExpedienteSenderParty,
  buildExpedienteRecipientParty,
} from "@/lib/shipment-expediente";
import { readBillingFromPlan } from "@/lib/invoice-billing";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const enviosSource = readEnviosClientSource();
const historyDrawerSource = readFileSync(
  join(root, "components/sale/sale-customer-history-drawer.tsx"),
  "utf8",
);
const expedienteActionSource = readFileSync(
  join(root, "app/actions/shipment-expediente.ts"),
  "utf8",
);

describe("shipment expediente parties", () => {
  it("prefers recipient snapshot over live contact data", () => {
    const party = buildExpedienteRecipientParty({
      recipientSnapshot: {
        firstName: "Ana",
        lastName: "Ruiz",
        phone: "555-111-2222",
        country: "México",
      },
      recipient: {
        first_name: "Ana",
        last_name: "Actualizada",
        phone: "999",
      },
    });

    assert.equal(party?.source, "recipient_snapshot");
    assert.equal(party?.name, "Ana Ruiz");
    assert.match(party?.fields.find((field) => field.label === "Teléfono")?.value || "", /555-111-2222/);
  });

  it("documents live sender contact data when no sender snapshot exists", () => {
    const party = buildExpedienteSenderParty({
      customerName: "Luis Pérez",
      customer: {
        phones: ["555-000-1111"],
        city: "Los Angeles",
      },
    });

    assert.equal(party.source, "customer_live");
    assert.equal(party.name, "Luis Pérez");
    assert.match(party.sourceNote, /contacto actual/i);
  });
});

describe("shipment expediente billing", () => {
  it("reads historical billing from logistics_plan instead of current pricing", () => {
    const billing = readBillingFromPlan({
      billing: {
        quotedTotal: "$120.00",
        payNow: "$40.00",
        balanceDue: "$80.00",
        boxCount: 2,
        boxUnitPrice: "$60.00",
        cartLines: [{ label: "Mediana", catalogKey: "med", quantity: 2, unitPrice: "$60.00" }],
        boxSubtotalBeforeDiscount: "$120.00",
        boxSubtotal: "$120.00",
        promotionDiscount: "$0.00",
        emptyBoxDelivery: "$0.00",
        fullBoxPickup: "$0.00",
        logisticsSubtotal: "$0.00",
        minimumDeposit: "$0.00",
        depositRequired: "$40.00",
        depositStatus: "pending",
      },
    });

    assert.equal(billing?.quotedTotal, "$120.00");
    assert.equal(billing?.payNow, "$40.00");
  });
});

describe("expediente access wiring", () => {
  it("adds Ver expediente in seguimiento shipment actions without replacing Cobrar", () => {
    assert.match(enviosSource, /ShipmentExpedienteLink/);
    assert.match(enviosSource, /finalizeCopy\.actionLabel/);
    assert.match(enviosSource, /onFinalizeOpen/);
    assert.match(enviosSource, /onContactLogOpen/);
    assert.match(enviosSource, /onTogglePriority/);
  });

  it("opens expediente from último envío detail with seguimiento", () => {
    assert.match(historyDrawerSource, /buildExpedienteShipmentDeepLink/);
    assert.match(historyDrawerSource, /Ver expediente/);
    assert.match(historyDrawerSource, /Abrir en Seguimiento/);
    assert.equal(historyDrawerSource.includes("Auditoría completa"), false);
    assert.equal(historyDrawerSource.includes("listShipmentActivityHistoryAction"), false);
  });

  it("filters expediente sections on the server", () => {
    assert.match(expedienteActionSource, /resolveExpedienteSectionPermissions/);
    assert.match(expedienteActionSource, /financial: ExpedienteFinancialView \| null = permissions\.canViewFinancial/);
    assert.match(expedienteActionSource, /assertShipmentVisible/);
    assert.match(expedienteActionSource, /organization_id/);
  });
});
