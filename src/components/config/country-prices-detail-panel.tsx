"use client";

import { Clock, DollarSign, Package2, Plus, Tags, X } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { CountryCommercialServiceCosts } from "@/components/config/country-commercial-service-costs";
import { CountryCatalogAddPanel } from "@/components/config/country-catalog-add-panel";
import {
  parseMoney,
  type CountryPriceTab,
  type PromotionEditorState,
} from "@/components/config/config-pricing-helpers";
import { PromotionSortableList } from "@/components/config/promotion-sortable-list";
import { TimeRangeSelect } from "@/components/config/time-range-select";
import { PageLoading } from "@/components/page-loading";
import { AppTabs, type AppTabDefinition } from "@/components/app-tabs";
import { CountryFlag, CountryName } from "@/components/country-flag";
import type { ComboBuilderProduct } from "@/components/config/combo-builder";
import { inputClass, iconWellEmerald, Panel, primaryButtonClass } from "@/components/ui-blocks";
import { catalogProductSecondaryLabel } from "@/lib/pricing-catalog";
import type { InventoryCatalogProduct } from "@/lib/pricing-catalog";
import { isPromotionRuleValid, type PricingPromotionConfig } from "@/lib/pricing-promotions";
import type { PricingCountryConfig } from "@/lib/pricing/types";
import { moneyInputDisplayValue } from "@/lib/logistics-fees";
import { ONBOARDING_TARGETS } from "@/lib/onboarding/coach-targets";
import { resolveCountryCode } from "@/lib/country-options";
import type { Dispatch, HTMLAttributes, SetStateAction } from "react";

const ComboBuilder = dynamic(
  () => import("@/components/config/combo-builder").then((mod) => mod.ComboBuilder),
  { loading: () => <PageLoading inline /> },
);

type CountryPricesDetailPanelProps = {
  showSidebarNav: boolean;
  nestedPanelShell: { className?: string; contentClassName?: string };
  activeCountry: string;
  selectedCountryData?: PricingCountryConfig;
  countryPriceTabs: AppTabDefinition<CountryPriceTab>[];
  countryPriceTab: CountryPriceTab;
  setCountryPriceTab: (tab: CountryPriceTab) => void;
  agencyModuleEnabled: boolean;
  catalogProducts: InventoryCatalogProduct[];
  catalogProductsByKey: Map<string, InventoryCatalogProduct>;
  catalogCategoryNames: string[];
  countryBoxesByCategory: Array<{
    category: string;
    boxes: Array<{ box: { size: string; price: string; cost?: string; catalogKey?: string } }>;
  }>;
  assignedCountryCatalogKeys: Set<string>;
  hasAddableCatalogProducts: boolean;
  countryProductAddRef: React.RefObject<HTMLDivElement | null>;
  countryProductPickerOpen: boolean;
  setCountryProductPickerOpen: Dispatch<SetStateAction<boolean>>;
  countryProductQuery: string;
  setCountryProductQuery: (query: string) => void;
  inventarioReturnHref: string;
  firstAssignedBoxKey: string | null;
  selectedCountryPromotions: PricingPromotionConfig[];
  comboBuilderProducts: ComboBuilderProduct[];
  promotionEditor: PromotionEditorState | null;
  setPromotionEditor: Dispatch<SetStateAction<PromotionEditorState | null>>;
  onUpdateCountryTime: (time: string) => void;
  onAddCountryProduct: (product: InventoryCatalogProduct) => void;
  onUpdateCountryBoxPrice: (catalogKey: string, rawPrice: string) => void;
  onUpdateCountryBoxCost: (catalogKey: string, rawCost: string) => void;
  countryProductContextMenuProps: (catalogKey: string, label: string) => HTMLAttributes<HTMLElement>;
  onOpenNewPromotion: () => void;
  onPatchPromotionDraft: (patch: Partial<PricingPromotionConfig>) => void;
  onSavePromotionDraft: () => void;
  onReorderCountryPromotions: (orderedIds: string[]) => void;
  onOpenEditPromotion: (promotion: PricingPromotionConfig) => void;
  onTogglePromotionActive: (promotionId: string) => void;
  onRemovePromotion: (promotionId: string) => void;
  onGoInventario: () => void;
};

