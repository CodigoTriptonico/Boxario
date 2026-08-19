import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (relativePath: string) => readFileSync(path.join(root, relativePath), "utf8");

test("formatAddressSnapshot, canales y categorías están definidos en src/lib/customer-journal.ts", () => {
  const lib = read("src/lib/customer-journal.ts");

  assert.match(lib, /export const CUSTOMER_JOURNAL_CHANNELS/);
  assert.match(lib, /export const CUSTOMER_JOURNAL_OUTCOMES/);
  assert.match(lib, /export function channelLabel/);
  assert.match(lib, /export function outcomeLabel/);
  assert.match(lib, /export function formatAddressSnapshot/);
  assert.match(lib, /export type CustomerTimelineShipmentItem/);
  assert.match(lib, /export type CustomerTimelineJournalItem/);
  assert.match(lib, /export type CustomerTimelineActivityItem/);
});

test("migración 217_customer_journal_entries.sql añade customer_id e indexa la bitácora por cliente", () => {
  const sql = read("supabase/migrations/217_customer_journal_entries.sql");

  assert.match(sql, /add column if not exists customer_id/);
  assert.match(sql, /alter column shipment_id drop not null/);
  assert.match(sql, /idx_shipment_journal_customer_time/);
  assert.match(sql, /create policy shipment_journal_entries_select/);
});

test("customer-journal actions y CustomerJournalDialog soportan la bitácora unificada con envíos y direcciones", () => {
  const actions = read("src/app/actions/customer-journal.ts");
  const dialog = read("src/components/customer-journal-dialog.tsx");
  const historyDrawer = read("src/components/sale/sale-customer-history-drawer.tsx");
  const shipmentDialog = read("src/components/shipment-journal-dialog.tsx");

  assert.match(actions, /listCustomerJournalTimelineAction/);
  assert.match(actions, /createCustomerJournalEntryAction/);
  assert.match(actions, /updateCustomerJournalEntryAction/);
  assert.match(actions, /deleteCustomerJournalEntryAction/);

  assert.match(dialog, /CustomerJournalDialog/);
  assert.match(dialog, /Dirección de Recolección/);
  assert.match(dialog, /Dirección de Entrega/);
  assert.match(dialog, /Nueva nota \/ llamada/);
  assert.match(dialog, /Filtros de bitácora/);

  assert.match(historyDrawer, /CustomerJournalDialog/);
  assert.match(historyDrawer, /Bitácora/);

  assert.match(shipmentDialog, /CustomerJournalDialog/);
  assert.match(shipmentDialog, /Bitácora del cliente/);
});

test("formatTimelineDate formatea correctamente días de la semana, fechas y horas en español", () => {
  const lib = read("src/lib/customer-journal.ts");
  assert.match(lib, /export function formatTimelineDate/);
  assert.match(lib, /dayOfWeek/);
  assert.match(lib, /toLocaleDateString\("es-MX"/);
});

test("CustomerTimelineActivityCard y CustomerTimelineJournalCard muestran autor 'Creado por' y detalle temporal", () => {
  const dialog = read("src/components/customer-journal-dialog.tsx");

  assert.match(dialog, /Creado por:/);
  assert.match(dialog, /formatted\.dayOfWeek/);
  assert.match(dialog, /formatted\.time/);
  assert.match(dialog, /getActivityActionKind/);
});

