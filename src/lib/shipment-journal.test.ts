import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  cleanShipmentJournalBody,
  readShipmentJournalCategory,
  readShipmentJournalFollowUp,
  shipmentJournalDueState,
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
});

