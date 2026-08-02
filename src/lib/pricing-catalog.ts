import {
  collectCategoryTreeLeaves,
  type TreeLeafRef,
} from "@/lib/inventory-stock";
import type { CategoryConfig } from "@/lib/inventory-tree";
import { normalizeInventoryText } from "@/lib/inventory-tree";
import type {
  InventoryCatalogProduct,
  PricingBoxConfig,
  PricingCountryConfig,
} from "@/lib/pricing/types";

export type { InventoryCatalogProduct } from "@/lib/pricing/types";

export type CatalogProductCategoryGroup = {
  category: string;
  products: InventoryCatalogProduct[];
};

export type CountryCatalogBoxRow = {
  box: PricingBoxConfig;
  boxIndex: number;
  catalogProduct?: InventoryCatalogProduct;
};

export type CountryCatalogBoxCategoryGroup = {
  category: string;
  boxes: CountryCatalogBoxRow[];
};

export type ProductCountryAssignment = {
  countryName: string;
  price: string;
  active: boolean;
};

function normalizeLabel(value: string) {
  return normalizeInventoryText(value).trim();
}

export function catalogKeyFromLeaf(leaf: Pick<TreeLeafRef, "category" | "kind" | "subcategory">) {
  return [
    normalizeLabel(leaf.category),
    normalizeLabel(leaf.kind),
    normalizeLabel(leaf.subcategory || ""),
  ].join("|");
}

export function catalogKeyFromStockItem(item: {
  category: string;
  kind: string;
  subcategory?: string;
}) {
  return catalogKeyFromLeaf({
    category: item.category,
    kind: item.kind,
    subcategory: item.subcategory,
  });
}

function catalogProductPath(leaf: TreeLeafRef) {
  const parts = [leaf.category];

  if (leaf.subcategory) {
    parts.push(leaf.subcategory);
  }

  if (leaf.kind !== leaf.name) {
    parts.push(leaf.kind);
  }

  parts.push(leaf.name);
  return [...new Set(parts)].join(" · ");
}

export function catalogProductFromLeaf(leaf: TreeLeafRef): InventoryCatalogProduct {
  return {
    catalogKey: catalogKeyFromLeaf(leaf),
    label: leaf.name,
    path: catalogProductPath(leaf),
    category: leaf.category,
    kind: leaf.kind,
    subcategory: leaf.subcategory,
  };
}

export function listCatalogProducts(categoryConfigs: CategoryConfig[]): InventoryCatalogProduct[] {
  return listCatalogProductGroups(categoryConfigs).flatMap((group) => group.products);
}

function listCatalogProductGroups(
  categoryConfigs: CategoryConfig[],
): CatalogProductCategoryGroup[] {
  const groups: CatalogProductCategoryGroup[] = [];

  for (const category of categoryConfigs) {
    const products: InventoryCatalogProduct[] = [];
    const seen = new Set<string>();

    for (const leaf of collectCategoryTreeLeaves(category)) {
      const product = catalogProductFromLeaf(leaf);

      if (seen.has(product.catalogKey)) {
        continue;
      }

      seen.add(product.catalogKey);
      products.push(product);
    }

    products.sort((left, right) => left.label.localeCompare(right.label, "es"));

    if (products.length > 0) {
      groups.push({
        category: category.name,
        products,
      });
    }
  }

  return groups;
}

export function catalogProductSecondaryLabel(product: InventoryCatalogProduct) {
  if (product.subcategory) {
    return product.subcategory;
  }

  if (product.kind !== product.label) {
    return product.kind;
  }

  return null;
}

export function catalogCategoryOrder(products: InventoryCatalogProduct[]) {
  const order: string[] = [];
  const seen = new Set<string>();

  for (const product of products) {
    const category = product.category.trim() || "Sin categoría";

    if (seen.has(category)) {
      continue;
    }

    seen.add(category);
    order.push(category);
  }

  return order;
}

export function groupCatalogProductsByCategory(
  products: InventoryCatalogProduct[],
  categoryOrder: string[] = catalogCategoryOrder(products),
): CatalogProductCategoryGroup[] {
  const byCategory = new Map<string, InventoryCatalogProduct[]>();

  for (const product of products) {
    const category = product.category.trim() || "Sin categoría";
    const bucket = byCategory.get(category);

    if (bucket) {
      bucket.push(product);
      continue;
    }

    byCategory.set(category, [product]);
  }

  const groups: CatalogProductCategoryGroup[] = [];
  const seen = new Set<string>();

  for (const category of categoryOrder) {
    const bucket = byCategory.get(category);

    if (!bucket?.length) {
      continue;
    }

    groups.push({
      category,
      products: [...bucket].sort((left, right) =>
        left.label.localeCompare(right.label, "es"),
      ),
    });
    seen.add(category);
  }

  for (const [category, bucket] of byCategory) {
    if (seen.has(category) || !bucket.length) {
      continue;
    }

    groups.push({
      category,
      products: [...bucket].sort((left, right) =>
        left.label.localeCompare(right.label, "es"),
      ),
    });
  }

  return groups;
}

