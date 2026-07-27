import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizePersonName,
  normalizePersonNameSnapshot,
  formatPersonNameInput,
  isValidPersonName,
  personNameValidationMessage,
  sanitizePersonNameInput,
} from "./person-name";

describe("person name formatting", () => {
  it("stores names and surnames with capital initials", () => {
    assert.equal(normalizePersonName("  Carlos   Santa  "), "Carlos Santa");
  });

  it("preserves accents, apostrophes and hyphens", () => {
    assert.equal(normalizePersonName("JOSÉ O'NEILL-PÉREZ"), "José O'Neill-Pérez");
  });

  it("formats while typing without trimming the caret-adjacent spaces", () => {
    assert.equal(formatPersonNameInput("  mARÍA "), "  María ");
  });

  it("keeps empty values empty", () => {
    assert.equal(normalizePersonName("   "), "");
  });

  it("removes numbers and unsafe symbols while typing", () => {
    assert.equal(sanitizePersonNameInput("Car;1p🙂"), "Carp");
    assert.equal(sanitizePersonNameInput("maría-josé o'neill"), "María-José O'Neill");
  });

  it("validates real name separators without accepting malformed values", () => {
    assert.equal(isValidPersonName("José O'Neill-Pérez"), true);
    assert.equal(isValidPersonName("Carlos7"), false);
    assert.equal(isValidPersonName("Car;P"), false);
    assert.equal(isValidPersonName("Carlos--Pérez"), false);
    assert.equal(personNameValidationMessage("", "nombre"), "Escribe el nombre");
    assert.match(personNameValidationMessage("Diaz@", "apellido"), /solo puede contener/);
  });

  it("normalizes snapshot names without changing contact or address data", () => {
    assert.deepEqual(
      normalizePersonNameSnapshot({
        name: "ANA MARÍA DE LEÓN",
        phone: "+1 555 0100",
        address: "Calle Principal",
      }),
      {
        name: "Ana María De León",
        phone: "+1 555 0100",
        address: "Calle Principal",
      },
    );
    assert.deepEqual(normalizePersonNameSnapshot({}), {});
  });
});
