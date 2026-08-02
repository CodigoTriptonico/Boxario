import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cleanShipmentJournalBody,
  readShipmentJournalCategory,
  readShipmentJournalFollowUp,
  shipmentJournalDisplayBody,
  shipmentJournalDisplayTitle,
  shipmentJournalDueState,
  shipmentJournalReminderBadge,
} from "./shipment-journal";

describe("shipment journal", () => {
  it("keeps fixed categories and falls back to general", () => {
    assert.equal(readShipmentJournalCategory("billing"), "billing");
    assert.equal(readShipmentJournalCategory("private"), "general");
  });

  it("normalizes text and validates reminder dates", () => {
    assert.equal(cleanShipmentJournalBody("  llamada\r\npendiente  "), "llamada\npendiente");
    assert.equal(readShipmentJournalFollowUp("not-a-date").ok, false);
    assert.equal(readShipmentJournalFollowUp("").value, null);
  });

  it("classifies pending reminders without marking future days as today", () => {
    const now = new Date("2026-07-26T12:00:00-07:00");
    assert.equal(shipmentJournalDueState("2026-07-25T12:00:00-07:00", "pending", now), "overdue");
    assert.equal(shipmentJournalDueState("2026-07-26T18:00:00-07:00", "pending", now), "today");
    assert.equal(shipmentJournalDueState("2026-07-27T09:00:00-07:00", "pending", now), "pending");
    assert.equal(shipmentJournalDueState("2026-07-25T12:00:00-07:00", "completed", now), "none");
  });

  it("removes repeated invoice copy and formats system summaries for scanning", () => {
    assert.equal(
      shipmentJournalDisplayTitle("Ruta general asignada: INV-000001", "INV-000001"),
      "Ruta general asignada",
    );
    assert.equal(
      shipmentJournalDisplayBody("Entrega lista | Recolección pendiente", "system"),
      "Entrega lista\nRecolección pendiente",
    );
    assert.equal(
      shipmentJournalDisplayBody(
        "Caja vacia: Programar entrega de caja vacia - 2 de agosto de 2026 a las 10:00 AM | Caja llena: Recolección pendiente · Ruta del día · 2026-08-02",
        "system",
      ),
      "Entrega de caja vacía · 2 de agosto de 2026 a las 10:00 AM",
    );
    assert.equal(
      shipmentJournalDisplayBody("Cliente dijo usar | puerta norte", "manual"),
      "Cliente dijo usar | puerta norte",
    );
  });

  it("shows reminder state only when the entry actually has a reminder", () => {
    assert.equal(
      shipmentJournalReminderBadge({
        followUpAt: null,
        reminderStatus: "completed",
        dueState: "none",
      }),
      "",
    );
    assert.equal(
      shipmentJournalReminderBadge({
        followUpAt: "2026-08-02T10:00:00-07:00",
        reminderStatus: "pending",
        dueState: "today",
      }),
      "Hoy",
    );
  });
});