export function CountryPricesDetailPanel({
  showSidebarNav,
  nestedPanelShell,
  activeCountry,
  selectedCountryData,
  countryPriceTabs,
  countryPriceTab,
  setCountryPriceTab,
  agencyModuleEnabled,
  catalogProducts,
  catalogProductsByKey,
  catalogCategoryNames,
  countryBoxesByCategory,
  assignedCountryCatalogKeys,
  hasAddableCatalogProducts,
  countryProductAddRef,
  countryProductPickerOpen,
  setCountryProductPickerOpen,
  countryProductQuery,
  setCountryProductQuery,
  inventarioReturnHref,
  firstAssignedBoxKey,
  selectedCountryPromotions,
  comboBuilderProducts,
  promotionEditor,
  setPromotionEditor,
  onUpdateCountryTime,
  onAddCountryProduct,
  onUpdateCountryBoxPrice,
  onUpdateCountryBoxCost,
  countryProductContextMenuProps,
  onOpenNewPromotion,
  onPatchPromotionDraft,
  onSavePromotionDraft,
  onReorderCountryPromotions,
  onOpenEditPromotion,
  onTogglePromotionActive,
  onRemovePromotion,
  onGoInventario,
}: CountryPricesDetailPanelProps) {
  const comboProductLabels = Object.fromEntries(
    comboBuilderProducts.map((product) => [product.catalogKey, product.label]),
  );

  return (
  <Panel
    hideHeader={showSidebarNav}
    {...nestedPanelShell}
    clipContent={false}
    title={
      <span className="flex items-center gap-3">
        <CountryFlag code={resolveCountryCode(selectedCountryData || { code: "", name: activeCountry || "" })} />
        <span>{activeCountry}</span>
      </span>
    }
  >
    <AppTabs
      className="mb-6"
      tabs={countryPriceTabs}
      value={countryPriceTab}
      onChange={setCountryPriceTab}
      ariaLabel="Secciones del país"
    />

    {countryPriceTab === "delivery" ? (
      <div className="w-fit max-w-full rounded-xl border border-black bg-surface-card p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className={`h-9 w-9 shrink-0 ${iconWellEmerald}`}>
            <Clock className="h-4 w-4" />
          </span>
          <div>
            <p className="text-sm font-black text-[#f8fafc]">Tiempo de entrega</p>
            <p className="text-xs font-bold text-slate-400">
              Rango estimado de llegada al destino en {activeCountry}.
            </p>
          </div>
        </div>
        <TimeRangeSelect
          value={selectedCountryData?.deliveryTime || ""}
          onChange={onUpdateCountryTime}
        />
        {selectedCountryData?.code ? (
          <CountryCommercialServiceCosts
            destinationCode={selectedCountryData.code}
            agencyModuleEnabled={agencyModuleEnabled}
          />
        ) : null}
      </div>
    ) : null}

    {countryPriceTab === "items" ? (
      <>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          {(selectedCountryData?.boxes || []).length > 0 ? (
            <p className="max-w-xl text-xs font-bold leading-relaxed text-slate-400">
              Precio de venta en {activeCountry} para cada ítem del catálogo.
            </p>
          ) : catalogProducts.length === 0 ? (
            <p className="text-sm font-bold text-slate-400">
              No hay productos en el catálogo. Créalos en{" "}
              <Link href={inventarioReturnHref} className="text-emerald-400 hover:underline">
                Inventario
              </Link>
              .
            </p>
          ) : (
            <span />
          )}

          {catalogProducts.length > 0 ? (
            <div ref={countryProductAddRef} className="relative shrink-0">
              <button
                type="button"
                onClick={() => setCountryProductPickerOpen((open) => !open)}
                disabled={!hasAddableCatalogProducts}
                className={`${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-40`}
                aria-expanded={countryProductPickerOpen}
                data-onboarding-target={ONBOARDING_TARGETS.CONFIG_ADD_COUNTRY_PRODUCTS}
              >
                <Plus className="h-4 w-4" />
                Agregar ítems a {activeCountry}
              </button>

              {countryProductPickerOpen ? (
                <div
                  className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-xl border border-black bg-surface-card p-3 shadow-[0_16px_40px_rgba(0,0,0,0.45)]"
                  onPointerDown={(event) => event.stopPropagation()}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                      Catálogo
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setCountryProductPickerOpen(false);
                        setCountryProductQuery("");
                      }}
                      className="h-8 rounded-lg border border-black bg-surface-inset px-3 text-xs font-black text-slate-300 transition hover:bg-surface-card-hover hover:text-[#f8fafc]"
                    >
                      Listo
                    </button>
                  </div>
                  <CountryCatalogAddPanel
                    products={catalogProducts}
                    categoryOrder={catalogCategoryNames}
                    assignedCatalogKeys={assignedCountryCatalogKeys}
                    query={countryProductQuery}
                    onQueryChange={setCountryProductQuery}
                    onAdd={onAddCountryProduct}
                  />
                </div>
              ) : null}
            </div>
          ) : null}
        </div>

    {(selectedCountryData?.boxes || []).length > 0 ? (
      <>
        <div className="grid gap-5">
          {countryBoxesByCategory.map((group, groupIndex) => (
            <section key={group.category}>
              <div
                className={`flex items-center gap-3 rounded-lg border border-black bg-surface-inset px-3 py-2 ${
                  groupIndex > 0 ? "mt-1" : ""
                }`}
              >
                <p className="min-w-0 flex-1 text-xs font-black uppercase tracking-wide text-slate-300">
                  {group.category}
                </p>
                <span className="shrink-0 rounded-md border border-black/70 bg-surface-card px-2 py-0.5 text-[10px] font-bold text-slate-400">
                  {group.boxes.length} ítem{group.boxes.length === 1 ? "" : "s"}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(17rem,1fr))] gap-3">
                {group.boxes.map(({ box }) => {
                  const boxKey = box.catalogKey || box.size;
                  const catalogProduct = box.catalogKey
                    ? catalogProductsByKey.get(box.catalogKey)
                    : undefined;
                  const secondaryLabel = catalogProduct
                    ? catalogProductSecondaryLabel(catalogProduct)
                    : null;
                  const profit = Math.max(
                    parseMoney(box.price) - parseMoney(box.cost || "$0"),
                    0,
                  );

                  return (
                    <article
                      key={boxKey}
                      className="cursor-context-menu rounded-xl border border-black bg-surface-card p-3.5 shadow-[0_8px_22px_rgba(0,0,0,0.22)]"
                      {...countryProductContextMenuProps(boxKey, box.size)}
                    >
                      <div className="flex items-start gap-3">
                        <span className={`h-10 w-10 shrink-0 ${iconWellEmerald}`}>
                          <Package2 className="h-4 w-4" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-base font-black leading-snug text-[#f8fafc]">
                            {box.size}
                          </p>
                          {secondaryLabel ? (
                            <p className="mt-0.5 truncate text-xs font-bold text-slate-500">
                              {secondaryLabel}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-3 grid gap-2">
                        <label className="flex items-center justify-between gap-3 rounded-lg border border-black bg-surface-inset px-3 py-2">
                          <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                            Precio público
                          </span>
                          <span className="flex items-center gap-1 tabular-nums text-[#f8fafc]">
                            <DollarSign className="h-4 w-4 shrink-0 text-slate-400" />
                            <input
                              className="h-8 w-[4.5rem] border-0 bg-transparent p-0 text-center text-lg font-black text-[#f8fafc] outline-none placeholder:text-slate-500 focus:ring-0"
                              value={moneyInputDisplayValue(box.price)}
                              onChange={(event) =>
                                onUpdateCountryBoxPrice(boxKey, event.target.value)
                              }
                              inputMode="decimal"
                              placeholder="0"
                              aria-label={`Precio de ${box.size}`}
                              data-onboarding-target={
                                boxKey === firstAssignedBoxKey
                                  ? ONBOARDING_TARGETS.CONFIG_COUNTRY_PRICE
                                  : undefined
                              }
                            />
                          </span>
                        </label>

                        <label className="flex items-center justify-between gap-3 rounded-lg border border-black bg-surface-inset px-3 py-2">
                          <span className="text-[10px] font-black uppercase tracking-wide text-slate-500">
                            Tarifa interna base
                          </span>
                          <span className="flex items-center gap-1 tabular-nums text-[#f8fafc]">
                            <DollarSign className="h-4 w-4 shrink-0 text-slate-400" />
                            <input
                              className="h-8 w-[4.5rem] border-0 bg-transparent p-0 text-center text-lg font-black text-[#f8fafc] outline-none placeholder:text-slate-500 focus:ring-0"
                              value={moneyInputDisplayValue(box.cost || "$0")}
                              onChange={(event) =>
                                onUpdateCountryBoxCost(boxKey, event.target.value)
                              }
                              inputMode="decimal"
                              placeholder="0"
                              aria-label={`Costo de ${box.size}`}
                            />
                          </span>
                        </label>

                        <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-700/40 bg-emerald-950/25 px-3 py-2">
                          <span className="text-[10px] font-black uppercase tracking-wide text-emerald-400">
                            Ganancia
                          </span>
                          <span className="flex items-center gap-1 tabular-nums text-emerald-300">
                            <DollarSign className="h-4 w-4 shrink-0" />
                            <span className="text-lg font-black">{profit}</span>
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      </>
    ) : (
      <section className="mt-2 rounded-xl border border-dashed border-slate-600/60 p-8">
        <div className="mx-auto flex max-w-xl flex-col items-center text-center">
          <button
            type="button"
            onClick={() => {
              if (catalogProducts.length === 0) {
                onGoInventario();
                return;
              }

              setCountryProductPickerOpen(true);
            }}
            className="flex h-20 w-20 items-center justify-center rounded-2xl border-2 border-emerald-400/70 bg-emerald-400/15 text-emerald-300 shadow-[0_12px_28px_rgba(16,185,129,0.18)] transition hover:scale-[1.02] hover:bg-emerald-400/25"
            aria-label={
              catalogProducts.length === 0
                ? "Ir a Inventario"
                : `Agregar ítems a ${activeCountry}`
            }
          >
            <Plus className="h-10 w-10" strokeWidth={2.5} />
          </button>
          <h3 className="mt-5 text-lg font-black text-[#f8fafc]">
            Aún no hay items para{" "}
            <CountryName name={activeCountry || ""} size="sm" labelClassName="font-black" />.
          </h3>
          <p className="mt-2 text-sm font-bold text-slate-400">
            {catalogProducts.length === 0
              ? "Primero crea productos en Inventario y luego asígnalos a este país."
              : `Selecciona productos del catálogo para vender envíos a ${activeCountry}.`}
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
            {catalogProducts.length === 0 ? (
              <Link
                href={inventarioReturnHref}
                className={primaryButtonClass}
                data-onboarding-target={ONBOARDING_TARGETS.CONFIG_GO_INVENTARIO}
              >
                <Plus className="h-4 w-4" />
                Ir a Inventario
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => setCountryProductPickerOpen(true)}
                disabled={!hasAddableCatalogProducts}
                className={`${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <Plus className="h-4 w-4" />
                Agregar ítems a {activeCountry}
              </button>
            )}
          </div>
        </div>
      </section>
    )}

      </>
    ) : null}

    {countryPriceTab === "promotions" ? (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {!comboBuilderProducts.length && !promotionEditor ? (
          <p className="text-xs font-bold text-amber-300">
            Agrega productos en Items primero.
          </p>
        ) : (
          <span />
        )}
        {!promotionEditor ? (
        <button
          type="button"
          onClick={onOpenNewPromotion}
          disabled={!comboBuilderProducts.length}
          className={`${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-40`}
        >
          <Plus className="h-4 w-4" />
          Nueva promoción
        </button>
        ) : null}
      </div>

      {promotionEditor ? (
        <div className="mb-4 rounded-xl border border-black bg-surface-card p-4 lg:p-5">
          <div className="mb-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto] lg:items-start">
            <label className="grid gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wide text-slate-300">
                {promotionEditor.mode === "new" ? "Nueva promoción" : "Editar promoción"}
              </span>
              <input
                className={`${inputClass} placeholder:text-slate-400`}
                value={promotionEditor.draft.name}
                placeholder="Ej: 2 grandes + chica mitad"
                onChange={(event) =>
                  onPatchPromotionDraft({ name: event.target.value })
                }
              />
            </label>
            <button
              type="button"
              onClick={() =>
                onPatchPromotionDraft({ active: !promotionEditor.draft.active })
              }
              className={`h-10 shrink-0 self-start rounded-lg border px-4 text-xs font-black uppercase transition ${
                promotionEditor.draft.active
                  ? "border-emerald-600 bg-emerald-400 text-slate-950"
                  : "border-black bg-surface-inset text-slate-400"
              }`}
            >
              {promotionEditor.draft.active ? "Activa" : "Pausada"}
            </button>
            <button
              type="button"
              onClick={() => setPromotionEditor(null)}
              className="flex h-10 w-10 shrink-0 items-center justify-center self-start rounded-md text-slate-400 hover:bg-surface-card-hover hover:text-[#f8fafc] lg:justify-self-end"
              aria-label="Cerrar"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <ComboBuilder
            rule={promotionEditor.draft.rule}
            onChange={(rule) => onPatchPromotionDraft({ rule })}
            products={comboBuilderProducts}
          />

          <div className="mt-4 flex flex-wrap gap-2 border-t border-black pt-4">
            <button
              type="button"
              onClick={onSavePromotionDraft}
              disabled={!isPromotionRuleValid(promotionEditor.draft.rule)}
              className={`${primaryButtonClass} disabled:cursor-not-allowed disabled:opacity-40`}
            >
              Guardar promoción
            </button>
            <button
              type="button"
              onClick={() => setPromotionEditor(null)}
              className="h-11 rounded-lg border border-black px-5 font-black"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : null}

      {selectedCountryPromotions.length ? (
        <PromotionSortableList
          promotions={selectedCountryPromotions}
          productLabels={comboProductLabels}
          onReorder={onReorderCountryPromotions}
          onEdit={onOpenEditPromotion}
          onToggleActive={onTogglePromotionActive}
          onRemove={onRemovePromotion}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-slate-600/60 px-4 py-6 text-center">
          <Tags className="mx-auto h-8 w-8 text-slate-500" />
          <p className="mt-3 text-sm font-bold text-slate-400">
            Sin promociones para este país.
          </p>
        </div>
      )}
    </section>
    ) : null}
  </Panel>
  );
}
