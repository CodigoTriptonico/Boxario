import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeCustomerMutation,
  normalizeEmailList,
  normalizeRecipientMutation,
} from "@/lib/customers/mutations";

describe("customer mutation normalization", () => {
  it("normalizes contact values and builds the customer database patch once", () => {
    const result = normalizeCustomerMutation({
      firstName: "  carlos ",
      lastName: " santa ",
      phones: [" +1 555 ", "", "  "],
      emails: [" ANA@EXAMPLE.COM ", "ana@example.com", ""],
      street: " Main ",
      houseNumber: " 10 ",
      neighborhood: " Centro ",
      city: " Los Angeles ",
      state: " CA ",
      postalCode: " 90001 ",
      country: " USA ",
      addressReference: " Puerta azul ",
      addressVerified: false,
    });

    assert.equal(result.ok, true);
    if (!result.ok) {
      return;
    }

    assert.equal(result.value.firstName, "Carlos");
    assert.equal(result.value.lastName, "Santa");
    assert.deepEqual(result.value.phones, ["+1 555"]);
    assert.deepEqual(result.value.emails, ["ana@example.com"]);
    assert.equal(result.value.patch.city, "Los Angeles");
    assert.equal(result.value.patch.email, "ana@example.com");
  });

  it("keeps the existing validation messages for missing phones and invalid names", () => {
    const missingPhone = normalizeCustomerMutation({
      firstName: "Ana",
      lastName: "Lopez",
      phones: [],
      street: "",
      houseNumber: "",
      neighborhood: "",
      city: "",
      state: "",
      postalCode: "",
    });
    assert.deepEqual(missingPhone, { ok: false, error: "Agrega al menos un telefono" });

    const invalidName = normalizeRecipientMutation(
      {
        firstName: "Ana1",
        lastName: "Lopez",
        phone: "+52",
        country: "Mexico",
        street: "",
        houseNumber: "",
        neighborhood: "",
        city: "",
        postalCode: "",
      },
      "country-1",
    );
    assert.equal(invalidName.ok, false);
  });

  it("deduplicates emails case-insensitively", () => {
    assert.deepEqual(
      normalizeEmailList([" A@EXAMPLE.COM ", "a@example.com", "b@example.com"]),
      ["a@example.com", "b@example.com"],
    );
  });
});