export function groupCountryCatalogBoxes(
  boxes: PricingBoxConfig[],
  catalogProductsByKey: Map<string, InventoryCatalogProduct>,
  categoryOrder: string[] = [],
): CountryCatalogBoxCategoryGroup[] {
  const rows: Array<CountryCatalogBoxRow & { category: string }> = boxes.map(
    (box, boxIndex) => {
      const catalogProduct = box.catalogKey
        ? catalogProductsByKey.get(box.catalogKey)
        : undefined;

      return {
        box,
        boxIndex,
        catalogProduct,
        category: catalogProduct?.category.trim() || "Sin categoría",
      };
    },
  );

  const resolvedOrder =
    categoryOrder.length > 0
      ? categoryOrder
      : catalogCategoryOrder(
          rows.flatMap((row) => (row.catalogProduct ? [row.catalogProduct] : [])),
        );

  const byCategory = new Map<string, CountryCatalogBoxRow[]>();

  for (const row of rows) {
    const bucket = byCategory.get(row.category);

    if (bucket) {
      bucket.push({
        box: row.box,
        boxIndex: row.boxIndex,
        catalogProduct: row.catalogProduct,
      });
      continue;
    }

    byCategory.set(row.category, [
      {
        box: row.box,
        boxIndex: row.boxIndex,
        catalogProduct: row.catalogProduct,
      },
    ]);
  }

  const groups: CountryCatalogBoxCategoryGroup[] = [];
  const seen = new Set<string>();

  for (const category of resolvedOrder) {
    const bucket = byCategory.get(category);

    if (!bucket?.length) {
      continue;
    }

    groups.push({ category, boxes: bucket });
    seen.add(category);
  }

  for (const [category, bucket] of byCategory) {
    if (seen.has(category) || !bucket.length) {
      continue;
    }

    groups.push({ category, boxes: bucket });
  }

  return groups;
}

function findBoxByCatalogKey(boxes: PricingBoxConfig[], catalogKey: string) {
  const target = normalizeLabel(catalogKey);
  return boxes.find((box) => normalizeLabel(box.catalogKey || "") === target);
}

export function isCommercialInventoryProduct(
  product: InventoryCatalogProduct,
  countries: PricingCountryConfig[],
  options?: { isCommercialFlag?: boolean },
) {
  if (options?.isCommercialFlag) {
    return true;
  }

  return isProductAssignedToCountry(
    countries.flatMap((country) => country.boxes),
    product,
  );
}

export function isProductAssignedToCountry(
  boxes: PricingBoxConfig[],
  product: InventoryCatalogProduct,
) {
  if (findBoxByCatalogKey(boxes, product.catalogKey)) {
    return true;
  }

  const label = normalizeLabel(product.label);
  const kind = normalizeLabel(product.kind);

  return boxes.some((box) => {
    const size = normalizeLabel(box.size);
    return size === label || size === kind;
  });
}

export function addProductToCountry(
  countries: PricingCountryConfig[],
  countryName: string,
  product: InventoryCatalogProduct,
): PricingCountryConfig[] {
  return countries.map((country) => {
    if (country.name !== countryName) {
      return country;
    }

    if (findBoxByCatalogKey(country.boxes, product.catalogKey)) {
      return country;
    }

    return {
      ...country,
      boxes: [
        ...country.boxes,
        {
          size: product.label,
          price: "$0",
          cost: "$0",
          catalogKey: product.catalogKey,
        },
      ],
    };
  });
}

export function removeProductFromCountry(
  countries: PricingCountryConfig[],
  countryName: string,
  catalogKey: string,
): PricingCountryConfig[] {
  const target = normalizeLabel(catalogKey);

  return countries.map((country) => {
    if (country.name !== countryName) {
      return country;
    }

    return {
      ...country,
      boxes: country.boxes.filter(
        (box) => normalizeLabel(box.catalogKey || box.size) !== target,
      ),
    };
  });
}

export function setProductCountryAssignments(
  countries: PricingCountryConfig[],
  product: InventoryCatalogProduct,
  assignments: ProductCountryAssignment[],
): PricingCountryConfig[] {
  return countries.map((country) => {
    const assignment = assignments.find((entry) => entry.countryName === country.name);

    if (!assignment) {
      return country;
    }

    const existing = findBoxByCatalogKey(country.boxes, product.catalogKey);

    if (!assignment.active) {
      if (!existing) {
        return country;
      }

      return {
        ...country,
        boxes: country.boxes.filter((box) => box !== existing),
      };
    }

    const price = assignment.price || "$0";
    const nextBox: PricingBoxConfig = {
      size: product.label,
      price,
      cost: existing?.cost || "$0",
      catalogKey: product.catalogKey,
    };

    if (existing) {
      return {
        ...country,
        boxes: country.boxes.map((box) => (box === existing ? nextBox : box)),
      };
    }

    return {
      ...country,
      boxes: [...country.boxes, nextBox],
    };
  });
}

export function productCountryAssignments(
  countries: PricingCountryConfig[],
  catalogKey: string,
): ProductCountryAssignment[] {
  return countries.map((country) => {
    const box = findBoxByCatalogKey(country.boxes, catalogKey);

    return {
      countryName: country.name,
      price: box?.price || "$0",
      active: Boolean(box),
    };
  });
}
