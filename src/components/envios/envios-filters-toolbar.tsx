"use client";

import { Search } from "lucide-react";
import { memo } from "react";
import { InlineSearchPicker } from "@/components/inline-search-picker";
import { insetShellClass, panelToolbarClass } from "@/components/ui-blocks";
import { EnviosReadinessActions } from "@/components/envios/envios-readiness-actions";
import type { EnviosFiltersToolbarProps } from "@/components/envios/types";
import { enviosStatusFilterDisplayLabel } from "@/lib/shipment-display";

export const EnviosFiltersToolbar = memo(function EnviosFiltersToolbar({
  workspaceTabs,
  mode,
  readinessFilter,
  onReadinessFilterChange,
  totalCount,
  listosCount,
  pendientesCount,
  query,
  onQueryChange,
  canManageShipmentOwners,
  salesOwnerFilter,
  onSalesOwnerFilterChange,
  salesOwners,
  country,
  onCountryChange,
  countryFilterOptions,
  statusFilter,
  onStatusFilterChange,
  statusFilterOptions,
  canManageSales,
  canManageSalesSettings,
  isConductor,
}: EnviosFiltersToolbarProps) {
  const isHistoryMode = mode === "history";

  return (
    <div className={`${panelToolbarClass} mb-3`}>
      <div className="flex w-full items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {workspaceTabs}

        <label className="min-w-[12rem] flex-[1_1_12rem] max-w-[20rem]">
          <span className="sr-only">Buscar envíos</span>
          <span className={`${insetShellClass} flex h-9 min-w-0 items-center gap-2 rounded-lg border border-black bg-surface-inset px-3`}>
            <Search className="h-4 w-4 shrink-0 text-slate-500" aria-hidden />
            <input
              className="w-full bg-transparent text-sm font-bold text-[#f8fafc] outline-none placeholder:text-slate-500"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Nombre, teléfono, CP, invoice..."
              aria-label="Buscar envíos"
            />
          </span>
        </label>

        {canManageShipmentOwners ? (
          <label className="w-[12rem] shrink-0">
            <span className="sr-only">Filtrar por vendedor</span>
            <select
              className="h-9 w-full rounded-lg border border-black bg-surface-inset px-2.5 pr-8 text-sm font-black text-[#f8fafc] outline-none"
              value={salesOwnerFilter}
              onChange={(event) => onSalesOwnerFilterChange(event.target.value)}
              aria-label="Filtrar por vendedor"
            >
              <option value="">Todos vendedores</option>
              {salesOwners.map((owner) => (
                <option key={owner.id} value={owner.id}>
                  {owner.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <InlineSearchPicker
          className="w-[8rem] shrink-0"
          minWidthClass="w-full min-w-0"
          value={country}
          onChange={onCountryChange}
          options={countryFilterOptions}
          placeholder="País"
          searchPlaceholder="Buscar país..."
          emptyLabel="Sin países"
          ariaLabel="Filtrar por país"
        />

        {!isHistoryMode ? (
          <InlineSearchPicker
            className="w-[11rem] shrink-0 sm:min-w-[11rem] sm:w-[13rem]"
            minWidthClass="w-full min-w-0"
            value={statusFilter}
            onChange={onStatusFilterChange}
            options={statusFilterOptions}
            placeholder="Estado"
            searchPlaceholder="Buscar estado..."
            emptyLabel="Sin estados"
            ariaLabel="Filtrar por estado de envío"
            formatSelectedLabel={(option, placeholder) =>
              option
                ? enviosStatusFilterDisplayLabel(option.value) || option.label
                : placeholder
            }
          />
        ) : null}

        <div className="ml-auto shrink-0">
          <EnviosReadinessActions
            mode={mode}
            readinessFilter={readinessFilter}
            onReadinessFilterChange={onReadinessFilterChange}
            totalCount={totalCount}
            listosCount={listosCount}
            pendientesCount={pendientesCount}
            canManageSales={canManageSales}
            canManageSalesSettings={canManageSalesSettings}
            isConductor={isConductor}
          />
        </div>
      </div>
    </div>
  );
});
