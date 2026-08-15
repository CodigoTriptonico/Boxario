import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it } from "node:test";
import { readVentaClientSource } from "@/test-utils/venta-source";

const root = process.cwd();
const pickerSource = readFileSync(
  join(root, "src/components/sale/sale-quick-country-picker.tsx"),
  "utf8",
);
const saleSource = readVentaClientSource();
const catalogSource = readFileSync(join(root, "src/lib/sale-quick-box-catalog.ts"), "utf8");

describe("quick sale country picker", () => {
  it("asks for country before opening the regular box step", () => {
    assert.match(pickerSource, /quick-sale-country-title/);
    assert.match(pickerSource, /CountryFlag/);
    assert.match(saleSource, /SaleQuickCountryPicker/);
    assert.match(saleSource, /startQuickEmptyBox/);
    assert.match(saleSource, /setQuickSaleCountryPickerOpen\(true\)/);
    assert.match(saleSource, /onQuickEmptyBox=\{startQuickEmptyBox\}/);
    assert.match(saleSource, /enterQuickSaleCountry/);
    assert.match(saleSource, /setActiveStep\("box"\)/);
    assert.doesNotMatch(saleSource, /SaleQuickEmptyBoxModal/);
  });

  it("resolves boxes for the country the seller picks", () => {
    assert.match(catalogSource, /export function listQuickSaleCountries/);
    assert.match(
      saleSource,
      /resolveCountryBoxes\(countryBoxes, quickSaleCountry\)/,
    );
    assert.match(saleSource, /setQuickSaleCountry\(country\)/);
    assert.match(saleSource, /setSelectedSender\(quickSaleSender\)/);
    assert.match(
      saleSource,
      /step\.id === "box"[\s\S]*?quickSaleActive \? quickSaleCountry : selectedRecipient\?\.country/,
    );
    assert.doesNotMatch(saleSource, /Carrito mixto/);
  });

  it("numbers the quick sale steps from one to three", () => {
    assert.match(saleSource, /const activeFlowSteps = quickSaleActive \? quickSaleSteps : saleSteps/);
    assert.match(saleSource, /index: visibleIndex/);
  });

  it("syncs quick-sale box changes before opening the invoice", () => {
    assert.match(saleSource, /quickSaleBoxSelectionChanged/);
    assert.match(saleSource, /proceedQuickSaleFromSelectedBox/);
  });
});
