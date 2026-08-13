"use client";

import { Trash2 } from "lucide-react";
import { CountryName } from "@/components/country-flag";
import type {
  CountryContextMenu,
  CountryProductContextMenu,
} from "@/components/config/config-pricing-helpers";

export function ConfigCountryContextMenus({
  countryContextMenu,
  countryProductContextMenu,
  onRemoveCountry,
  onRemoveCountryProduct,
  removeBusy = false,
}: {
  countryContextMenu: CountryContextMenu | null;
  countryProductContextMenu: CountryProductContextMenu | null;
  onRemoveCountry: (countryName: string) => void;
  onRemoveCountryProduct: (catalogKey: string) => void;
  removeBusy?: boolean;
}) {
  return (
    <>
      {countryProductContextMenu ? (
        <div
          role="menu"
          data-country-product-context-menu
          className="fixed z-50 w-52 overflow-hidden rounded-lg border border-black bg-surface-card shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
          style={{
            left: countryProductContextMenu.x,
            top: countryProductContextMenu.y,
          }}
          onContextMenu={(event) => event.preventDefault()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="border-b border-black px-3 py-2">
            <p className="truncate text-sm font-black text-[#f8fafc]">
              {countryProductContextMenu.label}
            </p>
          </div>
          <button
            type="button"
            role="menuitem"
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-black text-rose-200 hover:bg-[#3A1818]"
            onClick={() => onRemoveCountryProduct(countryProductContextMenu.catalogKey)}
          >
            <Trash2 className="h-4 w-4" />
            Quitar del país
          </button>
        </div>
      ) : null}

      {countryContextMenu ? (
        <div
          role="menu"
          data-country-context-menu
          className="fixed z-50 w-52 overflow-hidden rounded-lg border border-black bg-surface-card shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
          style={{ left: countryContextMenu.x, top: countryContextMenu.y }}
          onContextMenu={(event) => event.preventDefault()}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <div className="border-b border-black px-3 py-2">
            <CountryName
              name={countryContextMenu.name}
              size="sm"
              labelClassName="text-sm font-black text-[#f8fafc]"
            />
          </div>
          <button
            type="button"
            role="menuitem"
            disabled={removeBusy}
            aria-busy={removeBusy || undefined}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-black text-rose-200 hover:bg-[#3A1818] focus-visible:bg-[#3A1818] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-rose-300 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={() => onRemoveCountry(countryContextMenu.name)}
          >
            <Trash2 className="h-4 w-4" />
            {removeBusy ? "Eliminando..." : "Eliminar país"}
          </button>
        </div>
      ) : null}
    </>
  );
}
