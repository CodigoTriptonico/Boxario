import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultReasonCodeForMovementType,
  formatInventoryMovementReference,
  formatInventoryMovementTrail,
  isAgencyInventoryMovement,
  isReasonCodeAllowedForMovementType,
  manualMovementReasonOptionsForType,
  movementReasonRequiresDetail,
  normalizeReasonCodeForMovementType,
  readInventoryMovementEvidencePhotos,
} from "./inventory-movement-audit";

describe("inventory-movement-audit", () => {
  it("maps manual movement types to default reason codes", () => {
    assert.equal(defaultReasonCodeForMovementType("entrada"), "manual_entry");
    assert.equal(defaultReasonCodeForMovementType("salida"), "manual_exit");
    assert.equal(defaultReasonCodeForMovementType("ajuste"), "physical_count");
  });

  it("requires detail for physical count, other, damage and loss", () => {
    assert.equal(movementReasonRequiresDetail("physical_count"), true);
    assert.equal(movementReasonRequiresDetail("other"), true);
    assert.equal(movementReasonRequiresDetail("assignment_damage"), true);
    assert.equal(movementReasonRequiresDetail("assignment_loss"), true);
    assert.equal(movementReasonRequiresDetail("manual_entry"), false);
  });

  it("exposes reason options by movement type", () => {
    assert.deepEqual(
      manualMovementReasonOptionsForType("entrada").map((option) => option.value),
      ["manual_entry", "other"],
    );
    assert.deepEqual(
      manualMovementReasonOptionsForType("salida").map((option) => option.value),
      [
        "manual_exit",
        "assignment_damage",
        "assignment_loss",
        "assignment_consume",
        "other",
      ],
    );
    assert.deepEqual(
      manualMovementReasonOptionsForType("ajuste").map((option) => option.value),
      ["physical_count", "other"],
    );
    assert.equal(isReasonCodeAllowedForMovementType("entrada", "manual_exit"), false);
    assert.equal(isReasonCodeAllowedForMovementType("salida", "manual_exit"), true);
  });

  it("normalizes invalid reason codes to the movement default", () => {
    assert.equal(
      normalizeReasonCodeForMovementType("entrada", "manual_exit"),
      "manual_entry",
    );
    assert.equal(
      normalizeReasonCodeForMovementType("salida", "assignment_damage"),
      "assignment_damage",
    );
    assert.equal(normalizeReasonCodeForMovementType("ajuste", "manual_entry"), "physical_count");
  });

  it("formats origin destination trail", () => {
    assert.equal(
      formatInventoryMovementTrail({
        fromLabel: "Bodega central",
        toLabel: "Juan Pérez",
      }),
      "Bodega central → Juan Pérez",
    );
    assert.equal(formatInventoryMovementTrail({ toLabel: "Envío SCG-1" }), "→ Envío SCG-1");
  });

  it("reads evidence photo urls", () => {
    assert.deepEqual(
      readInventoryMovementEvidencePhotos({
        photos: ["https://example.com/a.jpg", "", 2],
      }),
      ["https://example.com/a.jpg"],
    );
  });

  it("formats document reference labels", () => {
    assert.equal(
      formatInventoryMovementReference({
        referenceType: "shipment",
        referenceId: "abc",
        referenceLabel: "SCG-1042",
      }),
      "Envío: SCG-1042",
    );
  });

  it("identifies every agency-specific inventory trail", () => {
    assert.equal(isAgencyInventoryMovement({ reasonCode: "agency_delivery" }), true);
    assert.equal(isAgencyInventoryMovement({ fromLocationType: "agency" }), true);
    assert.equal(isAgencyInventoryMovement({ toLocationType: "agency" }), true);
    assert.equal(isAgencyInventoryMovement({ referenceType: "agency_visit" }), true);
    assert.equal(
      isAgencyInventoryMovement({
        reasonCode: "manual_entry",
        toLocationType: "warehouse",
        referenceType: "physical_count",
      }),
      false,
    );
  });
});
