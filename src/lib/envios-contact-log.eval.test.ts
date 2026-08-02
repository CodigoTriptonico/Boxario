import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import { readEnviosClientSource } from "@/test-utils/envios-client-source";
import { readShipmentActionsSource } from "@/test-utils/shipment-actions-source";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const enviosSource = readEnviosClientSource(root);
const contactLineSource = readFileSync(
  join(root, "src/components/shipment-contact-log-dialog.tsx"),
  "utf8",
);
const contactLogSource = readFileSync(join(root, "src/lib/shipment-contact-log.ts"), "utf8");
const actionsSource = readShipmentActionsSource(root);
const migrationSource = readFileSync(
  join(root, "supabase/migrations/042_shipment_contact_logs.sql"),
  "utf8",
);
const channelOtherMigrationSource = readFileSync(
  join(root, "supabase/migrations/044_shipment_contact_channel_other.sql"),
  "utf8",
);

describe("envios contact log eval", () => {
  it("adds a compact seller follow-up action to shipment cards", () => {
    // SEG-001 / preferencia UI: una sola Bitácora; el diálogo de contactos legacy ya no se abre desde envíos.
    assert.equal(enviosSource.includes("ShipmentJournalDialog"), true);
    assert.equal(enviosSource.includes("ShipmentContactLogLine"), true);
    assert.equal(enviosSource.includes("onContactLogOpen(row.id)"), true);
    assert.equal(enviosSource.includes("Abrir Bitácora"), true);
    assert.equal(enviosSource.includes("<PhoneCall"), true);
    assert.equal(enviosSource.includes("readinessFilter"), true);
  });

  it("keeps the active compact legacy summary without the retired contact dialog", () => {
    assert.equal(contactLineSource.includes("ShipmentContactLogLine"), true);
    assert.equal(contactLineSource.includes("ShipmentContactLogDialog"), false);
    assert.equal(contactLineSource.includes("createShipmentContactLogAction"), false);
    assert.equal(contactLineSource.includes("DateTimeInput"), false);
  });

  it("keeps reminders driven by the latest log only", () => {
    assert.equal(contactLogSource.includes("latestShipmentContactLog"), true);
    assert.equal(contactLogSource.includes("latestShipmentContactReminderStatus"), true);
    assert.equal(contactLineSource.includes("latestShipmentContactLog(shipment.contactLogs)"), true);
    assert.equal(contactLineSource.includes("shipmentContactReminderLabel"), true);
    assert.equal(contactLineSource.includes("Prioridad"), false);
    assert.equal(contactLineSource.includes("Motivo"), false);
  });

  it("persists contact logs with auth, organization scope, audit, and mapped reload", () => {
    // New seller follow-ups write to shipment_journal_entries (Bitácora); contact_logs remain read-only legacy.
    assert.equal(actionsSource.includes("export async function createShipmentContactLogAction"), true);
    assert.equal(actionsSource.includes('sessionHasPermission(session, "sales.manage")'), true);
    assert.equal(actionsSource.includes("canWriteShipmentContactLog"), true);
    assert.equal(actionsSource.includes("shipment_journal_entries"), true);
    assert.equal(actionsSource.includes("channel_other"), true);
    assert.equal(actionsSource.includes("shipment.journal_entry_created"), true);
    assert.equal(actionsSource.includes("contactLogs"), true);
  });

  it("stores custom channel labels for later review", () => {
    assert.equal(contactLogSource.includes("channelOther"), true);
    assert.equal(contactLogSource.includes("summarizeShipmentContactChannelOthers"), true);
    assert.equal(channelOtherMigrationSource.includes("channel_other"), true);
    assert.equal(
      channelOtherMigrationSource.includes("idx_shipment_contact_logs_channel_other"),
      true,
    );
  });

  it("adds RLS so sellers only touch contact logs for their shipments", () => {
    assert.equal(migrationSource.includes("create table if not exists public.shipment_contact_logs"), true);
    assert.equal(migrationSource.includes("alter table public.shipment_contact_logs enable row level security"), true);
    assert.equal(migrationSource.includes("s.sales_owner_id = auth.uid()"), true);
    assert.equal(migrationSource.includes("public.current_role_slug() = 'administrador'"), true);
  });
});
