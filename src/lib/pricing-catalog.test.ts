import { describe, it } from "node:test";
import assert from "node:assert/strict";
import type { PricingCountryConfig } from "@/lib/pricing/types";
import type { CategoryConfig } from "@/lib/inventory-tree";
import {
  addProductToCountry,
  catalogKeyFromLeaf,
  catalogProductSecondaryLabel,
  groupCatalogProductsByCategory,
  groupCountryCatalogBoxes,
  isProductAssignedToCountry,
  listCatalogProducts,
  productCountryAssignments,
  removeProductFromCountry,
  setProductCountryAssignments,
} from "./pricing-catalog";

const sampleTree: CategoryConfig[] = [
  {
    name: "Cajas",
    items: [
      {
        id: "sub-1",
        name: "Medidas",
        children: [
          { id: "1", name: "12x12x12" },
          { id: "2", name: "14x14x14" },
        ],
      },
    ],
  },
  {
    name: "Empaques",
    items: [{ id: "3", name: "Bolsa grande" }],
  },
];

const mexicoCountry: PricingCountryConfig = {
  code: "MX",
  name: "México",
  deliveryTime: "5-8 dias",
  boxes: [],
};

const colombiaCountry: PricingCountryConfig = {
  code: "CO",
  name: "Colombia",
  deliveryTime: "7-10 dias",
  boxes: [],
};

describe("pricing-catalog", () => {
  it("lists catalog products with stable keys", () => {
    const products = listCatalogProducts(sampleTree);

    assert.equal(products.length, 3);
    assert.equal(products[0]?.label, "12x12x12");
    assert.match(products[0]?.path || "", /Cajas/);
    assert.equal(
      products[0]?.catalogKey,
      catalogKeyFromLeaf({
        category: "Cajas",
        kind: "12x12x12",
        subcategory: "Medidas",
      }),
    );
  });

  it("groups catalog products by inventory category order", () => {
    const products = listCatalogProducts(sampleTree);
    const groups = groupCatalogProductsByCategory(products);

    assert.deepEqual(
      groups.map((group) => group.category),
      ["Cajas", "Empaques"],
    );
    assert.equal(groups[0]?.products.length, 2);
    assert.equal(groups[1]?.products[0]?.label, "Bolsa grande");
    assert.equal(catalogProductSecondaryLabel(products[0]!), "Medidas");
  });

  it("groups assigned country boxes by category", () => {
    const products = listCatalogProducts(sampleTree);
    const productsByKey = new Map(products.map((product) => [product.catalogKey, product]));
    const boxes = [
      { size: "Bolsa grande", price: "$5", cost: "$2", catalogKey: products[2]!.catalogKey },
      { size: "12x12x12", price: "$10", cost: "$4", catalogKey: products[0]!.catalogKey },
    ];

    const groups = groupCountryCatalogBoxes(boxes, productsByKey, ["Cajas", "Empaques"]);

    assert.deepEqual(
      groups.map((group) => ({
        category: group.category,
        sizes: group.boxes.map((entry) => entry.box.size),
      })),
      [
        { category: "Cajas", sizes: ["12x12x12"] },
        { category: "Empaques", sizes: ["Bolsa grande"] },
      ],
    );
  });

  it("adds and removes products from a country", () => {
    const product = listCatalogProducts(sampleTree)[1]!;
    const withProduct = addProductToCountry([mexicoCountry], "México", product);

    assert.equal(withProduct[0]?.boxes.length, 1);
    assert.equal(withProduct[0]?.boxes[0]?.size, "14x14x14");
    assert.equal(withProduct[0]?.boxes[0]?.catalogKey, product.catalogKey);

    const withoutProduct = removeProductFromCountry(withProduct, "México", product.catalogKey);
    assert.equal(withoutProduct[0]?.boxes.length, 0);
  });

  it("detects assigned products by catalog key or legacy size", () => {
    const product = listCatalogProducts(sampleTree)[1]!;
    const withCatalogKey = addProductToCountry([mexicoCountry], "México", product);

    assert.equal(
      isProductAssignedToCountry(withCatalogKey[0]?.boxes || [], product),
      true,
    );

    const legacyCountry: PricingCountryConfig = {
      ...mexicoCountry,
      boxes: [{ size: "14x14x14", price: "$10", cost: "$5" }],
    };

    assert.equal(isProductAssignedToCountry(legacyCountry.boxes, product), true);
    assert.equal(
      isProductAssignedToCountry([], listCatalogProducts(sampleTree)[0]!),
      false,
    );
  });

  it("sets country assignments from inventory modal", () => {
    const product = listCatalogProducts(sampleTree)[0]!;
    const countries = [mexicoCountry, colombiaCountry];
    const next = setProductCountryAssignments(countries, product, [
      { countryName: "México", price: "$25", active: true },
      { countryName: "Colombia", price: "$30", active: true },
    ]);

    assert.equal(next[0]?.boxes[0]?.price, "$25");
    assert.equal(next[1]?.boxes[0]?.price, "$30");

    const assignments = productCountryAssignments(next, product.catalogKey);
    assert.deepEqual(
      assignments.map((entry) => ({ name: entry.countryName, active: entry.active })),
      [
        { name: "México", active: true },
        { name: "Colombia", active: true },
      ],
    );
  });
});
