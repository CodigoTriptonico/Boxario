"use client";

import { Check, ChevronDown, Plus, Search } from "lucide-react";
import { useMemo } from "react";
import { inputClass } from "@/components/ui-blocks";
import {
  catalogProductSecondaryLabel,
  groupCatalogProductsByCategory,
  type InventoryCatalogProduct,
} from "@/lib/pricing-catalog";

type CountryCatalogAddPanelProps = {
  products: InventoryCatalogProduct[];
  categoryOrder?: string[];
  assignedCatalogKeys: Set<string>;
  query: string;
  onQueryChange: (query: string) => void;
  onAdd: (product: InventoryCatalogProduct) => void;
};

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

function productMatchesSearch(product: InventoryCatalogProduct, search: string) {
  if (!search) {
    return true;
  }

  return (
    product.label.toLowerCase().includes(search) ||
    product.path.toLowerCase().includes(search) ||
    product.category.toLowerCase().includes(search)
  );
}

export function CountryCatalogAddPanel({
  products,
  categoryOrder,
  assignedCatalogKeys,
  query,
  onQueryChange,
  onAdd,
}: CountryCatalogAddPanelProps) {
  const groupedProducts = useMemo(() => {
    const search = normalizeSearch(query);
    const filtered = search
      ? products.filter((product) => productMatchesSearch(product, search))
      : products;

    return groupCatalogProductsByCategory(filtered, categoryOrder);
  }, [categoryOrder, products, query]);

  const searchActive = normalizeSearch(query).length > 0;
  const hasMatches = groupedProducts.some((group) => group.products.length > 0);

  return (
    <div className="grid gap-2">
      <label className="relative block">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
          aria-hidden
        />
        <input
          className={`${inputClass} h-10 w-full pl-9`}
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Filtrar por nombre o categoría…"
          aria-label="Filtrar catálogo"
        />
      </label>

      <div className="max-h-56 overflow-y-auto rounded-lg border border-black bg-surface-inset p-1.5">
        {hasMatches ? (
          <div className="grid gap-1.5">
            {groupedProducts.map((group) => {
              if (!group.products.length) {
                return null;
              }

              const addableCount = group.products.filter(
                (product) => !assignedCatalogKeys.has(product.catalogKey),
              ).length;

              return (
                <details
                  key={group.category}
                  open={searchActive || undefined}
                  className="group overflow-hidden rounded-lg border border-black bg-surface-card shadow-[0_4px_12px_rgba(0,0,0,0.18)]"
                >
                  <summary className="flex h-10 cursor-pointer list-none items-center gap-2 px-3 transition hover:bg-surface-card-hover [&::-webkit-details-marker]:hidden">
                    <p className="min-w-0 flex-1 truncate text-xs font-black uppercase tracking-wide text-slate-300">
                      {group.category}
                    </p>
                    <span className="shrink-0 rounded-md border border-black/70 bg-surface-inset px-2 py-0.5 text-[10px] font-bold text-slate-400">
                      {addableCount > 0
                        ? `${addableCount} disponible${addableCount === 1 ? "" : "s"}`
                        : `${group.products.length} agregado${group.products.length === 1 ? "" : "s"}`}
                    </span>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-black/70 bg-surface-inset text-slate-400 transition group-open:bg-emerald-950/30 group-open:text-emerald-300">
                      <ChevronDown
                        className="h-3.5 w-3.5 transition-transform group-open:rotate-180"
                        aria-hidden
                      />
                    </span>
                  </summary>

                  <ul className="border-t border-black/70">
                  {group.products.map((product) => {
                    const added = assignedCatalogKeys.has(product.catalogKey);
                    const secondaryLabel = catalogProductSecondaryLabel(product);

                    return (
                      <li
                        key={product.catalogKey}
                        className="flex items-center gap-2.5 border-t border-black/50 px-2 py-2"
                      >
                        <button
                          type="button"
                          disabled={added}
                          onPointerDown={(event) => event.stopPropagation()}
                          onClick={(event) => {
                            event.stopPropagation();
                            onAdd(product);
                          }}
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition ${
                            added
                              ? "border-emerald-600 bg-emerald-400 text-slate-950"
                              : "border-black bg-surface-card text-slate-400 hover:border-emerald-600/50 hover:bg-emerald-950/30 hover:text-emerald-300"
                          }`}
                          aria-label={
                            added ? `${product.label} ya agregado` : `Agregar ${product.label}`
                          }
                          title={added ? "Ya agregado" : "Agregar"}
                        >
                          {added ? (
                            <Check className="h-4 w-4" strokeWidth={3} aria-hidden />
                          ) : (
                            <Plus className="h-4 w-4" aria-hidden />
                          )}
                        </button>

                        <div className="min-w-0 flex-1">
                          <p
                            className={`truncate text-sm font-black ${
                              added ? "text-slate-500" : "text-[#f8fafc]"
                            }`}
                          >
                            {product.label}
                          </p>
                          {secondaryLabel ? (
                            <p className="truncate text-xs font-bold text-slate-500">
                              {secondaryLabel}
                            </p>
                          ) : null}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </details>
            );
          })}
          </div>
        ) : (
          <p className="px-3 py-6 text-center text-sm font-bold text-slate-500">
            Sin coincidencias
          </p>
        )}
      </div>
    </div>
  );
}
