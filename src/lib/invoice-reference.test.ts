import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  formatCompanyCode,
  formatInvoiceReference,
  formatSellerCode,
  invoiceReferenceCountryCode,
} from "@/lib/invoice-reference";

describe("invoice reference", () => {
  it("encodes country with boxes, seller, company and organization sequence", () => {
    assert.equal(
      formatInvoiceReference({ sequence: 1, country: "Colombia", city: "Santa Clarita", sellerCode: 1, companyCode: 1, boxCount: 2 }),
      "COL001SAN20010001",
    );
    assert.equal(
      formatInvoiceReference({ sequence: 22, country: "México", city: "Ciudad de México", sellerCode: 12, companyCode: 2, boxCount: 1 }),
      "MEX012CIU10020022",
    );
    assert.equal(
      formatInvoiceReference({ sequence: 23, country: "USA", city: "Miami", sellerCode: 12, companyCode: 12, boxCount: 14 }),
      "USA012MIA140120023",
    );
    assert.equal(
      formatInvoiceReference({ sequence: 10_000, country: "Colombia", city: "Bogotá", sellerCode: 1, companyCode: 1, boxCount: 1 }),
      "COL001BOG100110000",
    );
    assert.equal(formatSellerCode(1), "001");
    assert.equal(formatCompanyCode(1), "001");
  });

  it("uses a stable fallback for an unknown country", () => {
    assert.equal(invoiceReferenceCountryCode(""), "UNK");
    assert.equal(
      formatInvoiceReference({ sequence: 7, country: "", city: "", sellerCode: 3, companyCode: 4, boxCount: 3 }),
      "UNK003UNK30040007",
    );
  });
});
