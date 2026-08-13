import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assessCountryRemovalRisk,
  countryAddDuplicateMessage,
  countryAddErrorMessage,
  countryAddSuccessMessage,
  countryRemovalConfirmCopy,
  countryRemoveBlockedMessage,
  countryRemoveSuccessMessage,
} from "@/lib/pricing/country-interaction";
import type { PricingCountryConfig } from "@/lib/pricing/types";
import type { PricingPromotionConfig } from "@/lib/pricing-promotions";

const emptyCountry = (name: string, boxes: PricingCountryConfig["boxes"] = []): PricingCountryConfig => ({
  code: "MX",
  name,
  deliveryTime: "",
  boxes,
});

describe("country-interaction", () => {
  it("treats empty country removal as low risk", () => {
    const assessment = assessCountryRemovalRisk(emptyCountry("México"), [], {});
    assert.equal(assessment.risk, "low");
    assert.equal(assessment.hasBoxes, false);
  });

  it("raises risk when the country has priced products", () => {
    const assessment = assessCountryRemovalRisk(
      emptyCountry("México", [{ size: "Caja M", price: "$25", cost: "$10", catalogKey: "box-m" }]),
      [],
      {},
    );
    assert.equal(assessment.risk, "moderate");
    assert.equal(assessment.hasBoxes, true);
  });

  it("raises risk when promotions or distributor prices exist", () => {
    const promotions = [
      {
        id: "1",
        name: "Combo",
        countryName: "México",
        catalogKey: "box-m",
        active: true,
        sortOrder: 0,
        rule: { buy: [], get: [] },
      },
    ] as PricingPromotionConfig[];

    const withPromo = assessCountryRemovalRisk(emptyCountry("México"), promotions, {});
    assert.equal(withPromo.risk, "moderate");
    assert.equal(withPromo.hasPromotions, true);

    const withDistributor = assessCountryRemovalRisk(emptyCountry("México"), [], {
      DistA: { México: [{ size: "Caja M", price: "$20", cost: "$8" }] },
    });
    assert.equal(withDistributor.risk, "moderate");
    assert.equal(withDistributor.hasDistributorPrices, true);
  });

  it("builds specific confirmation copy", () => {
    const assessment = assessCountryRemovalRisk(
      emptyCountry("México", [{ size: "Caja M", price: "$25", cost: "$10" }]),
      [],
      {},
    );
    const copy = countryRemovalConfirmCopy("México", assessment);
    assert.equal(copy.title, "Eliminar México");
    assert.equal(copy.confirmLabel, "Eliminar país");
    assert.match(copy.message, /productos con precio/);
    assert.doesNotMatch(copy.message, /Está seguro/);
  });

  it("uses concrete operator-facing messages", () => {
    assert.equal(countryAddSuccessMessage("México"), "México se agregó correctamente.");
    assert.equal(countryAddDuplicateMessage("México"), "México ya está agregado.");
    assert.match(countryAddErrorMessage("México"), /No se pudo agregar México/);
    assert.equal(countryRemoveSuccessMessage("México"), "México eliminado.");
    assert.match(countryRemoveBlockedMessage("México"), /configuraciones relacionadas/);
  });
});
